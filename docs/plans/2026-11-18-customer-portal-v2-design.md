# Design: the customer portal, v2

Nov 18 2026. Design only; nothing is built until Hannah has read it. Replaces the screens of `2026-11-18-customer-portal-design.md` (PR #63); keeps its sign-in, Details, receipts and card update. Hannah's words after the live walk: "All the crud functionality, everything is missing… cancel, reschedule. If it's within 24 hours they shouldn't, and maybe they could text Ryan… Visits and jobs is confusing… Arrive between 8 and 10 am: I thought we had done away with that. Make sure all the underlying data also matches." **Settled by Hannah, not open:** inside 24 hours of the visit's day a customer cannot cancel or reschedule; the screen offers Text Ryan and Call Ryan with one line on why. Research came first and shaped everything below; the live findings are folded in at section 6.

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
| 2 | Know the window | Visit page: "between 8 and 10 am, with Ryan", only once routed | **no**: `orderDay` stamps times at pick | `routeDay` (section 4) |
| 3 | Change the day | Visit page and Home card "Reschedule", pick one of five days, "Move it to Thursday, Apr 30" | partly (`visits.pick`, 3 days, 2-day count) | change `visits.pick`, `visits.areaDays` (instant cut-off, `count`) |
| 4 | Cancel | "Cancel visit", confirm, "Cancel visit" | **no** for one-offs; pass visits only via `passes.skipVisit` | add `visits.cancelSelf` |
| 5 | Pay | Home and visit page banner "Pay now" | yes (`PortalInvoice.payUrl`, `/pay/<id>`) | none |
| 6 | See what I paid | Visit page "Payments": "Paid Nov 3, card $145" | yes (`PortalPayment`) | none |
| 7 | Get a receipt | "Receipt" on a paid visit, opens our printable page for every method (card shows a "card receipt" link on it) | yes (`payments.receipt`), but a card goes to Stripe so the page was never reached | none; link change only |
| 8 | Update the card | Details "Update card" | yes (`customers.startCardUpdate`) | none |
| 9 | Update my details | Details: name, phone, yard facts per property; email by text | yes (`customers.updateSelf`, `properties.updateSelf`) | none; format the phone for display |
| 10 | Renew the pass | Season Pass "Reserve next season" (from Nov 1) to the renewal checkout | yes (renewal flow, signed token) | none |
| 11 | Add the July inspection | Season Pass "Add the July inspection, $X" | yes (`passes.addInspection`) | none |
| 12 | Skip a pass visit | It is Cancel visit on that visit | yes, with **no cut-off** (`passes.skipVisit`) | route it through the shared cancel, cut-off included |
| 13 | Reach Ryan | Visit page, Details: Text Ryan, Call Ryan | number only | none; `sms:` and `tel:` links, thread by phone number |
| 14 | Cancel the whole pass | Season Pass page, existing dialog | yes (`passes.cancel`) | none |
| 15 | Change turn-on or blowout timing | Season Pass page | yes (`passes.updatePreference`) | none |
| 16 | Add a visit to my calendar | Visit page "Add to calendar" | yes for a pass (`AddToCalendar`) | reuse the generator for any visit |
| 17 | Sign in and out | Account menu | yes | menu moves to the far right |
| 18 | See my account as staff | Account for the customer record that has my email | **no** (`NotACustomer`) | section 6, item 3 |

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

A row: day (with the year when not this year), service, small Season Pass label, the street only when the customer has two properties, money word and pill at the right; one button. **Money on a row** (words from `src/lib/money/words.ts` through `portal/words.ts`): upcoming and priced, "$145, charged after the visit" (card on file) or "$145, paid after the visit"; Done, "Paid", "$145 unpaid", "Invoice sent, due Dec 1" or "Past due since Dec 1"; a **Receipt** link on every paid visit. On a laptop Home stacks the next visit and invoice left and the pass card right, aligned to the top, so no card is stretched to the other's height.

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

| Visit | Confirm says | Records |
|---|---|---|
| Season Pass visit | "Nothing is charged. Your Season Pass stays and this visit comes off it." | visit `skipped`, its line canceled, `visit.skipped` |
| One-off, the job's only visit | "Nothing is charged." | visit `cancelled`, line canceled, job canceled, `visit.cancelled`, `job.cancelled` |
| One-off, job has other visits | "Nothing is charged for this visit. Your other visits stay." | visit `cancelled`, its line canceled |
| No day yet | same wording; no day is freed | same |
| A payment on the job, or its line is on a sent invoice | Cancel is replaced by Text Ryan: "This one has a payment on it. Ryan will sort it out." | nothing; staff use `jobs.cancel` after a refund |
| Installation or quoted work | Cancel as above; Reschedule opens Text Ryan, since those days are set with you | as above |

After it: "Canceled. We texted you a note. Changed your mind? Book Online." The visit stays in Past as **Canceled** (one customer word for skipped and canceled). An optional reason goes to Ryan only.

**The 24-hour rule (settled).** The cut-off is **24 hours before the start of the visit's day, Mountain time**: 12:00 am on the day before, tested as an instant (`now < cutoff`), computed on calendar days in `America/Denver` so a daylight-saving week does not move it. A Tuesday visit is free to change until **Sunday 11:59 pm**. A visit with no day is always changeable. Routing does not move it. After it, the buttons are replaced by **Text Ryan** (`sms:+19706927270?body=` "Hi Ryan, it's Andrea Smith at 12 Elm St about my spring turn-on on Tuesday, April 28.", no ids; the text lands in the two-way thread by phone number) and **Call Ryan** (`tel:`), with the line "Ryan plans his route the day before, so changes this close go through him." The server refuses a customer after it, so no link bypasses it; staff are not held to it. The admin visit panel reads "Customer can change online until Sun, Apr 26, 11:59 pm" or "Closed, texts only".

## 5. The right data

**Why the window showed.** `orderDay` stamps `visit.start_time` from 8:00 on every Season Pass visit each time a day is ordered (`order-day.ts`); the checkout copies a slot's start into it (`chosen-days.ts` lines 57 and 79); `arrivalWindow` turns any start time into a window. The admin already defines **Routed = a start time is set** (`src/lib/admin/jobs.ts`), so every picked pass visit was "routed" the moment it was picked, and the text said "8 to 10 am" too. **The field that decides is `visit.start_time`; it must mean only "Ryan routed this day".**

| Change | Where |
|---|---|
| `orderDay` never writes `start_time`; it writes `stop_order` only | `src/lib/scheduling/server/order-day.ts` |
| New `routeDay(db, {personId, day})` = `orderDay` then today's stamping (8:00 stacked by length). Runs from the daily cron before `dayBeforeMessages` for tomorrow, and from a **Route this day** button on the Schedule day view | `order-day.ts`, `daily.ts`, day view |
| The checkout and `visits.pick` never set `start_time`; "between 8 and 10 am" comes off the checkout day cards and the booking design's | `chosen-days.ts`, checkout |
| Portal shaping: the window is null unless `start_time` is set; the person only when routed | `portal/load.ts`; `arrivalWindow` becomes `windowWords` |
| Backfill, its own migration and PR (pushed branches migrate production): null `start_time` on Season Pass visits dated two or more days ahead; leave nearer ones, the office may have set them | one migration, reviewed |
| `date-set` and `date-moved` texts lose the window by themselves; `day-before` keeps it | `src/sms/texts.ts`, none |

Copy: before routing "Tuesday, April 28. We'll text your window the day before."; after, "Tuesday, April 28, between 8 and 10 am, with Ryan."

**Every field on every screen.** Nothing is derived on the screen; each reads a column or a derived fact with a row in `docs/DATA_MODEL.md` (the row named in the last column). A row marked **add** is only in prose there today, and its own row is part of this build.

| Screen | Shows | Column or derived fact | DATA_MODEL row |
|---|---|---|---|
| Header | first name | `customer.first_name` | customer.first_name |
| Next visit, row, page | day | `visit.scheduled_on`; Done: `visit.completed_on` | visit.scheduled_on, visit.completed_on |
| | window | `visit.start_time` and `visit.duration_minutes` when `start_time` is set | visit.start_time, visit.duration_minutes |
| | who | `visit.person_id` to `person.name`, first name, only when routed | visit.person_id, person.name |
| | service | `visitName(visit.kind)` (the visit's line name) | line_item.name |
| | Season Pass label | `job.season` not null | job.season |
| | street, town | `property.address`, `property.town` | property.address, property.town |
| | someone must be home | `property.must_be_home` | property.must_be_home |
| | what's included | `line_item.description` of the visit's lines | line_item.description |
| | price | `visitPrice`: the visit's non-canceled lines with tax | payment.amount (it defines `visitPrice`), line_item.unit_price |
| | card ending 4242 | `customer.card_brand`, `card_last4` | customer.card (brand, last4, expires) |
| | pill | `visit.status`, `visit.not_done_reason` | visit.status, visit.not_done_reason |
| | Reschedule, Cancel, Text, Call | derived `reschedule`, `cancel` and `cutoffAt` from `visit.status`, `visit.scheduled_on`, the job's open state, payment rows (**add** row: "customer change state") | visit.status, job.sold_on, payment.amount |
| Past visit | money word, "Paid, card" | `jobMoney` over `charge.amount`, `paid_on`, `method` | payment.amount, payment.paid_on; `charge.method` **add** |
| | Receipt | our `/account/receipts/<id>` from the payment; `charge.receipt_url` as its card link | payments.receipt; `charge.receipt_url` **add** |
| Invoice banner | total, due day, Pay now | `invoice.total`, `due_on`, signed `payPath` | invoice.number (names `sent_on`, `due_on`); `invoice.total` **add** |
| Pass card, season line | season, number, each kind's day | `job.season`, `job.pass_number`; `completed_on` when Done else `scheduled_on` | job.season, job.pass_number |
| Pass page | inspection, preference, status | `passInspection`, `passPreferences`, `passStatus` | pass.inspection, pass.turn_on / blowout_preference, pass.status |
| Details | name, phone, email | `customer.first_name`, `last_name`, `phone` (E.164 shown as "(303) 819-6133"), `email` | customer.* |
| | yard facts, gate code | `property.zones` to `property.contact_phone` | property.* |

## 6. The twelve live findings, folded in

| # | Finding | Decision | Field or place that decides |
|---|---|---|---|
| 1 | `/account/pass` returns a blank 500 for the pass holder (a visit today) | Likely cause: a customer call to `visits.areaDays` on a visit inside the old cut-off throws and the page does not catch it. The page asks for days only when the visit's derived `reschedule` is "yes", and catches a refusal as the Text Ryan state. A test loads the page with a visit today | `PortalVisit.reschedule` |
| 2 | The day-set text links to `/account/pass` | The text links to the visit page, `/account/visits/<id>`, signed, and a pass-less customer can open it | `src/sms/texts.ts`, `emails/` |
| 3 | An admin who is also a customer sees "This page is for customers" | The account opens for the customer record that holds the signed-in email, with a thin line "Signed in as staff. Open the admin." The page mints a customer principal for that one matched customer; a staff principal never reaches a customer handler, and no other customer is reachable | `customer.email` match, `src/app/(account)/account/account-data.ts` |
| 4 | "Arrive between 8 and 10" with no time given | Section 5 | `visit.start_time` |
| 5 | The person shows as "Second" | The person shows only once routed, and the live row from migration 0010 is renamed in Settings › People (a one-minute data fix for Ryan). No name guessing in code | `person.name` |
| 6 | "Hi, Hannah" is dead and not at the far right | An account menu at the far right of the viewport (not the content column): first name, Details, Open the admin (staff), Sign out | `customer.first_name` |
| 7 | Visits and Jobs confuse; the pass card repeats | Section 3: one timeline, one pass card (Home and Season Pass only) | none |
| 8 | The pass card says done Nov 17, the list says April 27 with no year | A Done visit shows `completed_on` everywhere; a coming one `scheduled_on`; the year appears when it is not this year | `visit.completed_on` |
| 9 | The mobile shows as +13038196133 | Format E.164 as "(303) 819-6133" on screen; store unchanged | `customer.phone` |
| 10 | Next visit card half empty on a laptop | Top-aligned columns, no stretch (section 3) | layout |
| 11 | The receipt print page was never reached | Every Receipt link opens our page; a card payment adds "View the card receipt" on it | `payments.receipt` |
| 12 | Admin shows "Last visit Nov 20" for a customer with nothing ahead | A visit marked Done before its day: its day everywhere becomes `completed_on`, so Last visit, Next and the Past list agree; the admin Customers "Last visit" reads `completed_on`. An admin-side fix in the build | `visit.completed_on` |

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
| A save fails | "We couldn't save that. Try again, or text Ryan." with the links |

## 8. Admin side: what Ryan sees

| Moment | Ryan sees | Undo |
|---|---|---|
| Customer cancels | Home alert (`customer-changed`, keyed by visit and time): "Andrea Smith canceled Spring turn-on, Tue, Apr 28, Erie. The day is free." [Open visit]; a text to the owners; history "Spring turn-on canceled by Andrea"; the slot is free | **Put it back** (alert and visit panel): `visits.reinstate` restores the old day if open, else Needs a day; the customer is texted |
| Customer reschedules | Alert "Andrea Smith moved Spring turn-on from Tue, Apr 28 to Thu, Apr 30, Erie, Ryan."; a text to the owners; history "moved by Andrea" | Move it back with `visits.move` |
| Customer texts Ryan | The Messages thread, as today | n/a |
| The customer gets | Moved: the `date-moved` text. Canceled: a new transactional `visit-canceled` text and email ("Your spring turn-on on Tue, Apr 28 is canceled. Nothing was charged."), not office-editable because it carries money wording | n/a |

## 9. What changes in code

| Part | Change |
|---|---|
| Handlers, change | `visits.pick`, `visits.areaDays`: instant cut-off (`changeCutoff(day)` in `portal/change-day.ts`, replacing `CHANGE_CUTOFF_DAYS`), `count`, exclude the current day. `passes.skipVisit`: route through the shared cancel (it has no cut-off today) |
| Handlers, add | `visits.cancelSelf` (`customerSelf`; refuses done, canceled, past the cut-off, money touched); `visits.reinstate` (staff). One `cancelVisit` / `reinstateVisit` in `src/lib/jobs/` that `visits.cancel` also uses |
| Side effects | events `visit.moved` / `visit.cancelled` / `visit.skipped` who = customer; `admin_alert` kind `customer-changed`; `queueStaffMessage` to owners; message kind `visit-canceled` (`queue.ts`, `texts.ts`, `emails/`, `consent.ts`) |
| Schemas | `PortalVisit.change` becomes `reschedule` and `cancel` (`yes`, `text`, `no`) plus `cutoffAt`; `window` replaces `startTime` and `durationMinutes`; `personFirstName` only when routed |
| Data | `orderDay`, `routeDay`, cron, `chosen-days.ts`, backfill migration (own PR) |
| Routes | `/account/visits/[visitId]`; `/account/visits` becomes the timeline; `/account/jobs*` redirect; Home recomposed; `AccountMenu`; the staff-as-customer account |
| Blocks (pure props, stories at 375 and 1280) | `VisitRow` (reused, gains money and label), `NextVisitCard` (two actions), new `VisitPage`, `RescheduleSheet`, `CancelVisitSheet`, `TextRyan`, `AccountMenu`; retire `JobRow`, `JobScreen`, `JobsScreen` |
| Stories | Home (before cut-off, inside 24 hours, no visit, invoice, pass canceled), Visits (two properties), Visit (booked, routed, pass, one-off, paid), both sheets, Text Ryan |
| Admin | Home alert, panel line and Put it back, `eventWords` "by the customer", Route this day, Customers "Last visit" |
| DATA_MODEL rows | `visit.start_time` (routing only), `visit.status` (customer cancel), `customer change state`, `charge.method`, `charge.receipt_url`, `invoice.total`, `admin_alert` kind, the customer's account section |

**Build order.** 0: the `/account/pass` 500 and the text link (a bug PR). 1: data (routing, shaping, backfill, completed-day rule). 2: handlers, rules and messages, with tests. 3: blocks and screens, then redirects. 4: admin alert, history, Put it back, Route this day, Last visit. 5: DATA_MODEL, DESIGN.md, CLAUDE.md, then a live walk on a phone with a pass holder, a one-off and Hannah's own email.

## 10. Questions for Hannah

1. **When a customer cancels a Season Pass visit, is it gone for the season?** Recommended: yes; nothing is charged and Book Online adds one back at the standard price.
2. **Five days on a reschedule, or three?** Recommended: five.
3. **Who routes the day?** Recommended: automatically at 5 pm the evening before, plus a Route this day button for Ryan to do it earlier.
4. **A text to Ryan on every customer change?** Recommended: yes for cancels and moves while there is one truck; the Home alert always.
5. **Ask for a reason when a customer cancels?** Recommended: one optional line, seen by Ryan only.
