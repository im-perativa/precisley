# precisley

A daily attention game. Five distinct digits from **0–9** map to A–E. Each question shows four of those digits; pick the letter of the missing one.

Everyone gets the same puzzle for a given **UTC** calendar day. After you finish, a path replay walks every row and reveals correctness. Daily rows start at ten seconds and tighten every ten rows (10, 8, 7, 6, 5, 4). A perfect daily unlocks **endless**: 4 seconds per row, −0.1s every ten bonus rows, floor 2s, until the first miss. Practice stays at ten seconds. Answers lock as you go — no edits, no peeking mid-run.

There is **no database**. The daily board is a pure function of `YYYY-MM-DD` plus a seeded RNG. Personal stats stay in `localStorage`. Production has a tiny Cloudflare Worker route, `/api/utc`, that only returns today’s UTC date from the Worker clock.

## Run locally

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build    # production build → dist/
npm run preview  # serve dist/ locally
```

## Daily seed

The puzzle is generated from the UTC date `YYYY-MM-DD` (shown in the UI).

1. Hash `focustest:daily:YYYY-MM-DD` with FNV-1a 32-bit.
2. Drive a Mulberry32 PRNG from that seed.
3. Shuffle 0–9, take five distinct digits as A–E.
4. Build 60 daily rows (practice builds 20): each omits exactly one key number and shuffles the other four.

No `Math.random()` is used for daily generation. Practice mode uses a fresh random seed and never overwrites the stored daily result.

Score is `accuracy² × 10,000 − 2 × seconds` (accuracy = correct / scored rows). Perfect runs rank first; among them, faster wins. Endless time is **not** included in daily time or score — those stay the 60-row clock so a longer bonus does not look like a worse time.

A completed daily run is saved in `localStorage` (`focustest.v3`). Refreshing that day shows results instead of a new attempt. Daily and practice personal bests are stored separately so a 20-row practice 100% cannot overwrite a 60-row daily record. Older `v1` / `v2` keys are not migrated.

Trivia (“Today you’re as precise as …”) is seeded from the same UTC date (or the practice run seed).

The client fetches same-origin `/api/utc` (Cloudflare Worker clock in production). Play stays disabled until that resolves so a changed device clock cannot load another day’s board. If the request fails (offline), it falls back to the browser’s UTC date. No KV or D1.

## How to play

- **Desktop:** click A–E, or press `A`–`E` / `1`–`5`.
- **Mobile:** tap the letter buttons. The key and timer stay sticky.
- Only the current row is interactive. Previous answers are locked.
- Daily: **10 / 8 / 7 / 6 / 5 / 4** seconds per ten rows. A perfect board unlocks **endless** (4s, −0.1s every ten bonus rows, floor 2s, first miss ends it). Practice stays at **10 seconds**. Miss the window and the row stays blank — counted as a miss (except the endless stopper, which is dropped so the card stays 100%).
- Correctness is hidden until the end. Then the path reveal runs (Skip or Escape to jump to stats).

## Deploy (Cloudflare)

This is a static Vite SPA. `npm run build` writes `dist/`. There is no Worker script, no secrets, and no datastore.

### Workers Builds (this project's dashboard)

The **Builds** UI has no output-directory field. Wrangler publishes `dist/` from `[assets]` in `wrangler.toml`. SPA fallback is `not_found_handling = "single-page-application"` — do **not** add a Pages `_redirects` rule (`/* /index.html 200`). Wrangler treats that as a loop (error 100324). Leave the existing deploy commands as-is. Wrangler 4 needs **Node 20** on the build image (`NODE_VERSION=20`, or the repo `.nvmrc` / `.node-version`).

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Node.js | `20` (`NODE_VERSION=20`) |

Do not install Wrangler globally. `npx` downloads it for the deploy step.

### Classic Pages (optional)

If the project is a **Pages** app instead of Workers Builds, that UI has an output directory and should **not** run Wrangler:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Deploy command | *(empty)* |
| Node.js version | `20` |

## Homepage demo

The start screen loops a 10-row sample from the same puzzle engine (`src/components/DemoPlay.tsx`). It is a live React widget, not a GIF.
