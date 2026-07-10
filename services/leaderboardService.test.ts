import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: key => entries.get(key) ?? null,
    key: index => Array.from(entries.keys())[index] ?? null,
    removeItem: key => entries.delete(key),
    setItem: (key, value) => entries.set(key, value),
  };
}

describe('leaderboardService', () => {
  let leaderboardService: typeof import('./leaderboardService').leaderboardService;
  let profileService: typeof import('./profileService').profileService;
  let statsService: typeof import('./statsService').statsService;

  beforeAll(async () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    ({ leaderboardService } = await import('./leaderboardService'));
    ({ profileService } = await import('./profileService'));
    ({ statsService } = await import('./statsService'));
  });

  beforeEach(() => {
    localStorage.clear();
    statsService.resetStats();
    leaderboardService.clearAll();
    profileService.updateName('Prueba');
  });

  afterEach(() => {
    statsService.resetStats();
    leaderboardService.clearAll();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('updates period scores even when accuracy decreases', () => {
    const stats = statsService.loadStats();
    Object.assign(stats, {
      gamesPlayed: 1,
      gamesWon: 1,
      gamesLost: 0,
      currentWinStreak: 1,
      longestWinStreak: 1,
      totalCardsPlaced: 4,
      correctPlacements: 4,
      incorrectPlacements: 0,
    });
    statsService.saveStats(stats);
    leaderboardService.recordGameResult(true, 4, 4);

    Object.assign(stats, {
      gamesPlayed: 2,
      gamesWon: 1,
      gamesLost: 1,
      currentWinStreak: 0,
      totalCardsPlaced: 8,
      correctPlacements: 4,
      incorrectPlacements: 4,
    });
    statsService.saveStats(stats);
    leaderboardService.recordGameResult(false, 4, 0);

    expect(leaderboardService.getLeaderboard('weekly')[0]).toMatchObject({
      name: 'Prueba',
      gamesPlayed: 2,
      winRate: 50,
      score: 650,
    });
    expect(leaderboardService.getLeaderboard('allTime')[0].score).toBe(650);
  });
});
