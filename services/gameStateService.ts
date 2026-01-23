import { GamePhase, Card as CardType, Player, AIDifficulty } from '../types';

const STORAGE_KEY = 'jw_timeline_game_state';

export interface SavedGameState {
  gamePhase: GamePhase;
  gameMode: 'local' | 'ai' | 'online' | null;
  players: Player[];
  currentPlayerIndex: number;
  timeline: CardType[];
  deck: CardType[];
  discardPile: CardType[];
  selectedDeckId: string;
  aiDifficulty: AIDifficulty;
  isStudyMode: boolean;
  savedAt: number;
}

const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours - games older than this are discarded

export const gameStateService = {
  /**
   * Save the current game state to localStorage
   */
  saveGameState(state: Omit<SavedGameState, 'savedAt'>): void {
    // Only save if we're in a valid playing state
    if (state.gamePhase !== GamePhase.PLAYING || !state.gameMode) {
      return;
    }

    // Don't save online games (they use their own persistence)
    if (state.gameMode === 'online') {
      return;
    }

    const savedState: SavedGameState = {
      ...state,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
    } catch (e) {
      console.error('Error saving game state:', e);
    }
  },

  /**
   * Load the saved game state from localStorage
   */
  loadGameState(): SavedGameState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const state: SavedGameState = JSON.parse(saved);

      // Check if the saved state is too old
      if (Date.now() - state.savedAt > MAX_AGE_MS) {
        this.clearGameState();
        return null;
      }

      // Validate the state has required fields
      if (!state.gamePhase || !state.players || !state.timeline) {
        this.clearGameState();
        return null;
      }

      return state;
    } catch (e) {
      console.error('Error loading game state:', e);
      this.clearGameState();
      return null;
    }
  },

  /**
   * Clear the saved game state
   */
  clearGameState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing game state:', e);
    }
  },

  /**
   * Check if there's a valid saved game
   */
  hasSavedGame(): boolean {
    return this.loadGameState() !== null;
  },
};
