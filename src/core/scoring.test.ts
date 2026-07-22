import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findScoringWords, MIN_WORD_LENGTH } from '@shared/word-finder.js';
import { computeGridScoreFromLetters } from './scorer.js';
import { scoreWord, letterScore } from '@shared/scoring.js';
import { validateRowForLock } from './validator.js';
import { createGrid, lockRow, setCellLetter } from './grid.js';
import { gridForScoring } from './scoring-grid.js';

const dict = new Set(['CAT', 'CAR', 'TEA', 'EAT', 'ATE', 'TEAR', 'RATE', 'ART']);

function loadCombinedScoringDict(lengths: number[]): Set<string> {
  const combined = new Set<string>();
  for (const len of lengths) {
    const words = JSON.parse(
      readFileSync(`public/dictionary/scoring/${len}.json`, 'utf8'),
    ) as string[];
    for (const w of words) combined.add(w);
  }
  return combined;
}

describe('scoring', () => {
  it('applies scrabble letter values', () => {
    expect(letterScore('CAT')).toBe(5);
  });

  it('applies direction multipliers', () => {
    expect(scoreWord('CAT', 'horizontal')).toBeLessThan(scoreWord('CAT', 'vertical'));
    expect(scoreWord('CAT', 'vertical')).toBeLessThan(scoreWord('CAT', 'diagonal'));
  });
});

describe('word-finder', () => {
  it('requires minimum 3 letter words', () => {
    const grid = [['A', 'T']];
    const extended = new Set([...dict, 'AT']);
    const words = findScoringWords(grid, extended, { minLength: MIN_WORD_LENGTH });
    expect(words.some((w) => w.word === 'AT')).toBe(false);
  });

  it('finds horizontal words', () => {
    const grid = [['C', 'A', 'T']];
    const words = findScoringWords(grid, dict);
    expect(words.some((w) => w.word === 'CAT' && w.direction === 'horizontal')).toBe(true);
  });

  it('finds vertical words', () => {
    const grid = [
      ['C', 'X', 'X'],
      ['A', 'X', 'X'],
      ['T', 'X', 'X'],
    ];
    const words = findScoringWords(grid, dict);
    expect(words.some((w) => w.word === 'CAT' && w.direction === 'vertical')).toBe(true);
  });

  it('does not connect letters across empty cells', () => {
    const grid = [
      ['A', 'X'],
      ['', 'X'],
      ['E', 'X'],
    ];
    const extended = new Set([...dict, 'AE', 'ARE']);
    const scorable = [
      [true, false],
      [false, false],
      [true, false],
    ];
    const words = findScoringWords(grid, extended, { scorable, minLength: 3 });
    expect(words.some((w) => w.word === 'AE')).toBe(false);
  });

  it('keeps only longest word per column', () => {
    const grid = [
      ['A', 'N'],
      ['N', 'E'],
      ['G', 'E'],
      ['E', 'D'],
      ['R', 'X'],
    ];
    const extended = new Set([...dict, 'ANGER', 'NEED', 'AN', 'GE']);
    const words = findScoringWords(grid, extended);
    const vertical = words.filter((w) => w.direction === 'vertical');
    expect(vertical.some((w) => w.word === 'ANGER')).toBe(true);
    expect(vertical.some((w) => w.word === 'NEED')).toBe(true);
    expect(vertical.some((w) => w.word === 'AN')).toBe(false);
  });

  it('dedupes bidirectional diagonal words', () => {
    const grid = [
      ['D', 'X', 'X'],
      ['X', 'A', 'X'],
      ['X', 'X', 'D'],
    ];
    const extended = new Set([...dict, 'DAD']);
    const words = findScoringWords(grid, extended);
    const dad = words.filter((w) => w.word === 'DAD' && w.direction === 'diagonal');
    expect(dad).toHaveLength(1);
  });

  it('ignores invalid words', () => {
    const grid = [['X', 'Y', 'Z']];
    expect(findScoringWords(grid, dict)).toHaveLength(0);
  });
});

describe('example ANGER grid', () => {
  const letters = [
    ['A', 'N', 'G', 'E', 'R'],
    ['N', 'E', 'R', 'D', 'S'],
    ['G', 'E', 'A', 'R', 'S'],
    ['E', 'D', 'I', 'T', 'S'],
    ['R', 'E', 'N', 'T', 'S'],
    ['S', 'E', 'N', 'S', 'E'],
  ];

  it('finds longest vertical ANGERS, NEED, GRAIN with NWL dictionary', () => {
    const combined = loadCombinedScoringDict([3, 4, 5, 6]);
    const words = findScoringWords(letters, combined);
    const vertical = words.filter((w) => w.direction === 'vertical').map((w) => w.word);
    expect(vertical).toContain('ANGERS');
    expect(vertical).toContain('NEED');
    expect(vertical).toContain('GRAIN');
  });
});

describe('validator', () => {
  it('requires full row of valid word', () => {
    let grid = createGrid({ rows: 1, cols: 3 });
    grid = setCellLetter(grid, 0, 0, 'C');
    grid = setCellLetter(grid, 0, 1, 'A');
    grid = setCellLetter(grid, 0, 2, 'T');
    expect(validateRowForLock(grid, dict).valid).toBe(true);
  });
});

describe('grid lock flow', () => {
  it('advances active row after lock', () => {
    let grid = createGrid({ rows: 3, cols: 3 });
    grid = setCellLetter(grid, 0, 0, 'C');
    grid = setCellLetter(grid, 0, 1, 'A');
    grid = setCellLetter(grid, 0, 2, 'T');
    grid = lockRow(grid);
    expect(grid.activeRow).toBe(1);
    expect(grid.cells[0]![0]!.state).toBe('locked');
  });

  it('only scores locked cells for cross-words', () => {
    let grid = createGrid({ rows: 3, cols: 3 });
    grid = setCellLetter(grid, 0, 0, 'C');
    grid = setCellLetter(grid, 0, 1, 'A');
    grid = setCellLetter(grid, 0, 2, 'T');
    grid = lockRow(grid);
    grid = setCellLetter(grid, 1, 0, 'X');
    const { scorable } = gridForScoring(grid);
    expect(scorable[0]!.every(Boolean)).toBe(true);
    expect(scorable[1]![0]).toBe(false);
  });
});

describe('grid scoring', () => {
  it('scores complete grid from letters', () => {
    const grid = [['C', 'A', 'T']];
    const result = computeGridScoreFromLetters(grid, dict);
    expect(result.total).toBeGreaterThan(0);
  });
});
