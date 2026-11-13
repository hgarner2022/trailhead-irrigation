# Status, sync, the schedule and the actions: a review

Written 2026-11-12 night at Hannah's request after the round-2 review:
"think through the status; go out, look at the job to be done; make sure all
the data's synced, there's a flow; is this the best way to represent the
schedule; are the actions clear". This is an assessment of the prototype on
`prototype-round-2` and the wiring plan, with what to change. Nothing here
is built yet unless it says so.

## 1. The jobs to be done

| Who | The job, in their words | What they look at | Done when |
|---|---|---|---|
| Hannah | "Is the money coming in, and what needs me today?" | Home, Revenue | Every failed charge, bounced email, stuck Jobber job and customer reply has one row and one action |
| Ryan | "What am I doing today, and is next week set?" | Schedule (day on the phone, week on a laptop) | Today's stops in order; next week proposed, approved in one click; nothing to retype into Jobber |
| The crew | "Where next, what do I do there, and tap done" | Jobber's app until the day view ships | A completed visit is one tap, and the charge follows from it |
| The customer | "When are you coming, and did it go through?" | The emails and texts, the pass page | They never have to call to learn a date, change a preference, or see what they paid |
| An agent or integration | "Read and act on the same things the screens do" | `/api/v1`, MCP | Nothing on a screen is unreachable from the API |

The pass product is a schedule promise. Every status, sync and screen below
is judged by whether it keeps that promise visible and true.

## 2. The status model

One status per entity, set by one actor. The customer's words differ from
the admin's and are listed beside each.

### Season Pass

| Status | Set by | When | Customer word | Jobber |
|---|---|---|---|---|
| pending | checkout | address through contact answered, card not yet saved | (not shown) | nothing yet |
| active | Stripe webhook (`checkout.session.completed`) | card saved | Reserved | client, property and one unscheduled job per visit created |
| cancelled | customer (pass page) or admin | any time | Cancelled | open jobs cancelled by API, or noted and listed for Ryan (`pass-cancelled` row) |
| lapsed | renewal job | March 1 of the next season with no renewal | (the renewal email's wording) | nothing |

Gap: **renewed** is a link (`renewed_from_id`), not a status, which is right.
A pass whose card failed is still `active` with an attention row; do not add
a `past-due` pass status, the charge carries it.

### Visit (the row the schedule and the charge both read)

| Status | Set by | Meaning | Customer word | Jobber |
|---|---|---|---|---|
| unscheduled | pass activation, booking of a date-less request | in its window, no day | Reserved / Preferred (with the preference) | job exists, no visit |
| proposed | scheduler run | truck and day chosen, Ryan has not approved | (still Preferred) | nothing yet |
| scheduled, planned | approval, beyond the firm horizon (fall) | day set, may still move with the forecast | Booked, with "we'll confirm the week before" | visit on the calendar |
| scheduled, firm | approval inside the firm horizon, or spring | day set and promised | Booked, date | visit on the calendar |
| completed | Jobber `visitComplete` signal (today), the day view's Done tap (later) | work done | Done | visit complete |
| cancelled | pass cancel, booking cancel, admin | will not happen | (row gone or Cancelled) | job cancelled or noted |
| skipped | customer or admin | the customer declined this one visit, pass stays | Skipped | visit removed, job closed |
| not-closed | nightly check | the day passed, nobody marked it done | (still Booked) | visit past, incomplete |

Changes to make:

1. **Add `firm: boolean`** to the prototype's `Visit` (the plan's
   `ScheduledVisit` has it; the screen type does not) and show planned
   visits with a dotted edge in the week grid, firm ones solid. The customer
   message for a planned fall date says the week, not the day, until it is
   firm.
2. **Add `skipped`.** A customer who is away in July, or who sells the house
   in September, should be able to skip one visit without cancelling the
   pass. Today the only exits are cancel or a phone call.
3. **`moved-in-jobber` is an exception flag, not a status.** Keep it that way;
   the visit stays `scheduled`.

### Charge, booking, request, message

- Charge: `pending` → `succeeded` | `failed` (attempt n) | `refunded`. One per
  visit per attempt. The visit row never changes for a charge.
- Booking (the one-off visit from `/book`): `booked` → `cancelled`; its
  visit carries everything else.
- Request (needs a quote): `new` → `quoted` → `won` | `lost`; lands in the
  Requests inbox later.
- Message: `queued` → `sent` → `delivered` | `failed` | `bounced`; inbound:
  `received` → `handled`. See section 6.

## 3. The sync flow, end to end

