# Money Tracker v1: product spec

A simple personal money and expense tracker for one person with no accounting knowledge. The user records Expenses and Income, sorts them into Categories, and sees their Balance and a monthly summary. It runs as a mobile-first web app (PWA), keeps all data on the device, and backs up through CSV files.

This spec is compiled from the Wayfinder map in `.wayfinder/`. Every section names the ticket that holds the full reasoning. Where something was decided by Claude under the owner's delegation, or is an assumption nobody confirmed, it is listed in [section 11](#11-open-items-assumptions-and-delegated-decisions). Vocabulary is defined in `CONTEXT.md`; capitalised terms below (Transaction, Category and so on) are those terms.

## 1. Scope

**In v1**
- One person tracking personal money. No accounting knowledge assumed.
- Manual entry of Expenses and Income, each with one or more Categories, an amount, a date and an optional note.
- User-editable flat Categories, with separate lists for Expenses and Income.
- A Transactions list, an all-time Balance, and a monthly summary.
- Local-only storage on the device, with CSV export and import.
- One Currency, EUR. English and Italian UI, selectable.

**Out of scope for v1**
- Sync, accounts, bank connections, receipt scanning or OCR.
- Budgets, recurring Transactions, charts.
- Multiple accounts or wallets, multiple Currencies, shared or household use.
- Sub-categories and merging Categories.
- Merge-style import, JSON or ZIP backup, and settings inside the backup.

## 2. Domain model

See `CONTEXT.md` for the glossary. In short:

- **Transaction**: one recorded movement of money, an **Expense** (money out) or **Income** (money in). It carries one or more Categories or Retired labels.
- **Category**: a flat, user-editable label. Expense and Income each have their own list. A Transaction's full amount counts toward each of its Categories.
- **Retired label**: the frozen name of a deleted Category, kept as plain text on the Transactions that had it.
- **Balance**: Opening balance plus all Income minus all Expenses, over all time.
- **Opening balance**: a setting, may be negative, not part of the backup.
- **Currency**: EUR, fixed.

## 3. Data model

*Fields and rules below come from the decisions. Where a storage shape is not stated by a ticket, it is marked as a recommendation.*

**Transaction**
- `date`: a calendar date with no time of day (`YYYY-MM-DD`), future dates allowed.
- `type`: expense or income.
- `amount`: greater than zero, at most 2 decimals, always positive (the type gives the direction). *Recommendation: store as integer cents to avoid floating-point errors.*
- Categories: one or more entries. Each entry is either a reference to a live Category or a Retired label (frozen text). At least one entry is always present.
- `note`: optional text.

**Category**
- `type` (expense or income), `name`, and an optional `defaultKey` that is set only while the Category is a still-translatable starter default.
- Names are unique within a type (case-insensitive, trimmed), at most 30 characters, and must not contain `|`. The same name may exist in both lists.
- *Recommendation: store a `lastUsedAt` per Category to drive the picker ordering.*
- A renamed starter default loses its `defaultKey` and becomes a plain custom Category.

**Retired label**
- Created when a Category is deleted. It keeps the Category's name as displayed at that moment, in the language active then, and never changes afterwards (it does not translate).
- It is not a Category: it never appears in the entry picker or the Categories screen.
- It can be removed from a Transaction but never re-added.
- It reserves its name: a Category with the same name in that type cannot be created or renamed to. *Derived consequence: the reservation lasts as long as at least one Transaction still carries the label.*

**Settings** (device-level, stored separately from Transactions, never exported)
- Language (English default), Opening balance (default 0.00), plus bookkeeping for reminders: last-backed-up time, change count since last backup, banner dismissal times.

**Starter Categories**
- Expense: Groceries, Dining out, Transport, Housing, Utilities, Health, Entertainment, Shopping, Other.
- Income: Salary, Gifts, Other.
- Stored with a `defaultKey` and shown in the current language. "Other" has no special protection. Italian names are written at build time.

Source tickets: *Category lifecycle*, *Transaction entry flow*, *Settings screen and first-run experience*.

## 4. Screens and flows

The home screen is **variant A, Ledger list**. A runnable reference lives at `.wayfinder/prototypes/home-screen/index.html` (variant A is the default; it is a throwaway prototype with fake data, so use it for look and behaviour only, not as code). Source ticket: *Home screen prototype*.

