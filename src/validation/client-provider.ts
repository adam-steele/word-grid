import type {
  LevelCompleteResponse,
  LevelPayload,
  ProgressData,
  UnlockToken,
} from '@shared/types.js';
import { decodePayload } from '@shared/codec.js';
import { getLevelEncodeKey, getProgressSecret } from '@shared/config.js';
import { loadSignedProgress, saveSignedProgress } from '../storage/progress.js';
import { computeGridScoreFromLetters } from '../core/scorer.js';
import { loadDictionaryForGrid } from '../core/dictionary.js';
import type { ValidationProvider } from './index.js';

export class ClientValidationProvider implements ValidationProvider {
  async loadLevel(levelId: number): Promise<LevelPayload> {
    const res = await fetch(`/levels/L${levelId}.enc`);
    if (!res.ok) throw new Error(`Level ${levelId} not found`);
    const encoded = await res.text();
    const json = decodePayload(encoded.trim(), getLevelEncodeKey());
    return JSON.parse(json) as LevelPayload;
  }

  async completeLevel(
    levelId: number,
    grid: string[][],
    _priorToken?: UnlockToken,
  ): Promise<LevelCompleteResponse> {
    const level = await this.loadLevel(levelId);
    const dict = await loadDictionaryForGrid(level.grid.rows, level.grid.cols);
    const scoreResult = computeGridScoreFromLetters(grid, dict);
    const passed = scoreResult.total >= level.threshold;

    return {
      passed,
      score: scoreResult.total,
      threshold: level.threshold,
    };
  }

  async loadProgress(): Promise<ProgressData> {
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