The rule from the IA stands: one owner per entity; the other system holds a
display copy. Here is every edge, with its failure path.

### App to Jobber (push)

| Event in the app | Jobber write | Key | If Jobber fails |
|---|---|---|---|
| pass activated | client (find by email, else create), property, one job per visit, unscheduled, titled with the pass number and preference | pass id | retry with backoff; after 3 failures a `jobs-failed` row; the pass is still active and still on the Schedule, so nothing is lost but the display |
| visit approved (proposed to scheduled) | `scheduleVisit` on the job, assigned to the truck's Jobber user, with the slot length | visit id + day | retry; a `push-failed` row names the visit; the day shows a small warning mark until it lands |
| visit moved in the app | `moveVisit` | visit id + new day | same |
| pass or booking cancelled | `cancelJob` when the API allows; else a note on the job and the `pass-cancelled` row until the mirror sees the job gone | pass id | the row stays; Ryan removes by hand |
| customer edits phone or email on the pass page | `clientUpdate` for pass customers only | customer id | retry; a row |

### Jobber to app (read back)

| Signal | Topic | What the app does | Conflict rule |
|---|---|---|---|
| visit completed | `VISIT_COMPLETE` | visit `completed`, charge queued for pass visits, receipt message, `visit.done` event | always accepted |
| visit moved or reassigned | `VISIT_UPDATE` with a different day or user | the app adopts the new day and truck, writes a `VisitException`, sends the date-moved message | Jobber's move wins over the app's choice, always; the exception is shown, never silently absorbed |
| job deleted or cancelled in Jobber | `JOB_UPDATE` / nightly reconcile | the visit becomes `cancelled` with an exception "cancelled in Jobber", attention row, no charge | Jobber wins, with a row so a mistake is seen |
| non-pass jobs, visits, quotes, invoices | nightly full pull plus webhooks | the mirror the dashboard numbers read | Jobber owns these until the retirement steps |
| client edits in Jobber | `CLIENT_UPDATE` | mirror only; for a pass customer the app's copy stays the truth and a row says "phone differs in Jobber" | app wins for pass customers |

Phase 0 must confirm three things in GraphiQL before any of this is built:
the webhook topics that exist for visit and job changes, whether a job can
be cancelled by mutation, and whether the route order is readable. The plan
lists all three; the answers change the rows above, not the shape.

### The nightly reconcile

Webhooks are at-least-once and sometimes never. Every night at 2 am Mountain
the app pulls every visit on the pass jobs and every open job, and fixes any
drift in the app's favour for pass rows and Jobber's favour for mirror rows,
writing an attention row for anything it could not decide. The `not-closed`
check runs in the same job. This is the part that makes "all the data is
synced" true, not the webhooks.

### What the customer sees of all this

Every state change that matters to them is a message: purchase
confirmation (with the pass image), date set, date moved, day-before
reminder, on-my-way, receipt naming the next visit, card failed, cancelled,
renewal. The pass page is the current state; the messages are the history.
A status the customer cannot see is a status that will become a phone call.

## 4. Is the Schedule the best representation?

