---
title: Backup and restore experience
type: grilling
status: closed
assignee: riccardo
blocked_by: []
parent: map
---

## Question

Local storage can disappear (see the closed storage reliability research), so backup is a core feature. Decide the experience around it: where Export and Import live in the app, how the "last backed up" reminder works (when it appears, how often, dismissal), whether iOS users are nudged to install to the Home Screen, when `navigator.storage.persist()` is requested, what the app does when it detects an empty database after prior use (offer restore), and how the settings that are not in the backup (opening balance, language) are handled after a restore, since the closed import and export ticket leaves them out.

## Resolution

**How this was decided:** the human delegated these choices to Claude ("for the next design choice, decide, starting from the design I selected"), so they were not answered one by one. Claude took its recommended answers and adapted them to the chosen home screen, variant A (Ledger list). They are open to override.

- **Entry point:** a gear icon at the right of variant A's Balance row opens a Settings screen. Settings has a "Backup" section with Export, Import, the last-backed-up date and the storage status.
- **One banner at a time:** banners appear as the first item of the Transactions tab, above the day-grouped list. If more than one applies, the install nudge shows first (it removes the 7-day erasure risk), then the backup reminder.
- **Backup reminder:** shown when there is at least one unbacked change and either 7 days have passed since the last backup or 20 changes have piled up. A user who has never backed up sees it after the 5th Transaction. The banner says "N changes not backed up" with a "Back up now" button that starts the export. Dismissing hides it for 3 days.
- **Export on a phone:** use the share sheet (Web Share API) with both CSV files when the browser supports it, so they can land in Files, iCloud Drive or Google Drive. Otherwise fall back to two plain downloads. File names carry the date (`transactions-2026-10-18.csv`, `categories-2026-10-18.csv`). "Last backed up" is recorded when the share completes or the downloads start. The UI says plainly that the user must keep the files outside the browser, because the app cannot verify they were saved.
- **Install nudge:** on iOS, when running in a Safari tab and not installed, a banner appears after the first Transaction is saved, never on first load. It says data in a browser tab can be erased after 7 days of inactivity and gives the steps "Share, then Add to Home Screen". Dismissing hides it for 7 days, and it returns while the user stays in a tab. On Android and desktop there is no banner, only an "Install app" row in Settings.
- **Persistence:** request `navigator.storage.persist()` on the first Save tap and do not prompt again unprompted. Re-check at startup. Settings shows "Storage: protected" or "Storage: not guaranteed" with one line of explanation and a prompt to back up when it is not guaranteed.
- **Failed writes:** if a write fails (for example a quota error), show a blocking message that the Transaction was not saved and tell the user to back up now.
- **Erased database:** the app cannot tell "never used" from "erased", because eviction deletes the whole origin including any flag stored there (this corrects the research's "flag kept elsewhere" tip). So the first-run screen, shown whenever the database is empty, always offers two buttons side by side: "Start fresh" and "Restore from backup".
- **Opening balance after a restore:** after any successful import, show a one-time step "Check your opening balance" with the current value editable and a line saying it is not stored in the backup files. The Backup section in Settings carries a short reminder of the same. The language is a device preference and is unaffected.

Handed on:
- The Settings screen and first-run screen layouts are now specific enough to ticket (see the new Settings screen and first-run experience ticket).
