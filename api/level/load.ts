export const config = { runtime: 'edge' };

import { handleLevelLoad } from '../../lib/server/handlers.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { levelId } = (await req.json()) as { levelId: number };
    return handleLevelLoad(levelId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}
