import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, GameState, OnlineGamePhase } from '../types';
import { callCloudFunction, firestoreDb } from './firebaseClient';
import { firebaseService } from './firebaseService';

type RealtimeGameDocument = GameState & {
  participantAuthIds: string[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSeenAt?: Record<string, unknown>;
  moveCount?: number;
  moveStats?: Record<string, { placed: number; correct: number; incorrect: number }>;
  resultsRecorded?: boolean;
  handCounts?: Record<string, number>;
  deckCount?: number;
};

interface CreateGameResponse {
  gameId: string;
  playerId: string;
}

interface JoinGameResponse {
  success: boolean;
  playerId: string;
}

function hiddenCards(count: number): Card[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id: -(index + 1),
    name: 'Carta oculta',
    year: 0,
    imageUrl: '',
  }));
}

function toGameState(data: RealtimeGameDocument, localPlayerId: string | null, ownHand: Card[]): GameState {
  const players = (data.players || []).map(player => ({
    ...player,
    hand: player.id === localPlayerId
      ? ownHand
      : hiddenCards(data.handCounts?.[player.id] ?? player.hand?.length ?? 0),
  }));
  return {
    id: data.id,
    phase: data.phase,
    players,
    hostId: data.hostId,
    timeline: data.timeline || [],
    deck: hiddenCards(data.deckCount ?? data.deck?.length ?? 0),
    discardPile: data.discardPile || [],
    currentPlayerIndex: data.currentPlayerIndex || 0,
    winner: data.winner ? players.find(player => player.id === data.winner?.id) || data.winner : null,
    message: data.message || null,
  };
}

function cloudErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

class GameService {
  private gameState: GameState | null = null;
  private participantAuthIds: string[] = [];
  private listeners = new Set<(state: GameState) => void>();
  private unsubscribeFromGame: (() => void) | null = null;
  private unsubscribeFromHand: (() => void) | null = null;
  private subscribedGameId: string | null = null;
  private lastDocument: RealtimeGameDocument | null = null;
  private ownHand: Card[] = [];
  private localPlayerId: string | null = null;
  private isHost = false;

