# Word Grid

A lightweight in-browser word grid game. Enter one row at a time; score vertical, horizontal, and diagonal dictionary words using Scrabble letter values and direction multipliers.

## Quick start

```bash
nvm use          # Node 20 (see .nvmrc)
npm install
npm run dev
```

Open http://localhost:5173

## Modes

- **Practice** — pick grid size, fill all rows, see final score breakdown. High scores saved per grid size.
- **Levels** — locked prefilled letters, score thresholds, 8 progressive levels.

## Validation modes

Switch between client-only and Cloudflare Worker validation with env vars — no code changes.

| | Client (default) | Server |
|---|---|---|
| `VITE_VALIDATION_MODE` | `client` | `server` |
| `VITE_API_URL` | — | Worker URL |
| Level data | Lazy-loaded `.enc` blobs | Worker API |
| Score check | Client recomputes | Worker recomputes |

```bash
cp .env.example .env
# For server mode after deploying worker:
# VITE_VALIDATION_MODE=server
# VITE_API_URL=https://word-grid-api.<subdomain>.workers.dev
```

Deploy worker:

```bash
wrangler secret put PROGRESS_SECRET
npm run worker:deploy
```

## Anti-cheat

1. Levels encoded at build → `public/levels/L*.enc` (plain JSON never shipped)
2. Lazy level loading (level N fetched only when selected)
3. HMAC-signed localStorage progress (tampering resets to level 1)
4. Pass/fail always from final grid recompute
5. Optional Worker for server-side verification

## Level authoring

Edit [`src/data/levels.json`](src/data/levels.json), then:

```bash
npm run build:data
```

### Using position stats for difficulty

After `npm run build:data`, check generated files:

- `src/data/position-stats-5.json` — letter counts per position for 5-letter words
- `src/data/flexibility-5.json` — quick lookup: `"O@2": 612` means 612 words have O in position 3 (0-indexed)

**Easy constraints** (many words still fit): vowels in positions 1–2, S/E/Y at end.  
**Hard constraints**: X/Z/Q/J at position 0, rare letters in rare slots.

Example: `"E@1"` with count ~1200+ is easy; `"X@0"` with count ~40 is hard.

### Level JSON schema

```json
{
  "id": 2,
  "name": "Easy Vowel",
  "grid": { "rows": 6, "cols": 5 },
  "prefilled": [{ "row": 2, "col": 1, "letter": "E" }],
  "threshold": 35
}
```

## Dictionary

On first `npm run build:data`, downloads ~25k words to `scripts/data/popular.txt`.  
Override with your own list at `scripts/data/enable.txt` (one word per line).  
On first build, **NASPA NWL2023** (~190k words, official US/Canada Scrabble lexicon) is auto-downloaded.

**Scoring rules:**
- Minimum **3 letters** for all scored words
- Columns/diagonals: only the **longest** valid word per contiguous segment
- Diagonal lines counted **once** (no bidirectional duplicates)
- Cross-word scoring uses **locked rows only** — no phantom highlights while typing

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build data + Vite dev server |
| `npm run build` | Production build |
| `npm run build:data` | Dictionary, position stats, encoded levels |
| `npm test` | Run unit tests |
| `npm run worker:dev` | Local Worker |
| `npm run worker:deploy` | Deploy Worker |

## Scoring

```
letterScore  = sum of Scrabble values
lengthBonus  = wordLength²
baseScore    = letterScore + lengthBonus
multipliers  = horizontal ×1.0, vertical ×1.5, diagonal ×2.0
```

## Project layout

```
src/validation/   ValidationProvider (client ↔ server switch)
src/storage/      Signed progress + practice high scores
shared/           Types, scoring, codec, crypto (client + worker)
worker/           Cloudflare Worker
scripts/          Build pipeline
```
