/**
 * Report dictionary coverage: NWL vs lexicon-valid vs output JSON.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LexiconDecision } from './lib/lexicon-rules.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const dataDir = join(root, 'scripts/data');
const dictDir = join(root, 'public/dictionary');

interface LexiconFile {
  version?: number;
  gate?: string;
  scowlMaxSize?: number;
  decisions: Record<string, LexiconDecision>;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function nwlWords(len?: number): string[] {
  const text = readFileSync(join(dataDir, 'nwl2023.txt'), 'utf8');
  const words: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const w = line.trim().split(/\s+/)[0]?.toUpperCase();
    if (w && /^[A-Z]{3,}$/.test(w) && (len === undefined || w.length === len)) words.push(w);
  }
  return words;
}

function main(): void {
  const lex = loadJson<LexiconFile>(join(dataDir, 'lexicon-valid.json'));
  console.log('=== Lexicon ===');
  console.log('Gate:', lex.gate ?? '(legacy)');
  console.log('SCOWL max size:', lex.scowlMaxSize ?? '?');

  for (const len of [3, 4, 5]) {
    const nwl = nwlWords(len);
    const playPath = join(dictDir, `${len}.json`);
    const play = existsSync(playPath) ? loadJson<string[]>(playPath) : [];
    const playSet = new Set(play);
    const valid = nwl.filter((w) => lex.decisions[w]?.valid);
    const rejected = nwl.filter((w) => !lex.decisions[w]?.valid);

    console.log(`\n=== ${len}-letter ===`);
    console.log(`NWL: ${nwl.length}, lexicon-valid: ${valid.length}, in play JSON: ${play.length}`);

    const byReason = new Map<string, string[]>();
    for (const w of rejected) {
      const reason = lex.decisions[w]?.reason ?? lex.decisions[w]?.source ?? 'unknown';
      if (!byReason.has(reason)) byReason.set(reason, []);
      byReason.get(reason)!.push(w);
    }
    console.log('Rejected by reason:');
    for (const [reason, words] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${reason}: ${words.length} (e.g. ${words.slice(0, 8).join(', ')})`);
    }

    const obscure = play.filter((w) => !playSet.has(w));
    void obscure;
  }

  const check = ['APE', 'ALE', 'ARK', 'ALB', 'CAT', 'QAT', 'ZAX', 'ESS', 'BOG', 'DEW', 'TED', 'JOHN', 'HOUSE', 'CRANE'];
  console.log('\n=== Spot check ===');
  for (const w of check) {
    const d = lex.decisions[w];
    const in3 = existsSync(join(dictDir, '3.json'))
      ? loadJson<string[]>(join(dictDir, '3.json')).includes(w)
      : false;
    const in5 = existsSync(join(dictDir, '5.json'))
      ? loadJson<string[]>(join(dictDir, '5.json')).includes(w)
      : false;
    console.log(
      `${w}: valid=${d?.valid ?? '?'} reason=${d?.reason ?? d?.source ?? '-'} in3=${in3} in5=${in5}`,
    );
  }
}

main();
