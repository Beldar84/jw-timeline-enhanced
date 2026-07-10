import React, { useRef, useEffect } from 'react';
import { Player, Card as CardType } from '../types';
import Card from './Card';

// ============================================================
// JW Timeline — PlayerHand premium (diseño 2b) · handoff/PlayerHand.tsx
// Sustituye components/PlayerHand.tsx. Misma API de props.
// Mano en abanico siempre (también en móvil):
//  · Escritorio: hover eleva la carta; clic la selecciona.
//  · Móvil (≤767px): abanico compacto (±10°, solape -18px);
//    cada toque alterna la carta entre su tamaño normal y ampliado.
// Título en EB Garamond itálica.
// ============================================================

interface PlayerHandProps {
  player: Player;
  onSelectCard: (card: CardType, element: HTMLDivElement) => void;
  placementMode?: boolean;
  disabled?: boolean;
  hidingCardId?: number | null;
  isStudyMode?: boolean;
}

// Rotación del abanico según posición relativa al centro.
// En móvil el abanico es más compacto. La carta ampliada se
// endereza aquí y crece hacia abajo en su envoltorio interior.
const fanTransform = (i: number, n: number, lifted: boolean, isMobile: boolean, expanded: boolean) => {
  const center = (n - 1) / 2;
  const offset = n > 1 ? (i - center) / center : 0; // -1..1
  if (isMobile) {
    if (expanded) return 'translateY(0)';
    const rot = offset * 10; // máx ±10°
    return `rotate(${rot}deg) translateY(${Math.abs(offset) * 16}px)`;
  }
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
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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

  // Al cambiar la mano (carta jugada/robada), colapsa la ampliada
  useEffect(() => { setExpandedId(null); }, [player.hand.length]);

  // Al ampliar o cambiar de carta, conserva la mano al final de la página y
  // centra únicamente el carrusel horizontal. No se usa scrollIntoView porque
  // también movería el documento en vertical.
  useEffect(() => {
    if (!isMobile || expandedId === null) return;

    const keepCardVisible = () => {
      const scroller = scrollRef.current;
      const card = cardRefs.current.get(expandedId)?.current;
      if (scroller && card) {
        const scrollerRect = scroller.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const horizontalDelta = cardRect.left + cardRect.width / 2
          - (scrollerRect.left + scrollerRect.width / 2);
        scroller.scrollBy({ left: horizontalDelta, behavior: 'smooth' });
      }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    };

    const frame = requestAnimationFrame(keepCardVisible);
    const settleTimer = window.setTimeout(keepCardVisible, 230);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [expandedId, isMobile]);

  const titleText = placementMode
    ? 'Elige una carta para colocar'
    : `Tu mano · ${player.hand.length} ${player.hand.length === 1 ? 'carta' : 'cartas'}`;
  const title = disabled ? 'Esperando tu turno…' : titleText;

  const n = player.hand.length;

  return (
    <div
      className={`player-hand-wrap ${isMobile && expandedId !== null ? 'player-hand-expanded-space' : ''}`}
    >
      <div className="relative z-20 flex items-center justify-center gap-2 mb-2 landscape:mb-1">
        <h3 className="font-body italic text-center text-base md:text-lg"
          style={{
            color: placementMode && !disabled ? 'var(--gold-bright)' : '#c9b891',
            ...(isMobile && expandedId !== null
              ? { background: 'rgba(10,7,3,.78)', padding: '3px 14px', borderRadius: 999, border: '1px solid rgba(201,162,39,.35)' }
              : {}),
          }}>
          {title}
        </h3>
        {isStudyMode && (
          <span className="font-display text-[10px] tracking-widest px-2 py-0.5 rounded-sm"
            style={{ color: 'var(--gold-dark)', border: '1px solid rgba(168,133,60,.5)', background: 'rgba(201,162,39,.12)' }}>
            FECHAS VISIBLES
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="player-hand-scroll pb-2"
        style={disabled ? { opacity: 0.7 } : undefined}
        role="region"
        aria-label="Cartas de tu mano"
      >
        <div className={`player-hand-row flex items-end ${isMobile ? 'w-max min-w-max justify-start px-10 pt-5' : 'justify-center min-w-max px-6 pt-4'}`}>
          {n > 0 ? (
            player.hand.map((card, i) => {
              const cardRef = cardRefs.current.get(card.id)!;
              const lifted = hovered.current === card.id;
              const expanded = isMobile && expandedId === card.id;
              return (
                <div
                  key={card.id}
                  style={{
                    margin: isMobile ? '0 -18px' : '0 -8px',
                    transform: fanTransform(i, n, lifted, isMobile, expanded),
                    transformOrigin: 'bottom center',
                    transition: 'transform .2s',
                    zIndex: expanded || lifted ? 10 : i + 1,
                    borderRadius: 4,
                  }}
                  onMouseEnter={() => { hovered.current = card.id; force(); }}
                  onMouseLeave={() => { hovered.current = null; force(); }}
                >
                  <div className={`hand-card-zoom-shell ${expanded ? 'hand-card-zoom-expanded' : ''}`}>
                    <Card
                      ref={cardRef}
                      card={card}
                      className={expanded ? 'card-expanded-ring' : ''}
                      showYear={false}
                      isStudyMode={isStudyMode}
                      onClick={() => {
                        if (isMobile) {
                          // Tras elegir una posición del eje, la carta se coloca
                          // directamente para conservar el flujo de la partida.
                          if (placementMode && !disabled && cardRef.current) {
                            onSelectCard(card, cardRef.current);
                            setExpandedId(null);
                            return;
                          }

                          setExpandedId(currentId => currentId === card.id ? null : card.id);
                          return;
                        }

                        if (cardRef.current) onSelectCard(card, cardRef.current);
                      }}
                      isHidden={hidingCardId === card.id}
                    />
                  </div>
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
