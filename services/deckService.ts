import { Card } from '../types';
import { CARD_DATA } from '../data/cards';

export interface Deck {
  id: string;
  name: string;
  description: string;
  icon: string;
  cards: Card[];
  difficulty: 'easy' | 'medium' | 'hard';
  color: string; // For UI theming
}

class DeckService {
  private decks: Deck[] = [];

  constructor() {
    this.initializeDecks();
  }

  private initializeDecks(): void {
    // Complete Bible deck (all cards)
    this.decks.push({
      id: 'complete',
      name: 'Biblia Completa',
      description: 'Todos los eventos bíblicos desde la creación hasta los apóstoles',
      icon: '📖',
      cards: [...CARD_DATA],
      difficulty: 'hard',
      color: 'purple',
    });

    // Old Testament - Before Christ
    const oldTestamentCards = CARD_DATA.filter(card => card.year < 0);
    this.decks.push({
      id: 'old_testament',
      name: 'Antiguo Testamento',
      description: 'Desde la creación hasta el nacimiento de Jesús',
      icon: '⛰️',
      cards: oldTestamentCards,
      difficulty: 'medium',
      color: 'amber',
    });

    // New Testament - After Christ
    const newTestamentCards = CARD_DATA.filter(card => card.year >= 0);
    this.decks.push({
      id: 'new_testament',
      name: 'Nuevo Testamento',
      description: 'Vida de Jesús y los primeros cristianos',
      icon: '📜',
      cards: newTestamentCards,
      difficulty: 'easy',
      color: 'blue',
    });

    // Patriarchs (Before Moses)
    const patriarchCards = CARD_DATA.filter(card =>
      card.year < -1593 && card.year >= -4026
    );
    this.decks.push({
      id: 'patriarchs',
      name: 'Los Patriarcas',
      description: 'Desde Adán hasta Moisés',
      icon: '👴',
      cards: patriarchCards.length > 0 ? patriarchCards : oldTestamentCards.slice(0, 30),
      difficulty: 'medium',
      color: 'green',
    });

    // Kings and Prophets
    const kingsCards = CARD_DATA.filter(card =>
      card.year >= -1117 && card.year < -539
    );
    this.decks.push({
      id: 'kings',
      name: 'Reyes y Profetas',
      description: 'El reino de Israel y Judá',
      icon: '👑',
      cards: kingsCards.length > 0 ? kingsCards : oldTestamentCards.slice(30, 60),
      difficulty: 'medium',
      color: 'yellow',
    });

    // Jesus' Life
    const jesusCards = CARD_DATA.filter(card =>
      card.year >= -2 && card.year <= 33
    );
    this.decks.push({
      id: 'jesus',
      name: 'Vida de Jesús',
      description: 'Nacimiento, ministerio y resurrección de Jesús',
      icon: '🕊️',
      cards: jesusCards,
      difficulty: 'easy',
      color: 'sky',
    });

    // Early Church
    const churchCards = CARD_DATA.filter(card =>
      card.year > 33 && card.year <= 100
    );
    this.decks.push({
      id: 'early_church',
      name: 'Iglesia Primitiva',
      description: 'Los apóstoles y la expansión del cristianismo',
      icon: '🔥',
      cards: churchCards,
      difficulty: 'easy',
      color: 'indigo',
    });

    // Creation to Flood
    const creationCards = CARD_DATA.filter(card =>
      card.year <= -2370 && card.year >= -14000000000
    );
    this.decks.push({
      id: 'creation',
      name: 'Creación y Diluvio',
      description: 'Los primeros días de la humanidad',
      icon: '🌍',
      cards: creationCards,
      difficulty: 'hard',
      color: 'teal',
    });

    // Exile and Return
    const exileCards = CARD_DATA.filter(card =>
      card.year >= -625 && card.year <= -406
    );
    this.decks.push({
      id: 'exile',
      name: 'Exilio y Regreso',
      description: 'Babilonia y la reconstrucción de Jerusalén',
      icon: '🏛️',
      cards: exileCards,
      difficulty: 'medium',
      color: 'rose',
    });
  }

  // Get all available decks
  getAllDecks(): Deck[] {
    return this.decks;
  }

  // Get a deck by ID
  getDeckById(id: string): Deck | undefined {
    return this.decks.find(deck => deck.id === id);
  }

  // Get the default deck (complete Bible)
  getDefaultDeck(): Deck {
    return this.decks[0];
  }

  // Get decks by difficulty
  getDecksByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Deck[] {
    return this.decks.filter(deck => deck.difficulty === difficulty);
  }

  // Shuffle deck cards
  shuffleDeck(deckId: string): Card[] {
    const deck = this.getDeckById(deckId);
    if (!deck) return [];
    return [...deck.cards].sort(() => Math.random() - 0.5);
  }

  // Get color classes for Tailwind
  getColorClasses(color: string): { bg: string; hover: string; text: string; border: string } {
    const colorMap: Record<string, { bg: string; hover: string; text: string; border: string }> = {
      purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-100', border: 'border-purple-500' },
      amber: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-100', border: 'border-amber-500' },
      blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-100', border: 'border-blue-500' },
      green: { bg: 'bg-green-600', hover: 'hover:bg-green-700', text: 'text-green-100', border: 'border-green-500' },
      yellow: { bg: 'bg-yellow-600', hover: 'hover:bg-yellow-700', text: 'text-yellow-100', border: 'border-yellow-500' },
      sky: { bg: 'bg-sky-600', hover: 'hover:bg-sky-700', text: 'text-sky-100', border: 'border-sky-500' },
      indigo: { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-100', border: 'border-indigo-500' },
      teal: { bg: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-100', border: 'border-teal-500' },
      rose: { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-100', border: 'border-rose-500' },
    };
    return colorMap[color] || colorMap.purple;
  }

  // Get difficulty badge info
  getDifficultyInfo(difficulty: 'easy' | 'medium' | 'hard'): { label: string; color: string; icon: string } {
    const difficultyMap = {
      easy: { label: 'Fácil', color: 'bg-green-500', icon: '⭐' },
      medium: { label: 'Medio', color: 'bg-yellow-500', icon: '⭐⭐' },
      hard: { label: 'Difícil', color: 'bg-red-500', icon: '⭐⭐⭐' },
    };
    return difficultyMap[difficulty];
  }
}

export const deckService = new DeckService();
