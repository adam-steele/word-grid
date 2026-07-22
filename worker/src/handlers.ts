import type { LevelCompleteResponse, UnlockToken } from '../../shared/types.js';
import { hmacSign, hmacVerify } from '../../shared/crypto.js';
import { findScoringWords } from './scoring.js';
import { getServerLevel, loadServerDictionaryForGrid } from './data.js';

export interface Env {
  PROGRESS_SECRET: string;
  /** Comma-separated allowed origins, e.g. "http://localhost:5173,https://yourgame.pages.dev" */
  ALLOWED_ORIGINS?: string;
}

export async function handleLevelLoad(
  levelId: number,
): Promise<Response> {
  const level = getServerLevel(levelId);
  if (!level) {
    return Response.json({ error: 'Level not found' }, { status: 404 });
  }

  // In server mode, return level without threshold to client... 
  // Actually we need threshold client-side for UI display. 
  // For true hiding, only return prefilled + grid; threshold checked server-side only.
  // v1: return full level — threshold still verified server-side on complete.
  return Response.json(level);
}

export async function handleLevelComplete(
  body: { levelId: number; grid: string[][]; unlockToken?: UnlockToken },
  env: Env,
): Promise<Response> {
  const level = getServerLevel(body.levelId);
  if (!level) {
    return Response.json({ error: 'Level not found' }, { status: 404 });
  }

  const dict = loadServerDictionaryForGrid(level.grid.rows, level.grid.cols);
  const words = findScoringWords(body.grid, dict);
  const score = words.reduce((s, w) => s + w.score, 0);
  const passed = score >= level.threshold;

  const response: LevelCompleteResponse = {
    passed,
    score,
    threshold: level.threshold,
  };

  if (passed) {
    const token = await issueUnlockToken(body.levelId, score, env.PROGRESS_SECRET);
    response.unlockToken = token;
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

export async function verifyUnlockToken(
  token: UnlockToken,
  secret: string,
): Promise<boolean> {
  const payload = JSON.stringify({
    levelId: token.levelId,
    nextLevel: token.nextLevel,
    score: token.score,
    issuedAt: token.issuedAt,
  });
  return hmacVerify(payload, token.sig, secret);
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim());
  const ok = !origin || allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok && origin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function withCors(
  response: Response,
  request: Request,
  env: Env,
): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request.headers.get('Origin'), env);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), request, env);
  }

  const url = new URL(request.url);

  try {
    if (url.pathname === '/api/level/load' && request.method === 'POST') {
      const { levelId } = (await request.json()) as { levelId: number };
      return withCors(await handleLevelLoad(levelId), request, env);
    }

    if (url.pathname === '/api/level/complete' && request.method === 'POST') {
      const body = (await request.json()) as {
        levelId: number;
        grid: string[][];
        unlockToken?: UnlockToken;
      };
      return withCors(await handleLevelComplete(body, env), request, env);
    }

    if (url.pathname === '/health') {
      return withCors(Response.json({ ok: true, mode: 'server' }), request, env);
    }

    return withCors(Response.json({ error: 'Not found' }, { status: 404 }), request, env);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return withCors(Response.json({ error: message }, { status: 500 }), request, env);
  }
}
