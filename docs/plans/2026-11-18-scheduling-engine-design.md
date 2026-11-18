# The scheduling engine

Nov 18 2026. Design only; no code is built until Hannah and the architect have read this. It replaces the area groups behind `openSlots`, `offeredDays`, `spreadDays` and the straight-line `orderStops` with one engine that works from where the customer lives. It builds on `2026-11-18-week-planning-design.md` (the Jev seam), `2026-11-18-online-booking-design.md` (the flow that shows the days) and `2026-11-18-routes-and-seasons-answers.md` (PR #72, Jobber's 2026 numbers). Section 3 lists every rule already settled; sections 4 to 11 are built on them.

Hannah, Nov 18: "A customer comes online, they book, we should allow them to book automatically by optimizing our schedule so we surface times that work for where their address is... We need to be best in class here. And then we do need the ability to potentially move customers or add customers."

## 0. The job to be done and the rules already settled

When a customer books: "Show me days that work, soonest if it suits Ryan's route." When Ryan is on the phone: "Put her on a day where I'm already nearby, and tell me what breaks if I force it." When Ryan is on the route: "Never move a window I already told someone."

| Settled rule | Source |
|---|---|
| An Erie customer in April is offered the Tuesday Ryan already has three Erie turn-ons, then the next days with Erie work, then any open day; the first is preselected | Hannah, Nov 18 |
| A second customer on the street gets the same Tuesday, so days fill by neighbourhood; two trucks count both | Hannah, Nov 18 |
| Nobody in the town yet: the nearest open days are offered and the first booking seeds the day | Hannah, Nov 18 |
| Reschedule uses the same rule | Hannah, Nov 18 |
| No Routes or Seasons settings. Settings is People, Services, Billing, Messages, API keys | Hannah, Nov 18 |
| A customer picks a day, never a time; the window is told the day before | Hannah |
| Nothing is deleted; states are read from facts | CLAUDE.md |
| Cancel or move online closes 24 hours before the day | portal architecture doc, section 3 |

## 1. Research: what the tools do

Sources are vendor pages I opened on Nov 18 unless marked. "Not found" means the page does not say; nothing is filled in from memory.

| Tool | What it does | What we take | What we skip, and why |
|---|---|---|---|
| Jobber [online booking](https://help.getjobber.com/en/articles/online-booking/) | Earliest availability (example: 1 business day), start-time interval from business hours, per-person weekly availability. "Efficient scheduling" is one of three exclusive modes: max drive time from the client's address to that day's bookings, fixed buffer (30 min or 1 hour), or none. Drive time uses TravelTime with historical traffic. A service area radius refuses far addresses. | Max drive time measured from the address to the day's other bookings is exactly the shape of Hannah's rule. A lead time. A service-area refusal with a phone number. | The three modes are exclusive, so Jobber cannot both cluster and keep a buffer. Random assignment among free people. No ranking: a slot is shown or hidden. Numeric drive-time values and a per-day booking cap are not on the page. |
| Jobber [route optimization](https://help.getjobber.com/es/articles/route-optimization-new-schedule/) | Reorders only "anytime" visits for one person, a group or the team, up to 7 days; first and last visit can be pinned; admin only, on the website. Uses driving distance. | Fixed-time visits stay put; first and last stop pinned. | It cannot see a customer who is not yet booked. Stop limit, time windows and the drive-time method are not on the page. |
| Housecall Pro [booking settings](https://help.housecallpro.com/en/articles/7034474-new-online-booking-settings), [service areas](https://help.housecallpro.com/en/articles/9037360-service-areas-in-online-booking) | Flexible, fixed-start or manual scheduling; earliest availability (same day to 1 week); arrival window length; per-employee toggle; 30-minute slots from hours, duration and employees; service area is a zip list with a phone message outside it. | An arrival window shown as a length. A taken slot disappears at once. | Zip lists as the only geography. Drive time, a buffer and a daily cap are not on those pages. |
| Housecall Pro [Optimize by Drive Time](https://help.housecallpro.com/en/articles/14093813-optimize-by-drive-time) | Reorders one tech's day using road distance and live traffic (MAX plan); locked jobs stay; a job with a conflicting window is skipped with a warning. | Locked jobs and a warning instead of a silent change. | A dispatcher tool, not part of booking. |
| ServiceTitan [Scheduling Pro capacity](https://help.servicetitan.com/docs/set-up-capacity-and-availability-with-scheduling-pro-in-servicetitan-max.md), [capacity planning](https://help.servicetitan.com/docs/capacity-planning) | Open capacity is natural capacity (shifts or business hours) minus capacity consumed by jobs, counted in hours, filtered by business unit, skill and zone. Slot display has a date range (default 3 months), a lead buffer and blocked dates. | Capacity as hours left, not only a count. Skills and zones as filters. A blocked date. | Four capacity modes, one of them sunsetting. The slot-selection formula is not on the pages I opened. |
| ServiceTitan [Dispatch Pro routing](https://help.servicetitan.com/residential-s-r/docs/adjust-dispatch-pro-routing-settings) | A slider for the longest drive between appointments, recommended 60 minutes, with per-zone overrides. | A hard ceiling on drive between two stops. | How it estimates drive time is not on the page. |
| Zenbooker [drive-time-aware](https://help.zenbooker.com/en/articles/12454885-drive-time-aware-scheduling), [limit distance](https://help.zenbooker.com/en/articles/9468087-limit-distance-between-jobs) (Enterprise plan) | Estimates drive from the customer's address to each provider's jobs that day; pads by 15-minute bands (a 22-minute drive pads 15); hides start times without enough travel; a per-territory cap in miles between consecutive jobs, so one booking can open or close slots for others. | Distance from the new address to the day's jobs as the test; one booking changing what the next customer sees. | Bands and exact-time slots: we offer days, not times. Drawn territories: a job belongs to exactly one, which is the area grid we are removing. |
| [Zenbooker slots](https://help.zenbooker.com/en/articles/1804018-how-zenbooker-determines-bookable-time-slots) | Slots from provider hours minus job duration; a slot closes when every provider is assigned. | Job duration drives what is left. | Buffers and daily caps are not on the page. |
| Routific [how it routes](https://routific.com/smart-route-optimization), [pricing](https://routific.com/pricing/) | Time windows, shifts, skills, balancing; up to 5,000 orders per optimization; slots late orders in without a rebuild. $150 a month for 1,000 orders; 100 free. The algorithm is not named. | Late orders inserted without rebuilding the day. | A paid service for work we do on 20 stops in a function. |
| OptimoRoute [pricing](https://optimoroute.com/pricing/) | $35.10 (Lite) or $44.10 (Pro) per driver per month, billed annually. The algorithm is not named. | Nothing; it prices per driver. | Same as Routific. |
| Delivery slots: Truden and others, [Computational Approaches for Grocery Home Delivery](https://arxiv.org/pdf/2010.00385) | For each slot, try inserting the new customer into the existing tours; offer the slot if one feasible insertion exists; check again at booking; a background step re-optimizes to open more slots. Travel times between all pairs are needed and the check must take milliseconds. | **The core of our rule: a day is offered only if a feasible insertion exists, and the insertion cost ranks it.** Re-check at booking. | Slot pricing and hiding slots from unprofitable customers. |
| Delivery slots: [Agatz et al. 2011](https://pure.eur.nl/en/publications/time-slot-management-in-attended-home-delivery/), [Locus](https://locus.sh/blogs/delivery-slot-management-software-connecting-carrier-capacity-in-real-time/), [Shadowfax](https://shadowfax.in/blogs/building-for-unified-serviceability) | Which slots to offer per zip so routes stay cheap; a per-zone limit per window from route density and service time, four checks (eligibility, capacity, geography, route); free capacity per polygon precomputed and decremented per order. | A capacity count per day that each booking decrements; geography and route as separate tests. | Forecasts and polygons. Instacart, Amazon and Dispatch internals: not found. |
| [Google Routes API](https://developers.google.com/maps/billing-and-pricing/pricing) | Compute Route Matrix: Essentials $5.00 per 1,000 elements with 10,000 free a month; Pro $10.00 (5,000 free) adds traffic. 625 elements per request, 3,000 elements per minute. Lat/lng may be cached up to 30 days ([policies](https://developers.google.com/maps/documentation/routes/policies)); whether route times may be cached is not on the page. | Road times for the six towns once a second truck makes straight-line error matter. | Traffic-aware times: the six towns have little congestion and Pro costs double. |
| [OSRM](https://project-osrm.org/docs/v5.24.0/api/) | `table` returns a drive-time matrix. The [demo server](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server) allows one request a second, non-commercial. | The free offline fallback if Google's terms forbid caching. | We would host a container; Vercel cannot. |

**What the tools tell us.** In the pages I opened, Jobber, Housecall Pro and Zenbooker show or hide a slot; none describes ranking days or telling the customer "we are already in your town". The one published method that does rank is the delivery research: insert, measure the added route, offer if feasible. That is our rule. Max drive time (Jobber, ServiceTitan, Zenbooker) is the hard ceiling we add.

## 2. The use cases

Each is a story with what goes in and what must come out. Rules Hannah has settled (section 3) shape the outputs. Numbers are from Jobber's 2026 data (PR #72) unless marked.

| # | Story | In | Out |
|---|---|---|--- |
| 1 | **A new customer books a Season Pass.** Andrea, Erie, 8 zones, books on Fri Apr 24 | Address and point, zones, today, the two visits' windows (spring turn-on, fall blowout), the days Ryan and anyone else already have | For each of the two visits, a few days, one preselected, each with a reason in plain words ("We're already in Erie that day"). She picks, or accepts. Two visits made with their days; the day-before text will carry the window |
| 2 | **A new customer books a spring turn-on.** Same address, no pass | As above, one visit | Same days as story 1 for that date; first one preselected. If Ryan already has three Erie turn-ons on Tue Apr 28, that Tuesday is the first offer (Hannah's rule) |
| 3 | **A repair.** A broken head, today is Monday | Address, repair (about 2 hours, 3 a day at most) | The soonest workable days, tomorrow at the earliest |
| 4 | **A fall blowout in the rush.** Wed Oct 7, Erie | Address, blowout (about 30 minutes, 6 to 8 a person a day), a window of Sep 28 to Nov 15, 54 blowouts booked in the peak week | Days in the next 28 days that still have room; as a day fills, the next open day is offered, as far as the window runs (Nov 15); nobody is turned away |
| 5 | **A second customer on the same street.** An hour after story 2 | The same, plus Andrea's visit now on Tue Apr 28 | The same Tuesday first, so the day fills by neighbourhood, until it is full |
| 6 | **A town with no visits yet.** First Firestone booking of the spring | Address; Ryan has nothing in Firestone | The nearest open days, ideally days Ryan is in a nearby town (Longmont); the first booking seeds a day, the second Firestone customer then sees it with a neighbour |
| 7 | **A customer must be home.** Jim; the controller is inside | The same, plus "I need to be there" | The same days. The day-before text gives a window; the question is how narrow |
| 8 | **A customer reschedules online.** Andrea moves Tue Apr 28 to another day, 5 days ahead | Her visit, today, the 24-hour rule | The same offer, with her own slot not counted against the day; the old day is freed and its other stops re-ordered; Ryan sees "Andrea moved Tue to Thu". Inside 24 hours: "Text or call Ryan" |
| 9 | **A customer cancels.** One-off repair, 3 days ahead | Her visit, the 24-hour rule | Visit cancelled, line cancelled, the day's room returns for the next customer, a Home row for Ryan. Nothing is charged |
| 10 | **Ryan adds a customer by phone.** Mrs Tran calls while he is driving | A name, address, service, a day Ryan prefers | The same offers shown beside his day picker with their reasons, so he can see what the rule would suggest; he can pick any other day and sees what breaks (too long a day, over capacity, outside the dates, a window already told) |
| 11 | **Ryan moves a visit** to another day or to the second truck | A visit and a target day and person | The old and new day re-ordered; the customer texted the new day (split button: "Move and text the customer", or "Move without texting"; silence is yes, but a must-be-home property is asked "Reply YES or pick another day" and shows "Waiting on customer"); windows already told to other customers on either day are not changed behind their back |
| 12 | **A second truck is added mid-season.** Scott joined on Sep 21 in 2026 | A new person with working days and what they do per day; where they start | Offers count both people; a day can be full for one and open for the other; no existing visit moves |
| 13 | **A rain day.** Wed Oct 14, 15 stops, two people | Ryan marks the day rained out | Every visit that day needs a new day; each is offered days by the same rule; customers get the moved-date text with the reason |
| 14 | **An address outside the six towns.** Dacono (24 visits to Frederick, Dacono, Boulder and Westminster in 2026) | An address in none of the six | Online: "We don't serve that town yet. Call Ryan" and nothing is saved. By phone: Ryan can still add it |
| 15 | **The day before.** 6 pm Mon Apr 27, tomorrow's stops are ordered | The day's stops and their order | Each customer is told a two-hour window from that order. After the text goes out the window is a promise |
| 16 | **Ordering Ryan's day.** Tue Apr 28, five stops | The stops, their points, Ryan's start | A stop order, times from 8:00 with service minutes and drive, lunch, and a before-and-after: "Drive 94 min, now 71, saves 23" |

## 3. Decisions

### 3.1 Settled with Hannah (taken as given; not re-asked)

| # | Decision | Hannah's words or source |
|---|---|---|
| 1 | **Soonest first.** A customer is offered the soonest open days. Nearness to existing work orders the days within the soon range and breaks ties | "Customer service always comes first... getting them in quickly is priority" |
| 2 | The earliest day offered is tomorrow, if someone has room | Hannah |
| 3 | Capacity is counts per kind per person per day, as People holds today (six to eight blowouts a day). Service minutes only order the day and derive arrival windows | Hannah |
| 4 | When every day is full, keep offering the next open day as far as the service's bookable window runs. No waitlist, nobody turned away | Hannah |
| 5 | "Near" is three tiers: same town, then within about ten minutes' drive (fixed in code, no setting), then any open day | Hannah |
| 6 | Order the day runs only when pressed, with Undo. No held-back buffer | Hannah |
| 7 | Move is a split button: primary "Move and text the customer", caret "Move without texting"; Ryan may add a line. A moved customer need not confirm (silence is yes), except a `must_be_home` property: "Reply YES or pick another day", shown as "Waiting on customer" | Hannah |
| 8 | Every visit text carries a signed one-visit link that opens the visit signed in, with Reschedule and Cancel | Hannah |
| 9 | More than one truck is a requirement; a truck is a person on People | Hannah |
| 10 | No Routes or Seasons settings; the service carries bookable from and to dates | Hannah |
| 11 | Cancel or reschedule online closes 24 hours before the day; nothing is deleted; a customer picks a day, never a time | earlier rulings |

**How I will build the design from these, so you can stop me:** the offer is the replacement body of the one server door the portal already calls, `visits.areaDays` (and `schedule.offerDays` for a booking that has no visit yet), with the same input and the same list of days, plus an explain field per day ("We're already in Erie that day"). The screens do not change. Drive time starts as a straight-line estimate (the ten-minute tier needs only that). Saturday is whatever People says a person works. A two-hour window for everyone, including a must-be-home customer, unless told otherwise.

### 3.2 Settled by the architect, Nov 18 (from Q2 to Q4)

| # | Decision |
|---|---|
| 12 | An address outside the six towns: refused online ("We don't serve that town yet. Call Ryan"), nothing saved. Ryan may add it by phone, with a warning |
| 13 | A rain day: the app proposes each visit's day, Ryan reviews and presses one button, with Undo (the same shape as Order the day); each customer is texted the new day and the reason |
| 14 | Ryan adds or moves a visit onto a full day: warned with what breaks, one tick to allow. Online offers never exceed the count |
| 15 | The four assumptions in 3.1 stand: the offer replaces the body of `visits.areaDays` (and `schedule.offerDays`) with an explain field per day; straight-line drive time first; Saturday is what People says; a two-hour window for everyone |

### 3.3 Hannah's answer to Q1

| # | Decision |
|---|---|
| 16 | The soon range is the soonest five working days. Offer the three of those nearest to existing work, the first preselected. A repair is always offered the earliest open day first |

## 4. The offer rule

### 4.1 Inputs and constants

| Name | Value | Source |
|---|---|---|
| Customer point and town | the address from Places, geocoded; the town centre if no point | `property.lat/lng`, `mapPoint` |
| Service S | `kind`, `bookable_from`, `bookable_to` (new, section 11) | `service` |
| People | `working_days`, `capacity_by_kind` | `person` |
| Booked visits | `person_id`, `scheduled_on`, `kind`, property point; status not cancelled or skipped | `visit` |
| Day closed | a block on the person's day (Jobber feed until the exit) | `busy_block` |
| `FIRST` | tomorrow (decision 2), no earlier than `bookable_from` | rule |
| `LAST` | `bookable_to`; for a service with no dates, 56 days after `FIRST` | decision 4 |
| `SOON` | 5 open working days | decision 16 |
| `SHOWN` | 3, "Show more" gives the next five days ranked the same way | decision 16 |
| `NEAR_MINUTES` | 10 minutes' drive, fixed in code, no setting | decision 5 |
| Drive minutes | straight-line km times 1.95 (1.3 road factor at 40 km/h), so 10 minutes is 5.1 km | section 8 |

### 4.2 Pseudocode

```
offerDays(S, point, town, today, exceptVisitId?, page = 0) -> Offer[]
  if town not in SIX_TOWNS: return { outside: true, phone }        # nothing saved (decision 12)
  open = []
  for day in working weekdays from max(today + 1, S.bookable_from) to LAST:
    best = null
    for person p who works the weekday and is not blocked that day:
      stops = visits on (p, day) except exceptVisitId
      if count(stops of S.kind) >= capacity_by_kind[p][S.kind]: continue    # counts only (decision 3)
      same = count(stops in this town)
      near = min over stops of driveMinutes(point, stop.point), or none
      cand = (-same, near ?? inf, p != owner, p.id)
      best = min(best, cand)
    if best: open.push({ day, person, same, near })
  soon = open[page * SOON : (page + 1) * SOON]
  tier(o) = 0 if o.same > 0 else 1 if o.near <= NEAR_MINUTES else 2
  rank    = sort soon by (tier, tier0: more same-town stops first, tier1: nearer first, tier2: earlier date)
  offers  = first SHOWN of rank
  if S.kind == "repair" and page == 0: offers = [soon[0]] + first (SHOWN - 1) of rank without soon[0]
  preselect = offers[0]
  return offers sorted by date, each with { tier, same, near, label, preselected }
```

If no day is open before `LAST`, the screen says "We'll call you to find a day" and the job is made in Needs a day; the day-full wording of the portal is unchanged. Ties go to the earlier date, then the lower person id. Presentation choice for the architect: the three days are shown in date order with the preselected one marked, because within a week out-of-order dates read badly; showing them in rank order is a one-line change in the screen.

**What the customer reads under each day** (sentence case, no times):

| Tier | Line |
|---|---|
| 0 | We're already in Erie that day. |
| 1 | We're close by that day. |
| 2, the first day | Soonest open day. |
| 2, others | Open day. |
| repair, first day | Soonest we can come. |

### 4.3 Worked example: Ryan's April

Today Fri Apr 24; Ryan works alone; cap 5 turn-ons a day, 3 repairs. The output is the rule run on these stops in a throwaway script (positions are Erie coordinates I chose, not real customers).

| Day | What Ryan already has |
|---|---|
| Mon Apr 27 | nothing |
| Tue Apr 28 | three Erie turn-ons, Briggs St area |
| Wed Apr 29 | a Longmont turn-on and a Longmont repair |
| Thu Apr 30 | one Erie repair, west side |
| Fri May 1 | a Lafayette turn-on |
| Mon May 4 | two Erie turn-ons |

The five soonest open days are Mon Apr 27 to Fri May 1 (May 4 is the sixth, so not in the soon range).

| Customer | Tier of each day in the soon range | Offered (date order, preselected first in rank) |
|---|---|---|
| A. 480 Briggs St, Erie, turn-on | Tue 0 (3 Erie stops), Thu 0 (1 Erie, 4 min), Mon 2, Wed 2 (27 min), Fri 2 (14 min) | Tue Apr 28 (**preselected**, "We're already in Erie that day."), Thu Apr 30 (same line), Mon Apr 27 ("Soonest open day") |
| B. A neighbour an hour later | Tue now has 4 Erie stops | Tue Apr 28 preselected again, until Tuesday hits 5 turn-ons; then it is full and falls out |
| C. Longmont, turn-on | Wed 0 (2 Longmont stops, 2 min), the others 2 | Wed Apr 29 preselected, then Mon Apr 27 and Tue Apr 28 (the soonest of the rest) |
| D. Firestone, turn-on | all 2: no Firestone work, Longmont is 30 minutes away | Mon Apr 27 preselected, Tue, Wed: the soonest days; the first booking seeds Monday |
| E. Erie repair | same days as A | Mon Apr 27 (soonest, preselected, "Soonest we can come."), Tue Apr 28, Thu Apr 30 |

A fix I made while running it: tier 2 is ranked by date only. An earlier version ranked far-away days before empty days, which put Firestone on a day with a Longmont stop 30 minutes off instead of the soonest empty day.

## 5. Ordering the day

**When.** Only when Ryan presses Order the day on the Schedule day or Home's Today, with Undo (decision 6). Nothing re-orders on its own. A visit placed or moved takes the next stop number on that person's day and no time (it reads "Any time"); a day nobody has ordered still has a usable order, the order the stops were added.

| Step | Rule |
|---|---|
| Stops | Visits on (person, day), status scheduled |
| Pinned | A visit whose day-before text has gone out (a `message_log` row of kind `day-before`, key `<visitId>-<day>`) keeps its `start_time` and its place relative to other pinned stops; the preview lists them with a lock |
| Start | The person's start point: `person.start_lat/lng`, else the shop in Erie. First stop at 8:00 (`FIRST_STOP`) |
| Order | Nearest neighbour from the start, then 2-opt until no reversal shortens the route, pinned stops held in place. Deterministic |
| Times | `start_i = max(end_{i-1} + drive_i, pinned start_i)`; service minutes from `visit.duration_minutes`, else the kind's default. Minutes are used here and for windows, never for who may book (decision 3) |
| Lunch | 30 minutes at the first stop boundary after 11:30, dropped if the day ends before 13:00 |
| End | 17:00. A longer day is not refused; the preview says "Ends 5:40 pm" |
| Window | ETA rounded down to 30 minutes, never before 8:00, two hours (`twoHourWindow`). A must-be-home customer gets the same two hours (assumption, section 12) |
| Told | The window is told by the daily run the evening before; from then it is a pin |

**Preview, Apply and Undo.**

```
Order Tuesday, Apr 28      Ryan Garner                      [Cancel] [Apply]
                 Before                       After
 1  Briggs St    8:00                          8:00  Briggs St
 2  Cheesman St  8:35                          8:40  ...
 Drive           94 min                        71 min          saves 23 min
 Windows told    2 stops stay (told Monday)    unchanged
After Apply:  "Ordered Tuesday. Undo"
```

Apply writes `stop_order` and `start_time` (the same columns) and one `visit.ordered` event per visit that changed, each carrying its old order and time and a batch id. Undo reads that batch and puts every value back, if no visit on the day has changed since.

**Two people on a day.** Assign before ordering: sort the day's stops by angle around the start point and cut into one contiguous sweep per person, weighted by what each person has left; then order each. It beats ordering one list and cutting it, since two trucks should not cross town. Stage 6 builds it; until then the visit's person is the one the offer chose.

**When a real solver is worth it.** Not at 20 stops: nearest neighbour plus 2-opt is within a few percent of optimal in milliseconds, and delivery research says the feasibility check itself must finish in milliseconds ([Truden et al.](https://arxiv.org/pdf/2010.00385)). A solver (VROOM, or Google Route Optimization, whose per-shipment price I could not find) earns its place when three or more people share a day or customers have hard time windows. Routific is $150 a month for 1,000 orders; our 508 visits a season would fit it, and we do not need it yet.

**The day-before run** derives each told window from the stored order (a read-only calculation) and writes `start_time` only for the visits it is texting, which is what makes the window a pin. It never reorders a day.

## 6. Moving, adding and cancelling

| Action | What happens | Frozen | Ryan sees |
|---|---|---|---|
| Customer picks or reschedules (`visits.pick`, from the signed link or the portal) | Offer re-run with the visit's own slot excluded; the visit moves; the old day's room returns | Told windows on both days | Home row "Andrea moved Tue to Thu" |
| Customer cancels (`visits.cancelSelf`, closes 24 hours before) | Visit cancelled; capacity returns because it is counted from facts | Told windows | The freed day; Home row |
| Ryan adds by phone (`visits.create` with a day) | The offers are shown beside his day picker with their lines; he may pick any day | Told windows | The conflict list below for a day the rule would not offer |
| Ryan moves a visit (`visits.move`) | Split button: primary **Move and text the customer**, caret **Move without texting**; he may add a line to the text | Told windows on other visits | The conflict list |
| A moved customer | Silence is yes. A `must_be_home` property gets "Reply YES or pick another day" and the visit shows **Waiting on customer** until a `visit.confirmed` or `visit.picked` event follows the move | | Waiting on customer on the visit and the Home row |
| Rain day | Ryan marks a person's day; each of its visits is proposed the soonest, nearest day by the same rule (the rained-out day and past days excluded) | A day that is past | A list: who moves where, with the lines, one button **Move all and text**, then Undo (the same shape as Order the day). A must-be-home visit shows Waiting on customer |
| Second truck | A new person; the offer counts both; no visit moves | Everything booked | People tab only |

**Waiting on customer is read from facts.** A `visit.moved` event with `detail.asked: true` and no later `visit.confirmed` or `visit.picked` on the visit. The inbound text handler writes `visit.confirmed` on "YES".

**The day-before rule.** After a visit's day-before text has gone out, nothing the engine does changes its `start_time`. Ryan can move a pinned window on purpose: the split button asks, and the default text is "Your window changed to 10 am to 12 pm". An insertion that would push a pinned stop later than its told window by more than 30 minutes is listed as a conflict.

**Conflicts Ryan sees** (a warning list with one tick to allow, decision 14; online offers never exceed the count):

| Conflict | Hard or soft | Words |
|---|---|---|
| Visit done, cancelled or skipped | hard | "This visit is done." |
| Person inactive or not on the schedule | hard | "Tech Two is not on the schedule." |
| At or over the person's count for the kind | soft | "Ryan has 6 blowouts that day." |
| Person does not work that weekday | soft | "Ryan does not work Saturdays." |
| Outside the service's bookable dates | soft | "Fall blowout opens Sep 28." |
| Address outside the six towns | soft | "Outside the six towns." |
| Day would end after 5 pm (from stored order and service minutes) | soft | "The day ends at 5:40 pm." |
| Breaks a told window | soft | "Hannah was told 8 to 10 am." |

Today `placeVisit` throws on capacity and on a different area. The area check goes with `area`; the capacity check becomes soft for staff.

## 7. Capacity

| Test | Rule | Source |
|---|---|---|
| Count | `count(kind on (person, day)) < capacity_by_kind[person][kind]` | `person.capacity_by_kind` (decision 3) |
| Working day | the person works the weekday | `person.working_days` |
| Open | no block that day | `busy_block` |
| Minutes | not a test; used to order the day, derive windows and warn "ends after 5 pm" | `visit.duration_minutes`, `defaultMinutes` |

No buffer is held back (decision 6). **Full:** a day is full for a kind when every working person is at their count. A town is never "full": the offer keeps walking days to `LAST` (decision 4). What the numbers should be is Ryan's call: PR #72 shows one person comfortable at 6 blowouts and topping out at 7 or 8, a repair day of up to 3, turn-ons never above 1 a day in 2026 (demand, not capacity). The People defaults in the schema (turn-on 8, inspection 8, blowout 10, repair 4) are higher than the data supports for offers; I recommend blowout 6, turn-on 5, inspection 3, repair 3, and Ryan adds beyond them by hand with the warning. Fall peak, 54 blowouts in a week: one person at 6 a day holds 30, two hold 60, so two people fit the week and one person's overflow is offered into the following weeks, inside the Nov 15 window as far as it runs.

## 8. Drive time

| Stage | Source | Cost | Used for |
|---|---|---|---|
| Now | Straight line times 1.3 at 40 km/h, so 1.95 minutes a kilometre | none | the 10-minute tier, ordering, windows |
| Later | Google Routes API, Compute Route Matrix Essentials (no traffic) | $5.00 per 1,000 elements; 10,000 free a month ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing)); 625 elements a request | ordering and windows once a second truck makes errors matter |
| If Google's terms forbid caching | OSRM `table` in a container we host | a server | the same |
| Fallback | the straight-line row | none | any failure or call over 2 seconds |

**Why straight line is enough now.** The offer only asks one question of drive time: is the nearest stop within about ten minutes? A 20 percent error moves that threshold by a kilometre. Ordering and windows are where a road time earns its cost, which is why it comes after the offer ships.

**Cache.** Key: a pair of rounded coordinates (4 decimals, about 11 m); value: minutes and km. Google's [policy page](https://developers.google.com/maps/documentation/routes/policies) allows caching lat/lng for up to 30 days and does not say route times may be cached; I could not open the terms. Treat the TTL as 30 days until Google confirms. That cache is this design's only new table, `drive_time`, and only at stage 7. **Fallback:** on any Google error, timeout (2 seconds) or quota, use the straight-line time, mark the order `estimated`, write nothing to the cache. An offer is never blocked by the matrix.

## 9. Simulation: 2026 replayed through Hannah's rule

**Method.** Throwaway script, not committed (saved in the shared notes folder). Data: the saved Nov 12 Jobber pull (599 visits): 107 calendar blocks and 1 unscheduled dropped, aeration and 24 visits outside the six towns dropped, **466 customer visits** (PR #72 counts 508 because it adds 11 created after the pull and the 24 outside). Kind from the catalogue service; name-only visits in October and November count as blowouts, otherwise repairs. Each visit is replayed in the order it was created: tomorrow is the first day, the five soonest open days, the three nearest offered, **one of two customer behaviours**: (a) takes the preselected day, (b) takes the offered day closest to the day they really got. Two people from Sep 21, one before. Counts per person per day: blowout 6, turn-on 5, inspection 3, repair 3, no minutes test. Drive is straight line times 1.95 minutes a kilometre; the route is nearest neighbour and 2-opt from an Erie depot. **Coordinates:** Nominatim geocoded each distinct street name with its town (no house numbers, no customer names; 287 queries); 385 of 466 visits got a street point, the rest and any match over 20 km from its town (a same-named street in another state) use the town centre.

**Result** (kilometres are straight line, summed over every driving day):

| Arm | Driving days | Stops per day | Km | Days with 2+ towns | Erie days |
|---|---|---|---|---|---|
| Actual (Ryan and Scott) | 166 | 2.81 | 3,360 | 85 | 124 |
| Soonest open day, no nearness | 153 | 3.05 | 3,402 | 81 | 131 |
| Hannah's rule, customer takes the preselected day | 153 | 3.05 | 3,413 | 82 | 131 |
| Three soonest days only (Jobber-style), customer takes the closest to the day they got | 158 | 2.95 | 3,456 | 88 | 134 |
| **Hannah's rule, customer takes the closest of the three to the day they got** | **158** | **2.95** | **3,463** | **88** | **133** |
| Soon range 3 or 10 instead of 5, same behaviour | 158 | 2.95 | 3,456 to 3,463 | 88 | 133 to 134 |

**Headline.** At 2026 volume the nearness part of the rule changes almost nothing. The rule with the preselected day gives 153 driving days, the same as no nearness at all; it moved the preselected day away from the soonest open day for 3 of 466 bookings (at most 3 days). Against what Ryan and Scott actually did, 153 to 158 days is 5 to 8 percent fewer, and that comes from offering the soonest day under a count cap, not from nearness. Kilometres are 3 percent higher, not lower. The three soon ranges (3, 5, 10) differ by less than one day.

**Why nearness does not bite, and what that means.**

| Finding | Number |
|---|---|
| Demand is sparse: 466 visits over about 170 weekdays; Erie averaged 2.4 stops on its driving days | 296 Erie visits in 124 Erie days (actual) |
| In the preselected arm, how many bookings land on a day that already had work in their town (tier 0) | 187 of 466 (40 percent); in all but 3 of the 466 the preselected day was simply the soonest open day |
| A customer who takes the closest of three to their real day waits a median 2 days longer than the soonest (mean 2.4, 90th percentile 4, most 6) | their own choice |
| Fall peak week (Oct 19 to 23): Ryan and Scott 48 stops over five days, the rule 37 (the rest placed in earlier weeks); busiest day 8 stops against 9 | the 6 per person cap holds |
| Customers offered a day later than the one they got | 19 of 466 with the preselected arm (4 percent), 4 by 3 days or more, none by 7 |
| Customers with no day offered | 0 |

A previous version of this rule, with a "same weekday as the town was last worked" term and a 7-day reach, got 130 driving days (22 percent fewer) and 3 percent less drive, but it offered 18 percent of customers a later first day than they got. That is the trade Hannah's rule gives up on purpose (decision 1: soonest first). It is the lever to pull later, if she wants density; I recommend measuring a season of real online bookings first.

**What the rule gets wrong, and what the replay cannot show.**

| Limit | Effect |
|---|---|
| "Takes the first" makes every customer book the soonest day, so a replay of a year of bookings piles each on the next open day and the rule never meets a seeded day a week ahead | The first arm is unrealistically kind to soonest-first; the second arm (closest to the real day) is nearer the truth |
| Real customers pick a date, not the soonest: 61 percent of fall visits were picked online from any day (PR #72) | A preselected day with a clear line ("We're already in Erie") may be accepted more often than a bare date; no data says how often |
| No cancels, reschedules, rain, Saturdays (35 of 466 visits) or calendar blocks | Real density will differ both ways |
| Ryan's depot is in Erie; nothing in the offer measures it | Erie is ranked by same-town stops only |
| Street-level points; 81 visits use a town centre | Distances under about half a kilometre are noise |
| One season, an account opened in March | Treat the numbers as a direction |

## 10. The Jev seam

Jev is not in the booking path: a model takes 30 to 90 seconds and a customer needs an answer in under a second. Jev replaces two pure functions behind the same types, and reads and writes only through the API.

| Seam | Today | Jev may replace | Inputs | Outputs |
|---|---|---|---|---|
| `offerDays` | section 4.2 | the ranking within the soon range | the open days with `{ same, near }` each, the service, the customer point | an ordered list of days with one reason line each |
| `orderStops` | nearest neighbour plus 2-opt | the algorithm, for a day that needs a solver | stops, pinned stops, a drive matrix, the start point | an order and the minutes saved |
| plan | none | whole-week planning (week-planning design, section 4) | `schedule.week`, `schedule.day`, `people.list`, `visits.list` | one write, `schedule.plans.create`, accepted by Ryan and applied through `visits.move` |

Records never change shape. Jev reads `visit`, `person`, `property`, `service` and writes only a plan. The rules in section 6 are enforced by the app on accept, so Jev cannot break a told window or exceed a count online.

## 11. Data and API

**The one function that changes.** Today the portal's `visits.areaDays` and `visits.pick` call `openSlots` and `offeredDays` in `src/lib/pass/server/area-days.ts`, and the checkout's `schedule.offerDays` calls `openSlots` and `spreadDays`. The engine replaces those bodies with one pure function, `offerDays` in `src/lib/scheduling/offer.ts` (section 4.2), loaded by one server function, `offerFor(db, input, today, { page })` in `area-days.ts`. The portal and the checkout call it with no screen change.

| Handler | Input | Output change |
|---|---|---|
| `visits.areaDays` | unchanged (`id`) plus optional `page` | `days` stays (the list of day strings, so the portal builds today); adds `offers: [{ day, personId, personName, label, tier, preselected, window? }]` where `label` is the line in 4.2 ("We're already in Erie that day.") and `tier` is 0, 1 or 2 |
| `schedule.offerDays` | `town`, `kind`, `season`, `zones` kept; adds `serviceKey`, `lat`, `lng`, `visitId?`, `page` | `days[]` gains `label`, `tier`, `preselected`; drops the 3-day spread |
| `visits.pick` | unchanged | accepts any day that is open now inside the window (hard rules only: capacity, working day, dates), not only the three shown, because "Show more" pages exist; the event stores what was offered |
| `visits.move`, `visits.create` | `confirm?: true` | return `warnings[]`; with `confirm: true` the soft conflicts are written; add `notify: "text" \| "none"` and `note?` for the split button |
| `visits.cancelSelf`, `visits.cancel` | unchanged | free the day; no capacity table, since capacity is counted |
| `schedule.orderDay` (new) | `{ personId, day, apply?, undoBatch? }` | preview: before, after, drive minutes saved, pinned stops; `apply` writes and returns a batch id; `undoBatch` restores |
| `schedule.rainOut` (new) | `{ personId, day, apply?, undoBatch? }` | the same shape as `orderDay`: a list of proposed moves, then one apply with texts, then Undo |

**Columns** (no new table before stage 7):

| Column | Row for `docs/DATA_MODEL.md` |
|---|---|
| `service.bookable_from`, `service.bookable_to` | text `MM-DD`, nullable (both null: all year). Set in Settings › Services. Read by the offer, the booking picker's "Opens Apr 25", the move warning. Replaces `settings.windows` and the Seasons tab; no Routes or Seasons settings (decision 10) |
| `person.start_lat`, `person.start_lng` | real, nullable; where the person's day begins. Null: the shop in Erie. Set on People. Read by Order the day. Stage 6 |

Told windows are read from `message_log` and `visit.start_time`; capacity from `person.capacity_by_kind`; stop order and time stay in `visit.stop_order`, `visit.start_time`. `area` and its four settings are dropped after stage 1; nothing reads them.

**Events** (new kinds in `src/lib/events/kinds.ts`, with words): `visit.scheduled` and `visit.moved` detail gain `offered: [{ day, tier }]` and `rank`, so an ignored offer is visible; `visit.moved` gains `asked: true` and `reason: "rain"` where they apply; `visit.confirmed` (reply YES); `visit.ordered` (old and new order and time, batch id).

**Tests, one per use case** (pglite for handlers, plain unit tests for the pure rule):

| Case | Test |
|---|---|
| New booking, each kind | The April example: A gets Tue Apr 28 preselected with tier 0; the repair gets Mon Apr 27 first |
| Second customer, same street | Tuesday stays first until the count, then drops out |
| Quiet town | Firestone gets the three soonest days |
| Reschedule | The visit's own slot is excluded; the old day's room returns |
| Cancel frees | After `visits.cancelSelf`, `offerDays` shows the day again |
| Ryan adds by phone | A day over the count returns a warning; `confirm` writes it |
| Move and text, move without texting | One queues `date-moved` with Ryan's line, the other none; a must-be-home visit shows Waiting on customer until `visit.confirmed` |
| Order the day | Preview matches Apply; Undo restores each visit; a told window does not change |
| Rain day | Proposals use the same rule; Apply texts each; Undo restores |
| Second truck | A new person: a day both could take offers one; no old visit moves |
| Fall rush | 54 blowouts in a week with two people at 6 fit; the next are offered in week three, to the window's end |
| Outside the six towns | `{ outside: true }`, nothing saved |
| No open day before `LAST` | "We'll call you", a job in Needs a day |
| Day-before rule | After the text goes out, Order the day leaves that `start_time` unchanged |
| Matrix down | A stub that throws: ordering returns `estimated`; the offer is unaffected |
| Replay | The simulation on an anonymised fixture of points, no names: 153 to 158 days, within 3 |

## 12. Build order and what is still open

| Step | Ships |
|---|---|
| 1 | `offer.ts`, `offerFor`; `visits.areaDays` and `schedule.offerDays` return `offers` with labels; `service.bookable_from/to`; the April tests; `area` dropped |
| 2 | `visits.pick` takes any open day; "We're already in Erie" lines on the checkout and the portal; the offered snapshot on events |
| 3 | Order the day: preview, Apply, Undo, pinned windows, the day-before run deriving windows |
| 4 | The Move split button, the conflict list, Waiting on customer, YES replies |
| 5 | Rain-out review |
| 6 | Second truck: `person.start_lat/lng`, the sweep assignment |
| 7 | Road times: Google matrix and the `drive_time` cache, OSRM if caching is not allowed |
| 8 | The Jev plan seam |

**Open, in order of how much they matter:**

1. **Nearness barely changes anything at 2026 volume (section 9).** Keep the rule as Hannah set it and measure a season of online bookings, or add the weekday habit (130 days, 22 percent fewer, but 18 percent of customers offered a later day)? Recommended: keep soonest first, measure.
2. **Who writes `start_time`?** With Order the day only when pressed, I have the evening run write `start_time` for the visits it texts so the told window is a pin. Confirm.
3. **Blowout count on People: 6 or 8?** Recommended 6, with Ryan adding to 8 by hand and a warning.
4. **Date order with the preselected day marked, or rank order?** Recommended date order.
5. **Google may not allow caching of route times.** Check with Google before stage 7; OSRM is the fallback.
