# Season Pass booking: when each visit gets its day

Nov 20 2026. Research only; nothing is built and no code changed. Hannah, in her words: "We need to think through the Season Pass booking process. Then we take their preference too. We need to think through when are they booking: April, November, what if they book in January. You don't book your blowout in April. This is really complicated. I think they book the one closest to them, then say what they prefer for the next, and they will be scheduled two weeks out and get a confirmation. Then Ryan or myself would need to reorganize the schedule. I don't know, what do you think? Go research."

Standing rules this doc keeps: a visit that is booked has an exact day and an exact time, never a two-hour window; nothing is invented (no promises, no response times, nothing "free"); states are read from facts; the customer's words are visit, invoice and unpaid, never job or line. Pages I fetched are quoted. Anything I could only see in a search summary, or know from memory, is marked "unverified". The defaults in section 6 are my proposals for Hannah to accept or change, not decisions.

## 1. The problem, and what exists today

### The bug Hannah saw

In the booking form (Customer / Booking form, the day and time step) a Season Pass shows the heading "Your fall blowout" over April days, and a spring turn-on step in the same flow. It is not one slip. Reading `src/app/(booking)/booking/_screens/BookingForm.tsx` and `booking-form-model.ts`, five things add up to it.

1. The pass path is a fixed list of two visits (`PASS_VISITS`: turn-on, blowout). It does not look at the date, so the form shows a spring turn-on step to someone buying in August.
2. Each visit's days come from `offersFor(v.key, minutes, at)`. The default, `fixtureDayTimes`, ignores the visit key and returns the same five April days for both visits. The real rule (`offerFor`) answers per service and per its dates, but the form's contract has no season and no today to give it.
3. Both visits use the pass entry's 60 minutes. The blowout is 30 (`fall-blowout`, `minutes: 30`).
4. The price is always the full pass (`priceFor`: `seasonPassPrice(zones)`), never what is still ahead. The live checkout does it right: `visitsOnSale` and `priceOnSale` in `src/lib/season-pass.ts` drop a visit whose window has closed.
5. The Season Pass card has no "Opens" date, so it is selectable in every month. Only the single-visit cards (spring turn-on "Opens Apr 25", fall blowout "Opens Oct 1") close out of season, with the note "Reserve the Season Pass and your turn-on day is held."

The existing checkout (`/season-pass/checkout`, behind its flag) already avoids items 1 and 4: its "Pick your days" step makes one group per visit still on sale. But it offers days only (no times), for every visit on sale at once, including a blowout bought in January.

### What a pass is today

- Two visits by default, the spring turn-on and the fall blowout, and an optional July inspection (`SEASON_PASS_CORE`, `SEASON_PASS_ADD_ON`). Each visit is invoiced at its standard per-zone price after the visit. The turn-on and inspection are $145 up to 8 zones, the blowout $95 up to 6, $10 for each extra zone.
- A pass is a job with a `season`; its visits are `visit` rows with a kind, a `status`, a `scheduled_on`, a `start_time`, and a `preference` (earlier, recommended, later) on the turn-on and blowout.
- What is on sale (`visitsOnSale`, `src/lib/season-pass.ts`): from November 1 the next season, both visits (and July if added). Before that, a visit is sold only while its window close has not passed: turn-on through May 31, inspection through July 31, blowout through November 15 (`WINDOW_CLOSES`). `currentSeason` is the calendar year through October and the next year from November 1.
- The windows the scheduler reads, `settings.windows`, seeded from `src/lib/admin/fixtures/snapshot.json`: turn-on Apr 26 to May 31 (4 lead weeks), inspection Jul 1 to Jul 31 (4), blowout Oct 1 to Oct 31 (2). A service's own `bookable_from` and `bookable_to` are copied from these (migration 0024).

**Three places disagree about the dates.** The turn-on opens Apr 25 in the booking fixture, Apr 26 in the seed, and May 1 in `src/lib/settings/defaults.ts`. The blowout closes Oct 31 in the seed and the week-planning design, Nov 15 in `defaults.ts` and `WINDOW_CLOSES`. This has to be one answer before the month table below can be exact (question 6).

### How a day gets set today

