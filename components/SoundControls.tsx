import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';

interface SoundControlsProps {
  onClose: () => void;
}

const SoundControls: React.FC<SoundControlsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState(soundService.getSettings());

  useEffect(() => {
    // Update settings when they change
    setSettings(soundService.getSettings());
  }, []);

  const handleSoundVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    soundService.setVolume(volume);
    setSettings({ ...settings, soundVolume: volume });
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    soundService.setMusicVolume(volume);
    setSettings({ ...settings, musicVolume: volume });
  };

  const handleToggleMute = () => {
    const muted = soundService.toggleMute();
    setSettings({ ...settings, isMuted: muted });
  };

  const handleToggleMusic = () => {
    soundService.toggleMusic();
    setSettings(soundService.getSettings());
  };

  const handleTestSound = () => {
    soundService.playClick();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🔊 Configuración de Sonido
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Master Mute Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{settings.isMuted ? '🔇' : '🔊'}</span>
              <div>
                <h3 className="font-semibold text-white">Sonido General</h3>
                <p className="text-sm text-gray-400">Silenciar todo el audio</p>
              </div>
            </div>
            <button
              onClick={handleToggleMute}
              className={`w-14 h-8 rounded-full transition-colors relative ${
                settings.isMuted ? 'bg-gray-600' : 'bg-green-500'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  settings.isMuted ? 'left-1' : 'left-7'
                }`}
              />
            </button>
          </div>

          {/* Sound Effects Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎵</span>
                <div>
                  <h3 className="font-semibold text-white">Efectos de Sonido</h3>
                  <p className="text-sm text-gray-400">Clicks, aciertos, errores</p>
                </div>
              </div>
              <span className="text-sm text-gray-400 font-mono">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={handleSoundVolumeChange}
                disabled={settings.isMuted}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:opacity-50"
              />
              <span className="text-gray-500">🔊</span>
              <button
                onClick={handleTestSound}
                disabled={settings.isMuted}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition"
              >
                Probar
              </button>
            </div>
          </div>

          {/* Background Music */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎶</span>
                <div>
                  <h3 className="font-semibold text-white">Música de Fondo</h3>
                  <p className="text-sm text-gray-400">Melodía ambiental suave</p>
                </div>
              </div>
              <button
                onClick={handleToggleMusic}
                disabled={settings.isMuted}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  settings.isMusicEnabled && !settings.isMuted
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                } disabled:opacity-50`}
              >
                {settings.isMusicEnabled ? '⏸ Pausar' : '▶ Activar'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={handleMusicVolumeChange}
                disabled={settings.isMuted || !settings.isMusicEnabled}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
              />
              <span className="text-gray-500">🔊</span>
              <span className="text-sm text-gray-400 font-mono w-12 text-right">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-sm text-blue-200">
                La configuración de sonido se guarda automáticamente y se mantendrá en futuras sesiones.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900/50 p-4">
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

export default SoundControls;
