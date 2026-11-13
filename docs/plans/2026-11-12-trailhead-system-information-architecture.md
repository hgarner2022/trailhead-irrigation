# Trailhead's own system: information architecture

Written 2026-11-12 evening after Hannah's decisions. This is the map every
later plan builds to. The prototype on `admin-prototype` covers the pass
checkout, the pass page and the first admin pages; the wiring plan covers
the data behind them; the retirement path covers the rest.

## One sentence

The app is where Trailhead's customers buy, where the schedule is decided,
where every message to a customer comes from, and where the owner looks.
Jobber shows the field what to do until the field app replaces it.

## Who uses it

| Person | Surface | What they need from it |
|---|---|---|
| Customer | Website, checkout, pass page, booking form, emails and texts | Buy or book in minutes, know when someone is coming, see what they paid for |
| Hannah (owner) | Admin on a laptop | What is committed, booked, paid and broken, in one glance; change a setting without an engineer |
| Ryan and the crews | Admin Schedule on a laptop, day view on a phone (Jobber until then) | Today's stops in order, the checklist for each, done in one tap |
| A branch manager, later | The same admin scoped to their organization | Everything Hannah sees, for their branch only |

## The entities and who owns them

| Entity | Owner today | Owner at the end | Note |
|---|---|---|---|
| Organization, users, roles, settings | App | App | Trailhead is organization one; every row below carries its id |
| Customer who holds a pass | App | App | Mirrored to Jobber as a client while Jobber is the field display |
| Customer with no pass | Jobber | App | Read for dashboard totals until the booking form and Requests inbox land |
| Season Pass, its visits, preferences, dates, charges | App | App | Nothing goes to Jobber (2026-11-13: no upgrade, no connection); the crew's day view in the app is the field display from the first season |
| Booking (a one-off visit the customer schedules) | Jobber online booking | App | Real open slots from trucks and capacity; books on the spot |
| Request (work that needs a quote) | Jobber form | App | Requests inbox in the admin |
| Schedule (truck, day, visit) | App places, Ryan moves | App | The app's own calendar; Jobber reflects it; a move in Jobber is logged as an exception |
| Trucks, areas, capacity, windows | App (Settings) | App | Unbounded rows, not a count |
| Messages and templates | App | App | Every customer email and text, in Trailhead's voice |
| Checklists per visit type | App (Settings) | App | Done on the phone day view; completion triggers the charge |
| Card on file, charges, receipts | Stripe through the app | Stripe through the app | Jobber invoice marked paid while Jobber keeps non-pass books |
| Quotes and invoices for non-pass work | Jobber | App, later | Third step of the retirement path |

Rule: one owner per entity at any time. When two systems hold a copy, the
owner's copy wins and the other is a display.

## Admin navigation, in order, one job each

1. **Home.** The morning view. Today and tomorrow by truck, what needs
   attention (failed charges, Jobber exceptions, cards expiring, requests
   waiting), four numbers (revenue this month, passes sold, quotes awaiting,
   invoices past due), the season line, and the "Set up spring / fall"
   prompt when a window is four to six weeks out.
2. **Schedule.** The week by truck, and a day map beside it. Proposed
   visits placed by one Schedule button (no approval step; the scheduling flow, 2026-11-12 late), the "To schedule" tray beside it, drag to move between days or trucks,
   exceptions marked, day view on the phone. The map (Hannah, 2026-11-12:
   "we need a map to make sure we're routing this appropriately, do not go
   backwards"): real geography on open tiles, every visit for the chosen
   day as a pin coloured by truck and numbered in stop order, each truck's
   area shaded, pin and grid block are the same visit. Addresses are
   geocoded once when a customer is created and the point stored on the
   property. Stop order comes from Jobber's route optimiser during the
   transition and from the app's own ordering (nearest neighbour plus a
   tidy pass) when Jobber goes. Where the scheduler's output lands and
   where Ryan lives in season.
3. **Passes.** Every pass holder: grid, filters, export, side panel with the
   season line, charges, Jobber and Stripe links, and the three actions.
4. **Requests** (after booking lands). Only the work that needs a quote;
   one click to a quote or a scheduled visit. Bookings go straight to the
   Schedule.
