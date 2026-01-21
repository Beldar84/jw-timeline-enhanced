
import React, { useState } from 'react';
import RulesModal from './RulesModal';
import { soundService } from '../services/soundService';

interface MainMenuProps {
  onSelectMode: (mode: 'local' | 'ai' | 'online') => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode }) => {
  const [showRules, setShowRules] = useState(false);

  const handleModeSelect = (mode: 'local' | 'ai' | 'online') => {
    soundService.playClick();
    onSelectMode(mode);
  };

  const handleShowRules = () => {
    soundService.playClick();
    setShowRules(true);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm">
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => handleModeSelect('local')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 transition transform hover:scale-105"
          >
            Jugar en local
          </button>
          <button
            onClick={() => handleModeSelect('ai')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-blue-600 text-lg md:text-xl font-bold rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
          >
            Jugar contra IA
          </button>
          <button
            onClick={() => handleModeSelect('online')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-purple-600 text-lg md:text-xl font-bold rounded-lg hover:bg-purple-700 transition transform hover:scale-105"
          >
            Jugar online
          </button>
        </div>
        <div className="w-full max-w-sm mt-8">
            <button
              onClick={handleShowRules}
              className="w-full px-6 py-2 bg-yellow-700 text-base font-bold rounded-lg hover:bg-yellow-800 transition"
            >
              Reglas
            </button>
        </div>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
};

export default MainMenu;
