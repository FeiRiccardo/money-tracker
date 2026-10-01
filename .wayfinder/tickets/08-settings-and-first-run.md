---
title: Settings screen and first-run experience
type: grilling
status: closed
assignee: riccardo
blocked_by: []
parent: map
---

## Question

Two screens the chosen home screen (variant A) and the closed backup ticket both lean on. Decide the **Settings screen**: its sections and their order (language, opening balance, entry to the Categories screen, the Backup section already decided, the "Install app" row, storage status), how switching language behaves, and what editing the opening balance does to the Balance. Decide the **first-run screen** shown whenever the database is empty: it always offers "Start fresh" and "Restore from backup" side by side; decide what "Start fresh" asks or explains (language, opening balance, the starter Categories), and what the empty Transactions tab says once the user has started.

## Resolution

All recommended answers accepted by the human ("ok to all"). Built on home screen variant A (Ledger list).

- **Settings:** opened from the gear icon next to the Balance; a back arrow returns home. One scrolling screen of grouped rows, in this order: Language; Opening balance; Categories (opens the Categories screen); Backup (Export, Import, last backed up, with the reminder that the opening balance is not in the files); Storage and install (storage status, "Install app" row); Erase all data; a footer with the app version and the line "Your data stays on this device."
- **Language:** English or Italian, English by default. Switching applies immediately with no reload, including translatable default Category names. It is a device setting: not in the backup, unchanged by an import. Dates and numbers follow the chosen language's formatting; amount entry still accepts both `,` and `.`.
- **Opening balance:** one editable amount added to the all-time Balance, edited through a small dialog. Negative values are allowed (for example an overdraft), at most 2 decimals, both `,` and `.` accepted, default €0.00. Changing it updates the Balance immediately. No date, no history. The row shows the current value.
- **First-run screen:** shown whenever the database is empty. It shows the app name, a line saying the data stays on this device, English and Italiano chips (English preselected), and the two buttons "Start fresh" and "Restore from backup" side by side. "Start fresh" leads to one skippable step, "Starting balance (optional)" (amount field plus Skip), then opens the home screen with the starter Categories already in place and no commentary about them. "Restore from backup" opens the import flow, followed by the opening-balance check.
- **Empty states:** with no Transactions at all: "Nothing here yet. Tap + to add your first expense or income." An empty month when other months have data: "No Transactions this month. Tap + to add one." with the month switcher still working. Summary tab, empty month: "Add a Transaction to see this month's summary."
- **Categories screen:** an Expense/Income toggle at the top, then an alphabetical list for the chosen type. Tapping a row opens a rename dialog with a Delete button. Delete shows how many Transactions use the Category, then removes it, leaves the Retired label, and shows an Undo toast. A "+ New category" button sits at the bottom. The dialog enforces the name rules: unique per type, at most 30 characters, no `|`, and names reserved by a Retired label are refused with a message.
- **Erase all data:** at the bottom of Settings. It needs a clear confirmation that says the data cannot be recovered, recommends exporting first and offers the export right there. After erasing, the app returns to the first-run screen.
