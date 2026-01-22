import { Leaderboard, LeaderboardEntry } from '../types';
import { statsService } from './statsService';
import { profileService } from './profileService';

const STORAGE_KEY = 'jw_timeline_leaderboard';
const MAX_ENTRIES = 50;

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
  private leaderboard: Leaderboard;

  constructor() {
    this.leaderboard = this.loadLeaderboard();
    this.checkAndResetPeriods();
  }

  private getDefaultLeaderboard(): Leaderboard {
    return {
      weekly: [],
      monthly: [],
      allTime: [],
      lastReset: {
        weekly: getWeekStart(new Date()),
        monthly: getMonthStart(new Date()),
      },
    };
  }

  private loadLeaderboard(): Leaderboard {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...this.getDefaultLeaderboard(),
          ...parsed,
        };
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
      this.leaderboard.lastReset.weekly = currentWeekStart;
    }

    // Reset monthly if we're in a new month
    if (currentMonthStart > this.leaderboard.lastReset.monthly) {
      this.leaderboard.monthly = [];
      this.leaderboard.lastReset.monthly = currentMonthStart;
    }

    this.saveLeaderboard();
  }

  // Calculate score based on stats
  private calculateScore(gamesWon: number, gamesPlayed: number, accuracy: number): number {
    if (gamesPlayed === 0) return 0;
    const winRate = (gamesWon / gamesPlayed) * 100;
    // Score formula: wins * 100 + bonus for win rate + bonus for accuracy
    return Math.round(gamesWon * 100 + winRate * 5 + accuracy * 2);
  }

  // Update leaderboard with current player stats
  updateLeaderboard(): void {
    const stats = statsService.loadStats();
    const name = profileService.getName();
    const accuracy = statsService.getAccuracy(stats);
    const winRate = statsService.getWinRate(stats);

    // Only add to leaderboard if player has completed games
    if (stats.gamesPlayed === 0) return;

    const entry: Omit<LeaderboardEntry, 'rank'> = {
      name,
      score: this.calculateScore(stats.gamesWon, stats.gamesPlayed, accuracy),
      gamesPlayed: stats.gamesPlayed,
      winRate,
      lastUpdated: Date.now(),
    };

    // Update all time
    this.updateEntryInList(this.leaderboard.allTime, entry);

    // Update weekly (only if game was played this week)
    const weeklyStats = this.getWeeklyStats();
    if (weeklyStats.gamesPlayed > 0) {
      const weeklyEntry: Omit<LeaderboardEntry, 'rank'> = {
        ...entry,
        gamesPlayed: weeklyStats.gamesPlayed,
        score: this.calculateScore(weeklyStats.gamesWon, weeklyStats.gamesPlayed, accuracy),
      };
      this.updateEntryInList(this.leaderboard.weekly, weeklyEntry);
    }

    // Update monthly (only if game was played this month)
    const monthlyStats = this.getMonthlyStats();
    if (monthlyStats.gamesPlayed > 0) {
      const monthlyEntry: Omit<LeaderboardEntry, 'rank'> = {
        ...entry,
        gamesPlayed: monthlyStats.gamesPlayed,
        score: this.calculateScore(monthlyStats.gamesWon, monthlyStats.gamesPlayed, accuracy),
      };
      this.updateEntryInList(this.leaderboard.monthly, monthlyEntry);
    }

    this.saveLeaderboard();
  }

  // Get weekly stats (simplified - in a real app, this would track per-period stats)
  private getWeeklyStats(): { gamesPlayed: number; gamesWon: number } {
    // For local storage, we'll use a simplified approach
    // In a real implementation, you'd track game history with timestamps
    const stats = statsService.loadStats();
    return {
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
    };
  }

  // Get monthly stats
  private getMonthlyStats(): { gamesPlayed: number; gamesWon: number } {
    const stats = statsService.loadStats();
    return {
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
    };
  }

  // Update or add entry to list
  private updateEntryInList(list: LeaderboardEntry[], entry: Omit<LeaderboardEntry, 'rank'>): void {
    const existingIndex = list.findIndex(e => e.name === entry.name);

    if (existingIndex !== -1) {
      // Update existing entry if new score is higher
      if (entry.score >= list[existingIndex].score) {
        list[existingIndex] = { ...entry, rank: 0 };
      }
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
