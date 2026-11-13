# Jobber audit: what the build must reproduce

12 November 2026. Read from the Jobber account (the raw pull of clients, 599
visits, 601 jobs, 31 quotes, 372 invoices, plus live reads of the 37-item
catalog, all 244 requests, and samples of jobs, visits, invoices, quotes,
clients and properties). No names, addresses or per-customer amounts here; the
full version is local and git-ignored.

The account opened in March 2026, so every record is from this season.

## 1. Services and prices

Thirty-seven catalog items: 29 services, 8 material products. Eleven are
bookable online; the rest Ryan adds to jobs and invoices himself. "2026
visits" counts visits carrying the service (421 of 574 visits have service
ids; the others are personal calendar blocks or quoted work entered without a
catalog line).

### Bookable online

| Service | Price | Jobber's text | Tax | Slot | 2026 visits |
|---|---|---|---|---|---|
| Winterization 1-6 zones | $95 | $95 up to 6 | no | 30m | 192 |
| Winterization 7-9 zones | $105 | from $105 for 7, +$10 per zone | no | 45m | 31 |
| Winterization 10-12 zones | $135 | from $135 for 10, +$10 per zone | no | 60m | 10 |
| Winterization 13+ zones | $165 | from $165 for 13, +$8 per zone | no | 90m | 2 |
| Turn-on & System Check 1-8 zones | $145 | $145 up to 8, +$18 per zone, +materials | yes | 60m | 29 |
| Turn-on & System Check 9-12 zones | $145 | $145 up to 9, +$10 per zone | no | 90m | 6 |
| Turn-on & System Check 13 or more | $235 | $235 up to 13, +$18 per zone | yes | 120m | 1 |
| System Inspection & Tune-up | $135 | text says $145 up to 8, +$18 per zone | yes | 60m | 34 |
| Sprinkler Repair Assessment | $145 | $145 visit, minor repairs at $145/hr + materials | yes | 60m | 79 |
| Water efficiency / new install / addition assessment | $75 | consultation and estimate visit | yes | 30m | 2 |
| Rachio 3 Smart clock install | $350 | $350 for 8-zone, $425 for 16-zone | no | 90m | 7 |

### Not bookable online

| Service | Price | 2026 visits |
|---|---|---|
| BackFlow, Manifold, or Valve leak (diagnosis visit; lists repair prices: poppet $60, bleeder $45, shutoff $170, full backflow $500, valve+drain $60, manifold rebuild from $500) | $145 | 16 |
| Sprinkler repair labor | $130/hr | 19 |
| Manifold rebuild (valves $50 each extra) | $500 | 4 |
| Sprinkler install labor | $135/hr | 2 |
| Labor to install drip or garden | $135/hr | 0 |
| Install Hunter MPR water efficient Nozzles (22 nozzles) | $400 | 0 (per-nozzle on invoices) |
| Backflow poppet bonnet replacement | $60 | 0 (on invoices) |
| Replace backflow bleeder valve | $0 | 0 |
| Manifold diagnosis and replace head | $140 | 0 |
| Raise and straighten head | $10 | 0 |
| Nozzle replacement | $5 | 0 |
| Replace solenoid | $30 | 0 |
| Drip Material (per fitting or foot) | $1 | 0 |
| Sprinkler Design and Installation (placeholder) | $0 | 0 |
| Lawn Aeration ($125 to ~5,000 sq ft, $160 to 10,000) | $125 | 1 |
| Complete Plan (turn-on + mid-season + winterization, priority scheduling, 10% off all services; taxable) | $320 | 0 |

Products: valve replacement $50, relocate spray head $50, rotor head $20, pop-up
head $20, MP Rotator nozzle $10, poly fittings $3, spray nozzle $3, fitting or
foot of pipe $3.

Bundles: the Complete Plan is the only one. It has never been on a visit, a
request or a sampled invoice.

Price history inside the season: turn-on and inspection were booked at $130
(March to April), $135 (May to August), $145 (September on). The blowout has
been $95 all season.

### Mismatches against the website

Website sources: `src/lib/season-pass.ts`, `src/app/pricing/page.tsx`,
`public/pricing.md`, `src/lib/rachio-data.ts`, `src/app/sprinkler-repair/page.tsx`.

1. Extra zones on the 1-8 turn-on and the inspection: Jobber +$18 per zone
   over 8 (catalog text and the live form); the website +$10 everywhere.
