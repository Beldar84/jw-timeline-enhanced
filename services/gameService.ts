import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { GameState, Player, Card, OnlineGamePhase } from '../types';
import { CARD_DATA } from '../data/cards';
import { shuffleArray } from '../utils/shuffle';
import { canPlaceCard, getValidTimelineMoves } from '../utils/timelineRules';
import { drawReplacementCard } from '../utils/drawReplacementCard';
import { firestoreDb } from './firebaseClient';
import { firebaseService } from './firebaseService';

type RealtimeGameDocument = GameState & {
  participantAuthIds: string[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSeenAt?: Record<string, unknown>;
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
    lastMove: data.lastMove || null,
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
  private aiTurnTimer: number | null = null;

  // Presencia: cada jugador emite un latido cada HEARTBEAT_INTERVAL_MS; si otro
  // jugador no actualiza su marca en PRESENCE_TIMEOUT_MS, se le da por desconectado.
  // Las escrituras de beforeunload/pagehide no son fiables (sobre todo en móvil),
  // así que este es el mecanismo real de detección de abandonos.
  private static readonly HEARTBEAT_INTERVAL_MS = 10_000;
  private static readonly PRESENCE_TIMEOUT_MS = 45_000;
  private heartbeatTimer: number | null = null;
  private presenceCheckTimer: number | null = null;
  private presenceSeen = new Map<string, { value: number; localSeenAt: number }>();
  private handleVisibilityChange = () => {
    // Al volver del segundo plano en móvil, emitir latido inmediato
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

    await updateDoc(this.gameRef(this.gameState.id), gameDoc as { [key: string]: any });
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
    this.cancelPendingAITurn();
    this.stopPresence();
  }

  // ==================== PRESENCIA / DETECCIÓN DE ABANDONOS ====================

  private sendHeartbeat() {
    if (!this.localPlayerId || !this.subscribedGameId) return;
    const phase = this.gameState?.phase;
    if (phase !== OnlineGamePhase.LOBBY && phase !== OnlineGamePhase.PLAYING) return;

    updateDoc(this.gameRef(this.subscribedGameId), {
      [`lastSeenAt.${this.localPlayerId}`]: serverTimestamp(),
    }).catch(() => {
      // Sin conexión momentánea: se reintenta en el siguiente latido
    });
  }

  private startPresence() {
    this.stopPresence();
    if (!this.localPlayerId) return;

    // Periodo de gracia inicial para todos los jugadores actuales
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
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.presenceCheckTimer !== null) {
      window.clearInterval(this.presenceCheckTimer);
      this.presenceCheckTimer = null;
    }
    this.presenceSeen.clear();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private checkPresence() {
    const state = this.gameState;
    if (!state || !this.localPlayerId) return;
    if (state.phase !== OnlineGamePhase.LOBBY && state.phase !== OnlineGamePhase.PLAYING) return;

    const now = Date.now();
    const staleIds = state.players
      .filter(player => !player.isAI && player.id !== this.localPlayerId)
      .filter(player => {
        const entry = this.presenceSeen.get(player.id);
        if (!entry) {
          // Jugador nuevo sin registro todavía: darle periodo de gracia
          this.presenceSeen.set(player.id, { value: 0, localSeenAt: now });
          return false;
        }
        return now - entry.localSeenAt > GameService.PRESENCE_TIMEOUT_MS;
      })
      .map(player => player.id);

    if (staleIds.length === 0) return;

    // Árbitro determinista: solo actúa el primer humano "vivo" del orden de
    // jugadores, para que dos clientes no procesen el mismo abandono a la vez.
    const alivePlayers = state.players.filter(
      player => !player.isAI && !staleIds.includes(player.id)
    );
    if (alivePlayers.length === 0 || alivePlayers[0].id !== this.localPlayerId) return;

    const departedId = staleIds[0];
    this.presenceSeen.delete(departedId);
    console.log('[GameService] Jugador sin latido, registrando abandono:', departedId);
    void this.applyDeparture(departedId);
  }

  private cancelPendingAITurn() {
    if (this.aiTurnTimer !== null) {
      window.clearTimeout(this.aiTurnTimer);
      this.aiTurnTimer = null;
    }
  }

  // Vigilante del host: si un snapshot muestra que le toca a una IA, el host se
  // asegura de que la IA juegue. Sin esto, si el cliente que hizo el movimiento
  // anterior se desconecta, la IA nunca juega y la partida queda colgada.
  private maybeScheduleAITurn() {
    if (!this.isHost || !this.gameState) return;
    if (this.gameState.phase !== OnlineGamePhase.PLAYING) return;

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer?.isAI) return;

    this.playAITurn();
  }

  private loadDocument(data: RealtimeGameDocument) {
    this.gameState = toGameState(data);
    this.participantAuthIds = data.participantAuthIds || [];
    this.createdBy = data.createdBy || null;
    this.isHost = this.localPlayerId !== null && this.localPlayerId === data.hostId;
    this.trackPresenceFromDocument(data);
  }

  // Registra localmente cuándo cambió por última vez el latido de cada jugador.
  // Se compara con el reloj local (no con el del servidor) para evitar problemas
  // de desfase horario entre dispositivos.
  private trackPresenceFromDocument(data: RealtimeGameDocument) {
    const lastSeenAt = (data.lastSeenAt || {}) as Record<string, any>;
    const now = Date.now();

    for (const player of data.players || []) {
      if (player.isAI || player.id === this.localPlayerId) continue;
      const raw = lastSeenAt[player.id];
      const millis = typeof raw?.toMillis === 'function' ? raw.toMillis() : 0;
      const entry = this.presenceSeen.get(player.id);
      if (!entry || entry.value !== millis) {
        this.presenceSeen.set(player.id, { value: millis, localSeenAt: now });
      }
    }
  }

  private async handleLocalDeparture(): Promise<void> {
    if (!this.gameState || !this.localPlayerId) return;
    await this.applyDeparture(this.localPlayerId);
  }

  // Registra el abandono de un jugador (propio o detectado por falta de latido)
  private async applyDeparture(leavingPlayerId: string): Promise<void> {
    if (!this.gameState) return;

    const gameState = JSON.parse(JSON.stringify(this.gameState)) as GameState;
    const leavingPlayer = gameState.players.find(player => player.id === leavingPlayerId);
    if (!leavingPlayer || leavingPlayer.isAI || gameState.phase === OnlineGamePhase.GAME_OVER) return;

    try {
      if (gameState.phase === OnlineGamePhase.PLAYING) {
        const remainingHumanPlayers = gameState.players.filter(player => !player.isAI && player.id !== leavingPlayerId);

        if (remainingHumanPlayers.length === 1) {
          const winner = remainingHumanPlayers[0];
          await updateDoc(this.gameRef(gameState.id), {
            phase: OnlineGamePhase.GAME_OVER,
            winner,
            message: `${leavingPlayer.name} ha abandonado la partida. ${winner.name} gana por abandono.`,
            updatedAt: serverTimestamp(),
          });
          return;
        }

        if (remainingHumanPlayers.length > 1) {
          const remainingPlayers = gameState.players.filter(player => player.id !== leavingPlayerId);
          const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
          const nextPlayerIndex = currentTurnPlayer?.id === leavingPlayerId
            ? gameState.currentPlayerIndex % remainingPlayers.length
            : Math.max(0, remainingPlayers.findIndex(player => player.id === currentTurnPlayer?.id));
          const nextHostId = gameState.hostId === leavingPlayerId
            ? remainingHumanPlayers[0].id
            : gameState.hostId;
          await updateDoc(this.gameRef(gameState.id), {
            players: remainingPlayers,
            participantAuthIds: this.participantAuthIds.filter(id => id !== leavingPlayerId),
            currentPlayerIndex: Math.max(0, nextPlayerIndex),
            hostId: nextHostId,
            message: `${leavingPlayer.name} ha abandonado la partida.`,
            updatedAt: serverTimestamp(),
          });
        }
        return;
      }

      if (gameState.phase === OnlineGamePhase.LOBBY) {
        if (gameState.hostId === leavingPlayerId) {
          await updateDoc(this.gameRef(gameState.id), {
            phase: OnlineGamePhase.GAME_OVER,
            winner: null,
            message: 'El anfitrión ha cerrado la sala.',
            updatedAt: serverTimestamp(),
          });
          return;
        }

        const remainingPlayers = gameState.players.filter(player => player.id !== leavingPlayerId);
        await updateDoc(this.gameRef(gameState.id), {
          players: remainingPlayers,
          participantAuthIds: this.participantAuthIds.filter(id => id !== leavingPlayerId),
          message: `${leavingPlayer.name} ha salido de la sala.`,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('[GameService] Error registrando abandono:', error);
    }
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

      // Transacción: evita que dos jugadores que se unen a la vez se sobrescriban
      // mutuamente la lista de jugadores (lectura-modificación-escritura atómica).
      const joinResult = await runTransaction(firestoreDb, async (transaction) => {
        const snapshot = await transaction.get(gameRef);
        if (!snapshot.exists()) {
          return { error: 'Sala no encontrada. Verifica el código de partida.' };
        }

        const gameDoc = snapshot.data() as RealtimeGameDocument;
        if (gameDoc.phase !== OnlineGamePhase.LOBBY) {
          return { error: 'La partida ya ha empezado.' };
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
            return { error: 'La sala está llena.' };
          }

          players.push({
            id: userId,
            name: playerName,
            hand: [],
            isAI: false,
          });
        }

        const participantAuthIds = Array.from(new Set([...(gameDoc.participantAuthIds || []), userId]));

        transaction.update(gameRef, {
          players,
          participantAuthIds,
          message: 'Esperando a jugadores...',
          updatedAt: serverTimestamp(),
        });

        const nextDoc: RealtimeGameDocument = {
          ...gameDoc,
          players,
          participantAuthIds,
          message: 'Esperando a jugadores...',
        };
        return { gameDoc: nextDoc };
      });

      if (joinResult.error || !joinResult.gameDoc) {
        return { success: false, playerId: '', error: joinResult.error || 'No se pudo conectar con la sala.' };
      }

      this.isHost = joinResult.gameDoc.hostId === userId;
      this.localPlayerId = userId;
      this.loadDocument(joinResult.gameDoc);
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
    void this.handleLocalDeparture();
    this.stopListening();
    this.cancelPendingAITurn();
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
        this.maybeScheduleAITurn();
      }, (error) => {
        console.error('[GameService] Error escuchando sala:', error);
      });

      this.startPresence();
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
    let deck = [...this.gameState.deck];
    let discardPile = [...this.gameState.discardPile];
    let replacementCardId: number | null = null;

    activePlayer.hand = activePlayer.hand.filter(card => card.id !== cardId);

    const isCorrect = canPlaceCard(cardToPlace, timeline, timelineIndex);
    if (isCorrect) {
      timeline.splice(timelineIndex, 0, cardToPlace);
    } else {
      discardPile.unshift(cardToPlace);
      const replacementDraw = drawReplacementCard(deck, discardPile);
      deck = replacementDraw.deck;
      discardPile = replacementDraw.discardPile;
      if (replacementDraw.drawnCard) {
        activePlayer.hand.push(replacementDraw.drawnCard);
        replacementCardId = replacementDraw.drawnCard.id;
      } else {
        // Defensive fallback: preserve the card instead of awarding a false win.
        activePlayer.hand.push(cardToPlace);
      }
    }

    if (isCorrect && activePlayer.hand.length === 0) {
      this.gameState = {
        ...this.gameState,
        players,
        timeline,
        deck,
        discardPile,
        winner: activePlayer,
        phase: OnlineGamePhase.GAME_OVER,
        message: `¡${activePlayer.name} ha ganado!`,
        lastMove: {
          id: Date.now(),
          playerId,
          cardId: cardToPlace.id,
          timelineIndex,
          isCorrect,
          replacementCardId,
        },
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
      lastMove: {
        id: Date.now(),
        playerId,
        cardId: cardToPlace.id,
        timelineIndex,
        isCorrect,
        replacementCardId,
      },
    };

    this.broadcastState();

    if (players[nextPlayerIndex].isAI) {
      this.playAITurn();
    }
  }

  private playAITurn() {
    // Un solo temporizador pendiente a la vez: evita movimientos duplicados cuando
    // el turno de IA se programa tanto localmente como desde un snapshot remoto.
    if (this.aiTurnTimer !== null) return;

    this.aiTurnTimer = window.setTimeout(() => {
      this.aiTurnTimer = null;
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
