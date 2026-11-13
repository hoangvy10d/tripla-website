# FLOWS.md — Cross-page flows

These flows are the point of Tripla. A page is "done" only when the flows that pass through it work end to end.

**Reading guide**

- Page names come from the project report (`index`, `booking`, `trip-planner`, profile, admin). Confirm real file names in the repo.
- "Writes" and "Reads" refer to entities in `docs/DATA_CONTRACT.md`. Always access them through `js/api.js`.
- Each flow ends with a **Check** the agent must run by hand before calling it done.
- Status values (done / partial / missing) go in `docs/AUDIT.md`, not here.

## Flow map

```
Community ──(Save to Trip)──▶ Wishlist ──▶ Trip Planner ──(Book)──▶ Cart/Checkout ──▶ Booking + Payment
    ▲                                           │                                           │
    │                                           └──────────(cost, map)                      ▼
Creator Studio                                                                Profile (Bookings, Trips, E-Voucher, Rewards)
                                                                                           ▲
Admin (data, bookings, moderation) ────────────────────────────────────────────────────────┘ (affects all)
```

## F0 — Session gate (do this first)

- **Trigger:** any protected action (save, book, plan, comment, open profile) while logged out.
- **Steps:** page asks `api.getCurrentUser()` → null → open login (or redirect) and remember the target action/URL → after login, return and continue the action.
- **Reads:** users, session. **Writes:** session (on login/register/logout).
- **Also:** role guard. Tourist cannot open admin pages; admin pages redirect non-admins.
- **Check:** logged out, click "Save" on a reel → login → come back and the save completes.

## F1 — Reel → Save to Trip → Wishlist

- **Trigger:** user taps a location tag on a reel/post (or "Save" on a location/hotel detail).
- **Steps:**
  1. Read `location_tags` of the content to get `location_id` or `hotel_id`.
  2. Open the "Save to Trip" popup (existing component).
  3. User picks an existing `trip_plans` row or creates one (name + start date; end date).
  4. `api.addToWishlist(plan_id, location_id)` — reject duplicates (UNIQUE).
  5. Toast "Saved", update the save button state on the reel.
- **Writes:** trip_plans (if new), wishlist. **Reads:** location_tags, locations, trip_plans.
- **Check:** save a place → open Planner for the same trip → the place appears in the left column. Saving it twice does not duplicate.

## F2 — Wishlist → Planner left column

- **Trigger:** open Trip Planner (from "My Trips", from the popup, or from Profile).
- **Steps:** load `trip_plans` by `plan_id` (URL param or last used) → load `wishlist` of that plan → join with `locations` (and hotels) → render left column.
- **Reads:** trip_plans, wishlist, locations, hotels, plan_details.
- **Check:** switching trip changes the wishlist list. A plan with no items shows an empty state with a link back to Community.

## F3 — Planner: timeline, map, cost

- **Trigger:** drag a place from the left column onto a day; reorder; remove; add/remove day; edit time/note.
- **Steps:**
  1. Drop → `api.addPlanDetail({plan_id, location_id|hotel_id, visit_date, sequence_order})`.
  2. Reorder (SortableJS) → renumber `sequence_order` for each affected day starting at 1.
  3. Re-render Leaflet markers and route polyline in timeline order, per day.
  4. Recalculate cost (`entry_fee` + hotel nights + transport) and update `trip_plans.estimated_budget`.
  5. Day count must match `start_date`..`end_date`; adding a day extends `end_date`.
- **Writes:** plan_details, trip_plans. **Reads:** locations, hotels.
- **Check:** reload the page after dragging; order, map pins and cost are identical. Removing a stop updates map and cost.

## F4 — Search → Detail → Select room → Cart