What exists: a week grid, one row per truck, seven day columns, visit
blocks (hatched while proposed), a load line per cell, a day map with pins
in stop order. Judged against the job ("what am I doing today, is next week
set"):

**Right.** A week by truck with days as the unit is correct for pass work,
because pass visits have a day and an area, not a time; the trade guide and
the vendors all plan by truck-day. The map beside the day answers Hannah's
"do not go backwards" by eye. Hatched-until-approved makes the proposal
honest.

**Missing, in order of importance.**

1. **A "To schedule" tray.** The visits with no day yet (unscheduled pass
   visits whose window is near, bookings from the form that need a slot,
   requests Ryan turned into a visit) have no home on the Schedule. They
   are on Customers now (this round), but the job is done on the Schedule,
   so the tray sits beside the week, sorted by window, and a visit is
   dragged from it onto a truck-day. The scheduler's Propose fills the tray
   into the week; a human can do it one at a time.
2. **Planned versus firm.** Fall dates beyond the firm horizon look the same
   as promised ones. Dotted edge for planned, solid for firm, and a
   "Confirm next week" action that firms the next seven days and sends the
   date-set messages in one go.
3. **The day as a timeline once the app orders stops.** Today the day view
   lists stops in Jobber's order with no times. When the day view ships and
   the app orders stops, the day becomes a timeline (7 am to 5 pm) with the
   slot lengths from the audit, drive gaps, and repairs placed between pass
   visits. The week stays blocks; the day becomes time. Not before the
   ordering exists, or the times would be invented.
4. **Capacity as a bar, not a number.** "6 of 10" reads slower than a bar
   that fills. Same data, one glance.
5. **Exceptions as a filter.** "Show only moved-in-Jobber" so Ryan can
   review what he changed on the phone and the app recorded.

**Not worth doing.** A month view (pass work is planned by week), drag between
trucks across weeks (rare, use Move), and times on pass visits before the
day view exists.

## 5. Are the actions clear?

Every screen's actions, and the verdict.

| Screen | Actions today | Verdict and change |
|---|---|---|
| Home | each attention row links to its pass; no buttons | Each row needs its one action on the row: Retry (jobs-failed), Send card link (charge-failed), Mark done / Not done (not-closed), Open in Jobber (pass-cancelled), Reply (customer replied). A row without an action is a worry, not a task. |
| Schedule | Propose, Approve (the batch), Move to (day or truck), the map | Add: Confirm next week (firms planned dates), Mark done (for the admin, until the day view), Send on-my-way (from the day view). Approve should also exist per truck-day for a partial approval; "the batch" is the common case, not the only one. Add Undo on Move (one step). |
| Passes | Resend confirmation, Send card update link, Cancel pass; bulk: the first two | Add: Add July inspection (the new add-on), Change preference (what the customer can do, Hannah can do), Skip a visit, Refund a charge (through Stripe). The panel's charges list should link each charge to Stripe. |
| Customers (this round) | Send pass offer, Open in Jobber | Add the Messages section (section 6) and Reply. Add "Book a visit" that opens the booking form prefilled, so a phone booking is typed once. |
| Revenue | none | Right. A reading page. Export is enough. |
| Settings | save per field, Create and Revoke keys | Right. |
| Pass page (customer) | Update card, Change preference (this round), Cancel | Add: Skip this visit, Add the July inspection (if not bought), Request a different day once a date is set (creates an exception for Ryan instead of a phone call). |
| Checkout | Continue, Back, the choices | Right. |

Two rules fall out of this:

- **One action per attention row, on the row.** Home is the inbox; it must
  be clearable.
- **Whatever the customer can do, the admin can do for them**, and vice
  versa where it makes sense. A phone call should end in Hannah pressing
  the same button the customer would have.

## 6. Messages on the customer, and two-way texting (Hannah, tonight)

**The customer panel needs the message history.** Every email and text the
app sent to that customer, newest first: kind (confirmation, date set,
reminder, on-my-way, receipt, card failed, cancelled, renewal, a reply from
us), channel, when, and its state (sent, delivered, failed, bounced, opened
where the provider says so). Failed and bounced rows carry Retry. This is
also where Hannah checks "did they get the date" before calling. The data
is the `message` table the wiring plan already has (Phase 12); the panel
section and a fixture of a dozen messages per pass customer are prototype
work for the next round.

**Texting is two-way.** The app sends from one Twilio number. A reply comes
back through Twilio's inbound webhook into the queue (`twilio-inbound` in
the plan): STOP, UNSUBSCRIBE and the carrier keywords write a consent row
and get the required confirmation text with no human involved; HELP gets
the help text; anything else is stored on the customer as a received
message, raises a `customer-replied` row on Home with the text in it, and
Hannah or Ryan answer from the customer's panel in the same thread, which
sends from the same number so the customer sees one conversation. Replies
to the on-my-way or reminder text ("can you come after 10?") are the common
case, which is why the row goes to Home and not to an inbox nobody opens.
Email replies go to the real inbox (the from address is ryan@) and are not
threaded in the app in the first build; the panel notes "replies by email
go to Ryan's inbox".

Rules: never send marketing by text without the checkout's box; every text
carries the business name and STOP once a day at most; the number is one
per organization so a second branch gets its own.

## 7. What to do, in order

1. Prototype, next round: the Messages section and Reply in the Customers
   panel; the "To schedule" tray on the Schedule; planned versus firm; one
   action per attention row on Home; Add inspection, Change preference and
   Skip on the Passes panel; Skip, Add inspection and Request a different
   day on the pass page. (About a day of prototype work, each a story.)
2. Wiring plan: add `skipped`, `firm`, the nightly reconcile as its own
   task in Phase 6, `customer-replied` and the inbound thread in Phase 12,
   `passes.skipVisit`, `passes.addInspection`, `visits.requestMove`.
3. Phase 0 questions to add: the webhook topics for visit and job changes,
   and whether Twilio's number can be ported later (it can; note it).
