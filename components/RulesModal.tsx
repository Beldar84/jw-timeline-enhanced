
import React from 'react';
import { soundService } from '../services/soundService';

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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" 
      onClick={handleClose} 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="rules-title"
    >
      <div 
        className="bg-gray-900/90 p-6 md:p-8 rounded-xl shadow-2xl text-yellow-50 w-full max-w-lg mx-4 border-2 border-yellow-300/30"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rules-title" className="text-2xl md:text-3xl font-bold text-yellow-300 mb-6 text-center" style={{fontFamily: "'Trajan Pro', serif"}}>
          Reglas del Juego
        </h2>
        
        <div className="space-y-6 text-base md:text-lg">
          <div>
            <h3 className="font-bold text-yellow-200 text-xl mb-2">Cómo se juega</h3>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>En su turno, cada jugador elige una de sus cartas y decide dónde colocarla en la línea temporal (pulsando en el "+" antes o después de las cartas ya jugadas).</li>
              <li>Si la carta está correctamente colocada en la línea de tiempo, se queda en ella.</li>
              <li>Si está mal colocada, se descarta y el jugador roba una nueva carta del mazo.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-yellow-200 text-xl mb-2">Fin del juego</h3>
            <p>El juego termina cuando un jugador coloca correctamente su última carta. Ese jugador es el ganador.</p>
          </div>
          
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Dentro de la partida, en la parte superior se muestra el número de cartas restantes de cada jugador.</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleClose}
            className="px-8 py-3 bg-green-600 text-lg font-bold rounded-lg hover:bg-green-700 transition transform hover:scale-105"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
