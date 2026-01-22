import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';
import { AI_DIFFICULTIES, AIDifficulty } from '../types';

// Nombres bíblicos para los bots de IA
const BIBLICAL_NAMES = [
  'David', 'Abigail', 'Ruth', 'Pablo', 'Sara', 'Abraham', 'Moisés', 'María',
  'José', 'Rebeca', 'Isaac', 'Raquel', 'Jacob', 'Lea', 'Samuel', 'Ana',
  'Daniel', 'Ester', 'Elías', 'Eliseo', 'Noé', 'Jonás', 'Pedro', 'Juan'
];

function getRandomBiblicalName(): string {
  return BIBLICAL_NAMES[Math.floor(Math.random() * BIBLICAL_NAMES.length)];
}

interface AISetupProps {
  onStartGame: (playerNames: string[], difficulty: AIDifficulty, isStudyMode: boolean) => void;
  onBack: () => void;
}

const AISetup: React.FC<AISetupProps> = ({ onStartGame, onBack }) => {
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [isStudyMode, setIsStudyMode] = useState(false);

  // Load saved player name from profile
  useEffect(() => {
    const savedName = profileService.getName();
    if (savedName && savedName !== 'Jugador') {
      setPlayerName(savedName);
    } else {
      setPlayerName('Humano');
    }
  }, []);

  const handleStart = () => {
    soundService.playClick();
    const trimmedPlayerName = playerName.trim();
    if (trimmedPlayerName) {
      // Update profile with the name
      if (profileService.hasProfile()) {
        profileService.updateName(trimmedPlayerName);
      } else {
        profileService.createProfile(trimmedPlayerName);
      }
      profileService.updateLastPlayed();
      const aiName = getRandomBiblicalName();
      onStartGame([trimmedPlayerName, aiName], difficulty, isStudyMode);
    }
  };

  const handleDifficultySelect = (d: AIDifficulty) => {
    soundService.playClick();
    setDifficulty(d);
  };

  const handleStudyModeToggle = () => {
    soundService.playClick();
    setIsStudyMode(!isStudyMode);
  };

  const selectedDifficulty = AI_DIFFICULTIES.find(d => d.id === difficulty)!;

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm w-full max-w-md">
      <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-6">Jugar contra la IA</h2>

      {/* Player Name Input */}
      <div className="w-full space-y-4 mb-6">
        <p className="text-center text-yellow-100">Introduce tu nombre para empezar.</p>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none transition"
          placeholder="Tu nombre"
          maxLength={20}
        />
      </div>

      {/* AI Difficulty Selection */}
      <div className="w-full mb-6">
        <h3 className="text-lg font-bold text-yellow-200 mb-3 flex items-center gap-2">
          🤖 Dificultad de la IA
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {AI_DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => handleDifficultySelect(d.id)}
              className={`p-3 rounded-lg border-2 transition transform hover:scale-105 ${
                difficulty === d.id
                  ? 'border-yellow-400 bg-yellow-600/30'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl">{d.icon}</span>
                <span className={`font-bold ${difficulty === d.id ? 'text-yellow-300' : 'text-white'}`}>
                  {d.name}
                </span>
              </div>
              <p className="text-xs text-gray-400">{d.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Study Mode Toggle */}
      <div className="w-full mb-6">
        <div
          onClick={handleStudyModeToggle}
          className={`p-4 rounded-lg border-2 cursor-pointer transition ${
            isStudyMode
              ? 'border-green-400 bg-green-600/20'
              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <h4 className={`font-bold ${isStudyMode ? 'text-green-300' : 'text-white'}`}>
                  Modo Estudio
                </h4>
                <p className="text-xs text-gray-400">
                  Ve las fechas antes de colocar. Sin penalización por errores.
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-7 rounded-full transition-colors relative ${
                isStudyMode ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  isStudyMode ? 'left-6' : 'left-1'
                }`}
              />
            </div>
          </div>
        </div>
        {isStudyMode && (
          <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-200 flex items-start gap-2">
              <span>💡</span>
              <span>
                En modo estudio, verás la fecha de tu carta antes de colocarla y no perderás puntos por errores.
                Ideal para aprender la cronología bíblica.
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 w-full">
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
          disabled={!playerName.trim()}
          className="flex-[2] px-6 py-3 md:px-8 md:py-4 bg-green-600 text-lg md:text-xl font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105"
        >
          {isStudyMode ? '📚 Empezar' : '🎮 Empezar'}
        </button>
      </div>

      {/* Summary */}
      <div className="mt-4 text-center text-sm text-gray-400">
        <p>
          Dificultad: <span className="text-yellow-300">{selectedDifficulty.icon} {selectedDifficulty.name}</span>
          {isStudyMode && <span className="text-green-300"> • Modo Estudio</span>}
        </p>
      </div>
    </div>
  );
};

export default AISetup;
