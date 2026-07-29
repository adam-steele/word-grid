/**
 * Build NWL validation cache: NWL ∩ SCOWL(size 70) with name filtering → lexicon-valid.json
 *
 * SCOWL excludes obscure Scrabble-only words and most proper names without the
 * form-of churn of Kaikki or the permissiveness of WordNet-only matching.
 *
 * Run: npm run build:lexicon
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type LexiconDecision, decideFromScowl } from './lib/lexicon-rules.js';
import { ensureScowl, loadScowlMeta, SCOWL_MAX_SIZE } from './lib/scowl.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dataDir = join(root, 'scripts/data');
const outPath = join(dataDir, 'lexicon-valid.json');

const NWL_URL =
  'https://raw.githubusercontent.com/scrabblewords/scrabblewords/main/words/North-American/NWL2023.txt';

interface LexiconFile {
  version: 2;
  builtAt: string;
  gate: 'scowl70';
  scowlMaxSize: number;
  decisions: Record<string, LexiconDecision>;
}

function parseNwl(text: string): string[] {
  const words = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const w = t.split(/\s+/)[0]!.toUpperCase();
    if (/^[A-Z]{3,}$/.test(w)) words.add(w);
  }
  return [...words];
}

async function loadNwl(): Promise<string[]> {
  const path = join(dataDir, 'nwl2023.txt');
  if (!existsSync(path)) {
    console.log('Downloading NWL2023...');
    const res = await fetch(NWL_URL);
    if (!res.ok) throw new Error(`NWL download failed: ${res.status}`);
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(path, await res.text(), 'utf8');
  }
  return parseNwl(readFileSync(path, 'utf8'));
}

function loadBlocklist(): Set<string> {
  const path = join(dataDir, 'blocklist.txt');
  if (!existsSync(path)) return new Set();
  return new Set(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim().toUpperCase())
      .filter((w) => w && !w.startsWith('#') && /^[A-Z]+$/.test(w)),
  );
}

function loadAllowlist(): Set<string> {
  const path = join(dataDir, 'allowlist.txt');
  if (!existsSync(path)) return new Set();
  return new Set(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim().toUpperCase())
      .filter((w) => w && !w.startsWith('#') && /^[A-Z]+$/.test(w)),
  );
}

async function main(): Promise<void> {
  console.log('Building lexicon-valid.json (NWL ∩ SCOWL gate)...\n');

  await ensureScowl();
  const scowl = loadScowlMeta();
  console.log(`SCOWL words indexed (size ≤${SCOWL_MAX_SIZE}): ${scowl.size}`);

  const nwl = await loadNwl();
  const blocklist = loadBlocklist();
  const allowlist = loadAllowlist();

  const decisions: Record<string, LexiconDecision> = {};
  let validCount = 0;
  const byReason = new Map<string, number>();

  for (const word of nwl) {
    const d = decideFromScowl(word, scowl, blocklist, allowlist);
    decisions[word] = d;
    if (d.valid) validCount++;
    else {
      const reason = d.reason ?? 'unknown';
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    }
  }

  const out: LexiconFile = {
    version: 2,
    builtAt: new Date().toISOString(),
    gate: 'scowl70',
    scowlMaxSize: SCOWL_MAX_SIZE,
    decisions,
  };

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(out));
  console.log(`\nWrote ${outPath}`);
  console.log(`NWL words: ${nwl.length}, valid: ${validCount}, invalid: ${nwl.length - validCount}`);
  console.log('Rejected by reason:');
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }

  const byLen = (len: number) =>
    nwl.filter((w) => w.length === len && decisions[w]?.valid).length;
  console.log(`Valid 3-letter: ${byLen(3)}, 4-letter: ${byLen(4)}, 5-letter: ${byLen(5)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
