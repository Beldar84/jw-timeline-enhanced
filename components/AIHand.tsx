
import React from 'react';
import { Player } from '../types';
import Card from './Card';

interface AIHandProps {
  player: Player;
  showTitle?: boolean;
  isOpponent?: boolean;
}

const AIHand: React.FC<AIHandProps> = ({ player, showTitle = true, isOpponent = false }) => {
  const title = `Mano de ${player.name} (${player.hand.length} cartas)`;
  // Para oponentes online, cartas más pequeñas
  const cardSizeClass = isOpponent
    ? '!w-[60px] !h-[88px] md:!w-[80px] md:!h-[117px] landscape:!w-[50px] landscape:!h-[73px]'
    : '';

  // Si es oponente en modo online, mostrar grupo compacto de cartas con número
  if (isOpponent) {
    // Mostrar el número real de cartas que tiene (1, 2 o 3 como máximo visualmente)
    const cardsToShow = Math.min(player.hand.length, 3);

    return (
      <div className="relative inline-block">
        {showTitle && (
          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4 text-center text-yellow-200 landscape:text-sm landscape:mb-1 md:landscape:text-base md:landscape:mb-2">
            {title}
          </h3>
        )}
        <div className="relative inline-block pt-4">
          {/* Badge con número de cartas - ARRIBA de las cartas */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black font-bold rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-lg shadow-lg border-2 border-yellow-300 landscape:w-6 landscape:h-6 landscape:text-xs z-50">
            {player.hand.length}
          </div>
          {/* Grupo de cartas apiladas */}
          <div className="flex items-center">
            {/* Mostrar el número real de cartas (1, 2 o 3) */}
            {[...Array(cardsToShow)].map((_, index) => (
              <div
                key={`card-stack-${index}`}
                style={{
                  marginLeft: index === 0 ? 0 : '-50px',
                  transform: `rotate(${(index - 1) * 3}deg)`,
                  zIndex: 10 + index
                }}
                className="landscape:ml-0 landscape:-ml-[40px]"
              >
                <Card
                  isFaceDown={true}
                  className={cardSizeClass}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista normal para IA local
  return (
    <div>
      {showTitle && (
        <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4 text-center text-yellow-200 landscape:text-sm landscape:mb-1 md:landscape:text-base md:landscape:mb-2">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto pb-2 landscape:pb-1">
        <div className="flex justify-start items-center space-x-1 md:space-x-2 p-1 md:p-2 rounded-lg min-w-max landscape:space-x-0.5 landscape:p-0.5">
          {player.hand.map((_, index) => (
            <Card
              key={`ai-card-${index}`}
              isFaceDown={true}
              className={cardSizeClass}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIHand;
