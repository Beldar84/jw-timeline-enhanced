
export interface Card {
    id: number;
    name: string;
    year: number; // Negative for BCE, positive for CE
    imageUrl: string;
}
  
export interface Player {
    id: string; // Changed to string for unique network ID
    name: string;
    hand: Card[];
    isAI: boolean;
}

export enum OnlineGamePhase {
    LOBBY = 'LOBBY',
    PLAYING = 'PLAYING',
    GAME_OVER = 'GAME_OVER',
}

export interface GameState {
    id: string; // Game ID
    phase: OnlineGamePhase;
    players: Player[];
    hostId: string;
    timeline: Card[];
    deck: Card[];
    discardPile: Card[];
    currentPlayerIndex: number;
    winner: Player | null;
    message: string | null;
}
  
export enum GamePhase {
    MENU = 'MENU',
    SETUP = 'SETUP',
    LOBBY = 'LOBBY',
    PLAYING = 'PLAYING',
    TRANSITION = 'TRANSITION',
    GAME_OVER = 'GAME_OVER',
}