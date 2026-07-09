import React from 'react';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — TurnTransition premium
// Pantalla «Pasa el dispositivo a…» con estética dorada sobre
// la mesa oscura. Misma API de props que el original.
// ============================================================

interface TurnTransitionProps {
  playerName: string;
  onContinue: () => void;
}

const GoldRule: React.FC = () => (
  <div className="flex items-center justify-center gap-3.5" aria-hidden="true">
    <div style={{ width: 70, height: 1, background: 'linear-gradient(to right, transparent, #c9a227)' }}></div>
    <div style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: '#c9a227' }}></div>
    <div style={{ width: 70, height: 1, background: 'linear-gradient(to left, transparent, #c9a227)' }}></div>
  </div>
);

const TurnTransition: React.FC<TurnTransitionProps> = ({ playerName, onContinue }) => {
  const handleContinueClick = () => {
    soundService.playClick();
    onContinue();
  };

  return (
    <div
      className="flex flex-col items-center justify-center text-center rounded-sm px-8 py-12 md:px-16"
      style={{
        minHeight: '60vh',
        border: '1px solid rgba(201,162,39,.35)',
        background: 'rgba(0,0,0,.35)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <p className="font-body italic text-lg md:text-2xl m-0 mb-6" style={{ color: '#c9b891' }}>
        Pasa el dispositivo a{' '}
        <span className="font-display not-italic font-semibold tracking-wide" style={{ color: '#e5c96a' }}>
          {playerName}
        </span>
      </p>
      <h2
        className="font-display font-bold text-3xl md:text-5xl tracking-wider m-0 mb-5"
        style={{ color: '#e5c96a', textShadow: '0 2px 18px rgba(201,162,39,.35)' }}
      >
        Es tu turno
      </h2>
      <GoldRule />
      <button onClick={handleContinueClick} className="btn-gold px-10 py-3 text-sm mt-9">
        ACEPTAR
      </button>
    </div>
  );
};

export default TurnTransition;
