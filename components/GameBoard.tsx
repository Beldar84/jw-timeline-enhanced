import React, { useState, useRef, useEffect } from 'react';
import { Card as CardType, Player } from '../types';
import Timeline from './Timeline';
import PlayerHand from './PlayerHand';
import AIHand from './AIHand';
import Card from './Card';
import { soundService } from '../services/soundService';
import { CARD_BACK_URL, LOGO_URL } from '../data/cards';

// ============================================================
// JW Timeline — GameBoard premium (diseño 2b) · handoff/GameBoard.tsx
// Sustituye components/GameBoard.tsx. Misma API de props y lógica;
// solo cambia la presentación:
//  · Barra superior: logo + chip de jugadores + mensaje (Garamond
//    itálica) + botón SALIR outline dorado.
//  · Centro: zona de timeline sobre eje dorado (scroll horizontal).
//  · Abajo: mazo apilado (reversos rotados) | mano en abanico |
//    descarte como mini-carta pergamino con nombre y fecha.
// Requiere public/premium.css.
// ============================================================

interface GameBoardProps {
  players: Player[];
  currentPlayer: Player;
  timeline: CardType[];
  onAttemptPlaceCard: (card: CardType, timelineIndex: number, cardEl: HTMLElement, slotEl: HTMLElement, discardEl: HTMLElement) => void;
  deckSize: number;
  topOfDeck: CardType | null;
  discardPile: CardType[];
  message: string | null;
  revealedAICard: CardType | null;
  gameMode: 'local' | 'ai' | 'online' | null;
  localPlayer?: Player | null;
  hidingCardId?: number | null;
  highlightedTimelineCardId?: number | null;
  highlightedHandCardId?: number | null;
  isAnimating: boolean;
  onPlaceCardOnline?: (card: CardType, timelineIndex: number) => void;
  onExitGame?: () => void;
  isStudyMode?: boolean;
}

interface DragPreview {
  card: CardType;
  clientX: number;
  clientY: number;
  width: number;
  height: number;
}

