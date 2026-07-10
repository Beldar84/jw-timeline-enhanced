import { randomInt } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { CARD_DATA } from '../../data/cards';
import {
  applyRealtimeMove,
  applyTurnBasedMove,
  dealCards,
  runConsecutiveAI,
  type GameCard,
  type GamePlayer,
  type PlayerMoveStats,
  type RealtimeGameState,
  type TurnBasedGameState,
} from './gameLogic';

initializeApp();
const db = getFirestore();
const REGION = 'europe-west1';
const TURN_LIMIT_MS = 24 * 60 * 60 * 1000;
const PRESENCE_TIMEOUT_MS = 45_000;
const GAME_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_SOCIAL_CONNECTIONS = 200;
const cards = CARD_DATA as GameCard[];

interface RealtimeGameDocument extends RealtimeGameState {
  id: string;
  hostId: string;
  participantAuthIds: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt: Record<string, Timestamp>;
  resultsRecorded: boolean;
  handCounts?: Record<string, number>;
  deckCount?: number;
}

interface TurnBasedGameDocument extends TurnBasedGameState {
  id: string;
  playerIds: string[];
  createdAt: Timestamp;
  lastMoveAt: Timestamp;
  expiresAt: Timestamp;
  turnTimeLimit: number;
  resultsRecorded: boolean;
  finishedReason?: 'cards' | 'timeout';
  handCounts?: Record<string, number>;
  deckCount?: number;
}

interface ScoreBucket {
  periodKey: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalPlacements: number;
  correctPlacements: number;
  currentStreak: number;
  bestStreak: number;
  winRate: number;
  accuracy: number;
  score: number;
}

const callableOptions = { region: REGION, maxInstances: 20, timeoutSeconds: 30 } as const;

