import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

function loadDict(path: string): Set<string> {
  const words = JSON.parse(readFileSync(path, 'utf8')) as string[];
  return new Set(words);
}

describe('dictionary filters', () => {
  let play3: Set<string>;
  let play5: Set<string>;
  let score3: Set<string>;

  beforeAll(() => {
    play3 = loadDict('public/dictionary/3.json');
    play5 = loadDict('public/dictionary/5.json');
    score3 = loadDict('public/dictionary/scoring/3.json');
  });

  it('excludes obscure scrabble-only 3-letter words', () => {
    for (const word of ['ESS', 'RES', 'SIS', 'QAT', 'ZAX']) {
      expect(play3.has(word)).toBe(false);
      expect(score3.has(word)).toBe(false);
    }
  });

  it('includes well-known 3-letter words', () => {
    for (const word of ['CAT', 'DOG', 'RUN', 'ART', 'BOG', 'DEW']) {
      expect(play3.has(word)).toBe(true);
      expect(score3.has(word)).toBe(true);
    }
  });

  it('includes common words previously blocked by Google 10k gate', () => {
    for (const word of ['APE', 'ALE', 'ARK', 'ALB']) {
      expect(play3.has(word)).toBe(true);
    }
  });

  it('has expanded 3-letter coverage', () => {
    expect(play3.size).toBeGreaterThan(500);
  });

  it('excludes common first names and name-like Scrabble words', () => {
    for (const word of ['TED', 'JOHN', 'TOM', 'JOE', 'MARY']) {
      expect(play3.has(word)).toBe(false);
      expect(play5.has(word)).toBe(false);
    }
  });

  it('includes standard 5-letter words from lexicon', () => {
    for (const word of ['INERT', 'ANGER', 'GRAIN', 'CRANE', 'HOUSE']) {
      expect(play5.has(word)).toBe(true);
    }
  });

  it('excludes obscure scrabble-only words via blocklist', () => {
    expect(play5.has('UNDEE')).toBe(false);
  });
});
