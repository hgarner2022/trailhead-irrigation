# Data model: every field, where it lives, who sets it, where it shows

**The rule: a change to a field is not done until every cell of its row is updated, and every PR that adds a field adds its row.** A field that shows in the checkout but not in the admin, or in the table but not the panel, is the bug the owner found on 13 Nov 2026 ("Mid May" in the Passes table beside a panel that knew "Apr 26"; a customer with a first name and no last name). The visit row is the only source for a day; screens read it and nothing derives it twice.

## Two words, one meaning each

**A job is the sold work**: a Season Pass, or a repair, an installation or other work booked by the office or the site. It has a customer, an address, a price, a status (pending, active, done, cancelled) and a source (checkout, office, site). **A visit is one stop on a job**: a day, a time, a truck, minutes, a state, notes and a charge. A pass is a job of kind pass, with two or three visits. The admin says "visit" for the stop and "job" only for the pass or the booked work.

Written 13 Nov 2026 from `src/db/schema.ts`, `src/lib/admin/{types,shape,jobs}.ts` and the screens. Docs means `public/llms.txt`, `public/pricing.md` and `docs/*`; a dash means the field is not shown there on purpose.

## The two pills on every visit

Every visit row and panel shows two pills, derived by `statesOf` in `src/lib/admin/jobs.ts` from the one row. **Work**: Needs a day (no day), Scheduled (has a day), Done, Not done (with the reason, while it has no day again), Cancelled. A Scheduled visit whose day has passed stays Scheduled with a small "day passed" note, never a state; Routed is a start time in the Time column, not a state. **Money**: Not yet (before Done), Paid (with how: "Paid, check"), Bill sent, Failed (the newest charge did not go through). A job (a pass or booked work) carries the same money across its visits: "1 of 2 paid" (`jobMoney`). The older single-state vocabulary below still drives the counts and the customer's pass page.

## Visit states: the older single vocabulary

`src/lib/admin/jobs.ts` derives it in one function from the row, and every screen uses it. No schema enum was added: the words map onto the existing rows.

| Admin word | Read from |
|---|---|
| Needs a day | `visit.status` unscheduled, no `scheduled_on` |
| Scheduled | `scheduled_on` set, `start_time` empty |
| Routed | `start_time` set |
| Done | `completed_on` set (status completed), not charged |
| Charged | `charged_at` set |
| Charge failed | the visit's newest `charge` row failed, or the visit is done and `season_pass.card_failed_at` is set |
| Cancelled, Skipped | `visit.status` cancelled, skipped |
| Not closed (a badge, not a state) | a day that has passed on a visit not marked done |

A pending pass is an unpaid attempt (expires after an hour). Its visits are never on the Schedule, in the Needs a day list or in Home's counts, and its status reads Pending, never Active.

## Fields

| Entity.field | Lives in | Set by | Shown in |
|---|---|---|---|
| job (id, kind, status, price, source, notes, created_at, cancelled_at) | `job`; one row per pass (id `job_<pass id>` when backfilled, kind `pass`, source `checkout`, price the total of its live visits, status copied from the pass by `syncPassJob`) and one per booked work (kind repair, install or other, source `office` or `site`) | `passes.create/renew/activate/cancel/addInspection/skipVisit` (through `src/lib/pass/server/job.ts`); `visits.create`; `visits.cancel` (cancels a job left with no visit) | API: `visits.*` carry `jobId`; `customers.get` lists `jobs` with their visits; admin `AdminData.jobs`, the visit panel's job block and Visits table (Job column, pass number) |
| season_pass.job_id, visit.job_id | both tables, not null | every writer above | API `visits.*` `jobId`; `visit.pass_id` stays as a convenience read for a pass's visits; `visit.booking_id` and the `booking` table are legacy, no longer written (the backfill made a job from each booking, `job_<booking id>`) |
| visit.notes | `visit.notes` | `visits.create`, `visits.update` (empty clears) | API `visits.*` (`notes`); admin visit panel Edit and the Visits table; the crew's stop later |
| not done (reason) | `pass_change` row kind `not-done`, detail reason, note, day, truck | `visits.markNotDone` (could-not-get-in, no-water, customer-asked-to-wait, other; sets Needs a day) | admin visit panel history; the visit's state reads Needs a day again |
| visit cancelled | `visit.status` cancelled, `pass_change` kind `visit-cancelled`; a pending `pass-charge` queue item is closed and `chargeVisit` refuses a cancelled visit | `visits.cancel` | Cancelled state everywhere; the job's price drops by the visit |
| note (a one-off text) | `message_log` kind `note`, channel sms only, body "Trailhead: ... Reply STOP to opt out." | `messages.send` kind `note` (text up to 320; needs a mobile and no STOP; never falls back to email) | admin visit and customer panel threads; the customer's phone |
| charge.method, charge.reference | `charge.method` (card_on_file, card_now, check, venmo, cash, bill; default card_on_file) and `charge.reference` (a check number or Venmo handle) | the charge task (card_on_file); `visits.markClosed` with `paidBy` and `visits.recordPayment` (check, venmo, cash: a succeeded charge, `visit.charged_at` set, the receipt sent); card_now and bill wait for the payment page | API `visits.*` `paidBy`, `paymentStatus`; the Money pill ("Paid, check"); the receipt email ("We received $145 by check"); Reports read the one charge row whatever the method |
| visit.not_done_reason | `visit.not_done_reason` | `visits.markNotDone`; cleared when the visit gets a day (`visits.move`, `visits.pick`) | API `visits.*` `notDoneReason`; the Work pill "Not done, no water on" |
| alert dismissed | `admin_alert` row (kind, key) with `resolved_at`; Home's worked-out rows carry a key (`pass@failedAt`, `task@time`, pass id) | `alerts.dismiss` | Home's Needs action stops showing it until the key changes |

