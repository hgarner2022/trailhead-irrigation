# Customer portal: the architecture

Nov 18 2026. The decisions the portal v2 design and build follow. Written by the architect after reading the shipped portal (`src/app/(account)/`, `src/lib/portal/`, `src/api/v1/portal/`), the handlers (`visits.pick`, `visits.cancel`, `passes.skipVisit`, `passes.cancel`, `jobs.cancel`), the scheduler (`orderDay`, `dayBeforeMessages`), the guard (`requireCustomer`) and `docs/DATA_MODEL.md`. Hannah's settled rules are in bold. Nothing here needs a migration.

## 1. The customer's jobs to be done, each on a record

| The customer wants to | The record it reads or writes | Exists today |
|---|---|---|
| See what is coming and when | `visit` (scheduled_on, start_time, person), `job` (name, season) | Yes |
| Know the arrival window | `message_log` kind `day-before` for the visit (section 4) | Yes, unused by the portal |
| Change the day | `visits.pick` (offered days from `visits.areaDays`, the customer texted) | Yes; cut-off is two days, **becomes 24 hours** |
| Cancel a visit | A customer-safe cancel (section 3) writing `visit.cancelled_at` or a pass skip, an event, an alert | Handler to add |
| Pay what is unpaid | `invoice` with a signed pay link, `charge` rows | Yes |
| See what they paid, get a receipt | `charge` rows, `payments.receipt` | Yes |
| Update the card | `customers.startCardUpdate` (Stripe setup session, `customerId` in metadata) | Yes |
| Update name, phone, yard facts | `customers.updateSelf`, `properties.updateSelf` (email never self-served) | Yes |
| Renew the pass, add July, skip a pass visit, cancel the pass | `passes.*` on `/account/pass` | Yes |
| Reach Ryan | `tel:` and `sms:` links with the visit named | Copy only |

A customer never sees notes, events, other customers, staff surnames, voided invoices or failed payments. That rule is enforced in the shaping (`PortalJob`, `PortalVisit`, `PortalCustomer`), not in the screens.

## 2. Identity and authorization

- A sign-in resolves an email to a person principal (`kind: "person"`, `type: "customer" | "admin"`). Every portal handler is marked `customerSelf` and `callApi` admits it only for a customer principal with a `customerId`; every query scopes by that `customerId` in the WHERE, never by a record id alone. The tests that prove one customer cannot read another's job or invoice stay.
- **An admin whose email is also a customer sees the customer portal at `/account` and the admin at `/admin`.** Today `requireCustomer` turns an admin away ("This page is for customers"). Change: `requireCustomer` looks the signed-in email up in `customer`; a match yields a customer principal for that request; no match keeps the admin message. Hannah's own address is the first case.

## 3. Cancel and reschedule are records, with one rule in one place

**The 24-hour rule (Hannah): inside 24 hours of the visit's day a customer cannot cancel or reschedule online; the screen offers Text Ryan and Call Ryan.** Staff are not held to it.

- One function decides it: `withinCutoff(visit, now)` in `src/lib/portal/change-day.ts`, replacing the two-day `beforeCutoff`, with `cutoffAt(visit)` beside it (the same formula, as an instant) so a screen can say "until Sunday, April 26, 11:59 pm". The cut-off instant is midnight Mountain time at the start of the visit's day, minus 24 hours. `visits.pick` and the cancel handler refuse past it with the words the screen shows; the screen asks the same function, so the button and the refusal never disagree.
- **Reschedule** stays `visits.pick`: to one of the offered days, never a typed day. `visits.areaDays` takes `count` (default 3; the portal asks 5) and leaves the current day out. The customer is texted the new day. The event keeps today's names, `visit.moved` or `visit.scheduled`, with who `customer`.
- **Cancel** is a new handler `visits.cancelSelf` (`customerSelf`, in `src/api/v1/portal/`), the customer's door onto the existing writers:
  - Only the caller's visit; only Unscheduled or Scheduled; never Done, Canceled, Skipped; never inside the cut-off.
  - A Season Pass visit: the pass skip (`passes.skipVisit` rules: the line is cancelled, nothing is charged, the pass stays active).
  - A one-off visit: the visit's status becomes cancelled (there is no `cancelled_at` column on a visit; the cancel's date is the `visit.cancelled` event's time) and its line is cancelled. When it was the job's only live visit the job is cancelled too, through `jobs.cancel`'s rules; a job that holds a payment keeps the job open with the visit cancelled.
  - An unpaid invoice on the job stays as it is; Done work is never cancelled by a customer; a cancel never moves money, and the confirm step says what stays paid. The Home row carries "has a payment" when the job holds one.
  - It writes one event, `visit.cancelled` with who `customer` and the reason the customer gave, and queues a confirmation to the customer and an alert for Home ("Hannah cancelled Fri Nov 20, Repair"). Ryan sees it on Home at once and the day frees on the Schedule because the schedule reads facts.
  - Idempotent: a second call on a cancelled visit answers the same result.
