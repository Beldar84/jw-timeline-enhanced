import React, { useRef, useEffect } from 'react';
import { Player, Card as CardType } from '../types';
import Card from './Card';

interface PlayerHandProps {
  player: Player;
  onSelectCard: (card: CardType, element: HTMLDivElement) => void;
  placementMode?: boolean;
  disabled?: boolean;
  hidingCardId?: number | null;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ player, onSelectCard, placementMode = false, disabled = false, hidingCardId }) => {
  const cardRefs = useRef(new Map<number, React.RefObject<HTMLDivElement>>());

  player.hand.forEach(card => {
    if (!cardRefs.current.has(card.id)) {
      cardRefs.current.set(card.id, React.createRef<HTMLDivElement>());
    }
  });

  const titleText = placementMode 
    ? "Elige una carta para colocar" 
    : `Tu mano (${player.hand.length} cartas)`;
  
  const title = disabled ? "Esperando tu turno..." : titleText;
  
  const containerClasses = `flex justify-start items-center space-x-2 md:space-x-4 p-2 landscape:space-x-1 landscape:p-1 rounded-lg transition-all duration-300 min-w-max ${placementMode && !disabled ? 'bg-yellow-400/20' : ''}`;

  // Permitir scroll y zoom incluso cuando disabled (las cartas manejan el onClick)
  const handContainerStyle = disabled ? { opacity: 0.7 } : {};

  return (
    <div>
      <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4 text-center text-yellow-200 landscape:text-sm landscape:mb-1 md:landscape:text-base md:landscape:mb-2">
        {title}
      </h3>
      <div style={handContainerStyle} className="overflow-x-auto pb-4 landscape:pb-2 md:pb-2">
        <div className={containerClasses}>
          {player.hand.length > 0 ? (
            player.hand.map((card) => {
              const cardRef = cardRefs.current.get(card.id)!;
              return (
                <Card
                  ref={cardRef}
                  key={card.id}
                  card={card}
                  showYear={false}
                  onClick={() => {
                    if (cardRef.current) {
                      onSelectCard(card, cardRef.current);
                    }
                  }}
                  isHidden={hidingCardId === card.id}
                />
              );
            })
          ) : (
            <p className="text-gray-400 px-4">¡No quedan cartas!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerHand;
