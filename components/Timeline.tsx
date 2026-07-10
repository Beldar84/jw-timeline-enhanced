import React, { createRef, useRef, useState, forwardRef } from 'react';
import { Card as CardType } from '../types';
import Card, { formatYearPremium } from './Card';

// ============================================================
// JW Timeline — Timeline premium (diseño 2b) · handoff/Timeline.tsx
// Sustituye components/Timeline.tsx. Misma API de props.
// Eje dorado horizontal + ranuras circulares (medallones "+")
// + chip de fecha dorado bajo cada carta.
// Requiere public/premium.css (.gold-axis, .slot-circle, .year-chip).
// ============================================================

interface TimelineProps {
  cards: CardType[];
  onSelectSlot: (timelineIndex: number, element: HTMLButtonElement) => void;
  selectedSlotIndex: number | null;
  disabled?: boolean;
}

interface PlacementSlotProps {
  id: string;
  onClick: () => void;
  isSelected: boolean;
  disabled?: boolean;
}

const PlusIcon: React.FC<{ selected: boolean }> = ({ selected }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke={selected ? '#f2e8d5' : 'currentColor'} strokeWidth={selected ? 2 : 1.8} strokeLinecap="round"
    aria-hidden="true" focusable="false">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PlacementSlot = forwardRef<HTMLButtonElement, PlacementSlotProps>(({ id, onClick, isSelected, disabled }, ref) => (
  <button
    type="button"
    id={id}
    ref={ref}
    onClick={onClick}
    disabled={disabled}
    className={`slot-circle ${isSelected ? 'selected' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    aria-label={isSelected ? 'Ranura de colocación seleccionada' : 'Seleccionar esta ranura para colocar una carta'}
    aria-pressed={isSelected}
  >
    <PlusIcon selected={isSelected} />
  </button>
));

const Timeline: React.FC<TimelineProps> = ({ cards, onSelectSlot, selectedSlotIndex, disabled = false }) => {
  const slotRefs = useRef<React.RefObject<HTMLButtonElement>[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  slotRefs.current = [...Array(cards.length + 1)].map(
    (_, i) => slotRefs.current[i] ?? createRef<HTMLButtonElement>()
  );

  const handleSelect = (index: number) => {
    setExpandedCardId(null);
    if (slotRefs.current[index]?.current) {
      onSelectSlot(index, slotRefs.current[index].current!);
    }
  };

  return (
    <div className="relative pt-16 pb-2 md:py-10">
      {/* Eje temporal dorado detrás de cartas y ranuras */}
      <div className="gold-axis" aria-hidden="true"></div>

      <div className="relative flex items-center min-w-max px-4 gap-4 md:gap-7">
        <PlacementSlot
          id="timeline-slot-0"
          ref={slotRefs.current[0]}
          onClick={() => handleSelect(0)}
          isSelected={selectedSlotIndex === 0}
          disabled={disabled}
        />

        {cards.map((card, index) => (
          <React.Fragment key={card.id}>
            <div className="relative flex flex-col items-center gap-2 md:gap-3 flex-shrink-0">
              <div className={`timeline-card-shell ${expandedCardId === card.id ? 'timeline-card-expanded' : ''}`}>
                <Card
                  card={card}
                  showYear={false}
                  onClick={() => setExpandedCardId(currentId => currentId === card.id ? null : card.id)}
                  className={`card-responsive ${expandedCardId === card.id ? 'card-expanded-ring' : ''}`}
                />
              </div>
              <span className="year-chip text-sm md:text-base">{formatYearPremium(card.year)}</span>
            </div>
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
    </div>
  );
};

export default Timeline;
