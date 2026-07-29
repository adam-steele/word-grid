const cache = new Map<string, Set<string>>();
let loadedVersion: string | null = null;

interface DictionaryVersion {
  builtAt: string;
  gate?: string;
  version?: number;
}

async function ensureDictionaryVersion(): Promise<string> {
  if (loadedVersion) return loadedVersion;

  const res = await fetch('/dictionary/version.json', { cache: 'no-store' });
  if (!res.ok) return '';
  const meta = (await res.json()) as DictionaryVersion;
  loadedVersion = meta.builtAt ?? '';
  return loadedVersion;
}

async function fetchDictionaryJson(path: string): Promise<string[]> {
  const version = await ensureDictionaryVersion();
  const url = version ? `${path}?v=${encodeURIComponent(version)}` : path;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Dictionary not found: ${path}`);
  return (await res.json()) as string[];
}

export async function loadDictionary(wordLength: number): Promise<Set<string>> {
  if (cache.has(String(wordLength))) return cache.get(String(wordLength))!;

  const words = await fetchDictionaryJson(`/dictionary/${wordLength}.json`);
  const set = new Set(words.map((w) => w.toUpperCase()));
  cache.set(String(wordLength), set);
  return set;
}

/** Load common-word subset for vertical/diagonal scoring (3–4 letter words filtered) */
export async function loadScoringDictionary(wordLength: number): Promise<Set<string>> {
  const key = `scoring:${wordLength}`;
  if (cache.has(key)) return cache.get(key)!;

  const words = await fetchDictionaryJson(`/dictionary/scoring/${wordLength}.json`);
  const set = new Set(words.map((w) => w.toUpperCase()));
  cache.set(key, set);
  return set;
}

/** Load all word lengths needed for horizontal rows + vertical/diagonal scoring */
export async function loadDictionaryForGrid(rows: number, cols: number): Promise<Set<string>> {
  const key = `grid-scoring:${rows}x${cols}`;
  if (cache.has(key)) return cache.get(key)!;

  const minLen = 3;
  const maxLen = Math.max(rows, cols);
  const combined = new Set<string>();

  for (let len = minLen; len <= maxLen; len++) {
    try {
      const set = await loadScoringDictionary(len);
      for (const w of set) combined.add(w);
    } catch {
      // Length not bundled — skip
    }
  }

  cache.set(key, combined);
  return combined;
}

export function isValidWord(word: string, dict: Set<string>): boolean {
  return dict.has(word.toUpperCase());
}

/** Horizontal row words must match column count exactly */
export async function loadRowDictionary(cols: number): Promise<Set<string>> {
  return loadDictionary(cols);
}

/** Clear in-memory dictionary cache (e.g. after hot reload in dev). */
export function clearDictionaryCache(): void {
  cache.clear();
  loadedVersion = null;
}
