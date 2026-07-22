export const config = { runtime: 'edge' };

import { handleHealth } from '../lib/server/handlers.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  return handleHealth();
}
