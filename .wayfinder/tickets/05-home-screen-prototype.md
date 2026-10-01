---
title: Home screen prototype
type: prototype
status: closed
assignee: riccardo
blocked_by: [02-transaction-entry-flow]
parent: map
---

## Question

What should the phone home screen look and behave like? Prototype the Transaction list, the balance, the add-Transaction flow and the first cut of the monthly summary (overlapping per-Category totals shown separately from the real month total), so the human can react to something concrete. Blocked on the entry flow decisions so the prototype shows the agreed add flow.

## Prototype

Built, awaiting the human's reaction: `../prototypes/home-screen/index.html` (single file, in-memory demo data, fake today is 2026-10-18). Switch variants with the bottom bar, the arrow keys, or `?variant=A|B|C`.

- **A, Ledger list:** big balance header, Transactions/Summary tabs, day-grouped list, "+" floating button, full-screen form.
- **B, Dashboard first:** month hero (net, income, expenses), per-Category bars and latest Transactions on the first screen, tab bar with a centre "+", bottom-sheet form.
- **C, Keypad minimal:** dark, one big balance, plain list, summary in a pull-up sheet, calculator-style keypad form.

## Resolution

**Variant A, Ledger list, is the direction.** The human's verdict was "I like the first design", with no changes requested. The prototype stays in `../prototypes/home-screen/` as the primary source (the folder is not a git repo, so there is no throwaway branch).

What variant A fixes for the spec:
- **Header:** a month switcher (previous and next arrows) above a large Balance figure. Balance is all-time: opening balance plus all income minus all expenses.
- **Two tabs:** Transactions and Summary.
- **Transactions tab:** a list grouped by day, each day header showing that day's net, newest first. Each row shows the note (or the first Category if there is no note), its Category chips (Retired labels greyed and dashed), and the signed amount.
- **Summary tab:** income, expenses and net for the month, then expenses by Category and income by Category as bars with a count, Retired labels tagged "retired", and the line explaining that Categories overlap.
- **Add:** a "+" floating button opens the full-screen form from the entry flow decisions. Edit by tapping a row.
- **Empty month:** "No Transactions this month. Tap + to add one."

Not covered by the prototype or the verdict (the human did not discuss them):
- Where settings and the Categories screen are reached from. Variant A's header has no entry point for them.
- The first-run experience before any Transaction exists.
- The Summary tab's behavior beyond the first cut, such as sort order ties and how the bars handle a single huge Category.
