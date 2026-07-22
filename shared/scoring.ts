import type { ScoreBreakdown, ScoreResult } from './types.js';

/** Scrabble letter values — shared by client and worker */
export const SCRABBLE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

export const DIRECTION_MULTIPLIERS = {
  horizontal: 1.0,
  vertical: 1.5,
  diagonal: 2.0,
} as const;

export type Direction = keyof typeof DIRECTION_MULTIPLIERS;

export function letterScore(word: string): number {
  return [...word.toUpperCase()].reduce(
    (sum, ch) => sum + (SCRABBLE_VALUES[ch] ?? 0),
    0,
  );
}

export function getLetterPoints(letter: string): number {
  return SCRABBLE_VALUES[letter.toUpperCase()] ?? 0;
}

export function scoreWord(word: string, direction: Direction): number {
  const len = word.length;
  const base = letterScore(word) + len * len;
  return Math.round(base * DIRECTION_MULTIPLIERS[direction]);
}

export function scoreWords(words: ScoreBreakdown[]): ScoreResult {
  const total = words.reduce((sum, w) => sum + w.score, 0);
  return { total, breakdown: words };
}
