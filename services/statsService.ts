// Service for tracking player statistics and achievements
import { deckService } from './deckService';

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalCardsPlaced: number;
  correctPlacements: number;
  incorrectPlacements: number;
  longestWinStreak: number;
  currentWinStreak: number;
  fastestWin: number | null; // in seconds
  averageGameDuration: number;
  totalPlayTime: number; // in seconds
  achievements: Achievement[];
  deckStats: Record<string, DeckStats>;
}

export interface DeckStats {
  gamesPlayed: number;
  gamesWon: number;
  cardsPlaced: number;
  correctPlacements: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: number | null; // timestamp or null if not unlocked
  icon: string;
}

export interface GameSession {
  startTime: number;
  endTime?: number;
  deckId: string;
  result?: 'win' | 'loss';
  cardsPlaced: number;
  correctPlacements: number;
  incorrectPlacements: number;
  isStudyMode?: boolean;
}

const STORAGE_KEY = 'jw_timeline_stats';
const SYNC_BASE_KEY = 'jw_timeline_stats_sync_base';

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  totalCardsPlaced: 0,
  correctPlacements: 0,
  incorrectPlacements: 0,
  longestWinStreak: 0,
  currentWinStreak: 0,
  fastestWin: null,
  averageGameDuration: 0,
  totalPlayTime: 0,
  achievements: [
    { id: 'first_win', name: 'Primera Victoria', description: 'Gana tu primera partida', unlockedAt: null, icon: '🏆' },
    { id: 'perfect_game', name: 'Juego Perfecto', description: 'Gana sin cometer errores', unlockedAt: null, icon: '⭐' },
    { id: 'speed_demon', name: 'Rayo Veloz', description: 'Gana en menos de 5 minutos', unlockedAt: null, icon: '⚡' },
    { id: 'win_streak_3', name: 'Racha de 3', description: 'Gana 3 partidas seguidas', unlockedAt: null, icon: '🔥' },
    { id: 'win_streak_5', name: 'Racha de 5', description: 'Gana 5 partidas seguidas', unlockedAt: null, icon: '💥' },
    { id: 'win_streak_10', name: 'Imparable', description: 'Gana 10 partidas seguidas', unlockedAt: null, icon: '👑' },
    { id: 'veteran', name: 'Veterano', description: 'Juega 50 partidas', unlockedAt: null, icon: '🎖️' },
    { id: 'master', name: 'Maestro', description: 'Juega 100 partidas', unlockedAt: null, icon: '🏅' },
    { id: 'accuracy_80', name: 'Precisión 80%', description: 'Alcanza 80% de precisión', unlockedAt: null, icon: '🎯' },
    { id: 'accuracy_90', name: 'Precisión 90%', description: 'Alcanza 90% de precisión', unlockedAt: null, icon: '💎' },
    { id: 'all_decks', name: 'Explorador', description: 'Juega con todos los mazos', unlockedAt: null, icon: '🗺️' },
  ],
  deckStats: {},
};

function cloneStats(stats: PlayerStats): PlayerStats {
  return {
    ...stats,
    achievements: stats.achievements.map(achievement => ({ ...achievement })),
    deckStats: Object.fromEntries(
      Object.entries(stats.deckStats).map(([deckId, deckStats]) => [deckId, { ...deckStats }])
    ),
  };
}

class StatsService {
  private currentSession: GameSession | null = null;
  private lastCompletedSession: GameSession | null = null;

