import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../types';
import { drawReplacementCard } from './drawReplacementCard';

const card = (id: number): Card => ({
  id,
  name: `Carta ${id}`,
  year: id,
  imageUrl: `/card-${id}.png`,
});

describe('drawReplacementCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws from the top of an existing deck and preserves the discard pile', () => {
    const result = drawReplacementCard([card(1), card(2)], [card(3)]);

    expect(result.drawnCard?.id).toBe(2);
    expect(result.deck.map(item => item.id)).toEqual([1]);
    expect(result.discardPile.map(item => item.id)).toEqual([3]);
  });

  it('recycles the discard pile when the deck is empty without losing cards', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = drawReplacementCard([], [card(3), card(4)]);
    const remainingIds = [...result.deck.map(item => item.id), result.drawnCard?.id]
      .filter((id): id is number => id !== undefined)
      .sort((a, b) => a - b);

    expect(remainingIds).toEqual([3, 4]);
    expect(result.discardPile).toEqual([]);
    expect(result.drawnCard).not.toBeNull();
  });

  it('returns an explicit empty result when there are no cards anywhere', () => {
    expect(drawReplacementCard([], [])).toEqual({
      drawnCard: null,
      deck: [],
      discardPile: [],
    });
  });
});
