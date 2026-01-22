
export interface Card {
    id: number;
    name: string;
    year: number; // Negative for BCE, positive for CE
    imageUrl: string;
    bibleRef?: string; // Reference like "Génesis 7:11"
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

// AI Difficulty levels
export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface AIDifficultyConfig {
    id: AIDifficulty;
    name: string;
    description: string;
    errorRate: number; // Probability of making a mistake (0-1)
    icon: string;
}

export const AI_DIFFICULTIES: AIDifficultyConfig[] = [
    { id: 'easy', name: 'Fácil', description: 'La IA se equivoca el 50% de las veces', errorRate: 0.5, icon: '😊' },
    { id: 'normal', name: 'Normal', description: 'La IA se equivoca el 30% de las veces', errorRate: 0.3, icon: '🤔' },
    { id: 'hard', name: 'Difícil', description: 'La IA se equivoca el 10% de las veces', errorRate: 0.1, icon: '😤' },
    { id: 'expert', name: 'Experto', description: 'La IA nunca se equivoca', errorRate: 0, icon: '🧠' },
];

// Player profile and levels
export interface PlayerProfile {
    name: string;
    createdAt: number;
    lastPlayedAt: number;
}

export interface PlayerLevel {
    level: number;
    title: string;
    minGames: number;
    icon: string;
}

export const PLAYER_LEVELS: PlayerLevel[] = [
    { level: 1, title: 'Novato', minGames: 0, icon: '🌱' },
    { level: 2, title: 'Aprendiz', minGames: 5, icon: '📖' },
    { level: 3, title: 'Estudiante', minGames: 15, icon: '✏️' },
    { level: 4, title: 'Conocedor', minGames: 30, icon: '📚' },
    { level: 5, title: 'Historiador', minGames: 50, icon: '🎓' },
    { level: 6, title: 'Erudito', minGames: 75, icon: '🏛️' },
    { level: 7, title: 'Sabio', minGames: 100, icon: '🦉' },
    { level: 8, title: 'Maestro', minGames: 150, icon: '👑' },
    { level: 9, title: 'Leyenda', minGames: 200, icon: '⭐' },
    { level: 10, title: 'Cronista Supremo', minGames: 300, icon: '🏆' },
];

// Leaderboard types
export interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    gamesPlayed: number;
    winRate: number;
    lastUpdated: number;
}

export interface Leaderboard {
    weekly: LeaderboardEntry[];
    monthly: LeaderboardEntry[];
    allTime: LeaderboardEntry[];
    lastReset: {
        weekly: number;
        monthly: number;
    };
}
