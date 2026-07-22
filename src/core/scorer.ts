import type { ScoreResult } from '@shared/types.js';
import type { GameGrid } from './grid.js';
import { gridForScoring } from './scoring-grid.js';
import { findScoringWords, MIN_WORD_LENGTH } from '@shared/word-finder.js';
import { scoreWords } from '@shared/scoring.js';

export function computeGridScore(grid: GameGrid, dict: Set<string>): ScoreResult {
  const { letters, scorable } = gridForScoring(grid);
  const breakdown = findScoringWords(letters, dict, {
    scorable,
    minLength: MIN_WORD_LENGTH,
  });
  return scoreWords(breakdown);
}

/** Words newly involving cells from the locked row */
export function computeRowDeltaScore(
  grid: GameGrid,
  dict: Set<string>,
  rowIndex: number,
): ScoreResult {
  const full = computeGridScore(grid, dict);
  const breakdown = full.breakdown.filter((w) =>
    w.cells.some((c) => c.row === rowIndex),
  );
  return scoreWords(breakdown);
}

/** @deprecated use computeGridScore(GameGrid) */
export function computeGridScoreFromLetters(
  grid: string[][],
  dict: Set<string>,
): ScoreResult {
  const breakdown = findScoringWords(grid, dict, { minLength: MIN_WORD_LENGTH });
  return scoreWords(breakdown);
}
