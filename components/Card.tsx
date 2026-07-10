import React, { forwardRef } from 'react';
import { Card as CardType } from '../types';
import { CARD_BACK_URL } from '../data/cards';

// ============================================================
// JW Timeline — Card premium (diseño 2b) · handoff/Card.tsx
// Sustituye components/Card.tsx. Misma API de props (drop-in).
// Requiere public/premium.css cargado (clases .parchment-card,
// .torn-art, .font-display, .font-body, .year-chip).
// ============================================================

interface CardProps {
  card?: CardType;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlaceholder?: boolean;
  showYear?: boolean;
  isZoomed?: boolean;
  className?: string;
  isHidden?: boolean;
  isStudyMode?: boolean;
}

// Formato premium: "4026 a.e.c." / "33 e.c." (Cinzel, chip dorado)
export const formatYearPremium = (year: number): string => {
  if (year === -14000000000) return '14.000 M a.e.c.';
  const abs = Math.abs(year).toLocaleString('de-DE');
  return year < 0 ? `${abs} a.e.c.` : `${abs} e.c.`;
};

const Card = forwardRef<HTMLDivElement, CardProps>(({
  card, isFaceDown, onClick, isPlaceholder = false, showYear = false,
  isZoomed = false, className = '', isHidden = false, isStudyMode = false,
}, ref) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  if (isZoomed) {
    if (!card) return null;
    const showYearInZoom = showYear || isStudyMode;
    return (
      <div className="relative zoom-card-responsive max-w-[90vw] aspect-[500/734] parchment-card p-2 mb-4 flex flex-col">
        <div className="torn-art flex-1 min-h-0">
          <img
            src={card.imageUrl}
            alt={card.name}
            loading="eager"
            decoding="sync"
            crossOrigin="anonymous"
            style={{ height: '112%', width: '112%', objectFit: 'cover' }}
          />
        </div>
        <div className="text-center px-3 pt-3 pb-2">
          <h3 className="font-display font-semibold text-2xl md:text-3xl leading-tight" style={{ color: 'var(--ink)' }}>{card.name}</h3>
          {card.bibleRef && (
            <p className="font-body italic text-lg md:text-xl mt-1" style={{ color: 'var(--gold-dark)' }}>{card.bibleRef}</p>
          )}
          {showYearInZoom && (
            <p className="font-display font-bold text-base md:text-lg mt-1" style={{ color: 'var(--gold-dark)' }}>{formatYearPremium(card.year)}</p>
          )}
        </div>
      </div>
    );
  }

  const hasCustomSize = className.includes('w-') || className.includes('h-') || className.includes('card-responsive');
  const sizeClass = hasCustomSize ? '' : 'card-responsive';
  const selectableStyle = onClick ? 'cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl' : '';

  if (isPlaceholder || isFaceDown) {
    return (
      <div
        ref={ref}
        className={`relative flex-shrink-0 rounded-md overflow-hidden transition-transform duration-300 ${sizeClass} ${selectableStyle} ${className}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        style={{
          visibility: isHidden ? 'hidden' : 'visible',
          border: '1px solid rgba(201,162,39,.3)',
          boxShadow: '0 12px 28px rgba(0,0,0,.6)',
        }}
      >
        <img src={CARD_BACK_URL} alt="Reverso de la carta" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (!card) return null;

  const shouldShowYear = showYear || isStudyMode;

  return (
    <div
      ref={ref}
      className={`parchment-card flex-shrink-0 flex flex-col transition-transform duration-300 ${sizeClass} ${selectableStyle} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        visibility: isHidden ? 'hidden' : 'visible',
        padding: '6px 6px 0 6px',
        boxSizing: 'border-box',
        outline: isStudyMode ? '1px solid rgba(138,106,42,.6)' : undefined,
        outlineOffset: isStudyMode ? '2px' : undefined,
      }}
    >
      {/* Ilustración recortada con borde roto de papiro */}
      <div className="torn-art w-full" style={{ aspectRatio: '500/610' }}>
        <img src={card.imageUrl} alt={card.name} loading="lazy" decoding="async" />
      </div>

      {/* Nombre + referencia impresos en el marco */}
      <div className="text-center" style={{ padding: '6px 3px 8px 3px' }}>
        <p className="font-display font-semibold leading-tight" style={{ color: 'var(--ink)', fontSize: 'clamp(11px, 1.05vw, 14px)' }}>
          {card.name}
        </p>
        {card.bibleRef && (
          <p className="font-body italic truncate" style={{ color: 'var(--gold-dark)', fontSize: 'clamp(10px, .9vw, 12.5px)', marginTop: '1px' }}>
            {card.bibleRef}
          </p>
        )}
        {shouldShowYear && (
          <p className="font-display font-bold" style={{ color: 'var(--gold-dark)', fontSize: 'clamp(11px, 1vw, 13px)', letterSpacing: '.04em', marginTop: '2px' }}>
            {formatYearPremium(card.year)}
          </p>
        )}
      </div>
    </div>
  );
});

export default Card;
