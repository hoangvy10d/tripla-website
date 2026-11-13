# DATA_CONTRACT.md — Tripla data model

Source: Data Dictionary (Tables 3.65–3.80) in the project report. This is the shared schema every page must use, so modules can talk to each other.

**How to use this file**

- Field names, enums and relationships below are the contract. Do not invent parallel field names.
- The real code may already differ. During `/audit`, compare each entity with what exists in `data/*.json` and `js/api.js`, and list differences in `docs/AUDIT.md`. Do not silently "fix" existing data.
- Section 6 lists things the UI needs but the dictionary does not define. Those need a decision from the user.

## 1. Storage conventions

| Topic | Rule |
|---|---|
| Storage | `localStorage`, one key per entity (collection stored as a JSON array). |
| Key naming | Keep the keys already used in the repo. If none exist, use `tripla_<entity>` (e.g. `tripla_users`). **Verify in code before assuming.** |
| Session | One key for the logged-in user (e.g. `tripla_session` holding `user_id` and `role`). Verify existing name first. |
| IDs | Integer, auto-increment per entity: `max(existing ids) + 1`. Never reuse deleted IDs. |
| Timestamps | ISO strings (`new Date().toISOString()`). Dates `YYYY-MM-DD`, times `HH:mm`. |
| Money | Numbers in VND (no decimals shown). Format only at render time with `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})`. |
| Lists in a field | `hotel_amenities`, `room_amenities`, `room_images` are comma-separated strings or JSON arrays. Pick what the existing data uses and normalize on read. |
| Hydration | If a key is missing or empty, load the matching `data/*.json` once, then write it to `localStorage`. |

## 2. Entities

### users
`user_id` PK · `full_name` · `email` UNIQUE · `password` · `phone_number` UNIQUE, null · `avatar` URL, null · `role` enum `tourist | provider | admin` (default `tourist`) · `created_at`

Note: the dictionary says "hashed", but the project scope is client-side validation only. Do not build real security. Never store a real user's password.

### providers
`provider_id` PK · `user_id` FK UNIQUE · `business_name` · `business_license` URL · `verification_status` enum `pending | approved | rejected` (default `pending`) · `verified_at` null

### locations
`location_id` PK · `name` · `location_category` enum `attraction | restaurant | cafe | shopping | nature | other` · `address` null · `latitude` · `longitude` · `entry_fee` default 0 · `requires_reservation` bool · `reservation_duration` minutes, null · `location_description`

### hotels
`hotel_id` PK · `provider_id` FK · `hotel_name` · `description` · `address` · `latitude` · `longitude` · `star_rating` 1–5, null · `total_rooms` · `hotel_amenities` · `policies` · `check_in_time` default 14:00 · `check_out_time` default 12:00

### room
`room_id` PK · `hotel_id` FK · `room_name` · `room_type` enum `single | double | twin | suite | family` · `capacity` default 2 · `room_price` per night · `room_status` enum `available | maintenance | inactive` · `room_description` · `room_amenities` · `room_images`

### bookings
`booking_id` PK · `user_id` FK · `room_id` FK · `check_in` · `check_out` · `total_price` · `booking_status` enum `pending | confirmed | checked_in | checked_out | cancelled | no_show` (default `pending`) · `booking_code` UNIQUE · `created_at`

### payments
`payment_id` PK · `booking_id` FK UNIQUE · `payment_method` enum `credit_card | e_wallet | bank_transfer` · `transaction_id` UNIQUE, null · `amount` · `payment_status` enum `pending | completed | failed | refunded` (default `pending`) · `paid_at` null

Mapping for the UI: VietQR → `bank_transfer`, MoMo / VNPay / ZaloPay → `e_wallet`, Visa → `credit_card`.

### contents (Community post / reel)
`content_id` PK · `user_id` FK · `content_title` · `content_description` · `caption` (with hashtags) · `image_url` · `video_url` · `created_at`

### location_tags
`tag_id` PK · `content_id` FK · `location_id` FK null · `hotel_id` FK null. Exactly one of `location_id` or `hotel_id` should be set.

### trip_plans
`plan_id` PK · `user_id` FK · `plan_name` · `start_date` · `end_date` · `estimated_budget` default 0 · `note` · `created_at`

### wishlist
`wishlist_id` PK · `plan_id` FK · `location_id` FK · `added_at`. **UNIQUE(plan_id, location_id).**