### 4.1 Home screen

- Header: a month switcher (previous and next arrows around the month name) above a large **Balance** figure, with a gear icon at the right of the Balance row that opens Settings.
- Two tabs: **Transactions** and **Summary**. A floating "+" button opens the add form.
- **Transactions tab:** a list grouped by day, newest first. Each day header shows that day's net amount. Each row shows the note (or the first Category if there is no note), the Category chips (Retired labels greyed with a dashed outline), and the signed amount (green plus for Income, red minus for Expenses). Tapping a row opens the edit form.
- **Banners** appear as the first item of the Transactions tab, one at a time. The iOS install nudge takes priority over the backup reminder (see section 7).
- **Summary tab:** see section 5.

### 4.2 Add, edit and delete a Transaction

- "+" opens one full-screen form. An Expense/Income toggle sits at the top, Expense by default.
- Amount is the first field and takes focus with the numeric keypad open. Defaults: type Expense, date today, no Categories selected, empty note.
- Categories are tappable chips showing only the Categories of the chosen type, any number selectable, ordered by most recently used. A "+ New" chip creates a Category inline. Switching type clears the selection.
- **At least one Category (or Retired label) is required.** Save stays disabled until an amount and a Category are present.
- Amount: greater than zero, at most 2 decimals, both `,` and `.` accepted as the decimal separator whatever the language, no maximum. Future dates are allowed.
- After Save the app returns to the list with the new Transaction visible at its date position (switching to that month if needed).
- Edit: tap a row to open the same form pre-filled. A Transaction's Retired labels appear as selected, greyed chips that can be removed but not re-added.
- Delete: only inside the edit form. It deletes immediately and shows an Undo toast for about 5 seconds. There is no confirmation dialog and no edit history.

### 4.3 Categories screen

- Reached from Settings. An Expense/Income toggle at the top, then an alphabetical list for the chosen type.
- Tapping a row opens a rename dialog with a Delete button. A "+ New category" button sits at the bottom.
- The dialog enforces the name rules from section 3 and refuses names reserved by a Retired label with a message.
- **Delete** shows how many Transactions use the Category, then removes it and replaces it on those Transactions with a Retired label, with a short Undo toast. Any Category may be deleted, including the last one of a type; with an empty list the entry picker shows only "+ New".

### 4.4 Settings

Opened by the gear icon; a back arrow returns home. One scrolling screen of grouped rows, in this order:

1. **Language:** English or Italian, English by default. Applies immediately with no reload, including translatable default Category names. Dates and numbers follow the language's formatting. A device setting: not in the backup, unchanged by an import.
2. **Opening balance:** one amount edited through a small dialog; negative values allowed, at most 2 decimals, both `,` and `.` accepted, default 0.00. Changing it updates the Balance immediately. No date, no history.
3. **Categories:** opens the Categories screen.
4. **Backup:** Export, Import, last-backed-up date, and a reminder that the Opening balance is not in the files.
5. **Storage and install:** storage status ("protected" or "not guaranteed", with one line of explanation) and an "Install app" row on Android and desktop.
6. **Erase all data:** needs a clear confirmation saying the data cannot be recovered, recommends exporting first and offers the export right there. Afterwards the app returns to the first-run screen.
7. Footer: the app version and "Your data stays on this device."

### 4.5 First-run screen

- Shown whenever the database is empty (the app cannot tell "never used" from "erased by the browser"). It shows the app name, a line saying the data stays on this device, English and Italiano chips (English preselected), and two buttons side by side: **Start fresh** and **Restore from backup**.
- **Start fresh** goes to one skippable step, "Starting balance (optional)" (an amount field and a Skip button), then opens the home screen with the starter Categories already in place and no commentary about them.
- **Restore from backup** opens the import flow (section 6), followed by the opening-balance check.

### 4.6 Empty states

- No Transactions at all: "Nothing here yet. Tap + to add your first expense or income."
- An empty month while other months have data: "No Transactions this month. Tap + to add one." The month switcher keeps working.
- Summary tab, empty month: "Add a Transaction to see this month's summary."

## 5. Monthly summary

