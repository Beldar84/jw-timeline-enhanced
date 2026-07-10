import { Card } from '../types';
import { shuffleArray } from './shuffle';

export interface ReplacementDraw {
  drawnCard: Card | null;
  deck: Card[];
  discardPile: Card[];
}

/**
 * Draws the penalty card after an incorrect placement.
 *
 * When the draw pile is empty, the discard pile is recycled first. This keeps
 * an incorrect final card from being treated as a win and guarantees that the
 * game can continue without duplicating or losing cards.
 */
export function drawReplacementCard(deck: Card[], discardPile: Card[]): ReplacementDraw {
  const recycledDiscard = deck.length === 0;
  const nextDeck = recycledDiscard ? shuffleArray(discardPile) : [...deck];
  const drawnCard = nextDeck.pop() || null;

  return {
    drawnCard,
    deck: nextDeck,
    discardPile: recycledDiscard ? [] : [...discardPile],
  };
}