| customer.first_name | `customer.first_name` | checkout contact step; `customers.create/update`; `passes.create` (cleaned with `cleanName`) | checkout step "First name"; API `customers.*`, `passes.*` (`firstName`); admin Customers and Passes tables and panels (inside the full name); pass card and emails (first name only); pass page |
| customer.last_name | `customer.last_name` | checkout contact step (required, "Last name"); `customers.create/update`; `passes.create` (cleaned with `cleanName`; filled in if empty, never rewritten by an email resume) | checkout step; API `customers.*` (`lastName`, readable with the read scope), `passes.get` `customer`; admin Customers (Name column, panel title), Passes (Name column, panel title), Schedule stops and Home rows (`clientName`); not on the pass card or in emails |
| customer.email | `customer.email` | checkout; `customers.create/update` | checkout step; API (write scope only); admin Customers Email column and panel; every email is sent to it |
| customer.phone | `customer.phone` (E.164) | checkout; `customers.create/update` | checkout step; API (write scope only); admin Customers Phone column and panel (`formatPhone`); texts are sent to it |
| customer.lead_source | `customer.lead_source` | `passes.create` ("season-pass"), `customers.create` | API only |
| property.address | `property.address` | checkout address step; `customers.create` | checkout step; API (write scope only: `customers.list` `address`, `customers.get`, `passes.get`); admin Customers Address column and panel |
| property.town | `property.town` | checkout address step (read from the picked address) | checkout; API; admin Passes, Customers, Schedule, Home; city pages |
| property.lat, lng | `property.lat/lng` | geocode task, once | API; Schedule day map and area colours |
| pass.number, season | `season_pass` | `passes.create` | API; admin Passes panel header and `passesContext`; pass page; emails |
| pass.zones | `season_pass.zones` | checkout zones step | checkout; API; admin Passes Zones column and panel; price in Docs (`pricing.md`, `/pricing`) |
| pass.inspection | `season_pass.inspection` | checkout add-on step; `passes.addInspection` | checkout; API; admin pass panel (a third job); pass page |
| pass.status | `season_pass.status` (pending, active, cancelled, lapsed) | `passes.create` (pending), `passes.activate` (active), `passes.cancel`, season end | API; admin Passes Status column, Pending filter and panel note "Unpaid attempt, expires after an hour."; Customers Pass column; Home "Pending passes"; pass page |
| pass.access (needs_customer_home, access_note) | `season_pass` | checkout address step | checkout; API (note: write scope only); admin Passes panel "Access" and Customers panel "Access note"; the crew's stop |
| pass.turn_on / blowout_preference | `season_pass` | checkout (kept at the recommendation); pass page | API; used to order the Needs a day list; **never shown as a day anywhere in the admin**; pass page words |
| pass.card (brand, last4, expires) | `season_pass.card_*` | `passes.activate` from Stripe | API; admin Passes panel; pass page; card-expiring row on Home |
| pass.card_failed_at | `season_pass.card_failed_at` | the charge task | Charge failed state; Home "Charges that didn't go through" and row; pass page headline; card-failed email |
| pass.cancelled_at | `season_pass.cancelled_at` | `passes.cancel` | API; Home row for two weeks |
| pass.created_at | `season_pass.created_at` | `passes.create` | API; decides when a pending pass expires |
| visit (job).kind, window | `visit.kind`, `visit.window` | `passes.create` | API; every job list; Passes columns Turn-on, Inspection, Blowout |
| visit.scheduled_on, truck_id | `visit.scheduled_on`, `truck_id` | checkout days step; `visits.move/pick`; the scheduler | API (`scheduledOn`); Passes day columns, panel jobs, charges and season line; Schedule grid and day view; Customers Next and Scheduled; pass page; date texts; calendar file |
| visit.start_time | `visit.start_time` | the checkout's offered window; the route build later | API (`startTime`); Passes columns and panel (the window "8 to 10 am"); Routed state; pass page; day-before text |
| visit.duration_minutes | `visit.duration_minutes` | the scheduler | API; the length of the window shown beside the day (two hours when empty) |
| visit.status | `visit.status` | the app | API; Jobs state (see above) in the Passes panel, Schedule stops, Customers panel, Home, pass page |
| visit.completed_on | `visit.completed_on` | Ryan marks done | API; Done state; Home "Jobs not closed" |
| visit.charged_at | `visit.charged_at` | the charge task | API; Charged state; Passes "Charged so far"; Revenue; receipt email |
| visit.amount | `visit.amount` | `passes.create` from the price table | API; Passes panel charges; Revenue; `/pricing`, `pricing.md` |
| visit.stop_order | `visit.stop_order` | the route build | API; Schedule day view order |
| visit.exception | `visit.exception` | the nightly read of the calendar feed | API; Schedule "Moved" card and legend |
| charge.status, attempt | `charge` | the charge task | Charge failed state (newest attempt decides); card-failed email |
| consent (terms, marketing) | `consent`, append-only | checkout; `customers.consents.record`; STOP replies | API; admin Customers panel "Consent history" (newest first) and Marketing column; Passes panel consent line |
| message (email, text) | `message_log` | the app, one per event | API `messages.list`; admin Customers panel Messages; the customer's inbox and phone |

## Adding a field

1. Add its row above before the PR is opened.
2. Walk the row left to right: schema, handler input and output (`src/api/v1/*/schemas.ts`), `src/lib/admin/types.ts` and `shape.ts`, the table column and the panel, the pass page, the email or text, the checkout step, Docs.
3. Fill every cell or write the dash and say why.
4. Add the test that proves it through `callApi` on `testDb()`.
