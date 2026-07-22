import type { LevelCompleteResponse, UnlockToken } from '../../shared/types.js';
import { hmacSign } from '../../shared/crypto.js';
import { findScoringWords, MIN_WORD_LENGTH } from '../../shared/word-finder.js';
import { getServerLevel, loadServerDictionaryForGrid } from './data.js';

export function resolveProgressSecret(override?: string): string {
  if (override) return override;
  const secret = process.env.PROGRESS_SECRET;
  if (!secret) {
    throw new Error('PROGRESS_SECRET is not configured');
  }
  return secret;
}

export async function handleLevelLoad(levelId: number): Promise<Response> {
  const level = getServerLevel(levelId);
  if (!level) {
    return Response.json({ error: 'Level not found' }, { status: 404 });
  }

  return Response.json(level);
}

export async function handleLevelComplete(
  body: {
    levelId: number;
    grid: string[][];
    unlockToken?: UnlockToken;
  },
  progressSecret?: string,
): Promise<Response> {
  const level = getServerLevel(body.levelId);
  if (!level) {
    return Response.json({ error: 'Level not found' }, { status: 404 });
  }

  const dict = loadServerDictionaryForGrid(level.grid.rows, level.grid.cols);
  const words = findScoringWords(body.grid, dict, { minLength: MIN_WORD_LENGTH });
  const score = words.reduce((s, w) => s + w.score, 0);
  const passed = score >= level.threshold;

  const response: LevelCompleteResponse = {
    passed,
    score,
    threshold: level.threshold,
  };

  if (passed) {
    response.unlockToken = await issueUnlockToken(
      body.levelId,
      score,
      resolveProgressSecret(progressSecret),
    );
  }

  return Response.json(response);
}

async function issueUnlockToken(
  levelId: number,
  score: number,
  secret: string,
): Promise<UnlockToken> {
  const issuedAt = Date.now();
  const payload = JSON.stringify({ levelId, nextLevel: levelId + 1, score, issuedAt });
  const sig = await hmacSign(payload, secret);
  return { levelId, nextLevel: levelId + 1, score, sig, issuedAt };
}

export function handleHealth(): Response {
  return Response.json({ ok: true, mode: 'server', platform: 'vercel' });
}
