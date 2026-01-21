
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JW-${result}`;
};

const PEER_CONFIG = {
  debug: 2,
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
  },
};

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

    return new Promise((resolve, reject) => {
        const tryCreate = (attempts: number) => {
            if (attempts > 5) {
                reject(new Error("No se pudo generar un ID único. Inténtalo de nuevo."));
                return;
            }

            const shortId = generateShortId();

            try {
                // Attempt to register with a custom short ID
                const peer = new Peer(shortId, PEER_CONFIG);
                
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

    return new Promise((resolve) => {
        let resolved = false;
        
        // Timeout to prevent hanging indefinitely
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                this.disconnect();
                resolve({ success: false, playerId: '', error: 'Tiempo de espera agotado. Verifica el ID.' });
            }
        }, 15000); // 15 seconds timeout

        try {
            // Client doesn't need a specific ID, let PeerJS generate one
            this.peer = new Peer(PEER_CONFIG);
            
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
                    if (err.type === 'peer-unavailable') {
                        resolve({ success: false, playerId: '', error: 'Sala no encontrada. Verifica el código.' });
                    } else {
                        resolve({ success: false, playerId: '', error: `Error de conexión: ${err.type || 'Desconocido'}` });
                    }
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
