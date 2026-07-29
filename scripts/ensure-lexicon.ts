/** Run build:lexicon when lexicon-valid.json is missing (CI / fresh clone). */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lexiconPath = join(root, 'scripts/data/lexicon-valid.json');

if (!existsSync(lexiconPath)) {
  console.log('lexicon-valid.json missing — running build:lexicon (SCOWL download may occur)...');
  execSync('tsx scripts/build-lexicon.ts', { cwd: root, stdio: 'inherit' });
}