- The summary covers the month shown in the header. Months are determined by the Transaction's date.
- It shows the **real month totals**: Income, Expenses and Net.
- Below, **Expenses by Category** and **Income by Category** as bars with a Transaction count, largest first. A Retired label is its own line, tagged "retired".
- Because a Transaction counts in full toward each of its Categories, these lines can add up to more than the real total. The screen says so in a visible line ("Categories overlap: a Transaction counts in each of its Categories, so these lines add up to more than the real total above"). There are no pie charts and no percentages that imply the parts sum to 100%.
- Balance (header) is all-time and independent of the month shown.

Source tickets: *Home screen prototype*; premises in `.wayfinder/map.md`.

## 6. Import and export

Two separate CSV files, in a fixed dialect whatever the UI language: comma delimiter, dot decimal, UTF-8 (with a byte-order mark so spreadsheets read accents), dates as ISO `YYYY-MM-DD`. No JSON, no ZIP. Source ticket: *Import and export rules*.

**`transactions.csv`** columns: `date`, `type` (`expense` or `income`), `amount` (positive), `categories`, `note`. Several Categories in one cell are separated by `|`. There is no `id` column.

**`categories.csv`** columns: `type`, `name`, `default_key`. `default_key` is blank for a custom Category and set (for example `groceries`) for a still-translatable starter default.

**Retired labels** have no row in `categories.csv`. They appear only as names in a Transaction's `categories` cell. On import, any name in a Transaction that is not in the categories list becomes a Retired label.

**Export:** all history, no filters. File names carry the date (`transactions-2026-10-18.csv`, `categories-2026-10-18.csv`). On a phone, use the share sheet (Web Share API) with both files when supported, so they land in Files, iCloud Drive or Google Drive; otherwise fall back to two downloads.

**Import:** one mode only, **replace everything**. The user selects both files together. A preview shows counts (rows to import, rows with errors) and requires an explicit confirmation that tells them to export first. Validation reuses the entry rules: amount greater than zero with at most 2 decimals, a valid ISO date, a `type` of expense or income, and at least one name in `categories`. Invalid rows are skipped and listed in the preview with a row number and a reason; the user can import the valid rows or cancel. A short-lived Undo for the whole import is included (see section 11). Settings (language, Opening balance) are neither read nor changed by an import. After a successful import the app shows a one-time "Check your opening balance" step with the current value editable and a line saying it is not stored in the backup files.

## 7. Backup reminders and storage durability

Browser-local storage can be erased (Safari tabs delete all site data after 7 days without use; the user can clear site data; the browser can evict under pressure). Backup is therefore a core feature, not a footnote. Source tickets: *Local PWA storage reliability* (research file in `.wayfinder/research/`), *Backup and restore experience*.

- **Backup reminder banner:** shown when there is at least one unbacked change and either 7 days have passed since the last backup or 20 changes have piled up. A user who has never backed up sees it after their 5th Transaction. It reads "N changes not backed up" with a "Back up now" button that starts the export. Dismissing hides it for 3 days.
- **"Last backed up"** is recorded when the share sheet completes or the downloads start. The UI states plainly that the user must keep the files somewhere outside the browser, because the app cannot verify they were saved.
- **iOS install nudge:** on iOS, in a Safari tab and not installed, a banner appears after the first Transaction is saved (never on first load). It says data in a browser tab can be erased after 7 days of inactivity and gives the steps "Share, then Add to Home Screen". Dismissing hides it for 7 days, and it returns while the user stays in a tab. Installed Home Screen apps are exempt from the 7-day cap. On Android and desktop there is no banner, only the "Install app" row in Settings.
- **Persistence:** request `navigator.storage.persist()` on the first Save tap (a user gesture) and never prompt again unprompted; re-check at startup. It is only a request: Safari decides by undocumented heuristics and nothing protects against the user clearing site data. Settings shows the outcome.
- **Failed writes** (for example a quota error): a blocking message that the Transaction was not saved, telling the user to back up now.
- **Erased database:** handled by the first-run screen always offering "Restore from backup" (section 4.5).

## 8. Languages

English (default) and Italian, selectable in Settings, switching immediately. Strings live in one JSON file per language. Starter Category names are stored as keys and translated at display; a renamed Category stops translating. Number and date formatting use the browser's `Intl` APIs. Amount entry is language-independent (accepts `,` and `.`). The export dialect is fixed and does not follow the language.

## 9. Technology

Source ticket: *Tech stack*. The owner is one person plus an agent, so the spec favours mainstream tools, small dependencies and plain code over cleverness.

