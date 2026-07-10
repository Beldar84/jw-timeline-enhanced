import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { statsService } from './statsService';

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

describe('statsService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    statsService.resetStats();
  });

  afterEach(() => {
    statsService.resetStats();
    vi.unstubAllGlobals();
  });

  it('returns isolated defaults so mutations never survive a reset', () => {
    const first = statsService.loadStats();
    first.achievements[0].unlockedAt = 123;
    first.deckStats.complete = {
      gamesPlayed: 1,
      gamesWon: 1,
      cardsPlaced: 4,
      correctPlacements: 4,
    };

    statsService.resetStats();
    const reset = statsService.loadStats();

    expect(reset.achievements[0].unlockedAt).toBeNull();
    expect(reset.deckStats).toEqual({});
  });

  it('restores placement progress from a saved active session', () => {
    statsService.startSession('complete');
    statsService.recordPlacement(true);
    statsService.recordPlacement(false);
    const savedSession = statsService.getCurrentSession();

    statsService.cancelSession();
    statsService.restoreSession(savedSession, 'fallback', false);
    const restored = statsService.getCurrentSession();

    expect(restored).toMatchObject({
      deckId: 'complete',
      cardsPlaced: 2,
      correctPlacements: 1,
      incorrectPlacements: 1,
    });

    const finalStats = statsService.endSession(true);
    expect(finalStats.totalCardsPlaced).toBe(2);
    expect(finalStats.correctPlacements).toBe(1);
    expect(finalStats.incorrectPlacements).toBe(1);
  });

  it('starts a clean fallback session when persisted session data is invalid', () => {
    statsService.restoreSession(undefined, 'complete', true);

    expect(statsService.getCurrentSession()).toMatchObject({
      deckId: 'complete',
      cardsPlaced: 0,
      correctPlacements: 0,
      incorrectPlacements: 0,
      isStudyMode: true,
    });
  });

  it('adds independent device deltas after establishing a shared cloud base', () => {
    const shared = statsService.loadStats();
    Object.assign(shared, {
      gamesPlayed: 3,
      gamesWon: 2,
      gamesLost: 1,
      totalCardsPlaced: 12,
      correctPlacements: 9,
      incorrectPlacements: 3,
    });
    shared.deckStats.complete = { gamesPlayed: 3, gamesWon: 2, cardsPlaced: 12, correctPlacements: 9 };
    statsService.saveStats(shared);
    statsService.mergeWithCloudStats(shared);

    const localWithNewGame = statsService.loadStats();
    Object.assign(localWithNewGame, {
      gamesPlayed: 4,
      gamesWon: 3,
      totalCardsPlaced: 16,
      correctPlacements: 12,
      incorrectPlacements: 4,
    });
    localWithNewGame.deckStats.complete = { gamesPlayed: 4, gamesWon: 3, cardsPlaced: 16, correctPlacements: 12 };
    statsService.saveStats(localWithNewGame);

    const cloudWithOtherGame = {
      ...shared,
      gamesPlayed: 4,
      gamesLost: 2,
      totalCardsPlaced: 15,
      correctPlacements: 11,
      incorrectPlacements: 4,
      deckStats: {
        complete: { gamesPlayed: 4, gamesWon: 2, cardsPlaced: 15, correctPlacements: 11 },
      },
    };
    const { stats } = statsService.mergeWithCloudStats(cloudWithOtherGame);

    expect(stats.gamesPlayed).toBe(5);
    expect(stats.gamesWon).toBe(3);
    expect(stats.gamesLost).toBe(2);
    expect(stats.totalCardsPlaced).toBe(19);
    expect(stats.deckStats.complete.gamesPlayed).toBe(5);
  });
});