1. **At purchase (checkout, live behind a flag).** The customer picks a day for each visit; `holdChosenDays` holds it. No time is promised. The preference is stored but never asked: the checkout keeps both at "recommended" (`turnOnPreference: "recommended"`).
2. **A visit with no day.** The daily run (`queueDueRuns`) queues one `schedule-run` per window when today is within the window's lead weeks of its opening (Mar 29 for the turn-on, Jun 3 for the inspection, Sep 17 for the blowout), once per window per season. `scheduleVisits` places each unscheduled pass visit on the early, middle or late third of the window by the visit's preference, then by town order and capacity, and the customer is texted "date-set" the moment it is placed. A visit for a customer who must be home is never placed there; it waits for their own pick.
3. **Two weeks out.** `dateConfirmMessages` texts every visit that already has a scheduled day 14 days away (kind `date-confirm`, "your {service} is still {day} at {time}"). It confirms a day. It never creates one.
4. **Day before.** `day-before`, with the exact time when there is one.
5. **The office.** The Schedule's Unscheduled list holds every visit with no day, sorted by window then preference (earlier before later). Place and Place all use the offer rule's preselected day, inside the pass's window, as "Any time", with a 60-second Undo strip before the text goes. Move has "Move without texting" for a visit with no booked time (`timeBooked` is false for a pass visit until the day-before text has told its window).
6. **The offer rule (`offerFor`, engine stage 7a).** Soonest open days first, from tomorrow, inside the service's dates, with nearness to existing work ordering the soonest five and three offered. It does not read the preference.

### Where the repo is not yet whole

- The preference is read only by the old batch scheduler (`scheduleVisits`) and the Unscheduled sort. The offer rule and `placeFor` ignore it. Engine stage 7b drops the area groups and windows that batch scheduler uses, so the one reader of the preference goes with them unless it is carried over.
- Because the offer rule ranks soonest first, every pass's blowout would be offered the opening days of October. Ryan's 2026 data says the work is later: 92 percent of blowouts fell between Sep 28 and Nov 15, the busiest week was Oct 19 with 54, and the checkout's own reason line for the recommended second week of October is that the first hard freeze "usually arrives between mid and late October" (`docs/plans/2026-11-18-routes-and-seasons-answers.md`, `src/lib/admin/format.ts`).
- Nothing skips, rolls over or flags a pass visit whose window closes without a day. `scheduleVisits` just `continue`s past a window that has closed (no placement, no "unplaced" row), and the visit stays in the Unscheduled list. The only way out is a person using `passes.skipVisit`, which cancels the visit's line and keeps the pass.
- The two-weeks-out text exists and is true for a held day. For a day that was set only a moment ago it would be a second text about the same day.

## 2. How the other systems handle it

Pages fetched on Nov 20 2026 are linked and quoted. "Search summary" means the fetch of that exact page failed or was not made, and I read the search tool's summary of it.

### 2a. Choosing at sign-up, and giving the later visit a day

