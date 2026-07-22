import type { GameGrid } from './grid.js';

/** Letters + mask of cells that count for cross-word scoring (locked or prefilled) */
export function gridForScoring(grid: GameGrid): {
  letters: string[][];
  scorable: boolean[][];
} {
  return {
    letters: grid.cells.map((row) => row.map((c) => c.letter)),
    scorable: grid.cells.map((row) =>
      row.map(
        (c) =>
          (c.state === 'locked' || c.state === 'prefilled') && c.letter.length > 0,
      ),
    ),
  };
}