2. Turn-on 9-12 band: Jobber $145 covers up to 9 zones, then +$10; the website
   puts 9 zones at $155. 13+ band: Jobber $235 up to 13 then +$18; the website
   would be $195 at 13 and $225 at 16, where Jobber charges $289.
3. Inspection default price $135 in the catalog; its own text and the website
   say $145. A test booking would settle which one the form charges.
4. Blowout 13+ band: Jobber +$8 per zone over 13, the website +$10. At 16 zones
   the website and `season-pass.ts` say $195, Jobber $189.
5. Repair labor: $130/hr in the catalog; the website and Jobber's own Repair
   Assessment text say $145/hr.
6. Rachio 16-zone install: Jobber $425, `rachio-data.ts` $420. 8-zone matches.
7. Complete Plan $320 with 10% off versus the website Season Pass at $385 for
   6 zones with no discount.
8. Install and water-efficiency assessment: Jobber books a $75 visit; the
   website says installs start with a free yard visit and quote.
9. Aeration: live in the catalog at $125/$160 with its form switched off; the
   website says not offered in 2026 (consistent with `AERATION_BOOKING_OPEN`).
10. Repair visit length: the repair page says 45 minutes to an hour; the
    booking slot is 60 minutes; most repair visits are scheduled at 120.

## 2. Visit durations and capacity

Scheduled slot length (start to end) on completed 2026 visits, by service id.
The connector exposes no clocked time; `completedAt` lands a median 6 minutes
after the scheduled end (p25 -16, p75 +33), so the slot is a fair proxy.

| Kind | n | median | p25 | p75 | spread | Online slot |
|---|---|---|---|---|---|---|
| Blowout | 201 | 30 | 30 | 30 | 153 at 30, 29 at 45, 8 at 60 | 30/45/60/90 by band |
| Repair (assessment or backflow diagnosis) | 70 | 120 | 60 | 120 | 30 at 120, 21 at 60, 9 at 90, 5 at 180 | 60 |
| Inspection & tune-up | 27 | 90 | 60 | 120 | 12 at 60, 6 at 120, 5 at 90 | 60 |
| Turn-on | 26 | 68 | 60 | 98 | 13 at 60, 6 at 90, 6 at 120 | 60/90/120 by band |
| Install or labor | 19 | 120 | 120 | 210 | max 300 | none |
| Rachio install | 4 | 120 | | | 3 at 120, 1 at 90 | 90 |
| No catalog line (quoted work) | 35 | 120 | 90 | 300 | 6 at 360 | none |

Blowouts run to the booking slot. Repairs and inspections booked at 60 minutes
are moved to 120 and 90 most of the time: the slot grid and the real day
disagree there.

Capacity:

- 574 visits in 2026, 80 of them personal calendar blocks. 494 real visits:
  383 completed, 101 past but never marked complete, 7 upcoming.
- Busiest days: two October days at 17 real visits (9 and 8 between the two
  people), eight more October days at 12 to 14. October: 23 working days, 208
  real visits, 9 a day.
- Per person per working day: person A median 2, p90 5, max 9 over 151 days;
  person B median 3, p90 6, max 8 over 25 days.
- Heaviest scheduled minutes: 1,050 for one person on an install day in May;
  525 + 495 across the two on Oct 6; 480 each on Oct 1.
- Weekdays: Fri 127, Wed 111, Mon 104, Thu 97, Tue 93, Sat 40, Sun 2.
- Starts sit on the hour (330) or the half hour (150): a 30-minute grid, from
  about 7am to about 5pm.
- Lead time from booking to visit: median 7.9 days, p10 1.3, p90 20.7; 10%
  same or next day.
- `clientConfirmed` true on 40% of real visits: the confirmation request is on
  and customers answer it.
- No arrival windows, no routing order on any visit.

## 3. Team

Two people on 2026 visits, nobody else, no unassigned visits.

| Month | Person A | Person B |
|---|---|---|
| Apr | 18 | 0 |
| May | 44 | 0 |
| Jun | 61 | 0 |
| Jul | 60 | 0 |
| Aug | 37 | 0 |
| Sep | 54 | 2 |
| Oct | 137 | 101 |
| Nov | 50 | 28 |
| Dec | 9 | 0 |

Person B starts Sep 21. 37 days have both working, 21 of October's 23 working
days among them. 27 visits carry both people, 24 of them blowouts in the first
week of October (riding together). Two trucks from late September through the
blowout season, one truck the rest of the year.

