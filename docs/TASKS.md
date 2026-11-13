# TASKS.md — Tripla task list

Read `AGENTS.md`, `docs/DATA_CONTRACT.md` and `docs/FLOWS.md` first. Do the questions in order. For each question: short plan, implement, verify by hand, report.

**Mapping notes (apply to every question)**

- Tripla has no backend. Every `/api/...` below is implemented as a function in `js/api.js` with the same parameters and response, persisting in `localStorage`. The function name is given in parentheses. If a function with that purpose already exists, reuse and extend it.
- "Angular" parts are implemented as an HTML page + vanilla JS on the existing Tripla pages. A "Route" is a page with URL parameters. A "Route Guard" is a guard script that runs at the top of the page and redirects.
- Customer = `users.role = 'tourist'`. Employee/Admin = `users.role = 'admin'`.
- Product = hotel (with its rooms). Order = booking. Stock = number of units of a room still available for the selected dates.

---

## Part A. Core questions (Questions 1–9)

**Question 1 (0.5 pts):** Load the Tripla dataset (the `data/` folder: users, providers, locations, hotels, room, bookings, payments, contents, location_tags, trip_plans, wishlist, plan_details, trips, notifications, reports) into `localStorage` through `js/api.js` on first load.
Note: The passwords in the dataset are hashed with SHA-256 (if the existing seed uses another format, keep it and tell the user). Additionally, the image URLs provided are placeholders; if they fail to display correctly within the Tripla interface, you must replace them with a "Not Found" placeholder image (global `onerror` fallback).

**Question 2 (0.5 pts): Secure Login API.**
Implement the POST APIs `/api/auth/login-emp` and `/api/auth/login-cust` (`api.loginEmp()`, `api.loginCust()`), which accept a `username` (either an email address or a phone number) and a `password`. The function should hash the input password using an appropriate algorithm (SHA-256) and then query the `users` collection (`role = 'admin'` for login-emp, `role = 'tourist'` for login-cust) to authenticate the user. Upon a successful login, the system must return the complete details of the authenticated record and save it as the current session. The login functionality should be correctly invoked within both the traveler pages (login popup/page) and the admin pages (admin login page). In the event of a failed login, the system must redirect to the "Login-Failed" page (`login-failed.html`), providing relevant error information (e.g. wrong password, account not found, wrong role).

**Question 3 (2 pts): Search, Sort, and Paginate Hotel List**

* Implement the GET `/api/hotels` API (`api.getHotels()`) that accepts the following query parameters: keyword (search by hotel name), sortByPrice (asc/desc, based on the lowest `room_price` of the hotel), page, and limit.
* In the Booking page, design a component to display the hotel list in a Grid View.
* Integrate a search bar, price sorting filter, and pagination buttons (Previous Page, Next Page, Page Number) that synchronously call the corresponding API.

**Question 4 (1 pt): Hotel Detail Page & Fallback Query Logic (Slug -> ID)**

* Build the GET `/api/hotels/:identifier` API (`api.getHotelByIdentifier()`). The Backend logic requires: First, search for the hotel using the `hotel_slug` field (generated from `hotel_name` if the data has no slug yet: lowercase, no diacritics, hyphens). If no data is found (or the query fails), automatically fallback to searching by the `hotel_id` field.
* In the Hotel Detail page, configure the `/hotel/:identifier` route (URL parameter `identifier`) to receive the parameter from the URL, call the API, and display the hotel details (name, description, price, stock, images). Price = lowest room price per night. Stock = number of rooms currently available. Images = room images.

**Question 5 (2 pts): Booking Cart Management with Room Availability Validation**

* Design the interface and logic for managing the Booking Cart on the Frontend (`api.getCart()`, `api.addToCart()`, `api.updateCartItem()`, `api.removeCartItem()`).
* When a user clicks "Select Room" / "Add to cart" or changes the quantity (number of rooms), check and compare it against the current available stock of that room for the selected `check_in` / `check_out` dates (units already held by overlapping non-cancelled bookings are subtracted).
* Only allow increasing the quantity if the total in the cart is <= stock. Display an error message (Alert/Toast) if the customer requests a quantity exceeding the available stock.

