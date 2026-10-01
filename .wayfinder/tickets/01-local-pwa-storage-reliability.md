---
title: Local PWA storage reliability
type: research
status: closed
assignee:
blocked_by: []
parent: map
---

## Question

How reliable is browser-local storage for a PWA that is the only copy of the user's financial data? Establish, from primary sources (MDN, WebKit/Chrome/Firefox documentation, web.dev):

- Which storage options exist (IndexedDB, localStorage, OPFS, Cache API) and their size limits on mobile Safari and Chrome.
- Eviction behavior: Safari's storage eviction for sites versus installed (home-screen) web apps, Chrome's storage buckets and `navigator.storage.persist()`, and what the user must do to be protected.
- Whether persistence can be requested reliably on iOS and Android, and what happens when the user clears site data.
- What this implies for how prominent backup (CSV export) must be in the product.

Findings go in `../research/01-local-pwa-storage-reliability.md`.

## Resolution

Full findings: `../research/01-local-pwa-storage-reliability.md`.

- Quota is not the risk. IndexedDB, Cache API and OPFS share one origin quota (about 60% of disk on Chrome and Safari 17+). localStorage is capped at 5 MiB and is synchronous, so IndexedDB is the primary store.
- Eviction is whole-origin. Safari tabs delete all script-writable storage after 7 days without interaction; installed Home Screen apps are exempt.
- `navigator.storage.persist()` is only a request, with no guarantee on Safari. It does not protect against the user clearing site data, which is unrecoverable.
- Gaps: Safari's persist heuristics are undocumented, and no primary source covers iOS Home Screen app data when the app is deleted (assume lost).
- Implication: backup/export is a core feature. Nudge iOS users to install to the Home Screen, call `persist()` after the first save, show a "last backed up" reminder, and detect an empty database after prior use to offer restore.
- Tension with settled premises: the research suggests a JSON restore, but the map's premise is CSV-only import/export. Left for the Import and export rules ticket to confirm or revise.
