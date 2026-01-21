
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
  const cardSizeClass = isOpponent ? 'landscape:!w-[70px] landscape:!h-[102px]' : '';
  
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
