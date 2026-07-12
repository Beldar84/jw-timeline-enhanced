import React, { useRef, useEffect } from 'react';
import { Player, Card as CardType } from '../types';
import Card from './Card';
import { soundService } from '../services/soundService';

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
  onCardFocus?: (card: CardType | null, element: HTMLDivElement | null) => void;
  onCardDragStart?: (card: CardType, element: HTMLDivElement, clientX: number, clientY: number) => void;
  onCardDragMove?: (clientX: number, clientY: number) => void;
  onCardDragEnd?: (card: CardType, element: HTMLDivElement, clientX: number, clientY: number) => void;
  placementMode?: boolean;
  disabled?: boolean;
  hidingCardId?: number | null;
  highlightedCardId?: number | null;
  isStudyMode?: boolean;
}

// Rotación del abanico según posición relativa al centro.
// En móvil el abanico es fijo: cada carta conserva su posición
// ordenada. La ampliada solo se endereza aquí y crece hacia
// abajo en su envoltorio interior, sin desplazar a las demás.
const fanTransform = (
  i: number,
  n: number,
  lifted: boolean,
  isMobile: boolean,
  expanded: boolean,
) => {
  const center = (n - 1) / 2;
  const offset = n > 1 ? (i - center) / center : 0; // -1..1
  if (isMobile) {
    if (expanded) {
      return 'rotate(0deg) translateY(0px)';
    }
    const rot = offset * 10; // máx ±10°
    return `rotate(${rot}deg) translateY(${Math.abs(offset) * 16}px)`;
  }
  const rot = offset * 7; // máx ±7°
  const y = expanded || lifted ? -16 : Math.abs(offset) * 14; // extremos más bajos
  return `rotate(${rot}deg) translateY(${y}px)`;
};