- **Trigger:** user searches in Booking (hotels / attractions / buses) with filters.
- **Steps:** `api.search(type, filters)` → results list → detail page (hotel: choose dates, compare rooms) → availability check → "Select Room" (or select ticket / seat) → item goes into the cart with a price snapshot.
- **Reads:** hotels, room, locations, bookings (availability). **Writes:** cart.
- **Check:** a room already booked for overlapping dates is not selectable. Cart total uses VND formatting and survives a page reload.

## F5 — Checkout → Booking + Payment → Voucher

- **Trigger:** "Pay" in checkout (simulated).
- **Steps:**
  1. Validate form (contact info, payment method).
  2. Create `bookings` (`pending`) and `payments` (`pending`).
  3. Simulate gateway: success → `payment_status = completed`, set `paid_at`, `transaction_id`, `booking_status = confirmed`, generate `booking_code`. Failure → `failed`, notify, keep the cart.
  4. Create a notification.
  5. Empty the paid items from the cart.
  6. Show the success screen with booking code and e-voucher, with a link to Profile.
- **Writes:** bookings, payments, notifications, cart. **Reads:** cart, room.
- **Check:** after paying, the booking shows in Profile → Bookings with the same code, price and status.

## F6 — Planner → Book (links planning to booking)

- **Trigger:** "Book" or "Reserve" on a stop in the timeline (hotel or ticketable place), or "Book all".
- **Steps:** collect the stops that are bookable → send them to the cart with the plan's dates → continue with F5 → after payment, mark those stops as booked in the Planner (badge) and set the trip to confirmed.
- **Writes:** cart, bookings, payments, trips (`upcoming`). **Reads:** plan_details.
- **Check:** after paying, return to the Planner and the booked stops show their status. Profile → Trips shows the confirmed trip.

## F7 — Profile hub

- **Trigger:** open Profile.
- **Shows:** user info and stats, booked services, e-vouchers, trips (`trip_plans` + `trips`), notifications, Rewards.
- **Actions:** edit profile, open trip in Planner, open booking detail/voucher, cancel booking (F7a), delete a trip (cascade plan_details and wishlist).
- **F7a Cancel booking:** only before `checked_in` → `booking_status = cancelled`; if paid then `payment_status = refunded`; notification; the room is available again.
- **Check:** cancel a booking → status changes in Profile **and** in the Admin booking list.

## F8 — Community interactions

- **Trigger:** like, comment, share, report, create post (Creator Studio).
- **Steps:** protected by F0. Like toggles per user. Comment is appended and counters update. Report writes a `reports` row (`pending`). Creator Studio creates `contents` + `location_tags` using existing media (no real upload; pick from prepared assets).
- **Writes:** likes, comments (see gaps in DATA_CONTRACT §6), reports, contents, location_tags.
- **Check:** counts survive reload and are per user. A reported post appears in Admin → Moderation.

## F9 — Admin effects on the client

- **Data Management:** add/edit/delete locations, hotels, rooms, transport. Delete must apply the cascade rules in DATA_CONTRACT §3 (wishlist rows removed, tags and plan stops set to null, rooms with active bookings are blocked).
- **Booking Management:** list, search, change `booking_status`. A change must appear in the traveler's Profile and create a notification.
- **Moderation:** resolve or dismiss a report; removing a post removes it from the feed (and its tags).
- **Dashboard:** KPIs (users, revenue, posts, alerts) are computed from real `localStorage` data, not hardcoded.
- **Check:** delete a location in Admin → it disappears from Booking/Community/Wishlist, and existing plan stops show an empty slot.

## F10 — Provider (simulated)

Out of scope beyond seed data. Only keep what already exists. Do not build new provider features unless the user asks.

## Cross-cutting checks (run after every flow)

- No dead links or `#` placeholders on touched pages.
- Header/footer partial loads on every page; active nav item is correct.
- Pages work when opened directly (not only through the previous page), including with a missing URL parameter.
- Fresh `localStorage` (hydrates from `data/*.json`) and populated `localStorage` both work.
- No console errors. No direct `localStorage` calls in page scripts.
