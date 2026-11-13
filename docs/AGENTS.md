# AGENTS.md — Tripla

Read this file fully at the start of every session. Then read `docs/DATA_CONTRACT.md` and `docs/FLOWS.md` before touching any code.

Communicate with the user in **Vietnamese**. Keep code, identifiers, comments and commit messages in English.

## 1. What Tripla is

A travel platform that links four pillars into ONE journey:

1. **Community** — Reels feed, like / comment / save, location tags on videos, Creator Studio.
2. **Explore & Book** — hotels (rooms by date), attraction tickets, sleeper-bus tickets (seat selection), one shared cart and checkout, booking code + e-voucher.
3. **Trip Planning** — 3 columns: Wishlist | Timeline (drag & drop by day) | Leaflet map with routes. Auto-calculated trip cost.
4. **Profile & Account** — profile, booking history, e-vouchers, trips, Rewards.

Plus **Admin** (dashboard, data management, booking management, content moderation). Provider is only simulated data.

The value of the product is the **links between pillars**, not the pages in isolation. See `docs/FLOWS.md`.

## 2. Architecture (already decided, do not change)

- Pure client-side. No backend, no framework, no bundler. Vanilla HTML/CSS/JS.
- Hybrid MPA: separate HTML files per page (e.g. `index.html`, `booking.html`, `trip-planner.html`).
- Shared header/footer are partials injected at runtime by `js/partials.js`.
- Data layer: `js/api.js` is a mock API (`getLocations()`, `getHotels()`, `createBooking()` ...). All CRUD goes through it and persists in `localStorage`.
- First load: if `localStorage` is empty, hydrate it from static JSON files in `data/`.
- Libraries: Leaflet (map), SortableJS (drag & drop), `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})` for money. Do not add other libraries without asking.

> The names above come from the project report. If the real repo differs, **the repo wins**: follow what exists and tell the user which doc line is outdated.

## 3. Golden rules: preserve what exists

The current UI is approved and must stay visually identical.

1. Do NOT rewrite, restyle, re-layout or "clean up" existing HTML/CSS. Add logic and data-binding on top of it.
2. Do NOT rename or delete existing files, CSS classes, element IDs, function names or `localStorage` keys. If something must change, add the new one, migrate, and list it in the report.
3. Prefer small, additive edits (a few lines in an existing file) over new files. New JS files only when a page has no script yet.
4. Reuse existing components (popups, cards, toasts, buttons) and their classes. Never create a second version of one.
5. Never read or write `localStorage` directly from a page script. Add or extend a function in `js/api.js` and call it.
6. Never hardcode data that belongs in `data/*.json` or `localStorage`.
7. If a requirement conflicts with the current UI, stop and ask. Do not decide alone.

## 4. Working method

For every task, follow this order:

1. **Audit first.** Run the `/audit` workflow (see `.agent/workflows/audit.md`) once at the start of the project and whenever the user asks. Output goes to `docs/AUDIT.md`. No code changes during the audit.
2. **Plan.** For each module, write a short plan: files to touch, functions to add, data keys read/written, which flow(s) it completes. Wait for the user's OK.
3. **Implement one flow at a time**, in this priority order:
   1. Auth + session (everything needs "current user")
   2. Wishlist / Save to Trip (Community → Planner)
   3. Planner (drag & drop, map, cost, save)
   4. Booking: search, detail, cart, checkout
   5. Profile: bookings, trips, vouchers, rewards, cancel
   6. Community interactions (like, comment, report, Creator Studio)
   7. Admin (data management, bookings, moderation) and its effect on the client side
4. **Verify the whole flow by hand**, not just the page. Walk the flow from its first click to its last screen, with a fresh `localStorage` and with existing data.
5. **Report** in Vietnamese: what changed (files and functions), which flow now works end to end, what is still missing.

## 5. Out of scope (do NOT build)

- Real payment gateway, bank, OTP, card security. Checkout is a simulation: validate form, compute total, create records, show success.
- Real authentication security: client-side validation only. No real password handling, no email verification.
- User upload of video/image. Media is prepared by the team in `data/` and `assets/`.
- Backend, database server, AI recommendations, mobile app.
- Real-time cross-device sync. "Synchronize" means all modules read the same `localStorage` data.

## 6. Definition of done (per task)

- The flow works from first click to last screen, with no console errors.
- Data is written through `js/api.js` and follows `docs/DATA_CONTRACT.md` (field names, enums, relationships, delete rules).
- Every link and button on the touched pages leads somewhere real or is clearly disabled.
- Empty states, invalid input and "not logged in" are handled.
- Existing visuals are unchanged. Money uses `Intl.NumberFormat` vi-VN VND.
- `docs/` updated if the data shape or a flow changed.