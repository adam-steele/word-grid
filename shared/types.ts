/** Shared types used by client, build scripts, and Cloudflare Worker */

export type ValidationMode = 'client' | 'server';

export interface GridSize {
  rows: number;
  cols: number;
}

export interface PrefilledCell {
  row: number;
  col: number;
  letter: string;
}

export interface LevelDefinition {
  id: number;
  name: string;
  grid: GridSize;
  prefilled: PrefilledCell[];
  threshold: number;
}

/** Payload stored inside encoded level blobs */
export interface LevelPayload extends LevelDefinition {}

export interface ProgressData {
  unlockedLevel: number;
  levelBestScores: Record<number, number>;
  practiceHighScores: Record<string, number>;
  settings: { defaultCols: number; defaultRows: number };
}

export interface SignedProgress {
  data: ProgressData;
  sig: string;
}

/** Server-issued after successful level completion (server mode only) */
export interface UnlockToken {
  levelId: number;
  nextLevel: number;
  score: number;
  sig: string;
  issuedAt: number;
}

export interface LevelCompleteRequest {
  levelId: number;
  grid: string[][];
  unlockToken?: UnlockToken;
}

export interface LevelCompleteResponse {
  passed: boolean;
  score: number;
  threshold: number;
  unlockToken?: UnlockToken;
  error?: string;
}

export interface LevelMeta {
  id: number;
  name: string;
  locked: boolean;
}

export interface ScoreBreakdown {
  word: string;
  direction: 'horizontal' | 'vertical' | 'diagonal';
  score: number;
  cells: Array<{ row: number; col: number }>;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown[];
}

declare global {
  const __VALIDATION_MODE__: ValidationMode;
}

export {};
