
import { GameState, Player, Card, OnlineGamePhase } from '../types';
import { CARD_DATA } from '../data/cards';

// Declare PeerJS global type since we are loading it via CDN
declare const Peer: any;

type NetworkAction = 
  | { type: 'JOIN'; payload: { name: string; id: string } }
  | { type: 'STATE_UPDATE'; payload: GameState }
  | { type: 'PLACE_CARD'; payload: { playerId: string; cardId: number; timelineIndex: number } }
  | { type: 'ADD_BOT'; payload: null }
  | { type: 'START_GAME'; payload: null };

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const generateShortId = () => {
  // Genera un número aleatorio de 4 dígitos (1000-9999)
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `JW-${number}`;
};

// Tu API Key de Metered (jwtimeline)
const METERED_API_KEY = '0733bc6c94842b6c27cad4dd606e83f9dfd8';
const METERED_API_URL = 'https://jwtimeline.metered.live/api/v1/turn/credentials';

// Cache para las credenciales TURN (evita llamadas repetidas a la API)
let cachedIceServers: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función para obtener credenciales TURN dinámicas de Metered
async function getIceServers(): Promise<any[]> {
  // Usar cache si está disponible y no ha expirado
  if (cachedIceServers && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedIceServers;
  }

  try {
    const response = await fetch(`${METERED_API_URL}?apiKey=${METERED_API_KEY}`);
    if (response.ok) {
      cachedIceServers = await response.json();
      cacheTimestamp = Date.now();
      console.log('[GameService] Credenciales TURN obtenidas de Metered');
      return cachedIceServers!;
    }
  } catch (error) {
    console.warn('[GameService] Error obteniendo credenciales TURN, usando fallback:', error);
  }

  // Fallback: servidores STUN de Google (funcionan para conexiones simples)
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
}

// Función para crear la configuración de Peer con credenciales dinámicas
async function createPeerConfig() {
  const iceServers = await getIceServers();

  return {
    debug: 2,
    secure: true,
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    config: {
      iceServers: iceServers,
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    },
  };
}

class GameService {
  private peer: any = null;
  private connections: any[] = []; // For Host: list of client connections
  private hostConnection: any = null; // For Client: connection to host
  
  private gameState: GameState | null = null;
  private listeners = new Set<(state: GameState) => void>();
  private localPlayerId: string | null = null;
  private isHost: boolean = false;

  constructor() {
    // Cleanup on window close
    window.addEventListener('beforeunload', () => {
        this.disconnect();
    });
  }

  private notify() {
    if (this.gameState) {
      this.listeners.forEach(cb => cb(JSON.parse(JSON.stringify(this.gameState))));
    }
  }

  private broadcastState() {
    if (!this.isHost || !this.gameState) return;
    
    // Notify local listeners
    this.notify();

    // Send to all connected peers
    this.connections.forEach(conn => {
        if (conn.open) {
            try {
                conn.send({ type: 'STATE_UPDATE', payload: this.gameState });
            } catch (e) {
                console.error("Error sending state to peer:", e);
            }
        }
    });
  }

  // --- Initialization ---

