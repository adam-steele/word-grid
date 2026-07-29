import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  monteCarloPassRate,
  binarySearchThreshold,
  mulberry32,
} from '../../scripts/lib/scoring-sim.js';
import { scoreWord } from '@shared/scoring.js';
import { DIRECTION_MULTIPLIERS } from '@shared/scoring.js';

function loadRowDict(cols: number): string[] {
  return JSON.parse(readFileSync(`public/dictionary/${cols}.json`, 'utf8')) as string[];
}

function loadScoringDict(rows: number, cols: number): Set<string> {
  const combined = new Set<string>();
  for (let len = 3; len <= Math.max(rows, cols); len++) {
    const path = `public/dictionary/scoring/${len}.json`;
    if (!existsSync(path)) continue;
    for (const w of JSON.parse(readFileSync(path, 'utf8')) as string[]) combined.add(w);
  }
  return combined;
}

describe('scoring multipliers', () => {
  it('uses tuned H/V/D values', () => {
    expect(DIRECTION_MULTIPLIERS.horizontal).toBe(1.0);
    expect(DIRECTION_MULTIPLIERS.vertical).toBe(1.35);
    expect(DIRECTION_MULTIPLIERS.diagonal).toBe(1.6);
  });

  it('orders horizontal < vertical < diagonal for same word', () => {
    const h = scoreWord('CRANE', 'horizontal');
    const v = scoreWord('CRANE', 'vertical');
    const d = scoreWord('CRANE', 'diagonal');
    expect(h).toBeLessThan(v);
    expect(v).toBeLessThan(d);
  });
});

describe('monte carlo scoring analysis', () => {
  const rowDict = loadRowDict(5);
  const scoreDict = loadScoringDict(6, 5);

  it('6x5 random grid median is in expected band', () => {
    const { median } = monteCarloPassRate(6, 5, [], 9999, rowDict, scoreDict, 1500, 42);
    expect(median).toBeGreaterThan(220);
    expect(median).toBeLessThan(320);
  });

  it('tier-1 threshold near 254 passes 80-95% of seeded trials', () => {
    const prefills = [{ row: 0, col: 1, letter: 'E' }];
    const { passRate } = monteCarloPassRate(
      6,
      5,
      prefills,
      254,
      rowDict,
      scoreDict,
      2000,
      99,
    );
    expect(passRate).toBeGreaterThan(0.8);
    expect(passRate).toBeLessThan(0.96);
  });

  it('binarySearchThreshold returns plausible value for tier 1', () => {
    const t = binarySearchThreshold(6, 5, [{ row: 0, col: 1, letter: 'E' }], 0.875, rowDict, scoreDict, 500, 7);
    expect(t).toBeGreaterThan(200);
    expect(t).toBeLessThan(320);
  });

  it('seeded rng is deterministic', () => {
    const a = mulberry32(123)();
    const b = mulberry32(123)();
    expect(a).toBe(b);
  });
});

describe('levels data', () => {
  it('has 50 levels with thresholds', () => {
    const levels = JSON.parse(readFileSync('src/data/levels.json', 'utf8')) as Array<{
      id: number;
      threshold: number;
    }>;
    expect(levels).toHaveLength(50);
    expect(levels[0]!.threshold).toBeGreaterThan(100);
    expect(levels[0]!.threshold).toBeLessThan(400);
  });
});
