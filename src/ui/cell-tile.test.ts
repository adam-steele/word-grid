import { describe, it, expect } from 'vitest';
import {
  CAPSULE_RADIUS_RATIO,
  LETTER_Y_RATIO,
  capsuleOutlinePath,
  letterCenter,
  renderWordOverlay,
  ringClassFor,
  semicircleSweep,
} from './cell-tile.js';
import type { ScoreBreakdown } from '@shared/types.js';

describe('renderWordOverlay', () => {
  it('renders hollow capsule paths instead of polylines', () => {
    const breakdown: ScoreBreakdown[] = [
      {
        word: 'NOW',
        direction: 'diagonal',
        score: 10,
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
      },
    ];
    const html = renderWordOverlay({ cols: 3, rows: 3 }, breakdown, 'play', 0.1);
    expect(html).toContain('word-capsule');
    expect(html).toContain('<path');
    expect(html).toContain('fill="none"');
    expect(html).not.toContain('<polyline');
  });
});

describe('ringClassFor', () => {
  it('only applies inset ring for vertical-diagonal intersection', () => {
    expect(ringClassFor('vertical')).toBe('');
    expect(ringClassFor('diagonal')).toBe('');
    expect(ringClassFor('vertical-diagonal')).toBe('ring-v-d');
  });
});

describe('capsuleOutlinePath', () => {
  const gap = 0.1;

  it('anchors endpoints on letter positions, not cell centers', () => {
    const start = letterCenter(0, 0, gap);
    expect(start.x).toBeCloseTo(0.5);
    expect(start.y).toBeCloseTo(LETTER_Y_RATIO);
    expect(start.y).toBeGreaterThan(0.5);
  });

  it('start cap bulges backward over the first letter (vertical)', () => {
    const cells = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ];
    const d = capsuleOutlinePath(cells, gap);
    const start = letterCenter(0, 0, gap);
    const r = CAPSULE_RADIUS_RATIO;
    const topCapY = start.y - r;

    expect(d).toContain(`M ${start.x - r} ${start.y}`);
    expect(d).toMatch(/A [\d.]+ [\d.]+ 0 0 1/);
    const nums = d.match(/-?\d+\.?\d*/g)!.map(Number);
    const minY = Math.min(...nums.filter((_, i) => i % 2 === 1));
    expect(minY).toBeLessThanOrEqual(topCapY + 0.001);
  });

  it('produces a closed vertical NOW capsule', () => {
    const cells = [
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ];
    const d = capsuleOutlinePath(cells, gap);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/A/g)?.length).toBe(2);
  });

  it('produces a closed diagonal NOW capsule', () => {
    const cells = [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ];
    const d = capsuleOutlinePath(cells, gap);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('returns empty for a single cell', () => {
    expect(capsuleOutlinePath([{ row: 0, col: 0 }], gap)).toBe('');
  });
});

describe('semicircleSweep', () => {
  it('selects the arc through the backward point for a downward path', () => {
    const start = { x: 0.5, y: LETTER_Y_RATIO };
    const end = { x: 0.5, y: LETTER_Y_RATIO + 2.1 };
    const r = CAPSULE_RADIUS_RATIO;
    const ux = 0;
    const uy = 1;
    const px = -1;
    const py = 0;
    const ls = { x: start.x + px * r, y: start.y + py * r };
    const rs = { x: start.x - px * r, y: start.y - py * r };
    const startBack = { x: start.x - ux * r, y: start.y - uy * r };
    expect(semicircleSweep(ls, rs, start, startBack)).toBe(1);
  });
});
