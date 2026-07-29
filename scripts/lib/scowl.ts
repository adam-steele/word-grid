/**
 * SCOWL (Spell Checker Oriented Word Lists) loader.
 * Uses cumulative english+american "words" lists up to size 70, excluding
 * proper-names / upper entries when the word only appears at obscure frequency bands.
 *
 * @see https://wordlist.aspell.net/
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '..', 'data');
export const SCOWL_DIR = join(dataDir, 'scowl-2014.08.11.1');
const SCOWL_TAR = join(dataDir, 'scowl.tar.gz');
const SCOWL_URL =
  'https://sourceforge.net/projects/wordlist/files/SCOWL/2014.08.11.1/scowl-2014.08.11.1.tar.gz/download';

/** Size bands included when building the play-word gate (SCOWL recommends ≤70 for spellers). */
export const SCOWL_MAX_SIZE = 70;
const SIZE_BANDS = [10, 20, 35, 40, 50, 55, 60, SCOWL_MAX_SIZE] as const;

/** Words at or below this band in SCOWL "words" are treated as common dictionary words. */
export const COMMON_WORD_BAND = 35;

export interface ScowlWordMeta {
  /** Earliest SCOWL "words" frequency band (lower = more common). */
  wordBand: number;
  inProperNames: boolean;
  inUpper: boolean;
}

export async function ensureScowl(): Promise<void> {
  if (existsSync(join(SCOWL_DIR, 'final', 'english-words.10'))) return;

  mkdirSync(dataDir, { recursive: true });
  if (!existsSync(SCOWL_TAR)) {
    console.log('Downloading SCOWL 2014.08.11.1 (~2.3 MB)...');
    const res = await fetch(SCOWL_URL);
    if (!res.ok) throw new Error(`SCOWL download failed: ${res.status}`);
    writeFileSync(SCOWL_TAR, Buffer.from(await res.arrayBuffer()));
  }

  mkdirSync(SCOWL_DIR, { recursive: true });
  execSync(`tar -xzf "${SCOWL_TAR}" -C "${dataDir}"`, { stdio: 'inherit' });
  console.log('SCOWL extracted to', SCOWL_DIR);
}

function readBandFile(path: string, map: Map<string, number>, size: number): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const w = line.trim().toUpperCase();
    if (!/^[A-Z]+$/.test(w)) continue;
    map.set(w, Math.min(map.get(w) ?? 999, size));
  }
}

function readFlagFile(path: string, set: Set<string>): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const w = line.trim().toUpperCase();
    if (/^[A-Z]+$/.test(w)) set.add(w);
  }
}

/** Load SCOWL metadata for all words appearing in cumulative english+american words ≤70. */
export function loadScowlMeta(): Map<string, ScowlWordMeta> {
  const finalDir = join(SCOWL_DIR, 'final');
  if (!existsSync(finalDir)) {
    throw new Error(`SCOWL data missing at ${finalDir}. Run npm run build:lexicon`);
  }

  const wordBands = new Map<string, number>();
  const properNames = new Set<string>();
  const upper = new Set<string>();

  for (const size of SIZE_BANDS) {
    if (size > SCOWL_MAX_SIZE) continue;
    readBandFile(join(finalDir, `english-words.${size}`), wordBands, size);
    readBandFile(join(finalDir, `american-words.${size}`), wordBands, size);
    readFlagFile(join(finalDir, `english-proper-names.${size}`), properNames);
    readFlagFile(join(finalDir, `american-proper-names.${size}`), properNames);
    readFlagFile(join(finalDir, `english-upper.${size}`), upper);
    readFlagFile(join(finalDir, `american-upper.${size}`), upper);
  }

  const meta = new Map<string, ScowlWordMeta>();
  for (const [word, wordBand] of wordBands) {
    meta.set(word, {
      wordBand,
      inProperNames: properNames.has(word),
      inUpper: upper.has(word),
    });
  }
  return meta;
}
