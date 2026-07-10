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
});
