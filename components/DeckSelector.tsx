import React, { useState } from 'react';
import { deckService, Deck } from '../services/deckService';
import { soundService } from '../services/soundService';

interface DeckSelectorProps {
  onSelectDeck: (deckId: string) => void;
  onBack: () => void;
}

const DeckSelector: React.FC<DeckSelectorProps> = ({ onSelectDeck, onBack }) => {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const decks = deckService.getAllDecks();

  const handleDeckClick = (deck: Deck) => {
    // Only allow "Biblia Completa" deck to be selected
    if (deck.id !== 'complete') {
      return; // Disabled deck, do nothing
    }
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
    <div className="w-full max-w-6xl bg-gray-800/50 p-4 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm">
      <h2 className="text-2xl md:text-4xl font-bold text-center text-yellow-200 mb-6" style={{fontFamily: "'Trajan Pro', serif"}}>
        Selecciona un Mazo
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-[60vh] overflow-y-auto p-2 pb-8">
        {decks.map((deck) => {
          const colors = deckService.getColorClasses(deck.color);
          const difficultyInfo = deckService.getDifficultyInfo(deck.difficulty);
          const isSelected = selectedDeck?.id === deck.id;
          const isDisabled = deck.id !== 'complete'; // Disable all except "Biblia Completa"

          return (
            <button
              key={deck.id}
              onClick={() => handleDeckClick(deck)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-lg transition-all transform
                ${isDisabled
                  ? 'bg-gray-800 border-2 border-gray-700 opacity-50 cursor-not-allowed grayscale'
                  : isSelected
                    ? `${colors.bg} scale-105 shadow-xl border-4 ${colors.border}`
                    : 'bg-gray-700 hover:bg-gray-600 border-2 border-gray-600'
                }
              `}
            >
              {/* Difficulty Badge */}
              <div className={`absolute top-2 right-2 ${difficultyInfo.color} px-2 py-1 rounded text-xs font-bold`}>
                {difficultyInfo.icon}
              </div>

              {/* Icon */}
              <div className="text-5xl mb-2">{deck.icon}</div>

              {/* Name */}
              <h3 className="text-lg font-bold text-white mb-2">{deck.name}</h3>

              {/* Description */}
              <p className="text-sm text-gray-300 mb-2">{deck.description}</p>

              {/* Card Count */}
              <p className="text-xs text-gray-400">
                {deck.cards.length} cartas
              </p>

              {/* Disabled Badge */}
              {isDisabled && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 px-3 py-1 rounded-full text-xs font-bold">
                  🔒 No disponible
                </div>
              )}

              {/* Selected Indicator */}
              {isSelected && !isDisabled && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <span className="text-2xl">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Deck Preview */}
      {selectedDeck && (
        <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{selectedDeck.icon}</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-200">{selectedDeck.name}</h3>
              <p className="text-sm text-gray-300">{selectedDeck.description}</p>
              <div className="flex gap-2 mt-2">
                <span className={`${deckService.getDifficultyInfo(selectedDeck.difficulty).color} px-2 py-1 rounded text-xs font-bold`}>
                  {deckService.getDifficultyInfo(selectedDeck.difficulty).label}
                </span>
                <span className="bg-gray-600 px-2 py-1 rounded text-xs font-bold">
                  {selectedDeck.cards.length} cartas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleBackClick}
          className="flex-1 px-6 py-3 bg-gray-600 text-lg font-bold rounded-lg hover:bg-gray-700 transition"
        >
          Volver
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selectedDeck}
          className={`
            flex-1 px-6 py-3 text-lg font-bold rounded-lg transition transform
            ${selectedDeck
              ? 'bg-green-600 hover:bg-green-700 hover:scale-105'
              : 'bg-gray-500 cursor-not-allowed opacity-50'
            }
          `}
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

export default DeckSelector;
