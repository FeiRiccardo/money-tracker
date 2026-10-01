---
title: Import and export rules
type: grilling
status: closed
assignee: riccardo
blocked_by: [03-category-lifecycle]
parent: map
---

## Question

Define the CSV import/export contract for Transactions and Categories: columns, how several Categories sit in one cell, date and decimal formats (including Italian locale comma decimals), encoding, how import validates and reports bad rows, replace versus merge, and how duplicates are detected without a stable id in the CSV. From the closed Category lifecycle ticket, also decide: how Retired labels (frozen text, not a Category) and still-default Categories (stored as translatable keys) are written to CSV and read back, and how an imported Category whose name collides with a Retired label is handled (names are unique per type and retired names stay reserved). Also confirm or revise the CSV-only premise given the storage research suggested a JSON restore. This ticket was blocked on the category lifecycle because names, translation and deletion rules shape how Categories round-trip.

## Resolution

The CSV-only premise holds: no JSON, no ZIP.

- **Files:** two separate CSV files, `transactions.csv` and `categories.csv`, exported one after the other.
- **Dialect:** always the same, whatever the UI language: comma delimiter, dot decimal, UTF-8, dates as ISO `YYYY-MM-DD`.
- **`transactions.csv` columns:** `date`, `type` (expense or income), `amount` (always positive), `categories`, `note`. No `id` column, since import never matches rows.
- **Several Categories in a cell:** separated by `|`. `|` is a forbidden character in Category names (a new rule on top of the Category lifecycle name rules).
- **`categories.csv` columns:** `type`, `name`, `default_key`. `default_key` is blank for a custom Category and set (for example `groceries`) for a still-translatable default; a renamed default exports with no key.
- **Retired labels:** they have no row in `categories.csv`. They appear only as names in a Transaction's `categories` cell. On import, any name in a Transaction that is not in the categories list becomes a Retired label.
- **Import:** one mode only, **replace everything**. The user selects both files together. A preview shows counts (rows to import, rows with errors) and requires an explicit confirmation that tells them to export first.
- **Validation:** reuses the entry rules (amount greater than 0 with at most 2 decimals, valid ISO date, type is expense or income, at least one name in `categories`). Invalid rows are skipped and listed in the preview with a row number and a reason; the user can import the valid rows or cancel.
- **Settings are not part of the backup.** The opening balance and the language are neither exported nor changed by an import.

Consequences and assumptions to carry into the spec:
- After restoring on a fresh device the user must set the opening balance again, or the balance will be off. The backup ticket should account for that.
- A fixed comma dialect means an Italian-locale Excel may open the file as a single column; Google Sheets and Excel's text-import work. Export dialect is therefore a known rough edge.
- Merge import, per-row de-duplication and the name-collision rule against Retired labels are moot with replace-only import.
- Assumption, not asked: a short-lived Undo for the whole import (kept from the recommendation, since replace is destructive).
- Assumption, not asked: both files are required for an import.
