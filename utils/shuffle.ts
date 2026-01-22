/**
 * Fisher-Yates (Knuth) shuffle algorithm
 * Provides a truly uniform random permutation of the array
 *
 * The previous implementation using sort(() => Math.random() - 0.5) is biased
 * and doesn't produce a uniform distribution
 */
export function shuffleArray<T>(array: T[]): T[] {
  // Create a copy to avoid mutating the original array
  const result = [...array];

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at positions i and j
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Shuffle array in place (mutates the original)
 */
export function shuffleArrayInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
