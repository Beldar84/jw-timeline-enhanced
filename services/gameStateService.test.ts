import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamePhase } from '../types';
import { gameStateService } from './gameStateService';

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: key => entries.get(key) ?? null,
    key: index => Array.from(entries.keys())[index] ?? null,
    removeItem: key => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

describe('gameStateService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists the active statistics session with the local game', () => {
    const card = { id: 1, name: 'Carta', year: 1, imageUrl: '/card.png' };
    gameStateService.saveGameState({
      gamePhase: GamePhase.PLAYING,
      gameMode: 'local',
      players: [{ id: 'player-1', name: 'Jugador', hand: [card], isAI: false }],
      currentPlayerIndex: 0,
      timeline: [card],
      deck: [],
      discardPile: [],
      selectedDeckId: 'complete',
      aiDifficulty: 'normal',
      isStudyMode: false,
      statsSession: {
        startTime: 100,
        deckId: 'complete',
        cardsPlaced: 2,
        correctPlacements: 1,
        incorrectPlacements: 1,
      },
    });

    expect(gameStateService.loadGameState()?.statsSession).toMatchObject({
      startTime: 100,
      cardsPlaced: 2,
      correctPlacements: 1,
      incorrectPlacements: 1,
    });
  });
});
