# Build 1: the office can act on a job, and Home is today plus what needs action

> **Vocabulary (Hannah, 14 Nov, 4:10am: "I thought we were calling jobs
> visits").** A **visit** is the stop: the `visit` row with its day, time,
> truck, minutes, state, notes and charge. A **job** is the sold work it
> belongs to: a Season Pass (two or three visits) or a booking (one visit),
> with its price, status, customer and card. Move, Done, Not done and Edit
> act on a visit; Cancel the whole thing and the money live on the job. The
> office lists visits; the nav item is Visits, not Jobs. Where this document
> says "job" for a stop, read "visit".


Written 2026-11-14, 4am, after Hannah: "Potentially, yeah. Go think
through each job, validate this, then go do it." This validates each
admin job against how it happens, states the UX principles the screens
follow, and specifies the screens. The build follows this document.

## The jobs, validated one by one

Validation asks: how often, from where, what the admin has in hand, what
goes wrong today, and whether the proposed path removes a step rather than
adding one.

| Job | How it arrives | How often | Today | Proposed | Why it holds |
|---|---|---|---|---|---|
| See a customer's visits | A call or text: "when are you coming?" | Daily in season | Passes panel lists jobs; Customers panel shows next day only | The customer panel and the job panel both show every job with day, time, state, charge | The admin has a name in hand, not a pass number; search by name must land on the person |
| Reschedule a visit | "Can you do Thursday instead?" | Several a week in season | Only by dragging on the Schedule week | Move on the job panel: a date, a time or "any time that day"; the API refuses outside the window or over capacity, in words; the customer gets the date-moved text | The admin is on the phone; a drag on another screen is two screens too many |
| Mark done or not done | Ryan forgot, or could not get in | Daily | Home's not-closed row only | Done and Not done on the job panel, with a reason for Not done; the charge or the return-to-Needs-a-day follows | The reason is the point: "no water on" needs a call, "could not get in" needs the access note fixed |
| Send a one-off text | "Running late", "we found a leak, call me" | Weekly | Not possible | Send a text on the job and customer panels: free text, logged, through the consent gate as transactional | It goes to the same thread the customer already has from us; one place to read it later |
| Confirmations go out | Every move, every done | Automatic | Date-moved and receipt exist and send | Unchanged, but the job panel shows them in the thread so the admin can see what the customer saw | Trust needs the admin to see the message, not assume it |
| Add a job Ryan took by phone | A repair, a late turn-on | Several a week | Not possible | New job on Jobs and on a customer: existing or new customer, kind, day, time, minutes, truck, price, notes | Must work in under a minute with a phone in the other hand |
| Change a job's details | Wrong length, wrong truck, gate code | Weekly | Not possible | Edit on the job panel | |
| Cancel | Moving house, changed their mind | Monthly | Pass cancel only | Cancel this job (the pass's other jobs stay) and Cancel the pass, both with what happens to the money said | |
| What needs me tonight | Hannah opens the laptop | Nightly | Eight tiles, a chart, two lists | Home: today and tomorrow by truck, and Needs action with one button per row and Dismiss | A count is not a job; a row with a button is |
| How is the money | Month end | Monthly | Revenue page | Reports: revenue, passes sold, season chart, later quotes and invoices | Out of the daily path |

Two things are not jobs and come out: the Passes nav item (a pass is
opened from a job or a customer) and the Home tiles.

## UX principles the screens follow

1. Actions live on the thing they act on. A job's actions are on the
   job; a customer's on the customer.
2. One primary action per surface; the rest are secondary and quiet.
3. Search by what the admin has in hand: a name, a street, a phone.
4. Every action says what will happen before it happens ("Moves the
   blowout to Thu, Oct 14 and texts Dana") and what happened after.
5. A refusal is the API's words, inline, next to the thing refused.
6. Defaults are the product: New job opens with today, any time, the
   kind's minutes, the first truck.
7. Nothing the admin cannot act on is shown on Home.
8. The customer's thread shows every message we sent, so the admin never
   has to wonder what the customer knows.
9. Words from `docs/UX_WRITING.md`: verbs on buttons, sentence case, no
   jargon, the job words (Needs a day, Scheduled, Routed, Done, Charged,
   Charge failed, Cancelled).
10. A phone works: the panel is a sheet, the forms are one column.

## The screens

**Nav:** Home, Schedule, Visits, Customers, Reports, Settings. `/admin/passes`
stays as a page reachable from the Jobs header, a job panel and a customer
panel, not from the nav.

**Home:** the greeting line; "Today" and "Tomorrow", each truck's stops in
order with time or "any time", customer, town, kind, state pill, each row
opening the job panel; "Needs action": one row per item (a job needing a
day inside its lead time, a charge that failed, a job not closed, a stale
queue failure, a new pass to look at, a pending pass older than an hour),
each with its one button (Place, Send card link, Mark done, Retry, Open,
Dismiss) and a Dismiss on every row. Nothing else.

**Reports:** what Home had: revenue this month, passes sold, quotes and
invoices placeholders, the season chart, the month table from Revenue.

**Jobs:** every job of the season: Customer (full name), Town, Job (kind),
Day, Time, Truck, State, Price, Pass number; filters state, kind, truck,
town, pass or not; search by name, street or phone; sorted by day; New job
in the header; a row opens the job panel.

**The job panel** (from Jobs, Schedule, Home, the pass panel, the customer
panel): header with the customer's name and the job's kind and day; the
customer block (street, town, phone as a tel link, email, access note,
needs-home answer); the job block (day, time or any time, truck, minutes,
price, state pill, Not closed badge, pass link); the thread (every message
sent for this job and customer, newest first); the actions: Move (date,
time or any time; the sentence of what will happen; the API's refusal
inline), Done (today or a chosen day), Not done (reason: could not get in,
no water on, customer asked to wait, other), Edit (minutes, truck, access
note, notes), Send a text (free text, 320 characters, the consent line
shown, refused when the customer has no phone or has stopped texts),
Resend confirmation (pass jobs), Cancel this job (with what happens to the
charge).

**The customer panel:** the same actions where they apply, plus New job
and Open pass.

**New job:** a sheet: customer search (name, street, phone) or "New
customer" (first and last name, street, town from the six, email, phone,
access note); kind; day (default today); time or any time (default any);
minutes (default from the kind: turn-on 60, inspection 60, blowout 45,
repair 120, install 120, other 60); truck (default the first active);
price (default from the kind where known, else blank with "quote later");
notes. Creates the job row; when it has a day and the customer consents,
the date-set text goes.

## Data the build needs (from the stopped agent's read)

- A one-off job needs a `booking` row because the visit table requires
  exactly one of pass or booking: `jobs.create` makes the booking row with
  source `office` and the visit on it. No schema change.
- The visit gains `notes` (text) and `price` is the existing `amount`;
  `duration_minutes` exists. One migration for `notes`.
- `messages.send` gains a free-text kind `note` (transactional; the gate
  requires a phone and no STOP; email fallback off for notes).
- The admin `Visit` type gains price, minutes and notes; the data model
  document gets the rows.
- New handlers: `visits.markNotDone`, `visits.update`, `visits.cancel`,
  `jobs.create`, `alerts.dismiss`.

## Out of scope for this build

The offers (build 2), the day view (3), the customer's Move (4), the route
build (5), the pull (6), renewal (7), Settings (8), repairs from the site
(9). Nothing here changes the scheduling rules.

## How it is checked before it ships

tsc, the unit suite, the stories with axe, the design gate, the build and
the marketing manifest; then Home, Jobs, the job panel at 1440 and 375 and
New job rendered from the branch's own Storybook; then, after the merge,
the live walk: move your real pass's turn-on by a day and watch the text
row appear, mark it done and watch the charge, send yourself a one-off
text.
