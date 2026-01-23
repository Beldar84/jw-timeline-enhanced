import React, { useState, useEffect } from 'react';
import { firebaseService, TurnBasedGame } from '../services/firebaseService';
import { soundService } from '../services/soundService';

interface TurnBasedGamesPanelProps {
  onSelectGame: (gameId: string) => void;
  onClose: () => void;
}

const TurnBasedGamesPanel: React.FC<TurnBasedGamesPanelProps> = ({ onSelectGame, onClose }) => {
  const [games, setGames] = useState<TurnBasedGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      const turnBasedGames = await firebaseService.getTurnBasedGames();
      setGames(turnBasedGames);
    } catch (error) {
      console.error('Error loading turn-based games:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMyTurn = (game: TurnBasedGame): boolean => {
    return game.currentTurnPlayerId === firebaseService.getCurrentUserId();
  };

  const getOpponentName = (game: TurnBasedGame): string => {
    const opponent = game.players.find(p => p.id !== firebaseService.getCurrentUserId());
    return opponent?.name || 'Oponente';
  };

  const formatLastMove = (lastMoveAt: any): string => {
    if (!lastMoveAt) return 'Nunca';

    const date = lastMoveAt.toDate ? lastMoveAt.toDate() : new Date(lastMoveAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
  };

  const handleSelectGame = (game: TurnBasedGame) => {
    soundService.playClick();
    onSelectGame(game.id);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            🕐 Partidas por Turnos
          </h2>
          <button
            onClick={() => { soundService.playClick(); onClose(); }}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin text-4xl">⏳</span>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">🕐</p>
              <p>No tienes partidas por turnos activas</p>
              <p className="text-sm mt-2">Invita a un amigo a jugar por turnos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isMyTurn(game)
                      ? 'bg-green-600/20 border-2 border-green-500/50 hover:border-green-400'
                      : 'bg-gray-700/50 border-2 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      isMyTurn(game) ? 'bg-green-500' : 'bg-gray-600'
                    }`}>
                      {isMyTurn(game) ? '🎮' : '⏳'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">vs {getOpponentName(game)}</p>
                      <p className="text-sm text-gray-400">
                        {isMyTurn(game) ? (
                          <span className="text-green-400 font-semibold">¡Tu turno!</span>
                        ) : (
                          <span>Esperando al oponente...</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatLastMove(game.lastMoveAt)}</p>
                      {isMyTurn(game) && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full animate-pulse">
                          JUGAR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-gray-900/50 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            💡 Las partidas por turnos tienen un límite de 24 horas por turno
          </p>
        </div>

        {/* Close Button */}
        <div className="p-4 pt-0">
          <button
            onClick={() => { soundService.playClick(); onClose(); }}
            className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurnBasedGamesPanel;
