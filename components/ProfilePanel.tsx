import React, { useState, useEffect } from 'react';
import { profileService } from '../services/profileService';
import { statsService } from '../services/statsService';
import { soundService } from '../services/soundService';
import { PlayerLevel } from '../types';

interface ProfilePanelProps {
  onClose: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [hasProfile, setHasProfile] = useState(profileService.hasProfile());

  const summary = profileService.getProfileSummary();
  const stats = statsService.loadStats();
  const allLevels = profileService.getAllLevels();

  useEffect(() => {
    setEditName(summary.name);
  }, [summary.name]);

  const handleCreateProfile = () => {
    const name = editName.trim();
    if (name) {
      profileService.createProfile(name);
      setHasProfile(true);
      setIsEditing(false);
      soundService.playCorrect();
    }
  };

  const handleSaveName = () => {
    const name = editName.trim();
    if (name) {
      profileService.updateName(name);
      setIsEditing(false);
      soundService.playClick();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (hasProfile) {
        handleSaveName();
      } else {
        handleCreateProfile();
      }
    }
  };

  const renderLevelBadge = (level: PlayerLevel & { unlocked: boolean }) => (
    <div
      key={level.level}
      className={`flex items-center gap-2 p-2 rounded-lg transition ${
        level.unlocked
          ? 'bg-gradient-to-r from-yellow-600/30 to-amber-600/30 border border-yellow-500/50'
          : 'bg-gray-700/30 opacity-50'
      }`}
    >
      <span className="text-xl">{level.icon}</span>
      <div className="flex-1">
        <p className={`font-semibold text-sm ${level.unlocked ? 'text-yellow-300' : 'text-gray-400'}`}>
          {level.title}
        </p>
        <p className="text-xs text-gray-500">Nivel {level.level}</p>
      </div>
      {level.unlocked && <span className="text-green-400">✓</span>}
    </div>
  );

  // Profile creation screen
  if (!hasProfile) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
            <span className="text-6xl mb-4 block">👤</span>
            <h2 className="text-2xl font-bold text-white">Crear Perfil</h2>
            <p className="text-purple-200 mt-2">Introduce tu nombre para comenzar</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tu nombre
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu nombre..."
                maxLength={20}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none transition"
                autoFocus
              />
            </div>

            <button
              onClick={handleCreateProfile}
              disabled={!editName.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition"
            >
              Crear Perfil
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-gray-400 hover:text-white transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Level */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl">
              {summary.level.icon}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={20}
                    className="bg-white/20 text-white px-3 py-1 rounded-lg border border-white/30 focus:outline-none flex-1"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded-lg text-white"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(summary.name);
                    }}
                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded-lg text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">{summary.name}</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-white/60 hover:text-white text-sm"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-purple-200">
                {summary.level.title} • Nivel {summary.level.level}
              </p>
            </div>
          </div>

          {/* Level Progress */}
          {summary.progress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-purple-200 mb-1">
                <span>Progreso al siguiente nivel</span>
                <span>{summary.progress.current} / {summary.progress.next} partidas</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${summary.progress.percentage}%` }}
                />
              </div>
            </div>
          )}
          {!summary.progress && (
            <div className="mt-4 text-center">
              <span className="text-yellow-300 font-semibold">🏆 ¡Nivel máximo alcanzado!</span>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="p-4 bg-gray-900/50 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{stats.gamesWon}</p>
            <p className="text-xs text-gray-400">Victorias</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.gamesPlayed}</p>
            <p className="text-xs text-gray-400">Partidas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {statsService.getAccuracy(stats).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-400">Precisión</p>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-white mb-3">🏅 Niveles</h3>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {allLevels.map(renderLevelBadge)}
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Miembro desde:</span>
            <span className="text-white">{summary.memberSince}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Última partida:</span>
            <span className="text-white">{summary.lastPlayed}</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
