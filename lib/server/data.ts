import type { LevelDefinition } from '../../shared/types.js';
import levelsJson from '../../worker/data/levels.json';
import score3 from '../../worker/data/scoring/3.json';
import score4 from '../../worker/data/scoring/4.json';
import score5 from '../../worker/data/scoring/5.json';
import score6 from '../../worker/data/scoring/6.json';
import score7 from '../../worker/data/scoring/7.json';
import score8 from '../../worker/data/scoring/8.json';
import score9 from '../../worker/data/scoring/9.json';
import score10 from '../../worker/data/scoring/10.json';

const levels = levelsJson as LevelDefinition[];

const scoringDicts: Record<number, string[]> = {
  3: score3 as string[],
  4: score4 as string[],
  5: score5 as string[],
  6: score6 as string[],
  7: score7 as string[],
  8: score8 as string[],
  9: score9 as string[],
  10: score10 as string[],
};

const scoringDictionaries: Record<number, Set<string>> = Object.fromEntries(
  Object.entries(scoringDicts).map(([len, words]) => [
    Number(len),
    new Set(words.map((w) => w.toUpperCase())),
  ]),
);

export function getServerLevel(id: number): LevelDefinition | undefined {
  return levels.find((l) => l.id === id);
}

export function loadServerDictionaryForGrid(rows: number, cols: number): Set<string> {
  const combined = new Set<string>();
  for (let len = 3; len <= Math.max(rows, cols); len++) {
    const dict = scoringDictionaries[len];
    if (dict) for (const w of dict) combined.add(w);
  }
  return combined;
}
