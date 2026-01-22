
import React, { forwardRef } from 'react';
import { Card as CardType } from '../types';
import { CARD_BACK_URL } from '../data/cards';

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlaceholder?: boolean;
  showYear?: boolean;
  isZoomed?: boolean;
  className?: string;
  isHidden?: boolean;
  isStudyMode?: boolean; // New: show year in study mode
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ card, isFaceDown, onClick, isPlaceholder = false, showYear = false, isZoomed = false, className = "", isHidden = false, isStudyMode = false }, ref) => {
  const getYearText = (year: number) => {
    if (year === -14000000000) return "-14.000M";
    return year.toLocaleString('de-DE'); // Use '.' for thousands separator like in PDF
  };

  if (isZoomed) {
    if (!card) return null;
    return (
      <div className="relative h-[85vh] max-w-[90vw] aspect-[500/734] rounded-lg shadow-2xl overflow-hidden border-2 border-yellow-300/50 bg-gray-900 mb-4">
        <img
          src={card.imageUrl}
          alt={card.name}
          className="w-full h-full object-contain"
          loading="eager"
          decoding="sync"
          crossOrigin="anonymous"
          style={{
            imageRendering: 'high-quality',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            WebkitFontSmoothing: 'subpixel-antialiased',
            maxWidth: '100%',
            maxHeight: '100%',
            minWidth: '100%',
            minHeight: '100%',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 pt-20 pb-6 text-center">
          <h3 className="font-bold text-2xl md:text-3xl text-white leading-tight drop-shadow-lg px-2">{card.name}</h3>
          {/* Bible Reference */}
          {card.bibleRef && (
            <p className="text-yellow-300 text-lg md:text-xl mt-2 font-semibold">
              📖 {card.bibleRef}
            </p>
          )}
          {/* Year in zoomed view */}
          <p className="text-blue-300 text-base md:text-lg mt-1">
            Año: {getYearText(card.year)}
          </p>
        </div>
      </div>
    );
  }

  // Dimensiones de la carta - se adaptan al contenedor si tiene clase custom
  // Móvil: w-[150px] h-[220px], Landscape: w-[120px] h-[176px]
  // Desktop (md): w-[180px] h-[264px] - tamaño medio para PC
  // Desktop grande (lg): w-[220px] h-[322px] - tamaño grande para monitores
  const hasCustomSize = className.includes('w-') || className.includes('h-');
  const cardBaseStyle = hasCustomSize
    ? "relative w-full h-full flex-shrink-0 rounded-lg shadow-lg transition-transform duration-300 overflow-hidden bg-gray-900 border-2 border-gray-600"
    : "relative w-[150px] h-[220px] landscape:w-[120px] landscape:h-[176px] md:w-[180px] md:h-[264px] lg:w-[220px] lg:h-[322px] flex-shrink-0 rounded-lg shadow-lg transition-transform duration-300 overflow-hidden bg-gray-900 border-2 border-gray-600";
  const selectableStyle = onClick ? "cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-yellow-400" : "";

  if (isPlaceholder || isFaceDown) {
      return (
        <div ref={ref} className={`${cardBaseStyle} ${selectableStyle} bg-gray-800 ${className}`} style={{ visibility: isHidden ? 'hidden' : 'visible' }}>
            <img src={CARD_BACK_URL} alt="Reverso de la carta" className="w-full h-full object-cover rounded-md" />
        </div>
      )
  }

  if (!card) return null;

  const cardYearText = getYearText(card.year);
  const shouldShowYear = showYear || isStudyMode;

  return (
    <div
      ref={ref}
      className={`${cardBaseStyle} ${selectableStyle} ${className} ${isStudyMode ? 'ring-2 ring-green-400/50' : ''}`}
      onClick={onClick}
      style={{ visibility: isHidden ? 'hidden' : 'visible' }}
    >
      <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />

      {/* Name Banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2 md:p-3 pt-6 md:pt-10 text-center">
        <h3 className="font-bold text-sm md:text-xl text-white leading-tight drop-shadow-lg">{card.name}</h3>
        {/* Bible Reference (small) */}
        {card.bibleRef && (
          <p className="text-yellow-300/80 text-xs md:text-sm mt-0.5 truncate">
            {card.bibleRef}
          </p>
        )}
      </div>

      {/* Year Banner */}
      {shouldShowYear && (
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 ${isStudyMode ? 'bg-green-500/90' : 'bg-blue-500/90'} backdrop-blur-sm rounded-md px-2 py-1 md:px-4 md:py-2 shadow-md z-10`}>
            <p className="text-lg md:text-3xl text-white font-extrabold drop-shadow-md" style={{fontFamily: "'Trajan Pro', serif"}}>{cardYearText}</p>
        </div>
      )}

      {/* Study Mode Indicator */}
      {isStudyMode && !showYear && (
        <div className="absolute top-2 right-2 bg-green-500/90 rounded-full p-1.5 shadow-md z-10">
          <span className="text-white text-xs">📚</span>
        </div>
      )}
    </div>
  );
});

export default Card;
