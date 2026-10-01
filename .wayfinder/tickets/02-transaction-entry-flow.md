---
title: Transaction entry flow
type: grilling
status: closed
assignee: riccardo
blocked_by: []
parent: map
---

## Question

How does a user add, edit and delete a Transaction? Decide the fast path (fewest taps for the common case), how one or more Categories are picked, defaults (type, date, last-used Category), validation (zero or negative amounts, future dates, a Transaction with no Category), and whether delete has undo.

## Resolution

- **Start:** a persistent "+" button on the home screen opens one form. An Expense/Income toggle sits at the top of the form; Expense is the default.
- **Form:** amount first, with the numeric keypad open on form open. Defaults are type Expense, date today, no Categories selected, note empty or collapsed. One tap on Save finishes it.
- **Category picker:** tappable chips, as many as the user likes, showing only the Categories of the chosen type (Expense or Income list). Most recently or most often used come first. Switching type clears the selection.
- **Category required:** a Transaction cannot be saved without at least one Category, so Save stays disabled until one is chosen. This keeps "one or more Categories" in `CONTEXT.md` exact, and there is no "Uncategorized" state.
- **Amount:** greater than zero, at most 2 decimals, and both `,` and `.` are accepted as the decimal separator whatever the language. No maximum.
- **Date:** future dates allowed.
- **Edit:** tap a list row to open the same form pre-filled.
- **Delete:** only from the edit form. It deletes immediately and shows an "Undo" toast for about 5 seconds, with no confirm dialog. No edit history.
- **After Save:** return to the list, with the new Transaction visible at its date position.

Consequences handed to other tickets:
- Category lifecycle must guarantee a Transaction never ends up with no Category (what happens when its only Category is deleted), and that each type always has at least one Category to pick (or the picker can create one inline).
