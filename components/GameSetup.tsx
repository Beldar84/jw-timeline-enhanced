
import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';

interface GameSetupProps {
  onStartGame: (playerNames: string[]) => void;
  onBack: () => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, onBack }) => {
  const [players, setPlayers] = useState(['Jugador 1', 'Jugador 2']);

  // Cargar el nombre del perfil para el jugador 1
  useEffect(() => {
    const savedName = profileService.getName();
    if (savedName && savedName !== 'Jugador') {
      setPlayers(prev => [savedName, ...prev.slice(1)]);
    }
  }, []);

  const handleAddPlayer = () => {
    soundService.playClick();
    if (players.length < 6) {
      setPlayers([...players, `Jugador ${players.length + 1}`]);
    }
  };

  const handleRemovePlayer = (index: number) => {
    soundService.playClick();
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };
  
  const handleStart = () => {
    soundService.playClick();
    const validPlayers = players.filter(p => p.trim() !== '');
    if (validPlayers.length >= 2) {
      onStartGame(validPlayers);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-4 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm">
      <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-6">Configurar Partida</h2>
      <div className="w-full max-w-md space-y-4 mb-6">
        {players.map((player, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              value={player}
              onChange={(e) => handlePlayerNameChange(index, e.target.value)}
              className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none transition"
              placeholder={`Jugador ${index + 1}`}
            />
            <button
              onClick={() => handleRemovePlayer(index)}
              disabled={players.length <= 2}
              className="p-3 bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
            >
              &ndash;
            </button>
          </div>
        ))}
      </div>
      <div className="flex space-x-4 mb-8">
        <button
          onClick={handleAddPlayer}
          disabled={players.length >= 6}
          className="px-4 py-2 md:px-6 md:py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
        >
          Añadir Jugador
        </button>
      </div>
      <div className="flex gap-3 w-full max-w-md">
        <button
          onClick={() => {
            soundService.playClick();
            onBack();
          }}
          className="flex-1 px-4 py-3 md:px-6 md:py-4 bg-gray-600 text-lg font-bold rounded-lg hover:bg-gray-700 transition"
        >
          Volver
        </button>
        <button
          onClick={handleStart}
          disabled={players.filter(p => p.trim() !== '').length < 2}
          className="flex-[2] px-6 py-3 md:px-8 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105"
        >
          Empezar Partida
        </button>
      </div>
    </div>
  );
};

export default GameSetup;
