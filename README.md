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
  "threshold": 254
}
```

Generate 50 levels with calibrated thresholds:

```bash
npm run generate:levels   # writes src/data/levels.json + level-manifest.json
npm run analyze:scoring   # Monte Carlo pass-rate report
```

**Level tiers:** 1–10 (~85–90% pass), 11–20 (~75–80%), stepping down ~10% per block to 41–50 (~45–55%).

## Dictionary

Word lists are built from **NWL2023** (Scrabble lexicon) filtered through **SCOWL** (Spell Checker Oriented Word Lists, size 70). This keeps familiar dictionary words while dropping obscure Scrabble-only entries and most proper names. Players only download compact JSON word lists — never the full lexicon dump.

### First-time / rare lexicon build (dev only)

```bash
npm run build:lexicon   # downloads SCOWL (~2.3 MB) if missing, writes lexicon-valid.json
```

Produces `scripts/data/lexicon-valid.json` (cached; committed for CI). Re-run when exclusion rules or SCOWL gate settings change.

Then:

```bash
npm run build:data          # dictionary JSON + encoded levels
npm run analyze:dictionary  # coverage report (3/4-letter counts, rejection reasons)
```

**Inclusion rule:** `NWL ∩ SCOWL(words, size 70) − proper/upper names − blocklist ∪ allowlist`  
Names are rejected when SCOWL lists them as proper-names or upper-case entries and the word only appears at frequency band >35 (obscure). Common dictionary homographs (e.g. ART, MARK) are kept.
**Manual overrides:** `scripts/data/allowlist.txt`, `scripts/data/blocklist.txt`

**Scoring multipliers:** horizontal 1.0, vertical 1.35, diagonal 1.6

**Scoring rules:**
- Minimum **3 letters** for all scored words
- Columns/diagonals: only the **longest** valid word per contiguous segment
- Diagonal lines counted **once** (no bidirectional duplicates)
- Cross-word scoring uses **locked rows only** — no phantom highlights while typing

## Deploy to Vercel

Everything runs on **Vercel free tier**: static game + Edge API (`/api/level/*`).

### 1. Connect the repo

1. Go to [vercel.com/new](https://vercel.com/new) and import **adam-steele/word-grid**.
2. Confirm settings (from `vercel.json`):
   - **Build command:** `npm run build`
   - **Output directory:** `dist`

### 2. Environment variables

Add these in **Project → Settings → Environment Variables** (Production):

| Variable | Example | Notes |
|----------|---------|--------|
| `VITE_VALIDATION_MODE` | `server` | Server score verification |
| `VITE_PROGRESS_SECRET` | `openssl rand -hex 32` | Client progress signing (in bundle) |
| `PROGRESS_SECRET` | same or separate random | **Server only** — unlock tokens |
| `VITE_LEVEL_ENCODE_KEY` | `openssl rand -hex 32` | Encodes levels at build time |

Leave `VITE_API_URL` **unset** — the app calls same-origin `/api/...` on Vercel.

Redeploy after changing env vars.

### 3. Deploy

Deploy from the Vercel dashboard or CLI:

```bash
npx vercel --prod
```

Check the API: `GET https://your-app.vercel.app/api/health`

### Local development

| Command | Use |
|---------|-----|
| `npm run dev` | Client mode — fast Vite dev, no API |
| `npm run dev:vercel` | Server mode — Vite + Edge API together |

Copy `.env.example` to `.env` for local secrets.

---

## Security & validation modes

| Mode | When | Score check |
|------|------|-------------|
| **client** | Local `npm run dev` | Browser recomputes |
| **server** | Vercel production | Edge API recomputes |

**Server mode (Vercel):** level pass/fail and unlock tokens are authoritative. `PROGRESS_SECRET` never ships to the browser. Progress/high scores still live in localStorage (signed with `VITE_PROGRESS_SECRET`).

**Client mode:** fine for casual play; secrets and level blobs are in the JS bundle.

The optional **Cloudflare Worker** in `worker/` still works if you prefer that over Vercel Edge — set `VITE_API_URL` to the Worker URL.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client mode — Vite dev server |
| `npm run dev:vercel` | Server mode — Vercel dev (site + API) |
| `npm run build` | Production build |
| `npm run build:data` | Dictionary, position stats, encoded levels |
| `npm test` | Run unit tests |
| `npm run worker:dev` | Optional Cloudflare Worker locally |
| `npm run worker:deploy` | Optional Cloudflare Worker deploy |

## Scoring

```
letterScore  = sum of Scrabble values
lengthBonus  = wordLength²
baseScore    = letterScore + lengthBonus
multipliers  = horizontal ×1.0, vertical ×1.5, diagonal ×2.0
```

## Project layout

```
api/              Vercel Edge API routes
lib/server/       Shared level/score handlers
src/validation/   ValidationProvider (client ↔ server switch)
src/storage/      Signed progress + practice high scores
shared/           Types, scoring, word-finder, crypto
worker/           Optional Cloudflare Worker (legacy)
scripts/          Build pipeline
```