### plan_details (one stop in the timeline)
`detail_id` PK · `plan_id` FK · `location_id` FK null · `hotel_id` FK null · `visit_date` (must be within the plan's `start_date`..`end_date`) · `start_time` null · `sequence_order` (1, 2, 3 within that day) · `note`

### trips (a confirmed plan)
`trip_id` PK · `plan_id` FK UNIQUE · `user_id` FK · `trip_status` enum `upcoming | ongoing | completed | cancelled` (default `upcoming`) · `confirmed_at` null · `note`

### notifications
`notification_id` PK · `user_id` FK · `title` · `content` · `type` enum `booking | promotion | system | trip_reminder` · `is_read` default false · `created_at`

### reports
`report_id` PK · `content_id` FK · `reporter_id` FK (users) · `reason` enum `spam | inappropriate | false_info | copyright | other` · `details` null · `status` enum `pending | resolved | dismissed` (default `pending`) · `handled_by` FK (users, admin) null · `created_at`

## 3. Relationships and delete rules (Table 3.80)

| Parent → Child | Type | On delete |
|---|---|---|
| users → providers | 1–1 | CASCADE |
| providers → hotels | 1–N | CASCADE |
| hotels → room | 1–N | CASCADE |
| users → bookings | 1–N | CASCADE |
| room → bookings | 1–N | **RESTRICT** (cannot delete a room that has active bookings) |
| bookings → payments | 1–1 | CASCADE |
| users → contents | 1–N | CASCADE |
| contents → location_tags | 1–N | CASCADE |
| locations / hotels → location_tags | 1–N | SET NULL (tag cleared, video stays) |
| users → trip_plans | 1–N | CASCADE |
| trip_plans → wishlist | 1–N | CASCADE |
| locations → wishlist | 1–N | CASCADE |
| trip_plans → plan_details | 1–N | CASCADE |
| locations / hotels → plan_details | 1–N | SET NULL (slot becomes empty so user can edit) |
| trip_plans → trips | 1–1 | CASCADE |

`js/api.js` must enforce these rules when an Admin deletes data, because `localStorage` has no foreign keys. Example: deleting a location must also remove its wishlist rows and null the `location_id` in `location_tags` and `plan_details`.

## 4. Business rules to enforce in `js/api.js`

1. **Booking code:** generated only after payment succeeds. Unique, alphanumeric, ≤ 20 chars.
2. **Booking status flow:** `pending → confirmed → checked_in → checked_out`. `cancelled` and `no_show` are terminal. Cancel is allowed only before `checked_in`. Cancelling a paid booking sets `payments.payment_status = 'refunded'`.
3. **Price:** `total_price` = nights × `room_price` + taxes/fees (use the formula already in the code; do not change numbers on existing bookings).
4. **Availability:** a room is not available if another non-cancelled booking overlaps `[check_in, check_out)`, or if `room_status != 'available'`.
5. **Wishlist:** never insert a duplicate `(plan_id, location_id)`.
6. **Plan details:** `visit_date` inside the plan's date range. After a drag-and-drop, renumber `sequence_order` for the affected day(s) starting at 1.
7. **Trip cost:** `estimated_budget` is derived from the plan's stops: location `entry_fee` + hotel nights + transport items. Recalculate on every change.
8. **Notifications:** create one on booking confirmed, booking cancelled, payment failed, trip reminder.
9. **Roles:** `tourist` (and creators) use client pages; `admin` uses admin pages; `provider` is a simulated view. Guard pages by role.

## 5. Mapping from user-facing features to entities

| Feature | Entities |
|---|---|
| Save to Trip popup | trip_plans, wishlist, location_tags |
| Planner timeline + map + cost | plan_details, wishlist, locations, hotels, trip_plans |
| Hotel booking + checkout | hotels, room, bookings, payments, notifications |
| Profile → bookings / vouchers | bookings, payments, trips |
| Community feed | contents, location_tags, users |
| Moderation | reports, contents |

## 6. Gaps: needed by the UI but missing in the dictionary

The report describes these features, but the dictionary has no entity for them. **Do not invent these silently. Check whether the code already stores them, then ask the user.**

| Gap | Why it matters | Suggested minimal approach (additive only) |
|---|---|---|
| Attraction tickets and sleeper-bus tickets / seats | `bookings` only has `room_id`, but the unified cart mixes hotel, tickets and bus | Add `booking_items` (`item_id`, `booking_id`, `service_type` `hotel | attraction | bus`, `service_id`, `quantity`, `seat_no`, `price`) and keep `bookings` as the header |
| Cart | Needed to group services before checkout | One key such as `tripla_cart` per user holding item snapshots |
| Likes and comments | Community interactions | `content_likes` (`content_id`, `user_id`), `content_comments` (`comment_id`, `content_id`, `user_id`, `text`, `created_at`) |
| Rewards / points | Profile → Tripla Rewards | A `points` field on users or a small `rewards` entity |
| Content visibility (`visible | hidden | removed`) | Moderation (FR 2.21) | Add `status` field to `contents` |
| Reviews / ratings | Hotel and location ratings | Check whether ratings are static fields in JSON before adding an entity |

## 7. Open decisions for the user

1. Is the cart separate from `bookings` (recommended), or are items saved as `pending` bookings?
2. Are tickets and buses part of this schema (`booking_items`), or a separate simplified structure?
3. Is Rewards a real feature in the code, or only a UI placeholder?