  private static readonly HEARTBEAT_INTERVAL_MS = 10_000;
  private static readonly PRESENCE_TIMEOUT_MS = 45_000;
  private heartbeatTimer: number | null = null;
  private presenceCheckTimer: number | null = null;
  private presenceSeen = new Map<string, { value: number; localSeenAt: number }>();
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.sendHeartbeat();
  };

  constructor() {
    const handlePageExit = () => {
      void this.handleLocalDeparture();
      this.stopListening();
    };
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);
  }

  private async ensureSignedIn(): Promise<string | null> {
    return firebaseService.getCurrentUserId() || firebaseService.signInAnonymous();
  }

  private gameRef(gameId: string) {
    return doc(firestoreDb, 'realtimeGames', gameId);
  }

  private notify() {
    if (!this.gameState) return;
    const snapshot = JSON.parse(JSON.stringify(this.gameState)) as GameState;
    this.listeners.forEach(callback => callback(snapshot));
  }

  private loadDocument(data: RealtimeGameDocument) {
    this.lastDocument = data;
    this.gameState = toGameState(data, this.localPlayerId, this.ownHand);
    this.participantAuthIds = data.participantAuthIds || [];
    this.isHost = this.localPlayerId !== null && this.localPlayerId === data.hostId;
    this.trackPresenceFromDocument(data);
  }

  private stopListening() {
    this.unsubscribeFromGame?.();
    this.unsubscribeFromHand?.();
    this.unsubscribeFromGame = null;
    this.unsubscribeFromHand = null;
    this.subscribedGameId = null;
    this.lastDocument = null;
    this.ownHand = [];
    this.stopPresence();
  }

  private sendHeartbeat() {
    if (!this.localPlayerId || !this.subscribedGameId) return;
    const phase = this.gameState?.phase;
    if (phase !== OnlineGamePhase.LOBBY && phase !== OnlineGamePhase.PLAYING) return;
    updateDoc(this.gameRef(this.subscribedGameId), {
      [`lastSeenAt.${this.localPlayerId}`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // A temporary offline period is retried by the next heartbeat.
    });
  }

  private startPresence() {
    this.stopPresence();
    if (!this.localPlayerId) return;
    const now = Date.now();
    this.gameState?.players.forEach(player => {
      if (!player.isAI && player.id !== this.localPlayerId) {
        this.presenceSeen.set(player.id, { value: 0, localSeenAt: now });
      }
    });
    this.sendHeartbeat();
    this.heartbeatTimer = window.setInterval(() => this.sendHeartbeat(), GameService.HEARTBEAT_INTERVAL_MS);
    this.presenceCheckTimer = window.setInterval(() => this.checkPresence(), GameService.HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private stopPresence() {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    if (this.presenceCheckTimer !== null) window.clearInterval(this.presenceCheckTimer);
    this.heartbeatTimer = null;
    this.presenceCheckTimer = null;
    this.presenceSeen.clear();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private trackPresenceFromDocument(data: RealtimeGameDocument) {
    const lastSeenAt = (data.lastSeenAt || {}) as Record<string, { toMillis?: () => number }>;
    const now = Date.now();
    for (const player of data.players || []) {
      if (player.isAI || player.id === this.localPlayerId) continue;
      const value = lastSeenAt[player.id]?.toMillis?.() || 0;
      const entry = this.presenceSeen.get(player.id);
      if (!entry || entry.value !== value) this.presenceSeen.set(player.id, { value, localSeenAt: now });
    }
  }

  private checkPresence() {
    const state = this.gameState;
    if (!state || !this.localPlayerId) return;
    if (state.phase !== OnlineGamePhase.LOBBY && state.phase !== OnlineGamePhase.PLAYING) return;
    const now = Date.now();
    const stalePlayers = state.players.filter(player => {
      if (player.isAI || player.id === this.localPlayerId) return false;
      const entry = this.presenceSeen.get(player.id);
      if (!entry) {
        this.presenceSeen.set(player.id, { value: 0, localSeenAt: now });
        return false;
      }
      return now - entry.localSeenAt > GameService.PRESENCE_TIMEOUT_MS;
    });
    if (stalePlayers.length === 0) return;

    const staleIds = new Set(stalePlayers.map(player => player.id));
    const aliveHumans = state.players.filter(player => !player.isAI && !staleIds.has(player.id));
    if (aliveHumans[0]?.id !== this.localPlayerId) return;
    const departedId = stalePlayers[0].id;
    this.presenceSeen.delete(departedId);
    void this.applyDeparture(departedId);
  }

  private async applyDeparture(playerId: string): Promise<void> {
    const gameId = this.gameState?.id;
    if (!gameId) return;
    try {
      await callCloudFunction('leaveRealtimeGame', { gameId, playerId });
    } catch (error) {
      console.error('[GameService] Error registrando abandono:', error);
    }
  }

  private async handleLocalDeparture(): Promise<void> {
    if (!this.localPlayerId) return;
    await this.applyDeparture(this.localPlayerId);
  }

  async createGame(hostName: string): Promise<CreateGameResponse> {
    this.disconnect();
    const userId = await this.ensureSignedIn();
    if (!userId) throw new Error('No se pudo iniciar sesión para crear la sala.');
    const result = await callCloudFunction<{ hostName: string }, CreateGameResponse>('createRealtimeGame', { hostName });
    this.localPlayerId = result.playerId;
    this.isHost = true;
    return result;
  }

  async joinGame(gameId: string, playerName: string): Promise<{ success: boolean; playerId: string; error?: string }> {
    this.disconnect();
    const userId = await this.ensureSignedIn();
    if (!userId) return { success: false, playerId: '', error: 'No se pudo iniciar sesión.' };
    try {
      const result = await callCloudFunction<
        { gameId: string; playerName: string },
        JoinGameResponse
      >('joinRealtimeGame', { gameId, playerName });
      this.localPlayerId = result.playerId;
      return result;
    } catch (error) {
      console.error('[GameService] Error al unirse:', error);
      return { success: false, playerId: '', error: cloudErrorMessage(error, 'No se pudo conectar con la sala.') };
    }
  }

  disconnect() {
    void this.handleLocalDeparture();
    this.stopListening();
    this.gameState = null;
    this.participantAuthIds = [];
    this.localPlayerId = null;
    this.isHost = false;
  }

  subscribeToGame(gameId: string, callback: (state: GameState) => void) {
    this.listeners.add(callback);
    if (this.gameState) callback(JSON.parse(JSON.stringify(this.gameState)) as GameState);
    if (this.subscribedGameId !== gameId) {
      this.stopListening();
      this.subscribedGameId = gameId;
      this.unsubscribeFromGame = onSnapshot(this.gameRef(gameId), snapshot => {
        if (!snapshot.exists()) return;
        this.loadDocument(snapshot.data() as RealtimeGameDocument);
        this.notify();
      }, error => console.error('[GameService] Error escuchando sala:', error));
      if (this.localPlayerId) {
        const handRef = doc(firestoreDb, 'realtimeGames', gameId, 'hands', this.localPlayerId);
        this.unsubscribeFromHand = onSnapshot(handRef, snapshot => {
          this.ownHand = snapshot.exists() ? (snapshot.data().cards || []) as Card[] : [];
          if (this.lastDocument) {
            this.gameState = toGameState(this.lastDocument, this.localPlayerId, this.ownHand);
            this.notify();
          }
        }, error => console.error('[GameService] Error escuchando la mano privada:', error));
      }
      this.startPresence();
    }
    return () => this.listeners.delete(callback);
  }

  addBot(gameId: string, hostId: string) {
    if (!this.isHost || this.localPlayerId !== hostId) return;
    void callCloudFunction('addRealtimeBot', { gameId }).catch(error => {
      console.error('[GameService] Error añadiendo bot:', error);
    });
  }

  startGame(gameId: string, playerId: string) {
    if (!this.isHost || this.localPlayerId !== playerId) return;
    void callCloudFunction('startRealtimeGame', { gameId }).catch(error => {
      console.error('[GameService] Error iniciando partida:', error);
    });
  }

  placeCard(gameId: string, playerId: string, cardId: number, timelineIndex: number) {
    if (this.localPlayerId !== playerId) return;
    void callCloudFunction('makeRealtimeMove', { gameId, cardId, timelineIndex }).catch(error => {
      console.error('[GameService] Movimiento rechazado:', error);
    });
  }
}

export const gameService = new GameService();