  // Initialize PeerJS and return the Peer ID (Game Code)
  async createGame(hostName: string): Promise<{ gameId: string, playerId: string }> {
    this.disconnect();
    this.isHost = true;

    // Obtener configuración con credenciales TURN dinámicas
    const peerConfig = await createPeerConfig();

    return new Promise((resolve, reject) => {
        const tryCreate = (attempts: number) => {
            if (attempts > 5) {
                reject(new Error("No se pudo generar un ID único. Inténtalo de nuevo."));
                return;
            }

            const shortId = generateShortId();

            try {
                // Attempt to register with a custom short ID
                const peer = new Peer(shortId, peerConfig);
                
                peer.on('open', (id: string) => {
                    this.peer = peer;
                    const hostId = crypto.randomUUID();
                    this.localPlayerId = hostId;
                    
                    this.gameState = {
                        id: id,
                        phase: OnlineGamePhase.LOBBY,
                        players: [{
                            id: hostId,
                            name: hostName,
                            hand: [],
                            isAI: false
                        }],
                        hostId: hostId,
                        timeline: [],
                        deck: [],
                        discardPile: [],
                        currentPlayerIndex: 0,
                        winner: null,
                        message: 'Esperando a jugadores...'
                    };
                    
                    this.notify();

                    peer.on('connection', (conn: any) => {
                        this.handleIncomingConnection(conn);
                    });
                    
                    // General error handler for the active peer
                    peer.on('error', (err: any) => {
                        console.error('Peer error (host):', err);
                    });

                    resolve({ gameId: id, playerId: hostId });
                });

                peer.on('error', (err: any) => {
                    // If ID is taken, retry with a new one
                    if (err.type === 'unavailable-id') {
                        peer.destroy();
                        tryCreate(attempts + 1);
                    } else {
                        console.error('Peer Init Error:', err);
                        reject(err);
                    }
                });

            } catch (e) {
                reject(e);
            }
        };

        tryCreate(0);
    });
  }

  async joinGame(gameId: string, playerName: string): Promise<{ success: boolean, playerId: string, error?: string }> {
    this.disconnect();
    this.isHost = false;

    // Obtener configuración con credenciales TURN dinámicas
    const peerConfig = await createPeerConfig();

    return new Promise((resolve) => {
        let resolved = false;

        // Timeout increased for TURN server negotiation (can take longer across networks)
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                this.disconnect();
                resolve({ success: false, playerId: '', error: 'Tiempo de espera agotado. Verifica el ID o tu conexión.' });
            }
        }, 30000); // 30 seconds timeout para conexiones entre redes

        try {
            // Client doesn't need a specific ID, let PeerJS generate one
            this.peer = new Peer(peerConfig);
            
            this.peer.on('open', () => {
                const localId = crypto.randomUUID();
                this.localPlayerId = localId;

                // Connect to host
                const conn = this.peer.connect(gameId, { 
                    reliable: true,
                    serialization: 'json'
                });
                
                const handleOpen = () => {
                    if (resolved) return;
                    
                    this.hostConnection = conn;
                    
                    // Send Join Request immediately
                    conn.send({ 
                        type: 'JOIN', 
                        payload: { name: playerName, id: localId }
                    });

                    resolved = true;
                    clearTimeout(timeout);
                    resolve({ success: true, playerId: localId });
                };

                conn.on('open', handleOpen);
                // Check if already open (sometimes happens fast)
                if (conn.open) handleOpen();

                conn.on('data', (data: NetworkAction) => {
                    this.handleClientMessage(data);
                });

                conn.on('close', () => {
                    console.log('Connection closed by host');
                });
                
                conn.on('error', (err: any) => {
                    console.error('Connection error:', err);
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        resolve({ success: false, playerId: '', error: 'No se pudo conectar con la sala.' });
                    }
                });
            });