5. **Revenue.** Committed against charged, by month, upcoming charges,
   renewals (renewed, lapsed, not yet asked).
6. **Customers.** Everyone, with pass status layered on, what is next for
   each and whether it is booked or still to schedule (Hannah, 2026-11-12
   night), the consent on record, and the January pre-sell for the people
   who book a spring visit and a blowout at full price.
7. **Settings.** Trucks, Areas, Capacity and windows, Messages, Checklists,
   with a change log.

The phone shows the same seven as a bottom tab bar with Schedule's day view
first for a crew login.

## Customer surfaces

- **Season Pass page** (marketing, exists): the offer, the price by zones,
  the button into the checkout.
- **Checkout** (prototype exists): seven screens, one question each: the
  address as one type-ahead box (the town comes from it; outside the six
  towns is refused), zones, the July inspection as an add-on (the pass is
  the turn-on and the blowout), timing preferences for turn-on and blowout
  with the recommendation preselected and the reason under it, contact with
  the email checks, card, done with the pass card. The confirmation email
  carries the pass card image.
- **Pass page** (prototype exists): reached by the sign-in link in any
  Trailhead email (magic link, no password). The pass card, the season line,
  the visits in customer words (Done, Booked, Preferred) with the date once
  it is set, a Change link on the turn-on and blowout until their day is set
  (Hannah, 2026-11-12 night), the card on file, cancel.
