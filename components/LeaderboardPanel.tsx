
import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../services/leaderboardService';
import { firebaseService, OnlineLeaderboardEntry } from '../services/firebaseService';
import { statsService } from '../services/statsService';
import { profileService } from '../services/profileService';
import { soundService } from '../services/soundService';
import { LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  onClose: () => void;
}

type Tab = 'local' | 'global';
type Period = 'weekly' | 'monthly' | 'allTime';

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<Tab>('local');
  const [period, setPeriod] = useState<Period>('allTime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  // Global state
  const [globalEntries, setGlobalEntries] = useState<OnlineLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const playerName = profileService.getName();

  useEffect(() => {
    if (tab === 'local') {
      leaderboardService.updateLeaderboard();
      setEntries(leaderboardService.getTopPlayers(period, 20));
    } else {
      loadGlobalLeaderboard();
    }
  }, [tab, period]);

  const loadGlobalLeaderboard = async () => {
    setGlobalLoading(true);
    setGlobalError(null);

    try {
      const entries = await firebaseService.getLeaderboard(50);
      setGlobalEntries(entries);

      if (firebaseService.isSignedIn()) {
        const rank = await firebaseService.getMyRank();
        setMyRank(rank);
      }
    } catch (err) {
      setGlobalError('Error al cargar la clasificación global');
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setGlobalError(null);
    soundService.playClick();

    try {
      const profile = profileService.getProfile();
      const stats = statsService.loadStats();

      const onlineStats = {
        totalWins: stats.gamesWon,
        totalGames: stats.gamesPlayed,
        totalPlacements: stats.totalCardsPlaced,
        correctPlacements: stats.correctPlacements,
        bestStreak: stats.longestWinStreak,
        currentStreak: stats.currentWinStreak
      };

      const success = await firebaseService.syncStats(onlineStats, profile.name);

      if (success) {
        await loadGlobalLeaderboard();
        soundService.playCorrect();
      } else {
        setGlobalError('Error al sincronizar');
        soundService.playIncorrect();
      }
    } catch (err) {
      setGlobalError('Error al sincronizar estadísticas');
      console.error(err);
      soundService.playIncorrect();
    } finally {
      setSyncing(false);
    }
  };

  const handleTabChange = (newTab: Tab) => {
    soundService.playClick();
    setTab(newTab);
  };

  const handlePeriodChange = (newPeriod: Period) => {
    soundService.playClick();
    setPeriod(newPeriod);
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-gray-400';
    }
  };

  const periodLabels: Record<Period, { label: string; icon: string }> = {
    weekly: { label: 'Semanal', icon: '📅' },
    monthly: { label: 'Mensual', icon: '📆' },
    allTime: { label: 'Histórico', icon: '🏆' },
  };

  const playerRank = leaderboardService.getPlayerRank(period);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 ${tab === 'local' ? 'bg-gradient-to-r from-yellow-600 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🏆 Clasificación
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Tab selector */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleTabChange('local')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold transition text-sm ${
                tab === 'local'
                  ? 'bg-white text-amber-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📱 Local
            </button>
            <button
              onClick={() => handleTabChange('global')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold transition text-sm ${
                tab === 'global'
                  ? 'bg-white text-purple-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🌍 Global
            </button>
          </div>

          {/* Period Tabs (only for local) */}
          {tab === 'local' && (
            <div className="flex gap-2 mt-3">
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition text-xs ${
                    period === p
                      ? 'bg-white/90 text-amber-700'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {periodLabels[p].icon} {periodLabels[p].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time until reset (local only) */}
        {tab === 'local' && period !== 'allTime' && (
          <div className="bg-gray-900/50 px-4 py-2 text-center text-sm text-gray-400">
            ⏱️ Se reinicia en: {leaderboardService.getTimeUntilReset(period)}
          </div>
        )}

        {/* Sync button (global only) */}
        {tab === 'global' && (
          <div className="p-3 bg-gray-700/50 border-b border-gray-600">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-sm"
            >
              {syncing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Sincronizando...
                </>
              ) : (
                <>
                  🔄 Subir mis estadísticas
                </>
              )}
            </button>
            {myRank && (
              <p className="text-sm text-yellow-300 text-center mt-2">
                Tu posición global: #{myRank}
              </p>
            )}
            {globalError && (
              <p className="text-sm text-red-400 text-center mt-2">{globalError}</p>
            )}
          </div>
        )}

        {/* Leaderboard List */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {tab === 'local' ? (
            // LOCAL LEADERBOARD
            entries.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📊</span>
                <p className="text-gray-400">No hay datos todavía</p>
                <p className="text-sm text-gray-500 mt-2">¡Juega partidas para aparecer en la clasificación!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const isCurrentPlayer = entry.name === playerName;
                  return (
                    <div
                      key={`${entry.rank}-${entry.name}`}
                      className={`flex items-center gap-3 p-3 rounded-lg transition ${
                        isCurrentPlayer
                          ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50'
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <div className={`w-10 text-center font-bold text-lg ${getRankColor(entry.rank)}`}>
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isCurrentPlayer ? 'text-indigo-300' : 'text-white'}`}>
                          {entry.name}
                          {isCurrentPlayer && <span className="ml-2 text-xs">(Tú)</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {entry.gamesPlayed} partidas • {entry.winRate.toFixed(0)}% victorias
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-400">{entry.score.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">puntos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // GLOBAL LEADERBOARD
            globalLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-spin text-4xl">⏳</span>
              </div>
            ) : globalEntries.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🌍</span>
                <p className="text-gray-400">No hay datos en la clasificación global</p>
                <p className="text-sm text-gray-500 mt-2">¡Sé el primero en sincronizar!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {globalEntries.map((entry, index) => {
                  const rank = index + 1;
                  const isMe = entry.id === firebaseService.getCurrentUserId();

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isMe
                          ? 'bg-yellow-500/20 border border-yellow-500/50'
                          : rank <= 3
                          ? 'bg-gray-700/70'
                          : 'bg-gray-700/30'
                      }`}
                    >
                      <div className={`w-10 text-center font-bold text-lg ${getRankColor(rank)}`}>
                        {getRankIcon(rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                          {entry.name} {isMe && '(Tú)'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {entry.wins} victorias • {entry.winRate}% winrate
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-400">{entry.score.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">puntos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Current Player Position (local only) */}
        {tab === 'local' && playerRank && playerRank > 10 && (
          <div className="border-t border-gray-700 p-4 bg-gray-900/50">
            <p className="text-center text-gray-400 text-sm">
              Tu posición: <span className="text-indigo-400 font-bold">#{playerRank}</span>
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-200">
              💡 <strong>Puntuación:</strong>{' '}
              <span className="text-xs text-gray-400">
                Victorias × 100 + Precisión × 10 + Mejor racha × 50
              </span>
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 bg-gray-900/50">
          <button
            onClick={onClose}
            className={`w-full py-3 ${tab === 'local' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold rounded-lg transition`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPanel;
