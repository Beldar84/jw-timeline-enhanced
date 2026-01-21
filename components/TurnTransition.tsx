import React from 'react';
import { soundService } from '../services/soundService';

interface TurnTransitionProps {
  playerName: string;
  onContinue: () => void;
}

const TurnTransition: React.FC<TurnTransitionProps> = ({ playerName, onContinue }) => {
  const handleContinueClick = () => {
    soundService.playClick();
    onContinue();
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-12 rounded-xl shadow-2xl backdrop-blur-sm text-center" style={{ minHeight: '60vh' }}>
      <p className="text-xl md:text-3xl text-white mb-8">
        Pasa el dispositivo a <span className="font-bold text-yellow-400">{playerName}</span>.
      </p>
      <h2 className="text-3xl md:text-5xl font-bold text-yellow-300 mb-10" style={{fontFamily: "'Trajan Pro', serif"}}>
        Es tu turno
      </h2>
      <button
        onClick={handleContinueClick}
        className="px-8 py-3 md:px-10 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 transition transform hover:scale-105"
      >
        Aceptar
      </button>
    </div>
  );
};

export default TurnTransition;
