import { describe, expect, it } from 'vitest';
import { applyLetterToActiveRow, createGrid, getRowWord } from './grid.js';

describe('applyLetterToActiveRow', () => {
  it('skips a keystroke when it matches the next fixed letter', () => {
    let grid = createGrid({ rows: 5, cols: 5 }, [{ row: 0, col: 1, letter: 'E' }]);

    for (const ch of 'gears') {
      grid = applyLetterToActiveRow(grid, ch);
    }

    expect(getRowWord(grid, 0)).toBe('GEARS');
  });

  it('places a mismatched keystroke in the next editable cell', () => {
    let grid = createGrid({ rows: 5, cols: 5 }, [{ row: 0, col: 1, letter: 'E' }]);

    for (const ch of 'gxars') {
      grid = applyLetterToActiveRow(grid, ch);
    }

    expect(getRowWord(grid, 0)).toBe('GEXAR');
  });

  it('skips multiple matching fixed letters in order', () => {
    let grid = createGrid(
      { rows: 5, cols: 5 },
      [
        { row: 0, col: 0, letter: 'G' },
        { row: 0, col: 2, letter: 'A' },
      ],
    );

    for (const ch of 'gear') {
      grid = applyLetterToActiveRow(grid, ch);
    }

    expect(getRowWord(grid, 0)).toBe('GEAR');
  });
});
