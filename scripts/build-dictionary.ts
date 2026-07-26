/**
 * Builds dictionary JSON + position-stats from NASPA Word List (NWL2023).
 *
 * Play / scoring filters:
 * - 3–4 letters: NWL ∩ Google 10k common English (− blocklist)
 * - 5+ letters:  NWL ∩ ENABLE standard dictionary (− blocklist)
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

const GOOGLE_10K_URL =
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt';

const FALLBACK_WORDS = [
  'CAT', 'DOG', 'TEA', 'SEA', 'ART', 'RUN', 'SUN', 'CAR',
  'ABOUT', 'AFTER', 'AGAIN', 'ALONE', 'APPLE', 'BEACH', 'BRAIN', 'CHAIR',
  'CRANE', 'DREAM', 'EARTH', 'FLAME', 'GRACE', 'HEART', 'HOUSE', 'LIGHT',
  'ANGER', 'ANGERS', 'GRAIN', 'GRAINS', 'NEED', 'NERDS', 'GEARS', 'EDITS',
  'RENTS', 'SENSE', 'WORD', 'GRID', 'GAME', 'PLAY', 'SCORE', 'LEVEL',
];

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

function parseWordList(text: string): Set<string> {
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((w) => w.toUpperCase())
      .filter((w) => /^[A-Z]{3,}$/.test(w)),
  );
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

async function downloadNwl(): Promise<string[] | null> {
  const text = await downloadText(NWL2023_URL, 'nwl2023.txt');
  if (!text) return null;
  const words = parseWords(text);
  console.log(`Cached NWL2023 → scripts/data/nwl2023.txt (${words.length} words)`);
  return words;
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

function loadEnableWords(): Set<string> {
  const path = join(dataDir, 'enable.txt');
  if (!existsSync(path)) {
    console.warn('enable.txt not found — 5+ letter filter will use full NWL');
    return new Set();
  }
  const words = parseWordList(readFileSync(path, 'utf8'));
  console.log(`ENABLE dictionary: ${words.size} words`);
  return words;
}

async function loadGoogle10k(): Promise<Set<string>> {
  const text =
    (existsSync(join(dataDir, 'google-10000-english.txt'))
      ? readFileSync(join(dataDir, 'google-10000-english.txt'), 'utf8')
      : null) ?? (await downloadText(GOOGLE_10K_URL, 'google-10000-english.txt'));

  if (!text) {
    console.warn('google-10000-english.txt not found — 3/4-letter filter will fall back to ENABLE');
    return new Set();
  }

  const words = parseWordList(text);
  console.log(`Google 10k common words: ${words.size}`);
  return words;
}

function loadBlocklist(): Set<string> {
  const path = join(dataDir, 'blocklist.txt');
  if (!existsSync(path)) return new Set();
  return parseWordList(readFileSync(path, 'utf8'));
}

/** Row validation + general play dictionary */
function includeInPlayDictionary(
  word: string,
  commonGoogle: Set<string>,
  enableWords: Set<string>,
  blocklist: Set<string>,
): boolean {
  if (blocklist.has(word)) return false;

  const len = word.length;
  if (len <= 4) {
    if (commonGoogle.size === 0) return enableWords.size === 0 || enableWords.has(word);
    return commonGoogle.has(word);
  }
  if (enableWords.size === 0) return true;
  return enableWords.has(word);
}

/** Vertical / diagonal scoring — same filters as play */
function includeInScoring(
  word: string,
  commonGoogle: Set<string>,
  enableWords: Set<string>,
  blocklist: Set<string>,
): boolean {
  return includeInPlayDictionary(word, commonGoogle, enableWords, blocklist);
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
const commonGoogle = await loadGoogle10k();
const enableWords = loadEnableWords();
const blocklist = loadBlocklist();

console.log(`Total words (3+ letters): ${allWords.length}`);
if (blocklist.size) console.log(`Blocklist: ${blocklist.size} words`);

mkdirSync(outDir, { recursive: true });
mkdirSync(scoringOutDir, { recursive: true });
mkdirSync(workerOutDir, { recursive: true });
mkdirSync(workerScoringOutDir, { recursive: true });
mkdirSync(statsDir, { recursive: true });

for (const len of WORD_LENGTHS) {
  const nwlAtLength = allWords.filter((w) => w.length === len).sort();
  const filtered = nwlAtLength.filter((w) =>
    includeInPlayDictionary(w, commonGoogle, enableWords, blocklist),
  );
  const scoring = filtered.filter((w) =>
    includeInScoring(w, commonGoogle, enableWords, blocklist),
  );

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

console.log('\nDictionary build complete (NWL + strict 3/4-letter + ENABLE 5+).');