**Question 6 (1 pt): Customer's Booking Details Page**

* Implement the GET `/api/bookings/detail/:bookingCode` API (`api.getBookingDetail()`) to return the detailed information of a valid booking belonging to the currently logged-in tourist.
* Display the Booking Details screen on the Frontend, including: Booking code, booking date (`created_at`), status (`booking_status`), and hotel address (hotel name, address, check-in/check-out dates).
* Render the items array (booked rooms) into a table listing the purchased rooms: room name, quantity, unit price (per night), and total price of each item (after applying the discount, if any).

**Question 7 (1 pt): Admin Panel - Hotel Management (CRUD)**

* Design the Admin interface (using an independent layout from the Traveler pages) protected by a Route Guard (only allowing the "admin" role).
* Write the Admin APIs (Add, Edit, Delete hotel) with authentication middleware (role check on the current session) inside `js/api.js`. Delete must follow the delete rules in `docs/DATA_CONTRACT.md` §3 (rooms cascade, a room with active bookings is blocked, tags and plan stops set to null).
* Build the Add/Edit hotel form on the UI, where the "Provider" field (`provider_id`, `business_name`, `verification_status`) must be selected from a Dropdown populated with actual data from the providers table (approved providers only).

**Question 8 (1 pt): Admin Panel - Booking Cancellation and Automatic Room Release**

* Create an API to update the booking status on the Admin screen (`api.updateBookingStatus()`).
* Add crucial Business Logic on the Backend: If an employee changes a booking status from "pending" or "confirmed" to "cancelled", the system must automatically add the quantity of each item (quantity) back to the available stock field of the corresponding Room records. If the payment was `completed`, set it to `refunded`, and create a notification for the tourist.

**Question 9 (1 pt): Admin Panel - Customer Recognition Report**

* Write a data statistics API on the Backend (`api.getTopCustomers()`): Extract a list of the Top 5 tourists with the highest total spending (based on the sum of `total_price` from "checked_out" (completed) bookings).
* On the Admin Dashboard page, draw a chart (Chart.js) or create a Leaderboard displaying these 5 customers along with their total purchased amount.

---

## Part B. Extra questions (other Tripla functions)

**Question 10 (1 pt): Register and Session Guard**

* Implement POST `/api/auth/register` (`api.register()`): `full_name`, `email`, `phone_number`, `password` (hashed with SHA-256), `role = 'tourist'`. Reject a duplicate email or phone number with a clear error.
* Implement GET `/api/auth/me` (`api.getCurrentUser()`) and logout (`api.logout()`).
* On the Frontend, any protected action (save, book, comment, open Profile) while logged out must open the login, remember the target, and continue the action after a successful login (Flow F0).

**Question 11 (1 pt): Community Feed, Like and Comment**

* Implement GET `/api/contents` (`api.getContents()`) with `page` and `limit`, returning each post with its author, location tags, like count and comment count.
* Implement POST `/api/contents/:contentId/like` (toggle per user) and POST `/api/contents/:contentId/comments`.
* In the Reels feed page, render the posts and wire the like and comment buttons. Counts must persist after reload and be per user.

**Question 12 (1 pt): Save to Trip (Wishlist)**

* Implement POST `/api/trip-plans` (create a plan: `plan_name`, `start_date`, `end_date`) and POST `/api/wishlist` (`plan_id`, `location_id`) with the UNIQUE(plan_id, location_id) rule.
* On the Frontend, tapping a location tag on a reel opens the "Save to Trip" popup: choose an existing plan or create a new one, then save. Show a toast and update the save button state.
* Implement GET `/api/trip-plans/:planId/wishlist` returning the saved places joined with location data.

**Question 13 (2 pts): Trip Planner Timeline (Drag and Drop)**

