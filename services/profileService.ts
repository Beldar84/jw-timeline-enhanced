import { PlayerProfile, PlayerLevel, PLAYER_LEVELS } from '../types';
import { statsService } from './statsService';

const STORAGE_KEY = 'jw_timeline_profile';

interface StoredProfile extends PlayerProfile {
  version: number;
}

class ProfileService {
  private profile: StoredProfile | null = null;

  constructor() {
    this.loadProfile();
    // Auto-create profile if none exists
    if (!this.profile) {
      this.createProfile('Jugador');
    }
  }

  private loadProfile(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.profile = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }

  private saveProfile(): void {
    if (!this.profile) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  }

  // Check if profile exists
  hasProfile(): boolean {
    return this.profile !== null;
  }

  // Get current profile
  getProfile(): PlayerProfile | null {
    return this.profile;
  }

  // Create new profile
  createProfile(name: string): PlayerProfile {
    this.profile = {
      name: name.trim(),
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      version: 1,
    };
    this.saveProfile();
    return this.profile;
  }

  // Update profile name
  updateName(name: string): void {
    if (this.profile) {
      this.profile.name = name.trim();
      this.saveProfile();
    }
  }

  // Update last played timestamp
  updateLastPlayed(): void {
    if (this.profile) {
      this.profile.lastPlayedAt = Date.now();
      this.saveProfile();
    }
  }

  // Get player name (with fallback)
  getName(): string {
    return this.profile?.name || 'Jugador';
  }

  // Calculate player level based on games played
  getPlayerLevel(): PlayerLevel {
    const stats = statsService.loadStats();
    const gamesPlayed = stats.gamesPlayed;

    // Find the highest level the player qualifies for
    let currentLevel = PLAYER_LEVELS[0];
    for (const level of PLAYER_LEVELS) {
      if (gamesPlayed >= level.minGames) {
        currentLevel = level;
      }
    }

    return currentLevel;
  }

  // Get progress to next level
  getLevelProgress(): { current: number; next: number; percentage: number } | null {
    const stats = statsService.loadStats();
    const gamesPlayed = stats.gamesPlayed;
    const currentLevel = this.getPlayerLevel();

    // Find next level
    const currentLevelIndex = PLAYER_LEVELS.findIndex(l => l.level === currentLevel.level);
    const nextLevel = PLAYER_LEVELS[currentLevelIndex + 1];

    if (!nextLevel) {
      // Max level reached
      return null;
    }

    const gamesForCurrentLevel = currentLevel.minGames;
    const gamesForNextLevel = nextLevel.minGames;
    const progress = gamesPlayed - gamesForCurrentLevel;
    const needed = gamesForNextLevel - gamesForCurrentLevel;
    const percentage = Math.min(100, (progress / needed) * 100);

    return {
      current: progress,
      next: needed,
      percentage,
    };
  }

  // Get all levels with unlock status
  getAllLevels(): (PlayerLevel & { unlocked: boolean })[] {
    const stats = statsService.loadStats();
    const gamesPlayed = stats.gamesPlayed;

    return PLAYER_LEVELS.map(level => ({
      ...level,
      unlocked: gamesPlayed >= level.minGames,
    }));
  }

  // Delete profile
  deleteProfile(): void {
    this.profile = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  // Export profile data (for backup)
  exportData(): string {
    const stats = statsService.loadStats();
    return JSON.stringify({
      profile: this.profile,
      stats,
      exportedAt: Date.now(),
    }, null, 2);
  }

  // Get profile summary for display
  getProfileSummary(): {
    name: string;
    level: PlayerLevel;
    progress: { current: number; next: number; percentage: number } | null;
    memberSince: string;
    lastPlayed: string;
  } {
    const level = this.getPlayerLevel();
    const progress = this.getLevelProgress();

    const formatDate = (timestamp: number | undefined): string => {
      if (!timestamp) return 'Nunca';
      const date = new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    return {
      name: this.getName(),
      level,
      progress,
      memberSince: formatDate(this.profile?.createdAt),
      lastPlayed: formatDate(this.profile?.lastPlayedAt),
    };
  }
}

export const profileService = new ProfileService();
