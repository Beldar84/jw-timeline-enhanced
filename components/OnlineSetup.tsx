
import React, { useState } from 'react';
import { soundService } from '../services/soundService';

interface OnlineSetupProps {
  onJoinLobby: (playerName: string, gameId?: string) => Promise<void>;
}

const OnlineSetup: React.FC<OnlineSetupProps> = ({ onJoinLobby }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    soundService.playClick();
    setError(null);
    const trimmedPlayerName = playerName.trim();
    const trimmedGameId = gameId.trim(); 
    
    if (trimmedPlayerName) {
      setIsLoading(true);
      try {
          await onJoinLobby(trimmedPlayerName, trimmedGameId || undefined);
      } catch (err: any) {
          console.error(err);
          // Show the specific error message if available, otherwise generic
          setError(err.message || "No se pudo conectar. Verifica tu conexión o el ID de la partida.");
      } finally {
          setIsLoading(false);
      }
    }
  };

  const buttonText = isLoading 
    ? 'Conectando...' 
    : (gameId.trim() ? 'Unirse a la Sala' : 'Crear Sala');

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm">
      <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-6">Jugar Online (P2P)</h2>
      
      {error && (
          <div className="bg-red-500/80 text-white p-3 rounded mb-4 text-sm w-full max-w-md text-center">
              {error}
          </div>
      )}

      <div className="w-full max-w-md space-y-4 mb-6">
        
        <div>
            <label htmlFor="player-name" className="block text-sm font-medium text-yellow-100 mb-1">Tu nombre</label>
            <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none transition"
                placeholder="Tu nombre"
                disabled={isLoading}
            />
        </div>

        <div>
            <label htmlFor="game-id" className="block text-sm font-medium text-yellow-100 mb-1">ID de Partida (opcional)</label>
            <input
                id="game-id"
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value.toUpperCase())}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none transition"
                placeholder="Ej. JW-X9Y2"
                disabled={isLoading}
            />
             <p className="text-xs text-gray-400 mt-1">Si dejas esto en blanco, se creará un código nuevo.</p>
        </div>

      </div>
      <button
        onClick={handleStart}
        disabled={!playerName.trim() || isLoading}
        className="w-full max-w-md px-6 py-3 md:px-8 md:py-4 bg-purple-600 text-lg md:text-xl font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105 flex justify-center items-center"
      >
        {isLoading && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        )}
        {buttonText}
      </button>
    </div>
  );
};

export default OnlineSetup;
