# AGENTS.md

Instructions for AI coding agents working in this repo. Read `PRD.md` first for what we're building and what is out of scope.

## Project
Local-only personal money tracker. Single user, no auth, no backend. All data stays in the browser.

## Stack
- Vite + React + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui for components
- Dexie (IndexedDB) for storage
- Zod for validating imported data and form input
- Recharts for charts
- React Router for routing
- vite-plugin-pwa for offline and installability
- Vitest for tests

Do not add new dependencies without asking first.

## Commands
- `npm run dev`: start the dev server
- `npm run build`: production build
- `npm run typecheck`: TypeScript check
- `npm run lint`: lint
- `npm run test`: run tests

## Structure
```
src/
  db/           Dexie setup, schema, and ALL database access
  features/
    transactions/
    categories/
    overview/
    backup/
  components/   shared UI (shadcn lives in components/ui)
  lib/          pure helpers (money, dates, csv)
```

## Hard rules
- **Money is an integer** in the smallest currency unit. Never use floats for amounts. Format for display only, in `lib/money.ts`.
- **Dates are `YYYY-MM-DD` strings in local time.** Do not store JS `Date` objects or UTC timestamps for the transaction date. This avoids timezone off-by-one bugs.
- **All database access goes through `src/db`.** Components never call Dexie directly.
- **No network calls.** No analytics, no external APIs, no CDN scripts.
- Validate imported JSON with Zod before writing anything to the database.
- Never delete a category that has transactions without reassigning or confirming.

## UI
- Mobile-first. Everything must work at 375px width.
- Use shadcn/ui components and Tailwind theme tokens. Do not hardcode colors or invent one-off styles.
- Keep forms fast: sensible defaults (today's date, last-used category), minimal fields.

## How to work
1. For anything non-trivial, propose a short plan first and wait for approval.
2. Work in small steps. One feature or fix per change.
3. Before saying a task is done, run `typecheck`, `lint`, and `test`, and report the result.
4. Write tests for pure logic (money, dates, totals, CSV, import validation).
5. Don't refactor or touch unrelated files.
6. If a decision changes the product or data model, update `PRD.md` in the same change.
7. If something is ambiguous, ask instead of guessing.
