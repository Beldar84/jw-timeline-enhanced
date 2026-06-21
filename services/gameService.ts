import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { GameState, Player, Card, OnlineGamePhase } from '../types';
import { CARD_DATA } from '../data/cards';
import { shuffleArray } from '../utils/shuffle';
import { canPlaceCard, getValidTimelineMoves } from '../utils/timelineRules';
import { firebaseService, firestoreDb } from './firebaseService';

type RealtimeGameDocument = GameState & {
  participantAuthIds: string[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const BIBLICAL_NAMES = [
  'David', 'Abigail', 'Ruth', 'Pablo', 'Sara', 'Abraham', 'Moisés', 'María',
  'José', 'Rebeca', 'Isaac', 'Raquel', 'Jacob', 'Lea', 'Samuel', 'Ana',
  'Daniel', 'Ester', 'Elías', 'Eliseo', 'Noé', 'Jonás', 'Pedro', 'Juan',
  'Mateo', 'Lucas', 'Marcos', 'Timoteo', 'Lidia', 'Priscila', 'Aquila', 'Bernabé',
  'Silas', 'Tito', 'Filemón', 'Dorcas', 'Cornelio', 'Esteban', 'Felipe', 'Andrés'
];

function getRandomBiblicalName(usedNames: string[]): string {
  const availableNames = BIBLICAL_NAMES.filter(name => !usedNames.includes(name));
  if (availableNames.length === 0) {
    const randomName = BIBLICAL_NAMES[Math.floor(Math.random() * BIBLICAL_NAMES.length)];
    return `${randomName} ${Math.floor(Math.random() * 100)}`;
  }
  return availableNames[Math.floor(Math.random() * availableNames.length)];
}

function generateShortId(): string {
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `JW-${number}`;
}

function toGameState(data: RealtimeGameDocument): GameState {
  return {
    id: data.id,
    phase: data.phase,
    players: data.players || [],
    hostId: data.hostId,
    timeline: data.timeline || [],
    deck: data.deck || [],
    discardPile: data.discardPile || [],
    currentPlayerIndex: data.currentPlayerIndex || 0,
    winner: data.winner || null,
    message: data.message || null,
  };
}

class GameService {
  private gameState: GameState | null = null;
  private participantAuthIds: string[] = [];
  private createdBy: string | null = null;
  private listeners = new Set<(state: GameState) => void>();
  private unsubscribeFromGame: (() => void) | null = null;
  private subscribedGameId: string | null = null;
  private localPlayerId: string | null = null;
  private isHost = false;

  constructor() {
    window.addEventListener('beforeunload', () => {
      this.stopListening();
    });
  }

  private async ensureSignedIn(): Promise<string | null> {
    let userId = firebaseService.getCurrentUserId();
    if (!userId) {
      userId = await firebaseService.signInAnonymous();
    }
    return userId;
  }

  private gameRef(gameId: string) {
    return doc(firestoreDb, 'realtimeGames', gameId);
  }

  private notify() {
    if (!this.gameState) return;
    const snapshot = JSON.parse(JSON.stringify(this.gameState)) as GameState;
    this.listeners.forEach(callback => callback(snapshot));
  }

  private async persistState(): Promise<void> {
    if (!this.gameState || !this.createdBy) return;

    const gameDoc: RealtimeGameDocument = {
      ...this.gameState,
      participantAuthIds: this.participantAuthIds,
      createdBy: this.createdBy,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(this.gameRef(this.gameState.id), gameDoc);
  }

  private broadcastState() {
    this.notify();
    this.persistState().catch(error => {
      console.error('[GameService] Error sincronizando partida:', error);
    });
  }

  private stopListening() {
    if (this.unsubscribeFromGame) {
      this.unsubscribeFromGame();
      this.unsubscribeFromGame = null;
      this.subscribedGameId = null;
    }
  }

  private loadDocument(data: RealtimeGameDocument) {
    this.gameState = toGameState(data);
    this.participantAuthIds = data.participantAuthIds || [];
    this.createdBy = data.createdBy || null;
  }

  async createGame(hostName: string): Promise<{ gameId: string; playerId: string }> {
    this.disconnect();

    const userId = await this.ensureSignedIn();
    if (!userId) {
      throw new Error('No se pudo iniciar sesión para crear la sala.');
    }

    this.isHost = true;
    this.localPlayerId = userId;

    for (let attempts = 0; attempts < 8; attempts++) {
      const gameId = generateShortId();
      const gameRef = this.gameRef(gameId);
      const existing = await getDoc(gameRef);
      if (existing.exists()) continue;

      const gameState: GameState = {
        id: gameId,
        phase: OnlineGamePhase.LOBBY,
        players: [{
          id: userId,
          name: hostName,
          hand: [],
          isAI: false,
        }],
        hostId: userId,
        timeline: [],
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        winner: null,
        message: 'Esperando a jugadores...',
      };

      const gameDoc: RealtimeGameDocument = {
        ...gameState,
        participantAuthIds: [userId],
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(gameRef, gameDoc);
      this.loadDocument(gameDoc);
      this.notify();

      return { gameId, playerId: userId };
    }

    throw new Error('No se pudo generar un código de sala. Inténtalo de nuevo.');
  }

  async joinGame(gameId: string, playerName: string): Promise<{ success: boolean; playerId: string; error?: string }> {
    this.disconnect();

    const userId = await this.ensureSignedIn();
    if (!userId) {
      return { success: false, playerId: '', error: 'No se pudo iniciar sesión para unirse a la sala.' };
    }

    try {
      const gameRef = this.gameRef(gameId);
      const snapshot = await getDoc(gameRef);
      if (!snapshot.exists()) {
        return { success: false, playerId: '', error: 'Sala no encontrada. Verifica el código de partida.' };
      }

      const gameDoc = snapshot.data() as RealtimeGameDocument;
      if (gameDoc.phase !== OnlineGamePhase.LOBBY) {
        return { success: false, playerId: '', error: 'La partida ya ha empezado.' };
      }

      const players = [...(gameDoc.players || [])];
      const existingPlayerIndex = players.findIndex(player => player.id === userId);

      if (existingPlayerIndex >= 0) {
        players[existingPlayerIndex] = {
          ...players[existingPlayerIndex],
          name: playerName,
        };
      } else {
        if (players.length >= 6) {
          return { success: false, playerId: '', error: 'La sala está llena.' };
        }

        players.push({
          id: userId,
          name: playerName,
          hand: [],
          isAI: false,
        });
      }

      const participantAuthIds = Array.from(new Set([...(gameDoc.participantAuthIds || []), userId]));
      const nextDoc: RealtimeGameDocument = {
        ...gameDoc,
        players,
        participantAuthIds,
        message: 'Esperando a jugadores...',
        updatedAt: serverTimestamp(),
      };

      await updateDoc(gameRef, {
        players,
        participantAuthIds,
        message: nextDoc.message,
        updatedAt: serverTimestamp(),
      });

      this.isHost = gameDoc.hostId === userId;
      this.localPlayerId = userId;
      this.loadDocument(nextDoc);
      this.notify();

      return { success: true, playerId: userId };
    } catch (error: any) {
      console.error('[GameService] Error al unirse:', error);
      return {
        success: false,
        playerId: '',
        error: error?.code === 'permission-denied'
          ? 'Firebase no permite acceder a esta sala. Despliega las reglas actualizadas de Firestore.'
          : 'No se pudo conectar con la sala.',
      };
    }
  }

  disconnect() {
    this.stopListening();
    this.gameState = null;
    this.participantAuthIds = [];
    this.createdBy = null;
    this.localPlayerId = null;
    this.isHost = false;
  }

  subscribeToGame(gameId: string, callback: (state: GameState) => void) {
    this.listeners.add(callback);
    if (this.gameState) callback(JSON.parse(JSON.stringify(this.gameState)));

    if (this.subscribedGameId !== gameId) {
      this.stopListening();
      this.subscribedGameId = gameId;
      this.unsubscribeFromGame = onSnapshot(this.gameRef(gameId), (snapshot) => {
        if (!snapshot.exists()) return;

        this.loadDocument(snapshot.data() as RealtimeGameDocument);
        this.notify();
      }, (error) => {
        console.error('[GameService] Error escuchando sala:', error);
      });
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  addBot(gameId: string, hostId: string) {
    if (!this.isHost || !this.gameState || this.gameState.id !== gameId || this.gameState.hostId !== hostId) return;
    if (this.gameState.players.length >= 6) return;

    const usedNames = this.gameState.players.map(player => player.name);
    const biblicalName = getRandomBiblicalName(usedNames);

    this.gameState.players.push({
      id: `ai-${Date.now()}`,
      name: biblicalName,
      hand: [],
      isAI: true,
    });

    this.broadcastState();
  }

  startGame(gameId: string, playerId: string) {
    if (!this.isHost || !this.gameState || this.gameState.id !== gameId || this.gameState.hostId !== playerId) return;
    if (this.gameState.players.length < 2 || this.gameState.phase !== OnlineGamePhase.LOBBY) return;

    const shuffledDeck = shuffleArray(CARD_DATA);
    const initialTimelineCard = shuffledDeck.pop();
    if (!initialTimelineCard) return;

    const players = this.gameState.players.map(player => ({
      ...player,
      hand: [] as Card[],
    }));

    for (let i = 0; i < 4; i++) {
      for (const player of players) {
        const card = shuffledDeck.pop();
        if (card) player.hand.push(card);
      }
    }

    this.gameState = {
      ...this.gameState,
      players,
      deck: shuffledDeck,
      timeline: [initialTimelineCard],
      discardPile: [],
      phase: OnlineGamePhase.PLAYING,
      currentPlayerIndex: 0,
      winner: null,
      message: `Es el turno de ${players[0].name}.`,
    };

    this.broadcastState();

    if (this.gameState.players[0].isAI) {
      this.playAITurn();
    }
  }

  placeCard(gameId: string, playerId: string, cardId: number, timelineIndex: number) {
    if (!this.gameState || this.gameState.id !== gameId || this.localPlayerId !== playerId) return;
    this.processPlaceCard(playerId, cardId, timelineIndex);
  }

  private processPlaceCard(playerId: string, cardId: number, timelineIndex: number) {
    if (!this.gameState || this.gameState.phase !== OnlineGamePhase.PLAYING) return;

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;
    if (!Number.isInteger(timelineIndex) || timelineIndex < 0 || timelineIndex > this.gameState.timeline.length) return;

    const cardToPlace = currentPlayer.hand.find(card => card.id === cardId);
    if (!cardToPlace) return;

    const players = this.gameState.players.map(player => ({
      ...player,
      hand: [...player.hand],
    }));
    const activePlayer = players[this.gameState.currentPlayerIndex];
    const timeline = [...this.gameState.timeline];
    const deck = [...this.gameState.deck];
    const discardPile = [...this.gameState.discardPile];

    activePlayer.hand = activePlayer.hand.filter(card => card.id !== cardId);

    const isCorrect = canPlaceCard(cardToPlace, timeline, timelineIndex);
    if (isCorrect) {
      timeline.splice(timelineIndex, 0, cardToPlace);
    } else {
      discardPile.unshift(cardToPlace);
      const drawnCard = deck.pop();
      if (drawnCard) activePlayer.hand.push(drawnCard);
    }

    if (activePlayer.hand.length === 0) {
      this.gameState = {
        ...this.gameState,
        players,
        timeline,
        deck,
        discardPile,
        winner: activePlayer,
        phase: OnlineGamePhase.GAME_OVER,
        message: `¡${activePlayer.name} ha ganado!`,
      };
      this.broadcastState();
      return;
    }

    const nextPlayerIndex = (this.gameState.currentPlayerIndex + 1) % players.length;
    this.gameState = {
      ...this.gameState,
      players,
      timeline,
      deck,
      discardPile,
      currentPlayerIndex: nextPlayerIndex,
      message: `Es el turno de ${players[nextPlayerIndex].name}.`,
    };

    this.broadcastState();

    if (players[nextPlayerIndex].isAI) {
      this.playAITurn();
    }
  }

  private playAITurn() {
    window.setTimeout(() => {
      if (!this.gameState || this.gameState.phase !== OnlineGamePhase.PLAYING) return;

      const aiPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
      if (!aiPlayer?.isAI) return;

      let move: { card: Card; timelineIndex: number } | null = null;
      const correctMoves = getValidTimelineMoves(aiPlayer.hand, this.gameState.timeline);

      if (correctMoves.length > 0 && Math.random() > 0.3) {
        move = correctMoves[Math.floor(Math.random() * correctMoves.length)];
      } else if (aiPlayer.hand.length > 0) {
        const randomCard = aiPlayer.hand[Math.floor(Math.random() * aiPlayer.hand.length)];
        const timelineIndex = Math.floor(Math.random() * (this.gameState.timeline.length + 1));
        move = { card: randomCard, timelineIndex };
      }

      if (move) {
        this.processPlaceCard(aiPlayer.id, move.card.id, move.timelineIndex);
      }
    }, 2000);
  }
}

export const gameService = new GameService();
