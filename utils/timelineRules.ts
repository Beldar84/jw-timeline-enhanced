import { Card } from '../types';

export interface TimelineMove {
  card: Card;
  timelineIndex: number;
}

export function canPlaceCard(card: Card, timeline: Card[], timelineIndex: number): boolean {
  if (!Number.isInteger(timelineIndex) || timelineIndex < 0 || timelineIndex > timeline.length) {
    return false;
  }

  const previousCard = timeline[timelineIndex - 1];
  const nextCard = timeline[timelineIndex];

  const isAfterPrevious = !previousCard || card.year >= previousCard.year;
  const isBeforeNext = !nextCard || card.year <= nextCard.year;

  return isAfterPrevious && isBeforeNext;
}

export function getValidTimelineMoves(hand: Card[], timeline: Card[]): TimelineMove[] {
  const moves: TimelineMove[] = [];

  for (const card of hand) {
    for (let timelineIndex = 0; timelineIndex <= timeline.length; timelineIndex++) {
      if (canPlaceCard(card, timeline, timelineIndex)) {
        moves.push({ card, timelineIndex });
      }
    }
  }

  return moves;
}
