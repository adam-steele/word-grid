import type { LevelDefinition } from '../../shared/types.js';
import levelsJson from '../data/levels.json';
import dict3 from '../data/3.json';
import dict4 from '../data/4.json';
import dict5 from '../data/5.json';
import dict6 from '../data/6.json';
import dict7 from '../data/7.json';
import dict8 from '../data/8.json';
import dict9 from '../data/9.json';
import dict10 from '../data/10.json';
import score3 from '../data/scoring/3.json';
import score4 from '../data/scoring/4.json';
import score5 from '../data/scoring/5.json';
import score6 from '../data/scoring/6.json';
import score7 from '../data/scoring/7.json';
import score8 from '../data/scoring/8.json';
import score9 from '../data/scoring/9.json';
import score10 from '../data/scoring/10.json';

const levels = levelsJson as LevelDefinition[];

const rawDicts: Record<number, string[]> = {
  3: dict3 as string[],
  4: dict4 as string[],
  5: dict5 as string[],
  6: dict6 as string[],
  7: dict7 as string[],
  8: dict8 as string[],
  9: dict9 as string[],
  10: dict10 as string[],
};

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

const dictionaries: Record<number, Set<string>> = Object.fromEntries(
  Object.entries(rawDicts).map(([len, words]) => [
    Number(len),
    new Set(words.map((w) => w.toUpperCase())),
  ]),
);

const scoringDictionaries: Record<number, Set<string>> = Object.fromEntries(
  Object.entries(scoringDicts).map(([len, words]) => [
    Number(len),
    new Set(words.map((w) => w.toUpperCase())),
  ]),
);

export function getServerLevels(): LevelDefinition[] {
  return levels;
}

export function getServerLevel(id: number): LevelDefinition | undefined {
  return levels.find((l) => l.id === id);
}

export function loadServerDictionary(length: number): Set<string> {
  const dict = dictionaries[length];
  if (!dict) throw new Error(`No dictionary for length ${length}`);
  return dict;
}

export function loadServerDictionaryForGrid(rows: number, cols: number): Set<string> {
  const combined = new Set<string>();
  for (let len = 3; len <= Math.max(rows, cols); len++) {
    const dict = scoringDictionaries[len];
    if (dict) for (const w of dict) combined.add(w);
  }
  return combined;
}