function requireUser(request: { auth?: { uid: string; token: Record<string, unknown> } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  return request.auth.uid;
}

function requireRegisteredUser(request: { auth?: { uid: string; token: Record<string, unknown> } | null }): string {
  const uid = requireUser(request);
  const firebaseToken = request.auth?.token.firebase as { sign_in_provider?: string } | undefined;
  if (firebaseToken?.sign_in_provider === 'anonymous') {
    throw new HttpsError('failed-precondition', 'Necesitas una cuenta registrada para jugar por turnos.');
  }
  return uid;
}

function text(value: unknown, field: string, maxLength = 40): string {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', `${field} no es válido.`);
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} debe tener entre 1 y ${maxLength} caracteres.`);
  }
  return normalized;
}

function integer(value: unknown, field: string): number {
  if (!Number.isInteger(value)) throw new HttpsError('invalid-argument', `${field} no es válido.`);
  return value as number;
}

function generateGameCode(): string {
  let suffix = '';
  for (let index = 0; index < 6; index++) suffix += GAME_CODE_ALPHABET[randomInt(GAME_CODE_ALPHABET.length)];
  return `JW-${suffix}`;
}

function getRandomBiblicalName(usedNames: string[]): string {
  const names = [
    'David', 'Abigail', 'Rut', 'Pablo', 'Sara', 'Abrahán', 'Moisés', 'María', 'José', 'Rebeca',
    'Isaac', 'Raquel', 'Jacob', 'Lea', 'Samuel', 'Ana', 'Daniel', 'Ester', 'Elías', 'Noé',
  ];
  const available = names.filter(name => !usedNames.includes(name));
  const base = available[randomInt(Math.max(1, available.length))] || names[randomInt(names.length)];
  return usedNames.includes(base) ? `${base} ${randomInt(10, 100)}` : base;
}

function mondayKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  return utc.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function buildSearchPrefixes(name: string): string[] {
  const prefixes = new Set<string>();
  const addPrefixes = (value: string) => {
    const normalized = normalizeSearchText(value);
    for (let length = 2; length <= Math.min(normalized.length, 24); length++) {
      prefixes.add(normalized.slice(0, length));
    }
  };
  addPrefixes(name);
  normalizeSearchText(name).split(/[^a-z0-9]+/).filter(Boolean).forEach(addPrefixes);
  return Array.from(prefixes);
}

interface SocialProfile {
  id: string;
  name: string;
  avatar: string | null;
}

function socialIds(data: DocumentData, field: 'friends' | 'friendRequests'): string[] {
  const values = data[field];
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
    .slice(0, MAX_SOCIAL_CONNECTIONS);
}

function socialProfile(data: DocumentData, fallbackId: string): SocialProfile {
  return {
    id: typeof data.id === 'string' && data.id ? data.id : fallbackId,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Jugador',
    avatar: typeof data.avatar === 'string' && data.avatar ? data.avatar : null,
  };
}

async function loadSocialProfiles(ids: string[]): Promise<SocialProfile[]> {
  if (ids.length === 0) return [];
  const snapshots = await db.getAll(...ids.map(id => db.collection('users').doc(id)));
  return snapshots
    .filter(snapshot => snapshot.exists)
    .map(snapshot => socialProfile(snapshot.data() || {}, snapshot.id));
}

function emptyBucket(periodKey: string): ScoreBucket {
  return {
    periodKey,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    totalPlacements: 0,
    correctPlacements: 0,
    currentStreak: 0,
    bestStreak: 0,
    winRate: 0,
    accuracy: 0,
    score: 0,
  };
}

function applyScore(
  current: Partial<ScoreBucket> | undefined,
  periodKey: string,
  won: boolean,
  moves: PlayerMoveStats
): ScoreBucket {
  const base = current?.periodKey === periodKey ? { ...emptyBucket(periodKey), ...current } : emptyBucket(periodKey);
  base.gamesPlayed++;
  base.wins += won ? 1 : 0;
  base.losses += won ? 0 : 1;
  base.totalPlacements += moves.placed;
  base.correctPlacements += moves.correct;
  base.currentStreak = won ? base.currentStreak + 1 : 0;
  base.bestStreak = Math.max(base.bestStreak, base.currentStreak);
  base.winRate = Math.round((base.wins / base.gamesPlayed) * 1000) / 10;
  base.accuracy = base.totalPlacements > 0
    ? Math.round((base.correctPlacements / base.totalPlacements) * 1000) / 10
    : 0;
  base.score = Math.round(base.wins * 100 + base.accuracy * 10 + base.bestStreak * 50);
  return base;
}

async function recordCompetitiveResults(
  transaction: Transaction,
  gameId: string,
  mode: 'realtime' | 'turnbased',
  players: Array<{ id: string; name: string; isAI?: boolean }>,
  winnerId: string | null,
  moveStats: Record<string, PlayerMoveStats>,
  moveCount: number,
  timelineLength: number,
  finishedReason: 'cards' | 'timeout' = 'cards'
): Promise<void> {
  const humanPlayers = players.filter(player => !player.isAI && !player.id.startsWith('ai-'));
  const statsRefs = humanPlayers.map(player => db.collection('competitiveStats').doc(player.id));
  const publicProfileRefs = humanPlayers.map(player => db.collection('publicProfiles').doc(player.id));
  const [statsSnapshots, publicProfileSnapshots] = await Promise.all([
    Promise.all(statsRefs.map(ref => transaction.get(ref))),
    Promise.all(publicProfileRefs.map(ref => transaction.get(ref))),
  ]);
  const verifiedNames = new Map(
    humanPlayers.map((player, index) => [
      player.id,
      publicProfileSnapshots[index].data()?.name || player.name,
    ])
  );
  const now = new Date();
  const week = mondayKey(now);
  const month = monthKey(now);

  humanPlayers.forEach((player, index) => {
    const existing = statsSnapshots[index].exists ? statsSnapshots[index].data() as DocumentData : {};
    const moves = moveStats[player.id] || { placed: 0, correct: 0, incorrect: 0 };
    const won = winnerId === player.id;
    const allTime = applyScore(existing.allTime, 'all', won, moves);
    const weekly = applyScore(existing.weekly, week, won, moves);
    const monthly = applyScore(existing.monthly, month, won, moves);
    const statsData = {
      id: player.id,
      name: verifiedNames.get(player.id) || player.name,
      allTime,
      weekly,
      monthly,
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(statsRefs[index], statsData, { merge: true });
    transaction.set(db.collection('leaderboard').doc(player.id), statsData, { merge: true });

    const historyId = `${gameId}_${player.id}`;
    transaction.set(db.collection('gameHistory').doc(historyId), {
      id: historyId,
      gameId,
      userId: player.id,
      playerIds: humanPlayers.map(item => item.id),
      players: players.map(item => ({ id: item.id, name: verifiedNames.get(item.id) || item.name })),
      mode,
      result: won ? 'win' : 'loss',
      winnerId,
      winnerName: winnerId
        ? verifiedNames.get(winnerId) || players.find(item => item.id === winnerId)?.name || null
        : null,
      deckId: 'complete',
      durationSeconds: null,
      cardsPlaced: moves.placed,
      correctPlacements: moves.correct,
      incorrectPlacements: moves.incorrect,
      timelineLength,
      moveCount,
      finishedReason,
      finishedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });
}

function realtimeUpdate(state: RealtimeGameState): DocumentData {
  return {
    players: state.players.map(player => ({ ...player, hand: [] })),
    handCounts: Object.fromEntries(state.players.map(player => [player.id, player.hand.length])),
    timeline: state.timeline,
    deck: [],
    deckCount: state.deck.length,
    discardPile: state.discardPile,
    currentPlayerIndex: state.currentPlayerIndex,
    winner: state.winner ? { ...state.winner, hand: [] } : null,
    phase: state.phase,
    message: state.message,
    moveCount: state.moveCount,
    moveStats: state.moveStats,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function handsCollection(gameRef: DocumentReference) {
  return gameRef.collection('hands');
}

function privateStateRef(gameRef: DocumentReference) {
  return gameRef.collection('private').doc('state');
}

function deleteGameSecrets(
  transaction: Transaction,
  gameRef: DocumentReference,
  playerIds: string[]
): void {
  playerIds.forEach(playerId => transaction.delete(handsCollection(gameRef).doc(playerId)));
  transaction.delete(privateStateRef(gameRef));
}

async function hydrateRealtimeState(
  transaction: Transaction,
  gameRef: DocumentReference,
  game: RealtimeGameDocument
): Promise<RealtimeGameDocument> {
  const handRefs = game.players.map(player => handsCollection(gameRef).doc(player.id));
  const [handSnapshots, privateSnapshot] = await Promise.all([
    Promise.all(handRefs.map(ref => transaction.get(ref))),
    transaction.get(privateStateRef(gameRef)),
  ]);
  return {
    ...game,
    players: game.players.map((player, index) => ({
      ...player,
      hand: handSnapshots[index].data()?.cards || [],
    })),
    deck: privateSnapshot.data()?.deck || [],
  };
}

function writeRealtimeSecrets(
  transaction: Transaction,
  gameRef: DocumentReference,
  state: RealtimeGameState
): void {
  state.players.forEach(player => {
    transaction.set(handsCollection(gameRef).doc(player.id), { cards: player.hand });
  });
  transaction.set(privateStateRef(gameRef), { deck: state.deck });
}

async function hydrateTurnBasedState(
  transaction: Transaction,
  gameRef: DocumentReference,
  game: TurnBasedGameDocument
): Promise<TurnBasedGameDocument> {
  const handRefs = game.players.map(player => handsCollection(gameRef).doc(player.id));
  const [handSnapshots, privateSnapshot] = await Promise.all([
    Promise.all(handRefs.map(ref => transaction.get(ref))),
    transaction.get(privateStateRef(gameRef)),
  ]);
  return {
    ...game,
    playerHands: Object.fromEntries(
      game.players.map((player, index) => [player.id, handSnapshots[index].data()?.cards || []])
    ),
    deck: privateSnapshot.data()?.deck || [],
  };
}

function writeTurnBasedSecrets(
  transaction: Transaction,
  gameRef: DocumentReference,
  state: TurnBasedGameState
): void {
  state.players.forEach(player => {
    transaction.set(handsCollection(gameRef).doc(player.id), { cards: state.playerHands[player.id] || [] });
  });
  transaction.set(privateStateRef(gameRef), { deck: state.deck });
}

export const createRealtimeGame = onCall(callableOptions, async request => {
  const uid = requireUser(request);
  const hostName = text(request.data?.hostName, 'El nombre');
  for (let attempt = 0; attempt < 10; attempt++) {
    const gameId = generateGameCode();
    const gameRef = db.collection('realtimeGames').doc(gameId);
    const created = await db.runTransaction(async (transaction: Transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (snapshot.exists) return false;
      const now = Timestamp.now();
      const game: RealtimeGameDocument = {
        id: gameId,
        phase: 'LOBBY',
        players: [{ id: uid, name: hostName, hand: [], isAI: false }],
        hostId: uid,
        timeline: [],
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        winner: null,
        message: 'Esperando a jugadores...',
        participantAuthIds: [uid],
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: { [uid]: now },
        moveCount: 0,
        moveStats: {},
        resultsRecorded: false,
      };
      transaction.create(gameRef, game);
      return true;
    });
    if (created) return { gameId, playerId: uid };
  }
  throw new HttpsError('resource-exhausted', 'No se pudo generar un código de sala.');
});

export const joinRealtimeGame = onCall(callableOptions, async request => {
  const uid = requireUser(request);
  const gameId = text(request.data?.gameId, 'El código', 12).toUpperCase();
  const playerName = text(request.data?.playerName, 'El nombre');
  const gameRef = db.collection('realtimeGames').doc(gameId);

  await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Sala no encontrada. Verifica el código.');
    const game = snapshot.data() as RealtimeGameDocument;
    if (game.phase !== 'LOBBY') throw new HttpsError('failed-precondition', 'La partida ya ha empezado.');
    const players = [...game.players];
    const existingIndex = players.findIndex(player => player.id === uid);
    if (existingIndex >= 0) {
      players[existingIndex] = { ...players[existingIndex], name: playerName };
    } else {
      if (players.length >= 6) throw new HttpsError('resource-exhausted', 'La sala está llena.');
      players.push({ id: uid, name: playerName, hand: [], isAI: false });
    }
    transaction.update(gameRef, {
      players,
      participantAuthIds: Array.from(new Set([...game.participantAuthIds, uid])),
      [`lastSeenAt.${uid}`]: FieldValue.serverTimestamp(),
      message: 'Esperando a jugadores...',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true, playerId: uid };
});

export const addRealtimeBot = onCall(callableOptions, async request => {
  const uid = requireUser(request);
  const gameId = text(request.data?.gameId, 'El código', 12).toUpperCase();
  const gameRef = db.collection('realtimeGames').doc(gameId);
  await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Sala no encontrada.');
    const game = snapshot.data() as RealtimeGameDocument;
    if (game.hostId !== uid) throw new HttpsError('permission-denied', 'Solo el anfitrión puede añadir bots.');
    if (game.phase !== 'LOBBY') throw new HttpsError('failed-precondition', 'La partida ya ha empezado.');
    if (game.players.length >= 6) throw new HttpsError('resource-exhausted', 'La sala está llena.');
    const bot: GamePlayer = {
      id: `ai-${Date.now()}-${randomInt(1000, 9999)}`,
      name: getRandomBiblicalName(game.players.map(player => player.name)),
      hand: [],
      isAI: true,
    };
    transaction.update(gameRef, {
      players: [...game.players, bot],
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true };
});

export const startRealtimeGame = onCall(callableOptions, async request => {
  const uid = requireUser(request);
  const gameId = text(request.data?.gameId, 'El código', 12).toUpperCase();
  const gameRef = db.collection('realtimeGames').doc(gameId);
  await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Sala no encontrada.');
    const game = snapshot.data() as RealtimeGameDocument;
    if (game.hostId !== uid) throw new HttpsError('permission-denied', 'Solo el anfitrión puede empezar.');
    if (game.phase !== 'LOBBY' || game.players.length < 2) {
      throw new HttpsError('failed-precondition', 'Se necesitan al menos dos jugadores.');
    }
    const dealt = dealCards(cards, game.players.map(player => player.id));
    const players = game.players.map(player => ({ ...player, hand: dealt.hands[player.id] }));
    const state: RealtimeGameState = {
      ...game,
      players,
      deck: dealt.deck,
      timeline: dealt.timeline,
      discardPile: [],
      phase: 'PLAYING',
      currentPlayerIndex: 0,
      winner: null,
      message: `Es el turno de ${players[0].name}.`,
      moveCount: 0,
      moveStats: Object.fromEntries(players.map(player => [player.id, { placed: 0, correct: 0, incorrect: 0 }])),
    };
    writeRealtimeSecrets(transaction, gameRef, state);
    transaction.update(gameRef, {
      ...realtimeUpdate(state),
      resultsRecorded: false,
    });
  });
  return { success: true };
});

export const makeRealtimeMove = onCall(callableOptions, async request => {
  const uid = requireUser(request);
  const gameId = text(request.data?.gameId, 'El código', 12).toUpperCase();
  const cardId = integer(request.data?.cardId, 'La carta');
  const timelineIndex = integer(request.data?.timelineIndex, 'La posición');
  const gameRef = db.collection('realtimeGames').doc(gameId);

  await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Partida no encontrada.');
    const publicGame = snapshot.data() as RealtimeGameDocument;
    const game = await hydrateRealtimeState(transaction, gameRef, publicGame);
    if (!game.participantAuthIds.includes(uid)) throw new HttpsError('permission-denied', 'No participas en esta partida.');
    let state: RealtimeGameState;
    try {
      state = runConsecutiveAI(applyRealtimeMove(game, uid, cardId, timelineIndex));
    } catch (error) {
      throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'Movimiento no válido.');
    }

    if (state.phase === 'GAME_OVER' && !game.resultsRecorded) {
      await recordCompetitiveResults(
        transaction,
        game.id,
        'realtime',
        state.players,
        state.winner?.id || null,
        state.moveStats,
        state.moveCount,
        state.timeline.length
      );
    }
    if (state.phase === 'GAME_OVER') {
      deleteGameSecrets(transaction, gameRef, game.players.map(player => player.id));
    } else {
      writeRealtimeSecrets(transaction, gameRef, state);
    }
    transaction.update(gameRef, {
      ...realtimeUpdate(state),
      resultsRecorded: state.phase === 'GAME_OVER' ? true : game.resultsRecorded,
    });
  });
  return { success: true };
});

export const leaveRealtimeGame = onCall(callableOptions, async request => {
  const uid = requireUser(request);
  const gameId = text(request.data?.gameId, 'El código', 12).toUpperCase();
  const leavingPlayerId = text(request.data?.playerId || uid, 'El jugador', 128);
  const gameRef = db.collection('realtimeGames').doc(gameId);

  await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) return;
    const publicGame = snapshot.data() as RealtimeGameDocument;
    const game = await hydrateRealtimeState(transaction, gameRef, publicGame);
    if (!game.participantAuthIds.includes(uid)) throw new HttpsError('permission-denied', 'No participas en esta partida.');
    const leavingPlayer = game.players.find(player => player.id === leavingPlayerId);
    if (!leavingPlayer || leavingPlayer.isAI || game.phase === 'GAME_OVER') return;

    if (leavingPlayerId !== uid) {
      const lastSeen = game.lastSeenAt?.[leavingPlayerId]?.toMillis?.() || 0;
      if (Date.now() - lastSeen <= PRESENCE_TIMEOUT_MS) {
        throw new HttpsError('failed-precondition', 'El jugador todavía está conectado.');
      }
    }

    const players = game.players.filter(player => player.id !== leavingPlayerId);
    const participantAuthIds = game.participantAuthIds.filter(id => id !== leavingPlayerId);
    const lastSeenAt = { ...game.lastSeenAt };
    delete lastSeenAt[leavingPlayerId];
    const humans = players.filter(player => !player.isAI);
    let state: RealtimeGameState = { ...game, players };

    if (game.phase === 'LOBBY') {
      state = {
        ...state,
        phase: humans.length === 0 ? 'GAME_OVER' : 'LOBBY',
        winner: null,
        message: humans.length === 0 ? 'La sala se ha cerrado.' : `${leavingPlayer.name} ha salido de la sala.`,
      };
    } else if (game.phase === 'PLAYING') {
      if (humans.length <= 1) {
        const winner = humans[0] || null;
        state = {
          ...state,
          phase: 'GAME_OVER',
          winner,
          message: winner
            ? `${leavingPlayer.name} ha abandonado. ${winner.name} gana por abandono.`
            : 'La partida se ha cancelado.',
        };
      } else {
        const oldCurrent = game.players[game.currentPlayerIndex];
        const currentPlayerIndex = oldCurrent?.id === leavingPlayerId
          ? game.currentPlayerIndex % players.length
          : Math.max(0, players.findIndex(player => player.id === oldCurrent?.id));
        state = runConsecutiveAI({
          ...state,
          currentPlayerIndex,
          message: `${leavingPlayer.name} ha abandonado la partida.`,
        });
      }
    }

    if (state.phase === 'GAME_OVER' && state.winner && !game.resultsRecorded) {
      await recordCompetitiveResults(
        transaction,
        game.id,
        'realtime',
        game.players,
        state.winner.id,
        state.moveStats || {},
        state.moveCount || 0,
        state.timeline.length
      );
    } else if (game.phase === 'PLAYING' && state.phase === 'PLAYING' && !leavingPlayer.isAI) {
      // In games with three or more people, an abandonment does not finish the
      // match. Record that participant's loss now; the remaining players are
      // recorded atomically when their game ends.
      await recordCompetitiveResults(
        transaction,
        game.id,
        'realtime',
        [leavingPlayer],
        null,
        state.moveStats || {},
        state.moveCount || 0,
        state.timeline.length
      );
    }
    if (state.phase === 'GAME_OVER') {
      deleteGameSecrets(transaction, gameRef, game.players.map(player => player.id));
    } else {
      writeRealtimeSecrets(transaction, gameRef, state);
      transaction.delete(handsCollection(gameRef).doc(leavingPlayerId));
    }
    transaction.update(gameRef, {
      ...realtimeUpdate(state),
      participantAuthIds,
      lastSeenAt,
      hostId: game.hostId === leavingPlayerId ? humans[0]?.id || game.hostId : game.hostId,
      resultsRecorded: state.phase === 'GAME_OVER' && state.winner ? true : game.resultsRecorded,
    });
  });
  return { success: true };
});

export const getSocialConnections = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const userSnapshot = await db.collection('users').doc(uid).get();
  if (!userSnapshot.exists) throw new HttpsError('not-found', 'No existe el perfil.');

  const user = userSnapshot.data() || {};
  const friendIds = socialIds(user, 'friends');
  const requestIds = socialIds(user, 'friendRequests');
  const [friends, requests] = await Promise.all([
    loadSocialProfiles(friendIds),
    loadSocialProfiles(requestIds),
  ]);

  return { friends, requests };
});

export const searchUsers = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const searchTerm = normalizeSearchText(text(request.data?.searchTerm, 'La búsqueda', 80));
  if (searchTerm.length < 2) {
    throw new HttpsError('invalid-argument', 'Escribe al menos 2 caracteres.');
  }

  const prefix = searchTerm.slice(0, 24);
  // The prefix-array query supports searching by any word in the display name.
  // nameLower also covers older profiles that have not regenerated that array.
  const [prefixSnapshot, nameSnapshot] = await Promise.all([
    db.collection('users').where('searchPrefixes', 'array-contains', prefix).limit(11).get(),
    db.collection('users')
      .where('nameLower', '>=', searchTerm)
      .where('nameLower', '<=', `${searchTerm}\uf8ff`)
      .limit(11)
      .get(),
  ]);

  const users = new Map<string, SocialProfile>();
  [...prefixSnapshot.docs, ...nameSnapshot.docs].forEach(snapshot => {
    if (snapshot.id !== uid && users.size < 10) {
      users.set(snapshot.id, socialProfile(snapshot.data(), snapshot.id));
    }
  });

  return { users: Array.from(users.values()) };
});

export const sendFriendRequest = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const friendId = text(request.data?.friendId, 'El jugador', 128);
  if (friendId === uid) throw new HttpsError('invalid-argument', 'No puedes agregarte a ti mismo.');
  const userRef = db.collection('users').doc(uid);
  const friendRef = db.collection('users').doc(friendId);

  await db.runTransaction(async (transaction: Transaction) => {
    const [userSnapshot, friendSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(friendRef),
    ]);
    if (!userSnapshot.exists || !friendSnapshot.exists) throw new HttpsError('not-found', 'El jugador no existe.');
    const user = userSnapshot.data() || {};
    const friend = friendSnapshot.data() || {};
    if (Array.isArray(user.friends) && user.friends.includes(friendId)) return;
    if (Array.isArray(friend.friendRequests) && friend.friendRequests.includes(uid)) return;
    transaction.update(friendRef, { friendRequests: FieldValue.arrayUnion(uid) });
  });
  return { success: true };
});

export const respondFriendRequest = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const friendId = text(request.data?.friendId, 'El jugador', 128);
  const accept = request.data?.accept;
  if (typeof accept !== 'boolean') throw new HttpsError('invalid-argument', 'La respuesta no es válida.');
  const userRef = db.collection('users').doc(uid);
  const friendRef = db.collection('users').doc(friendId);

  await db.runTransaction(async (transaction: Transaction) => {
    const [userSnapshot, friendSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(friendRef),
    ]);
    if (!userSnapshot.exists || !friendSnapshot.exists) throw new HttpsError('not-found', 'El jugador no existe.');
    const requests = userSnapshot.data()?.friendRequests;
    if (!Array.isArray(requests) || !requests.includes(friendId)) {
      throw new HttpsError('failed-precondition', 'No existe una solicitud pendiente.');
    }
    transaction.update(userRef, {
      friendRequests: FieldValue.arrayRemove(friendId),
      ...(accept ? { friends: FieldValue.arrayUnion(friendId) } : {}),
    });
    if (accept) transaction.update(friendRef, { friends: FieldValue.arrayUnion(uid) });
  });
  return { success: true };
});

export const removeFriend = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const friendId = text(request.data?.friendId, 'El jugador', 128);
  if (friendId === uid) throw new HttpsError('invalid-argument', 'El jugador no es válido.');
  const userRef = db.collection('users').doc(uid);
  const friendRef = db.collection('users').doc(friendId);

  await db.runTransaction(async (transaction: Transaction) => {
    const [userSnapshot, friendSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(friendRef),
    ]);
    if (!userSnapshot.exists || !friendSnapshot.exists) return;
    transaction.update(userRef, { friends: FieldValue.arrayRemove(friendId) });
    transaction.update(friendRef, { friends: FieldValue.arrayRemove(uid) });
  });
  return { success: true };
});

export const sendGameInvitation = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const friendId = text(request.data?.friendId, 'El jugador', 128);
  const gameId = text(request.data?.gameId, 'La partida', 12).toUpperCase();
  const gameMode = text(request.data?.gameMode, 'El modo', 16);
  if (gameMode !== 'realtime') {
    throw new HttpsError('invalid-argument', 'Las partidas por turnos crean su propia invitación.');
  }
  const userRef = db.collection('users').doc(uid);
  const friendRef = db.collection('users').doc(friendId);
  const gameRef = db.collection('realtimeGames').doc(gameId);
  const invitationRef = db.collection('gameInvitations').doc();

  await db.runTransaction(async (transaction: Transaction) => {
    const [userSnapshot, friendSnapshot, gameSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(friendRef),
      transaction.get(gameRef),
    ]);
    if (!userSnapshot.exists || !friendSnapshot.exists) throw new HttpsError('not-found', 'El jugador no existe.');
    const user = userSnapshot.data() || {};
    if (!Array.isArray(user.friends) || !user.friends.includes(friendId)) {
      throw new HttpsError('permission-denied', 'Solo puedes invitar a un amigo.');
    }
    if (!gameSnapshot.exists) throw new HttpsError('not-found', 'La sala no existe.');
    const game = gameSnapshot.data() as RealtimeGameDocument;
    if (game.hostId !== uid || game.phase !== 'LOBBY') {
      throw new HttpsError('failed-precondition', 'Solo el anfitrión puede invitar desde una sala abierta.');
    }
    const now = Timestamp.now();
    transaction.create(invitationRef, {
      id: invitationRef.id,
      fromUserId: uid,
      fromUserName: user.name || 'Jugador',
      toUserId: friendId,
      gameId,
      gameMode,
      status: 'pending',
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000),
    });
  });
  return { success: true, invitationId: invitationRef.id };
});

async function getPublicName(userId: string, fallback: string): Promise<string> {
  const publicSnapshot = await db.collection('publicProfiles').doc(userId).get();
  if (publicSnapshot.exists) return publicSnapshot.data()?.name || fallback;
  const privateSnapshot = await db.collection('users').doc(userId).get();
  return privateSnapshot.exists ? privateSnapshot.data()?.name || fallback : fallback;
}

export const createTurnBasedGame = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const opponentId = text(request.data?.opponentId, 'El oponente', 128);
  if (opponentId === uid) throw new HttpsError('invalid-argument', 'No puedes jugar contra ti mismo.');
  const [creatorName, opponentName, creatorUser, opponentUser] = await Promise.all([
    getPublicName(uid, 'Jugador 1'),
    getPublicName(opponentId, 'Jugador 2'),
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(opponentId).get(),
  ]);
  if (!creatorUser.exists) throw new HttpsError('failed-precondition', 'No existe tu perfil de jugador.');
  if (!opponentUser.exists) throw new HttpsError('not-found', 'El oponente no existe.');
  const friends = creatorUser.data()?.friends;
  if (!Array.isArray(friends) || !friends.includes(opponentId)) {
    throw new HttpsError('permission-denied', 'Solo puedes desafiar a un amigo.');
  }

  const gameRef = db.collection('turnBasedGames').doc();
  const dealt = dealCards(cards, [uid, opponentId]);
  const now = Timestamp.now();
  const game: TurnBasedGameDocument = {
    id: gameRef.id,
    playerIds: [uid, opponentId],
    players: [{ id: uid, name: creatorName }, { id: opponentId, name: opponentName }],
    currentTurnPlayerId: uid,
    timeline: dealt.timeline,
    deck: dealt.deck,
    playerHands: dealt.hands,
    discardPile: [],
    status: 'pending',
    winnerId: null,
    lastMoveAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + TURN_LIMIT_MS),
    createdAt: now,
    turnTimeLimit: TURN_LIMIT_MS,
    moveCount: 0,
    moveStats: {
      [uid]: { placed: 0, correct: 0, incorrect: 0 },
      [opponentId]: { placed: 0, correct: 0, incorrect: 0 },
    },
    resultsRecorded: false,
  };

  const invitationRef = db.collection('gameInvitations').doc();
  const batch = db.batch();
  batch.create(gameRef, {
    ...game,
    deck: [],
    deckCount: game.deck.length,
    playerHands: {},
    handCounts: Object.fromEntries(game.players.map(player => [player.id, game.playerHands[player.id].length])),
  });
  game.players.forEach(player => {
    batch.create(handsCollection(gameRef).doc(player.id), { cards: game.playerHands[player.id] });
  });
  batch.create(privateStateRef(gameRef), { deck: game.deck });
  batch.create(invitationRef, {
    id: invitationRef.id,
    fromUserId: uid,
    fromUserName: creatorName,
    toUserId: opponentId,
    gameId: gameRef.id,
    gameMode: 'turnbased',
    status: 'pending',
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000),
  });
  await batch.commit();
  return { success: true, gameId: gameRef.id };
});

export const respondGameInvitation = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const invitationId = text(request.data?.invitationId, 'La invitación', 128);
  const response = text(request.data?.response, 'La respuesta', 16);
  if (response !== 'accepted' && response !== 'declined') {
    throw new HttpsError('invalid-argument', 'La respuesta no es válida.');
  }
  const invitationRef = db.collection('gameInvitations').doc(invitationId);

  return db.runTransaction(async (transaction: Transaction) => {
    const invitationSnapshot = await transaction.get(invitationRef);
    if (!invitationSnapshot.exists) throw new HttpsError('not-found', 'Invitación no encontrada.');
    const invitation = invitationSnapshot.data() as DocumentData;
    if (invitation.toUserId !== uid) throw new HttpsError('permission-denied', 'Esta invitación no es para ti.');
    if (invitation.status !== 'pending') throw new HttpsError('failed-precondition', 'La invitación ya fue respondida.');

    const gameRef = invitation.gameMode === 'turnbased' && typeof invitation.gameId === 'string'
      ? db.collection('turnBasedGames').doc(invitation.gameId)
      : null;
    const gameSnapshot = gameRef ? await transaction.get(gameRef) : null;
    const expiresAt = invitation.expiresAt?.toMillis?.() || 0;
    const expired = expiresAt > 0 && expiresAt <= Date.now();

    if (expired) {
      transaction.update(invitationRef, { status: 'expired' });
      if (gameRef && gameSnapshot?.exists) {
        const game = gameSnapshot.data() as TurnBasedGameDocument;
        transaction.update(gameRef, { status: 'declined', lastMoveAt: FieldValue.serverTimestamp() });
        deleteGameSecrets(transaction, gameRef, game.playerIds);
      }
      return { success: false };
    }

    if (gameRef) {
      if (!gameSnapshot?.exists) throw new HttpsError('not-found', 'La partida ya no existe.');
      const game = gameSnapshot.data() as TurnBasedGameDocument;
      if (!game.playerIds.includes(uid) || game.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'La partida ya no está pendiente.');
      }
      const now = Timestamp.now();
      transaction.update(gameRef, response === 'accepted'
        ? {
            status: 'active',
            lastMoveAt: now,
            expiresAt: Timestamp.fromMillis(now.toMillis() + TURN_LIMIT_MS),
          }
        : {
            status: 'declined',
            lastMoveAt: now,
          });
      if (response === 'declined') deleteGameSecrets(transaction, gameRef, game.playerIds);
    }

    transaction.update(invitationRef, { status: response });
    return {
      success: true,
      gameId: invitation.gameId || null,
      gameMode: invitation.gameMode || 'realtime',
    };
  });
});

async function finishExpiredTurnBasedGame(transaction: Transaction, game: TurnBasedGameDocument): Promise<boolean> {
  if (game.status !== 'active' || game.expiresAt.toMillis() > Date.now()) return false;
  const winnerId = game.players.find(player => player.id !== game.currentTurnPlayerId)?.id || null;
  if (!winnerId) return false;
  if (!game.resultsRecorded) {
    await recordCompetitiveResults(
      transaction,
      game.id,
      'turnbased',
      game.players,
      winnerId,
      game.moveStats || {},
      game.moveCount || 0,
      game.timeline.length,
      'timeout'
    );
  }
  transaction.update(db.collection('turnBasedGames').doc(game.id), {
    status: 'finished',
    winnerId,
    finishedReason: 'timeout',
    resultsRecorded: true,
    lastMoveAt: FieldValue.serverTimestamp(),
  });
  deleteGameSecrets(
    transaction,
    db.collection('turnBasedGames').doc(game.id),
    game.playerIds
  );
  return true;
}

export const makeTurnBasedMove = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const gameId = text(request.data?.gameId, 'La partida', 128);
  const cardId = integer(request.data?.cardId, 'La carta');
  const timelineIndex = integer(request.data?.timelineIndex, 'La posición');
  const gameRef = db.collection('turnBasedGames').doc(gameId);

  const result = await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Partida no encontrada.');
    const publicGame = snapshot.data() as TurnBasedGameDocument;
    if (!publicGame.playerIds.includes(uid)) throw new HttpsError('permission-denied', 'No participas en esta partida.');
    if (await finishExpiredTurnBasedGame(transaction, publicGame)) return { success: false, expired: true };
    const game = await hydrateTurnBasedState(transaction, gameRef, publicGame);

    let state: TurnBasedGameState;
    try {
      state = applyTurnBasedMove(game, uid, cardId, timelineIndex);
    } catch (error) {
      throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'Movimiento no válido.');
    }

    if (state.status === 'finished' && !game.resultsRecorded) {
      await recordCompetitiveResults(
        transaction,
        game.id,
        'turnbased',
        state.players,
        state.winnerId,
        state.moveStats,
        state.moveCount,
        state.timeline.length
      );
    }
    if (state.status === 'finished') {
      deleteGameSecrets(transaction, gameRef, game.playerIds);
    } else {
      writeTurnBasedSecrets(transaction, gameRef, state);
    }
    transaction.update(gameRef, {
      timeline: state.timeline,
      deck: [],
      deckCount: state.deck.length,
      discardPile: state.discardPile,
      playerHands: {},
      handCounts: Object.fromEntries(state.players.map(player => [player.id, state.playerHands[player.id]?.length || 0])),
      currentTurnPlayerId: state.currentTurnPlayerId,
      winnerId: state.winnerId,
      status: state.status,
      moveCount: state.moveCount,
      moveStats: state.moveStats,
      lastMoveAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + TURN_LIMIT_MS),
      finishedReason: state.status === 'finished' ? 'cards' : FieldValue.delete(),
      resultsRecorded: state.status === 'finished' ? true : game.resultsRecorded,
    });
    return { success: true, expired: false };
  });
  return result;
});

export const claimTurnBasedTimeout = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const gameId = text(request.data?.gameId, 'La partida', 128);
  const gameRef = db.collection('turnBasedGames').doc(gameId);
  const claimed = await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Partida no encontrada.');
    const game = snapshot.data() as TurnBasedGameDocument;
    if (!game.playerIds.includes(uid)) throw new HttpsError('permission-denied', 'No participas en esta partida.');
    if (game.currentTurnPlayerId === uid) throw new HttpsError('failed-precondition', 'No puedes reclamar tu propio turno.');
    return finishExpiredTurnBasedGame(transaction, game);
  });
  return { success: claimed };
});

export const expireTurnBasedGames = onSchedule(
  { region: REGION, schedule: 'every 60 minutes', timeZone: 'Europe/Madrid', timeoutSeconds: 300 },
  async () => {
    const expired = await db.collection('turnBasedGames')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', Timestamp.now())
      .limit(100)
      .get();
    let completed = 0;
    for (const snapshot of expired.docs) {
      const didFinish = await db.runTransaction(async (transaction: Transaction) => {
        const fresh = await transaction.get(snapshot.ref);
        return fresh.exists && finishExpiredTurnBasedGame(transaction, fresh.data() as TurnBasedGameDocument);
      });
      if (didFinish) completed++;
    }
    logger.info('Expired turn-based games processed', { completed });
  }
);

function publicProfileData(data: DocumentData, userId: string): DocumentData {
  const name = String(data.name || 'Jugador').trim() || 'Jugador';
  const normalizedName = normalizeSearchText(name);
  return {
    id: userId,
    name,
    nameLower: normalizedName,
    searchPrefixes: buildSearchPrefixes(name),
    avatar: data.avatar || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export const mirrorPublicProfile = onDocumentWritten(
  { region: REGION, document: 'users/{userId}' },
  async event => {
    const userId = event.params.userId;
    const after = event.data?.after;
    const publicRef = db.collection('publicProfiles').doc(userId);
    if (!after?.exists) {
      await publicRef.delete();
      return;
    }
    await publicRef.set(publicProfileData(after.data() || {}, userId), { merge: true });
  }
);

export const refreshPublicProfile = onCall(callableOptions, async request => {
  const uid = requireRegisteredUser(request);
  const privateSnapshot = await db.collection('users').doc(uid).get();
  if (!privateSnapshot.exists) throw new HttpsError('not-found', 'No existe el perfil.');
  await db.collection('publicProfiles').doc(uid).set(publicProfileData(privateSnapshot.data() || {}, uid), { merge: true });
  return { success: true };
});
