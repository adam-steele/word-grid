import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { computeGridScoreFromLetters } from '../../src/core/scorer.js';
import { scoreWord } from '../../shared/scoring.js';
import type { GridSize, PrefilledCell } from '../../shared/types.js';

export interface TierTemplate {
  tier: number;
  targetPassRate: number;
  gridSizes: GridSize[];
  prefillCount: [number, number];
  minPoolSize: number;
}

export const TIER_TEMPLATES: TierTemplate[] = [
  {
    tier: 1,
    targetPassRate: 0.875,
    gridSizes: [
      { rows: 6, cols: 5 },
      { rows: 5, cols: 5 },
      { rows: 5, cols: 4 },
      { rows: 7, cols: 5 },
    ],
    prefillCount: [0, 2],
    minPoolSize: 500,
  },
  {
    tier: 2,
    targetPassRate: 0.775,
    gridSizes: [
      { rows: 6, cols: 5 },
      { rows: 7, cols: 5 },
      { rows: 6, cols: 6 },
    ],
    prefillCount: [1, 2],
    minPoolSize: 350,
  },
  {
    tier: 3,
    targetPassRate: 0.685,
    gridSizes: [
      { rows: 6, cols: 5 },
      { rows: 7, cols: 5 },
      { rows: 6, cols: 6 },
    ],
    prefillCount: [2, 3],
    minPoolSize: 200,
  },
  {
    tier: 4,
    targetPassRate: 0.575,
    gridSizes: [
      { rows: 7, cols: 5 },
      { rows: 6, cols: 6 },
      { rows: 7, cols: 6 },
    ],
    prefillCount: [2, 3],
    minPoolSize: 120,
  },
  {
    tier: 5,
    targetPassRate: 0.475,
    gridSizes: [
      { rows: 7, cols: 6 },
      { rows: 6, cols: 6 },
      { rows: 8, cols: 5 },
    ],
    prefillCount: [3, 4],
    minPoolSize: 50,
  },
];

/** Levels 1–10 hand-crafted templates (tier 1). */
export const LEVELS_1_10: Array<{
  name: string;
  grid: GridSize;
  prefilled: PrefilledCell[];
}> = [
  { name: 'Warm Up', grid: { rows: 6, cols: 5 }, prefilled: [{ row: 0, col: 1, letter: 'E' }] },
  { name: 'Middle Vowel', grid: { rows: 6, cols: 5 }, prefilled: [{ row: 2, col: 1, letter: 'O' }] },
  { name: 'Bottom Row', grid: { rows: 6, cols: 5 }, prefilled: [{ row: 4, col: 2, letter: 'A' }] },
  { name: 'Compact', grid: { rows: 5, cols: 5 }, prefilled: [{ row: 0, col: 0, letter: 'S' }] },
  { name: 'Short Row', grid: { rows: 5, cols: 4 }, prefilled: [{ row: 1, col: 0, letter: 'T' }] },
  { name: 'Late Hint', grid: { rows: 6, cols: 5 }, prefilled: [{ row: 3, col: 3, letter: 'E' }] },
  {
    name: 'Twin Hints',
    grid: { rows: 7, cols: 5 },
    prefilled: [
      { row: 0, col: 1, letter: 'O' },
      { row: 3, col: 3, letter: 'E' },
    ],
  },
  {
    name: 'Spread',
    grid: { rows: 7, cols: 5 },
    prefilled: [
      { row: 1, col: 2, letter: 'A' },
      { row: 4, col: 0, letter: 'S' },
    ],
  },
  {
    name: 'Deep Grid',
    grid: { rows: 7, cols: 5 },
    prefilled: [
      { row: 2, col: 1, letter: 'O' },
      { row: 5, col: 1, letter: 'I' },
    ],
  },
  {
    name: 'Bookends',
    grid: { rows: 7, cols: 5 },
    prefilled: [
      { row: 0, col: 1, letter: 'E' },
      { row: 6, col: 2, letter: 'A' },
    ],
  },
];

