import type {
  LevelCompleteResponse,
  LevelPayload,
  ProgressData,
  UnlockToken,
} from '@shared/types.js';
import { loadSignedProgress, saveSignedProgress } from '../storage/progress.js';
import { getProgressSecret } from '@shared/config.js';
import type { ValidationProvider } from './index.js';

/**
 * Server-side validation via Vercel Edge API (same origin) or external API URL.
 */
export class ServerValidationProvider implements ValidationProvider {
  constructor(private readonly apiBase: string = '') {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async loadLevel(levelId: number): Promise<LevelPayload> {
    return this.post<LevelPayload>('/api/level/load', { levelId });
  }

  async completeLevel(
    levelId: number,
    grid: string[][],
    priorToken?: UnlockToken,
  ): Promise<LevelCompleteResponse> {
    return this.post<LevelCompleteResponse>('/api/level/complete', {
      levelId,
      grid,
      unlockToken: priorToken,
    });
  }

  async loadProgress(): Promise<ProgressData> {
    // Local progress still signed client-side; server validates on complete
    return loadSignedProgress(getProgressSecret());
  }

  async saveProgress(data: ProgressData): Promise<void> {
    await saveSignedProgress(data, getProgressSecret());
  }

  async unlockLevel(
    data: ProgressData,
    levelId: number,
    score: number,
  ): Promise<ProgressData> {
    const next: ProgressData = {
      ...data,
      unlockedLevel: Math.max(data.unlockedLevel, levelId + 1),
      levelBestScores: {
        ...data.levelBestScores,
        [levelId]: Math.max(data.levelBestScores[levelId] ?? 0, score),
      },
    };
    await this.saveProgress(next);
    return next;
  }
}
