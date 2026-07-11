import React, { useRef, useEffect } from 'react';
import { Player, Card as CardType } from '../types';
import Card from './Card';

// ============================================================
// JW Timeline — PlayerHand premium (diseño 2b) · handoff/PlayerHand.tsx
// Sustituye components/PlayerHand.tsx. Misma API de props.
// Mano en abanico siempre (también en móvil):
//  · Escritorio: hover eleva la carta; clic la selecciona.
//  · Móvil (≤767px): abanico abierto (±10°, solape dinámico);
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
const fanTransform = (
  i: number,
  n: number,
  lifted: boolean,
  isMobile: boolean,
  expanded: boolean,
  expandedIndex: number,
  mobileHorizontalShift: number,
) => {
  const center = (n - 1) / 2;
  const offset = n > 1 ? (i - center) / center : 0; // -1..1
  if (isMobile) {
    // Solo se desplaza la carta activa hacia el centro; el resto del abanico
    // permanece inmóvil mientras se navega mediante gestos laterales.
    if (expanded) {
      return `translateX(${mobileHorizontalShift}px) translateY(0)`;
    }
    const rot = offset * 10; // máx ±10°
    return `translateX(${mobileHorizontalShift}px) rotate(${rot}deg) translateY(${Math.abs(offset) * 16}px)`;
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = React.useState(0);
  const swipeStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => setWrapW(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (suppressClickTimer.current !== null) window.clearTimeout(suppressClickTimer.current);
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

  // Al ampliar o cambiar de carta, conserva la mano al final de la página.
  useEffect(() => {
    if (!isMobile || expandedId === null) return;

    const keepCardVisible = () => {
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
  const expandedIndex = player.hand.findIndex(card => card.id === expandedId);

  // Solape dinámico: todas las cartas permanecen fijas dentro de la pantalla.
  // El gesto lateral cambia únicamente cuál se desplaza y amplía al frente.
  const cardWidth = isMobile && window.matchMedia('(orientation: landscape)').matches ? 120 : 140;
  let mobileOverlap = 18;
  if (isMobile && n > 1 && wrapW > 0) {
    // Reservamos solo 8 px por lado: así las cuatro cartas ocupan casi todo el
    // ancho disponible y cada una conserva una franja amplia para tocarla.
    const usableWidth = wrapW - 16;
    const neededOverlap = Math.ceil((cardWidth - (usableWidth - cardWidth) / (n - 1)) / 2);
    mobileOverlap = Math.min(48, Math.max(16, neededOverlap));
  }

  const mobileHorizontalShift = (index: number): number => {
    if (!isMobile || expandedIndex < 0) return 0;

    const layoutWidth = wrapW || window.innerWidth;
    const spacing = cardWidth - mobileOverlap * 2;
    const groupWidth = cardWidth + Math.max(0, n - 1) * spacing;
    const baseCenter = (layoutWidth - groupWidth) / 2 + cardWidth / 2 + index * spacing;

    if (index === expandedIndex) return layoutWidth / 2 - baseCenter;

    const expandedHalfWidth = cardWidth * 1.32 / 2;
    const selectedLeft = layoutWidth / 2 - expandedHalfWidth;
    const selectedRight = layoutWidth / 2 + expandedHalfWidth;

    if (index < expandedIndex) {
      const cardsOnLeft = expandedIndex;
      const tabWidth = Math.min(42, selectedLeft / cardsOnLeft);
      const distance = expandedIndex - index;
      const targetRight = selectedLeft - (distance - 1) * tabWidth;
      return targetRight - cardWidth / 2 - baseCenter;
    }

    const cardsOnRight = n - expandedIndex - 1;
    const tabWidth = Math.min(42, (layoutWidth - selectedRight) / cardsOnRight);
    const distance = index - expandedIndex;
    const targetRight = selectedRight + distance * tabWidth;
    return targetRight - cardWidth / 2 - baseCenter;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    swipeStartX.current = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || swipeStartX.current === null || n === 0) return;
    const deltaX = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(deltaX) < 42) return;

    suppressClick.current = true;
    if (suppressClickTimer.current !== null) window.clearTimeout(suppressClickTimer.current);
    suppressClickTimer.current = window.setTimeout(() => {
      suppressClick.current = false;
      suppressClickTimer.current = null;
    }, 350);

    setExpandedId(currentId => {
      const currentIndex = player.hand.findIndex(card => card.id === currentId);
      if (currentIndex < 0) {
        return player.hand[deltaX < 0 ? 0 : n - 1].id;
      }
      const direction = deltaX < 0 ? 1 : -1;
      return player.hand[(currentIndex + direction + n) % n].id;
    });
  };

  return (
    <div
      ref={wrapRef}
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
        className="player-hand-stage pb-2"
        style={disabled ? { opacity: 0.7 } : undefined}
        role="region"
        aria-label="Cartas de tu mano"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { swipeStartX.current = null; }}
      >
        <div className={`player-hand-row flex items-end ${isMobile ? 'justify-center px-2 pt-5' : 'justify-center min-w-max px-6 pt-4'}`}>
          {n > 0 ? (
            player.hand.map((card, i) => {
              const cardRef = cardRefs.current.get(card.id)!;
              const lifted = hovered.current === card.id;
              const expanded = isMobile && expandedId === card.id;
              return (
                <div
                  key={card.id}
                  style={{
                    margin: isMobile ? `0 -${mobileOverlap}px` : '0 -8px',
                    transform: fanTransform(
                      i,
                      n,
                      lifted,
                      isMobile,
                      expanded,
                      expandedIndex,
                      mobileHorizontalShift(i),
                    ),
                    transformOrigin: 'bottom center',
                    transition: 'transform .2s',
                    zIndex: expanded || lifted
                      ? 10
                      : expandedIndex >= 0
                        ? n - Math.abs(i - expandedIndex)
                        : i + 1,
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
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          if (suppressClickTimer.current !== null) {
                            window.clearTimeout(suppressClickTimer.current);
                            suppressClickTimer.current = null;
                          }
                          return;
                        }
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
