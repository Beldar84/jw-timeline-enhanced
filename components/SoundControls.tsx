import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — SoundControls premium (diseño 4e)
// Sustituye components/SoundControls.tsx. Misma API y lógica;
// interruptor y deslizadores en estilo pergamino/dorado.
// Requiere public/premium.css. Los <input type="range"> usan
// accent-color dorado (soporte nativo moderno).
// ============================================================

interface SoundControlsProps {
  onClose: () => void;
}

const Row: React.FC<{ title: string; subtitle: string; right?: React.ReactNode; children?: React.ReactNode; last?: boolean }> =
  ({ title, subtitle, right, children, last }) => (
    <div className="py-4" style={{ borderBottom: last ? 'none' : '1px solid rgba(120,94,48,.2)' }}>
      <div className="flex items-baseline justify-between mb-2.5">
        <div>
          <p className="font-display font-semibold text-[15px] m-0" style={{ color: 'var(--ink)' }}>{title}</p>
          <p className="font-body italic text-[13.5px] m-0 mt-px" style={{ color: '#a08a5c' }}>{subtitle}</p>
        </div>
        {right}
      </div>
      {children}
    </div>
  );

const SoundControls: React.FC<SoundControlsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState(soundService.getSettings());
  const [isLoadingMusic, setIsLoadingMusic] = useState(false);

  useEffect(() => {
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

  const handleToggleMusic = async () => {
    if (!settings.isMusicEnabled) {
      setIsLoadingMusic(true);
      try {
        await soundService.startMusic();
      } finally {
        setIsLoadingMusic(false);
      }
    } else {
      soundService.stopMusic();
    }
    setSettings(soundService.getSettings());
  };

  const handleTestSound = () => soundService.playClick();

  const sliderStyle: React.CSSProperties = { accentColor: '#b08d1e', flex: 1, cursor: 'pointer' };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10,7,3,.9)' }} onClick={onClose}>
      <div className="parchment-panel w-full max-w-md px-8 md:px-9 py-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-display font-bold text-[22px] tracking-wide m-0" style={{ color: 'var(--ink)' }}>Sonido</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full cursor-pointer text-[17px] leading-none transition-colors hover:bg-[rgba(201,162,39,.15)]"
            style={{ background: 'none', border: '1px solid rgba(120,94,48,.35)', color: '#5c4a28' }}>×</button>
        </div>

        {/* Sonido general (interruptor) */}
        <Row title="Sonido general" subtitle="Silenciar todo el audio"
          right={
            <button onClick={handleToggleMute} aria-pressed={!settings.isMuted}
              className="relative rounded-full cursor-pointer transition-colors"
              style={{
                width: 52, height: 28,
                background: settings.isMuted ? 'rgba(120,94,48,.2)' : 'rgba(201,162,39,.25)',
                border: `1px solid ${settings.isMuted ? 'rgba(120,94,48,.4)' : '#a8853c'}`,
              }}>
              <span className="absolute rounded-full transition-all"
                style={{
                  top: 2, left: settings.isMuted ? 2 : 26, width: 22, height: 22,
                  background: settings.isMuted ? '#a08a5c' : 'linear-gradient(180deg, #d4af37, #b08d1e)',
                  boxShadow: '0 2px 6px rgba(0,0,0,.3)',
                }} />
            </button>
          }
        />

        {/* Efectos */}
        <Row title="Efectos de sonido" subtitle="Clics, aciertos, errores"
          right={<span className="font-display font-bold text-sm" style={{ color: '#5c4a28' }}>{Math.round(settings.soundVolume * 100)}%</span>}>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="1" step="0.05" value={settings.soundVolume}
              onChange={handleSoundVolumeChange} disabled={settings.isMuted} style={sliderStyle} />
            <button onClick={handleTestSound} disabled={settings.isMuted}
              className="font-display text-[11px] tracking-wider px-3.5 py-1.5 rounded-sm cursor-pointer disabled:opacity-50 transition-colors hover:bg-[rgba(201,162,39,.12)]"
              style={{ background: 'none', border: '1px solid rgba(120,94,48,.35)', color: '#5c4a28' }}>
              PROBAR
            </button>
          </div>
        </Row>

        {/* Música */}
        <Row title="Música de fondo" subtitle="Melodía ambiental suave" last
          right={
            <button onClick={handleToggleMusic} disabled={settings.isMuted || isLoadingMusic}
              className="font-display text-[11px] font-semibold tracking-wider px-3.5 py-1.5 rounded-sm cursor-pointer disabled:opacity-50"
              style={settings.isMusicEnabled && !settings.isMuted
                ? { background: 'rgba(201,162,39,.14)', border: '1px solid #a8853c', color: '#5c4a28' }
                : { background: 'none', border: '1px solid rgba(120,94,48,.35)', color: '#a08a5c' }}>
              {isLoadingMusic ? 'CARGANDO…' : settings.isMusicEnabled ? '⏸ PAUSAR' : '▶ ACTIVAR'}
            </button>
          }>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="1" step="0.05" value={settings.musicVolume}
              onChange={handleMusicVolumeChange} disabled={settings.isMuted || !settings.isMusicEnabled} style={sliderStyle} />
            <span className="font-display font-bold text-sm w-10 text-right" style={{ color: '#5c4a28' }}>
              {Math.round(settings.musicVolume * 100)}%
            </span>
          </div>
        </Row>

        <p className="font-body italic m-0 mt-2 mb-5 px-4 py-2.5 text-sm"
          style={{ borderLeft: '2px solid #a8853c', background: 'rgba(201,162,39,.1)', color: 'var(--gold-dark)' }}>
          La configuración se guarda automáticamente para futuras sesiones.
        </p>

        <button onClick={onClose} className="btn-gold w-full py-3.5 text-sm">CERRAR</button>
      </div>
    </div>
  );
};

export default SoundControls;
