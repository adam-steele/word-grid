/** Cloudflare Worker — thin router; shared logic lives in lib/server */
import type { UnlockToken } from '../../shared/types.js';
import {
  handleHealth,
  handleLevelComplete,
  handleLevelLoad,
} from '../../lib/server/handlers.js';

export interface Env {
  PROGRESS_SECRET: string;
  ALLOWED_ORIGINS?: string;
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

function withCors(response: Response, request: Request, env: Env): Response {
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
      return withCors(await handleLevelComplete(body, env.PROGRESS_SECRET), request, env);
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return withCors(handleHealth(), request, env);
    }

    return withCors(Response.json({ error: 'Not found' }, { status: 404 }), request, env);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return withCors(Response.json({ error: message }, { status: 500 }), request, env);
  }
}
