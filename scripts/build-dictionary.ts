/**
 * Builds dictionary JSON + position-stats from NASPA Word List (NWL2023).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dataDir = join(root, 'scripts/data');
const outDir = join(root, 'public/dictionary');
const scoringOutDir = join(outDir, 'scoring');
const statsDir = join(root, 'src/data');
const workerOutDir = join(root, 'worker/data');
const workerScoringOutDir = join(workerOutDir, 'scoring');

/** Minimum word length for scoring (matches game rules) */
export const MIN_WORD_LENGTH = 3;

const WORD_LENGTHS = [3, 4, 5, 6, 7, 8, 9, 10] as const;

const NWL2023_URL =
  'https://raw.githubusercontent.com/scrabblewords/scrabblewords/main/words/North-American/NWL2023.txt';

const FALLBACK_WORDS = [
  'CAT', 'DOG', 'TEA', 'SEA', 'ART', 'RUN', 'SUN', 'CAR',
  'ABOUT', 'AFTER', 'AGAIN', 'ALONE', 'APPLE', 'BEACH', 'BRAIN', 'CHAIR',
  'CRANE', 'DREAM', 'EARTH', 'FLAME', 'GRACE', 'HEART', 'HOUSE', 'LIGHT',
  'ANGER', 'ANGERS', 'GRAIN', 'GRAINS', 'NEED', 'NERDS', 'GEARS', 'EDITS',
  'RENTS', 'SENSE', 'WORD', 'GRID', 'GAME', 'PLAY', 'SCORE', 'LEVEL',
];

function parseNwlLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const word = trimmed.split(/\s+/)[0]!.toUpperCase();
  if (!/^[A-Z]+$/.test(word)) return null;
  return word;
}

function parseWords(text: string): string[] {
  const words = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const word = parseNwlLine(line);
    if (word && word.length >= MIN_WORD_LENGTH) words.add(word);
  }
  return [...words];
}

async function downloadNwl(): Promise<string[] | null> {
  try {
    console.log(`Downloading NWL2023 from ${NWL2023_URL}`);
    const res = await fetch(NWL2023_URL);
    if (!res.ok) return null;
    const text = await res.text();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'nwl2023.txt'), text, 'utf8');
    const words = parseWords(text);
    console.log(`Cached NWL2023 → scripts/data/nwl2023.txt (${words.length} words)`);
    return words;
  } catch (err) {
    console.warn('NWL2023 download failed:', err);
    return null;
  }
}

async function loadWords(): Promise<string[]> {
  const candidates = [
    join(dataDir, 'nwl2023.txt'),
    join(dataDir, 'enable.txt'),
    join(dataDir, 'popular.txt'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      console.log(`Loading dictionary from ${path}`);
      const text = readFileSync(path, 'utf8');
      if (path.includes('nwl2023')) return parseWords(text);
      return text
        .split(/\r?\n/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => /^[A-Z]{3,}$/.test(w));
    }
  }

  const downloaded = await downloadNwl();
  if (downloaded?.length) return downloaded;

  console.warn('Using minimal embedded fallback dictionary');
  return FALLBACK_WORDS.map((w) => w.toUpperCase());
}

function loadCommonWords(): Set<string> {
  const path = join(dataDir, 'popular.txt');
  if (!existsSync(path)) {
    console.warn('popular.txt not found — scoring will use full dictionary');
    return new Set();
  }

  const words = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => /^[A-Z]{3,}$/.test(w));

  return new Set(words);
}

/** Scoring uses common words for short lengths (fewer obscure diagonals) */
function includeInScoring(word: string, common: Set<string>): boolean {
  if (common.size === 0) return true;
  if (word.length <= 4) return common.has(word);
  return true;
}

type PositionStats = Record<number, Record<string, number>>;

function buildPositionStats(words: string[], length: number): PositionStats {
  const stats: PositionStats = {};
  for (let pos = 0; pos < length; pos++) stats[pos] = {};
  for (const word of words) {
    if (word.length !== length) continue;
    for (let pos = 0; pos < length; pos++) {
      const ch = word[pos]!;
      stats[pos]![ch] = (stats[pos]![ch] ?? 0) + 1;
    }
  }
  return stats;
}

function buildFlexibilityIndex(stats: PositionStats, length: number): Record<string, number> {
  const index: Record<string, number> = {};
  for (let pos = 0; pos < length; pos++) {
    for (const [letter, count] of Object.entries(stats[pos] ?? {})) {
      index[`${letter}@${pos}`] = count;
    }
  }
  return index;
}

const allWords = await loadWords();
const commonWords = loadCommonWords();
console.log(`Total words (3+ letters): ${allWords.length}`);
if (commonWords.size) console.log(`Common word filter: ${commonWords.size} words`);

mkdirSync(outDir, { recursive: true });
mkdirSync(scoringOutDir, { recursive: true });
mkdirSync(workerOutDir, { recursive: true });
mkdirSync(workerScoringOutDir, { recursive: true });
mkdirSync(statsDir, { recursive: true });

for (const len of WORD_LENGTHS) {
  const filtered = allWords.filter((w) => w.length === len).sort();
  const scoring = filtered.filter((w) => includeInScoring(w, commonWords));

  writeFileSync(join(outDir, `${len}.json`), JSON.stringify(filtered));
  writeFileSync(join(workerOutDir, `${len}.json`), JSON.stringify(filtered));
  writeFileSync(join(scoringOutDir, `${len}.json`), JSON.stringify(scoring));
  writeFileSync(join(workerScoringOutDir, `${len}.json`), JSON.stringify(scoring));

  if (len >= 4) {
    const stats = buildPositionStats(filtered, len);
    writeFileSync(join(statsDir, `position-stats-${len}.json`), JSON.stringify(stats, null, 2));
    writeFileSync(join(statsDir, `flexibility-${len}.json`), JSON.stringify(buildFlexibilityIndex(stats, len), null, 2));
  }

  console.log(`Length ${len}: ${filtered.length} words (${scoring.length} for scoring)`);
}

const levelsSrc = join(root, 'src/data/levels.json');
const levelsDest = join(workerOutDir, 'levels.json');
if (existsSync(levelsSrc)) {
  writeFileSync(levelsDest, readFileSync(levelsSrc, 'utf8'));
}

console.log('\nDictionary build complete (NASPA NWL2023 + common-word scoring filter).');