## 4. Booking and request forms

The form on `/book` (`JOBBER_FORMS.seasonal`) is Jobber online booking, not a
work-request form: zip gate, services as a checklist with durations, contact
and address with consent, time slot, confirm.

- 244 requests, every one `converted`; zero new, needs approval, archived or
  unscheduled (checked live by status).
- `isScheduled` false and `assessment` null on every request because the
  schedule lives on the job: request, job and visit are created in the same
  second, the visit at the slot the customer chose. Bookings arrive scheduled.
- Sources: about 204 from the embedded form, about 35 `external` (Jobber's
  hosted booking link), 5 from the client hub. Seven requests before June 10
  are the old request-form kind ("Request for ...", converted days later);
  from June 10 every request converts at creation, which dates online booking.
  About eight are owner test bookings.
- By month, roughly: Mar 7, Apr 9, May 17, Jun 16, Jul 9, Aug 11, Sep 46, Oct
  101, Nov 28 to the 12th.
- 601 jobs against 244 requests: 357 jobs were made directly (phone and text
  customers, follow-up visits, 14 converted quotes, personal blocks).

Fields the form collects (from the `instructions` on booked jobs and visits;
the services are line items):

1. Services as catalog line items with price; one or two per booking (blowout
   plus repair assessment is the common pair).
2. "I confirm that access will be available to the sprinkler shut-off valve
   and controller (clock) at the time of service." Yes.
3. "Number of Sprinkler Zones (includes both sprinkler and drip zones)", a band.
4. "Please provide as additional information or issues known." Free text.
5. Name, email, phone (SMS allowed), service address.
6. Consent: marketing email pre-ticked; transactional SMS implied by the phone
   with STOP/HELP; marketing SMS a separate unticked box (STOP MKT).
7. The time slot.

Not collected: how they heard about us (`leadSource` is empty on online
bookings), preferred dates (a slot is chosen), zip beyond the gate.

Afterwards: one job with one visit on the calendar, assigned, with the team
reminder and the confirmation request. 55 jobs (9%) are `action_required` with
no visit: booked online, the visit later deleted, the job left open and
uninvoiced. Some are the same customer booking twice two days apart. That is
how cancellations and double bookings are handled today. The aeration form is
switched off in Jobber.

## 5. Custom fields and tags

- Clients: `customFields` empty, `tags` empty on the sample. `leadSource` is a
  built-in field, set on hand-entered clients, empty on online bookings.
- Properties: `customFields` empty, `taxRate` null, `routingOrder` null.
- Jobs: no custom fields in the API shape; the form answers live in
  `instructions`. 420 of 601 jobs have no title (online bookings).
- Invoices: no custom fields; `subject` is "For Services Rendered" on 264.
- No tags in use anywhere sampled.

## 6. Invoices and payments

- 372 invoices, all 2026: 358 paid, 14 past due. $77,611 invoiced, $74,731
  paid, $2,530 outstanding, all of it on the 14 past-due invoices (nine of
  them $95 blowouts, the rest single repair or install invoices up to $815).
- Terms: due on receipt on every invoice. Nothing is awaiting payment or sent
  and not due: the invoice is issued when payment is taken.
- Issued by month: Apr 15, May 29, Jun 54, Jul 33, Aug 21, Sep 26, Oct 158,
  Nov 36. Totals: $95 on 158 invoices, $135 on 15, $105 on 15, $145 on 11.
- Payment method, 15-invoice sample across the season: 10 by card through
  Jobber Payments (one a partial), 4 recorded with no method (cash, check or
  transfer entered by hand), 1 unpaid. Roughly 70% card.
- Days to pay, same sample: 11 of 14 paid within minutes of issue, one in 2
  days, one in 13.
- Tax: zero on every sampled invoice even where lines are marked taxable; no
  tax rate on properties. Tax is not charged.
- Tips: one in the sample, so tipping is on. Discounts: none. Deposits: none,
  on invoices or quotes.
- Client hub: invoice and quote links go through it; about half the sample was
  opened there.

## 7. Quotes

- 31 quotes: 16 awaiting response ($33,099.50), 14 converted ($18,002.75), 1
  archived ($1,110).
- The $33k from the Nov 1 pull is still open tonight: the live query returns
  the same 16, the oldest from May 2. Five are installs or large drip jobs and
  carry $26,150 of it; the other eleven are $330 to $1,070 repair and drip
  conversions. Six of the 16 were never opened in the client hub.
