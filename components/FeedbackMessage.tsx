
import React from 'react';

interface FeedbackMessageProps {
  type: 'correct' | 'incorrect';
}

const FeedbackMessage: React.FC<FeedbackMessageProps> = ({ type }) => {
  const isCorrect = type === 'correct';
  const bgColor = isCorrect ? 'bg-green-600/90' : 'bg-red-600/90';
  const text = isCorrect ? 'Correcto' : 'Incorrecto';

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 pointer-events-none">
      <div 
        className={`p-6 md:p-8 rounded-xl shadow-2xl text-white text-center transform scale-100 transition-transform duration-300 ${bgColor}`}
        role="alert"
      >
        <p className="text-4xl md:text-5xl font-bold" style={{fontFamily: "'Trajan Pro', serif"}}>{text}</p>
      </div>
    </div>
  );
};

export default FeedbackMessage;