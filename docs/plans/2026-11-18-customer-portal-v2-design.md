# Design: the customer portal, v2

Nov 18 2026. Design only; nothing is built until Hannah has read it. Replaces the screens in `2026-11-18-customer-portal-design.md` (PR #63); keeps its sign-in, Details, receipts and card update. Hannah's words after the live walk: "All the crud functionality, everything is missing… cancel, reschedule. If it's within 24 hours they shouldn't, and maybe they could text Ryan… Visits and jobs is confusing for the customer… Arrive between 8 and 10 am: I thought we had done away with that. Make sure all the underlying data also matches." Live findings: `portal-walk-2026-11-18.md` in the session notes.

## 1. What a customer does here

| I want to | Needs | v1 | v2 |
|---|---|---|---|
| Know what is coming | day, who, what, price | day plus a made-up window | day; window only after Ryan routes the day |
| Move it | self-serve, with a clear limit | Change my day on pass visits, 2-day count | **Reschedule** on every upcoming visit, 24-hour rule |
| Cancel it | one tap, plain consequence | nothing (pass page skip only) | **Cancel visit** on every upcoming visit |
| Pay and find receipts | one list, money on each row | Jobs tab, then a job page | money on the visit row; receipt on the visit |
| Reach Ryan when it is too late | a ready text | a phone number | **Text Ryan** (prefilled) and **Call Ryan** |

## 2. Research: what to take

| Tool | What it does | Take |
|---|---|---|
| [Calendly](https://calendly.com/help/how-to-add-a-cancellation-policy) | Cancel and reschedule links ride on every confirmation and reminder; its help says the policy is shown to the invitee, not enforced; community threads say a reschedule link can bypass the notice rule | Links on every message; we enforce the limit on the server, not on the screen |
| [Square Appointments](https://squareup.com/us/en/help/article/5493-manage-booking-cancellations-and-prepayment-policies) | Seller picks a cut-off from one hour to two weeks; after it the client sees the policy | One cut-off, said in words with the exact moment, and a next step after it |
| OpenTable (terms, via a search summary; the terms page timed out) and [Tasting Table](https://www.tastingtable.com/1179757/the-opentable-reservation-penalty-youll-want-to-avoid) | Cancel on the site or by phone; a no-show is logged under 30 minutes' notice; the restaurant sets any fee | Cancel is one tap; the business, not the customer, owns the consequence |
| [Airbnb Flexible](https://www.airbnb.com/help/article/475) | Full refund until 24 hours before check-in; "full refund" means the listing price, guest fees differ | 24 hours is the common line; say exactly what is and is not returned |
| [DoorDash](https://help.doordash.com/consumers/s/article/How-do-I-cancel-my-order?language=en_US) | Cancel from the order's Help; the refund depends on how far the order has got (full, partial, none) | The consequence follows the visit's stage, and it is stated before the tap. The page does not say whether the amount is previewed |
| Uber Eats | Not retrieved; no claim made | Nothing taken |
| Jobber, Housecall Pro, ServiceTitan (v1 doc, section 2) | Change or cancel is a message or a call | We go past them: self-serve with the Text Ryan fallback they lack |

## 3. One timeline, not Visits and Jobs

**The words.** A customer has **visits** (a time Ryan comes to the property), a **Season Pass** (a card and a season line, never a list of its own) and **invoices**. The words job, line, stage and request never appear. A pass visit is an ordinary visit with a small "Season Pass 2027" label. The Jobs tab, the job page and the second pass card on it go away. Money lives on the visit it paid for. A job with two visits shows two rows with the same service name and its own days.

**Navigation:** Home · Visits · Season Pass (only for someone who has held one) · Details. Right of the logo, an account menu (first name, then Details and Sign out), no "Hi,".

```
HOME (375)                      VISITS (375)
+------------------------------+ +------------------------------+
| [logo]            Andrea  v  | | [logo]            Andrea  v  |
| Home Visits Pass Details     | | Home Visits Pass Details     |
|------------------------------| |------------------------------|
| Invoice sent: $115, due Dec 1| | Visits                       |
|                    [Pay now] | | COMING UP                    |
|------------------------------| | Tue, Apr 28, 2027            |
| NEXT VISIT                   | | Spring turn-on  [Season Pass]|
| Tuesday, April 28            | | 14 zones . $145 . charged    |
| We'll text your window the   | | after the visit      Booked  |
| day before.                  | |------------------------------|
| Spring turn-on . 12 Elm St   | | Fall, date coming soon       |
| Someone must be home         | | Fall blowout [Season Pass]   |
| [Reschedule]  Cancel visit   | | $95       Day coming soon    |
|------------------------------| |------------------------------|
| [PassCard, holographic]      | | PAST                         |
| Season line . See your pass  | | Mon, Nov 3, 2026             |
|------------------------------| | Repair . $145 . Paid  Receipt|
| RECENT                       | | Fri, Oct 10, 2026            |
| Repair, Nov 3  $145  Paid    | | Fall blowout . $95 . Paid    |
| All visits                   | |                       Receipt|
+------------------------------+ +------------------------------+
```

Visit rows: day with the year when it is not this year, service name, small Season Pass label when it belongs to a pass, the street under it only when the customer has two properties, the money word at the right, the pill. A row is one button to the visit page.

**Money on the row** (words only from `src/lib/money/words.ts` through `src/lib/portal/words.ts`): upcoming and priced, "$145, charged after the visit" when a card is on file, "$145, paid after the visit" when none; unpriced, nothing; done, "Paid", "$145 unpaid", "Invoice sent, due Dec 1" or "Past due since Dec 1"; a **Receipt** link on every paid visit.

## 4. The visit page, Reschedule and Cancel

```
VISIT, booked, before cut-off     RESCHEDULE sheet
+------------------------------+  +------------------------------+
| < Visits                     |  | Pick a new day               |
| Spring turn-on [Season Pass] |  | Spring turn-on, 12 Elm St    |
| Tuesday, April 28            |  | ( ) Wed, Apr 29     with Ryan|
| We'll text your window the   |  | (o) Thu, Apr 30     with Ryan|
| day before.                  |  | ( ) Tue, May 5      with Ryan|
| 12 Elm St, Erie              |  | ( ) Thu, May 7      with Ryan|
| Someone must be home         |  | ( ) Tue, May 12     with Ryan|
|------------------------------|  | None of these? Text Ryan     |
| What's included              |  | [Move it to Thursday, Apr 30]|
| 14 zones, start up, check    |  | Keep Tuesday, April 28       |
| each head                    |  +------------------------------+
| Price $145, charged to the   |
| Visa ending 4242 after       |  CANCEL confirm
| the visit                    |  +------------------------------+
|------------------------------|  | Cancel your spring turn-on?  |
| [Reschedule]                 |  | Tuesday, April 28            |
| Cancel visit                 |  | Nothing is charged. Your     |
| You can change this until    |  | Season Pass stays and this   |
| Sunday, April 26, 11:59 pm.  |  | visit comes off it.          |
+------------------------------+  | Tell Ryan why (optional) ... |
                                  | [Cancel visit]               |
INSIDE 24 HOURS                   | Keep my visit                |
+------------------------------+  +------------------------------+
| Tuesday, April 28            |
| [Text Ryan]  [Call Ryan]     |
| Ryan plans his route the day |
| before, so changes this close|
| go through him.              |
+------------------------------+
```

**Reschedule.** Offers up to **five** open days in time order inside the visit's window (`visits.areaDays` gains `count`, default 3, the portal asks for 5), the current day left out, each "Thu, Apr 30 with Ryan" (the person works that day; the name is the owner's first name, a person the customer has not met is "Ryan's crew" until Hannah renames them). Why five and not three: three is a checkout nudge to commit; a move is made for a reason (a trip, a wedding), and three days often miss it. Five fit a phone without scrolling, and "None of these? Text Ryan" is the exit. The first is preselected, one confirm button names the day. Done screen: "Moved to Thursday, April 30. We texted you the new day." and the old day is gone. No fee, no limit.

**Cancel, the consequence in words** (the confirm step states the line that applies; the button is the only red thing on the sheet):

| Visit | Confirm says | Records |
|---|---|---|
| Season Pass visit (turn-on, inspection, blowout) | "Nothing is charged. Your Season Pass stays and this visit comes off it." | visit `skipped`, its line canceled, event `visit.skipped` |
| One-off visit, the job's only visit | "Nothing is charged." | visit `cancelled`, line canceled, job canceled, `visit.cancelled` and `job.cancelled` |
| One-off visit, the job has other visits | "Nothing is charged for this visit. Your other visits stay." | visit `cancelled`, its line canceled |
| Day not chosen yet (Pick a day) | same as above; no day is freed | same |
| Money already touched (a payment on the job, or the visit's line is on a sent invoice) | Cancel is replaced by Text Ryan: "This one has a payment on it. Ryan will sort it out." | nothing; staff use `jobs.cancel` after a refund |
| Installation or quoted work | Cancel works the same ("Nothing is charged"); Reschedule opens **Text Ryan**, since those days are set with you | as above |

After it: "Canceled. We texted you a note. Changed your mind? Book Online." The visit stays in Past with the pill **Canceled** (one customer word for skipped and canceled; the admin keeps both). An optional one-line reason goes to Ryan only; the customer never sees it back.

## 5. The 24-hour rule

| Question | Answer |
|---|---|
| The cut-off | **24 hours before the start of the visit's day, Mountain time**: 12:00 am on the day before, tested as an instant (`now < cutoff`), the day arithmetic done on calendar days in `America/Denver` so a daylight-saving week does not move it |
| What it means | Visit Tue Apr 28: free to change until **Sun Apr 26, 11:59 pm**. From Mon 12:00 am the buttons are replaced. (Same moment as the shipped "two days before", now tested by instant and said in Hannah's words) |
| A visit with no day | Always changeable; Cancel works, Pick a day works |
| Routed days | The cut-off stays the start of the day, whatever the window; one rule, not two |
| After the cut-off | **Text Ryan**: `sms:+19706927270?body=` "Hi Ryan, it's Andrea Smith at 12 Elm St about my spring turn-on on Tuesday, April 28." (no ids; the text lands in the two-way thread by phone number). **Call Ryan**: `tel:`. One line: "Ryan plans his route the day before, so changes this close go through him." |
| Staff | Not held to it; the server refuses a customer principal after the cut-off, so the screen cannot be bypassed |
| The admin shows | In the visit panel, a read line: "Customer can change online until Sun, Apr 26, 11:59 pm" or "Closed, texts only" |

## 6. The right data

**Why "Arrive between 8 and 10" showed.** `orderDay` stamps `visit.start_time` from 8:00 on every Season Pass visit each time a day is ordered (`order-day.ts`), the checkout's days step copies a slot's start into it (`chosen-days.ts` lines 57 and 79), and `arrivalWindow` turns any start time into a window. The admin already defines **Routed = a start time is set** (`src/lib/admin/jobs.ts`), so every picked pass visit is "routed" the moment it is picked. The field that decides is `visit.start_time`; it must mean only "Ryan has routed this day".

| Change | Where |
|---|---|
| `orderDay` never writes `start_time`, for any kind; it writes `stop_order` only | `src/lib/scheduling/server/order-day.ts` |
| New `routeDay(db, {personId, day})` = `orderDay` then today's stamping (8:00, stacked by length). Runs from the daily cron before `dayBeforeMessages` for tomorrow, and from a **Route this day** button on the Schedule day view | `order-day.ts`, `daily.ts`, `WeekGrid` day view |
| The checkout and the customer's pick never set `start_time` (`visits.pick` already clears it) | `chosen-days.ts`, checkout days cards ("between 8 and 10 am" comes off the cards in the booking design too) |
| Portal shaping: `window` is `null` unless `start_time` is set; `person` only when routed, and never a placeholder name ("Second", "Truck 2") | `src/api/v1/portal/load.ts`, `portal/words.ts` (`arrivalWindow` becomes `windowWords`) |
| Backfill (its own migration and PR, because pushed branches migrate production): null `start_time` on Season Pass visits that are scheduled and dated two or more days ahead; leave anything nearer, since the office may have set it | one migration, reviewed |
| Texts follow for free: `date-set` and `date-moved` have no window until routing; `day-before` has it | `src/sms/texts.ts`, no change |

**Copy rule.** Before routing: "Tuesday, April 28. We'll text your window the day before." After routing: "Tuesday, April 28, between 8 and 10 am, with Ryan." Same on Home, the row, the page and the text.

**Greeting.** "Hi, {name}" goes. The header's right side is an account menu showing the first name from `customer.first_name` only (never "there", never a surname), opening to Details and Sign out. Home's H1 is "Your Trailhead account".

**Every field on every screen:**

| Screen | Shows | Comes from |
|---|---|---|
| Header | first name | `customer.first_name` |
| Next visit, row, page | day | `visit.scheduled_on` (year when not this year) |
| | window | `visit.start_time` and `visit.duration_minutes`, only when `start_time` is set |
| | who | `visit.person_id` first name, only when routed and a real person |
| | service name | `visitName(visit.kind)` |
| | Season Pass label | `job.season` not null |
| | street, town | `property.address`, `property.town`; the street in a row only with 2+ properties |
| | must be home | `property.must_be_home` |
| | what's included | `line_item.description` of the visit's own lines |
| | price | the visit's own non-canceled lines with tax (`visitPrice`) |
| | charged to the Visa ending 4242 | `customer.card_brand`, `card_last4` |
| | pill | `visit.status`, `not_done_reason`, `change` |
| | Reschedule, Cancel, Text, Call | `PortalVisit.reschedule` and `cancel` (below), `cutoffAt`; phone from `nav.ts` |
| Past visit | day | `visit.completed_on` for Done, never the planned day |
| | money, Receipt | payment rows by visit (`jobMoney` for job-level payments), `charge.receipt_url` or `/account/receipts/<id>` |
| Invoice banner | total, due day, Pay now | `invoice.total`, `due_on`, signed `payPath` |
| Pass card, season line | season, each kind's day | `job.season`; `completed_on` when Done, `scheduled_on` otherwise (this fixes "done Nov 17" against "April 27") |
| Details | name, phone (formatted "(303) 819-6133"), email, yard facts, card | `customer`, `property` |

## 7. Keep, move, go

| Item | Fate |
|---|---|
| Holographic `PassCard`, season line, Save as image | **Stay**, on Home and Season Pass; gone from any job page |
| Invoice banner and Pay now | **Stay**, top of Home; also a banner on the visit page it belongs to |
| Receipts and the receipt print page | **Move** onto the paid visit row and page |
| Card update, Details, sign-in, email-is-read-only | **Stay** |
| `/account/pass` | **Stays**; its skip and pick buttons call the same handlers as the visit page |
| Visits and Jobs tabs, job rows, job page | **Go**: `/account/jobs*` redirects to the visit; Jobs tab removed |
| "Hi, Andrea", "Change my day" | **Go**: account menu, Reschedule |
| Season Pass visit's name and day appearing in three places | One component (`VisitRow`) everywhere |

## 8. Edge states

| State | Customer sees |
|---|---|
| No visits | Home: "Nothing booked right now." [Book Online]; Visits: "No visits yet." |
| Pass canceled | Pass card faded with "Canceled". "Your 2027 Season Pass is canceled. Nothing more will be charged." [Book Online]; its visits read Canceled |
| Visit with no day | "Pick a day" with Reschedule's list, or "Day coming soon. We'll text you when Ryan has one." Cancel is still there |
| Invoice past due | Home banner "Past due since Dec 1, $115" with Pay now; the visit row says the same |
| Two properties | A "123 Main St / 40 Oak Ave / All" filter on Visits; the street shows under each row's service; Details lists both |
| Day passed, not yet closed | "Booked" until Ryan closes it (unchanged); no buttons |
| Payment on the job | Cancel replaced by Text Ryan (section 4) |
| No open days | "No open days left in this window. Text Ryan." |
| A save fails | "We couldn't save that. Try again, or text Ryan." with the same links |

## 9. Admin side: what Ryan sees

| Moment | Ryan sees | Undo |
|---|---|---|
| Customer cancels | Home alert (`customer-changed`, key visit and time so repeats show): "Andrea Smith canceled Spring turn-on, Tue, Apr 28, Erie. The day is free." [Open visit]; a text to the owners with the same words; history line "Spring turn-on canceled by Andrea" in Notes and history; the Schedule slot is free | **Put it back** on the alert and the visit panel: `visits.reinstate` restores the old day if still open, else Needs a day; the customer is texted |
| Customer reschedules | Home alert: "Andrea Smith moved Spring turn-on from Tue, Apr 28 to Thu, Apr 30, Erie, Ryan."; a text to the owners; history "moved by Andrea"; the day on the Schedule | Move it back with the existing Move (`visits.move`) |
| Customer texts Ryan | Messages thread, as two-way texting does today | n/a |
| Customer gets | Moved: the `date-moved` text. Canceled: a new transactional `visit-canceled` text and email ("Your spring turn-on on Tue, Apr 28 is canceled. Nothing was charged.", not editable by the office, as the money wording is fixed) | n/a |

## 10. What changes in code

| Part | Change |
|---|---|
| Handlers, change | `visits.pick`, `visits.areaDays`: cut-off by instant (`changeCutoff(day)` in `src/lib/portal/change-day.ts`, replacing `CHANGE_CUTOFF_DAYS`), `count` input, exclude the current day. `passes.skipVisit`: today it has **no cut-off**; route it through the shared function |
| Handlers, add | `visits.cancelSelf` (`customerSelf`; rules in section 4; refuses done, canceled, past the cut-off, money touched); `visits.reinstate` (staff). Both call one `cancelVisit` / `reinstateVisit` in `src/lib/jobs/` that `visits.cancel` and `passes.skipVisit` also use |
| Side effects | event `visit.moved`/`visit.cancelled`/`visit.skipped` with who = customer; `admin_alert` kind `customer-changed`; `queueStaffMessage` to owners; customer message kind `visit-canceled` (`queue.ts`, `texts.ts`, `emails/`, `consent.ts` transactional list) |
| Schemas | `PortalVisit.change` becomes `reschedule` and `cancel` (`yes`, `text`, `no`) plus `cutoffAt` and `window`; drop `startTime` and `durationMinutes` from the portal shape; `PortalVisit.personFirstName` only when routed |
| Data | `orderDay` no `start_time`; `routeDay`; cron; checkout `chosen-days.ts`; backfill migration (own PR) |
| Routes | Add `/account/visits/[visitId]`; `visits/page.tsx` becomes the timeline; `/account/jobs` and `/account/jobs/[jobId]` redirect; Home recomposed; header menu in `AccountNav` |
| Blocks (pure props, stories at 375 and 1280) | `VisitRow` (reused, gains money and label), `NextVisitCard` (gains the two actions), new `VisitPage`, `RescheduleSheet`, `CancelVisitSheet`, `TextRyan`, `AccountMenu`; retire `JobRow`, `JobScreen`, `JobsScreen` |
| Stories | Home (before cut-off, inside 24 hours, no visit, invoice, pass canceled), Visits (two properties), Visit page (booked, routed, pass, one-off, paid), both sheets, Text Ryan |
| Admin | Home alert row, visit panel line and Put it back, `eventWords` "by the customer", Schedule Route this day |
| DATA_MODEL rows | `visit.start_time` (set only by routing), `visit.status` (customer cancel), new `admin_alert` kind, the customer's account section |
| Docs | CLAUDE.md bullet "The customer account"; DESIGN.md portal section |

**Build order.** 0: fix the `/account/pass` 500 (the visit is inside the old cut-off) and the day text's link to `/account` (a bug PR). 1: the data (routing, shaping, backfill) because every screen reads it. 2: handlers, rules and messages with tests. 3: blocks and screens, then the redirects. 4: admin alert, history, Put it back, Route this day. 5: docs, then a live walk on a phone with a real pass holder and a one-off.

## 11. Questions for Hannah

1. **Is "24 hours before the start of the visit's day" right** (a Tuesday visit is changeable until Sunday 11:59 pm), or should it be 24 hours before the window opens? Recommended: the day, because most visits have no window until the day before.
2. **When a customer cancels a Season Pass visit, is it gone for the season?** Recommended: yes, nothing is charged, and "Book Online" adds one back at the standard price.
3. **Five days to pick from on a reschedule, or three?** Recommended: five.
4. **Who routes the day?** Recommended: automatic at 5 pm the evening before, plus a Route this day button for Ryan to do it earlier.
5. **A text to Ryan on every customer change?** Recommended: yes for both cancels and moves while there is one truck; the Home alert always.
