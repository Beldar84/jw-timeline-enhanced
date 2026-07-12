import React, { createRef, useEffect, useRef, useState, forwardRef } from 'react';
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
  dragTargetIndex?: number | null;
  /** Hay una carta arrastrándose: todas las ranuras se resaltan como destino */
  dragActive?: boolean;
  highlightedCardId?: number | null;
  disabled?: boolean;
}

interface PlacementSlotProps {
  id: string;
  onClick: () => void;
  isSelected: boolean;
  isDragTarget?: boolean;
  isDragReady?: boolean;
  edgeLabel?: 'Antes' | 'Después';
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

const PlacementSlot = forwardRef<HTMLButtonElement, PlacementSlotProps>(({ id, onClick, isSelected, isDragTarget = false, isDragReady = false, edgeLabel, disabled }, ref) => (
  <div className="relative flex flex-shrink-0 items-center justify-center">
    {edgeLabel && <span className="timeline-edge-label">{edgeLabel}</span>}
    <button
      type="button"
      id={id}
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`slot-circle ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drag-target' : ''} ${isDragReady ? 'drag-ready' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      aria-label={isSelected ? 'Ranura de colocación seleccionada' : `Colocar ${edgeLabel ? `más ${edgeLabel.toLowerCase()}` : 'aquí'}`}
      aria-pressed={isSelected}
    >
      <PlusIcon selected={isSelected} />
    </button>
  </div>
));

const Timeline: React.FC<TimelineProps> = ({
  cards, onSelectSlot, selectedSlotIndex, dragTargetIndex = null,
  dragActive = false, highlightedCardId = null, disabled = false,
}) => {
  const slotRefs = useRef<React.RefObject<HTMLButtonElement>[]>([]);
  const cardRefs = useRef(new Map<number, React.RefObject<HTMLDivElement>>());
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

  cards.forEach(card => {
    if (!cardRefs.current.has(card.id)) cardRefs.current.set(card.id, createRef<HTMLDivElement>());
  });

  useEffect(() => {
    if (highlightedCardId === null) return;
    const cardElement = cardRefs.current.get(highlightedCardId)?.current;
    const scrollContainer = cardElement?.closest<HTMLElement>('.timeline-scroll');
    if (!cardElement || !scrollContainer) return;

    const cardRect = cardElement.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetLeft = scrollContainer.scrollLeft
      + cardRect.left - containerRect.left
      - (containerRect.width - cardRect.width) / 2;
    scrollContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [highlightedCardId, cards.length]);

  return (
    <div className="relative min-w-max pt-16 pb-2 md:py-10">
      {/* Eje temporal dorado detrás de cartas y ranuras. El min-w-max del
          contenedor hace que el eje absoluto (left:0; right:0) abarque todo
          el ancho desplazable y no solo el primer viewport. */}
      <div className="gold-axis" aria-hidden="true"></div>

      <div className="relative flex items-center min-w-max px-4 gap-4 md:gap-7">
        <PlacementSlot
          id="timeline-slot-0"
          ref={slotRefs.current[0]}
          onClick={() => handleSelect(0)}
          isSelected={selectedSlotIndex === 0}
          isDragTarget={dragTargetIndex === 0}
          isDragReady={dragActive}
          edgeLabel="Antes"
          disabled={disabled}
        />

        {cards.map((card, index) => (
          <React.Fragment key={card.id}>
            <div className="relative flex flex-col items-center gap-2 md:gap-3 flex-shrink-0">
              <div
                ref={cardRefs.current.get(card.id)}
                className={`timeline-card-shell ${expandedCardId === card.id ? 'timeline-card-expanded' : ''} ${highlightedCardId === card.id ? 'timeline-card-highlighted' : ''}`}
              >
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
              isDragTarget={dragTargetIndex === index + 1}
              isDragReady={dragActive}
              edgeLabel={index === cards.length - 1 ? 'Después' : undefined}
              disabled={disabled}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Timeline;
