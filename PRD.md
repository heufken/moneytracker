# Money Tracker: PRD (v1)

A personal, local-only money tracker. Built for fun and learning. No accounts, no backend, no cloud.

## Goal
Let me quickly log income and expenses by hand and see where my money goes each month.

## User
Just me, on one device (phone first, laptop second). No login.

## Core features (v1)
1. **Add / edit / delete a transaction**: type (income or expense), amount, category, date, optional note.
2. **Categories**: a small default set (e.g. Salary, Freelance, Food, Transport, Bills, Fun) that I can add, rename, or delete. Each category belongs to either income or expense.
3. **Transaction list**: newest first, filterable by month, type, and category.
4. **Overview** for a selected month:
   - total income, total expense, net
   - spending by category (chart)
   - income vs expense for the last 6 months (chart)
 5. **Backup**: export all data to JSON, import from JSON, export transactions to CSV.
6. **Wallets**: track where money sits (cash, bank app, e-wallet, crypto). Optional tag on
   each transaction, opening balance per wallet, live balance = opening + income − expense.
   Onboarding sheet on first run (empty db) offers common wallets; skippable, and wallets
   are managed in Settings. Deleting a wallet keeps its transactions (tag removed) after
   confirmation.

## Out of scope for v1
Login or multiple users, cloud sync, bank sync or API integrations, multi-currency, budgets and goals, recurring transactions, receipts or attachments, notifications.
(Budgets and recurring transactions are the likely v2.)

## Data model
- **Category**: `id`, `name`, `type` (income | expense), `color`
- **Wallet**: `id`, `name`, `initialBalance` (integer, smallest currency unit). `Transaction.walletId` optional.
- **Transaction**: `id`, `type`, `amount` (integer, smallest currency unit), `categoryId`, `walletId` (optional), `date` (`YYYY-MM-DD` string), `note`, `createdAt`, `updatedAt`
- **Settings**: `currency` (default IDR)
- **Backup snapshot**: `id`, `label`, `createdAt`, full copy of categories + transactions + wallets + settings. The newest 3 are kept automatically; one is taken before every import or restore. Import accepts older files without wallets.

## Import behavior
- Importing replaces all data, but only after a diff preview (added / changed / removed per table, net money change) and explicit confirmation.
- Before any replace, current data is saved as a snapshot restorable from Settings.

## Non-functional requirements
- Works offline and is installable on a phone home screen (PWA).
- Mobile-first: usable at 375px width, with large touch targets.
- Adding a transaction should take under 10 seconds.
- Data lives only in the browser (IndexedDB). Losing it must be recoverable via backup.

## Definition of done (v1)
- I can add, edit, and delete transactions and categories, and everything survives a page reload.
- The overview numbers match a manual check on sample data.
- Export then import restores identical data.
- Typecheck, lint, and tests pass.

## Open questions
- Should the overview support custom date ranges, or only whole months?
- Wallet-to-wallet transfers: wallets exist, transfers do not. Record as expense + income pair meanwhile; a real transfer type is a v2 candidate.