  // Load stats from localStorage
  loadStats(): PlayerStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return this.normalizeStats(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading stats:', e);
    }
    return cloneStats(DEFAULT_STATS);
  }

  // Completa un objeto de estadísticas parcial (localStorage antiguo o nube)
  // con los valores por defecto y la lista actual de logros.
  private normalizeStats(raw: Partial<PlayerStats> | null | undefined): PlayerStats {
    const base = raw || {};
    return {
      ...DEFAULT_STATS,
      ...base,
      achievements: DEFAULT_STATS.achievements.map(defaultAch => {
        const existing = base.achievements?.find((a: Achievement) => a.id === defaultAch.id);
        return { ...(existing || defaultAch) };
      }),
      deckStats: Object.fromEntries(
        Object.entries(base.deckStats || {}).map(([deckId, deckStats]) => [deckId, { ...deckStats }])
      ),
    };
  }

  private loadSyncBase(): PlayerStats | null {
    try {
      const stored = localStorage.getItem(SYNC_BASE_KEY);
      return stored ? this.normalizeStats(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  }

  private saveSyncBase(stats: PlayerStats): void {
    try {
      localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats sync base:', error);
    }
  }

  // Combina las estadísticas locales con las guardadas en la nube.
  // El lado con más partidas jugadas manda en los contadores; logros,
  // rachas y récords se combinan tomando siempre el mejor de los dos.
  // Guarda el resultado en local y devuelve si algo cambió.
  mergeWithCloudStats(cloudRaw: Partial<PlayerStats> | null | undefined): { stats: PlayerStats; localChanged: boolean } {
    const local = this.loadStats();
    if (!cloudRaw) return { stats: local, localChanged: false };

    const cloud = this.normalizeStats(cloudRaw);
    const syncBase = this.loadSyncBase();

    // The first sync cannot distinguish duplicated history from independent
    // history, so it keeps the most complete side. Subsequent syncs add only
    // the local delta since that shared base, preserving games from two devices
    // without counting the same snapshot twice.
    const additive = (localValue: number, baseValue: number) => Math.max(0, localValue - baseValue);
    const firstSyncBase = cloud.gamesPlayed > local.gamesPlayed ? cloud : local;
    const mergedCounters = syncBase
      ? {
          gamesPlayed: cloud.gamesPlayed + additive(local.gamesPlayed, syncBase.gamesPlayed),
          gamesWon: cloud.gamesWon + additive(local.gamesWon, syncBase.gamesWon),
          gamesLost: cloud.gamesLost + additive(local.gamesLost, syncBase.gamesLost),
          totalCardsPlaced: cloud.totalCardsPlaced + additive(local.totalCardsPlaced, syncBase.totalCardsPlaced),
          correctPlacements: cloud.correctPlacements + additive(local.correctPlacements, syncBase.correctPlacements),
          incorrectPlacements: cloud.incorrectPlacements + additive(local.incorrectPlacements, syncBase.incorrectPlacements),
          totalPlayTime: cloud.totalPlayTime + additive(local.totalPlayTime, syncBase.totalPlayTime),
        }
      : {
          gamesPlayed: firstSyncBase.gamesPlayed,
          gamesWon: firstSyncBase.gamesWon,
          gamesLost: firstSyncBase.gamesLost,
          totalCardsPlaced: firstSyncBase.totalCardsPlaced,
          correctPlacements: firstSyncBase.correctPlacements,
          incorrectPlacements: firstSyncBase.incorrectPlacements,
          totalPlayTime: firstSyncBase.totalPlayTime,
        };

    const bestFastestWin = [local.fastestWin, cloud.fastestWin]
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b)[0] ?? null;

    const merged: PlayerStats = {
      ...firstSyncBase,
      ...mergedCounters,
      longestWinStreak: Math.max(local.longestWinStreak, cloud.longestWinStreak),
      currentWinStreak: syncBase && local.gamesPlayed > syncBase.gamesPlayed
        ? local.currentWinStreak
        : cloud.currentWinStreak,
      fastestWin: bestFastestWin,
      averageGameDuration: mergedCounters.gamesPlayed > 0
        ? mergedCounters.totalPlayTime / mergedCounters.gamesPlayed
        : 0,
      achievements: DEFAULT_STATS.achievements.map(def => {
        const localAch = local.achievements.find(a => a.id === def.id);
        const cloudAch = cloud.achievements.find(a => a.id === def.id);
        const unlockedAt = [localAch?.unlockedAt, cloudAch?.unlockedAt]
          .filter((v): v is number => typeof v === 'number')
          .sort((a, b) => a - b)[0] ?? null;
        return { ...def, unlockedAt };
      }),
      deckStats: Object.fromEntries(
        Array.from(new Set([...Object.keys(local.deckStats), ...Object.keys(cloud.deckStats)])).map(deckId => {
          const localDeck = local.deckStats[deckId] || { gamesPlayed: 0, gamesWon: 0, cardsPlaced: 0, correctPlacements: 0 };
          const cloudDeck = cloud.deckStats[deckId] || { gamesPlayed: 0, gamesWon: 0, cardsPlaced: 0, correctPlacements: 0 };
          const baseDeck = syncBase?.deckStats[deckId] || { gamesPlayed: 0, gamesWon: 0, cardsPlaced: 0, correctPlacements: 0 };
          const mergedDeck = syncBase
            ? {
                gamesPlayed: cloudDeck.gamesPlayed + additive(localDeck.gamesPlayed, baseDeck.gamesPlayed),
                gamesWon: cloudDeck.gamesWon + additive(localDeck.gamesWon, baseDeck.gamesWon),
                cardsPlaced: cloudDeck.cardsPlaced + additive(localDeck.cardsPlaced, baseDeck.cardsPlaced),
                correctPlacements: cloudDeck.correctPlacements + additive(localDeck.correctPlacements, baseDeck.correctPlacements),
              }
            : (cloudDeck.gamesPlayed > localDeck.gamesPlayed ? cloudDeck : localDeck);
          return [deckId, mergedDeck];
        })
      ),
    };

    const localChanged = JSON.stringify(merged) !== JSON.stringify(local);
    if (localChanged) this.saveStats(merged);
    this.saveSyncBase(merged);
    return { stats: merged, localChanged };
  }

  // Save stats to localStorage
  saveStats(stats: PlayerStats): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('Error saving stats:', e);
    }
  }

  // Reset all stats
  resetStats(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_BASE_KEY);
    this.currentSession = null;
    this.lastCompletedSession = null;
  }

  // Start a new game session
  startSession(deckId: string, isStudyMode: boolean = false): void {
    this.currentSession = {
      startTime: Date.now(),
      deckId,
      cardsPlaced: 0,
      correctPlacements: 0,
      incorrectPlacements: 0,
      isStudyMode,
    };
  }

  getCurrentSession(): GameSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  restoreSession(session: GameSession | null | undefined, deckId: string, isStudyMode: boolean): void {
    const isValidSession = session
      && Number.isFinite(session.startTime)
      && typeof session.deckId === 'string'
      && session.deckId.length > 0
      && Number.isInteger(session.cardsPlaced)
      && session.cardsPlaced >= 0
      && Number.isInteger(session.correctPlacements)
      && session.correctPlacements >= 0
      && Number.isInteger(session.incorrectPlacements)
      && session.incorrectPlacements >= 0;

    if (!isValidSession) {
      this.startSession(deckId, isStudyMode);
      return;
    }

    this.currentSession = {
      ...session,
      endTime: undefined,
      result: undefined,
    };
  }

  cancelSession(): void {
    this.currentSession = null;
  }

  // Record a card placement
  recordPlacement(isCorrect: boolean): void {
    if (this.currentSession) {
      this.currentSession.cardsPlaced++;
      if (isCorrect) {
        this.currentSession.correctPlacements++;
      } else {
        this.currentSession.incorrectPlacements++;
      }
    }
  }

  // End the current session and update stats
  endSession(playerWon: boolean): PlayerStats {
    if (!this.currentSession) {
      return this.loadStats();
    }

    // Don't count study mode games in stats
    if (this.currentSession.isStudyMode) {
      this.lastCompletedSession = {
        ...this.currentSession,
        endTime: Date.now(),
        result: playerWon ? 'win' : 'loss',
      };
      this.currentSession = null;
      return this.loadStats();
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.result = playerWon ? 'win' : 'loss';

    const stats = this.loadStats();
    const duration = (this.currentSession.endTime - this.currentSession.startTime) / 1000; // seconds

    // Update basic stats
    stats.gamesPlayed++;
    if (playerWon) {
      stats.gamesWon++;
      stats.currentWinStreak++;
      if (stats.currentWinStreak > stats.longestWinStreak) {
        stats.longestWinStreak = stats.currentWinStreak;
      }
      // Track fastest win
      if (!stats.fastestWin || duration < stats.fastestWin) {
        stats.fastestWin = duration;
      }
    } else {
      stats.gamesLost++;
      stats.currentWinStreak = 0;
    }

    stats.totalCardsPlaced += this.currentSession.cardsPlaced;
    stats.correctPlacements += this.currentSession.correctPlacements;
    stats.incorrectPlacements += this.currentSession.incorrectPlacements;
    stats.totalPlayTime += duration;
    stats.averageGameDuration = stats.totalPlayTime / stats.gamesPlayed;

    // Update deck-specific stats
    const deckId = this.currentSession.deckId;
    if (!stats.deckStats[deckId]) {
      stats.deckStats[deckId] = {
        gamesPlayed: 0,
        gamesWon: 0,
        cardsPlaced: 0,
        correctPlacements: 0,
      };
    }
    stats.deckStats[deckId].gamesPlayed++;
    if (playerWon) stats.deckStats[deckId].gamesWon++;
    stats.deckStats[deckId].cardsPlaced += this.currentSession.cardsPlaced;
    stats.deckStats[deckId].correctPlacements += this.currentSession.correctPlacements;

    // Check for achievements
    this.checkAchievements(stats, this.currentSession);

    this.saveStats(stats);
    this.lastCompletedSession = { ...this.currentSession };
    this.currentSession = null;
    return stats;
  }

  getLastCompletedSession(): GameSession | null {
    return this.lastCompletedSession ? { ...this.lastCompletedSession } : null;
  }

  // Registra el resultado de una partida terminada fuera de una sesión local,
  // p. ej. partidas por turnos que duran días. No afecta a métricas de duración.
  recordCompletedGame(
    playerWon: boolean,
    options: { deckId?: string; cardsPlaced?: number; correctPlacements?: number; incorrectPlacements?: number } = {}
  ): PlayerStats {
    const stats = this.loadStats();
    const deckId = options.deckId || 'complete';
    const cardsPlaced = options.cardsPlaced || 0;
    const correct = options.correctPlacements || 0;
    const incorrect = options.incorrectPlacements || 0;
    const hasPlacementData = options.correctPlacements !== undefined || options.incorrectPlacements !== undefined;

    stats.gamesPlayed++;
    if (playerWon) {
      stats.gamesWon++;
      stats.currentWinStreak++;
      if (stats.currentWinStreak > stats.longestWinStreak) {
        stats.longestWinStreak = stats.currentWinStreak;
      }
    } else {
      stats.gamesLost++;
      stats.currentWinStreak = 0;
    }

    stats.totalCardsPlaced += cardsPlaced;
    stats.correctPlacements += correct;
    stats.incorrectPlacements += incorrect;
    if (stats.gamesPlayed > 0) {
      stats.averageGameDuration = stats.totalPlayTime / stats.gamesPlayed;
    }

    if (!stats.deckStats[deckId]) {
      stats.deckStats[deckId] = {
        gamesPlayed: 0,
        gamesWon: 0,
        cardsPlaced: 0,
        correctPlacements: 0,
      };
    }
    stats.deckStats[deckId].gamesPlayed++;
    if (playerWon) stats.deckStats[deckId].gamesWon++;
    stats.deckStats[deckId].cardsPlaced += cardsPlaced;
    stats.deckStats[deckId].correctPlacements += correct;

    const pseudoSession: GameSession = {
      startTime: 0,
      deckId,
      result: playerWon ? 'win' : 'loss',
      cardsPlaced,
      correctPlacements: correct,
      // Sin datos reales de jugadas no debe desbloquearse "Juego Perfecto"
      incorrectPlacements: hasPlacementData ? incorrect : 1,
    };
    this.checkAchievements(stats, pseudoSession);

    this.saveStats(stats);
    return stats;
  }

  // Check and unlock achievements
  private checkAchievements(stats: PlayerStats, session: GameSession): void {
    const now = Date.now();
    const accuracy = stats.totalCardsPlaced > 0
      ? (stats.correctPlacements / stats.totalCardsPlaced) * 100
      : 0;

    // First win
    if (stats.gamesWon === 1 && !stats.achievements.find(a => a.id === 'first_win')?.unlockedAt) {
      this.unlockAchievement(stats, 'first_win', now);
    }

    // Perfect game
    if (session.result === 'win' && session.incorrectPlacements === 0) {
      this.unlockAchievement(stats, 'perfect_game', now);
    }

    // Speed demon
    if (session.result === 'win' && session.endTime && session.startTime) {
      const duration = (session.endTime - session.startTime) / 1000;
      if (duration < 300) { // 5 minutes
        this.unlockAchievement(stats, 'speed_demon', now);
      }
    }

    // Win streaks
    if (stats.currentWinStreak >= 3) this.unlockAchievement(stats, 'win_streak_3', now);
    if (stats.currentWinStreak >= 5) this.unlockAchievement(stats, 'win_streak_5', now);
    if (stats.currentWinStreak >= 10) this.unlockAchievement(stats, 'win_streak_10', now);

    // Games played
    if (stats.gamesPlayed >= 50) this.unlockAchievement(stats, 'veteran', now);
    if (stats.gamesPlayed >= 100) this.unlockAchievement(stats, 'master', now);

    // Accuracy
    if (accuracy >= 80) this.unlockAchievement(stats, 'accuracy_80', now);
    if (accuracy >= 90) this.unlockAchievement(stats, 'accuracy_90', now);

    // All decks played - check if player has played at least one game with each deck
    this.checkAllDecksAchievement(stats, now);
  }

  // Check if player has played all decks
  private checkAllDecksAchievement(stats: PlayerStats, timestamp: number): void {
    const allDecks = deckService.getAllDecks();
    const playedDeckIds = Object.keys(stats.deckStats).filter(
      deckId => stats.deckStats[deckId].gamesPlayed > 0
    );

    // Check if all deck IDs are in the played list
    const allDecksPlayed = allDecks.every(deck => playedDeckIds.includes(deck.id));

    if (allDecksPlayed && allDecks.length > 0) {
      this.unlockAchievement(stats, 'all_decks', timestamp);
    }
  }

  private unlockAchievement(stats: PlayerStats, achievementId: string, timestamp: number): void {
    const achievement = stats.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = timestamp;
    }
  }

  // Get achievement progress info
  getAchievementProgress(stats: PlayerStats): { total: number; unlocked: number } {
    const unlocked = stats.achievements.filter(a => a.unlockedAt !== null).length;
    return { total: stats.achievements.length, unlocked };
  }

  // Get accuracy percentage
  getAccuracy(stats: PlayerStats): number {
    if (stats.totalCardsPlaced === 0) return 0;
    return (stats.correctPlacements / stats.totalCardsPlaced) * 100;
  }

  // Get win rate
  getWinRate(stats: PlayerStats): number {
    if (stats.gamesPlayed === 0) return 0;
    return (stats.gamesWon / stats.gamesPlayed) * 100;
  }

  // Format time in MM:SS
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Get decks played count for UI
  getDecksPlayedCount(stats: PlayerStats): { played: number; total: number } {
    const allDecks = deckService.getAllDecks();
    const playedDeckIds = Object.keys(stats.deckStats).filter(
      deckId => stats.deckStats[deckId].gamesPlayed > 0
    );
    return {
      played: playedDeckIds.length,
      total: allDecks.length,
    };
  }
}

export const statsService = new StatsService();
