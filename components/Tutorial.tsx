import React, { useState } from 'react';
import { soundService } from '../services/soundService';

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

type TutorialVisual = 'objective' | 'timeline' | 'modes' | 'victory';

interface TutorialStep {
  title: string;
  description: string;
  tip: string;
  image?: string;
  imageAlt?: string;
  visual?: TutorialVisual;
}

const PLACEMENT_TUTORIAL_IMAGE = '/images/tutorial/como-colocar-carta.jpg';
const RESULT_TUTORIAL_IMAGE = '/images/tutorial/resultados-colocacion.jpg';

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: 'Ordena la historia bíblica',
    description: 'Coloca los acontecimientos de tu mano en el lugar cronológico correcto de la línea de tiempo.',
    tip: 'El primer jugador que se queda sin cartas gana la partida.',
    visual: 'objective',
  },
  {
    title: 'Dos formas de colocar una carta',
    description: 'Puedes tocar un + y después elegir una carta, o arrastrar directamente la carta de tu mano hasta el + que quieras.',
    tip: 'Cuando arrastres, el hueco elegido se iluminará. Suelta la carta sobre él para jugarla.',
    image: PLACEMENT_TUTORIAL_IMAGE,
    imageAlt: 'Una carta de la mano se arrastra hasta una ranura de la línea de tiempo',
  },
  {
    title: 'Busca el hueco correcto',
    description: 'Cada + representa una posición posible: antes del primer evento, entre dos eventos o después del último.',
    tip: 'Las cartas de la izquierda son más antiguas y las de la derecha, más recientes.',
    visual: 'timeline',
  },
  {
    title: 'Acierto o error',
    description: 'Si aciertas, la carta se queda en la línea. Si fallas, va al descarte y recibes una carta nueva del mazo.',
    tip: 'Después de resolver la jugada, el turno pasa al siguiente jugador.',
    image: RESULT_TUTORIAL_IMAGE,
    imageAlt: 'Comparación visual entre una colocación correcta y una incorrecta',
  },
  {
    title: 'Elige cómo jugar',
    description: 'Puedes jugar en local, practicar contra la IA, competir online o estudiar con las fechas visibles.',
    tip: 'Todas las partidas usan actualmente el mazo Biblia Completa.',
    visual: 'modes',
  },
  {
    title: 'Vacía tu mano para ganar',
    description: 'Piensa cada posición, aprende de los errores y consigue colocar todas tus cartas antes que los demás.',
    tip: 'Ya lo tienes todo preparado. ¡A jugar!',
    visual: 'victory',
  },
];

