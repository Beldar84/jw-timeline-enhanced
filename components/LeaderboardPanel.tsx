import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../services/leaderboardService';
import { profileService } from '../services/profileService';
import { soundService } from '../services/soundService';
import { LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  onClose: () => void;
}

type Period = 'weekly' | 'monthly' | 'allTime';

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ onClose }) => {
  const [period, setPeriod] = useState<Period>('allTime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const playerName = profileService.getName();

  useEffect(() => {
    // Update leaderboard with current stats
    leaderboardService.updateLeaderboard();
    setEntries(leaderboardService.getTopPlayers(period, 20));
  }, [period]);

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
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-4">
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

          {/* Period Tabs */}
          <div className="flex gap-2 mt-4">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition text-sm ${
                  period === p
                    ? 'bg-white text-amber-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {periodLabels[p].icon} {periodLabels[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Time until reset */}
        {period !== 'allTime' && (
          <div className="bg-gray-900/50 px-4 py-2 text-center text-sm text-gray-400">
            ⏱️ Se reinicia en: {leaderboardService.getTimeUntilReset(period)}
          </div>
        )}

        {/* Leaderboard List */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {entries.length === 0 ? (
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
                    {/* Rank */}
                    <div className={`w-10 text-center font-bold text-lg ${getRankColor(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isCurrentPlayer ? 'text-indigo-300' : 'text-white'}`}>
                        {entry.name}
                        {isCurrentPlayer && <span className="ml-2 text-xs">(Tú)</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.gamesPlayed} partidas • {entry.winRate.toFixed(0)}% victorias
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="font-bold text-yellow-400">{entry.score.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">puntos</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Player Position */}
        {playerRank && playerRank > 10 && (
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
              💡 <strong>¿Cómo se calcula la puntuación?</strong><br />
              <span className="text-xs text-gray-400">
                Victorias × 100 + Bonus por % victorias + Bonus por precisión
              </span>
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPanel;
