# Unified checkout — Iteration 1, all four services

This document supersedes the earlier hotel-only scope. Angular 22 standalone components,
Reactive Forms and signal-based in-memory state are reused. No dependencies, backend,
payment pages or confirmation routes were added.

## Delivered

One `/checkout/:bookingType?draft=<id>` page renders exactly one independent service form:

| Type     | Form                | Input and validation                                                                                                      |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Hotel    | HotelBookingForm    | Primary guest first/last name, selection-derived guest/room counts, optional requests                                     |
| Flight   | FlightPassengerForm | Separate ordered adult/child/infant entries, required names, DOB/nationality only when provider requirements request them |
| Activity | ActivityBookingForm | Selected date/ticket/quantity, purchaser-versus-attendee flag, participant names only when required, optional notes       |
| Bus      | BusPassengerForm    | One passenger per selected adult seat, required names, optional phone, exact selected pickup/dropoff                      |

Shared components remain CheckoutStepper, CheckoutContactForm, BookingSummary,
PriceBreakdown and CheckoutActions. CheckoutPage owns the composed form, disables
inactive service groups and coordinates routes/saving. Service-specific form builders
and components own their rules. Hotel integration remains intact.

Continue validates and saves on the same checkout page. The only completed state is
`details-complete`, meaning information entered, not booked/paid/confirmed. The stepper
never advances to payment. No fake transaction or booking reference is generated.

## Selection integrations

| Source              | Checkout entry                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| HotelDetails        | Select an eligible room using the existing room action                                                  |
| FlightSearchResults | Select a fare; a round trip needs both selected flights and both fare references                        |
| ActivityDetails     | Select a ticket, choose quantity in the ticket dialog, then click Điền thông tin đặt vé                 |
| BusDetails          | Select enough available sample seats, then use the existing Thanh toán action to open information entry |

Adapters snapshot the actual selected products and prices; they do not create products,
flights, activities, seats, rates or prices. Missing/inconsistent selections are rejected.
The current sources are front-end demos and remain explicitly marked as demo in checkout.

Bus checkout applies to the single journey whose seats were selected. It does not silently
create a return journey when a return date exists in the search. Flight round trips contain
both legs and retain each selected fare separately. Activity quantities are 1–20 in the current
frontend, and changing quantity/date at the source creates a new selection snapshot.

## State, routes and privacy

BookingDraft is a discriminated union with source, ID, timestamps, pricing, selection and
service-specific form values. CheckoutStateService supports startHotel/startFlight/
startActivity/startBus, generic saveForm/completeDetails, per-ID resolution and discard.
The older hotel save/complete entry points are retained for compatibility.

Each draft lives in memory for 30 minutes. Normal route navigation and Back/Forward preserve
values for all four services. IDs are the only checkout query parameter. Names, contacts,
participant information and document/payment details are never written to browser storage
or URLs. Refresh/closing the app loses memory-only drafts; recovery explains how to reselect.
Unknown types, missing IDs, wrong draft types, expiry and invalid selections show recovery UI.

The frontend does not request passport/ID details. Flight DOB and nationality controls are
conditional, not blanket requirements; actual provider document/age rules remain an API
integration dependency. No bus seats are reserved. Infant seating/fare policy is not invented.

## Pricing

All current prices are estimates derived from selected source amounts, never hardcoded totals.
Hotel: selected rate × rooms × nights. Activity: selected ticket rate × quantity. Bus: selected
adult seats × source rate. Flight: selected fare × adults only when the source declares an adult
price basis, or the source whole-party price when explicitly supplied. Unknown bases/currencies
produce unavailable pricing. Children/infant costs, fees or inventory not supplied by the source
are listed as unconfirmed. PriceBreakdown never calls such sums a final payment amount.
Verified quote support is a typed consistency contract only; backend authenticity/inventory
checks and real payment progression are not implemented.

## New files in this expansion

```text
checkout/
  adapters/service-booking-drafts.ts
  forms/service-checkout.forms.ts
  components/flight-passenger-form/
    flight-passenger-form.ts
    flight-passenger-form.html
  components/activity-booking-form/
    activity-booking-form.ts
    activity-booking-form.html
  components/bus-passenger-form/
    bus-passenger-form.ts
    bus-passenger-form.html
  all-services.spec.ts
```

All service forms reuse `styles/checkout-form.css`; no empty style files or placeholder
payment components were created.

Existing files modified in this expansion:

- Checkout: booking-draft.model.ts, checkout.model.ts, checkout-state.service.ts,
  checkout-page.ts/html, booking-summary.ts, checkout-actions.ts/html,
  checkout-form.css, checkout-state.spec.ts, README.md.
- FlightSearchResults TS/HTML: connect valid fare selection and show selection errors.
- FlightOfferDialog spec: update routing assertions for the new checkout destination.
- Activity model: optional `requiresParticipants` ticket metadata.
- ActivityDetails TS/HTML/CSS: quantity control, validation and checkout entry.
- BusDetails TS/HTML: checkout entry from the selected seats.

The generic checkout route already existed and did not need a duplicate route. No unrelated
service layouts, global CSS, Angular configuration, package versions or my-server files changed.

## Verification

- Development Angular build: `npm.cmd run build -- --configuration development`.
- Tests cover each service independently: form selection, summary identity, dynamic passenger/
  participant counts, required/optional fields, conditional DOB/nationality, seat mapping,
  missing source selections, actual activity/bus/flight entry, same-page Continue, separate
  draft state and browser Back/Forward. Existing hotel tests retain their coverage.
- Final targeted regression run: **84 tests passed across 12 files**, including 24 checkout tests.
- Responsive styles retain desktop columns and stack at 750px, with single-column fields
  at 550px. A visual browser check was not available; no visual verification is claimed.
- The previously observed default production font-download and existing Home/Tripshort/
  TripShop style-budget blockers were not changed or bypassed in project configuration.

## Iteration 2 dependencies

- PaymentPage, BookingConfirmation, payment methods and verified server payment states.
- Server-persisted drafts/retrieval after refresh, authoritative quotes and inventory checks.
- Actual provider travel-document, age, participant, infant and pickup/dropoff requirements.
- Real flight round-trip offers: the current real-data adapter needs selected fare references
  for both legs; it does not invent a combo when the source cannot supply those references.
- Coordinated bus round-trip seat inventory if a single combined booking is required.
- Real booking APIs and transaction processing; none are implemented here.
