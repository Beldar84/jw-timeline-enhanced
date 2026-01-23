
import React, { useState, useRef, useEffect } from 'react';
import { Card as CardType, Player } from '../types';
import Timeline from './Timeline';
import PlayerHand from './PlayerHand';
import AIHand from './AIHand';
import Card from './Card';
import { soundService } from '../services/soundService';
import { CARD_BACK_URL } from '../data/cards';

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
  isAnimating: boolean;
  onPlaceCardOnline?: (card: CardType, timelineIndex: number) => void;
  onExitGame?: () => void;
  isStudyMode?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayer,
  timeline,
  onAttemptPlaceCard,
  deckSize,
  topOfDeck,
  discardPile,
  message,
  revealedAICard,
  gameMode,
  localPlayer,
  hidingCardId,
  isAnimating,
  onPlaceCardOnline,
  onExitGame,
  isStudyMode = false,
}) => {
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number | null>(null);
  const [selectedSlotElement, setSelectedSlotElement] = useState<HTMLElement | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ card: CardType, element: HTMLElement } | null>(null);
  const [zoomedCard, setZoomedCard] = useState<CardType | null>(null);

  const discardRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  const isTurnOfHumanOnThisDevice =
    gameMode === 'local' ||
    (gameMode === 'ai' && !currentPlayer.isAI) ||
    (gameMode === 'online' && localPlayer ? currentPlayer.id === localPlayer.id : false);

  const canInteract = isTurnOfHumanOnThisDevice && !isAnimating;

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

  const handleSelectSlot = (index: number, element: HTMLDivElement) => {
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
    // Siempre permitir zoom de cartas propias, incluso cuando no es tu turno
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

  const handleCloseZoom = () => {
    setZoomedCard(null);
  };

  const handleZoomCard = (card: CardType) => {
    soundService.playCardFlip();
    setZoomedCard(card);
  };

  const handleExitClick = () => {
    soundService.playClick();
    if (onExitGame) {
      const confirmExit = window.confirm(
        gameMode === 'online'
          ? "¿Estás seguro de que quieres salir? Los demás jugadores serán notificados."
          : "¿Estás seguro de que quieres salir de la partida?"
      );
      if (confirmExit) {
        onExitGame();
      }
    }
  };

  const isMyTurnOnline = gameMode === 'online' && localPlayer ? currentPlayer.id === localPlayer.id : false;
  const dynamicMessage = gameMode === 'online'
    ? (isMyTurnOnline ? "Es tu turno." : `Esperando a ${currentPlayer.name}...`)
    : message;

  const finalMessage = selectedTimelineIndex !== null && canInteract
    ? "Ahora selecciona una carta de tu mano para colocarla."
    : dynamicMessage;

  const handPlayer = gameMode === 'local' || gameMode === 'ai' ? currentPlayer : localPlayer;

  // Dimensiones del mazo y descarte (más pequeñas que las cartas principales)
  // Móvil: w-[100px] h-[146px]
  // Tablet: w-[110px] h-[161px]
  // Desktop: w-[130px] h-[190px]
  // Desktop grande: w-[150px] h-[220px]
  // Monitor grande: w-[160px] h-[235px]
  const containerDimensions = "w-[100px] h-[146px] landscape:w-[90px] landscape:h-[132px] md:w-[110px] md:h-[161px] lg:w-[130px] lg:h-[190px] xl:w-[150px] xl:h-[220px] 2xl:w-[160px] 2xl:h-[235px]";

  return (
    <div className="space-y-1 md:space-y-2 flex flex-col h-full w-full overflow-y-auto overflow-x-hidden pb-8 md:pb-4 relative">
      {/* Exit Button */}
      {onExitGame && (
        <button
          onClick={handleExitClick}
          className="absolute top-2 right-2 md:top-4 md:right-4 z-20 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all shadow-lg"
        >
          ✕ Salir
        </button>
      )}

      {/* Study Mode Indicator */}
      {isStudyMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-600/90 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
          📚 Modo Estudio
        </div>
      )}

      {gameMode === 'online' && localPlayer && (
        <div className="bg-black/30 p-2 rounded-lg flex-shrink-0 landscape:py-1 landscape:px-2">
          <h3 className="text-center text-yellow-200 font-semibold mb-2 text-sm md:text-base landscape:hidden">Oponentes</h3>
          <div className="flex justify-center items-start space-x-2 md:space-x-6">
            {players.filter(p => p.id !== localPlayer.id).map(opponent => (
              <div key={opponent.id} className={`p-1 md:p-2 rounded-lg transition-all ${currentPlayer.id === opponent.id ? 'bg-yellow-500/20' : ''}`}>
                <p className={`text-center font-bold text-xs md:text-base mb-1 landscape:text-[10px] landscape:leading-tight landscape:mb-0.5 ${currentPlayer.id === opponent.id ? 'text-yellow-300 animate-pulse' : 'text-white'}`}>{opponent.name}</p>
                <AIHand player={opponent} showTitle={false} isOpponent={true} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-black/30 p-2 md:p-4 rounded-lg flex-shrink-0 landscape:py-1 landscape:px-2 md:landscape:p-4">
        <div className="text-sm md:text-lg text-center font-semibold text-yellow-100 flex-grow px-2 self-center mb-1 landscape:text-xs landscape:mb-0.5 md:landscape:text-sm">
            {finalMessage}
        </div>
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-1 md:space-x-4 landscape:space-x-1">
                <div id="discard-pile-container" ref={discardRef} className={containerDimensions}>
                  {discardPile.length > 0 ? (
                    <Card card={discardPile[0]} showYear={true} onClick={() => handleZoomCard(discardPile[0])} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-600 bg-black/20 flex items-center justify-center text-gray-500 text-xs md:text-base">Vacío</div>
                  )}
                </div>
                {gameMode === 'online' && (
                  <div className="text-left hidden md:block landscape:hidden md:landscape:block">
                      <h3 className="text-base md:text-xl font-bold text-yellow-300 landscape:text-sm md:landscape:text-base">Descartes</h3>
                      <p className="text-sm md:text-base landscape:text-xs md:landscape:text-sm">{discardPile.length} {discardPile.length === 1 ? 'carta' : 'cartas'}</p>
                  </div>
                )}
            </div>
            <div className="flex items-center space-x-1 md:space-x-4 landscape:space-x-1">
                <div className="text-right hidden md:block landscape:hidden md:landscape:block">
                    <h3 className="text-base md:text-xl font-bold text-yellow-300 landscape:text-sm md:landscape:text-base">Mazo</h3>
                    <p className="text-sm md:text-base landscape:text-xs md:landscape:text-sm">{deckSize} cartas</p>
                </div>
                <div id="deck-container" ref={deckRef} className={containerDimensions}>
                   {deckSize > 0 && <Card card={{id: -1, name: 'deck', year: 0, imageUrl: CARD_BACK_URL}} isFaceDown={true} className="w-full h-full" />}
                </div>
            </div>
        </div>
      </div>

      <div className="overflow-x-auto p-2 md:p-4 lg:p-6 bg-black/30 rounded-lg shrink-0 flex-grow flex flex-col justify-center min-h-[240px] md:min-h-[290px] lg:min-h-[350px]">
          <Timeline
            cards={timeline}
            onSelectSlot={handleSelectSlot}
            selectedSlotIndex={selectedTimelineIndex}
            onCardClick={handleZoomCard}
            disabled={!canInteract}
          />
      </div>

      <div ref={handRef} id={handPlayer?.isAI ? 'ai-hand-container' : 'player-hand-container'} className="bg-black/30 p-2 md:p-4 rounded-lg flex-shrink-0 landscape:py-1 landscape:px-2 md:landscape:p-4 mb-4">
        {handPlayer ? (
          handPlayer.isAI ? (
            <AIHand player={handPlayer} showTitle={true} />
          ) : (
            <PlayerHand
              player={handPlayer}
              onSelectCard={handleCardClick}
              placementMode={selectedTimelineIndex !== null}
              disabled={!canInteract}
              hidingCardId={hidingCardId}
              isStudyMode={isStudyMode}
            />
          )
        ) : null}
      </div>

      {zoomedCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleCloseZoom} role="dialog" aria-modal="true">
          <div onClick={handleCloseZoom} className="cursor-pointer">
            <Card card={zoomedCard} showYear={false} isZoomed={true} />
            <p className="text-center text-gray-400 text-sm mt-2">Toca para cerrar</p>
          </div>
        </div>
      )}
      {revealedAICard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div>
            <Card card={revealedAICard} showYear={false} isZoomed={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