- Both actions carry the customer's words back: the screen shows the handler's message on a refusal, never a second copy of the rule.

## 4. The time model: a day is a promise, a window is a message

- A visit has a day (`scheduled_on`), a start time (`start_time`) and a length. **A customer picks a day, never a time (Hannah, Nov 2026); the window is told the day before.**
- `orderDay` stacks a Season Pass's visits from 8:00 so the day has an order and a map. That start time is the office's estimate, not a promise, and the portal must not read it as one.
- The portal shows the window only when the day-before message for that visit exists in `message_log` (kind `day-before`, the row `dayBeforeMessages` writes). There is no by-hand case: the office's stamp cannot be told from the scheduler's, and Hannah's rule is the day-before text. Until then the visit reads "Tuesday, May 5. We'll text your window the day before." No new column: the message row is the fact that the window was told. `PortalVisit` gains `windowTold: boolean` and `window: string | null`; `arrivalWindow` is only called when `windowTold`.
- The data matches the words everywhere a customer reads: `loadVisitFacts` nulls `startTime` until the day-before row exists, so the date-set and date-moved texts and the checkout's day cards state the day only; the day-before text is the first message that carries a window. The person's first name is shown with the window, not before it.
- The admin's **Routed** is the office's own fact (the day's stops were ordered) and may exist before the customer is told; Ryan's Time column keeps the estimate. Two surfaces, two facts, on purpose.

## 5. One timeline, no new tables

- The customer's view is a derived model, `portalTimeline(customer)` in `src/lib/portal/timeline.ts`: every visit of every job, in time order, split Upcoming and Past, each row with its job's name, its person's first name, its day or window, its pill and its money word; invoices and payments appear on the row of the visit they belong to, a job-level payment on the job's last visit. The Season Pass is a job like any other in the list; its card and season line live on Home and `/account/pass`.
- The words a customer reads come only from `src/lib/portal/words.ts`; a person is a first name only when the name has two words, else no person.
- Screens are pure over this model (`account/_screens/`), with stories at 375 and 1280 for every state in section 7 of the design.

## 6. What the admin sees

A customer's cancel or reschedule is a Home row until dismissed, a line in the visit's and the customer's Notes and history ("Hannah cancelled, from the account"), and the freed day on the Schedule. Ryan can undo a cancel the way he undoes his own (the visit's cancel is a dated fact; `visits.edit` may clear it while nothing else has moved).

## 7. Build order and gates

1. Hotfix PR (in flight): the pass page 500, "Second", the phone, the header menu, the dates, the admin Last visit.
2. Handlers and rules, tests first: `withinCutoff` at 24 hours; `visits.cancelSelf`; `requireCustomer` resolves an admin's email to a customer; `PortalVisit.windowTold`.
3. The timeline model and words, pure, tested.
4. The screens from the v2 design, stories at both widths.
5. The messages: cancel confirmation, the alert.
6. A read-only review, then a live click-through as the test pass holder and as Hannah's own address, before Hannah is told to look.
