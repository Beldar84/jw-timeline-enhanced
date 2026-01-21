
import React, { createRef, useRef, forwardRef } from 'react';
import { Card as CardType } from '../types';
import Card from './Card';
import { PlusCircleIcon } from './icons';

interface TimelineProps {
  cards: CardType[];
  onSelectSlot: (timelineIndex: number, element: HTMLDivElement) => void;
  selectedSlotIndex: number | null;
  onCardClick: (card: CardType) => void;
  disabled?: boolean;
}

interface PlacementSlotProps {
    id: string;
    onClick: () => void;
    isSelected: boolean;
    disabled?: boolean;
}

const PlacementSlot = forwardRef<HTMLDivElement, PlacementSlotProps>(({ id, onClick, isSelected, disabled }, ref) => {
    // Updated dimensions to match Card.tsx
    // Base: w-16, h-[219px]
    // Landscape: h-[176px]
    // Desktop: w-24, h-[380px]
    const baseStyle = 'group w-16 h-[219px] landscape:h-[176px] md:w-24 md:h-[380px] flex-shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 transition-all duration-300';
    const selectedStyle = isSelected ? 'bg-yellow-400/30 border-yellow-400 scale-105' : 'bg-gray-700/50';
    const hoverStyle = !disabled ? 'hover:bg-yellow-400/20 hover:border-yellow-400 cursor-pointer' : 'cursor-not-allowed';
    
    return (
        <div 
            id={id}
            ref={ref}
            onClick={!disabled ? onClick : undefined}
            className={`${baseStyle} ${selectedStyle} ${hoverStyle}`}
            aria-label={isSelected ? "Ranura de colocación seleccionada" : "Seleccionar esta ranura para colocar una carta"}
            aria-disabled={disabled}
        >
           <PlusCircleIcon className={`w-8 h-8 md:w-12 md:h-12 transition-colors ${isSelected ? 'text-yellow-400' : 'text-gray-500'} ${!disabled ? 'group-hover:text-yellow-400' : ''}`} />
        </div>
    );
});


const Timeline: React.FC<TimelineProps> = ({ cards, onSelectSlot, selectedSlotIndex, onCardClick, disabled = false }) => {
  const slotRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  slotRefs.current = [...Array(cards.length + 1)].map(
    (_, i) => slotRefs.current[i] ?? createRef<HTMLDivElement>()
  );

  const handleSelect = (index: number) => {
    if (slotRefs.current[index]?.current) {
      onSelectSlot(index, slotRefs.current[index].current!);
    }
  };

  return (
    <div className="flex items-center min-w-max px-4 space-x-2 md:space-x-4">
      <PlacementSlot
        id="timeline-slot-0" 
        ref={slotRefs.current[0]}
        onClick={() => handleSelect(0)} 
        isSelected={selectedSlotIndex === 0}
        disabled={disabled}
      />
      
      {cards.map((card, index) => (
        <React.Fragment key={card.id}>
            <Card 
                card={card} 
                showYear={true} 
                onClick={() => onCardClick(card)}
            />
            <PlacementSlot 
                id={`timeline-slot-${index + 1}`}
                ref={slotRefs.current[index + 1]}
                onClick={() => handleSelect(index + 1)}
                isSelected={selectedSlotIndex === index + 1}
                disabled={disabled}
            />
        </React.Fragment>
      ))}
    </div>
  );
};

export default Timeline;
