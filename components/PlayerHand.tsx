import React, { useRef, useEffect } from 'react';
import { Player, Card as CardType } from '../types';
import Card from './Card';

// ============================================================
// JW Timeline — PlayerHand premium (diseño 2b) · handoff/PlayerHand.tsx
// Sustituye components/PlayerHand.tsx. Misma API de props.
// Mano en abanico: rotaciones -7°/-2.5°/2.5°/7°, solape -8px,
// hover eleva la carta. Título en EB Garamond itálica.
// ============================================================

interface PlayerHandProps {
  player: Player;
  onSelectCard: (card: CardType, element: HTMLDivElement) => void;
  placementMode?: boolean;
  disabled?: boolean;
  hidingCardId?: number | null;
  isStudyMode?: boolean;
}

// Rotación del abanico según posición relativa al centro
const fanTransform = (i: number, n: number, lifted: boolean) => {
  const center = (n - 1) / 2;
  const offset = n > 1 ? (i - center) / center : 0; // -1..1
  const rot = offset * 7; // máx ±7°
  const y = lifted ? -16 : Math.abs(offset) * 14; // extremos más bajos
  return `rotate(${rot}deg) translateY(${y}px)`;
};

const PlayerHand: React.FC<PlayerHandProps> = ({
  player, onSelectCard, placementMode = false, disabled = false, hidingCardId, isStudyMode = false,
}) => {
  const cardRefs = useRef(new Map<number, React.RefObject<HTMLDivElement>>());
  const hovered = useRef<number | null>(null);
  const [, force] = React.useReducer(x => x + 1, 0);

  // Precalienta imágenes de la mano (el SW las cachea)
  useEffect(() => {
    player.hand.forEach(card => {
      const img = new Image();
      img.src = card.imageUrl;
    });
  }, [player.hand]);

  player.hand.forEach(card => {
    if (!cardRefs.current.has(card.id)) {
      cardRefs.current.set(card.id, React.createRef<HTMLDivElement>());
    }
  });

  const titleText = placementMode
    ? 'Elige una carta para colocar'
    : `Tu mano · ${player.hand.length} ${player.hand.length === 1 ? 'carta' : 'cartas'}`;
  const title = disabled ? 'Esperando tu turno…' : titleText;

  const n = player.hand.length;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-2 landscape:mb-1">
        <h3 className="font-body italic text-center text-base md:text-lg" style={{ color: placementMode && !disabled ? 'var(--gold-bright)' : '#c9b891' }}>
          {title}
        </h3>
        {isStudyMode && (
          <span className="font-display text-[10px] tracking-widest px-2 py-0.5 rounded-sm"
            style={{ color: 'var(--gold-dark)', border: '1px solid rgba(168,133,60,.5)', background: 'rgba(201,162,39,.12)' }}>
            FECHAS VISIBLES
          </span>
        )}
      </div>
      <div className="overflow-x-auto pb-2" style={disabled ? { opacity: 0.7 } : {}}>
        <div className="flex justify-center items-end min-w-max px-6 pt-4">
          {n > 0 ? (
            player.hand.map((card, i) => {
              const cardRef = cardRefs.current.get(card.id)!;
              const lifted = hovered.current === card.id;
              return (
                <div
                  key={card.id}
                  style={{
                    margin: '0 -8px',
                    transform: fanTransform(i, n, lifted),
                    transition: 'transform .2s',
                    zIndex: lifted ? 10 : i + 1,
                  }}
                  onMouseEnter={() => { hovered.current = card.id; force(); }}
                  onMouseLeave={() => { hovered.current = null; force(); }}
                >
                  <Card
                    ref={cardRef}
                    card={card}
                    showYear={false}
                    isStudyMode={isStudyMode}
                    onClick={() => {
                      if (cardRef.current) onSelectCard(card, cardRef.current);
                    }}
                    isHidden={hidingCardId === card.id}
                  />
                </div>
              );
            })
          ) : (
            <p className="font-body italic px-4" style={{ color: '#a89870' }}>¡No quedan cartas!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerHand;