- **Language and UI:** strict TypeScript with React (Svelte was the runner-up).
- **Build and PWA:** Vite with `vite-plugin-pwa` (manifest, service worker, offline use). Static files only: no server, no backend.
- **Storage:** IndexedDB through the thin `idb` wrapper, behind **one small data-access module** of plain functions: add, edit and delete a Transaction; create, rename and delete a Category; query a month; export and import. The rest of the app never touches IndexedDB directly.
- **Strings:** `i18next` with `react-i18next`, one JSON file per language.
- **Testing:** Vitest unit tests for the pure logic (amount parser; CSV export and import with validation; summary calculations with overlapping Categories and Retired labels; reminder rules). A small set of Playwright tests for the main flows: add, edit, delete with Undo, export, import. No further UI test suite in v1.
- **Hosting:** static hosting over HTTPS (required for the service worker, `persist()` and install). Cloudflare Pages or GitHub Pages, whichever the owner already uses; avoid any host that needs a server.

## 10. Acceptance checks (the behaviours most likely to be got wrong)

1. Adding a Transaction with two Categories makes its full amount appear in both Category lines of the Summary, while the real month total counts it once.
2. Save is disabled until the amount is valid and at least one Category (or Retired label) is selected.
3. Typing `12,5` and `12.50` both save 12.50.
4. Deleting a Category keeps its name on old Transactions as a greyed Retired label, still counted in the Summary, and a new Category with that name is refused.
5. Deleting a Transaction removes it at once and Undo within about 5 seconds restores it.
6. Switching language changes starter Category names but not renamed ones or Retired labels.
7. Export then Import round-trips Transactions, Categories, starter-default keys and Retired labels; Opening balance and language are unchanged by the import and the opening-balance check is shown.
8. An import with invalid rows lists them with row numbers and lets the user import the rest or cancel.
9. With an empty database the first-run screen offers both Start fresh and Restore from backup.
10. The backup banner follows the rule in section 7, and dismissing it hides it for 3 days.

## 11. Open items, assumptions and delegated decisions

Check these before building; each is also recorded in the named ticket.

- **Backup and restore experience was decided by Claude, not answered by the owner.** The owner delegated ("decide, starting from the design I selected"). The reminder thresholds (7 days, 20 changes, 5 Transactions), banner priority and dismissal times, share-sheet export, and the after-import opening-balance step are therefore Claude's recommendations and open to change.
- **Retired label name reuse.** The owner answered "not possible same name"; it was read literally, so a deleted Category's name stays reserved and cannot be reused while any Transaction carries it. This may annoy users (delete "Gym", never recreate it). Confirm or relax.
- **Import extras not explicitly asked for:** a short-lived Undo for a whole import, and requiring both CSV files together.
- **Fixed CSV dialect.** An Italian-locale Excel may open the comma-delimited file as one column; Google Sheets and Excel's text-import work. A known rough edge, accepted when the owner chose "always the same dialect".
- **Opening balance is not in the backup.** After restoring on a new device the user must re-check it, hence the post-import step.
- **Home screen coverage.** The owner chose variant A with the single comment "I like the first design". The prototype was only syntax-checked, not exercised end to end. Not covered: Summary edge cases (ties, one very large Category) and the final look of Settings, the Categories screen and first-run, which were specified in words, not prototyped.
- **Settings Categories list is alphabetical** (an assumption stated in the Category lifecycle ticket, then carried into the Categories screen).
- **Storage research gaps:** Safari's `persist()` heuristics are undocumented, the 7-day cap is documented on WebKit's tracking-prevention page but not repeated in the 2023 storage post, and no primary source covers iOS Home Screen app data when the app is deleted (assume lost).
- **Hosting is left to the owner** (Cloudflare Pages or GitHub Pages).
- **Italian translations** of the starter Category names and all UI strings are to be written at build time.

## 12. Where the reasoning lives

- Map and decision index: `.wayfinder/map.md`
- Vocabulary: `CONTEXT.md`
- Tickets with full resolutions: `.wayfinder/tickets/` (storage reliability, transaction entry flow, Category lifecycle, import and export rules, home screen prototype, backup and restore experience, tech stack, settings and first run)
- Storage research with sources: `.wayfinder/research/01-local-pwa-storage-reliability.md`
- Home screen reference prototype: `.wayfinder/prototypes/home-screen/index.html`
