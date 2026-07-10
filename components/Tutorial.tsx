import React, { useState } from 'react';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — Tutorial premium (diseño 4d)
// Sustituye components/Tutorial.tsx. Misma API (onComplete,
// onSkip) y mismos 9 pasos; presentación en pergamino con
// iconos de línea, barra de progreso fina y consejo en cita.
// Requiere public/premium.css.
// ============================================================

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
}

const stroke = '#8a6a2a';
const I = {
  book: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c-2-1.5-4.5-2-8-2v16c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V3c-3.5 0-6 .5-8 2z" /><line x1="12" y1="5" x2="12" y2="21" /></svg>,
  target: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>,
  cards: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="11" height="15" rx="1.5" transform="rotate(-8 8 13)" /><rect x="10" y="4" width="11" height="15" rx="1.5" transform="rotate(7 16 11)" /></svg>,
  check: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>,
  cross: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>,
  hourglass: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h10M7 21h10M8 3c0 4 3 5.5 4 6.5 1-1 4-2.5 4-6.5M8 21c0-4 3-5.5 4-6.5 1 1 4 2.5 4 6.5" /></svg>,
  books: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"><line x1="5" y1="4" x2="5" y2="20" /><line x1="10" y1="4" x2="10" y2="20" /><path d="M13 5l5 1-3.5 14-5-1L13 5z" /></svg>,
  globe: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><line x1="3" y1="12" x2="21" y2="12" /></svg>,
  diamond: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 7-7 11L5 10l7-7z" /><path d="M5 10h14" /></svg>,
};

const Tutorial: React.FC<TutorialProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    { title: '¡Bienvenido a JW Timeline!', description: 'JW Timeline es un juego educativo donde debes ordenar eventos bíblicos cronológicamente. Aprende mientras te diviertes.', icon: I.book, tip: 'Este tutorial te enseñará las reglas básicas en menos de 2 minutos.' },
    { title: 'Objetivo del juego', description: 'Tu objetivo es colocar correctamente todas tus cartas en la línea de tiempo antes que tus oponentes.', icon: I.target, tip: 'El primer jugador en quedarse sin cartas gana la partida.' },
    { title: 'Tu turno', description: 'En tu turno, elige una carta de tu mano y colócala en el lugar correcto de la línea de tiempo. Las cartas muestran eventos bíblicos con su fecha.', icon: I.cards, tip: 'Piensa bien antes de colocar la carta, ¡solo tienes una oportunidad!' },
    { title: 'Colocación correcta', description: 'Si colocas la carta en el lugar correcto de la línea de tiempo, ¡perfecto! La carta se añade a la línea y continúa el siguiente jugador.', icon: I.check, tip: 'Una colocación correcta te acerca a la victoria.' },
    { title: 'Colocación incorrecta', description: 'Si te equivocas, tu carta va a la pila de descarte y debes robar una nueva carta del mazo. Luego pasa el turno al siguiente jugador.', icon: I.cross, tip: 'No te desanimes, ¡aprende de tus errores!' },
    { title: 'La línea de tiempo', description: 'La línea de tiempo muestra los eventos en orden cronológico. Coloca tu carta entre dos eventos existentes o al inicio/final según corresponda.', icon: I.hourglass, tip: 'Observa las fechas de los eventos adyacentes para decidir dónde colocar tu carta.' },
    { title: 'Mazo Biblia Completa', description: 'Todas las partidas usan actualmente el mazo Biblia Completa, con eventos desde la creación hasta los apóstoles.', icon: I.books, tip: 'Los mazos temáticos podrán volver a habilitarse más adelante.' },
    { title: 'Modos de juego', description: 'Juega en modo local con amigos, contra la IA, o en línea con jugadores de todo el mundo.', icon: I.globe, tip: 'La IA es un buen rival para practicar antes de jugar con otros.' },
    { title: '¡Listo para jugar!', description: 'Ya conoces las reglas básicas. Recuerda: observa las fechas, piensa bien y sobre todo… ¡diviértete aprendiendo!', icon: I.diamond, tip: 'Tus estadísticas y logros se guardarán automáticamente.' },
  ];

  const handleNext = () => {
    soundService.playClick();
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else handleComplete();
  };

  const handlePrev = () => {
    soundService.playClick();
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => {
    soundService.playClick();
    localStorage.setItem('jw_timeline_tutorial_completed', 'true');
    onSkip();
  };

  const handleComplete = () => {
    soundService.playClick();
    localStorage.setItem('jw_timeline_tutorial_completed', 'true');
    onComplete();
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(10,7,3,.92)' }}>
      <div className="parchment-panel w-full max-w-xl px-8 md:px-10 pt-7 pb-8 text-center">

        {/* Progreso */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="font-display text-[11px] tracking-widest whitespace-nowrap" style={{ color: '#a08a5c' }}>
            PASO {currentStep + 1} DE {steps.length}
          </span>
          <div className="flex-1" style={{ height: 3, background: 'rgba(120,94,48,.2)' }}>
            <div style={{ height: 3, width: `${progress}%`, background: '#8a6a2a', transition: 'width .3s' }}></div>
          </div>
          <span onClick={handleSkip}
            className="font-body italic text-[13px] cursor-pointer whitespace-nowrap"
            style={{ color: '#a08a5c', borderBottom: '1px solid rgba(138,106,42,.35)' }}>
            Saltar
          </span>
        </div>

        {/* Icono */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ border: '1.5px solid #a8853c', background: 'rgba(201,162,39,.12)' }}>
          {step.icon}
        </div>

        <h2 className="font-display font-bold text-2xl tracking-wide m-0 mb-3" style={{ color: 'var(--ink)' }}>{step.title}</h2>
        <p className="font-body text-lg leading-relaxed m-0 mb-5" style={{ color: '#5c4a28' }}>{step.description}</p>

        {step.tip && (
          <p className="font-body italic text-left m-0 mb-7 px-4 py-3 text-[15.5px]"
            style={{ borderLeft: '2px solid #a8853c', background: 'rgba(201,162,39,.1)', color: 'var(--gold-dark)' }}>
            {step.tip}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={handlePrev} disabled={currentStep === 0}
            className="flex-1 py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
            ← ANTERIOR
          </button>
          <button onClick={handleNext} className="btn-gold flex-1 py-3 text-[13px]">
            {isLast ? '¡A JUGAR!' : 'SIGUIENTE →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