            this.peer.on('error', (err: any) => {
                console.error('Peer connection error:', err);
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);

                    let errorMessage = 'Error de conexión desconocido.';

                    switch (err.type) {
                        case 'peer-unavailable':
                            errorMessage = 'Sala no encontrada. Verifica el código de partida.';
                            break;
                        case 'network':
                            errorMessage = 'Error de red. Verifica tu conexión a internet y que no haya un firewall bloqueando.';
                            break;
                        case 'server-error':
                            errorMessage = 'El servidor de conexión no está disponible. Intenta de nuevo en unos minutos.';
                            break;
                        case 'socket-error':
                            errorMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
                            break;
                        case 'socket-closed':
                            errorMessage = 'La conexión se cerró inesperadamente. Intenta de nuevo.';
                            break;
                        case 'unavailable-id':
                            errorMessage = 'El ID de sala ya está en uso. Intenta crear otra partida.';
                            break;
                        case 'invalid-id':
                            errorMessage = 'El código de partida no es válido.';
                            break;
                        case 'browser-incompatible':
                            errorMessage = 'Tu navegador no soporta conexiones P2P. Usa Chrome, Firefox o Edge.';
                            break;
                        case 'disconnected':
                            errorMessage = 'Te has desconectado del servidor. Intenta reconectar.';
                            break;
                        case 'ssl-unavailable':
                            errorMessage = 'Se requiere una conexión segura (HTTPS).';
                            break;
                        default:
                            errorMessage = `Error de conexión: ${err.type || err.message || 'Desconocido'}. Intenta de nuevo.`;
                    }

                    resolve({ success: false, playerId: '', error: errorMessage });
                }
            });

        } catch (e) {
            console.error(e);
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve({ success: false, playerId: '', error: 'Error interno del cliente.' });
            }
        }
    });
  }

  disconnect() {
    if (this.peer) {
        this.peer.destroy();
        this.peer = null;
    }
    this.connections = [];
    this.hostConnection = null;
    this.gameState = null;
    this.localPlayerId = null;
    this.isHost = false;
  }

  // --- Message Handling ---

  private handleIncomingConnection(conn: any) {
    this.connections.push(conn);
    
    conn.on('data', (data: NetworkAction) => {
        // Host logic
        if (data.type === 'JOIN') {
            if (this.gameState && this.gameState.players.length < 6) {
                // Check if player already exists
                const exists = this.gameState.players.find(p => p.id === data.payload.id);
                if (!exists) {
                    const newPlayer: Player = {
                        id: data.payload.id,
                        name: data.payload.name,
                        hand: [],
                        isAI: false,
                    };
                    this.gameState.players.push(newPlayer);
                }
                
                // CRITICAL: Send state immediately to this specific connection
                try {
                    conn.send({ type: 'STATE_UPDATE', payload: this.gameState });
                } catch (e) {
                    console.error("Failed to send initial state:", e);
                }
                
                // Then notify everyone else
                this.broadcastState();
            }
        } else if (data.type === 'PLACE_CARD') {
            this.processPlaceCard(data.payload.playerId, data.payload.cardId, data.payload.timelineIndex);
        }
    });
    
    conn.on('close', () => {
        this.connections = this.connections.filter(c => c.peer !== conn.peer);
    });
  }

  private handleClientMessage(data: NetworkAction) {
      if (data.type === 'STATE_UPDATE') {
          this.gameState = data.payload;
          this.notify();
      }
  }

  // --- Game Logic (Host Only) ---

  // Wrapper for external calls
  subscribeToGame(gameId: string, callback: (state: GameState) => void) {
      this.listeners.add(callback);
      if (this.gameState) callback(this.gameState);
      return () => this.listeners.delete(callback);
  }

  // Action: Add Bot (Host only)
  addBot(gameId: string, hostId: string) {
      if (!this.isHost || !this.gameState) return;
      
      const aiCount = this.gameState.players.filter(p => p.isAI).length;
      this.gameState.players.push({
          id: `ai-${Date.now()}`,
          name: `IA ${aiCount + 1}`,
          hand: [],
          isAI: true
      });
      this.broadcastState();
  }

  // Action: Start Game (Host only)
  startGame(gameId: string, playerId: string) {
      if (!this.isHost || !this.gameState) return;

      const shuffledDeck = shuffleArray(CARD_DATA);
      const initialTimelineCard = shuffledDeck.pop();
      if (!initialTimelineCard) return;

      // Deal cards
      for (let i = 0; i < 4; i++) {
        for (const player of this.gameState.players) {
            const card = shuffledDeck.pop();
            if (card) player.hand.push(card);
        }
      }

      this.gameState.deck = shuffledDeck;
      this.gameState.timeline = [initialTimelineCard];
      this.gameState.phase = OnlineGamePhase.PLAYING;
      this.gameState.currentPlayerIndex = 0;
      this.gameState.message = `Es el turno de ${this.gameState.players[0].name}.`;

      this.broadcastState();

      if (this.gameState.players[0].isAI) {
          this.playAITurn();
      }
  }

  // Action: Place Card (Host triggers directly, Client sends request)
  placeCard(gameId: string, playerId: string, cardId: number, timelineIndex: number) {
      if (this.isHost) {
          this.processPlaceCard(playerId, cardId, timelineIndex);
      } else if (this.hostConnection) {
          this.hostConnection.send({
              type: 'PLACE_CARD',
              payload: { playerId, cardId, timelineIndex }
          });
      }
  }

  // --- Core Game Logic (Authoritative, Host Only) ---

  private processPlaceCard(playerId: string, cardId: number, timelineIndex: number) {
      if (!this.gameState || this.gameState.phase !== OnlineGamePhase.PLAYING) return;

      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
      // Validate turn
      if (currentPlayer.id !== playerId) return;

      const cardToPlace = currentPlayer.hand.find(c => c.id === cardId);
      if (!cardToPlace) return;

      let isCorrect = false;
      const prevCard = this.gameState.timeline[timelineIndex - 1];
      const nextCard = this.gameState.timeline[timelineIndex];

      if (!prevCard && nextCard) {
        isCorrect = cardToPlace.year < nextCard.year;
      } else if (prevCard && !nextCard) {
        isCorrect = cardToPlace.year > prevCard.year;
      } else if (prevCard && nextCard) {
        isCorrect = cardToPlace.year > prevCard.year && cardToPlace.year < nextCard.year;
      }

      // Remove from hand
      currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== cardId);

      if (isCorrect) {
          this.gameState.timeline.splice(timelineIndex, 0, cardToPlace);
          if (currentPlayer.hand.length === 0) {
              this.gameState.winner = currentPlayer;
              this.gameState.phase = OnlineGamePhase.GAME_OVER;
              this.gameState.message = `¡${currentPlayer.name} ha ganado!`;
              this.broadcastState();
              return;
          }
      } else {
          this.gameState.discardPile.unshift(cardToPlace);
          if (this.gameState.deck.length > 0) {
              const newCard = this.gameState.deck.pop();
              if (newCard) currentPlayer.hand.push(newCard);
          }
      }

      // Next Turn
      this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
      this.gameState.message = `Es el turno de ${this.gameState.players[this.gameState.currentPlayerIndex].name}.`;

      this.broadcastState();

      // Check AI
      if (this.gameState.players[this.gameState.currentPlayerIndex].isAI) {
          this.playAITurn();
      }
  }

  private playAITurn() {
      setTimeout(() => {
          if (!this.gameState || this.gameState.phase !== OnlineGamePhase.PLAYING) return;
          const aiPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
          if (!aiPlayer.isAI) return;

          // AI Logic
          let move: { card: Card, timelineIndex: number } | null = null;
          const correctMoves: { card: Card, timelineIndex: number }[] = [];
          
          for (const card of aiPlayer.hand) {
            for (let i = 0; i <= this.gameState.timeline.length; i++) {
                const prevCard = this.gameState.timeline[i - 1];
                const nextCard = this.gameState.timeline[i];
                let isCorrect = false;
                if (!prevCard && nextCard) isCorrect = card.year < nextCard.year;
                else if (prevCard && !nextCard) isCorrect = card.year > prevCard.year;
                else if (prevCard && nextCard) isCorrect = card.year > prevCard.year && card.year < nextCard.year;
                if (isCorrect) correctMoves.push({ card, timelineIndex: i });
            }
          }

          if (correctMoves.length > 0 && Math.random() > 0.3) {
              move = correctMoves[Math.floor(Math.random() * correctMoves.length)];
          } else if (aiPlayer.hand.length > 0) {
              const randomCard = aiPlayer.hand[Math.floor(Math.random() * aiPlayer.hand.length)];
              const idx = Math.floor(Math.random() * (this.gameState.timeline.length + 1));
              move = { card: randomCard, timelineIndex: idx };
          }

          if (move) {
              this.processPlaceCard(aiPlayer.id, move.card.id, move.timelineIndex);
          }
      }, 2000);
  }
}

export const gameService = new GameService();
