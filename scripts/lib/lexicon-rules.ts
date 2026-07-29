/** Shared lexicon inclusion/exclusion rules for build-lexicon and build-dictionary. */

import type { ScowlWordMeta } from './scowl.js';
import { COMMON_WORD_BAND } from './scowl.js';

export interface LexiconDecision {
  valid: boolean;
  source?: 'scowl' | 'allowlist' | 'blocklist';
  reason?: string;
}

export function decideFromScowl(
  word: string,
  scowl: Map<string, ScowlWordMeta> | undefined,
  blocklist: Set<string>,
  allowlist: Set<string>,
): LexiconDecision {
  if (blocklist.has(word)) return { valid: false, source: 'blocklist', reason: 'blocklist' };
  if (allowlist.has(word)) return { valid: true, source: 'allowlist' };

  const meta = scowl?.get(word);
  if (!meta) return { valid: false, reason: 'not-in-scowl' };

  // Reject name-like SCOWL entries unless the word is a very common dictionary word.
  if (meta.inProperNames && meta.wordBand > COMMON_WORD_BAND) {
    return { valid: false, reason: 'proper-name' };
  }
  if (meta.inUpper && meta.wordBand > COMMON_WORD_BAND) {
    return { valid: false, reason: 'upper-name' };
  }

  return { valid: true, source: 'scowl' };
}
