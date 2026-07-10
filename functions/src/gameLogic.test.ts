import { describe, expect, it } from 'vitest';
import {
  applyRealtimeMove,
  applyTurnBasedMove,
  dealCards,
  getInitialHandSize,
  type GameCard,
  type RealtimeGameState,
  type TurnBasedGameState,
} from './gameLogic';

const card = (id: number, year = id): GameCard => ({ id, name: `Carta ${id}`, year, imageUrl: `/card-${id}.png` });

describe('authoritative game logic', () => {
  it('adapts the initial hand to small thematic decks', () => {
    expect(getInitialHandSize(8, 2)).toBe(3);
    expect(getInitialHandSize(8, 6)).toBe(1);
    expect(dealCards(Array.from({ length: 8 }, (_, index) => card(index + 1)), ['a', 'b'], 4, () => 0).handSize).toBe(3);
  });

  it('never awards a realtime win after an incorrect final card', () => {
    const state: RealtimeGameState = {
      players: [
        { id: 'a', name: 'A', hand: [card(1, 10)], isAI: false },
        { id: 'b', name: 'B', hand: [card(2, 20)], isAI: false },
      ],
      timeline: [card(3, 30)],
      deck: [],
      discardPile: [],
      currentPlayerIndex: 0,
      winner: null,
      phase: 'PLAYING',
      message: null,
      moveCount: 0,
      moveStats: {},
    };

    const next = applyRealtimeMove(state, 'a', 1, 1, () => 0);
    expect(next.phase).toBe('PLAYING');
    expect(next.players[0].hand).toHaveLength(1);
    expect(next.moveStats.a).toEqual({ placed: 1, correct: 0, incorrect: 1 });
  });

  it('finishes a turn-based game only after a correct final placement', () => {
    const state: TurnBasedGameState = {
      players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      timeline: [card(1, 10)],
      deck: [],
      discardPile: [],
      playerHands: { a: [card(2, 20)], b: [card(3, 30)] },
      currentTurnPlayerId: 'a',
      winnerId: null,
      status: 'active',
      moveCount: 0,
      moveStats: {},
    };

    const next = applyTurnBasedMove(state, 'a', 2, 1, () => 0);
    expect(next.status).toBe('finished');
    expect(next.winnerId).toBe('a');
  });
});
