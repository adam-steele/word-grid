import type { ProgressData } from '@shared/types.js';
import { getValidationProvider } from '../validation/index.js';

export async function savePracticeHighScore(
  cols: number,
  rows: number,
  score: number,
): Promise<ProgressData> {
  const provider = getValidationProvider();
  const progress = await provider.loadProgress();
  const key = `${cols}x${rows}`;
  const prev = progress.practiceHighScores[key] ?? 0;

  if (score <= prev) return progress;

  const next: ProgressData = {
    ...progress,
    practiceHighScores: { ...progress.practiceHighScores, [key]: score },
  };
  await provider.saveProgress(next);
  return next;
}

export async function getPracticeHighScore(cols: number, rows: number): Promise<number> {
  const provider = getValidationProvider();
  const progress = await provider.loadProgress();
  return progress.practiceHighScores[`${cols}x${rows}`] ?? 0;
}

export async function getDefaultGridSettings(): Promise<{ defaultCols: number; defaultRows: number }> {
  const provider = getValidationProvider();
  const progress = await provider.loadProgress();
  return progress.settings;
}

export async function saveDefaultGridSettings(cols: number, rows: number): Promise<void> {
  const provider = getValidationProvider();
  const progress = await provider.loadProgress();
  await provider.saveProgress({
    ...progress,
    settings: { defaultCols: cols, defaultRows: rows },
  });
}
