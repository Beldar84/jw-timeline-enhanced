import React, { useState, useEffect } from 'react';
import { statsService, PlayerStats, DeckStats } from '../services/statsService';
import { deckService } from '../services/deckService';
import { soundService } from '../services/soundService';
import { firebaseService, GameHistoryEntry } from '../services/firebaseService';

interface StatsPanelProps {
  onClose: () => void;
}

type StatsTab = 'overview' | 'achievements' | 'decks' | 'history';

const StatsPanel: React.FC<StatsPanelProps> = ({ onClose }) => {
  const [stats, setStats] = useState<PlayerStats>(statsService.loadStats());
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const accuracy = statsService.getAccuracy(stats);
  const winRate = statsService.getWinRate(stats);
  const achievementProgress = statsService.getAchievementProgress(stats);

  useEffect(() => {
    if (activeTab !== 'history') return;
    if (!firebaseService.isSignedIn()) {
      setHistory([]);
      return;
    }

    let isMounted = true;
    setHistoryLoading(true);
    firebaseService.getGameHistory(30)
      .then(entries => {
        if (isMounted) setHistory(entries);
      })
      .finally(() => {
        if (isMounted) setHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const handleTabChange = (tab: StatsTab) => {
    soundService.playClick();
    setActiveTab(tab);
  };

  const handleClose = () => {
    soundService.playClick();
    onClose();
  };

  const handleResetStats = () => {
    if (showResetConfirm) {
      statsService.resetStats();
      setStats(statsService.loadStats());
      setShowResetConfirm(false);
      soundService.playClick();
    } else {
      setShowResetConfirm(true);
      soundService.playClick();
    }
  };

  const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-yellow-200">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );

  const formatHistoryDate = (dateValue: any): string => {
    const date = dateValue?.toDate ? dateValue.toDate() : dateValue ? new Date(dateValue) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '--';
  };

  const getModeLabel = (mode: GameHistoryEntry['mode']): string => {
    if (mode === 'ai') return 'Contra IA';
    if (mode === 'local') return 'Local';
    if (mode === 'turnbased') return 'Por turnos';
    return 'Online';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white" style={{fontFamily: "'Trajan Pro', serif"}}>
              📊 Estadísticas
            </h2>
            <button
              onClick={handleClose}
              className="text-white text-3xl hover:text-gray-300 transition"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => handleTabChange('overview')}
            className={`flex-1 py-3 px-4 font-bold transition ${
              activeTab === 'overview'
                ? 'bg-gray-700 text-yellow-200 border-b-2 border-yellow-200'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            General
          </button>
          <button
            onClick={() => handleTabChange('achievements')}
            className={`flex-1 py-3 px-4 font-bold transition ${
              activeTab === 'achievements'
                ? 'bg-gray-700 text-yellow-200 border-b-2 border-yellow-200'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Logros ({achievementProgress.unlocked}/{achievementProgress.total})
          </button>
          <button
            onClick={() => handleTabChange('decks')}
            className={`flex-1 py-3 px-4 font-bold transition ${
              activeTab === 'decks'
                ? 'bg-gray-700 text-yellow-200 border-b-2 border-yellow-200'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mazos
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`flex-1 py-3 px-4 font-bold transition ${
              activeTab === 'history'
                ? 'bg-gray-700 text-yellow-200 border-b-2 border-yellow-200'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Historial
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Partidas Jugadas" value={stats.gamesPlayed} icon="🎮" />
                <StatCard label="Victorias" value={stats.gamesWon} icon="🏆" />
                <StatCard label="Derrotas" value={stats.gamesLost} icon="😔" />
                <StatCard label="Racha Actual" value={stats.currentWinStreak} icon="🔥" />
              </div>

              {/* Percentages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-2">Tasa de Victoria</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-green-400">{winRate.toFixed(1)}%</span>
                    <span className="text-gray-400 mb-1">
                      ({stats.gamesWon}/{stats.gamesPlayed})
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${winRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-2">Precisión</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-blue-400">{accuracy.toFixed(1)}%</span>
                    <span className="text-gray-400 mb-1">
                      ({stats.correctPlacements}/{stats.totalCardsPlaced})
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${accuracy}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  label="Mayor Racha"
                  value={stats.longestWinStreak}
                  icon="⭐"
                />
                <StatCard
                  label="Victoria Más Rápida"
                  value={stats.fastestWin ? statsService.formatTime(stats.fastestWin) : '--'}
                  icon="⚡"
                />
                <StatCard
                  label="Tiempo Promedio"
                  value={statsService.formatTime(stats.averageGameDuration)}
                  icon="⏱️"
                />
              </div>

              {/* Card Stats */}
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3">Estadísticas de Cartas</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-yellow-200">{stats.totalCardsPlaced}</div>
                    <div className="text-sm text-gray-400">Total Jugadas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{stats.correctPlacements}</div>
                    <div className="text-sm text-gray-400">Correctas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{stats.incorrectPlacements}</div>
                    <div className="text-sm text-gray-400">Incorrectas</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Progreso de Logros</h3>
                    <p className="text-sm text-gray-400">
                      Has desbloqueado {achievementProgress.unlocked} de {achievementProgress.total} logros
                    </p>
                  </div>
                  <div className="text-3xl">{achievementProgress.unlocked === achievementProgress.total ? '🎉' : '🎯'}</div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3 mt-3">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-3 rounded-full transition-all"
                    style={{ width: `${(achievementProgress.unlocked / achievementProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border-2 ${
                      achievement.unlockedAt
                        ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border-yellow-500'
                        : 'bg-gray-700/30 border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-4xl ${achievement.unlockedAt ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold ${achievement.unlockedAt ? 'text-yellow-200' : 'text-gray-400'}`}>
                          {achievement.name}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>
                        {achievement.unlockedAt && (
                          <p className="text-xs text-green-400 mt-2">
                            ✓ Desbloqueado {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'decks' && (
            <div className="space-y-4">
              {Object.keys(stats.deckStats).length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">📚</div>
                  <p>Aún no has jugado con ningún mazo.</p>
                  <p className="text-sm mt-2">¡Comienza a jugar para ver tus estadísticas por mazo!</p>
                </div>
              ) : (
                Object.entries(stats.deckStats).map(([deckId, deckStatsData]) => {
                  const deckStats = deckStatsData as DeckStats;
                  const deck = deckService.getDeckById(deckId);
                  if (!deck) return null;

                  const deckWinRate = deckStats.gamesPlayed > 0
                    ? (deckStats.gamesWon / deckStats.gamesPlayed) * 100
                    : 0;
                  const deckAccuracy = deckStats.cardsPlaced > 0
                    ? (deckStats.correctPlacements / deckStats.cardsPlaced) * 100
                    : 0;
                  const colors = deckService.getColorClasses(deck.color);

                  return (
                    <div key={deckId} className={`p-4 rounded-lg border-2 ${colors.border} bg-gray-700/30`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-4xl">{deck.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">{deck.name}</h3>
                          <p className="text-sm text-gray-400">{deckStats.gamesPlayed} partidas jugadas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-green-400">{deckStats.gamesWon}</div>
                          <div className="text-xs text-gray-400">Victorias</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-blue-400">{deckWinRate.toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Tasa Victoria</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-yellow-400">{deckStats.cardsPlaced}</div>
                          <div className="text-xs text-gray-400">Cartas Jugadas</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-purple-400">{deckAccuracy.toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Precisión</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {!firebaseService.isSignedIn() ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">☁️</div>
                  <p>Inicia sesión para guardar y consultar tu historial en la nube.</p>
                </div>
              ) : historyLoading ? (
                <div className="text-center py-12 text-gray-400">Cargando historial...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">🕰️</div>
                  <p>Aún no hay partidas guardadas en tu historial.</p>
                </div>
              ) : (
                history.map(entry => {
                  const accuracy = entry.cardsPlaced
                    ? ((entry.correctPlacements || 0) / entry.cardsPlaced) * 100
                    : 0;

                  return (
                    <div key={entry.id} className="bg-gray-700/40 border border-gray-600 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              entry.result === 'win'
                                ? 'bg-green-600/30 text-green-300'
                                : 'bg-red-600/30 text-red-300'
                            }`}>
                              {entry.result === 'win' ? 'Victoria' : 'Derrota'}
                            </span>
                            <span className="text-sm text-gray-300">{getModeLabel(entry.mode)}</span>
                          </div>
                          <h3 className="text-lg font-bold text-white">
                            Ganador: {entry.winnerName || 'Sin ganador'}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {entry.players.map(player => player.name).join(' vs ')}
                          </p>
                        </div>
                        <div className="text-sm text-gray-400 md:text-right">
                          <div>{formatHistoryDate(entry.finishedAt)}</div>
                          <div>{entry.durationSeconds ? statsService.formatTime(entry.durationSeconds) : '--'}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mt-4">
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-yellow-300">{entry.cardsPlaced || 0}</div>
                          <div className="text-xs text-gray-400">Movimientos</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-green-400">{entry.correctPlacements || 0}</div>
                          <div className="text-xs text-gray-400">Correctas</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-red-400">{entry.incorrectPlacements || 0}</div>
                          <div className="text-xs text-gray-400">Incorrectas</div>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                          <div className="text-lg font-bold text-blue-400">{accuracy.toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Precisión</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-700 p-4 flex justify-between items-center">
          <button
            onClick={handleResetStats}
            className={`px-4 py-2 rounded font-bold transition ${
              showResetConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            {showResetConfirm ? '¿Confirmar reinicio?' : 'Reiniciar Estadísticas'}
          </button>
          {showResetConfirm && (
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded font-bold text-white transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
