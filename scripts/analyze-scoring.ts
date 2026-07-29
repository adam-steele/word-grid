/**
 * Monte Carlo scoring analysis + level pass-rate reports.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEVELS_1_10,
  TIER_TEMPLATES,
  loadRowDict,
  loadScoringDict,
  loadFlexibility,
  poolSize,
  monteCarloPassRate,
  binarySearchThreshold,
  scoreWordStats,
} from './lib/scoring-sim.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dictDir = join(root, 'public/dictionary');
const statsDir = join(root, 'src/data');
const levelsPath = join(root, 'src/data/levels.json');

function main(): void {
  if (!existsSync(join(dictDir, '5.json'))) {
    console.error('Run npm run build:data first.');
    process.exit(1);
  }

  console.log('=== 5-letter horizontal score stats ===');
  console.log(scoreWordStats(dictDir, 5));

  console.log('\n=== Grid size baselines (threshold pass rates) ===');
  for (const [rows, cols] of [
    [5, 5],
    [5, 4],
    [6, 5],
    [7, 5],
    [6, 6],
  ] as const) {
    const rowDict = loadRowDict(cols, dictDir);
    const scoreDict = loadScoringDict(rows, cols, dictDir);
    const { passRate, median } = monteCarloPassRate(
      rows,
      cols,
      [],
      245,
      rowDict,
      scoreDict,
      2000,
    );
    console.log(`${rows}x${cols}: median=${median}, pass@245=${(passRate * 100).toFixed(1)}%`);
  }

  if (existsSync(levelsPath)) {
    console.log('\n=== Level pass rates (from levels.json) ===');
    const levels = JSON.parse(readFileSync(levelsPath, 'utf8')) as Array<{
      id: number;
      name: string;
      grid: { rows: number; cols: number };
      prefilled: Array<{ row: number; col: number; letter: string }>;
      threshold: number;
    }>;

    for (const level of levels.slice(0, 15)) {
      const { rows, cols } = level.grid;
      const rowDict = loadRowDict(cols, dictDir);
      const scoreDict = loadScoringDict(rows, cols, dictDir);
      const { passRate, median } = monteCarloPassRate(
        rows,
        cols,
        level.prefilled,
        level.threshold,
        rowDict,
        scoreDict,
        2500,
        100 + level.id,
      );
      const pass = Math.round(passRate * 2500);
      const tier = Math.ceil(level.id / 10);
      const target = TIER_TEMPLATES[tier - 1]?.targetPassRate ?? 0.5;
      console.log(
        `L${level.id} ${level.name} ${rows}x${cols} T=${level.threshold} pass=${(passRate * 100).toFixed(1)}% (target~${(target * 100).toFixed(0)}%) median=${median}`,
      );
    }
    if (levels.length > 15) console.log(`... and ${levels.length - 15} more levels`);
  }

  console.log('\n=== L1–10 calibrated thresholds (preview) ===');
  for (let i = 0; i < LEVELS_1_10.length; i++) {
    const tmpl = LEVELS_1_10[i]!;
    const { rows, cols } = tmpl.grid;
    const rowDict = loadRowDict(cols, dictDir);
    const scoreDict = loadScoringDict(rows, cols, dictDir);
    const flex = loadFlexibility(cols, statsDir);
    for (const p of tmpl.prefilled) {
      console.log(
        `  L${i + 1} prefill ${p.letter}@${p.col} row${p.row} pool=${poolSize(flex, p.col, p.letter)}`,
      );
    }
    const t = binarySearchThreshold(
      rows,
      cols,
      tmpl.prefilled,
      0.875,
      rowDict,
      scoreDict,
      2000,
      200 + i,
    );
    const { passRate } = monteCarloPassRate(
      rows,
      cols,
      tmpl.prefilled,
      t,
      rowDict,
      scoreDict,
      3000,
      300 + i,
    );
    console.log(
      `L${i + 1} ${tmpl.name}: threshold=${t}, pass=${(passRate * 100).toFixed(1)}%`,
    );
  }
}

main();
