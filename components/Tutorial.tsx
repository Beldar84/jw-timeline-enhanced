import React, { useState } from 'react';
import { soundService } from '../services/soundService';

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  image: string;
  tip?: string;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      title: '¡Bienvenido a JW Timeline!',
      description: 'JW Timeline es un juego educativo donde debes ordenar eventos bíblicos cronológicamente. Aprende mientras te diviertes.',
      image: '📖',
      tip: 'Este tutorial te enseñará las reglas básicas en menos de 2 minutos.',
    },
    {
      title: 'Objetivo del Juego',
      description: 'Tu objetivo es colocar correctamente todas tus cartas en la línea de tiempo antes que tus oponentes.',
      image: '🎯',
      tip: 'El primer jugador en quedarse sin cartas gana la partida.',
    },
    {
      title: 'Tu Turno',
      description: 'En tu turno, elige una carta de tu mano y colócala en el lugar correcto de la línea de tiempo. Las cartas muestran eventos bíblicos con su fecha.',
      image: '🃏',
      tip: 'Piensa bien antes de colocar la carta, ¡solo tienes una oportunidad!',
    },
    {
      title: 'Colocación Correcta',
      description: 'Si colocas la carta en el lugar correcto de la línea de tiempo, ¡perfecto! La carta se añade a la línea y continúa el siguiente jugador.',
      image: '✅',
      tip: 'Una colocación correcta te acerca a la victoria.',
    },
    {
      title: 'Colocación Incorrecta',
      description: 'Si te equivocas, tu carta va a la pila de descarte y debes robar una nueva carta del mazo. Luego pasa el turno al siguiente jugador.',
      image: '❌',
      tip: 'No te desanimes, ¡aprende de tus errores!',
    },
    {
      title: 'La Línea de Tiempo',
      description: 'La línea de tiempo muestra los eventos en orden cronológico. Coloca tu carta entre dos eventos existentes o al inicio/final según corresponda.',
      image: '⏳',
      tip: 'Observa las fechas de los eventos adyacentes para decidir dónde colocar tu carta.',
    },
    {
      title: 'Mazos Temáticos',
      description: 'Puedes elegir entre diferentes mazos: Biblia Completa, Antiguo Testamento, Nuevo Testamento, y mazos especializados como Reyes, Patriarcas o Vida de Jesús.',
      image: '📚',
      tip: 'Cada mazo tiene diferente dificultad. ¡Empieza con uno fácil!',
    },
    {
      title: 'Modos de Juego',
      description: 'Juega en modo local con amigos, contra la IA, o en línea con jugadores de todo el mundo.',
      image: '🎮',
      tip: 'La IA es un buen rival para practicar antes de jugar con otros.',
    },
    {
      title: '¡Listo para Jugar!',
      description: 'Ya conoces las reglas básicas. Recuerda: observa las fechas, piensa bien y sobre todo... ¡diviértete aprendiendo!',
      image: '🎉',
      tip: 'Tus estadísticas y logros se guardarán automáticamente.',
    },
  ];

  const handleNext = () => {
    soundService.playClick();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    soundService.playClick();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    soundService.playClick();
    // Mark tutorial as skipped in localStorage (so it doesn't show again)
    localStorage.setItem('jw_timeline_tutorial_completed', 'true');
    onSkip();
  };

  const handleComplete = () => {
    soundService.playClick();
    // Mark tutorial as completed in localStorage
    localStorage.setItem('jw_timeline_tutorial_completed', 'true');
    onComplete();
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 h-2">
          <div
            className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step Counter */}
          <div className="text-center mb-4">
            <span className="text-sm text-gray-400 font-bold">
              Paso {currentStep + 1} de {steps.length}
            </span>
          </div>

          {/* Image/Icon */}
          <div className="text-center mb-6">
            <div className="text-8xl mb-4 animate-bounce">{step.image}</div>
          </div>

          {/* Title */}
          <h2
            className="text-3xl font-bold text-center text-yellow-200 mb-4"
            style={{ fontFamily: "'Trajan Pro', serif" }}
          >
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-300 text-center mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Tip */}
          {step.tip && (
            <div className="bg-blue-600/20 border-2 border-blue-500 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="text-sm font-bold text-blue-300 mb-1">Consejo</h4>
                  <p className="text-sm text-gray-300">{step.tip}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {/* Skip/Previous Button */}
            <button
              onClick={currentStep === 0 ? handleSkip : handlePrev}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition transform hover:scale-105"
            >
              {currentStep === 0 ? 'Saltar Tutorial' : '← Anterior'}
            </button>

            {/* Next/Finish Button */}
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition transform hover:scale-105 shadow-lg"
            >
              {currentStep === steps.length - 1 ? '¡Empezar a Jugar! 🎮' : 'Siguiente →'}
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  soundService.playClick();
                  setCurrentStep(index);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-yellow-400 w-8'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-600'
                }`}
              ></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Check if tutorial should be shown
export const shouldShowTutorial = (): boolean => {
  return localStorage.getItem('jw_timeline_tutorial_completed') !== 'true';
};

export default Tutorial;
