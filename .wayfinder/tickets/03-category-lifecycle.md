---
title: Category lifecycle
type: grilling
status: closed
assignee: riccardo
blocked_by: []
parent: map
---

## Question

How do Categories live and change? Decide the default Expense and Income lists, whether default names are translated when the language changes, creating and renaming, name uniqueness, and what happens to Transactions when a Category in use is deleted (including a Transaction that loses its only Category). Also decide whether merging two Categories is supported.

Constraint from the closed Transaction entry flow ticket: every Transaction must always have at least one Category (Save is disabled without one), so deleting a Category that is a Transaction's only Category cannot leave it empty. Also decide whether each type must always keep at least one Category, or whether the entry picker can create a Category inline.

## Resolution

- **Defaults:** Expense: Groceries, Dining out, Transport, Housing, Utilities, Health, Entertainment, Shopping, Other. Income: Salary, Gifts, Other. "Other" is an ordinary default with no special protection.
- **Translation:** defaults are stored as keys and shown in the current language. Renaming one turns it into a plain custom Category that no longer translates.
- **Create and manage:** create inline from the entry picker with a "+ New" chip; rename and delete from a Categories screen in settings. If a type's list is empty, the picker shows only "+ New".
- **Names:** unique per type (case-insensitive, trimmed), up to 30 characters. The same name may exist in both the Expense and Income lists.
- **Deleting a Category:** the Category goes away but its name stays on the Transactions that had it as a **Retired label**. The user is shown how many Transactions are affected, and gets a short Undo toast. Any Category may be deleted, including the last one of a type.
- **Retired label:** never offered when entering a new Transaction. It shows on old Transactions in the list and the edit form (a selected, greyed-out chip), still counts as its own line in the monthly summary, and can be removed from a Transaction but never re-added. Save still needs at least one selected Category or Retired label. Its text freezes to the name as displayed at the moment of deletion.
- **Name reuse:** a Retired label keeps its name reserved, so creating a Category with the same name in that type is not allowed. Consequence: a deleted name cannot be reused, and a Retired label cannot be renamed.
- **Merge:** not in v1 (moved to the map's Out of scope).
- **Ordering:** the entry picker sorts by most recently used. Assumption, not asked: the settings Categories list is alphabetical.

Handed to other tickets:
- Import and export rules: how Retired labels and still-default Categories (stored as keys) are written to and read from CSV, and how a Category name that collides with a Retired label is handled on import.
- Monthly summary details (fog): Retired labels appear as their own lines.
