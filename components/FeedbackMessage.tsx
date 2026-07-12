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
    <div className="fixed inset-0 flex items-center justify-center z-[100] transition-opacity duration-300 pointer-events-none px-4">
      <div
        className="px-8 py-3 md:px-12 md:py-4 rounded-sm text-center"
        role="alert"
        style={{
          border: `1px solid ${isCorrect ? 'rgba(201,162,39,.6)' : 'rgba(192,96,77,.6)'}`,
          background: 'rgba(10,7,3,.9)',
          boxShadow: '0 18px 50px rgba(0,0,0,.5)',
        }}
      >
        <p
          className="font-display font-bold text-2xl md:text-4xl tracking-wider m-0"
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