const PlayerHand: React.FC<PlayerHandProps> = ({
  player, onSelectCard, onCardFocus, onCardDragStart, onCardDragMove, onCardDragEnd,
  placementMode = false, disabled = false, hidingCardId, highlightedCardId,
  isStudyMode = false,
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
  const dragCandidate = useRef<{
    card: CardType;
    element: HTMLDivElement;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const dragCallbacks = useRef({ onCardDragStart, onCardDragMove, onCardDragEnd });
  const onCardFocusRef = useRef(onCardFocus);
  dragCallbacks.current = { onCardDragStart, onCardDragMove, onCardDragEnd };
  onCardFocusRef.current = onCardFocus;

  const handIdentity = player.hand.map(card => card.id).join(':');

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

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const candidate = dragCandidate.current;
      const callbacks = dragCallbacks.current;
      if (!candidate || candidate.pointerId !== event.pointerId || disabled) return;
      if (!callbacks.onCardDragStart || !callbacks.onCardDragMove || !callbacks.onCardDragEnd) return;

      const deltaX = event.clientX - candidate.startX;
      const deltaY = event.clientY - candidate.startY;
      const distance = Math.hypot(deltaX, deltaY);
      const shouldStart = isMobile
        ? deltaY < -14 && Math.abs(deltaY) > Math.abs(deltaX) * 0.8
        : distance > 8;

      if (!candidate.active && shouldStart) {
        candidate.active = true;
        suppressClick.current = true;
        if (suppressClickTimer.current !== null) window.clearTimeout(suppressClickTimer.current);
        suppressClickTimer.current = window.setTimeout(() => {
          suppressClick.current = false;
          suppressClickTimer.current = null;
        }, 350);
        swipeStartX.current = null;
        callbacks.onCardDragStart(candidate.card, candidate.element, event.clientX, event.clientY);
      }

      if (candidate.active) {
        event.preventDefault();
        callbacks.onCardDragMove(event.clientX, event.clientY);
      }
    };

    const finishWindowDrag = (event: PointerEvent, cancelled = false) => {
      const candidate = dragCandidate.current;
      if (!candidate || candidate.pointerId !== event.pointerId) return;
      if (candidate.active) {
        event.preventDefault();
        swipeStartX.current = null;
        dragCallbacks.current.onCardDragEnd?.(
          candidate.card,
          candidate.element,
          cancelled ? -1 : event.clientX,
          cancelled ? -1 : event.clientY,
        );
      }
      dragCandidate.current = null;
    };

    const handlePointerUp = (event: PointerEvent) => finishWindowDrag(event);
    const handlePointerCancel = (event: PointerEvent) => finishWindowDrag(event, true);
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [disabled, isMobile]);

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

  // Una penalización sustituye una carta por otra sin cambiar el tamaño de la
  // mano. Por eso se compara su identidad completa y no solo la cantidad.
  // La carta robada debe destacarse siempre desde el tamaño normal.
  useEffect(() => {
    setExpandedId(null);
    onCardFocusRef.current?.(null, null);
  }, [player.id, handIdentity, highlightedCardId]);

  const titleText = placementMode
    ? 'Elige una carta para colocar'
    : `Tu mano · ${player.hand.length} ${player.hand.length === 1 ? 'carta' : 'cartas'}`;
  const title = disabled ? 'Esperando tu turno…' : titleText;

  const n = player.hand.length;

  // Solape dinámico: todas las cartas permanecen fijas dentro de la pantalla.
  // El gesto lateral cambia únicamente cuál se desplaza y amplía al frente.
  // Debe coincidir con .card-responsive de premium.css (136px en apaisado, 140px en vertical)
  const cardWidth = isMobile && window.matchMedia('(orientation: landscape)').matches ? 136 : 140;
  let mobileOverlap = 18;
  if (isMobile && n > 1 && wrapW > 0) {
    // Reservamos solo 8 px por lado: así las cuatro cartas ocupan casi todo el
    // ancho disponible y cada una conserva una franja amplia para tocarla.
    const usableWidth = wrapW - 16;
    const neededOverlap = Math.ceil((cardWidth - (usableWidth - cardWidth) / (n - 1)) / 2);
    mobileOverlap = Math.min(48, Math.max(16, neededOverlap));
  }

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

    const currentIndex = player.hand.findIndex(card => card.id === expandedId);
    const nextCard = currentIndex < 0
      ? player.hand[deltaX < 0 ? 0 : n - 1]
      : player.hand[(currentIndex + (deltaX < 0 ? 1 : -1) + n) % n];
    setExpandedId(nextCard.id);
    onCardFocus?.(nextCard, cardRefs.current.get(nextCard.id)?.current ?? null);
  };

  // Navegación con flechas: mismo comportamiento que el gesto lateral
  const stepExpanded = (direction: 1 | -1) => {
    if (n === 0) return;
    soundService.playClick();
    setExpandedId(currentId => {
      const currentIndex = player.hand.findIndex(card => card.id === currentId);
      if (currentIndex < 0) return player.hand[direction === 1 ? 0 : n - 1].id;
      return player.hand[(currentIndex + direction + n) % n].id;
    });
  };

  const startCardDragCandidate = (
    event: React.PointerEvent<HTMLDivElement>,
    card: CardType,
    element: HTMLDivElement | null,
  ) => {
    if (disabled || !element || !onCardDragStart || !onCardDragMove || !onCardDragEnd) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragCandidate.current = {
      card,
      element,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  };

  return (
    <div ref={wrapRef} className="player-hand-wrap">
      {/* El título se oculta mientras hay una carta ampliada para no superponerse a ella */}
      <div className="relative z-20 flex items-center justify-center gap-2 mb-2 landscape:mb-1"
        style={{ visibility: isMobile && expandedId !== null ? 'hidden' : 'visible' }}>
        <h3 className="font-body italic text-center text-base md:text-lg"
          style={{
            color: placementMode && !disabled ? 'var(--gold-bright)' : '#c9b891',
            ...(isMobile
              ? { padding: '3px 14px', borderRadius: 999, border: '1px solid transparent' }
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
        <div className={`player-hand-row flex items-end ${isMobile ? 'justify-center px-2' : 'justify-center min-w-max px-6 pt-4'}`}>
          {n > 0 ? (
            player.hand.map((card, i) => {
              const cardRef = cardRefs.current.get(card.id)!;
              const lifted = hovered.current === card.id;
              const expanded = expandedId === card.id;
              return (
                <div
                  key={card.id}
                  style={{
                    margin: isMobile ? `0 -${mobileOverlap}px` : '0 -8px',
                    transform: fanTransform(i, n, lifted, isMobile, expanded),
                    transformOrigin: 'bottom center',
                    transition: 'transform .2s',
                    // Orden fijo del abanico: la carta de la derecha siempre delante
                    // de la anterior. Solo la pulsada (ampliada) pasa a primer plano.
                    // El hover se ignora en táctil porque queda «pegajoso» tras el toque.
                    zIndex: expanded || (!isMobile && lifted) ? 10 : i + 1,
                    borderRadius: 4,
                    touchAction: !disabled && onCardDragStart ? 'none' : undefined,
                  }}
                  onPointerDown={(event) => startCardDragCandidate(event, card, cardRef.current)}
                  onMouseEnter={() => { hovered.current = card.id; force(); }}
                  onMouseLeave={() => { hovered.current = null; force(); }}
                >
                  <div
                    className={`hand-card-zoom-shell ${expanded ? 'hand-card-zoom-expanded' : ''}`}
                    style={{
                      // Crece hacia ARRIBA (nunca hacia el borde inferior del documento,
                      // que iOS recorta) y las de los extremos crecen hacia dentro.
                      transformOrigin: n > 1 && i === 0 ? 'bottom left' : n > 1 && i === n - 1 ? 'bottom right' : 'bottom center',
                    }}
                  >
                    <Card
                      ref={cardRef}
                      card={card}
                      className={`${expanded ? 'card-expanded-ring' : ''} ${highlightedCardId === card.id ? 'card-new-draw-highlight' : ''}`}
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
                        // Tras elegir una posición del eje, la carta se coloca
                        // directamente. En el orden inverso, la carta ampliada
                        // queda seleccionada y el siguiente toque en un + la coloca.
                        if (placementMode && !disabled && cardRef.current) {
                          onSelectCard(card, cardRef.current);
                          setExpandedId(null);
                          onCardFocus?.(null, null);
                          return;
                        }

                        const willCollapse = expandedId === card.id;
                        setExpandedId(willCollapse ? null : card.id);
                        onCardFocus?.(willCollapse ? null : card, willCollapse ? null : cardRef.current);
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

        {/* Flechas de navegación: aparecen con una carta ampliada para
            indicar que se puede pasar a las cartas vecinas */}
        {isMobile && expandedId !== null && n > 1 && (
          <div className="hand-nav-arrows" role="group" aria-label="Cambiar de carta">
            <button type="button" className="hand-nav-arrow" aria-label="Ver carta anterior"
              onClick={() => stepExpanded(-1)}>‹</button>
            <button type="button" className="hand-nav-arrow" aria-label="Ver carta siguiente"
              onClick={() => stepExpanded(1)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerHand;
