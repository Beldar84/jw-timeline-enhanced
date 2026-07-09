import React from 'react';

// ============================================================
// JW Timeline — FeedbackMessage premium
// Aviso «Correcto / Incorrecto» con estética dorada sobre la
// mesa oscura. Misma API de props que el original.
// ============================================================

interface FeedbackMessageProps {
  type: 'correct' | 'incorrect';
}

const FeedbackMessage: React.FC<FeedbackMessageProps> = ({ type }) => {
  const isCorrect = type === 'correct';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50 transition-opacity duration-300 pointer-events-none"
      style={{ background: 'rgba(10,7,3,.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="px-10 py-6 md:px-14 md:py-8 rounded-sm text-center"
        role="alert"
        style={{
          border: `1px solid ${isCorrect ? 'rgba(201,162,39,.6)' : 'rgba(192,96,77,.6)'}`,
          background: 'rgba(10,7,3,.72)',
          boxShadow: '0 18px 50px rgba(0,0,0,.5)',
        }}
      >
        <p
          className="font-display font-bold text-3xl md:text-5xl tracking-wider m-0"
          style={{
            color: isCorrect ? '#e5c96a' : '#e08a7a',
            textShadow: isCorrect ? '0 2px 18px rgba(201,162,39,.35)' : '0 2px 18px rgba(192,96,77,.3)',
          }}
        >
          {isCorrect ? 'Correcto' : 'Incorrecto'}
        </p>
      </div>
    </div>
  );
};

export default FeedbackMessage;
