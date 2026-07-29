/**
 * Audit built dictionary vs lexicon-valid.json for names, archaic, and common words.
 * Writes NDJSON to .cursor/debug-c9360b.log for debug-mode analysis.
 */
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const LOG_PATH = join(root, '.cursor/debug-c9360b.log');

const NAMES_SHOULD_REJECT = [
  'TED', 'JOHN', 'TOM', 'JOE', 'MARY', 'DAVE', 'ANNA', 'LISA', 'PAUL',
];
const NAMES_MAY_REMAIN = ['BOB', 'ROB', 'PAT', 'GOD', 'MARK', 'WILL', 'BILL', 'MIKE'];
const ARCHAIC_SHOULD_REJECT = [
  'QAT', 'ZAX', 'ESS', 'AAH', 'CWM', 'PYX', 'ADZ', 'ZED', 'UNDEE', 'AAHED', 'ABACI',
];
const ARCHAIC_IN_SCOWL70 = ['FOP', 'OAF', 'YOB', 'GIT', 'ZIT'];
const COMMON_MUST_INCLUDE = [
  'CAT', 'DOG', 'RUN', 'ART', 'BOG', 'DEW', 'APE', 'ALE', 'ARK', 'ALB',
  'HAS', 'MEN', 'ARE', 'WAS', 'THE', 'AND',
  'HOUSE', 'CRANE', 'GRAIN', 'ANGER', 'LIGHT', 'WORLD', 'HAPPY', 'PLANT', 'TRAIN', 'BRAIN', 'CHAIR',
];

interface LexiconFile {
  gate?: string;
  version?: number;
  decisions: Record<string, { valid: boolean; reason?: string; source?: string }>;
}

function log(hypothesisId: string, message: string, data: Record<string, unknown>): void {
  const entry = {
    sessionId: 'c9360b',
    runId: process.env.DEBUG_RUN_ID ?? 'audit-pre',
    hypothesisId,
    location: 'scripts/verify-dictionary-audit.ts',
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

function loadDict(len: number): Set<string> {
  const path = join(root, 'public/dictionary', `${len}.json`);
  if (!existsSync(path)) return new Set();
  return new Set(JSON.parse(readFileSync(path, 'utf8')) as string[]);
}

function dictForWord(word: string, caches: Map<number, Set<string>>): Set<string> {
  const len = word.length;
  if (!caches.has(len)) caches.set(len, loadDict(len));
  return caches.get(len)!;
}

function auditGroup(
  hypothesisId: string,
  label: string,
  words: string[],
  lex: LexiconFile,
  dictCaches: Map<number, Set<string>>,
  expectIncluded: boolean,
): { passed: string[]; failed: string[] } {
  const passed: string[] = [];
  const failed: string[] = [];

  for (const word of words) {
    const dict = dictForWord(word, dictCaches);
    const inDict = dict.has(word);
    const decision = lex.decisions[word];
    const ok = expectIncluded ? inDict && decision?.valid === true : !inDict && decision?.valid !== true;

    if (ok) passed.push(word);
    else failed.push(word);

    log(hypothesisId, `${label} probe`, {
      word,
      expectIncluded,
      inDict,
      lexValid: decision?.valid ?? null,
      lexReason: decision?.reason ?? decision?.source ?? null,
      ok,
    });
  }

  log(hypothesisId, `${label} summary`, { total: words.length, passed: passed.length, failed, expectIncluded });
  return { passed, failed };
}

function main(): void {
  const lex = JSON.parse(readFileSync(join(root, 'scripts/data/lexicon-valid.json'), 'utf8')) as LexiconFile;
  const dictCaches = new Map<number, Set<string>>();
  const dict3 = loadDict(3);
  const dict5 = loadDict(5);
  dictCaches.set(3, dict3);
  dictCaches.set(5, dict5);

  log('META', 'audit start', {
    gate: lex.gate,
    version: lex.version,
    dict3Size: dict3.size,
    dict5Size: dict5.size,
    lexDecisionCount: Object.keys(lex.decisions).length,
  });

  // A: lexicon-valid matches public/dictionary/*.json
  let lexPlayMismatch = 0;
  for (const [word, d] of Object.entries(lex.decisions)) {
    if (word.length !== 3 && word.length !== 5) continue;
    const dict = word.length === 3 ? dict3 : dict5;
    const inPlay = dict.has(word);
    if (d.valid !== inPlay) lexPlayMismatch++;
  }
  log('A', 'lexicon vs play JSON sync', { lexPlayMismatch, hypothesis: 'build output matches lexicon cache' });

  const namesRejected = auditGroup('C', 'names-should-reject', NAMES_SHOULD_REJECT, lex, dictCaches, false);
  const namesRemain = auditGroup('C', 'names-may-remain', NAMES_MAY_REMAIN, lex, dictCaches, true);
  void namesRemain;
  const archaicRejected = auditGroup('D', 'archaic-should-reject', ARCHAIC_SHOULD_REJECT, lex, dictCaches, false);
  const archaicRemain = auditGroup('D', 'archaic-in-scowl70', ARCHAIC_IN_SCOWL70, lex, dictCaches, true);
  void archaicRemain;
  const commonIncluded = auditGroup('E', 'common-must-include', COMMON_MUST_INCLUDE, lex, dictCaches, true);

  log('META', 'audit complete', {
    namesRejectedFail: namesRejected.failed,
    archaicRejectedFail: archaicRejected.failed,
    commonMissing: commonIncluded.failed,
    allPass:
      namesRejected.failed.length === 0 &&
      archaicRejected.failed.length === 0 &&
      commonIncluded.failed.length === 0 &&
      lexPlayMismatch === 0,
  });

  console.log('Dictionary audit written to', LOG_PATH);
  console.log('Names rejected OK:', namesRejected.failed.length === 0, namesRejected.failed);
  console.log('Archaic rejected OK:', archaicRejected.failed.length === 0, archaicRejected.failed);
  console.log('Common included OK:', commonIncluded.failed.length === 0, commonIncluded.failed);
  console.log('Lexicon/play sync mismatches:', lexPlayMismatch);
}

main();
