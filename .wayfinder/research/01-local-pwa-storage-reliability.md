# Local PWA storage reliability

Ticket: `../tickets/01-local-pwa-storage-reliability.md`. Researched 2026-10-01 from primary sources only (MDN, WebKit, web.dev, Chrome docs). Claims are as stated by each source on the fetch date; verify exact numbers before relying on them.

## Summary

- IndexedDB is the right primary store. IndexedDB, Cache API and OPFS share one origin quota, and it is large (a share of disk, not a few MB).
- Quota is not the risk. Eviction and user deletion are. Default ("best-effort") storage can be deleted by the browser, always as a whole origin, never partially.
- Safari browser tabs delete all script-writable storage after 7 days without user interaction. Installed Home Screen web apps are exempt from that cap.
- `navigator.storage.persist()` is a request, not a guarantee. Chrome and Safari decide by heuristics with no prompt. Firefox prompts the user. Even when granted, the user clearing site data still deletes everything.
- Browser-local storage cannot be the only copy of financial data. Export/backup must be a first-class, prominent feature.

## 1. Storage options and limits

| Option | Notes | Limit |
|---|---|---|
| localStorage / sessionStorage | String-only key/value, synchronous (blocks JS). Behaves like sessionStorage in private mode. | 10 MiB total per origin (5 MiB local + 5 MiB session), `QuotaExceededError` when exceeded |
| IndexedDB | Async, structured, indexed. | Origin quota (below) |
| Cache API | HTTP request/response pairs. | Origin quota |
| OPFS (Origin Private File System) | Origin-private files, sync access in workers, no prompts. Baseline since March 2023. Same quota. Clearing site data deletes it. | Origin quota |

Origin quota for IndexedDB, Cache API and OPFS:

- Chrome / Chromium: up to 60% of total disk, in both best-effort and persistent modes.
- Firefox: best-effort is the lesser of 10% of disk or 10 GiB. Persistent is up to 50% of disk, capped at 8 TiB.
- Safari (macOS 14+, iOS 17+): origin quota about 60% of disk for browser apps and for Home Screen web apps. About 15% for embedded WebViews (non-browser apps). Overall limit 80% (browser apps) or 20% (non-browser apps). Earlier Safari: 1 GiB initial, with a user prompt to exceed.
- Estimate with `navigator.storage.estimate()`. Values are approximate and may be padded.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system

For a personal finance ledger (kilobytes to a few MB), quota is a non-issue on every listed browser, including the localStorage cap. Choose the store on durability and API quality, not size. OPFS and IndexedDB share the same eviction fate.

## 2. Eviction behavior

General (MDN):
- Default mode is best-effort. Data can be evicted under storage pressure, when the browser's overall maximum is exceeded, or when the user deletes it.
- Eviction is LRU across best-effort origins. An origin's data is deleted all at once to avoid inconsistency. Persistent origins are skipped.
- Persistent data is cleared only by explicit user action through browser settings.

Safari / WebKit:
- Safari 17 policy: data may be deleted when over the overall quota, under system storage pressure, or after inactivity. Deletion is LRU, per whole origin. Origins with active pages or persistent mode are protected. (WebKit storage policy post.)
- ITP 7-day cap: "ITP deletes all cookies created in JavaScript and all other script-writeable storage after 7 days of no user interaction with the website." This covers IndexedDB, LocalStorage, Media keys, SessionStorage, and Service Worker registrations and cache. (WebKit tracking prevention page.)
- Home Screen exemption: "The first-party domain of home screen web applications is exempt from ITP's 7-day cap on all script-writeable storage." Their data is also isolated from Safari. (WebKit tracking prevention page.) An earlier WebKit post says Home Screen apps have their own counter of days of use, and WebKit does not expect their first-party data to be deleted.
- Caveat: the 2023 storage policy post does not mention the 7-day cap. The cap is documented on the tracking-prevention page, and MDN still lists it as Safari-only proactive eviction. Treat it as current for Safari tabs.

Chrome:
- Origins are best-effort by default and evicted LRU under storage pressure. Persistent origins are exempt.
- Storage Buckets API (Chromium 122+) lets each bucket be evicted independently and accepts `persisted: true` and a `durability` of `'strict'` or `'relaxed'`. Only IndexedDB works with buckets so far. It is Chromium-only, so treat it as an optional extra, not a baseline.

Sources:
- https://webkit.org/tracking-prevention/
- https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://developer.chrome.com/docs/web-platform/storage-buckets
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

## 3. Requesting persistence, and clearing site data

- `navigator.storage.persist()` returns a promise for a boolean. It is secure-context only, not available in Web Workers, and Baseline since December 2021. The browser may or may not honor it. (MDN StorageManager.persist.)
- Chrome / Edge: no prompt. The decision uses heuristics (site engagement, installed or bookmarked, notification permission). A denied request can be retried later. (web.dev.)
- Firefox: shows a permission popup to the user. (web.dev, MDN.)
- Safari: no prompt. WebKit grants by heuristics, including whether the site is a Home Screen web app. Default is best-effort with no guarantee. (WebKit storage policy post.) MDN describes Safari as auto-approve/deny based on user interaction history. The exact heuristics are not documented, so on iOS the result must be read at runtime and not assumed.
- web.dev guidance: request when saving critical data, ideally inside a user gesture. Do not prompt on load or repeatedly.
- Persistence protects Cache API, cookies, DOM storage, File System API, IndexedDB and service workers from browser-initiated eviction. It does not protect against the user: persistent data is "only deleted by user action via browser settings."
- Clearing site data (or Safari website data) deletes IndexedDB and OPFS. No source describes any recovery. Private browsing has different quotas and its data is deleted when the session ends.
- Persistence on iOS and Android cannot be assumed. It can be requested, and `persist()` / `navigator.storage.persisted()` report the outcome per device.
- Not verified from a primary source in this pass: what iOS does to Home Screen app data when the app is deleted from the Home Screen. Assume it is deleted.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- https://web.dev/articles/persistent-storage
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

## 4. What the user must do to be protected

- iOS: add the app to the Home Screen and use it from there. This removes the 7-day tab cap and enables the Home Screen heuristic for persist.
- Android / Chrome: install the app (raises the engagement and installed-status heuristics) and keep using it.
- Everywhere: do not clear site data, and keep an exported backup. No browser mechanism protects against user deletion.

## Implications for the product

1. Treat IndexedDB (optionally via a thin wrapper) as the primary store. localStorage is acceptable only for small settings. Size is not a deciding factor.
2. Call `navigator.storage.persist()` after the first meaningful save, from a user gesture, and show the result (granted / not granted) in settings. Re-check `persisted()` on startup. Do not rely on it.
3. On iOS, detect non-standalone use (Safari tab) and show a clear install-to-Home-Screen prompt, explaining that data in a tab can be erased after 7 days of inactivity.
4. Backup is a core feature, not a settings footnote. Concretely:
   - A visible Export (CSV, plus a full-fidelity JSON for restore) action on the main screen or in onboarding.
   - A "last backed up" date, with a nudge after N days or N new entries.
   - A matching Import / restore flow, tested.
   - Prefer the Web Share API or a file download so the file lands in iCloud Drive / Files / Google Drive, which are outside browser storage.
5. Warn before destructive events the app can see (persist denied, low storage, `QuotaExceededError`) and make export the recommended response.
6. Eviction is whole-origin and silent, so detect "empty DB but previously used" (for example via a flag kept elsewhere) and offer restore-from-backup on startup.
7. Open question for the map: whether to add optional cloud sync, which would change the "only copy" assumption.