export function loadRowDict(cols: number, dictDir: string): string[] {
  const path = join(dictDir, `${cols}.json`);
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as string[];
}

export function loadScoringDict(rows: number, cols: number, dictDir: string): Set<string> {
  const combined = new Set<string>();
  const maxLen = Math.max(rows, cols);
  for (let len = 3; len <= maxLen; len++) {
    const path = join(dictDir, 'scoring', `${len}.json`);
    if (!existsSync(path)) continue;
    for (const w of JSON.parse(readFileSync(path, 'utf8')) as string[]) combined.add(w);
  }
  return combined;
}

export function loadFlexibility(cols: number, statsDir: string): Record<string, number> {
  const path = join(statsDir, `flexibility-${cols}.json`);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, number>;
}

export function poolSize(flex: Record<string, number>, col: number, letter: string): number {
  return flex[`${letter}@${col}`] ?? 0;
}

export function filterRowDict(words: string[], prefills: PrefilledCell[], row: number): string[] {
  const pf = prefills.filter((p) => p.row === row);
  if (!pf.length) return words;
  return words.filter((w) => {
    const u = w.toUpperCase();
    return pf.every((p) => u[p.col] === p.letter);
  });
}

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateGridScore(
  rows: number,
  prefills: PrefilledCell[],
  rowDict: string[],
  scoreDict: Set<string>,
  rng: () => number,
): number {
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const pool = filterRowDict(rowDict, prefills, r);
    if (!pool.length) throw new Error(`No words for row ${r}`);
    const w = pool[Math.floor(rng() * pool.length)]!.toUpperCase();
    grid.push([...w]);
  }
  return computeGridScoreFromLetters(grid, scoreDict).total;
}

export function monteCarloPassRate(
  rows: number,
  _cols: number,
  prefills: PrefilledCell[],
  threshold: number,
  rowDict: string[],
  scoreDict: Set<string>,
  trials: number,
  seed = 42,
): { passRate: number; median: number; scores: number[] } {
  const rng = mulberry32(seed);
  const scores: number[] = [];
  let pass = 0;
  for (let i = 0; i < trials; i++) {
    const total = simulateGridScore(rows, prefills, rowDict, scoreDict, rng);
    scores.push(total);
    if (total >= threshold) pass++;
  }
  scores.sort((a, b) => a - b);
  return {
    passRate: pass / trials,
    median: scores[Math.floor(trials / 2)] ?? 0,
    scores,
  };
}

export function binarySearchThreshold(
  rows: number,
  cols: number,
  prefills: PrefilledCell[],
  targetPassRate: number,
  rowDict: string[],
  scoreDict: Set<string>,
  trials = 800,
  seed = 42,
): number {
  let lo = 50;
  let hi = 550;
  let best = lo;
  for (let iter = 0; iter < 16; iter++) {
    const mid = Math.round((lo + hi) / 2);
    const { passRate } = monteCarloPassRate(
      rows,
      cols,
      prefills,
      mid,
      rowDict,
      scoreDict,
      trials,
      seed + iter,
    );
    if (passRate >= targetPassRate) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function chiSquarePass(pass: number, fail: number, expectedRate: number): number {
  const n = pass + fail;
  if (n === 0) return 0;
  const expPass = n * expectedRate;
  const expFail = n * (1 - expectedRate);
  const chi =
    ((pass - expPass) ** 2) / expPass + ((fail - expPass) ** 2) / expFail;
  return chi;
}

export function scoreWordStats(dictDir: string, len: number) {
  const words = loadRowDict(len, dictDir);
  const h = words.map((w) => scoreWord(w, 'horizontal')).sort((a, b) => a - b);
  const pct = (p: number) => h[Math.floor((h.length - 1) * p)] ?? 0;
  return { count: words.length, median: pct(0.5), p90: pct(0.9) };
}
