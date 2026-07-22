/** Worker scoring — uses shared word finder */
import type { ScoreBreakdown } from '../../shared/types.js';
import { findScoringWords, MIN_WORD_LENGTH } from '../../shared/word-finder.js';

export { findScoringWords };

export function scoreGrid(
  grid: string[][],
  dict: Set<string>,
): { score: number; breakdown: ScoreBreakdown[] } {
  const breakdown = findScoringWords(grid, dict, { minLength: MIN_WORD_LENGTH });
  const score = breakdown.reduce((s, w) => s + w.score, 0);
  return { score, breakdown };
}
