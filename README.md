# precisley

A daily attention game. Five distinct digits from **0–9** map to A–E. Each question shows four of those digits; pick the letter of the missing one.

Everyone gets the same puzzle for a given **UTC** calendar day. After you finish, a path replay walks every row and reveals correctness. Each row has five seconds. Answers lock as you go — no edits, no peeking mid-run.

There is **no backend and no database**. The daily board is a pure function of `YYYY-MM-DD` plus a seeded RNG. Personal stats stay in `localStorage` on your device.

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
4. Build 100 rows: each omits exactly one key number and shuffles the other four.

No `Math.random()` is used for daily generation. Practice mode uses a fresh random seed and never overwrites the stored daily result.

A completed daily run is saved in `localStorage` (`focustest.v1`). Refreshing that day shows results instead of a new attempt.

Trivia (“Today you’re as precise as …”) is seeded from the same UTC date (or the practice run seed).

The client uses the browser’s UTC date, then optionally checks the deployed site’s HTTP `Date` header to correct mild clock skew. If that fails, it keeps local UTC. No Worker, KV, or D1.

## How to play

- **Desktop:** click A–E, or press `A`–`E` / `1`–`5`.
- **Mobile:** tap the letter buttons. The key and timer stay sticky.
- Only the current row is interactive. Previous answers are locked.
- Each row has **5 seconds**. Miss the window and the row stays blank — counted as a miss.
- Correctness is hidden until the end. Then the path reveal runs (Skip or Escape to jump to stats).

## Deploy on Cloudflare Pages (free)

This is a static Vite app. Output is `dist/`. No environment secrets, API keys, or Cloudflare datastore. **Do not set a deploy command.** `npm run build` already produces `dist/`; Pages just publishes that folder. `npx wrangler deploy` is for Workers and will fail here (and is unnecessary).

In the Cloudflare dashboard: **Workers & Pages → your project → Settings → Builds**.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Deploy command | *(leave empty)* |
| Node.js version | `20` |

Set Node under **Settings → Environment variables → `NODE_VERSION=20`**, or rely on the repo `.nvmrc` / `.node-version`.

If a previous setup put `npx wrangler deploy` in **Deploy command**, clear it. That is what failed after a successful `vite build`.

After the first deploy, the site is a plain HTTPS origin. SPA fallback lives in `public/_redirects` (`/* /index.html 200`).

Optional, local-only publish with Wrangler (Node 20, not used by the Pages git build):

```bash
npm run build
npx wrangler pages deploy dist
```

Do not install Wrangler globally. Do not use `npx wrangler deploy` (Workers) for this project.

## Homepage demo

The start screen loops a 10-row sample from the same puzzle engine (`src/components/DemoPlay.tsx`). It is a live React widget, not a GIF.
