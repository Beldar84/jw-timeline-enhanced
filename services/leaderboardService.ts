import { Leaderboard, LeaderboardEntry } from '../types';
import { statsService } from './statsService';
import { profileService } from './profileService';

const STORAGE_KEY = 'jw_timeline_leaderboard';
const MAX_ENTRIES = 50;

interface PeriodStats {
  gamesPlayed: number;
  gamesWon: number;
  cardsPlaced: number;
  correctPlacements: number;
  currentStreak: number;
  bestStreak: number;
}

interface StoredLeaderboard extends Leaderboard {
  periodStats: {
    weekly: PeriodStats;
    monthly: PeriodStats;
  };
}

const emptyPeriodStats = (): PeriodStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  cardsPlaced: 0,
  correctPlacements: 0,
  currentStreak: 0,
  bestStreak: 0,
});

// Helper to get start of week (Monday)
const getWeekStart = (date: Date): number => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Helper to get start of month
const getMonthStart = (date: Date): number => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

class LeaderboardService {
  private leaderboard: StoredLeaderboard;

  constructor() {
    this.leaderboard = this.loadLeaderboard();
    this.checkAndResetPeriods();
  }

  private getDefaultLeaderboard(): StoredLeaderboard {
    return {
      weekly: [],
      monthly: [],
      allTime: [],
      lastReset: {
        weekly: getWeekStart(new Date()),
        monthly: getMonthStart(new Date()),
      },
      periodStats: {
        weekly: emptyPeriodStats(),
        monthly: emptyPeriodStats(),
      },
    };
  }

