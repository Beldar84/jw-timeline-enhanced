import React, { useState, useEffect } from 'react';
import RulesModal from './RulesModal';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';
import { firebaseService } from '../services/firebaseService';

interface MainMenuEnhancedProps {
  onSelectMode: (mode: 'local' | 'ai' | 'online' | 'study') => void;
  onShowStats: () => void;
  onShowTutorial: () => void;
  onShowProfile: () => void;
  onShowLeaderboard: () => void;
  onShowSoundSettings: () => void;
  onShowAuth: () => void;
  onShowFriends: () => void;
  onShowTurnBasedGames?: () => void;
}

const MainMenuEnhanced: React.FC<MainMenuEnhancedProps> = ({
  onSelectMode,
  onShowStats,
  onShowTutorial,
  onShowProfile,
  onShowLeaderboard,
  onShowSoundSettings,
  onShowAuth,
  onShowFriends,
  onShowTurnBasedGames,
}) => {
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(soundService.isMuted());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingTurnGames, setPendingTurnGames] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get player info for display
  const profile = profileService.getProfileSummary();

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChange(async (user) => {
      setIsLoggedIn(user !== null && !user.isAnonymous);
      setUserEmail(user?.email || null);

      // Check pending turn-based games
      if (user && !user.isAnonymous) {
        const games = await firebaseService.getTurnBasedGames();
        const myTurnCount = games.filter(g => g.currentTurnPlayerId === user.uid).length;
        setPendingTurnGames(myTurnCount);

        // Check notification permission
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleModeSelect = (mode: 'local' | 'ai' | 'online' | 'study') => {
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

  const handleShowProfile = () => {
    soundService.playClick();
    onShowProfile();
  };

  const handleShowLeaderboard = () => {
    soundService.playClick();
    onShowLeaderboard();
  };

  const handleShowSoundSettings = () => {
    soundService.playClick();
    onShowSoundSettings();
  };

  const handleAuthClick = () => {
    soundService.playClick();
    onShowAuth();
  };

  const handleFriendsClick = () => {
    soundService.playClick();
    onShowFriends();
  };

  const handleSignOut = async () => {
    soundService.playClick();
    await firebaseService.signOutUser();
  };

  const handleTurnBasedGamesClick = () => {
    soundService.playClick();
    if (onShowTurnBasedGames) {
      onShowTurnBasedGames();
    }
  };

  const handleEnableNotifications = async () => {
    soundService.playClick();
    const token = await firebaseService.requestNotificationPermission();
    if (token) {
      await firebaseService.saveNotificationToken(token);
      setNotificationsEnabled(true);
    }
  };

  const handleQuickMute = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundService.playClick();
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center bg-gray-800/50 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm relative">
        {/* Auth Status Bar */}
        <div className="w-full max-w-sm mb-3">
          {isLoggedIn ? (
            <div className="flex items-center justify-between p-2 bg-green-600/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-sm text-green-300 truncate max-w-[180px]">{userEmail}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleFriendsClick}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                >
                  👥
                </button>
                {onShowTurnBasedGames && (
                  <button
                    onClick={handleTurnBasedGamesClick}
                    className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition relative"
                  >
                    🕐
                    {pendingTurnGames > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendingTurnGames}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAuthClick}
              className="w-full p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition flex items-center justify-center gap-2"
            >
              <span className="text-blue-400">🔐</span>
              <span className="text-sm text-blue-300">Iniciar sesión / Registrarse</span>
            </button>
          )}
        </div>

        {/* Player Info Bar */}
        <div
          onClick={handleShowProfile}
          className="w-full max-w-sm mb-4 p-3 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-lg border border-indigo-500/30 cursor-pointer hover:border-indigo-400/50 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{profile.level.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-white">{profile.name}</p>
              <p className="text-xs text-indigo-300">{profile.level.title} • Nivel {profile.level.level}</p>
            </div>
            <span className="text-gray-400 text-sm">✏️</span>
          </div>
        </div>

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
          <button
            onClick={() => handleModeSelect('study')}
            className="w-full px-6 py-3 md:px-8 md:py-4 bg-emerald-600 text-lg md:text-xl font-bold rounded-lg hover:bg-emerald-700 transition transform hover:scale-105 shadow-lg"
          >
            📚 Modo Estudio
          </button>
        </div>

        {/* Secondary Options - Grid */}
        <div className="w-full max-w-sm mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleShowStats}
            className="px-4 py-3 bg-indigo-600 text-sm md:text-base font-bold rounded-lg hover:bg-indigo-700 transition transform hover:scale-105"
          >
            📊 Estadísticas
          </button>
          <button
            onClick={handleShowLeaderboard}
            className="px-4 py-3 bg-amber-600 text-sm md:text-base font-bold rounded-lg hover:bg-amber-700 transition transform hover:scale-105"
          >
            🏆 Clasificación
          </button>
          <button
            onClick={handleShowTutorial}
            className="px-4 py-3 bg-cyan-600 text-sm md:text-base font-bold rounded-lg hover:bg-cyan-700 transition transform hover:scale-105"
          >
            🎓 Tutorial
          </button>
          <button
            onClick={handleShowSoundSettings}
            className="px-4 py-3 bg-pink-600 text-sm md:text-base font-bold rounded-lg hover:bg-pink-700 transition transform hover:scale-105"
          >
            🔊 Sonido
          </button>
        </div>

        {/* Notifications - only show if logged in and not enabled */}
        {isLoggedIn && !notificationsEnabled && 'Notification' in window && (
          <div className="w-full max-w-sm mt-4">
            <button
              onClick={handleEnableNotifications}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 border border-purple-500/30 text-sm font-semibold rounded-lg hover:from-purple-600/70 hover:to-blue-600/70 transition flex items-center justify-center gap-2"
            >
              <span>🔔</span>
              <span>Activar notificaciones</span>
            </button>
          </div>
        )}

        {/* Rules Button */}
        <div className="w-full max-w-sm mt-4">
          <button
            onClick={handleShowRules}
            className="w-full px-6 py-2 bg-yellow-700 text-base font-bold rounded-lg hover:bg-yellow-800 transition"
          >
            📖 Reglas
          </button>
        </div>

        {/* Quick Mute Button - Bottom corner */}
        <button
          onClick={handleQuickMute}
          className={`absolute -bottom-12 right-0 p-3 rounded-full transition-all ${
            isMuted
              ? 'bg-red-600/80 hover:bg-red-700'
              : 'bg-gray-700/80 hover:bg-gray-600'
          }`}
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          <span className="text-xl">{isMuted ? '🔇' : '🔊'}</span>
        </button>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
};

export default MainMenuEnhanced;
