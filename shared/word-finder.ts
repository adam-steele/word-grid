import type { Direction } from './scoring.js';
import type { ScoreBreakdown } from './types.js';
import { scoreWord } from './scoring.js';

export const MIN_WORD_LENGTH = 3;

/** Vertical/diagonal: only the longest valid word per contiguous segment scores */
const LONGEST_ONLY_DIRECTIONS: Set<Direction> = new Set(['vertical', 'diagonal']);

export interface GridCell {
  row: number;
  col: number;
}

export interface ScoringOptions {
  /** If set, only filled cells marked true form words (locked/prefilled rows) */
  scorable?: boolean[][];
  minLength?: number;
}

interface LineSpec {
  direction: Direction;
  cells: GridCell[];
}

function isScorable(
  row: number,
  col: number,
  scorable: boolean[][] | undefined,
): boolean {
  if (!scorable) return true;
  return scorable[row]?.[col] === true;
}

function lineToString(grid: string[][], cells: GridCell[]): string {
  return cells.map(({ row, col }) => grid[row]![col]!).join('');
}

/** Split a line into contiguous runs of scorable, filled cells */
function contiguousSegments(
  cells: GridCell[],
  grid: string[][],
  scorable: boolean[][] | undefined,
  minLength: number,
): GridCell[][] {
  const segments: GridCell[][] = [];
  let current: GridCell[] = [];

  for (const cell of cells) {
    const letter = grid[cell.row]?.[cell.col];
    const ok = letter && isScorable(cell.row, cell.col, scorable);
    if (ok) {
      current.push(cell);
    } else {
      if (current.length >= minLength) segments.push(current);
      current = [];
    }
  }
  if (current.length >= minLength) segments.push(current);

  return segments;
}

function findWordsInSegment(
  grid: string[][],
  cells: GridCell[],
  direction: Direction,
  dict: Set<string>,
  minLength: number,
): ScoreBreakdown[] {
  const text = lineToString(grid, cells);
  if (text.length < minLength) return [];

  const results: ScoreBreakdown[] = [];
  for (let start = 0; start < text.length; start++) {
    for (let end = start + minLength; end <= text.length; end++) {
      const word = text.slice(start, end).toUpperCase();
      if (!dict.has(word)) continue;
      results.push({
        word,
        direction,
        score: scoreWord(word, direction),
        cells: cells.slice(start, end),
      });
    }
  }

  if (LONGEST_ONLY_DIRECTIONS.has(direction)) {
    return longestWordsOnly(results);
  }

  // Horizontal locked rows: only the full-row word scores
  if (direction === 'horizontal' && results.length) {
    const full = results.find((w) => w.cells.length === cells.length);
    return full ? [full] : longestWordsOnly(results);
  }

  return results;
}

function longestWordsOnly(words: ScoreBreakdown[]): ScoreBreakdown[] {
  if (!words.length) return [];
  const maxLen = Math.max(...words.map((w) => w.word.length));
  return words.filter((w) => w.word.length === maxLen);
}

function cellsKey(cells: GridCell[]): string {
  return cells
    .map((c) => `${c.row},${c.col}`)
    .sort()
    .join('|');
}

function dedupeWords(words: ScoreBreakdown[]): ScoreBreakdown[] {
  const seen = new Set<string>();
  return words.filter((w) => {
    const key = `${w.direction === 'diagonal' ? 'D' : w.direction[0]}:${cellsKey(w.cells)}:${w.word}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function horizontalLines(rows: number, cols: number): LineSpec[] {
  const lines: LineSpec[] = [];
  for (let row = 0; row < rows; row++) {
    lines.push({
      direction: 'horizontal',
      cells: Array.from({ length: cols }, (_, col) => ({ row, col })),
    });
  }
  return lines;
}

function verticalLines(rows: number, cols: number): LineSpec[] {
  const lines: LineSpec[] = [];
  for (let col = 0; col < cols; col++) {
    lines.push({
      direction: 'vertical',
      cells: Array.from({ length: rows }, (_, row) => ({ row, col })),
    });
  }
  return lines;
}

/** Down-right (↘) and down-left (↙) diagonals only — one canonical line each */
function diagonalLines(rows: number, cols: number): LineSpec[] {
  const lines: LineSpec[] = [];
  const seen = new Set<string>();

  for (const [dr, dc] of [
    [1, 1],
    [1, -1],
  ] as const) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const prevRow = row - dr;
        const prevCol = col - dc;
        if (prevRow >= 0 && prevRow < rows && prevCol >= 0 && prevCol < cols) continue;

        const cells: GridCell[] = [];
        let r = row;
        let c = col;
        while (r >= 0 && r < rows && c >= 0 && c < cols) {
          cells.push({ row: r, col: c });
          r += dr;
          c += dc;
        }

        if (cells.length < MIN_WORD_LENGTH) continue;
        const key = cellsKey(cells);
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push({ direction: 'diagonal', cells });
      }
    }
  }

  return lines;
}

export function findScoringWords(
  grid: string[][],
  dict: Set<string>,
  options: ScoringOptions = {},
): ScoreBreakdown[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols) return [];

  const minLength = options.minLength ?? MIN_WORD_LENGTH;
  const scorable = options.scorable;

  const lines: LineSpec[] = [
    ...horizontalLines(rows, cols),
    ...verticalLines(rows, cols),
    ...diagonalLines(rows, cols),
  ];

  const all: ScoreBreakdown[] = [];
  for (const line of lines) {
    const segments = contiguousSegments(line.cells, grid, scorable, minLength);
    for (const segment of segments) {
      all.push(...findWordsInSegment(grid, segment, line.direction, dict, minLength));
    }
  }

  return dedupeWords(all);
}

export type HighlightKind = 'vertical' | 'diagonal' | 'horizontal' | 'vertical-diagonal' | 'none';

/** Classify how each cell is highlighted */
export function buildHighlightMap(
  breakdown: ScoreBreakdown[],
): Map<string, HighlightKind> {
  const dirs = new Map<string, Set<Direction>>();

  for (const entry of breakdown) {
    for (const { row, col } of entry.cells) {
      const key = `${row},${col}`;
      if (!dirs.has(key)) dirs.set(key, new Set());
      dirs.get(key)!.add(entry.direction);
    }
  }

  const result = new Map<string, HighlightKind>();
  for (const [key, set] of dirs) {
    const hasV = set.has('vertical');
    const hasD = set.has('diagonal');
    const hasH = set.has('horizontal');
    if (hasV && hasD) result.set(key, 'vertical-diagonal');
    else if (hasV) result.set(key, 'vertical');
    else if (hasD) result.set(key, 'diagonal');
    else if (hasH) result.set(key, 'horizontal');
    else result.set(key, 'none');
  }
  return result;
}
