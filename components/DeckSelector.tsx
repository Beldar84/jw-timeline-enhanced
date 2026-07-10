import React, { useState } from 'react';
import { deckService, Deck } from '../services/deckService';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — DeckSelector premium (diseño 4a)
// Sustituye components/DeckSelector.tsx. Misma API y lógica
// Mazos temáticos disponibles con reparto adaptativo según su tamaño.
// con estrellas de dificultad; iconos de línea en vez de emojis.
// Requiere public/premium.css.
// ============================================================

interface DeckSelectorProps {
  onSelectDeck: (deckId: string) => void;
  onBack: () => void;
}

const stroke = '#8a6a2a';

// Iconos de línea por mazo (geometría simple)
const DECK_ICONS: Record<string, React.ReactNode> = {
  complete: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5c-2-1.5-4.5-2-8-2v16c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V3c-3.5 0-6 .5-8 2z" /><line x1="12" y1="5" x2="12" y2="21" />
    </svg>
  ),
  old_testament: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20L9 8l4 7 3-4 5 9H3z" />
    </svg>
  ),
  new_testament: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="16" rx="1" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  ),
  patriarchs: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="7" r="3.5" /><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    </svg>
  ),
  kings: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18L5.5 8l4 4L12 6l2.5 6 4-4L20 18H4z" />
    </svg>
  ),
  jesus: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 3" />
    </svg>
  ),
  early_church: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4 0-6-3-6-6 0-4 4-6 4-9 2 2 1 4 1 4s3-2 3-6c3 3 4 6.5 4 9.5 0 4-2 7.5-6 7.5z" />
    </svg>
  ),
  creation: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  exile: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
      <line x1="4" y1="20" x2="20" y2="20" /><line x1="6" y1="20" x2="6" y2="8" /><line x1="12" y1="20" x2="12" y2="8" /><line x1="18" y1="20" x2="18" y2="8" /><path d="M4 8h16l-2-4H6l-2 4z" />
    </svg>
  ),
};

const FallbackIcon = DECK_ICONS.complete;

const difficultyStars = (difficulty: string): string =>
  difficulty === 'hard' ? '★★★' : difficulty === 'medium' ? '★★' : '★';

const DeckSelector: React.FC<DeckSelectorProps> = ({ onSelectDeck, onBack }) => {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const decks = deckService.getAllDecks();

  const handleDeckClick = (deck: Deck) => {
    soundService.playClick();
    setSelectedDeck(deck);
  };

  const handleConfirm = () => {
    if (selectedDeck) {
      soundService.playClick();
      onSelectDeck(selectedDeck.id);
    }
  };

  const handleBackClick = () => {
    soundService.playClick();
    onBack();
  };

  return (
    <div className="parchment-panel w-full max-w-4xl px-8 md:px-10 py-8 max-h-[90vh] overflow-y-auto flex flex-col">
      <h2 className="font-display font-bold text-2xl md:text-[26px] text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>
        Selecciona un mazo
      </h2>
      <p className="font-body italic text-base text-center m-0 mb-6" style={{ color: 'var(--gold-dark)' }}>
        El reparto se adapta automáticamente al tamaño de cada mazo
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {decks.map((deck) => {
          const isSelected = selectedDeck?.id === deck.id;
          return (
            <button
              key={deck.id}
              onClick={() => handleDeckClick(deck)}
              className="relative p-4 pb-3.5 rounded-sm text-left transition-all cursor-pointer font-body"
              style={isSelected
                ? { background: 'rgba(201,162,39,.12)', border: '2px solid #a8853c', boxShadow: '0 0 18px rgba(201,162,39,.25)' }
                : { background: 'none', border: '1px solid rgba(120,94,48,.3)' }}
            >
              <span className="absolute top-2.5 right-2.5 font-display text-[10px] tracking-widest" style={{ color: 'var(--gold-dark)' }}>
                {difficultyStars(deck.difficulty)}
              </span>
              {DECK_ICONS[deck.id] || FallbackIcon}
              <h3 className="font-display font-semibold text-[15px] m-0 mt-2 mb-0.5" style={{ color: 'var(--ink)' }}>{deck.name}</h3>
              <p className="font-body text-[13.5px] m-0" style={{ color: '#7c6a48' }}>
                {deck.description} · {deck.cards.length} cartas
              </p>
              <p className="font-display text-[11px] tracking-widest m-0 mt-2"
                style={{ color: 'var(--gold-dark)' }}>
                {isSelected ? '✓ SELECCIONADO' : 'DISPONIBLE'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={handleBackClick}
          className="flex-1 py-3 font-display text-sm tracking-wider rounded-sm cursor-pointer transition-colors"
          style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
          VOLVER
        </button>
        <button onClick={handleConfirm} disabled={!selectedDeck}
          className="btn-gold flex-1 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          CONTINUAR
        </button>
      </div>
    </div>
  );
};

export default DeckSelector;
