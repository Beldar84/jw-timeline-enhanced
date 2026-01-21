import React, { useState } from 'react';
import { soundService } from '../services/soundService';

interface AISetupProps {
  onStartGame: (playerNames: string[]) => void;
}

const AISetup: React.FC<AISetupProps> = ({ onStartGame }) => {
  const [playerName, setPlayerName] = useState('Humano');

  const handleStart = () => {
    soundService.playClick();
    const trimmedPlayerName = playerName.trim();
    if (trimmedPlayerName) {
      onStartGame([trimmedPlayerName, 'IA 1']);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm">
      <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-6">Jugar contra la IA</h2>
      <div className="w-full max-w-md space-y-4 mb-6">
        <p className="text-center text-yellow-100">Introduce tu nombre para empezar.</p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none transition"
            placeholder="Tu nombre"
          />
        </div>
      </div>
      <button
        onClick={handleStart}
        disabled={!playerName.trim()}
        className="w-full max-w-md px-6 py-3 md:px-8 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105"
      >
        Empezar Partida
      </button>
    </div>
  );
};

export default AISetup;
