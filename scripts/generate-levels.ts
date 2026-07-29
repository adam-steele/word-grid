/**
 * Generate 50 levels with Monte Carlo-calibrated thresholds.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LevelDefinition, PrefilledCell } from '../shared/types.js';
import {
  LEVELS_1_10,
  TIER_TEMPLATES,
  loadRowDict,
  loadScoringDict,
  loadFlexibility,
  poolSize,
  binarySearchThreshold,
  monteCarloPassRate,
  mulberry32,
} from './lib/scoring-sim.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dictDir = join(root, 'public/dictionary');
const statsDir = join(root, 'src/data');
const outPath = join(root, 'src/data/levels.json');

const TIER_NAMES = ['Warm', 'Steady', 'Climb', 'Ridge', 'Peak'];

function pickPrefills(
  rows: number,
  cols: number,
  count: number,
  minPool: number,
  flex: Record<string, number>,
  rng: () => number,
  usedRows: Set<number>,
): PrefilledCell[] {
  const prefills: PrefilledCell[] = [];
  const candidates: PrefilledCell[] = [];
  for (let col = 0; col < cols; col++) {
    for (const letter of 'AEIOUSTRNL') {
      const size = poolSize(flex, col, letter);
      if (size >= minPool) candidates.push({ row: 0, col, letter });
    }
  }
  candidates.sort((a, b) => poolSize(flex, b.col, b.letter) - poolSize(flex, a.col, a.letter));

  for (let i = 0; i < count && candidates.length; i++) {
    const idx = Math.floor(rng() * Math.min(candidates.length, 12));
    const base = candidates[idx]!;
    let row = Math.floor(rng() * rows);
    for (let attempt = 0; attempt < rows; attempt++) {
      if (!usedRows.has(row)) break;
      row = (row + 1) % rows;
    }
    usedRows.add(row);
    prefills.push({ row, col: base.col, letter: base.letter });
  }
  return prefills;
}

function generateTierLevel(
  id: number,
  template: (typeof TIER_TEMPLATES)[0],
  rng: () => number,
): LevelDefinition {
  const grid = template.gridSizes[Math.floor(rng() * template.gridSizes.length)]!;
  const { rows, cols } = grid;
  const flex = loadFlexibility(cols, statsDir);
  const [minPf, maxPf] = template.prefillCount;
  const pfCount = minPf + Math.floor(rng() * (maxPf - minPf + 1));
  const usedRows = new Set<number>();
  const prefilled = pickPrefills(rows, cols, pfCount, template.minPoolSize, flex, rng, usedRows);

  const rowDict = loadRowDict(cols, dictDir);
  const scoreDict = loadScoringDict(rows, cols, dictDir);

  const threshold = binarySearchThreshold(
    rows,
    cols,
    prefilled,
    template.targetPassRate,
    rowDict,
    scoreDict,
    600,
    id * 17,
  );

  const tier = template.tier;
  const name = `${TIER_NAMES[tier - 1] ?? 'Level'} ${((id - 1) % 10) + 1}`;

  return { id, name, grid, prefilled, threshold };
}

function main(): void {
  const levels: LevelDefinition[] = [];

  for (let i = 0; i < LEVELS_1_10.length; i++) {
    const tmpl = LEVELS_1_10[i]!;
    const id = i + 1;
    const { rows, cols } = tmpl.grid;
    const rowDict = loadRowDict(cols, dictDir);
    const scoreDict = loadScoringDict(rows, cols, dictDir);
    const threshold = binarySearchThreshold(
      rows,
      cols,
      tmpl.prefilled,
      0.875,
      rowDict,
      scoreDict,
      800,
      id * 31,
    );
    levels.push({
      id,
      name: tmpl.name,
      grid: tmpl.grid,
      prefilled: tmpl.prefilled,
      threshold,
    });
  }

  for (let id = 11; id <= 50; id++) {
    const tierIdx = Math.floor((id - 1) / 10);
    const template = TIER_TEMPLATES[tierIdx]!;
    const rng = mulberry32(id * 9973);
    levels.push(generateTierLevel(id, template, rng));
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(levels, null, 2) + '\n');

  const manifest = levels.map((l) => ({ id: l.id, name: l.name }));
  const manifestPath = join(root, 'src/data/level-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Wrote ${levels.length} levels to ${outPath}\n`);
  console.log('Sample thresholds:');
  for (const l of [levels[0], levels[9], levels[10], levels[19], levels[49]]) {
    if (!l) continue;
    const rowDict = loadRowDict(l.grid.cols, dictDir);
    const scoreDict = loadScoringDict(l.grid.rows, l.grid.cols, dictDir);
    const { passRate } = monteCarloPassRate(
      l.grid.rows,
      l.grid.cols,
      l.prefilled,
      l.threshold,
      rowDict,
      scoreDict,
      2000,
      l.id * 13,
    );
    console.log(
      `L${l.id} ${l.name} ${l.grid.rows}x${l.grid.cols} prefills=${l.prefilled.length} T=${l.threshold} pass~${(passRate * 100).toFixed(1)}%`,
    );
  }
}

main();
