# Trip Planning — Task 2: interactive timetable and itinerary management

Task 2 extends the Task 1 page. It does not rebuild navigation, saved places, service
searches, checkout or payment. Angular 22 standalone components/signals and existing
SavedTrips/localStorage persistence are retained. No packages were installed.

## Working interactions

- Desktop native HTML drag-and-drop from a saved card onto the calendar.
- Drop position is calculated from the timetable canvas, including its scrolled position,
  and snaps to 15-minute intervals. A visible guide shows the target time.
- Drag an existing activity to another time, or onto another day tab to move days.
- Keyboard/mobile alternative: select a saved place, enter start time/duration and click
  Add to Schedule. Select an activity to edit its day/time/duration without dragging.
- The event is positioned/sized using its real minute offset and duration, not just the hour row.
- Activity Details and timetable share the same entry in ItineraryStateService; neither
  maintains a conflicting copy of the activity's time, duration, title or notes.
- Original product data remains linked by placeKey. Display titles may be overridden;
  location, price and images remain source data. Unknown source records stay unavailable.
- Delete an activity, remove a day (with confirmation if populated), or clear scheduled entries.
  None of these actions deletes a saved place or another trip's data.
- Optional travel start date determines labels for relative days. It is never inferred from
  createdAt. Add/remove days supports up to 30 days in this UI.
- Activity notes and trip notes are independent, limited to 2,000 characters each, and persisted.

Validation rejects invalid days, start times, durations shorter than 15 minutes, activities
ending after midnight, duplicate entry IDs and overlapping activities. Adjacent entries
are allowed. Rejected edits keep the original valid entry; the error is shown, and a later
valid edit can recover normally. Stored entries are sorted by day/start time.

## Persistence: existing trip records, same storage key

The sole trip owner remains SavedTrips in `services/saved-trips.ts` and the sole key remains
`tripla.savedTrips`. Existing `id/name/createdAt/places` fields are unchanged. A backward-
compatible optional `itinerary` field is now stored on the selected saved-trip record:

```ts
{
  version: 1,
  revision: number,
  dayCount: number,
  startDate: string | null,
  entries: [
    { id, tripId, placeKey, day, startMinute, durationMinutes, title, note }
  ],
  note: string,
  updatedAt: string | null
}
```

Old trips without itinerary still open as empty plans. This schema is an explicit extension
implemented in Task 2, not an assumption about existing persisted fields.

`SavedTrips.saveItinerary()` rereads storage, checks the stored revision, validates the full
plan and merges only the chosen trip's itinerary. Current saved places and other trips are
preserved. A changed revision from another tab is rejected with recovery instructions.
This is optimistic conflict detection; localStorage is not a transactional multiuser backend.

`ItineraryStateService` owns editable per-trip drafts, dirty status and validation. It does not
create or replace trips. Unsaved work survives tab/day/trip navigation in memory. A route
CanDeactivate guard and beforeunload warning protect unsaved plans when leaving/reloading.
The Save action explicitly writes the itinerary; success/failure is announced. Reload Saved
requires confirmation before discarding dirty work. Malformed stored itineraries are shown
as errors and never silently overwritten. Quota/write failures keep the editable draft.

SavedTrips now distinguishes readError from general errors so failed writes/conflicts do not
hide the currently edited trip. Existing save-to-trip dialogs and storage behavior remain intact.

Scheduled places removed later from favorites retain their itinerary reference; detail
resolution includes both current saved IDs and scheduled IDs, without putting removed IDs
back in the favorites list.

## Map behavior and limits

PlanningMap updates from the currently selected activity's original source location.

- Valid coordinates, if supplied by the source projection, render an OpenStreetMap iframe.
- Existing catalogs currently provide text/city locations, not verified coordinates. For
  those records the panel displays the location and a synchronized Google Maps search link.
- No fabricated marker, arbitrary geocoding result, API key or nonexistent endpoint is used.
- Missing locations show an unavailable state. Notes/custom activity titles are not sent to Maps.
- Maps requires network access. This task does not claim a verified geographic match for
  demo products or a city-only address.

Google Maps search links follow the documented `api=1&query=...` format:
https://developers.google.com/maps/documentation/urls/get-started

The current data cannot provide a precise inline marker without trustworthy coordinates
or an agreed geocoding/provider integration. This limitation is shown in the UI.

## New files

- `models/itinerary.model.ts`: versioned persisted itinerary and validation.
- `services/itinerary-state.service.ts`: editing, validation, per-trip dirty drafts and saving.
- `planning-unsaved.guard.ts`: route departure protection.
- `components/planning-map/planning-map.ts/.html/.css`: source-linked map/search presentation.
- `itinerary.spec.ts`: interaction, persistence, conflict and recovery tests.

## Modified files

- `services/saved-trips.ts`: optional itinerary field, read-error distinction and version-checked save.
- `models/planning-place.model.ts`: entry title/note and optional map/view fields.
- `pages/trip-planning-page/*.ts/html/css`: native dragging, minute positioning, editor, notes,
  day management, dirty status, save/reload controls and map component.
- `app.routes.ts`: CanDeactivate guard for Trip Planning only.
- This README: updated from Task 1 to Task 2 behavior.

Existing Task 1 resolver, trip selector, navigation, empty/error states and tests are retained.
No booking/checkout/payment code or backend files were changed for Task 2.

## Verification

Focused tests exercise native DOM drag events, target-time calculation, detail input updates,
minute-positioned events, moving days, duration validation, deleting entries without changing
favorites, saving all notes/dates, reopening in a fresh Angular injector, cross-tab revisions,
malformed schedules, quota failures, route cancellation and beforeunload warnings.

Task 1 tests still check trip isolation, actual saved-place resolution and obsolete requests.
The full targeted regression suite includes shared checkout and hotel/flight/activity/bus flows.
The targeted regression run passed **98 tests across 14 files**; development build passed. Development build is verified; a visual
browser/touch-device check is not claimed.

Task 3 checkout, payment, combined price calculation and server-side availability remain out
of scope. Map precision and production multiuser persistence still require real provider data.
