
import React from 'react';
import { Player } from '../types';
import { soundService } from '../services/soundService';

interface GameOverProps {
  winner: Player;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, onRestart }) => {
  const handleRestartClick = () => {
    soundService.playClick();
    onRestart();
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-12 rounded-xl shadow-2xl backdrop-blur-sm text-center">
      <h2 className="text-3xl md:text-5xl font-bold text-yellow-300 mb-4" style={{fontFamily: "'Trajan Pro', serif"}}>¡Fin del Juego!</h2>
      <p className="text-xl md:text-3xl text-white mb-6">
        ¡Felicidades, <span className="font-bold text-yellow-400">{winner.name}</span>!
      </p>
      <p className="text-lg md:text-xl text-yellow-100 mb-8">¡Has colocado correctamente todas tus cartas y has ganado el juego!</p>
      <button
        onClick={handleRestartClick}
        className="px-8 py-3 md:px-10 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 transition transform hover:scale-105"
      >
        Jugar de Nuevo
      </button>
    </div>
  );
};

export default GameOver;
