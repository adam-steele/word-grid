/**
 * Dev-only source for levels. Encoded to public/levels/L*.enc at build time.
 * This file is NOT referenced by the runtime bundle.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePayload } from '../shared/codec.js';
import type { LevelDefinition } from '../shared/types.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const levelsPath = join(root, 'src/data/levels.json');
const outDir = join(root, 'public/levels');

const key =
  process.env.VITE_LEVEL_ENCODE_KEY ??
  process.env.LEVEL_ENCODE_KEY ??
  'dev-level-key-change-me';

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
