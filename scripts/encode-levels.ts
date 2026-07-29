/**
 * Dev-only source for levels. Encoded to public/levels/L*.enc at build time.
 * This file is NOT referenced by the runtime bundle.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { encodePayload } from '../shared/codec.js';
import { resolveLevelEncodeKey } from '../shared/level-key.js';
import type { LevelDefinition } from '../shared/types.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const levelsPath = join(root, 'src/data/levels.json');
const outDir = join(root, 'public/levels');

const env = loadEnv(process.env.NODE_ENV ?? 'development', root, '');
const key = resolveLevelEncodeKey(
  env.VITE_LEVEL_ENCODE_KEY ?? process.env.LEVEL_ENCODE_KEY,
);

const levels = JSON.parse(readFileSync(levelsPath, 'utf8')) as LevelDefinition[];

mkdirSync(outDir, { recursive: true });

for (const level of levels) {
  const json = JSON.stringify(level);
  const encoded = encodePayload(json, key);
  const outPath = join(outDir, `L${level.id}.enc`);
  writeFileSync(outPath, encoded, 'utf8');
  console.log(`Encoded level ${level.id} → ${outPath} (${encoded.length} chars)`);
}

console.log(`\nEncoded ${levels.length} levels.`);
