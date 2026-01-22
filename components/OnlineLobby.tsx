
import React, { useState } from 'react';
import { GameState } from '../types';
import { soundService } from '../services/soundService';

interface OnlineLobbyProps {
  gameState: GameState;
  localPlayerId: string;
  onStartGame: (gameId: string) => void;
  onAddBot: (gameId: string) => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ gameState, localPlayerId, onStartGame, onAddBot }) => {
  const [copied, setCopied] = useState(false);

  const isHost = gameState.hostId === localPlayerId;

  const handleCopy = () => {
    soundService.playClick();
    if (navigator.clipboard) {
        navigator.clipboard.writeText(gameState.id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    } else {
        alert("No se pudo copiar el ID. Por favor, cópielo manualmente.");
    }
  };
  
  const handleAddBotClick = () => {
    soundService.playClick();
    onAddBot(gameState.id);
  }
  
  const handleStartGameClick = () => {
    soundService.playClick();
    onStartGame(gameState.id);
  }

  const canStart = gameState.players.length >= 2;

  return (
    <div className="flex flex-col items-center bg-gray-800/50 p-4 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm w-full max-w-2xl text-center max-h-[85vh] overflow-y-auto">
      <h2 className="text-xl md:text-3xl font-bold text-yellow-300 mb-3 md:mb-4">Sala de Espera Online</h2>
      <p className="text-yellow-100 mb-4 md:mb-6 text-xs md:text-base">Comparte el ID de la partida para que otros se unan. El juego comenzará cuando el anfitrión lo inicie.</p>
      
      <div className="w-full max-w-md mb-4 md:mb-6">
        <label htmlFor="join-link" className="block text-xs md:text-sm font-medium text-yellow-100 mb-1">ID de Partida</label>
        <div className="flex items-center space-x-2">
          <input
            id="join-link"
            type="text"
            readOnly
            value={gameState.id}
            className="w-full bg-gray-900 text-white p-2.5 md:p-3 rounded-lg border-2 border-gray-600 focus:outline-none select-all text-center font-bold text-lg md:text-xl tracking-widest"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2.5 md:px-4 md:py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition w-24 md:w-32 text-sm md:text-base"
          >
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md mb-6 md:mb-8">
        <h3 className="text-lg md:text-2xl font-semibold text-yellow-200 mb-3 md:mb-4">Jugadores en la sala ({gameState.players.length}/6)</h3>
        <ul className="bg-black/20 rounded-lg p-3 md:p-4 space-y-2 min-h-[100px] md:min-h-[120px]">
          {gameState.players.map((player) => (
            <li key={player.id} className="text-base md:text-lg text-white flex items-center justify-center">
              <span>{player.name}</span>
              {player.isAI && <span className="ml-2 text-xs bg-cyan-500 text-black font-bold px-2 py-0.5 rounded-full">IA</span>}
              {player.id === gameState.hostId && <span className="ml-2 text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">Anfitrión</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="flex flex-col items-center w-full max-w-md space-y-3 md:space-y-4 pb-6">
            <button
              onClick={handleAddBotClick}
              disabled={gameState.players.length >= 6}
              className="w-full px-4 py-2 md:px-8 md:py-3 bg-blue-600 text-sm md:text-lg font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
            >
              Añadir Jugador IA
            </button>
            <button
              onClick={handleStartGameClick}
              disabled={!canStart}
              className="w-full px-4 py-2.5 md:px-8 md:py-4 bg-green-600 text-base md:text-xl font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
              title={!canStart ? "Se necesitan al menos 2 jugadores para empezar" : ""}
            >
              Empezar Partida
            </button>
        </div>
      )}
      {!isHost && (
          <p className="text-yellow-100 text-sm md:text-base pb-6">Esperando a que el anfitrión inicie la partida...</p>
      )}
    </div>
  );
};

export default OnlineLobby;
