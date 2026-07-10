import { describe, expect, it } from 'vitest';
import { deckService } from './deckService';

describe('deckService capacity', () => {
  it('keeps four cards when the selected deck has enough capacity', () => {
    expect(deckService.getInitialHandSize('complete', 6)).toBe(4);
  });

  it('adapts the hand for small thematic decks', () => {
    expect(deckService.getInitialHandSize('early_church', 2)).toBe(3);
    expect(deckService.getInitialHandSize('early_church', 6)).toBe(1);
  });
});