const DrawnVisual: React.FC<{ type: TutorialVisual }> = ({ type }) => {
  if (type === 'modes') {
    return (
      <div className="tutorial-drawing grid grid-cols-3 gap-2 items-stretch">
        {[
          ['2–6', 'LOCAL'],
          ['IA', 'PRÁCTICA'],
          ['●', 'ONLINE'],
        ].map(([symbol, label]) => (
          <div key={label} className="tutorial-mode-card">
            <strong>{symbol}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'victory') {
    return (
      <div className="tutorial-drawing flex flex-col items-center justify-center gap-5">
        <div className="flex items-end justify-center gap-1.5" aria-hidden="true">
          {[4, 3, 2, 1].map((number, index) => (
            <React.Fragment key={number}>
              <span className="tutorial-count-card">{number}</span>
              {index < 3 && <span className="tutorial-arrow">→</span>}
            </React.Fragment>
          ))}
          <span className="tutorial-arrow">→</span>
          <span className="tutorial-zero-card">0</span>
        </div>
        <div className="tutorial-victory-seal" aria-label="Victoria">✓</div>
      </div>
    );
  }

  if (type === 'timeline') {
    return (
      <div className="tutorial-drawing flex flex-col items-center justify-center gap-5">
        <div className="tutorial-axis-demo" aria-hidden="true">
          <span className="tutorial-slot-demo">+</span>
          <span className="tutorial-event-demo">A</span>
          <span className="tutorial-slot-demo emphasized">+</span>
          <span className="tutorial-event-demo">B</span>
          <span className="tutorial-slot-demo">+</span>
        </div>
        <div className="flex justify-between w-full max-w-[320px] font-display text-[10px] tracking-[.18em]" style={{ color: '#8a6a2a' }}>
          <span>MÁS ANTIGUO</span>
          <span>MÁS RECIENTE</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-drawing flex items-center justify-center gap-4" aria-hidden="true">
      <div className="relative w-24 h-28">
        <span className="tutorial-hand-card -rotate-12 left-0">4</span>
        <span className="tutorial-hand-card rotate-0 left-7">3</span>
      </div>
      <span className="tutorial-arrow text-3xl">→</span>
      <div className="tutorial-axis-demo compact">
        <span className="tutorial-event-demo">A</span>
        <span className="tutorial-slot-demo emphasized">+</span>
        <span className="tutorial-event-demo">B</span>
      </div>
    </div>
  );
};

const Tutorial: React.FC<TutorialProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = TUTORIAL_STEPS;

  const handleNext = () => {
    soundService.playClick();
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else handleComplete();
  };

  const handlePrev = () => {
    soundService.playClick();
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const finish = (callback: () => void) => {
    localStorage.setItem('jw_timeline_tutorial_completed', 'true');
    callback();
  };

  const handleSkip = () => {
    soundService.playClick();
    finish(onSkip);
  };

  const handleComplete = () => {
    soundService.playClick();
    finish(onComplete);
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-3 md:p-5" style={{ background: 'rgba(10,7,3,.94)' }}>
      <div className="parchment-panel tutorial-panel w-full max-w-3xl max-h-[94vh] overflow-y-auto px-5 md:px-9 pt-5 md:pt-7 pb-6 md:pb-8">
        <div className="flex items-center gap-2.5 mb-4 md:mb-6">
          <span className="font-display text-[10px] md:text-[11px] tracking-widest whitespace-nowrap" style={{ color: '#a08a5c' }}>
            PASO {currentStep + 1} DE {steps.length}
          </span>
          <div className="flex-1" style={{ height: 3, background: 'rgba(120,94,48,.2)' }}>
            <div style={{ height: 3, width: `${progress}%`, background: '#8a6a2a', transition: 'width .3s' }} />
          </div>
          <button onClick={handleSkip} className="font-body italic text-[13px] cursor-pointer whitespace-nowrap bg-transparent border-0"
            style={{ color: '#a08a5c', borderBottom: '1px solid rgba(138,106,42,.35)' }}>
            Saltar
          </button>
        </div>

        <div className="grid md:grid-cols-[1.12fr_.88fr] gap-5 md:gap-8 items-center">
          <div className="tutorial-visual-frame">
            {step.image ? (
              <img src={step.image} alt={step.imageAlt || ''} loading="lazy" decoding="async" className="w-full h-full object-contain" />
            ) : step.visual ? (
              <DrawnVisual type={step.visual} />
            ) : null}
          </div>

          <div className="text-center md:text-left">
            <h2 className="font-display font-bold text-xl md:text-2xl tracking-wide m-0 mb-3" style={{ color: 'var(--ink)' }}>
              {step.title}
            </h2>
            <p className="font-body text-base md:text-lg leading-relaxed m-0 mb-4" style={{ color: '#5c4a28' }}>
              {step.description}
            </p>
            <p className="font-body italic text-left m-0 px-4 py-3 text-[14.5px] md:text-[15.5px]"
              style={{ borderLeft: '2px solid #a8853c', background: 'rgba(201,162,39,.1)', color: 'var(--gold-dark)' }}>
              {step.tip}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-5 md:mt-7">
          <button onClick={handlePrev} disabled={currentStep === 0}
            className="flex-1 py-3 font-display text-[12px] md:text-[13px] tracking-wider rounded-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
            ← ANTERIOR
          </button>
          <button onClick={handleNext} className="btn-gold flex-1 py-3 text-[12px] md:text-[13px]">
            {isLast ? '¡A JUGAR!' : 'SIGUIENTE →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