* Implement GET `/api/trip-plans/:planId` (plan + wishlist + plan_details) and POST / PUT / DELETE `/api/plan-details`.
* In the Trip Planner page, the left column lists the wishlist; the middle column is a day-by-day timeline. Dragging a place into a day creates a `plan_details` row; reordering renumbers `sequence_order` from 1 for the affected days.
* `visit_date` must be inside the plan's `start_date` to `end_date`. Adding or removing a day updates the plan's dates. After reload the timeline must be identical.

**Question 14 (1 pt): Planner Map and Cost Estimation**

* In the Trip Planner page, render the Leaflet map with one marker per stop and a route polyline in timeline order, per selected day.
* Calculate the trip cost (location `entry_fee` + hotel nights × room price) and update `trip_plans.estimated_budget` on every change (`api.recalculatePlanCost()`). Format money in VND.

**Question 15 (2 pts): Checkout and Payment (Simulated)**

* Implement POST `/api/bookings` (`api.createBooking()`) and POST `/api/payments` (`api.createPayment()`) from the cart. Validate the form (contact info, payment method: bank_transfer, e_wallet, credit_card).
* Simulate the gateway. Success: payment `completed` with `paid_at` and `transaction_id`, booking `confirmed`, a unique `booking_code` generated, a notification created, paid items removed from the cart. Failure: payment `failed`, booking stays `pending`, cart is kept, an error is shown.
* Show the success screen with the booking code and e-voucher, with a link to the Booking Details page (Question 6).

**Question 16 (1 pt): Planner to Booking**

* In the Trip Planner page, add "Book" on each bookable stop (hotel or ticketed place) and "Book all". It sends the items to the cart with the plan's dates, then continues with the checkout of Question 15.
* After a successful payment, mark those stops as booked in the Planner and create a `trips` row (`trip_status = 'upcoming'`) through POST `/api/trips` (`api.confirmTrip()`).

**Question 17 (1 pt): Profile Hub**

* Implement GET `/api/bookings/my` (`api.getMyBookings()`, filter by `booking_status`), PUT `/api/bookings/:bookingCode/cancel` (`api.cancelMyBooking()`), GET `/api/trips/my`, GET `/api/notifications` and PUT `/api/notifications/:id/read`.
* Cancel is allowed only before `checked_in`; it releases the rooms and sets a paid payment to `refunded` (same logic as Question 8).
* In the Profile page, show user info, booking list with e-voucher, My Trips (open in the Planner), and notifications. Allow editing name, phone and avatar.

**Question 18 (1 pt): Report Content and Admin Moderation**

* Implement POST `/api/reports` (`content_id`, `reason`, `details`), GET `/api/admin/reports` (filter by `status`), PUT `/api/admin/reports/:reportId` (`resolved` or `dismissed`, set `handled_by`), and DELETE `/api/admin/contents/:contentId`.
* In the feed, add a "Report" action. On the Admin Moderation page (admin Route Guard), list the reports and resolve, dismiss or remove the post. A removed post disappears from the feed and its tags are deleted.

**Question 19 (1 pt): Admin Booking List and Dashboard KPIs**

* Implement GET `/api/admin/bookings` with `keyword` (booking code or tourist name), `status`, `page`, `limit`, and GET `/api/admin/stats` returning total users, total revenue (completed payments), total posts and pending reports.
* On the Admin pages, build the booking list with filters and pagination (status changes use Question 8) and the Dashboard KPI cards computed from real data.

**Question 20 (1 pt): Admin Panel - Location Management (CRUD)**

* Write the Admin APIs (Add, Edit, Delete location) with the same role check as Question 7. Delete must apply the cascade rules (wishlist rows removed, `location_tags` and `plan_details` references set to null).
* Build the Add/Edit location form where the "Category" field (`location_category`) is selected from a Dropdown populated from the category list (attraction, restaurant, cafe, shopping, nature, other) returned by `/api/location-categories`, and latitude/longitude are validated.
