import React from 'react';
import { Player } from '../types';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — GameOver premium (diseño 2d) · handoff/GameOver.tsx
// Sustituye components/GameOver.tsx. Misma API + botón opcional
// de volver al menú (prop onBackToMenu, opcional).
// ============================================================

interface GameOverProps {
  winner: Player;
  /** Revancha: online envía invitación a una sala nueva; local/IA repite la configuración. */
  onRestart: () => void;
  message?: string | null;
  onBackToMenu?: () => void;
  /** Etiqueta del botón principal (p. ej. «Solicitar revancha» en online). */
  restartLabel?: string;
  /** Estado del botón principal mientras se crea la sala de revancha. */
  restartBusy?: boolean;
}

const GoldRule: React.FC = () => (
  <div className="flex items-center gap-3.5" aria-hidden="true">
    <div style={{ width: 70, height: 1, background: 'linear-gradient(to right, transparent, #c9a227)' }}></div>
    <div style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: '#c9a227' }}></div>
    <div style={{ width: 70, height: 1, background: 'linear-gradient(to left, transparent, #c9a227)' }}></div>
  </div>
);

const GameOver: React.FC<GameOverProps> = ({ winner, onRestart, message, onBackToMenu, restartLabel, restartBusy }) => {
  const handleRestartClick = () => {
    soundService.playClick();
    onRestart();
  };
  const handleBackClick = () => {
    soundService.playClick();
    if (onBackToMenu) onBackToMenu();
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12">
      <div className="mb-6"><GoldRule /></div>
      <h2 className="font-display font-bold text-4xl md:text-6xl mb-3 tracking-wider"
        style={{ color: '#f2e8d5', textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>
        Fin del juego
      </h2>
      <p className="font-body text-xl md:text-2xl mb-1.5" style={{ color: '#e5c96a' }}>
        Felicidades, <span className="font-semibold">{winner.name}</span>
      </p>
      <p className="font-body italic text-base md:text-lg mb-10 max-w-md" style={{ color: '#c9b891' }}>
        {message || 'Has colocado correctamente todas tus cartas en la línea del tiempo'}
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <button onClick={handleRestartClick} disabled={restartBusy}
          className="btn-gold px-10 py-4 text-base disabled:opacity-60 disabled:cursor-wait">
          {restartBusy ? 'CREANDO SALA…' : (restartLabel || 'JUGAR DE NUEVO')}
        </button>
        {onBackToMenu && (
          <button onClick={handleBackClick} className="btn-outline-gold px-8 py-4 text-base">
            VOLVER AL INICIO
          </button>
        )}
      </div>
      <div className="mt-8"><GoldRule /></div>
    </div>
  );
};

export default GameOver;
