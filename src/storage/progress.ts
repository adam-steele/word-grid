import type { ProgressData, SignedProgress } from '@shared/types.js';
import { hmacSign, hmacVerify, stableStringify } from '@shared/crypto.js';

const STORAGE_KEY = 'word-grid-progress';

export const DEFAULT_PROGRESS: ProgressData = {
  unlockedLevel: 1,
  levelBestScores: {},
  practiceHighScores: {},
  settings: { defaultCols: 5, defaultRows: 6 },
};

export async function loadSignedProgress(secret: string): Promise<ProgressData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };

    const saved = JSON.parse(raw) as SignedProgress;
    const payload = stableStringify(saved.data);
    const valid = await hmacVerify(payload, saved.sig, secret);

    if (!valid) {
      console.warn('[progress] Signature invalid — resetting progress');
      return { ...DEFAULT_PROGRESS };
    }

    return { ...DEFAULT_PROGRESS, ...saved.data };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveSignedProgress(
  data: ProgressData,
  secret: string,
): Promise<void> {
  const payload = stableStringify(data);
  const sig = await hmacSign(payload, secret);
  const saved: SignedProgress = { data, sig };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

export async function clearProgress(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}
