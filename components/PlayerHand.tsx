import React, { useRef, useEffect } from 'react';
import { Player, Card as CardType } from '../types';
import Card from './Card';

// ============================================================
// JW Timeline — PlayerHand premium (diseño 2b) · handoff/PlayerHand.tsx
// Sustituye components/PlayerHand.tsx. Misma API de props.
// Mano en abanico siempre (también en móvil):
//  · Escritorio: hover eleva la carta; clic la selecciona.
//  · Móvil (≤767px): abanico compacto (±10°, solape -22px);
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
// En móvil el abanico es más compacto y la carta ampliada
// (expanded) crece hacia arriba desde su base.
const fanTransform = (i: number, n: number, lifted: boolean, isMobile: boolean, expanded: boolean) => {
  const center = (n - 1) / 2;
  const offset = n > 1 ? (i - center) / center : 0; // -1..1
  if (isMobile) {
    if (expanded) return 'translateY(-34px) scale(1.32)';
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = React.useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Mide el ancho disponible para calcular el solape del abanico en móvil
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => setWrapW(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
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

  const titleText = placementMode
    ? 'Elige una carta para colocar'
    : `Tu mano · ${player.hand.length} ${player.hand.length === 1 ? 'carta' : 'cartas'}`;
  const title = disabled ? 'Esperando tu turno…' : titleText;

  const n = player.hand.length;

  // Solape dinámico en móvil: el abanico se comprime lo justo para
  // que las cartas de los extremos no queden cortadas por los bordes.
  const CARD_W = isMobile && window.matchMedia('(orientation: landscape)').matches
    ? 120
    : 140;
  let mobileOverlap = 22;
  if (isMobile && n > 1 && wrapW > 0) {
    const usable = wrapW - 48; // px-6 a cada lado
    const needed = Math.ceil((CARD_W - (usable - CARD_W) / (n - 1)) / 2);
    mobileOverlap = Math.min(58, Math.max(22, needed));
  }

  return (
    <div ref={wrapRef}>
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
      <div className="overflow-x-auto pb-2" style={{ ...(disabled ? { opacity: 0.7 } : {}), overflow: isMobile ? 'visible' : undefined }}>
        <div className={`flex items-end px-6 ${isMobile ? 'justify-center pt-28' : 'justify-center min-w-max pt-4'}`}>
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
                    transform: fanTransform(i, n, lifted, isMobile, expanded),
                    transformOrigin: 'bottom center',
                    transition: 'transform .2s',
                    zIndex: expanded || lifted ? 10 : i + 1,
                    borderRadius: 4,
                  }}
                  onMouseEnter={() => { hovered.current = card.id; force(); }}
                  onMouseLeave={() => { hovered.current = null; force(); }}
                >
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
