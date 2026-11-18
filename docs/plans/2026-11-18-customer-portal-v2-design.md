# Design: the customer portal, v2

Nov 18 2026. Design only; nothing is built until Hannah has read it. Replaces the screens of `2026-11-18-customer-portal-design.md` (PR #63); keeps its sign-in, Details, receipts and card update. **Built on exactly the decisions of `2026-11-18-customer-portal-architecture.md`** (the architect's, binding): the only new handler is `visits.cancelSelf`, no migration, no new column. The architect answered every ask this design raised; they are folded in below. Hannah's words after the live walk: "All the crud functionality, everything is missing… cancel, reschedule. If it's within 24 hours they shouldn't, and maybe they could text Ryan… Visits and jobs is confusing… Arrive between 8 and 10 am: I thought we had done away with that. Make sure all the underlying data also matches." **Settled by Hannah, not open:** inside 24 hours of the visit's day a customer cannot cancel or reschedule; the screen offers Text Ryan and Call Ryan with one line on why. Research came first and shaped everything below; the live findings are folded in at section 6.

## 1. Research first, and what it changed

| Tool (source) | What it does | Shaped the design | Rejected, and why |
|---|---|---|---|
| Square Appointments ([help 5493](https://squareup.com/help/us/en/article/5493-set-a-custom-cancellation-policy-with-square-appointments), [feature page](https://squareup.com/au/en/appointments/features/cancellation-policy)) | Owner picks a cut-off from one hour to two weeks and lets clients reschedule or cancel before it; the policy shows in the booking flow and at the foot of the confirmation email; a client trying to cancel outside the window is reminded of it; the fee is optional and the owner decides within 14 days | One cut-off, said in words with its exact moment; the rule shown on the visit page itself, not only after a refusal | A fee, a card hold, owner-decides-later: we charge after the visit, so a cancel costs nothing and there is nothing to enforce |
| Calendly ([cancellation policy help](https://calendly.com/help/how-to-add-a-cancellation-policy), [community thread on notice](https://community.calendly.com/how-do-i-40/the-reschedule-option-do-not-respect-the-minimum-notice-3265)) | Cancel and reschedule links ride on confirmations and reminders; its help says the policy is shown, not enforced; a staff reply in the thread says an invitee can still reschedule inside the notice window through the invite's link | Links on every text and email, and the **server enforces the cut-off** (`visits.pick` and the new cancel refuse a customer after it) so no link can bypass it | Show-only policies |
| OpenTable ([Tasting Table](https://www.tastingtable.com/1179757/the-opentable-reservation-penalty-youll-want-to-avoid); its terms page timed out, so the 30-minute no-show figure is from a search summary and unverified) | Cancel on the site or by phone; each restaurant sets its own fee | Cancel is one tap, with a phone fallback | Per-restaurant fee tiers |
| Airbnb Flexible ([help 475](https://www.airbnb.com/help/article/475)) | Full refund until 24 hours before check-in; "full refund" means the listing price, guest fees may differ | 24 hours is a common, readable line; the consequence line names exactly what is returned | Pro-rated tiers and a fee table |
| Uber rides ([UK blog](https://www.uber.com/en-GB/blog/changes-to-cancellation-fees/), [help](https://help.uber.com/h/6bec690f-ee35-40ba-96ee-c38a8ae796e0)) | A short grace period after a driver accepts (about two minutes for the basic product), then a fee; a wrongly charged fee is disputed from the trip's Help | A clear start of the "late" state; a way to reach a person from the trip itself (Text Ryan) | A grace timer, fees, a dispute path: a day-long window, not a ride |
| Uber Eats ([Business Insider](https://www.businessinsider.in/tech/how-to/how-to-cancel-an-uber-eats-order-and-determine-if-youll-get-a-refund/articleshow/77556262.cms), secondary) | Cancel in the app; refunds are full only before the restaurant accepts | The consequence depends on the stage and is stated | Partial refunds: ours is "nothing is charged" at every stage before Done |
| DoorDash ([help](https://help.doordash.com/consumers/s/article/How-do-I-cancel-my-order?language=en_US)) | Cancel from the order's Help; the refund is full, partial or none by order status (the page does not say whether it is previewed) | The confirm step states the consequence before the tap, and "Keep my visit" is the way back | Discretionary refunds |
| Jobber ([Client Hub](https://www.getjobber.com/client-hub/), [help](https://help.getjobber.com/en/articles/what-do-your-clients-see-in-client-hub/), [academy](https://www.getjobber.com/academy/how-to-prevent-customer-cancellations/)) | Client Hub shows appointments, quotes, invoices and cards; no self-serve reschedule found in its help; the academy page has the business reschedule when a customer reaches out | Appointments, money and cards on one account; the customer's contact route when it is too late | Call-only changes: Hannah wants self-serve |
| Housecall Pro ([guide](https://help.housecallpro.com/en/articles/8474580-customer-guide-to-the-portal)) | Magic-link sign-in; appointments, invoices, a card wallet; change or cancel is a message | Magic link (already ours) | Message-only changes |
| ServiceTitan ([end-user guide](https://help.servicetitan.com/docs/the-new-customer-portal-end-user-experience.md)) | Jobs in tabs with Canceled as one; an unscheduled visit says "Call to Schedule"; internal notes never shown | Canceled stays visible in Past; "Day coming soon" for no day; no internal notes | Tabs by job state (it is the Visits-and-Jobs confusion) |

## 2. Every job a customer has

| # | I want to | Screen and exact action | Model today | Handler to add or change |
|---|---|---|---|---|
| 1 | See what is coming | Home "Next visit"; Visits "Coming up" | yes (`jobs.list`) | none; the timeline is built from it in `account-model.ts` |
| 2 | Know the window | Visit page: "between 8 and 10 am, with Ryan", only when `windowTold` | **no**: the portal reads the stamped `start_time` | `PortalVisit.windowTold` from the `day-before` `message_log` row (section 5) |
| 3 | Change the day | Visit page and Home card "Reschedule", pick an offered day, "Move it to Thursday, Apr 30" | partly (`visits.pick`, 2-day count) | `visits.pick` and `visits.areaDays` call `withinCutoff` (24 hours); `areaDays` takes `count` (default 3, the portal asks 5) and leaves the current day out |
| 4 | Cancel | "Cancel visit", confirm, "Cancel visit" | **no** for one-offs; pass visits only via `passes.skipVisit` | add `visits.cancelSelf` (the only new handler) |
| 5 | Pay | Home and visit page banner "Pay now" | yes (`PortalInvoice.payUrl`, `/pay/<id>`) | none |
| 6 | See what I paid | Visit page "Payments": "Paid Nov 3, card $145" | yes (`PortalPayment`) | none |
| 7 | Get a receipt | "Receipt" on a paid visit, opens our printable page for every method (card shows a "card receipt" link on it) | yes (`payments.receipt`), but a card goes to Stripe so the page was never reached | none; link change only |
| 8 | Update the card | Details "Update card" | yes (`customers.startCardUpdate`) | none |
| 9 | Update my details | Details: name, phone, yard facts per property; email by text | yes (`customers.updateSelf`, `properties.updateSelf`) | none; format the phone for display |
| 10 | Renew the pass | Season Pass "Reserve next season" (from Nov 1) to the renewal checkout | yes (renewal flow, signed token) | none |
| 11 | Add the July inspection | Season Pass "Add the July inspection, $X" | yes (`passes.addInspection`) | none |
| 12 | Skip a pass visit | It is Cancel visit on that visit; `visits.cancelSelf` applies the pass skip's rules | yes, with **no cut-off** (`passes.skipVisit`) | `passes.skipVisit` also calls `withinCutoff` when the caller is a customer |
| 13 | Reach Ryan | Visit page, Details: Text Ryan, Call Ryan | number only | none; `sms:` and `tel:` links, thread by phone number |
| 14 | Cancel the whole pass | Season Pass page, existing dialog | yes (`passes.cancel`) | none |
| 15 | Change turn-on or blowout timing | Season Pass page | yes (`passes.updatePreference`) | none |
| 16 | Add a visit to my calendar | Visit page "Add to calendar" | yes for a pass (`AddToCalendar`) | reuse the generator for any visit |
| 17 | Sign in and out | Account menu | yes | menu moves to the far right |
| 18 | See my account as staff | Account for the customer record that has my email | **no** (`NotACustomer`) | `requireCustomer` looks the signed-in email up in `customer` (architecture section 2) |

## 3. One timeline, not Visits and Jobs

**The words.** A customer has **visits** (a time Ryan comes), a **Season Pass** (a card and a season line, never a list of its own) and **invoices**. "Job", "line", "stage" and "request" never appear. A pass visit is an ordinary visit with a small "Season Pass 2027" label. The Jobs tab, job page and second pass card go away; money lives on the visit it paid for. **Navigation:** Home · Visits · Season Pass (only for someone who has held one) · Details; at the far right of the screen, an account menu with the first name (Details, Open the admin for staff, Sign out), no "Hi,".

```
HOME (375)                       VISITS (375)
+------------------------------+ +------------------------------+
| [logo]            Andrea  v  | | [logo]            Andrea  v  |
| Home Visits Pass Details     | | Home Visits Pass Details     |
|------------------------------| |------------------------------|
| Invoice sent: $115, due Dec 1| | Visits                       |
|                    [Pay now] | | COMING UP                    |
|------------------------------| | Tue, Apr 28, 2027            |
| NEXT VISIT                   | | Spring turn-on  [Season Pass]|
| Tuesday, April 28            | | $145, charged after   Booked |
| We'll text your window the   | |------------------------------|
| day before.                  | | Fall blowout   [Season Pass] |
| Spring turn-on . 12 Elm St   | | $95        Day coming soon   |
| Someone must be home         | |------------------------------|
| [Reschedule]  Cancel visit   | | PAST                         |
|------------------------------| | Mon, Nov 3, 2026             |
| [PassCard, holographic]      | | Repair . $145 . Paid  Receipt|
| Season line . See your pass  | | Fri, Oct 10, 2026            |
|------------------------------| | Fall blowout . $95 . Paid    |
| RECENT  Repair, Nov 3 . Paid | |                       Receipt|
+------------------------------+ +------------------------------+
```

The list is the derived `portalTimeline(customer)` (architecture section 5): every visit of every job, Upcoming and Past, no new table. A row: day (with the year when not this year), service, small Season Pass label (the job's name), the street only when the customer has two properties, money word and pill at the right; one button. A person's first name shows only when the name has two words (architecture) **and** `windowTold` is true (the day-before text is when Ryan names who is coming). **Money on a row** (words from `src/lib/money/words.ts` through `portal/words.ts`): upcoming and priced, "$145, charged after the visit" (card on file) or "$145, paid after the visit"; Done, "Paid", "$145 unpaid", "Invoice sent, due Dec 1" or "Past due since Dec 1"; a **Receipt** link on every paid visit. Invoices and payments sit on their visit's row; a job-level payment (a paid invoice) sits on the job's last visit. On a laptop Home stacks the next visit and invoice left and the pass card right, aligned to the top, so no card is stretched to the other's height.

## 4. The visit page, Reschedule and Cancel

```
VISIT, before the cut-off          RESCHEDULE sheet
+------------------------------+  +------------------------------+
| < Visits                     |  | Pick a new day               |
| Spring turn-on [Season Pass] |  | Spring turn-on, 12 Elm St    |
| Tuesday, April 28            |  | ( ) Wed, Apr 29     with Ryan|
| We'll text your window the   |  | (o) Thu, Apr 30     with Ryan|
| day before.                  |  | ( ) Tue, May 5      with Ryan|
| 12 Elm St, Erie              |  | ( ) Thu, May 7      with Ryan|
| Someone must be home         |  | ( ) Tue, May 12     with Ryan|
| What's included              |  | None of these? Text Ryan     |
| 14 zones, start up, check    |  | [Move it to Thursday, Apr 30]|
| each head                    |  | Keep Tuesday, April 28       |
| $145, charged to the Visa    |  +------------------------------+
| ending 4242 after the visit  |  CANCEL confirm
|------------------------------|  +------------------------------+
| [Reschedule]                 |  | Cancel your spring turn-on?  |
| Cancel visit                 |  | Tuesday, April 28            |
| Add to calendar              |  | Nothing is charged. Your     |
| You can change this until    |  | Season Pass stays and this   |
| Sunday, April 26, 11:59 pm.  |  | visit comes off it.          |
+------------------------------+  | Tell Ryan why (optional) ... |
INSIDE 24 HOURS                   | [Cancel visit]               |
+------------------------------+  | Keep my visit                |
| Tuesday, April 28            |  +------------------------------+
| [Text Ryan]  [Call Ryan]     |
| Ryan plans his route the day |
| before, so changes this close|
| go through him.              |
+------------------------------+
```

**Reschedule** offers up to **five** open days in time order inside the visit's window, the current day left out, each "Thu, Apr 30 with Ryan" (`visits.areaDays` gains `count`, default 3; the portal asks for 5). Three is a checkout nudge to commit; a move is made for a reason, and three often miss it; five fit a phone without scrolling, with "None of these? Text Ryan" as the exit. The first is preselected; one button names the day. Done: "Moved to Thursday, April 30. We texted you the new day." No fee, no limit.

**Cancel: the consequence the confirm step states** (the one red button is the confirm):

| Visit | Confirm says | Records (all through `visits.cancelSelf`) |
|---|---|---|
| Season Pass visit | "Nothing is charged. Your Season Pass stays and this visit comes off it." | the pass skip's rules: visit `skipped`, its line canceled |
| One-off, the job's only live visit | "Nothing is charged." | visit `cancelled`, line canceled, then the job canceled through `jobs.cancel`'s rules |
| One-off, job has other visits | "Nothing is charged for this visit. Your other visits stay." | visit `cancelled`, its line canceled |
| No day yet | same wording; no day is freed | same |
| The job holds a payment | "Nothing more is charged. The $145 you already paid stays as it is, and Ryan will contact you about it." (a cancel never moves money) | visit canceled, the job stays open (`jobs.cancel` refuses a job with a payment); the Home row carries "has a payment" so Ryan sorts the money |
| An unpaid invoice on the job | as the rows above; the invoice stays as it is | none on the invoice |
| Installation or quoted work | Cancel as above; Reschedule opens Text Ryan, since those days are set with you | as above |

Always one `visit.cancelled` event with who `customer` and the optional reason (a visit has no `cancelled_at`: a cancel is its `status`, and its date is that event's time, which the screens read), a confirmation to the customer and a Home alert; a second call on a canceled visit answers the same. Done work is never canceled by a customer.

After it: "Canceled. We texted you a note. Changed your mind? Book Online." The visit stays in Past as **Canceled** (one customer word for skipped and canceled). An optional reason goes to Ryan only.

**The 24-hour rule (settled).** The cut-off is **24 hours before the start of the visit's day, Mountain time** (midnight Mountain at the start of the day, minus 24 hours), decided in **one function, `withinCutoff(visit, now)`** in `src/lib/portal/change-day.ts`, used by `visits.pick`, `visits.areaDays`, `visits.cancelSelf` and by the screens, so a button and its refusal never disagree. A Tuesday visit is free to change until **Sunday 11:59 pm**. A visit with no day is always changeable. Routing does not move it. After it, the buttons are replaced by **Text Ryan** (`sms:+19706927270?body=` "Hi Ryan, it's Andrea Smith at 12 Elm St about my spring turn-on on Tuesday, April 28.", no ids; the text lands in the two-way thread by phone number) and **Call Ryan** (`tel:`), with the line "Ryan plans his route the day before, so changes this close go through him." The handlers refuse a customer after it with the words the screen shows; staff are not held to it. `cutoffAt(visit)` is exported beside it with the same formula, so the page can say "You can change this until Sunday, April 26, 11:59 pm". The admin visit panel reads "Customer can change online until Sun, Apr 26, 11:59 pm" or "Closed, texts only".

## 5. The right data

**A day is a promise, a window is a message** (architecture section 4). `orderDay` stacks a Season Pass's visits from 8:00 so a day has an order and a map (`order-day.ts`); that start time is the office's estimate, and the portal wrongly read it as a promise (`arrivalWindow` turns any start time into a window; the checkout also copies a slot's start into `start_time`, `chosen-days.ts` lines 57 and 79; the text said "8 to 10 am" too). **What decides the window is the `day-before` `message_log` row for the visit**, the row `dayBeforeMessages` writes (`src/lib/scheduling/server/daily.ts`, key `<visit id>-<day>`). The daily cron runs at 11:00 UTC, so the row appears about 4 to 5 am Mountain on the day before, after the 24-hour cut-off: a customer never sees a window while they can still change the day.

| Moment | Reads | The customer sees |
|---|---|---|
| Picked, no `day-before` row | `visit.scheduled_on` | "Tuesday, April 28. We'll text your window the day before." |
| `day-before` row exists | `visit.start_time` and `visit.duration_minutes` through the same `timeWords` the text uses | "Tuesday, April 28, between 8 and 10 am, with Ryan." |
| Day moved or visit canceled | the old row is for the old day | the sentence of the first row again until a new row exists |

`PortalVisit` gains `windowTold: boolean` and `window: string | null`; `arrivalWindow` runs only when `windowTold`. No column, no migration. **The words and the data match everywhere:** `loadVisitFacts` nulls `startTime` until the day-before row exists (`dayBeforeMessages` asks for it with a `told` option, since its own row is not written yet), so the `date-set` and `date-moved` texts and the checkout day cards state the day only ("We'll text your window the day before"); the day-before text is the first message that carries a window. A time the office sets by hand reaches the customer the same way, in the day-before text. **Two facts on purpose:** the admin's Routed is the office's own fact (the day's stops were ordered) and may exist before the customer is told; Ryan's Time column keeps the estimate, and the customer's window is only what was told.

**Every field on every screen.** Each reads a column or a derived fact with a row in `docs/DATA_MODEL.md` (named in the last column). A row marked **add** is only in prose there today, and its own row is part of this build.

| Screen | Shows | Column or derived fact | DATA_MODEL row |
|---|---|---|---|
| Header | first name | `customer.first_name` | customer.first_name |
| Next visit, row, page | day | `visit.scheduled_on`; Done: `visit.completed_on` | visit.scheduled_on, visit.completed_on |
| | window | `windowTold` (the `message_log` row), then `visit.start_time`, `visit.duration_minutes` | visit.start_time, visit.duration_minutes; `message_log` day-before **add** |
| Past, canceled | canceled day | the `visit.cancelled` event's `at` (no `cancelled_at` on a visit) | event.at |
| | who | `visit.person_id` to `person.name`, first name when two words and `windowTold` | visit.person_id, person.name |
| | service | `visitName(visit.kind)` (the visit's line name) | line_item.name |
| | Season Pass label | `job.season` not null | job.season |
| | street, town | `property.address`, `property.town` | property.address, property.town |
| | someone must be home | `property.must_be_home` | property.must_be_home |
| | what's included | `line_item.description` of the visit's lines | line_item.description |
| | price | `visitPrice`: the visit's non-canceled lines with tax | payment.amount (defines `visitPrice`), line_item.unit_price |
| | card ending 4242 | `customer.card_brand`, `card_last4` | customer.card (brand, last4, expires) |
| | pill | `visit.status`, `visit.not_done_reason` | visit.status, visit.not_done_reason |
| | Reschedule, Cancel, Text, Call | `withinCutoff(visit, now)` over `visit.status`, `visit.scheduled_on`, the job's open state | visit.status, visit.scheduled_on, job.sold_on |
| Past visit | money word, "Paid, card" | `jobMoney` over `charge.amount`, `paid_on`, `method` | payment.amount, payment.paid_on; `charge.method` **add** |
| | Receipt | our `/account/receipts/<id>`; `charge.receipt_url` as its card link | payments.receipt; `charge.receipt_url` **add** |
| Invoice banner | total, due day, Pay now | `invoice.total`, `due_on`, signed `payPath` | invoice.number (names `sent_on`, `due_on`); `invoice.total` **add** |
| Pass card, season line | season, number, each kind's day | `job.season`, `job.pass_number`; `completed_on` when Done else `scheduled_on` | job.season, job.pass_number |
| Pass page | inspection, preference, status | `passInspection`, `passPreferences`, `passStatus` | pass.inspection, pass.turn_on / blowout_preference, pass.status |
| Details | name, phone, email | `customer.first_name`, `last_name`, `phone` ("(303) 819-6133" on screen), `email` | customer.* |
| | yard facts, gate code | `property.zones` to `property.contact_phone` | property.* |

## 6. The twelve live findings, folded in

| # | Finding | Decision | Field or place that decides |
|---|---|---|---|
| 1 | `/account/pass` returns a blank 500 (a visit today) | In the hotfix PR (architecture step 1). Likely cause: a customer call to `visits.areaDays` on a visit inside the old cut-off throws uncaught. The page asks for days only when `withinCutoff` is false and catches a refusal as the Text Ryan state; a test loads it with a visit today | `withinCutoff` |
| 2 | The day-set text links to `/account/pass` | The texts link to `/account`; the visit page is the target once it exists (`/account/visits/<id>`, signed) | `src/sms/texts.ts` |
| 3 | An admin who is also a customer is turned away | `requireCustomer` looks the signed-in email up in `customer`; the menu keeps "Open the admin" for staff | `customer.email` |
| 4 | "Arrive between 8 and 10" with no time given | Section 5, and the date-set and date-moved texts and checkout cards say the day only | `message_log` day-before row |
| 5 | The person shows as "Second" | The person shows only when `windowTold`; the hotfix PR carries the two-word name rule, and Hannah renames the live row "Second truck" in Settings › People | `person.name` |
| 6 | "Hi, Hannah" is dead, not at the far right | Account menu at the far right of the viewport: first name, Details, Open the admin (staff), Sign out | `customer.first_name` |
| 7 | Visits and Jobs confuse; the pass card repeats | Section 3: one timeline; the pass card on Home and Season Pass only | none |
| 8 | Pass card says done Nov 17, list says April 27, no year | A Done visit shows `completed_on` everywhere; a coming one `scheduled_on`; the year when not this year (hotfix PR) | `visit.completed_on` |
| 9 | The mobile shows as +13038196133 | Formatted "(303) 819-6133" on screen, stored unchanged (hotfix PR) | `customer.phone` |
| 10 | Next visit card half empty on a laptop | Top-aligned columns, no stretch | layout |
| 11 | The receipt print page was never reached | Every Receipt link opens our page; a card payment adds "View the card receipt" on it | `payments.receipt` |
| 12 | Admin "Last visit Nov 20" with nothing ahead | A Done visit's day becomes `completed_on` everywhere, so Last visit, Next and Past agree (hotfix PR, admin Customers) | `visit.completed_on` |

**Keep, move, go.** Stay: the holographic `PassCard`, season line, Save as image, invoice banner, card update, Details, sign-in, email changed by text. Move: Receipts onto the paid visit. Go: Jobs tab, `JobRow`, job page, "Hi, Andrea", "Change my day". `/account/jobs*` redirects to the visit.

## 7. Edge states

| State | Customer sees |
|---|---|
| No visits | Home: "Nothing booked right now." [Book Online]; Visits: "No visits yet." |
| Pass canceled | Pass card faded, "Canceled". "Your 2027 Season Pass is canceled. Nothing more will be charged." [Book Online]; its visits read Canceled |
| Visit with no day | "Pick a day" (Reschedule's list) or "Day coming soon. We'll text you when Ryan has one"; Cancel stays |
| Invoice past due | Banner "Past due since Dec 1, $115" with Pay now; the visit row says the same |
| Two properties | A "123 Main St / 40 Oak Ave / All" filter on Visits; the street under each row; Details shows both |
| Day passed, not closed | "Booked" until Ryan closes it; no buttons |
| No open days | "No open days left in this window. Text Ryan." |
| No phone or email | No day-before row can exist, so the window never shows; the page says "Call Ryan for your window" |
| A save fails | The handler's message, then "Try again, or text Ryan." |

## 8. Admin side: what Ryan sees

| Moment | Ryan sees | Undo |
|---|---|---|
| Customer cancels | A Home row until dismissed (alert kind `customer-changed`): "Andrea Smith canceled Spring turn-on, Tue, Apr 28, Erie. The day is free." (adds "has a payment" when so) [Open visit]; history in the visit's and customer's Notes and history, "Spring turn-on canceled by Andrea, from the account"; the day frees on the Schedule because it reads facts | The way he undoes his own cancel (architecture section 6: `visits.edit` clears it while nothing else has moved); the customer is texted by the existing day text |
| Customer reschedules | A Home row "Andrea Smith moved Spring turn-on from Tue, Apr 28 to Thu, Apr 30, Erie, Ryan."; history "moved by Andrea" | `visits.move` |
| Customer texts Ryan | The Messages thread, as today | n/a |
| The customer gets | Moved: the `date-moved` text. Canceled: a confirmation text and email ("Your spring turn-on on Tue, Apr 28 is canceled. Nothing was charged."), transactional, not office-editable because it carries money wording | n/a |
| The visit panel | "Customer can change online until Sun, Apr 26, 11:59 pm" or "Closed, texts only" (from `withinCutoff`) | n/a |

## 9. What changes in code

| Part | Change |
|---|---|
| Handlers, add | `visits.cancelSelf` in `src/api/v1/portal/` (`customerSelf`; rules in section 4; idempotent). **The only new handler** |
| Handlers, change | `visits.pick`, `visits.areaDays`, `passes.skipVisit` (customer caller): `withinCutoff` and `cutoffAt` replace the two-day `beforeCutoff` and `CHANGE_CUTOFF_DAYS`; `areaDays` takes `count`; `requireCustomer` resolves an admin's email to a customer |
| Side effects | event `visit.cancelled` who customer (a reschedule keeps today's `visit.moved` and `visit.scheduled`); `admin_alert` kind `customer-changed`; owner text through the existing `queueStaffMessage`; customer message kind for the cancel confirmation (`queue.ts`, `texts.ts`, `emails/`, `consent.ts`) |
| Schemas | `PortalVisit.change` becomes `reschedule` and `cancel` (`yes`, `text`, `no`), plus `windowTold` and `window`; `startTime` and `durationMinutes` leave the portal shape |
| Messages and checkout | `loadVisitFacts` nulls `startTime` until the day-before row exists (`told` option for `dayBeforeMessages`); the checkout day cards drop "between 8 and 10 am" |
| Model | `portalTimeline(customer)` in `src/lib/portal/timeline.ts` (pure, tested); words only from `src/lib/portal/words.ts` |
| Routes | `/account/visits/[visitId]`; `/account/visits` the timeline; `/account/jobs*` redirect; Home recomposed; `AccountMenu` |
| Blocks (pure props, stories at 375 and 1280) | `VisitRow` (gains money and label), `NextVisitCard` (two actions), new `VisitPage`, `RescheduleSheet`, `CancelVisitSheet`, `TextRyan`, `AccountMenu`; retire `JobRow`, `JobScreen`, `JobsScreen` |
| Stories | Home (before cut-off, inside 24 hours, no visit, invoice, pass canceled), Visits (two properties), Visit (booked, window told, pass, one-off, paid), both sheets, Text Ryan |
| Admin | Home row, history words ("by the customer"), panel line |
| DATA_MODEL rows | `message_log` day-before (as the window's fact), `charge.method`, `charge.receipt_url`, `invoice.total`, `admin_alert` kind, the customer's account section |

**Build order** (architecture section 7): 1 the hotfix PR (findings 1, 5, 8, 9, 12 and the header menu). 2 handlers and rules, tests first: `withinCutoff`, `visits.cancelSelf`, `requireCustomer`, `windowTold`. 3 the timeline model and words. 4 the screens, stories at both widths. 5 the cancel confirmation and the Home row. 6 a read-only review, then a live click-through as the test pass holder and as Hannah's own address.

## 10. Questions for Hannah

1. **When a customer cancels a Season Pass visit, is it gone for the season?** Recommended: yes; nothing is charged and Book Online adds one back at the standard price.
2. **Five days on a reschedule, or three?** Recommended: five.
3. **If a visit already has a payment on it, may the customer still cancel it online?** Recommended: yes; the visit is canceled, no money moves, the confirm step says what stays paid, and Ryan gets a Home row marked "has a payment" to sort it out.
4. **A text to Ryan on every customer change?** Recommended: yes for cancels and moves while there is one truck; the Home row always.
5. **Ask for a reason when a customer cancels?** Recommended: one optional line, seen by Ryan only.
