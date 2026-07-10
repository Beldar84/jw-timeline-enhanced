export interface GameCard {
  id: number;
  name: string;
  year: number;
  imageUrl: string;
  bibleRef?: string;
}

export interface GamePlayer {
  id: string;
  name: string;
  hand: GameCard[];
  isAI: boolean;
}

export interface PlayerMoveStats {
  placed: number;
  correct: number;
  incorrect: number;
}

export interface RealtimeGameState {
  players: GamePlayer[];
  timeline: GameCard[];
  deck: GameCard[];
  discardPile: GameCard[];
  currentPlayerIndex: number;
  winner: GamePlayer | null;
  phase: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  message: string | null;
  moveCount: number;
  moveStats: Record<string, PlayerMoveStats>;
}

export interface TurnBasedGameState {
  players: Array<{ id: string; name: string }>;
  timeline: GameCard[];
  deck: GameCard[];
  discardPile: GameCard[];
  playerHands: Record<string, GameCard[]>;
  currentTurnPlayerId: string;
  winnerId: string | null;
  status: 'pending' | 'active' | 'finished' | 'declined';
  moveCount: number;
  moveStats: Record<string, PlayerMoveStats>;
}

const emptyMoveStats = (): PlayerMoveStats => ({ placed: 0, correct: 0, incorrect: 0 });

export function shuffleCards<T>(cards: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function canPlaceCard(card: GameCard, timeline: readonly GameCard[], timelineIndex: number): boolean {
  if (!Number.isInteger(timelineIndex) || timelineIndex < 0 || timelineIndex > timeline.length) return false;
  const previous = timeline[timelineIndex - 1];
  const next = timeline[timelineIndex];
  return (!previous || card.year >= previous.year) && (!next || card.year <= next.year);
}

export function drawPenaltyCard(
  deck: readonly GameCard[],
  discardPile: readonly GameCard[],
  random: () => number = Math.random
): { drawnCard: GameCard | null; deck: GameCard[]; discardPile: GameCard[] } {
  const recycled = deck.length === 0;
  const nextDeck = recycled ? shuffleCards(discardPile, random) : [...deck];
  const drawnCard = nextDeck.pop() || null;
  return { drawnCard, deck: nextDeck, discardPile: recycled ? [] : [...discardPile] };
}

export function getInitialHandSize(cardCount: number, playerCount: number, preferredSize = 4): number {
  if (!Number.isInteger(playerCount) || playerCount < 1 || cardCount <= 1) return 0;
  return Math.max(0, Math.min(preferredSize, Math.floor((cardCount - 1) / playerCount)));
}

export function dealCards(
  cards: readonly GameCard[],
  playerIds: readonly string[],
  preferredHandSize = 4,
  random: () => number = Math.random
): { timeline: GameCard[]; deck: GameCard[]; hands: Record<string, GameCard[]>; handSize: number } {
  const deck = shuffleCards(cards, random);
  const initialCard = deck.pop();
  const handSize = getInitialHandSize(cards.length, playerIds.length, preferredHandSize);
  if (!initialCard || handSize === 0) throw new Error('El mazo no tiene suficientes cartas.');

  const hands = Object.fromEntries(playerIds.map(playerId => [playerId, [] as GameCard[]]));
  for (let round = 0; round < handSize; round++) {
    for (const playerId of playerIds) {
      const card = deck.pop();
      if (!card) throw new Error('El mazo se agotó durante el reparto.');
      hands[playerId].push(card);
    }
  }
  return { timeline: [initialCard], deck, hands, handSize };
}

function incrementMoveStats(
  stats: Record<string, PlayerMoveStats>,
  playerId: string,
  correct: boolean
): Record<string, PlayerMoveStats> {
  const current = stats[playerId] || emptyMoveStats();
  return {
    ...stats,
    [playerId]: {
      placed: current.placed + 1,
      correct: current.correct + (correct ? 1 : 0),
      incorrect: current.incorrect + (correct ? 0 : 1),
    },
  };
}

export function applyRealtimeMove(
  state: RealtimeGameState,
  playerId: string,
  cardId: number,
  timelineIndex: number,
  random: () => number = Math.random
): RealtimeGameState {
  if (state.phase !== 'PLAYING') throw new Error('La partida no está activa.');
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) throw new Error('No es el turno de este jugador.');

  const card = currentPlayer.hand.find(item => item.id === cardId);
  if (!card) throw new Error('La carta no pertenece a la mano actual.');
  if (!Number.isInteger(timelineIndex) || timelineIndex < 0 || timelineIndex > state.timeline.length) {
    throw new Error('La posición de la línea temporal no es válida.');
  }

  const players = state.players.map(player => ({ ...player, hand: [...player.hand] }));
  const activePlayer = players[state.currentPlayerIndex];
  const timeline = [...state.timeline];
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  activePlayer.hand = activePlayer.hand.filter(item => item.id !== cardId);

  const correct = canPlaceCard(card, timeline, timelineIndex);
  if (correct) {
    timeline.splice(timelineIndex, 0, card);
  } else {
    discardPile.unshift(card);
    const penalty = drawPenaltyCard(deck, discardPile, random);
    deck = penalty.deck;
    discardPile = penalty.discardPile;
    activePlayer.hand.push(penalty.drawnCard || card);
  }

  const moveStats = incrementMoveStats(state.moveStats || {}, playerId, correct);
  const moveCount = (state.moveCount || 0) + 1;
  if (correct && activePlayer.hand.length === 0) {
    return {
      ...state,
      players,
      timeline,
      deck,
      discardPile,
      winner: activePlayer,
      phase: 'GAME_OVER',
      message: `¡${activePlayer.name} ha ganado!`,
      moveCount,
      moveStats,
    };
  }

  const currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
  return {
    ...state,
    players,
    timeline,
    deck,
    discardPile,
    currentPlayerIndex,
    message: `Es el turno de ${players[currentPlayerIndex].name}.`,
    moveCount,
    moveStats,
  };
}