const GameBoard: React.FC<GameBoardProps> = ({
  players, currentPlayer, timeline, onAttemptPlaceCard, deckSize, topOfDeck,
  discardPile, message, revealedAICard, gameMode, localPlayer, hidingCardId,
  highlightedTimelineCardId, highlightedHandCardId, isAnimating,
  onPlaceCardOnline, onExitGame, isStudyMode = false,
}) => {
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number | null>(null);
  const [selectedSlotElement, setSelectedSlotElement] = useState<HTMLElement | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ card: CardType, element: HTMLElement } | null>(null);
  const [zoomedCard, setZoomedCard] = useState<CardType | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);

  const discardRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const isTurnOfHumanOnThisDevice =
    gameMode === 'local' ||
    (gameMode === 'ai' && !currentPlayer.isAI) ||
    (gameMode === 'online' && localPlayer ? currentPlayer.id === localPlayer.id : false);

  const canInteract = isTurnOfHumanOnThisDevice && !isAnimating;

  useEffect(() => {
    if (canInteract) return;
    setSelectedCard(null);
    setSelectedTimelineIndex(null);
    setSelectedSlotElement(null);
  }, [canInteract]);

  useEffect(() => {
    if (selectedCard && selectedSlotElement !== null && selectedTimelineIndex !== null && discardRef.current && deckRef.current && handRef.current) {
      if (gameMode === 'online' && onPlaceCardOnline) {
        onPlaceCardOnline(selectedCard.card, selectedTimelineIndex);
      } else {
        onAttemptPlaceCard(selectedCard.card, selectedTimelineIndex, selectedCard.element, selectedSlotElement, discardRef.current);
      }
      setSelectedCard(null);
      setSelectedTimelineIndex(null);
      setSelectedSlotElement(null);
    }
  }, [selectedCard, selectedSlotElement, selectedTimelineIndex, onAttemptPlaceCard, gameMode, onPlaceCardOnline]);

  const handleSelectSlot = (index: number, element: HTMLButtonElement) => {
    if (!canInteract) return;
    soundService.playClick();
    if (selectedTimelineIndex === index) {
      setSelectedTimelineIndex(null);
      setSelectedSlotElement(null);
    } else {
      setSelectedTimelineIndex(index);
      setSelectedSlotElement(element);
    }
  };

  const handleCardClick = (card: CardType, element: HTMLDivElement) => {
    if (!canInteract) {
      soundService.playCardFlip();
      setZoomedCard(card);
      return;
    }
    if (selectedTimelineIndex !== null) {
      soundService.playClick();
      setSelectedCard({ card, element });
    } else {
      soundService.playCardFlip();
      setZoomedCard(card);
    }
  };

  const handleCardFocus = (card: CardType | null, element: HTMLDivElement | null) => {
    if (!card || !element || !canInteract) {
      setSelectedCard(null);
      return;
    }
    setSelectedCard({ card, element });
  };

  // Distancia máxima (px) del dedo a una ranura para considerarla destino.
  const DROP_RADIUS = 130;

  // Devuelve la ranura MÁS CERCANA al puntero dentro del radio: el resalte
  // sigue al dedo mientras se arrastra, sin exigir estar justo encima del «+».
  const findDropSlot = (clientX: number, clientY: number) => {
    if (clientX < 0 || clientY < 0) return null;
    const slots = Array.from(document.querySelectorAll<HTMLButtonElement>('.slot-circle'));
    let best: { index: number; element: HTMLButtonElement } | null = null;
    let bestDistance = DROP_RADIUS;
    for (const slot of slots) {
      if (slot.disabled || !slot.id.startsWith('timeline-slot-')) continue;
      const index = Number(slot.id.replace('timeline-slot-', ''));
      if (!Number.isInteger(index) || index < 0 || index > timeline.length) continue;
      const rect = slot.getBoundingClientRect();
      if (rect.right < 0 || rect.left > window.innerWidth) continue; // fuera del viewport (eje con scroll)
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { index, element: slot };
      }
    }
    return best;
  };

  const handleCardDragStart = (
    card: CardType,
    element: HTMLDivElement,
    clientX: number,
    clientY: number,
  ) => {
    if (!canInteract) return;
    const rect = element.getBoundingClientRect();
    setSelectedCard(null);
    setSelectedTimelineIndex(null);
    setSelectedSlotElement(null);
    setDragPreview({
      card,
      clientX,
      clientY,
      width: rect.width,
      height: rect.height,
    });
  };

  const handleCardDragMove = (clientX: number, clientY: number) => {
    if (!canInteract) return;
    const preview = dragPreviewRef.current;
    if (preview) {
      preview.style.left = `${clientX - preview.offsetWidth / 2}px`;
      preview.style.top = `${clientY - preview.offsetHeight / 2}px`;
    }
    const targetIndex = findDropSlot(clientX, clientY)?.index ?? null;
    setDragTargetIndex(current => current === targetIndex ? current : targetIndex);
  };

  const handleCardDragEnd = (
    card: CardType,
    element: HTMLDivElement,
    clientX: number,
    clientY: number,
  ) => {
    const target = canInteract ? findDropSlot(clientX, clientY) : null;
    const animationOrigin = dragPreviewRef.current ?? element;

    if (target) {
      soundService.playClick();
      if (gameMode === 'online' && onPlaceCardOnline) {
        onPlaceCardOnline(card, target.index);
      } else if (discardRef.current) {
        onAttemptPlaceCard(card, target.index, animationOrigin, target.element, discardRef.current);
      }
    }

    setDragPreview(null);
    setDragTargetIndex(null);
  };

  const handleCloseZoom = () => setZoomedCard(null);

  const handleZoomCard = (card: CardType) => {
    soundService.playCardFlip();
    setZoomedCard(card);
  };

  const handleExitClick = () => {
    soundService.playClick();
    if (onExitGame) {
      const confirmExit = window.confirm(
        gameMode === 'online'
          ? '¿Estás seguro de que quieres salir? Los demás jugadores serán notificados.'
          : '¿Estás seguro de que quieres salir de la partida?'
      );
      if (confirmExit) onExitGame();
    }
  };

  const isMyTurnOnline = gameMode === 'online' && localPlayer ? currentPlayer.id === localPlayer.id : false;
  const dynamicMessage = gameMode === 'online'
    ? (isMyTurnOnline ? 'Es tu turno.' : `Esperando a ${currentPlayer.name}…`)
    : message;

  const finalMessage = selectedTimelineIndex !== null && canInteract
    ? 'Ahora selecciona una carta de tu mano para colocarla'
    : selectedCard && canInteract
      ? 'Ahora selecciona un + de la línea de tiempo'
      : dynamicMessage;

  const handPlayer = gameMode === 'local' || gameMode === 'ai' ? currentPlayer : localPlayer;
  const topDiscard = discardPile[0] || null;

  return (
    <div className="flex flex-col w-full relative">

      {/* ── Barra superior ── */}
      <div className="max-md:order-1 flex items-center justify-between gap-3 px-4 md:px-7 py-3 md:py-4 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-3 md:gap-5">
          <img src={LOGO_URL} alt="JW Timeline" className="w-16 md:w-[90px] opacity-90" />
          <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 rounded-sm"
            style={{ border: '1px solid rgba(201,162,39,.35)', background: 'rgba(0,0,0,.35)' }}>
            {players.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <span style={{ width: 1, height: 14, background: 'rgba(201,162,39,.35)' }}></span>}
                <span className="font-display text-xs md:text-sm tracking-wider"
                  style={{ color: p.id === currentPlayer.id ? '#e5c96a' : '#a89870', fontWeight: p.id === currentPlayer.id ? 600 : 400 }}>
                  {p.name} · {p.hand.length}
                </span>
              </React.Fragment>
            ))}
          </div>
          {isStudyMode && (
            <span className="font-display text-[10px] md:text-xs tracking-widest px-2 py-1 rounded-sm"
              style={{ color: '#e5c96a', border: '1px solid rgba(201,162,39,.5)', background: 'rgba(201,162,39,.12)' }}>
              MODO ESTUDIO
            </span>
          )}
        </div>

        <p className="font-body italic text-base md:text-xl text-center flex-1 min-w-[200px]" style={{ color: '#e8d9b0' }}>
          {finalMessage}
        </p>

        {onExitGame && (
          <button onClick={handleExitClick} className="btn-outline-gold px-4 py-2 text-xs md:text-sm">
            SALIR
          </button>
        )}
      </div>

      {/* ── Oponentes online ── */}
      {gameMode === 'online' && localPlayer && (
        <div className="max-md:order-2 max-md:mb-3 flex justify-center items-start gap-2 md:gap-6 px-4 flex-shrink-0">
          {players.filter(p => p.id !== localPlayer.id).map(opponent => (
            <div key={opponent.id} className="p-1 md:p-2 rounded-sm"
              style={currentPlayer.id === opponent.id ? { background: 'rgba(201,162,39,.12)', border: '1px solid rgba(201,162,39,.35)' } : {}}>
              <p className="font-display text-center text-xs md:text-sm mb-1 tracking-wider"
                style={{ color: currentPlayer.id === opponent.id ? '#e5c96a' : '#a89870' }}>{opponent.name}</p>
              <AIHand player={opponent} showTitle={false} isOpponent={true} />
            </div>
          ))}
        </div>
      )}

      {/* ── Timeline (eje dorado) ── */}
      <div className="timeline-scroll max-md:order-4 overflow-x-auto overflow-y-hidden flex-grow flex flex-col justify-center px-4 md:px-10 min-h-[240px] md:min-h-[340px]">
        <Timeline
          cards={timeline}
          onSelectSlot={handleSelectSlot}
          selectedSlotIndex={selectedTimelineIndex}
          dragTargetIndex={dragTargetIndex}
          dragActive={dragPreview !== null}
          highlightedCardId={highlightedTimelineCardId}
          disabled={!canInteract}
        />
      </div>

      {/* ── Zona inferior: móvil = fila [mazo · descarte] sobre el timeline y mano abajo;
             escritorio = mazo | mano | descarte ── */}
      <div className="max-md:contents md:flex md:items-end md:justify-between md:gap-3 md:px-10 md:pb-6 md:flex-shrink-0">

        {/* Pilas: en móvil fila propia encima del timeline; en escritorio se disuelve (contents) */}
        <div className="max-md:order-3 max-md:flex max-md:items-end max-md:justify-between max-md:px-4 max-md:pt-2 max-md:pb-1 md:contents">

        {/* Mazo apilado */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 md:order-1">
          <div id="deck-container" ref={deckRef} className="relative deck-responsive">
            {deckSize > 0 && (
              <>
                <div className="absolute inset-0 rounded-md"
                  style={{ transform: 'translate(7px,-7px) rotate(4deg)', background: `url('${CARD_BACK_URL}') center/cover`, filter: 'brightness(.72)' }}></div>
                <div className="absolute inset-0 rounded-md"
                  style={{ transform: 'translate(3.5px,-3.5px) rotate(2deg)', background: `url('${CARD_BACK_URL}') center/cover`, filter: 'brightness(.85)' }}></div>
                <img src={CARD_BACK_URL} alt="Mazo"
                  className="absolute inset-0 w-full h-full object-cover rounded-md"
                  style={{ boxShadow: '0 12px 28px rgba(0,0,0,.6)' }} />
              </>
            )}
          </div>
          <p className="font-display text-[11px] md:text-xs tracking-widest" style={{ color: '#a89870' }}>
            MAZO · {deckSize}
          </p>
        </div>

        {/* Descarte: mini-carta con nombre y fecha */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 md:order-3">
          <div id="discard-pile-container" ref={discardRef} className="w-[84px] md:w-[122px]">
            {topDiscard ? (
              <div style={{ filter: 'saturate(.85)' }}>
                <Card card={topDiscard} showYear={true} onClick={() => handleZoomCard(topDiscard)} className="w-full" />
              </div>
            ) : (
              <div className="w-full aspect-[122/170] rounded-md flex items-center justify-center"
                style={{ border: '1.5px dashed rgba(201,162,39,.4)', background: 'rgba(0,0,0,.25)' }}>
                <span className="font-body italic text-sm" style={{ color: '#a89870' }}>Vacío</span>
              </div>
            )}
          </div>
          <p className="font-display text-[11px] md:text-xs tracking-widest" style={{ color: '#a89870' }}>
            DESCARTE · {discardPile.length}
          </p>
        </div>
        </div>

        {/* Mano en abanico */}
        <div ref={handRef} id={handPlayer?.isAI ? 'ai-hand-container' : 'player-hand-container'} className="max-md:order-5 max-md:w-full max-md:pb-3 md:order-2 md:flex-1 min-w-0">
          {handPlayer ? (
            handPlayer.isAI ? (
              <AIHand player={handPlayer} showTitle={true} />
            ) : (
              <PlayerHand
                player={handPlayer}
                onSelectCard={handleCardClick}
                onCardFocus={handleCardFocus}
                onCardDragStart={handleCardDragStart}
                onCardDragMove={handleCardDragMove}
                onCardDragEnd={handleCardDragEnd}
                placementMode={selectedTimelineIndex !== null}
                disabled={!canInteract}
                hidingCardId={hidingCardId}
                highlightedCardId={highlightedHandCardId}
                isStudyMode={isStudyMode}
              />
            )
          ) : null}
        </div>

      </div>

      {dragPreview && (
        <div
          ref={dragPreviewRef}
          className="drag-card-preview"
          style={{
            left: dragPreview.clientX - dragPreview.width / 2,
            top: dragPreview.clientY - dragPreview.height / 2,
            width: dragPreview.width,
            height: dragPreview.height,
          }}
          aria-hidden="true"
        >
          <Card card={dragPreview.card} showYear={false} className="w-full h-full card-expanded-ring" />
        </div>
      )}

      {/* ── Zoom ── */}
      {zoomedCard && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(10,7,3,.85)', backdropFilter: 'blur(4px)' }}
          onClick={handleCloseZoom} role="dialog" aria-modal="true">
          <div onClick={handleCloseZoom} className="cursor-pointer">
            <Card card={zoomedCard} showYear={false} isZoomed={true} />
            <p className="font-body italic text-center text-sm mt-2" style={{ color: '#a89870' }}>Toca para cerrar</p>
          </div>
        </div>
      )}
      {revealedAICard && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none" role="status" aria-live="polite">
          <div className="ai-card-reveal">
            <Card card={revealedAICard} showYear={false} className="w-[185px] md:w-[220px] !h-auto card-expanded-ring" />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
