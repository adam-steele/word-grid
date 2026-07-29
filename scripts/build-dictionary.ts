/**
 * Builds dictionary JSON + position-stats from NASPA Word List (NWL2023).
 *
 * Play / scoring filters:
 * - All lengths: NWL ∩ lexicon-valid (SCOWL size-70 gate) − blocklist ∪ allowlist
 *
 * Run `npm run build:lexicon` once (or when lexicon rules change) before build:data.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LexiconDecision } from './lib/lexicon-rules.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dataDir = join(root, 'scripts/data');
const lexiconPath = join(dataDir, 'lexicon-valid.json');
const outDir = join(root, 'public/dictionary');
const scoringOutDir = join(outDir, 'scoring');
const statsDir = join(root, 'src/data');
const workerOutDir = join(root, 'worker/data');
const workerScoringOutDir = join(workerOutDir, 'scoring');

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

interface LexiconFile {
  version: 1 | 2;
  builtAt?: string;
  gate?: string;
  decisions: Record<string, LexiconDecision>;
}

function parseNwlLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
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

async function downloadText(url: string, cacheName: string): Promise<string | null> {
  const cachePath = join(dataDir, cacheName);
  if (existsSync(cachePath)) return readFileSync(cachePath, 'utf8');

  try {
    console.log(`Downloading ${cacheName} from ${url}`);
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(cachePath, text, 'utf8');
    return text;
  } catch (err) {
    console.warn(`Download failed for ${cacheName}:`, err);
    return null;
  }
}

async function loadWords(): Promise<string[]> {
  const path = join(dataDir, 'nwl2023.txt');
  if (existsSync(path)) {
    console.log(`Loading dictionary from ${path}`);
    return parseWords(readFileSync(path, 'utf8'));
  }

  const text = await downloadText(NWL2023_URL, 'nwl2023.txt');
  if (text) return parseWords(text);

  console.warn('Using minimal embedded fallback dictionary');
  return FALLBACK_WORDS.map((w) => w.toUpperCase());
}

function loadLexicon(): LexiconFile {
  if (!existsSync(lexiconPath)) {
    console.error(
      `\nMissing ${lexiconPath}\nRun: npm run build:lexicon\n`,
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(lexiconPath, 'utf8')) as LexiconFile;
}

function includeWord(word: string, lexicon: Record<string, LexiconDecision>): boolean {
  return lexicon[word]?.valid === true;
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
const lexiconFile = loadLexicon();
const lexicon = lexiconFile.decisions;

console.log(`Total NWL words (3+ letters): ${allWords.length}`);
console.log(`Lexicon decisions loaded: ${Object.keys(lexicon).length}`);
console.log(`Lexicon gate: ${lexiconFile.gate ?? 'legacy'}, built: ${lexiconFile.builtAt ?? 'unknown'}`);

mkdirSync(outDir, { recursive: true });
mkdirSync(scoringOutDir, { recursive: true });
mkdirSync(workerOutDir, { recursive: true });
mkdirSync(workerScoringOutDir, { recursive: true });
mkdirSync(statsDir, { recursive: true });

for (const len of WORD_LENGTHS) {
  const nwlAtLength = allWords.filter((w) => w.length === len).sort();
  const filtered = nwlAtLength.filter((w) => includeWord(w, lexicon));
  const scoring = filtered;

  writeFileSync(join(outDir, `${len}.json`), JSON.stringify(filtered));
  writeFileSync(join(workerOutDir, `${len}.json`), JSON.stringify(filtered));
  writeFileSync(join(scoringOutDir, `${len}.json`), JSON.stringify(scoring));
  writeFileSync(join(workerScoringOutDir, `${len}.json`), JSON.stringify(scoring));

  if (len >= 4) {
    const stats = buildPositionStats(filtered, len);
    writeFileSync(join(statsDir, `position-stats-${len}.json`), JSON.stringify(stats, null, 2));
    writeFileSync(
      join(statsDir, `flexibility-${len}.json`),
      JSON.stringify(buildFlexibilityIndex(stats, len), null, 2),
    );
  }

  console.log(`Length ${len}: ${filtered.length} play words (${scoring.length} for scoring)`);
}

const levelsSrc = join(root, 'src/data/levels.json');
const levelsDest = join(workerOutDir, 'levels.json');
if (existsSync(levelsSrc)) {
  writeFileSync(levelsDest, readFileSync(levelsSrc, 'utf8'));
}

const versionPayload = {
  builtAt: lexiconFile.builtAt ?? new Date().toISOString(),
  gate: lexiconFile.gate ?? 'legacy',
  version: lexiconFile.version ?? 1,
};
writeFileSync(join(outDir, 'version.json'), JSON.stringify(versionPayload));
writeFileSync(join(workerOutDir, 'version.json'), JSON.stringify(versionPayload));

console.log('\nDictionary build complete (NWL + lexicon-valid).');
