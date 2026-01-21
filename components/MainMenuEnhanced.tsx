import React, { useState } from 'react';
import RulesModal from './RulesModal';
import { soundService } from '../services/soundService';

interface MainMenuEnhancedProps {
  onSelectMode: (mode: 'local' | 'ai' | 'online') => void;
  onShowStats: () => void;
  onShowTutorial: () => void;
}

const MainMenuEnhanced: React.FC<MainMenuEnhancedProps> = ({ onSelectMode, onShowStats, onShowTutorial }) => {
  const [showRules, setShowRules] = useState(false);

  const handleModeSelect = (mode: 'local' | 'ai' | 'online') => {
    soundService.playClick();
    onSelectMode(mode);
  };

  const handleShowRules = () => {
    soundService.playClick();
    setShowRules(true);
  };

  const handleShowStats = () => {
    soundService.playClick();
    onShowStats();
  };

  const handleShowTutorial = () => {
    soundService.playClick();
    onShowTutorial();
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm">
        {/* Main Game Modes */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => handleModeSelect('local')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 transition transform hover:scale-105 shadow-lg"
          >
            🎮 Jugar en local
          </button>
          <button
            onClick={() => handleModeSelect('ai')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-blue-600 text-lg md:text-xl font-bold rounded-lg hover:bg-blue-700 transition transform hover:scale-105 shadow-lg"
          >
            🤖 Jugar contra IA
          </button>
          <button
            onClick={() => handleModeSelect('online')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-purple-600 text-lg md:text-xl font-bold rounded-lg hover:bg-purple-700 transition transform hover:scale-105 shadow-lg"
          >
            🌐 Jugar online
          </button>
        </div>

        {/* Secondary Options - Two columns */}
        <div className="w-full max-w-sm mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleShowStats}
            className="px-4 py-3 bg-indigo-600 text-sm md:text-base font-bold rounded-lg hover:bg-indigo-700 transition transform hover:scale-105"
          >
            📊 Estadísticas
          </button>
          <button
            onClick={handleShowTutorial}
            className="px-4 py-3 bg-cyan-600 text-sm md:text-base font-bold rounded-lg hover:bg-cyan-700 transition transform hover:scale-105"
          >
            🎓 Tutorial
          </button>
        </div>

        {/* Rules Button */}
        <div className="w-full max-w-sm mt-4">
          <button
            onClick={handleShowRules}
            className="w-full px-6 py-2 bg-yellow-700 text-base font-bold rounded-lg hover:bg-yellow-800 transition"
          >
            📖 Reglas
          </button>
        </div>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
};

export default MainMenuEnhanced;