- Converted quotes were approved the same day or within a week and became
  jobs within days.
- Install quote shape: one lump line for the system ($3,750 to $4,900: design,
  backflow, shutoff, manifold, piping, wiring, controller, trenching, startup,
  cleanup), then add-ons as separate lines: Rachio upgrade $220 to $250, an
  extra zone $550 to $950, a landscape drip zone $850, MPR nozzles $120. No
  deposit on any quote. A signed copy is attached as an internal note on
  approval.

## 8. What else Jobber is doing

- Recurring jobs: 2, both personal calendar blocks. No recurring customer work.
- Visit confirmations: on, 40% confirmed. Team reminder offset set on visits.
- Job forms: the feature exists; nothing shows one in use.
- Completion options on a visit: close job and invoice now, invoice later,
  leave open. Invoicing on the spot is the norm.
- Marking complete is inconsistent: 101 of 484 past real visits (21%) were
  never marked complete and sit as "late"; 138 jobs show "late".
- Client hub: requests from it (5), invoices and quotes viewed in it, Jobber
  Payments with saved last-4, tips.
- SMS allowed on client phones.
- Route optimisation leaves no trace in the data (routing order null).
- Connector limits hit: `search_visits` by `jobIds` fails ("Unable to search
  visits"); no time entries or job forms are exposed.

## What the build must reproduce

- The booking flow as it is: zip gate, services as a checklist with a price
  and a duration each, zone band, the access confirmation, a free-text issues
  field, contact and address, the two consent boxes with the same wording, a
  time slot from real availability on a 30-minute grid, and a confirmed visit
  on the calendar at the end. No request inbox step for bookings.
- A booking creates the job and the visit together, assigned to a truck, and
  sends the confirmation request. The schedule's unit is the visit.
- Slot lengths per service band (30/45/60/90 for blowouts, 60/90/120 for
  turn-ons, 60 for inspection and repair, 30 for the assessment, 90 for
  Rachio), with the admin able to stretch a visit after booking, since repairs
  and inspections usually become 120 and 90.
- Two trucks in blowout season, one otherwise; a per-day ceiling around 9
  visits per truck in October, 2 to 5 the rest of the year.
- Personal calendar blocks (availability, vacation, standing errands) on the
  same calendar as visits, so capacity subtracts them.
- The catalog with per-zone bands and the +$10 / +$18 / +$8 extra-zone rules,
  or one rule once Ryan picks it, and materials as separate priced lines.
- Invoice on completion, due on receipt, card through the app with a saved
  card, tips allowed, no tax, manual payment recording for cash and check.
- A past-due list (the 14), since that is the one receivable Jobber tracks.
- Quotes with a lump system line plus optional add-on lines, client-viewable,
  approval recorded, no deposit; the 16 open quotes carried over.
- A cancellation that closes or voids the job instead of leaving a visit-less
  open job, and a duplicate check on a second booking from the same address
  within days.
- A "done" that is explicit, so visits do not sit as "late" for the season.
- Lead source on the client (today a built-in field used only by hand).
- Mirror to Jobber for every visit while it stays the field display, and the
  Complete Plan retired there.

## Questions for Ryan

- Extra zones: +$10 or +$18 on turn-ons and inspections? The site says $10, the
  form charges $18 on the 1-8 band and $10 on the 9-12 band. Which is right?
- Inspection price: $135 (catalog field) or $145 (catalog text and site)?
- Blowout 13+ zones: +$8 or +$10 per zone?
- Repair labor: $130 or $145 an hour? The catalog has both.
- Rachio 16-zone install: $420 or $425?
- Is the $75 assessment visit charged on new-install consultations, or is the
  yard visit free as the site says?
- Should the Complete Plan be removed from Jobber now the Season Pass exists?
- The 55 open jobs with no visit: cancellations, duplicates, or something else?
  Should they be closed?
- The 101 past visits never marked complete: done and forgotten, or not done?
- The 16 open quotes ($33k, oldest May): chase, archive, or leave?
- The 14 past-due invoices: who is chasing them, and how?
- Is tax meant to be charged on anything (taxable lines, zero tax)?
- Are the 4-in-15 non-card payments cash, check or Zelle, and should the app
  record them the same way?
- Where does the route order come from on a 17-visit day, and does the second
  truck get its own route?
- Does person B return in spring, or is the second truck blowout season only?
