---
title: Money Tracker v1 spec
label: wayfinder:map
---

## Destination

A handoff-ready v1 spec for a simple personal money and expense tracker: scope, domain model, data and storage design, import/export format, core screens and tech stack. The effort stops at the spec; building the app is out of this map.

## Notes

- Domain vocabulary lives in `../CONTEXT.md`. Use those terms (Transaction, Expense, Income, Category, Currency).
- The destination has been compiled into `../SPEC.md` from the closed tickets below.
- Tracker: local markdown. Tickets are files in `tickets/`; frontmatter holds `type`, `status` (open/closed), `assignee` (the claim) and `blocked_by`. The frontier is open, unassigned tickets whose blockers are all closed.
- Settled while charting (premises, not tickets):
  - Single user, personal money, no accounting knowledge assumed.
  - Mobile-first web app (PWA), so no app-store distribution.
  - Data is local-only on the device, with import and export. No accounts, no sync.
  - Input is manual entry only.
  - Categories are flat and user-editable from a default set. Expense and Income have separate lists. A Transaction can carry one or more Categories, and its full amount counts toward each.
  - The monthly summary shows per-category totals that may overlap, labelled as such, with the real month total (income, expenses, net) shown separately. No pie charts or percentages implying the parts sum to 100%.
  - Transaction fields: amount, date (no time), type, categories, optional note. No accounts or wallets. Balance is income minus expenses, plus an optional opening balance.
  - Currency is EUR only in v1, with no selector.
  - Language is selectable, English (default) and Italian.
  - Import/export is two CSV files, Transactions and Categories. No JSON or ZIP backup. Import replaces everything.

## Decisions so far

- [Local PWA storage reliability](tickets/01-local-pwa-storage-reliability.md): use IndexedDB; Safari tabs evict after 7 days idle (installed apps exempt); `persist()` is only a request, so backup and install-to-Home-Screen nudges are core features.
- [Transaction entry flow](tickets/02-transaction-entry-flow.md): "+" opens one form (amount first, Expense default, date today); chip picker for Categories and at least one is required; undo toast on delete; returns to the list after Save.
- [Category lifecycle](tickets/03-category-lifecycle.md): translatable defaults, inline create plus settings screen, unique names per type; deleting a Category leaves a frozen Retired label on old Transactions (reserved name, still in the summary), no merge.
- [Import and export rules](tickets/04-import-export-rules.md): two CSVs (transactions, categories) in a fixed comma/dot/ISO dialect, Categories separated by `|` (forbidden in names), Retired labels are names missing from the categories list, import is replace-everything with preview, settings not in the backup.
- [Home screen prototype](tickets/05-home-screen-prototype.md): variant A, Ledger list: month switcher and all-time Balance on top, Transactions and Summary tabs, day-grouped list, "+" button to the full-screen form; the prototype file is the source.
- [Backup and restore experience](tickets/06-backup-and-restore-experience.md): decided by Claude under the user's delegation, building on variant A: gear icon to Settings, one banner at a time (iOS install nudge, then backup reminder), share-sheet export of both CSVs, `persist()` on first Save, first-run screen always offers Restore, opening-balance check after an import.
- [Tech stack](tickets/07-tech-stack.md): strict TypeScript and React, Vite with vite-plugin-pwa, IndexedDB via `idb` behind one data-access module, i18next, Vitest plus a few Playwright flows, static HTTPS hosting.
- [Settings screen and first-run experience](tickets/08-settings-and-first-run.md): gear icon to a grouped Settings screen (language, opening balance, Categories, Backup, storage and install, erase all data); first-run offers Start fresh or Restore; empty-state texts; Categories screen with rename, delete and Undo.

## Not yet specified


## Out of scope

- Sync, bank connections, receipt scanning and OCR: v1 is local-only with manual entry.
- Budgets, recurring Transactions and charts: beyond a simple tracker.
- Multiple accounts, multiple currencies, shared or household use: v1 is one person, one Currency.
- Sub-categories: Categories are flat.
- Merging Categories ([Category lifecycle](tickets/03-category-lifecycle.md)): deleting leaves a Retired label, which covers the main need; merge can come later.
- Merge import, JSON or ZIP backup, and settings in the backup ([Import and export rules](tickets/04-import-export-rules.md)): v1 import is replace-everything from two CSVs.
