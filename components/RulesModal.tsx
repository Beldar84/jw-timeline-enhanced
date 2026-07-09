import React from 'react';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — RulesModal premium (diseño 4f) · handoff/RulesModal.tsx
// Sustituye components/RulesModal.tsx. Misma API de props.
// ============================================================

interface RulesModalProps {
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const handleClose = () => {
    soundService.playClick();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10,7,3,.9)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
    >
      <div
        className="parchment-panel w-full max-w-lg px-8 md:px-10 py-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rules-title" className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1.5" style={{ color: 'var(--ink)' }}>
          Reglas del juego
        </h2>
        <div className="flex items-center gap-3 mx-auto mb-6" style={{ width: 200 }} aria-hidden="true">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #a8853c)' }}></div>
          <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: '#a8853c' }}></div>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #a8853c)' }}></div>
        </div>

        <h3 className="font-display font-semibold text-[15px] tracking-wider m-0 mb-2.5" style={{ color: '#5c4a28' }}>CÓMO SE JUEGA</h3>
        <ol className="font-body m-0 mb-5 pl-6 flex flex-col gap-2.5 text-[16.5px] leading-normal" style={{ color: 'var(--ink)' }}>
          <li>En su turno, cada jugador elige una de sus cartas y decide dónde colocarla en la línea temporal (pulsando en el "+" antes o después de las cartas ya jugadas).</li>
          <li>Si la carta está correctamente colocada en la línea de tiempo, se queda en ella.</li>
          <li>Si está mal colocada, se descarta y el jugador roba una nueva carta del mazo.</li>
        </ol>

        <h3 className="font-display font-semibold text-[15px] tracking-wider m-0 mb-2.5" style={{ color: '#5c4a28' }}>FIN DEL JUEGO</h3>
        <p className="font-body m-0 mb-4 text-[16.5px] leading-normal" style={{ color: 'var(--ink)' }}>
          El juego termina cuando un jugador coloca correctamente su última carta. Ese jugador es el ganador.
        </p>

        <p className="font-body italic m-0 mb-6 px-4 py-2.5 text-[14.5px]"
          style={{ borderLeft: '2px solid #a8853c', background: 'rgba(201,162,39,.1)', color: 'var(--gold-dark)' }}>
          Durante la partida, en la parte superior se muestra el número de cartas restantes de cada jugador.
        </p>

        <button onClick={handleClose} className="btn-gold w-full py-3.5 text-sm">
          ENTENDIDO
        </button>
      </div>
    </div>
  );
};

export default RulesModal;
