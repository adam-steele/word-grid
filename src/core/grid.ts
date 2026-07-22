import type { PrefilledCell, GridSize } from '@shared/types.js';

export type CellState = 'empty' | 'editing' | 'locked' | 'prefilled';

export interface GridCell {
  letter: string;
  state: CellState;
}

export interface GameGrid {
  size: GridSize;
  cells: GridCell[][];
  activeRow: number;
}

export function createGrid(size: GridSize, prefilled: PrefilledCell[] = []): GameGrid {
  const cells: GridCell[][] = Array.from({ length: size.rows }, () =>
    Array.from({ length: size.cols }, () => ({ letter: '', state: 'empty' as CellState })),
  );

  for (const { row, col, letter } of prefilled) {
    if (row < size.rows && col < size.cols) {
      cells[row]![col] = { letter: letter.toUpperCase(), state: 'prefilled' };
    }
  }

  return { size, cells, activeRow: 0 };
}

export function getRowWord(grid: GameGrid, row: number): string {
  return grid.cells[row]!.map((c) => c.letter).join('');
}

export function canEditCell(grid: GameGrid, row: number, col: number): boolean {
  if (row !== grid.activeRow) return false;
  return grid.cells[row]![col]!.state !== 'prefilled';
}

export function setCellLetter(
  grid: GameGrid,
  row: number,
  col: number,
  letter: string,
): GameGrid {
  if (!canEditCell(grid, row, col)) return grid;
  const cells = grid.cells.map((r, ri) =>
    r.map((c, ci) =>
      ri === row && ci === col
        ? { ...c, letter: letter.toUpperCase(), state: 'editing' as CellState }
        : c,
    ),
  );
  return { ...grid, cells };
}

export function clearCell(grid: GameGrid, row: number, col: number): GameGrid {
  if (!canEditCell(grid, row, col)) return grid;
  const cells = grid.cells.map((r, ri) =>
    r.map((c, ci) =>
      ri === row && ci === col ? { ...c, letter: '', state: 'empty' as CellState } : c,
    ),
  );
  return { ...grid, cells };
}

export function lockRow(grid: GameGrid): GameGrid {
  const row = grid.activeRow;
  const cells = grid.cells.map((r, ri) =>
    r.map((c) => {
      if (ri !== row) return c;
      if (c.state === 'prefilled') return c;
      return { ...c, state: 'locked' as CellState };
    }),
  );
  return {
    ...grid,
    cells,
    activeRow: Math.min(row + 1, grid.size.rows),
  };
}

export function gridToLetters(grid: GameGrid): string[][] {
  return grid.cells.map((row) => row.map((c) => c.letter));
}

export function applyLetterToActiveRow(grid: GameGrid, letter: string): GameGrid {
  const row = grid.activeRow;
  const upper = letter.toUpperCase();

  for (let c = 0; c < grid.size.cols; c++) {
    const cell = grid.cells[row]![c]!;

    if (cell.state === 'prefilled') {
      if (cell.letter === upper) return grid;
      continue;
    }

    if (cell.letter) continue;

    return setCellLetter(grid, row, c, upper);
  }

  return grid;
}

export function isGridComplete(grid: GameGrid): boolean {
  return grid.activeRow >= grid.size.rows;
}