  private loadLeaderboard(): StoredLeaderboard {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const defaults = this.getDefaultLeaderboard();
        const hasPeriodStats = parsed.periodStats?.weekly && parsed.periodStats?.monthly;
        return {
          ...defaults,
          ...parsed,
          // Previous versions populated periods with lifetime totals. Clearing
          // them once is safer than carrying incorrect rankings forward.
          weekly: hasPeriodStats ? parsed.weekly || [] : [],
          monthly: hasPeriodStats ? parsed.monthly || [] : [],
          periodStats: hasPeriodStats
            ? {
                weekly: { ...emptyPeriodStats(), ...parsed.periodStats.weekly },
                monthly: { ...emptyPeriodStats(), ...parsed.periodStats.monthly },
              }
            : defaults.periodStats,
        } as StoredLeaderboard;
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    }
    return this.getDefaultLeaderboard();
  }

  private saveLeaderboard(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.leaderboard));
    } catch (e) {
      console.error('Error saving leaderboard:', e);
    }
  }

  // Check if periods need to be reset
  private checkAndResetPeriods(): void {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const currentMonthStart = getMonthStart(now);

    // Reset weekly if we're in a new week
    if (currentWeekStart > this.leaderboard.lastReset.weekly) {
      this.leaderboard.weekly = [];
      this.leaderboard.periodStats.weekly = emptyPeriodStats();
      this.leaderboard.lastReset.weekly = currentWeekStart;
    }

    // Reset monthly if we're in a new month
    if (currentMonthStart > this.leaderboard.lastReset.monthly) {
      this.leaderboard.monthly = [];
      this.leaderboard.periodStats.monthly = emptyPeriodStats();
      this.leaderboard.lastReset.monthly = currentMonthStart;
    }

    this.saveLeaderboard();
  }

  // Calculate score based on stats
  private calculateScore(gamesWon: number, gamesPlayed: number, accuracy: number, bestStreak: number = 0): number {
    if (gamesPlayed === 0) return 0;
    return Math.round(gamesWon * 100 + accuracy * 10 + bestStreak * 50);
  }

  // Refresh lifetime values without changing weekly/monthly counters.
  updateLeaderboard(): void {
    const stats = statsService.loadStats();
    const name = profileService.getName();
    const accuracy = statsService.getAccuracy(stats);
    const winRate = statsService.getWinRate(stats);

    // Only add to leaderboard if player has completed games
    if (stats.gamesPlayed === 0) return;

    const entry: Omit<LeaderboardEntry, 'rank'> = {
      name,
      score: this.calculateScore(stats.gamesWon, stats.gamesPlayed, accuracy, stats.longestWinStreak),
      gamesPlayed: stats.gamesPlayed,
      winRate,
      lastUpdated: Date.now(),
    };

    // Update all time
    this.updateEntryInList(this.leaderboard.allTime, entry);

    this.saveLeaderboard();
  }

  recordGameResult(won: boolean, cardsPlaced: number, correctPlacements: number): void {
    this.checkAndResetPeriods();
    for (const period of ['weekly', 'monthly'] as const) {
      const periodStats = this.leaderboard.periodStats[period];
      periodStats.gamesPlayed++;
      periodStats.gamesWon += won ? 1 : 0;
      periodStats.cardsPlaced += Math.max(0, cardsPlaced);
      periodStats.correctPlacements += Math.max(0, correctPlacements);
      periodStats.currentStreak = won ? periodStats.currentStreak + 1 : 0;
      periodStats.bestStreak = Math.max(periodStats.bestStreak, periodStats.currentStreak);
      const accuracy = periodStats.cardsPlaced > 0
        ? (periodStats.correctPlacements / periodStats.cardsPlaced) * 100
        : 0;
      this.updateEntryInList(this.leaderboard[period], {
        name: profileService.getName(),
        score: this.calculateScore(periodStats.gamesWon, periodStats.gamesPlayed, accuracy, periodStats.bestStreak),
        gamesPlayed: periodStats.gamesPlayed,
        winRate: (periodStats.gamesWon / periodStats.gamesPlayed) * 100,
        lastUpdated: Date.now(),
      });
    }
    this.updateLeaderboard();
  }

  // Update or add entry to list
  private updateEntryInList(list: LeaderboardEntry[], entry: Omit<LeaderboardEntry, 'rank'>): void {
    const existingIndex = list.findIndex(e => e.name === entry.name);

    if (existingIndex !== -1) {
      // Rankings represent the current totals, so a lower accuracy after a
      // new game must also replace the previous score.
      list[existingIndex] = { ...entry, rank: 0 };
    } else {
      // Add new entry
      list.push({ ...entry, rank: 0 });
    }

    // Sort by score descending
    list.sort((a, b) => b.score - a.score);

    // Update ranks
    list.forEach((e, i) => {
      e.rank = i + 1;
    });

    // Trim to max entries
    if (list.length > MAX_ENTRIES) {
      list.length = MAX_ENTRIES;
    }
  }

  // Get leaderboard for a specific period
  getLeaderboard(period: 'weekly' | 'monthly' | 'allTime'): LeaderboardEntry[] {
    this.checkAndResetPeriods();
    return [...this.leaderboard[period]];
  }

  // Get current player's rank
  getPlayerRank(period: 'weekly' | 'monthly' | 'allTime'): number | null {
    const name = profileService.getName();
    const list = this.leaderboard[period];
    const entry = list.find(e => e.name === name);
    return entry?.rank || null;
  }

  // Get player's position context (players around them)
  getPlayerContext(period: 'weekly' | 'monthly' | 'allTime', range: number = 2): LeaderboardEntry[] {
    const name = profileService.getName();
    const list = this.leaderboard[period];
    const playerIndex = list.findIndex(e => e.name === name);

    if (playerIndex === -1) return list.slice(0, 5); // Return top 5 if player not found

    const start = Math.max(0, playerIndex - range);
    const end = Math.min(list.length, playerIndex + range + 1);

    return list.slice(start, end);
  }

  // Get top players
  getTopPlayers(period: 'weekly' | 'monthly' | 'allTime', count: number = 10): LeaderboardEntry[] {
    this.checkAndResetPeriods();
    return this.leaderboard[period].slice(0, count);
  }

  // Clear all leaderboards (for testing)
  clearAll(): void {
    this.leaderboard = this.getDefaultLeaderboard();
    this.saveLeaderboard();
  }

  // Get time until next reset
  getTimeUntilReset(period: 'weekly' | 'monthly'): string {
    const now = new Date();

    if (period === 'weekly') {
      const nextWeekStart = new Date(getWeekStart(now));
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const diff = nextWeekStart.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `${days}d ${hours}h`;
    } else {
      const nextMonthStart = new Date(getMonthStart(now));
      nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
      const diff = nextMonthStart.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `${days} días`;
    }
  }
}

export const leaderboardService = new LeaderboardService();
