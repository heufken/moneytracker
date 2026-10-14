# Money Tracker

A personal, local-only money tracker. No accounts, no backend, no cloud — all data lives in your browser. (Optional: sync the same data between your own devices; see [Optional sync](#optional-sync).)

Built mobile-first: log a transaction in under 10 seconds, then see where your money goes each month.

## Features

- **Transactions** — income and expenses with category, date, note, and an optional wallet tag. Filterable list by month, type, and category.
- **Wallets** — track where money sits: cash, bank, e-wallet, crypto. Live balance = opening + income − expense. Overview shows the total across all wallets with a per-wallet breakdown.
- **Overview** — monthly income / expense / net, spending by category, and an income-vs-expense chart for the last 6 months.
- **Categories** — seeded with a small default set; add, rename, or delete your own.
- **Backup** — export/import all data as JSON (with a diff preview and pre-import snapshot), export transactions to CSV.
- **Sync (optional)** — keep your phone and desktop browsers on the same data through an end-to-end-encrypted copy on a tiny Cloudflare Worker you host. Off by default.
- **Offline & installable** — works as a PWA on your phone's home screen, fully offline.

## Stack

Vite · React · TypeScript · Tailwind CSS + shadcn/ui · Dexie (IndexedDB) · Zod · Recharts · React Router · vite-plugin-pwa · Vitest

## Getting started

```sh
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Lint |
| `npm run test` | Run tests |

## Optional sync

Off by default: the app makes no network calls unless the build has `VITE_SYNC_URL`. When on, each device still works locally and exchanges one encrypted copy of your data through `worker/` (Cloudflare Worker + KV, free plan is enough). No accounts: **Settings → Sync → Turn on sync** creates a random secret, and the pairing link *is* the password. Open it on your other device, or paste it into Settings → Sync there (use paste for an installed home-screen app). If both devices edit between syncs, the newest push wins and the other device's edits stay in its "before sync" snapshot. Needs HTTPS or `localhost`.

Try it locally (no Cloudflare account needed), using two browsers or a normal + incognito window as two devices:

```sh
cd worker && npx wrangler dev                                          # http://localhost:8787, simulated KV
echo 'VITE_SYNC_URL=http://localhost:8787' > .env.local && npm run dev  # repo root, second terminal
```

Deploy: `cd worker && npx wrangler kv namespace create BLOBS`, paste the id into `wrangler.toml`, `npx wrangler deploy`, then set `VITE_SYNC_URL=https://<your-worker>.workers.dev` as a build environment variable on your host. Stay on the Workers Free plan: hitting a limit makes sync calls fail, it does not bill you.

## Design decisions

- **Money is an integer** in the smallest currency unit — never a float.
- **Dates are `YYYY-MM-DD` strings in local time** — no timezone off-by-one bugs.
- **All database access goes through `src/db`** — components never touch Dexie directly.
- **Imported JSON is validated with Zod** before anything reaches the database.

See [PRD.md](PRD.md) for the full product scope and data model.