| System | (a) What the customer chooses when later visits are months away | (b) How and when the later visit gets its exact day and time |
|---|---|---|
| **Jobber**, [recurring jobs](https://help.getjobber.com/hc/en-us/articles/115009542848-Create-a-Recurring-Job) (fetched) | Nothing about timing. The admin sets a start date ("This is the day the contract begins") and a repeat rule ("This is how often you'll be going out to visit the client as part of this job."). | Each visit gets a date from the repeat rule. "If no start and end time is entered, the visits for this job will be anytime visits." The "As Needed" option "will make no visits, and the visits can be made later." Visits "will be unassigned and can be assigned later." |
| **Jobber**, [visits](https://help.getjobber.com/en/articles/visits/) (fetched) | n/a | An unscheduled visit "Has neither a date nor time assigned to it", used as a placeholder. "Unscheduled visits can be dragged from the unscheduled sidebar onto the schedule to assign them a date and time." An anytime visit "has an assigned date, but not a scheduled time on that day." |
| **Jobber**, [online booking](https://help.getjobber.com/en/articles/online-booking/) (fetched) | A single date and time: "This is where the customer will select a date and time for the appointment from the calendar." The page does not mention recurring or seasonal booking; a job booking "schedules a one-off job on your calendar." | Not applicable: online booking makes one appointment, so a later visit is never booked by the customer. |
| **Housecall Pro**, [service plan visits](https://help.housecallpro.com/en/articles/3075085-schedule-service-plan-visits) (fetched) | The page does not say how a first visit is booked and does not mention preferred times. | Visits sit in an Unscheduled Visits table: "Visits will appear here in chronological order." Reminders drive the customer: "Be sure to enable your automatic scheduling reminders" so that "your customers will reach out to you to schedule their next maintenance." The office books one visit at a time: "The calendar icon will create a new job that will be linked to the service plan visit." |
| **ServiceTitan**, [view recurring service events](https://help.servicetitan.com/docs/view-recurring-service-events.md) and [manage recurring services](https://help.servicetitan.com/docs/manage-recurring-services.md) (fetched; both pages carry a "stale: true" flag) | Nothing at sign-up. The membership sale attaches the recurring service: "When you sell a membership, recurring services are attached to the customer service location." | "Recurring events are individual service visits that are automatically scheduled based on recurring service settings." But the date is a target: "The date of a recurring event allows you to know when to schedule a service." "You set the actual service date when you book the event into a job." For a seasonal service, "recurring events are scheduled for every selected month on the day of the month the membership is purchased." They "populate up to 12 months, 364 days into the future." Staff work from Follow Ups: "you can contact customers and book recurring service events into jobs." |
| **LawnPro**, [scheduling](https://www.lawnprosoftware.com/features/scheduling) (fetched) | Nothing; the office sets a start date and an end. | "LawnPro generates all future visits automatically." Off seasons that "every series skips each year" mean "Nothing has to be rebuilt in the spring." |
| **Hydroscapes and Senske**, in [NALP's piece on scheduling irrigation winterizations](https://blog.landscapeprofessionals.org/optimizing-operations-scheduling-irrigation-winterizations/) (fetched; quotes as the fetch returned them) | Contracted clients are pulled in bulk: "Hydroscapes does a mass pull of all their clients contracted for a winterization service for the current season." | "Their software program will create a pending work order for each customer", feeding "a master schedule" that is "our ideal schedule, taking into account many logistical and strategic factors." The customer is told later: "Hydroscapes will contact their customers two to three weeks prior to the tentative date selected for them." Senske's branch "collaborates with their router" and they "prenotify the customers 1-2 days before the service either by mail, text or automated call." |
| **The Sprinkler Company** (Wisconsin), [maintenance](https://thesprinklercompany.com/maintenance) (fetched) | Choose an agreement once: "Sign up once in the spring to cover all your seasonal maintenance requirements." | "When you sign up for an irrigation maintenance agreement, your services will be automatically scheduled." "We will send you advance notifications and confirmation of when we'll be servicing your system during the season." |
| **Kelly Green**, [seasonal plans](https://kellygreenirrigation.com/seasonal-plans/) (fetched) | Nothing about timing. | "We contact you to schedule standard service visits." |
| **ALS Waterstone**, [seasonal plan](https://newlawn.com/waterstone-seasonal-service-plan/) (fetched) | The page does not say whether spring and fall dates are both picked. | "After checkout, you'll be automatically directed to our online scheduling page." |
| **Shakopee Sprinklers**, [home page](https://shakopeesprinklers.com/) (fetched) | Nothing on plan timing. | For winterization: "Please schedule online whenever possible." and "Online scheduling is available 24/7 and gives us the information we need to route your service." |
| **HVAC plan guidance**, [Noble Admin Network](https://www.nobleadminnetwork.com/blog/hvac-maintenance-agreement) (fetched; HVAC, not irrigation) | The sample agreement says "We'll contact you in [month] to book the spring visit and in [month] to book the fall visit." | The guide's advice: "Book both on the day the homeowner signs." and "Book next spring's visit before the tech leaves the fall visit." |
| **Service Autopilot, Aspire** | Unverified. Search summaries only: vendor marketing says recurring schedules at "weekly, bi-weekly, or monthly" cadence; nothing found on irrigation, a winterization list or route-by-week planning for either. | Unverified. I did not find a first-party page for either. |
| **A neutral source**, Baymard's [time booking interface](https://www.baymard.com/ecommerce-design-examples/time-booking-interface) (fetched, summary only; the detail is paywalled) | n/a | Participants "often struggled to understand the dates and times that were available" because of how the options were shown; the best-performing approach was to "present date and time slot options in a clear visual hierarchy." This is about picking a slot, not about picking one now for a visit months away. I found no neutral source on "state a preference now, get the exact time later". |

### 2b. The office, the move, the month, the pitfalls

| System | (c) How the office reorganizes a season, and what the customer sees when a day moves | (d) The sign-up month problem | (e) Pitfalls reported |
|---|---|---|---|
| **Jobber** | The Unscheduled sidebar on the Schedule; "Edit All Visits" then "Update Incomplete Visits" changes the rest of a recurring job. The pages say nothing on a customer's notice of a move. | Not covered. A community thread asks for seasonal windows instead of fixed repeat dates. Unverified: the page returned 403, I know it from a search summary. | The client notice for an unscheduled visit is not documented. |
| **Housecall Pro** | One visit at a time from the Unscheduled Visits table. No bulk placement is on the page. | Not covered. | "If visits from months prior have gone unscheduled they will appear at the top of this list view": the list grows when nobody acts. Reminders put the booking on the customer. |
| **ServiceTitan** | Follow Ups lists events; bulk booking is in a search summary only (not on the pages I fetched), so unverified. | The seasonal day of month is the purchase day, so the sign-up date sets the target. A search summary adds that a service done at purchase can be subtracted from the total visits (unverified). | A search summary says going past 12 months "may impact your account performance" (unverified). |
| **LawnPro** | Drag and drop; a drag of a recurring visit "asks whether to move just that visit or the rest of the series' open visits." A rain day can "push every open visit forward 1 to 7 days." | The page does not say how a mid-season customer is added. | "Customers are not sent a separate reschedule notice"; reminders move with the visit. A moved day reaches the customer only as a reminder. |
| **Hydroscapes, Senske, others** (NALP) | A master schedule built by the office, with a router, from pending work orders. | Not covered. | "Stragglers are either new customers that called in very late." "Delays on service delivery may cause us to not be able to perform the service at all." Late-season customers may carry a premium or no guarantee. |
| **Irrigation firms** | Not described on their pages. | The Sprinkler Company: "Sign up once in the spring" and a repair discount only "when you prepay by April 1st": its answer to the month problem is a deadline. Kelly Green: "Just ask a Kelly Green representative for options and we'll be glad to tailor a plan to suit your needs": a person decides. Shakopee: "Late in the season, we may be making a dedicated trip for one property, which increases the cost." DoMyOwn's lawn subscription is said, in a search summary I could not fetch (403), to vary a first year by when you enroll (unverified). | Plan sellers' pages agree an unused plan does not renew: "Visits that never get booked turn into cancellations" (Noble Admin Network, fetched). A renewal-calls post says the same in a search summary I could not fetch (unverified). |

### 2c. What the evidence says, in plain words

- Nobody I found lets a customer pick an exact day for a visit months away and then confirms it later. The closest are sites that send you to a scheduling page after checkout (Waterstone) and firms that schedule you and send notice (The Sprinkler Company, Hydroscapes, Kelly Green). The same split is in `docs/plans/2026-11-13-checkout-scheduling-research.md`, whose conclusion for a first purchase was to show days right away because a paid customer with no day was the complaint on Nov 13.
- The firms that time their notice put it two to three weeks before a date they chose earlier (Hydroscapes) or give "advance notifications and confirmation" (The Sprinkler Company). Hannah's "scheduled two weeks out and get a confirmation" matches the notice. In Hydroscapes's description the date itself already existed in a master schedule.
- The software separates a target from a date. ServiceTitan: the event date "allows you to know when to schedule a service" and the real date is set at booking. Jobber's placeholder is a visit with "neither a date nor time". Both are a plan the office holds before the customer is promised anything.
- The office tools place one visit at a time from a list (Housecall Pro, Jobber). I found no bulk planning view by week in any fetched page. That piece, if wanted, is ours to design.
- Trailhead's own history says customers book close to the date. In Jobber's 2026 data the median lead from booking to visit was 7 days for a blowout and 13.5 for a turn-on; 31 of 249 blowouts (12 percent) and 7 of 36 turn-ons were booked three or more weeks ahead (same answers doc). A January buyer cannot know their May.

## 3. Trailhead, month by month

Assumptions for the table. Windows from the seed: turn-on Apr 26 to May 31, inspection Jul 1 to Jul 31, blowout Oct 1 to Oct 31 (the three-way disagreement above applies). What is on the pass is `visitsOnSale`. "Booked now" is the exact day and time from the offer rule for that visit's service and dates: soonest open days first, three shown, one preselected. I read the rule; I did not run it, so the example days assume an empty calendar and a working week of Monday to Friday, 9 to 5. "Placed" is the existing run and lead weeks: turn-on Mar 29, inspection Jun 3, blowout Sep 17. The July inspection is on the pass only if the customer added it. Prices are the standard per-zone prices, invoiced after each visit; the pass adds no discount.

| Buys in | Visits on the pass (what the repo does today) | Booked now, exact day and time | Gets a preference | Placed | Customer told | A window that has passed |
|---|---|---|---|---|---|---|
| **January, February, March** | Turn-on, blowout, and July if added. Season is this year. | The turn-on, which opens Apr 26: days from Mon Apr 26 (an empty calendar would offer Apr 26 to Apr 30), one to three months ahead. | The blowout: Early, Mid or Late October. | The blowout by the run on Sep 17, two weeks before it opens, onto the preferred third of October. | The turn-on's day and time at purchase. The blowout: today the "date-set" text on the day the run places it, then "date-confirm" at 14 days. | None passed. |
| **April 1 to 25** | Same as above. | Same: the days start Apr 26, one to four weeks away. The run for the turn-on began Mar 29. | The blowout. | Same. | Same. | None passed. |
| **April 26 to 30** | Same. | The turn-on, soonest first from tomorrow. | The blowout. | The turn-on is booked now, not by the run. The blowout as above. | At purchase. | None passed. |
| **May to June** | May: turn-on and blowout, and July if added. From Jun 1: blowout, and July if added, no turn-on. A buyer on Fri May 28 still has the turn-on on the pass, with only Mon May 31 left to offer, so possibly no open day: the checkout then says "We don't have an open day to show yet. Ryan sets this one and we text it to you." | In May, the turn-on if a day is open, else none. From Jun 1: the inspection if added (Jul 1 onward), else the blowout in October. | The blowout (not the inspection, which asks none). | Blowout by the Sep 17 run. | At purchase for what is booked. | Turn-on after May 31: not sold, no visit row is made, the price is lower by the turn-on's. Nothing is skipped because it never existed. |
| **July** | Blowout, and the inspection through Jul 31 if added. No turn-on. The total is the blowout alone, or blowout plus inspection. | The inspection if added and open, else the blowout. | The blowout. | By the Sep 17 run. | Same. | Turn-on: not sold. |
| **August** | Blowout only. The inspection cannot be added after Jul 31. | The blowout, which opens Oct 1, so about two months ahead. | None needed if booked now. | Booked now. | At purchase. | Turn-on and inspection: not sold. |
| **September** | Blowout only. | The blowout, which opens Oct 1. | None. | Booked now. | At purchase. | Turn-on, inspection: not sold. |
| **October** | Blowout only. The window ends Oct 31 in the seed. | The blowout: soonest open day from tomorrow to Oct 31. A buyer on Oct 29 has Oct 30 and 31 left. | None. | Booked now. | At purchase. | Turn-on, inspection: not sold. A blowout with no open day left in the window is "Ryan sets this one." |
| **November** | The sale rolls to next season on Nov 1 (`SEASON_ROLLS`): season is next year, turn-on and blowout (and July if added). The current season's blowout, which `WINDOW_CLOSES` still treats as open until Nov 15, cannot be bought as a pass; it is a single booking. | The turn-on, which opens Apr 26 next year. The rule starts a later season from Jan 1 of it, so the first days are Apr 26 onward, about five months ahead. | The blowout, a year out. | Turn-on by the Mar 29 run, blowout by the Sep 17 run. | At purchase for what is booked. | The current season's blowout is not on the pass. |
| **December** | Same as November. | Same, about four months to the turn-on. | Same. | Same. | Same. | Same. |

Season and price behave like this today: the season is the year of the visits' windows, so January to October buys this year's and November and December buy next year's. A buyer pays only for the visits sold: a June to October pass is one blowout, $95 for up to 6 zones, which is the same as booking a blowout alone. The pass page's "Reserve next season" opens from Nov 1 (`SEASON_ROLLS` in `pass-page-model.ts`). A pass is "expired" once its season's calendar year is over (`passStatus`).

## 4. Recommendation

### Testing Hannah's idea

Her idea in four parts: (1) book the visit closest to the customer's purchase, exactly; (2) take a preference for the next; (3) place that next visit two weeks out and send a confirmation; (4) Ryan or Hannah reorganizes.

| Part | Verdict | Evidence and where it fits |
|---|---|---|
| 1. Book the nearest visit exactly | **Keep.** It is the answer to "you don't book your blowout in April": in April the nearest is the turn-on, in September the blowout. | It matches the Nov 13 decision (a paid customer should leave with a day) and the booking form's exact-time rule. It is where the offer rule, `holdChosenDays` and the confirm text already work. One honest caution: a January buyer is picking a day one to three months out when the 2026 median lead was under two weeks. The change path the account already has (online until the cut-off, then Text Ryan) is what makes that fair, and question 2 asks whether to offer it. |
| 2. Take a preference for the next visit | **Keep, and finish it.** | It is already the model: `visit.preference` (earlier, recommended, later) with the words "Early October", "Mid October" and "Late October" (`preferenceLabel`), but the checkout never asks it and the offer rule never reads it. It must be asked and it must drive placement, or it is a field nobody uses. |
| 3. Place two weeks out, then confirm | **Change one thing.** Make the plan earlier and the telling two weeks out. | The firms that give a date two to three weeks ahead already hold a plan: Hydroscapes builds a "master schedule" from "a pending work order for each customer", then contacts customers "two to three weeks prior to the tentative date selected for them." If the day is first placed only at 14 days, a customer who bought a pass for a kept schedule can find the days taken by single bookings in the weeks before. The existing run already does the early part (lead weeks 4, 4, 2). What is missing is holding the text until two weeks out (today it goes at placement) and giving the visit an exact time at that moment. |
| 4. Ryan or Hannah reorganizes | **Keep, and add one view.** | The Unscheduled list, Place, Place all with preview, the 60-second Undo strip and Move already do it for a visit at a time. Nothing in any system I read gives a week-by-week view of a season, so a small "Season planning" view is ours to add (section 5). |

### The model, in order

1. **Purchase.** The customer gets what is nearest, exactly. If a visit's dates are open, they pick a day and an exact start time from the offer rule, held in one transaction for that visit. A visit whose window is later gets an Early, Mid or Late choice, not a day. A visit whose window has passed is not offered and the price shows only what is ahead.
2. **Ryan's plan.** When a window comes inside its lead weeks the existing run places every unscheduled visit, starting from the third of the window the customer chose (new: the rule reads the preference), counting each as busy minutes so a later single booking sees the day as taken, and leaves each as "Ryan's plan" with no text. Ryan sees the whole list and can move any of it without texting anyone, because nothing has been told (`Move without texting` already exists for a visit with no booked time).
3. **Two weeks out.** On day 14 the customer gets one text with the exact day and exact start time and the link to confirm or change. The time is the best slot the offer rule finds on that day and is a booking from then on. The existing "date-confirm" kind is the right message; its words need a "here is your day" sentence in place of "is still {day}".
4. **After that.** The existing rules: a visit can be changed online until the cut-off, a move by Ryan always texts, the day-before text repeats the time.

### The exact-time rule, reconciled

A preference is an intent and never a promise. Nothing in the confirmation, the pass page or the calendar says a day or a time for a visit that has only a preference. A visit becomes booked, with an exact day and an exact time, at one of two moments: when the customer picks it at purchase, or when the two-weeks-out text goes. Before the second moment Ryan's plan is a plan: it has a day in the database (so the capacity is held) and nothing a customer can read.

This matches the rest of the repo: a pass visit's `start_time` is "only the stack its day was ordered in and promises nothing until told" (`timeBooked`), and a customer's window or time reaches them only once the day-before row exists (`windowTold`). The same read-from-facts trick, a message row for the visit's present day, can say a plan has been told.

### Where it fits the existing machinery, and what is new

| Piece | Today | For this model |
|---|---|---|
| Two-weeks-out message (`date-confirm`, `dateConfirmMessages`) | Confirms a day that already exists, 14 days out | Becomes the telling message for a planned visit: an exact day and time, confirm or change. Fits, with new words. |
| `queueDueRuns`, lead weeks 4, 4, 2 | Queues one placement run per window; texts "date-set" at placement | Keep the run as Ryan's plan. New: it does not text. Change the one text to go on day 14. |
| `placeVisit`, `placeFor`, `scheduleVisits` | `placeFor` takes the offer rule's soonest day and ignores the preference; `scheduleVisits` reads the preference but belongs to the area groups 7b drops | New: one placer that starts at the preferred third and takes the offer rule's slot. Fits the offer rule, needs the preference carried into it. |
| Offer rule, per-person capacity, towns | Soonest first, counts caps and drive gaps | Fits. A planned, untold visit already counts as untimed busy minutes. |
| Unscheduled list, Place, Place all, Move | A list sorted by window then preference | Fits. New: a way to see the list by week and preference (section 5). |
| `visit.preference`, `skipVisit`, `visit.confirmed` event | Exist | Reuse. |
| Exact times written to a pass visit | Not yet: `visits.pick` takes no start and writes none (stage 7b) | **Needs 7b.** Without it only a day can be told. |
| "Must be home" gating | A visit is never placed and waits for the customer's pick | Goes away: the customer picks the time that suits them (Nov 18 decision), so access is a note, as the Nov 13 research already says. |
| Out-of-season sale rule | `visitsOnSale` in the checkout only | **New for the booking form:** it must read the same rule, show only the visits ahead and price them. |

## 5. What each person sees

No new copy is written here. Only the structure and the facts shown are set, so every sentence comes from a source that exists or from Hannah.

### The customer

- **Service step.** The Season Pass shows what it holds for the date, from `visitsOnSale`: two visits, or one, or three. A pass with nothing ahead does not appear. A single-visit card that is closed still points to the pass, as it does now.
- **Day and time step, one visit at a time.** The heading names the visit by its kind ("Your spring turn-on" or "Your fall blowout") and the days and times under it come from the offer rule for that kind and its dates, never another visit's. The pass entry's 60 minutes gives way to each visit's own length.
- **Later visit.** In place of days, three choices with the existing words: Early, Mid and Late, with the month, and the existing one-line reason (`preferenceReason`). Mid is selected, as the checkout's "recommended" is today. One line says the exact day and time are sent two weeks before; the existing confirm line says this for a held day, so its wording needs Hannah's approval for a visit with no day yet.
- **Confirm step.** One row per visit. The booked one reads its day and time. The later one reads its preference ("Mid October, your preference") and what happens next.
- **Booked screen and confirmation.** The pass card shows the booked visit with its exact time and the other as a preference. Add to calendar is offered only for the booked one.
- **Two weeks before.** One text and one email fallback: the exact day and time, Confirm and Change (the signed one-visit link that already opens Reschedule). Silence is yes, as it is for a move.
- **The account and pass page.** Each visit shows its state read from facts: booked with its day and time, or a preference. "Change preference" while a visit has no told day; Reschedule as today after.

### Ryan and Hannah

- **Unscheduled list, tagged by window.** Each pass visit shows its kind, its window and its preference as the three words, with the customer's town. Today it is sorted but not tagged.
- **A "Season planning" view.** Not a new page: a fourth way to look at the Schedule, next to Week, Day and List, or a strip above the Unscheduled list. Rows are the weeks of a window (the turn-on has six, the blowout five). Each row says how many visits are planned there by preference (Early, Mid, Late), the open minutes left, and the towns, with Place all and drag to move. This is where "reorganize the schedule" happens: one picture of the window, before anyone is told. It uses the same Place preview and the same 60-second Undo strip.
- **A planned visit is marked as such.** "Ryan's plan" or "Told Apr 12" is read from whether the telling message row exists. Move on a planned visit offers Move without texting, because nothing has been told. Move on a told visit texts, as today.
- **Home.** One row on the day after a window closes for any pass visit with no day: the customer, the visit and the window. It offers Skip (the line is canceled, nothing is charged) or Place.

### The data model, in prose (additive only)

- **Per visit, a preference.** `visit.preference` exists for the turn-on and blowout. It should be allowed on any kind that is booked later, and it is written at purchase by the booking form, not left at "recommended".
- **The window.** No column. It is the service's own dates (`bookable_from`, `bookable_to`, as stage 7b makes the one truth), plus the year from the pass's season.
- **The placed day.** Already `visit.scheduled_on` and `person_id`; the exact time is `start_time`, whose meaning as a booked time arrives with stage 7b (a booked slot gets its own fact).
- **Told or not.** No column: derived from the visit's message row for its present day, as `windowTold` is, plus an event `visit.scheduled` whose detail says whether it was told. The `visit.confirmed` event already records a confirmation.
- **The confirm state.** "Waiting on customer" is already read from a `visit.moved` event with `asked: true`. The same reading can carry the two-weeks-out text's ask, as event detail only.
- **A visit not sold.** No row. The purchase's event can carry the visits that were not on the pass and why, as detail.
- **A window that passed.** The visit's status is `skipped` and its line is canceled, which already exist.
- **One setting to settle first.** The window dates must be one value, and whether `service.bookable_*` or `settings.windows` is the source of truth until 7b drops one (question 6).

## 6. Questions for Hannah

Each has a default I would take if you do not decide.

1. **How is the pass sold when it is bought out of season?** The pass can be bought only for what is still ahead, and from June to October that is a single blowout at the same price as booking one. Options: (A) as built, sell the visits still ahead at their normal prices, and invite the customer to next season from Nov 1; (B) from August, sell this fall's blowout and next spring's turn-on together as one pass; (C) stop selling the pass from June 1 to Oct 31 and send those customers to a single blowout booking. **Default: A,** because it is what the checkout does and what the Nov 14 scheduling design says ("Only the visits still ahead are sold, priced for those visits"), and it needs no new rule.
2. **When the nearest visit is months away, does the customer pick an exact day and time now?** A January buyer would pick a turn-on day one to three months out. **Default: yes, offer the day and time now,** with the change path the account already has, because you said to book the one closest and because a paid customer with no day was the Nov 13 complaint.
3. **When does the customer hear the day of the later visit?** The existing run tells them the moment it places the visit, up to four weeks ahead. **Default: Ryan's plan is made early and the customer is told two weeks before,** as you said, so the days are held for pass customers and nobody gets a second text about a day they were already given.
4. **If the customer's preferred part of the window is full when Ryan's plan is made, what happens?** **Default: the plan takes the nearest open day inside the window, and the two-weeks-out text shows the actual day with Change.** The visit shows for Ryan as needing a look, and it is never moved silently.
5. **A window closes and a visit has no day. What happens?** **Default: a Home row the next day, with Skip (the visit is dropped and nothing is charged) or Place (a late day, told like any move).** Today nothing happens.
6. **What are the pass's windows?** The turn-on opens Apr 25, Apr 26 or May 1, and the blowout closes Oct 31 or Nov 15, depending on which file you read. **Default: turn-on Apr 26 to May 31 and blowout Oct 1 to Oct 31,** which is what the seed and the planning design say. In the 2026 data 26 percent of blowouts happened from Nov 1, so those days stay open to single bookings.

## Sources

Fetched pages are linked inline in section 2. Repo files read: `docs/plans/2026-11-12-season-pass-checkout-prd.md`, `2026-11-13-checkout-scheduling-research.md`, `2026-11-13-scheduling-design.md`, `2026-11-18-scheduling-engine-design.md`, `2026-11-18-routes-and-seasons-answers.md`, `2026-11-18-week-planning-design.md`, `2026-11-19-booking-form-design.md`, `2026-11-19-customer-side-design.md`, `2026-11-20-customer-messages-inventory.md`, `docs/DATA_MODEL.md`, `src/lib/season-pass.ts`, `src/lib/pass/season.ts`, `src/lib/settings/defaults.ts`, `src/lib/scheduling/{schedule,offer}.ts`, `src/lib/scheduling/server/{daily,run,offers}.ts`, `src/lib/pass/server/chosen-days.ts`, `src/api/v1/passes/handlers.ts`, `src/api/v1/schedule/handlers.ts`, `src/lib/booking/{services,day-time}.ts`, `src/app/(booking)/booking/_screens/*`, `src/app/(checkout)/season-pass/checkout/_screens/*`, `src/app/(admin)/admin/_screens/{place-model,schedule-model}.ts`.

Not verified, and used for nothing above except where marked: Service Autopilot and Aspire first-party pages, ServiceTitan's bulk booking, the Jobber community thread, DoMyOwn, a mowing sign-up form's proration, and a renewal-calls post.
