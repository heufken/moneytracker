# Money Tracker

A personal, local-only money tracker. No accounts, no backend, no cloud — all data lives in your browser.

Built mobile-first: log a transaction in under 10 seconds, then see where your money goes each month.

## Features

- **Transactions** — income and expenses with category, date, note, and an optional wallet tag. Filterable list by month, type, and category.
- **Wallets** — track where money sits: cash, bank, e-wallet, crypto. Live balance = opening + income − expense. Overview shows the total across all wallets with a per-wallet breakdown.
- **Overview** — monthly income / expense / net, spending by category, and an income-vs-expense chart for the last 6 months.
- **Categories** — seeded with a small default set; add, rename, or delete your own.
- **Backup** — export/import all data as JSON (with a diff preview and pre-import snapshot), export transactions to CSV.
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

## Design decisions

- **Money is an integer** in the smallest currency unit — never a float.
- **Dates are `YYYY-MM-DD` strings in local time** — no timezone off-by-one bugs.
- **All database access goes through `src/db`** — components never touch Dexie directly.
- **Imported JSON is validated with Zod** before anything reaches the database.

See [PRD.md](PRD.md) for the full product scope and data model.