export function runConsecutiveAI(
  initialState: RealtimeGameState,
  random: () => number = Math.random
): RealtimeGameState {
  let state = initialState;
  let guard = 0;
  while (state.phase === 'PLAYING' && state.players[state.currentPlayerIndex]?.isAI && guard < state.players.length) {
    const ai = state.players[state.currentPlayerIndex];
    const validMoves: Array<{ card: GameCard; timelineIndex: number }> = [];
    for (const card of ai.hand) {
      for (let index = 0; index <= state.timeline.length; index++) {
        if (canPlaceCard(card, state.timeline, index)) validMoves.push({ card, timelineIndex: index });
      }
    }

    const makeCorrectMove = validMoves.length > 0 && random() > 0.3;
    const move = makeCorrectMove
      ? validMoves[Math.floor(random() * validMoves.length)]
      : {
          card: ai.hand[Math.floor(random() * ai.hand.length)],
          timelineIndex: Math.floor(random() * (state.timeline.length + 1)),
        };
    if (!move.card) break;
    state = applyRealtimeMove(state, ai.id, move.card.id, move.timelineIndex, random);
    guard++;
  }
  return state;
}

export function applyTurnBasedMove(
  state: TurnBasedGameState,
  playerId: string,
  cardId: number,
  timelineIndex: number,
  random: () => number = Math.random
): TurnBasedGameState {
  if (state.status !== 'active' || state.currentTurnPlayerId !== playerId) {
    throw new Error('No es el turno de este jugador.');
  }
  const hand = [...(state.playerHands[playerId] || [])];
  const card = hand.find(item => item.id === cardId);
  if (!card) throw new Error('La carta no pertenece a la mano actual.');
  if (!Number.isInteger(timelineIndex) || timelineIndex < 0 || timelineIndex > state.timeline.length) {
    throw new Error('La posición de la línea temporal no es válida.');
  }

  const nextHand = hand.filter(item => item.id !== cardId);
  const timeline = [...state.timeline];
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  const correct = canPlaceCard(card, timeline, timelineIndex);
  if (correct) {
    timeline.splice(timelineIndex, 0, card);
  } else {
    discardPile.unshift(card);
    const penalty = drawPenaltyCard(deck, discardPile, random);
    deck = penalty.deck;
    discardPile = penalty.discardPile;
    nextHand.push(penalty.drawnCard || card);
  }

  const winnerId = correct && nextHand.length === 0 ? playerId : null;
  const nextPlayerId = state.players.find(player => player.id !== playerId)?.id || playerId;
  return {
    ...state,
    timeline,
    deck,
    discardPile,
    playerHands: { ...state.playerHands, [playerId]: nextHand },
    currentTurnPlayerId: winnerId ? playerId : nextPlayerId,
    winnerId,
    status: winnerId ? 'finished' : 'active',
    moveCount: (state.moveCount || 0) + 1,
    moveStats: incrementMoveStats(state.moveStats || {}, playerId, correct),
  };
}
