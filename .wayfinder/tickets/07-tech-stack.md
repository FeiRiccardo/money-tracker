---
title: Tech stack
type: grilling
status: closed
assignee: riccardo
blocked_by: []
parent: map
---

## Question

Choose the technology for the mobile-first PWA, given IndexedDB as the primary store (decided by the storage research) and a spec that will be handed to an agent or the user to build. Decide the language and UI framework, build tooling, how data access is wrapped around IndexedDB, how the English and Italian strings are handled, the testing approach, and where a static PWA is hosted. Favour the simplest stack the user can maintain alone.

## Resolution

All recommended answers accepted by the human (Q1 TypeScript with React, Q3 `idb`, the rest "ok").

- **Language and UI:** strict TypeScript with React. Svelte was the runner-up.
- **Build and PWA:** Vite with `vite-plugin-pwa` (manifest and service worker, offline). Static files only: no server, no backend.
- **Storage access:** IndexedDB through the thin `idb` wrapper, behind one small data-access module of plain functions (add, edit and delete a Transaction; create, rename and delete a Category; query a month; export and import). The rest of the app never touches IndexedDB directly.
- **Strings:** `i18next` with `react-i18next`, one JSON file per language (English and Italian). Translatable default Category keys live in those files. Number and date formatting use the built-in `Intl` APIs. The amount parser from the entry flow is language-independent.
- **Testing:** Vitest unit tests for the pure logic (amount parser, CSV export and import with validation, summary calculations with overlapping Categories and Retired labels, reminder rules). A small set of Playwright tests for the main flows (add, edit, delete with Undo, export, import). No further UI test suite in v1.
- **Hosting:** static hosting over HTTPS (required for the service worker, `persist()` and install). Cloudflare Pages or GitHub Pages, whichever the owner already uses; the spec does not pick one. Avoid any host that needs a server.
- **Maintainer:** one person plus an agent. The spec favours mainstream tools, small dependencies and plain code over cleverness.