- **Booking at `/book`** (later): today Jobber's online booking lets a
  customer pick a time and the visit lands on Ryan's calendar booked, with
  no one in the loop (Hannah's correction, 2026-11-12). The app's version
  must do at least that: offer real open slots computed from the trucks,
  their areas and their capacity, book the visit on the spot, and confirm
  in Trailhead's voice. Per-service questions, the checkout's pacing. A
  Requests inbox exists only for work that needs a quote (installs, large
  repairs).
- **Messages** (wiring plan): confirmation at purchase (with the pass card
  image), date set or moved, day-before reminder, on-my-way when the crew
  taps it, after-visit receipt naming the next visit, failed card,
  cancelled, January renewal.
- **Messages are one-way and one per event** (Hannah, 2026-11-12 late and
  2026-11-13: "start with one-way, transactional text messages first to
  simplify", "this needs to be simpler"). Text for timing (date set, date
  moved, the day-before reminder), email for money and records
  (confirmation with the pass image, receipt, card failed, cancelled,
  renewal); a customer with no mobile gets the timing messages by email.
  Ryan texts "on my way" from his own phone; the app never does. Every message carries a link to the pass
  page, and that link is how a customer changes anything: pick a day,
  change a preference, skip, cancel, update the card. STOP is handled by
  Twilio's own opt-out, not by our code. The two-way design below is kept
  for later, not built in the first season.
- **Two-way texting, later** (the earlier plan, 2026-11-12 night). The app sends every text from one Trailhead number. When a
  customer texts back, the reply lands in the app on that customer: STOP
  and the carrier keywords are recorded as an opt-out and answered by the
  app on its own; any other reply ("can you come after 10?") is saved on
  the customer, shown at the top of Home as "Andrea replied: …" with a
  Reply button, and shown in the customer's panel as one thread. Hannah or
  Ryan answer from either place and the answer goes out from the same
  number, so the customer sees one ordinary conversation on their phone.
  The thread on the customer also holds every email and text the app sent,
  with its state (sent, delivered, failed, bounced). Email replies go to
  Ryan's real inbox in the first build. The day-before reminder asks for one
  letter: C confirms the visit (a check on the Schedule), R asks for a
  different day (a row on Home, and the app texts back the sign-in link to
  the pass page so the customer can pick). Before any of this can send, the
  business must be registered with the carriers through Twilio (A2P 10DLC),
  a one-time setup that takes days to two weeks.

## Consent, recorded in the CRM

Hannah's rule (2026-11-12): at checkout the customer must accept the terms,
and may opt in to marketing, and both are recorded on the customer.

- Terms acceptance is required to continue past the card step; marketing is
  a separate, unticked box covering email and text, with "you can stop any
  time" beside it. Visit reminders and receipts are transactional and go
  out either way.
- Every consent is a record on the customer: what was accepted, the terms
  version, when, from where (checkout, booking form, admin), and the
  channels. Changes append, never overwrite, so the history is auditable.
- The Customers page shows the current consent and its history; the
  Messages settings respect it (no marketing message to anyone without the
  opt-in; STOP and unsubscribe write a new consent record).
- The booking form captures the same two boxes when it lands.

## Scheduling, the rules

- Trucks are rows with working days and visits per day by visit type.
- Each truck-day gets an area group (one town or two adjacent towns). The
  app picks truck, day and area; Jobber's route tool orders the stops until
  the day view does.
- Fall visits are sorted by freeze risk (north and high first), spring the
  reverse; "earlier" and "later" preferences sort within the window.
- Capacity per truck-day minus a buffer (20 to 25 percent in a season's
  first two weeks, 10 to 15 after) left for repairs and weather.
- A visit never leaves its window; never outside working days; never over
  capacity.
- Fall commits firm dates 5 to 7 days ahead; later days are "planned" until
  the forecast settles.
- No approval step (2026-11-12 late): Schedule places the visits due, pushes them to Jobber and sends the dates in one run; Ryan moves what he wants. Customers who must be there pick their own day from the pass page. Fall commits two weeks at a time by its lead time, not by a second state. (Earlier text, superseded: first season the app proposes, Ryan approves the batch. Later: it applies
  and sends a summary.
- A move Ryan makes in Jobber is accepted and logged as an exception, not
  treated as the truth.

## Open API, for agents as much as for screens

Hannah's rule (2026-11-12): the system has an open, documented API, and it
must be easy for agents to use.

- **API first.** Every read and every action the admin, the checkout and
  the day view perform goes through the same API (`/api/v1/...`). The
  screens are one client of it; an agent is another. Nothing is reachable
  from a screen that is not reachable from the API.
- **Shape.** JSON over HTTPS, resource-oriented: organizations, customers,
  passes, visits, requests, schedule (proposals, approvals, moves), trucks,
  settings, messages, checklists, webhooks. Cursor pagination, idempotency
  keys on writes, the same error shape everywhere.
- **Described, not just built.** An OpenAPI document generated from the
  route code and served at `/api/v1/openapi.json`, human docs at
  `/developers`, and an MCP server (`/api/mcp`) exposing the same resources
  as tools so Claude, Appy agents and anyone else can connect with a key
  and no code. `public/llms.txt` points at both.
- **Keys and scopes.** API keys per organization with scopes (read, write
  passes, write schedule, send messages, admin), created and revoked in
  Settings, every call logged with the key that made it. Roles apply to
  keys exactly as to people.
- **Outbound webhooks.** Subscribers get pass bought, visit scheduled,
  visit done, charge succeeded or failed, request received, with the same
  HMAC signing Jobber uses, so another agent or system can react.
- **Rate limits and versioning** stated in the docs from day one; `v1`
  stays stable, breaking changes get `v2`.

## Build order and what each step retires

1. Pass checkout, pass page, admin Home, Passes, Revenue, Settings, Schedule
   with the map, messaging, and booking at `/book` with real open slots
   pushed into Jobber (all in the wiring plan; Hannah, 2026-11-12: "I don't
   want to use Jobber where we can", so the app's form replaces Jobber's
   booking and request forms in this first build). Retires: phone calls to
   buy the pass, chasing pass payments, Jobber's reminders for pass
   customers, Jobber online booking and its request form.
2. The Requests inbox for quoted work (installs, large repairs) and the
   January pre-sell on Customers.
3. Day view with checklists. Retires: Jobber's field app.
4. Quotes and invoices for non-pass work. Retires: Jobber's office side.
5. Payments for that work through Stripe. Retires: Jobber Payments, then
   Jobber.

## Research behind it

`.local-data/research/2026-11-12-pass-visit-scheduling-brief.md` (area days,
capacity, freeze-line ordering, week-ahead fall commitments) and
`.local-data/research/2026-11-12-booking-checklists-messages-brief.md`
(short multi-step booking forms, instant confirmation, checklist and photo
practice, message timing and consent).
