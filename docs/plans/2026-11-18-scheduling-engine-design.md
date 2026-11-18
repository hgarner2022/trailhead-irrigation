# The scheduling engine

Nov 18 2026. Design only; no code is built until Hannah and the architect have read this. It replaces the area groups behind `openSlots`, `offeredDays`, `spreadDays` and the straight-line `orderStops` with one engine that works from where the customer lives. It builds on `2026-11-18-week-planning-design.md` (the Jev seam), `2026-11-18-online-booking-design.md` (the flow that shows the days) and `2026-11-18-routes-and-seasons-answers.md` (PR #72, Jobber's 2026 numbers). Section 3 lists every rule already settled; sections 4 to 11 are built on them.

Hannah, Nov 18: "A customer comes online, they book, we should allow them to book automatically by optimizing our schedule so we surface times that work for where their address is... We need to be best in class here. And then we do need the ability to potentially move customers or add customers."

## 0. The job to be done and the rules already settled

When a customer books: "Show me days and times that work, soonest if it suits Ryan's route." When Ryan is on the phone: "Put her on a day where I'm already nearby, and tell me what breaks if I force it." When Ryan is on the route: "Never move a window I already told someone."

| Settled rule | Source |
|---|---|
| An Erie customer in April is offered the Tuesday Ryan already has three Erie turn-ons, then the next days with Erie work, then any open day; the first is preselected | Hannah, Nov 18 |
| A second customer on the street gets the same Tuesday, so days fill by neighbourhood; two trucks count both | Hannah, Nov 18 |
| Nobody in the town yet: the nearest open days are offered and the first booking seeds the day | Hannah, Nov 18 |
| Reschedule uses the same rule | Hannah, Nov 18 |
| No Routes or Seasons settings. Settings is People, Services, Billing, Messages, API keys | Hannah, Nov 18 |
| A customer picks a day AND an exact start time from the open slots; that time is the promise (Jobber's own booking form works this way; the earlier "a day, never a time" came from the Nov 12 pass checkout design, not from Hannah) | Hannah, Nov 18 |
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
|---|---|---|---|
| 1 | **A new customer books a Season Pass.** Andrea, Erie, 8 zones, books on Fri Apr 24 | Address and point, zones, today, each visit's bookable dates, every booked visit with its time | For each of the two visits, a few days, one preselected, each with a line ("We're already in Erie that day"), and on the chosen day the open start times. She picks a day and a time; both visits are made with those times. The day-before text confirms each |
| 2 | **A new customer books a spring turn-on.** Same address, no pass | As above, one visit of 60 minutes | The same, for that date. If Ryan already has three Erie turn-ons on Tue Apr 28, that Tuesday is the first day offered, with the few start times left on it (Hannah's rule) |
| 3 | **A repair.** A broken head, today is Monday | Address, repair (120 minutes, 3 a day at most) | The earliest open day first, then the two nearest; each day's open 2-hour slots. Tomorrow at the earliest |
| 4 | **A fall blowout in the rush.** Wed Oct 7, Erie | Address, blowout (30 minutes, 6 to 8 a person a day), bookable Sep 28 to Nov 15, 54 blowouts booked in the peak week | Days with a slot and room, soonest five, nearest three; as a day fills the next open day is offered, as far as Nov 15; nobody is turned away |
| 5 | **A second customer on the same street.** An hour after story 2 | The same, plus Andrea's visit now on Tue Apr 28 at 4:30 pm | The same Tuesday first, with the slots next to hers ranked first ("Next to another Erie visit"), until the day is full |
| 6 | **A town with no visits yet.** First Firestone booking of the spring | Address; Ryan has nothing in Firestone | The soonest open days and their times; the first booking seeds a day; the second Firestone customer then sees it with a neighbour |
| 7 | **A customer must be home.** Jim; the controller is inside | The same, plus "I need to be there" | The same days and times; he picks a time that suits him, and that is the promise |
| 8 | **A customer reschedules online.** Andrea moves Tue Apr 28 4:30 pm | Her visit, today, the 24-hour rule | The same offer with her own slot excluded, so her old time can be offered again; she picks a new day and time; the old day is freed and Ryan sees "Andrea moved Tue to Thu". Inside 24 hours: "Text or call Ryan" |
| 9 | **A customer cancels.** One-off repair, 3 days ahead | Her visit, the 24-hour rule | Visit cancelled, line cancelled, her slot opens for the next customer, a Home row. Nothing is charged |
| 10 | **Ryan adds a customer by phone.** Mrs Tran calls while he is driving | Name, address, service, a day and time she wants | The open slots shown beside his day picker with their lines; he can pick any time, or "Any time" (no booked time), and sees what breaks (overlap, no room for the drive, over the count, outside the dates) |
| 11 | **Ryan moves a visit** to another day, time or person | A visit and a target day, time and person | The old and new day updated; a move of a booked time always texts the customer (a visit with no booked time keeps "Move without texting"); a must-be-home property is asked "Reply YES or pick another day" |
| 12 | **A second truck is added mid-season.** Scott joined on Sep 21 in 2026 | A new person with working days, hours and counts | Slots open for either person; no existing visit moves |
| 13 | **A rain day.** Wed Oct 14, 15 stops, two people | Ryan marks the day rained out | Each visit gets a proposed new day and the open time nearest its old time; one button, texts, Undo |
| 14 | **An address outside the six towns.** Dacono (24 visits in 2026 to Frederick, Dacono, Boulder, Westminster) | An address in none of the six | Online: "We don't serve that town yet. Call Ryan", nothing saved. By phone Ryan can add it with a warning |
| 15 | **The day before.** 6 pm Mon Apr 27 | Tomorrow's booked visits | Each customer gets a text that confirms the booked time ("Ryan is coming tomorrow at 4:30 pm"); a visit with no booked time gets the day only |
| 16 | **Ordering Ryan's day.** Tue Apr 28 with three booked times and two "Any time" visits | The stops, their points, Ryan's start | Booked times stay; the untimed stops are ordered into the gaps; before and after with drive minutes saved; Undo |

## 3. Decisions

### 3.1 Settled with Hannah (taken as given; not re-asked)

| # | Decision | Hannah's words or source |
|---|---|---|
| 1 | **Soonest first.** A customer is offered the soonest open days. Nearness to existing work orders the days within the soon range and breaks ties | "Customer service always comes first... getting them in quickly is priority" |
| 2 | The earliest day offered is tomorrow, if someone has room | Hannah |
| 3 | Capacity is counts per kind per person per day, as People holds today (six to eight blowouts a day). Service minutes set the slot length and whether a slot fits between booked visits, never how many visits a person may take | Hannah |
| 4 | When every day is full, keep offering the next open day as far as the service's bookable window runs. No waitlist, nobody turned away | Hannah |
| 5 | "Near" is three tiers: same town, then within about ten minutes' drive (fixed in code, no setting), then any open day | Hannah |
| 6 | Order the day runs only when pressed, with Undo. No held-back buffer | Hannah |
| 7 | Move is a split button: primary "Move and text the customer", caret "Move without texting" (for a visit with no booked time only, decision 17); Ryan may add a line. A moved customer need not confirm (silence is yes), except a `must_be_home` property: "Reply YES or pick another day", shown as "Waiting on customer" | Hannah |
| 8 | Every visit text carries a signed one-visit link that opens the visit signed in, with Reschedule and Cancel | Hannah |
| 9 | More than one truck is a requirement; a truck is a person on People | Hannah |
| 10 | No Routes or Seasons settings; the service carries bookable from and to dates | Hannah |
| 11 | Cancel or reschedule online closes 24 hours before the day; nothing is deleted | earlier rulings |

**How I build the design from these:** the offer is the replacement body of the one server door the portal already calls, `visits.areaDays` (and `schedule.offerDays` for a booking that has no visit yet), with the same input, the same list of days, and per day an explain line and the open start times. Drive time starts as a straight-line estimate with a cushion. Saturday is whatever People says a person works.

### 3.2 Settled by the architect, Nov 18 (from Q2 to Q4)

| # | Decision |
|---|---|
| 12 | An address outside the six towns: refused online ("We don't serve that town yet. Call Ryan"), nothing saved. Ryan may add it by phone, with a warning |
| 13 | A rain day: the app proposes each visit's day, Ryan reviews and presses one button, with Undo (the same shape as Order the day); each customer is texted the new day and the reason |
| 14 | Ryan adds or moves a visit onto a full day: warned with what breaks, one tick to allow. Online offers never exceed the count |
| 15 | The four assumptions in 3.1 stand: the offer replaces the body of `visits.areaDays` (and `schedule.offerDays`) with an explain field per day; straight-line drive time first; Saturday is what People says. (The fourth, a two-hour window for everyone, is replaced by decision 17: a booked time) |

### 3.3 Hannah's answer to Q1, and the change to times

| # | Decision |
|---|---|
| 16 | The soon range is the soonest five working days (days with an open slot). Offer the three of those nearest to existing work, the first preselected. A repair is always offered the earliest open day first |
| 17 | **A customer picks a day and a start time** from the open slots of that day, as on Jobber's live booking form (slots such as "12:00 PM to 12:30 PM" the length of the service, drawn from the open gaps around existing appointments). The booked time is the promise | Hannah, via the parent session, Nov 18 |
| 18 | The booked time is written to `visit.start_time` at booking. Order the day keeps booked times fixed and orders only untimed stops around them. A move of a booked time always texts the customer. The day-before text confirms the booked time; the "we'll text your window" rule is gone | Hannah, via the parent session |

## 4. The offer rule

The offer returns days, and for each day the open start times. Days are ranked soonest first with nearness (section 3, decisions 1, 5, 16); within a day the slots are ordered by how little drive they add.

### 4.1 Inputs and constants

| Name | Value | Source |
|---|---|---|
| Customer point and town | the address from Places, geocoded; the town centre if no point | `property.lat/lng`, `mapPoint` |
| Service S | `kind`, `bookable_from`, `bookable_to` (new, section 11); length in minutes = the visit's service minutes | `service`, `slot_minutes` |
| People | `working_days`, `capacity_by_kind`, `day_start`, `day_end` (new: hours, default 08:00 to 17:00) | `person` |
| Booked visits | `person_id`, `scheduled_on`, `start_time` (null: "Any time"), `duration_minutes`, kind, property point; status not cancelled or skipped | `visit` |
| Blocked time | a block on the person's day (Jobber feed until the exit) | `busy_block` |
| `FIRST` / `LAST` | tomorrow (no earlier than `bookable_from`) / `bookable_to`, or 56 days for a service with no dates | decisions 2, 4 |
| `GRID` | slots start every 30 minutes from `day_start` | Jobber's form shows 30-minute starts |
| `SOON`, `SHOWN` | 5 open days, 3 offered; "Show more" gives the next five days ranked the same way | decision 16 |
| `NEAR_MINUTES` | 10 minutes' drive, fixed in code | decision 5 |
| Drive minutes | straight-line km times 1.95 (1.3 road factor at 40 km/h) | section 8 |
| `gap(d)` | the room required between two visits for a drive of `d` minutes: `max(10, ceil5(1.25 * d))`, a 25 percent cushion | mine; the replay uses it |

### 4.2 Pseudocode

```
slotsFor(S, point, day, exceptVisitId?) -> Slot[]
  for person p who works the weekday:
    timed = visits on (p, day) with start_time, except exceptVisitId, sorted by start
    if count(visits of S.kind on (p, day)) >= capacity_by_kind[p][S.kind]: continue   # counts (decision 3)
    for start in p.day_start, p.day_start + GRID, ... while start + S.minutes <= p.day_end:
      end = start + S.minutes
      if overlaps(any timed visit) or overlaps(blocked time):              continue
      prev, next = the timed visits just before and after [start, end)
      if prev and prev.end   + gap(drive(prev.point, point)) > start:      continue   # room to arrive
      if next and end + gap(drive(point, next.point)) > next.start:        continue   # room to leave
      if free minutes left in the day after this slot < untimed minutes:   continue   # "Any time" visits still fit
      added = drive(prev, point) + drive(point, next) - drive(prev, next)  # one-sided or the nearest stop if no timed neighbour
      slot  = { start, end, person: p, added }
    keep, per start, the person already working that day, then least added, then the owner
  return slots

offerDays(S, point, town, today, exceptVisitId?, page = 0) -> Offer[]
  if town not in SIX_TOWNS: return { outside: true, phone }                  # decision 12
  open = []
  for day in weekdays from FIRST to LAST:
    slots = slotsFor(S, point, day, exceptVisitId)
    if slots: open.push({ day, slots, same: stops in this town that day, near: nearest stop in minutes })
  soon = open[page * SOON : (page + 1) * SOON]
  tier = 0 if same > 0 else 1 if near <= NEAR_MINUTES else 2
  rank = sort soon by (tier; tier 0: more same-town stops first; tier 1: nearer first; tier 2: earlier date)
  offers = first SHOWN of rank; a repair on page 0: [soon[0]] + the next SHOWN - 1 of rank
  for each offer: slots sorted by (added, start); best = slots[0]; label from the neighbour
  preselect = offers[0], with best as the highlighted time
  return offers sorted by date
```

The customer must still pick and tap Continue; a preselected time is a suggestion, because the booked time is a promise. If no day has a slot before `LAST`, the screen says "We'll call you to find a time" and the job is made in Needs a day. Ties: earlier day, earlier start, lower person id. Presentation: days in date order with the preselected day marked; each day shows its four best times and "More times". Rank order is a one-line change.

**What the customer reads.** Day lines as before (tier 0 "We're already in Erie that day.", tier 1 "We're close by that day.", the soonest day "Soonest open day.", a repair's first "Soonest we can come."). Slot lines: a slot whose neighbour is in the same town "Next to another Erie visit."; a slot within 10 minutes' drive of a neighbour "Close to another visit."; otherwise no line. Never a name or address of another customer.

### 4.3 Worked example: Ryan's April

Today Fri Apr 24; Ryan works alone, 12:00 to 18:00 (what the 2026 data shows for the spring: median start 14:00, 10th percentile 12:00); turn-on 60 minutes, repair 120. The output is the rule run in a throwaway script on these booked visits (positions are Erie coordinates I chose, not real customers).

| Day | Booked |
|---|---|
| Mon Apr 27 | nothing |
| Tue Apr 28 | Erie turn-ons at 12:00, 1:30 pm, 3:00 pm |
| Wed Apr 29 | Longmont turn-on 12:00; Longmont repair 2:00 pm |
| Thu Apr 30 | an Erie repair at 12:00 |
| Fri May 1 | a Lafayette turn-on at 1:00 pm |

**Customer A, 480 Briggs St, Erie, turn-on (60 minutes).**

| Day | Tier | Open slots | Best slots (added drive) |
|---|---|---|---|
| Mon Apr 27 | 2 | 11 (12:00 to 5:00 pm) | 12:00 (1 min) |
| Tue Apr 28 | 0, three Erie stops | **2** (4:30, 5:00) | 4:30 (1.5 min) |
| Wed Apr 29 | 2 | 1 (5:00) | 5:00 (29 min) |
| Thu Apr 30 | 0, one Erie stop | 6 (2:30 to 5:00) | 2:30 (4 min) |
| Fri May 1 | 2 | 6 | 2:30 (14 min) |

Offered: **Tue Apr 28** preselected ("We're already in Erie that day.", best time 4:30 pm "Next to another Erie visit."), Thu Apr 30 (2:30 pm), Mon Apr 27 ("Soonest open day", 12:00). The busy Tuesday shows what slots change: with three one-hour visits and half-hour gaps, only two start times fit after the last one. A day with three stops is not full by count but nearly full by time.

**Customer E, Erie repair (120 minutes).** Tuesday and Wednesday have no 2-hour gap, so the five soonest open days are Mon Apr 27, Thu Apr 30, Fri May 1, Mon May 4, Tue May 5. Offered: Mon Apr 27 (soonest, preselected, "Soonest we can come."), Thu Apr 30 (tier 0, 2:30 pm), Fri May 1.

**Customer D, Firestone.** Nobody in Firestone and Longmont is 30 minutes off: all tier 2, so the soonest three: Mon Apr 27 (12:00), Tue Apr 28 (one slot, 5:00), Wed Apr 29 (one slot, 5:00). The first booking seeds Monday.

## 5. Ordering the day

**When.** Only when Ryan presses Order the day (Schedule day, or Home's Today), with Undo (decision 6). Nothing re-orders on its own.

| Step | Rule |
|---|---|
| Fixed | Every visit with a `start_time` (a booked time) is fixed: ordering never moves it (decision 18). There is no told window and no pin table; "booked" is the pin |
| Untimed | Visits with no `start_time` ("Any time", added by the office) are ordered into the gaps between booked visits: for each gap in time order, repeatedly take the nearest untimed stop that fits with `gap(drive)` on both sides; stops that fit nowhere are listed |
| Order | Within a gap, nearest neighbour from the previous booked stop, then 2-opt on that gap. Deterministic |
| Times | Untimed stops get `stop_order` only. They get no `start_time`; their customers are told the day, not a time, until Ryan gives one |
| Start | The person's start point (`person.start_lat/lng`, else the shop in Erie); the first booked or untimed stop is reached from it |
| Lunch | None is imposed; a booked day has what the customers booked. If Ryan wants lunch he blocks the time |
| End | `day_end`. A day that runs past it is flagged "Ends 5:40 pm", not refused |

**Preview, Apply and Undo.**

```
Order Tuesday, Apr 28      Ryan Garner                         [Cancel] [Apply]
                Before                          After
 12:00  Briggs St (booked)                      12:00  Briggs St (booked)
 Any    Cheesman St            1:30 gap         Any    Dry Creek Rd  (fits 1:10 to 1:30)
 ...
 Drive between stops   94 min                   71 min                 saves 23 min
 Booked times          3 kept                    unchanged
After Apply:  "Ordered Tuesday. Undo"
```

Apply writes `stop_order` on untimed visits and one `visit.ordered` event per visit that changed with its old order and a batch id; Undo reads the batch and restores every value, if no visit on the day has changed since.

**Two people on a day.** An untimed stop goes to the person whose gap fits it with the least drive; a sweep by angle is used only when two people share a town and both have untimed stops (stage 6). **When a real solver is worth it:** not at 20 stops (nearest neighbour plus 2-opt is within a few percent of optimal and runs in milliseconds; the delivery slot research says the feasibility check must too, [Truden et al.](https://arxiv.org/pdf/2010.00385)); it earns its place with three or more people on a day. A hosted one costs: Routific $150 a month for 1,000 orders; we do not need it yet.

## 6. Moving, adding and cancelling

| Action | What happens | Ryan sees |
|---|---|---|
| Customer picks or reschedules (`visits.pick`, from the signed link or the portal) | Offer re-run with the visit's own slot excluded; she picks a day and time from the open slots; `start_time` is written; her old time opens for others | Home row "Andrea moved Tue 4:30 pm to Thu 2:30 pm" |
| Customer cancels (`visits.cancelSelf`, closes 24 hours before) | Visit cancelled; her slot opens because slots are computed from the booked visits | The freed time on the Schedule; Home row |
| Ryan adds by phone (`visits.create`) | The open slots are shown beside his day picker with their lines; he can pick any day and time, or "Any time" | The conflict list for a time the rule would not offer |
| Ryan moves a visit (`visits.move` with `startTime`) | A visit with a booked time: **Move and text the customer** is the only action and always texts, with the old and new time and an optional line from Ryan. A visit with no booked time keeps the split button | The conflict list |
| A moved customer | Silence is yes. A `must_be_home` property is asked "Reply YES or pick another day"; the visit shows **Waiting on customer** until a `visit.confirmed` or `visit.picked` event follows the move | Waiting on customer on the visit and the Home row |
| Rain day | Ryan marks a person's day; each visit is proposed the soonest, nearest day (the rained-out day and past days excluded) and the open slot nearest its old time of day | A list of who moves where, one button **Move all and text**, then Undo (the same shape as Order the day) |
| Second truck | A new person with hours; slots open for either; no visit moves | People tab |

**Waiting on customer is read from facts:** a `visit.moved` event with `detail.asked: true` and no later `visit.confirmed` or `visit.picked`. The inbound text handler writes `visit.confirmed` on "YES".

**The booked-time rule.** Nothing the engine does changes a `start_time`; only a customer pick, or Ryan's move, does, and either texts the customer. The day-before run only confirms ("Ryan is coming tomorrow at 4:30 pm"); a visit with no booked time gets the day.

**Conflicts Ryan sees** (a warning with one tick to allow, decision 14; online offers never break any of them):

| Conflict | Hard or soft | Words |
|---|---|---|
| Visit done, cancelled or skipped | hard | "This visit is done." |
| Person inactive or not on the schedule | hard | "Tech Two is not on the schedule." |
| Overlaps a booked visit | soft | "Ryan has Briggs St at 3:00 pm." |
| Not enough room for the drive | soft | "Needs 15 minutes after Briggs St; there are 5." |
| At or over the person's count for the kind | soft | "Ryan has 6 blowouts that day." |
| Outside the person's hours or working day | soft | "Ryan works until 5:00 pm." |
| Outside the service's bookable dates | soft | "Fall blowout opens Sep 28." |
| Address outside the six towns | soft | "Outside the six towns." |

## 7. Capacity and hours

| Test | Rule | Source |
|---|---|---|
| Count | `count(kind on (person, day)) < capacity_by_kind[person][kind]` | `person.capacity_by_kind` (decision 3) |
| Hours | the slot lies inside `day_start` to `day_end` of a person who works the weekday | `person.working_days`, `day_start/end` |
| Fit | no overlap, and `gap(drive)` to the booked neighbours; untimed minutes still fit | section 4.2 |
| Open | no block that day | `busy_block` |

No buffer is held back (decision 6). A day is full for a kind when it has no open slot for that kind's minutes; a town is never "full" (decision 4: the offer walks to `LAST`). **Hours matter now and the data is clear:** Ryan's 2026 visits start between 12:00 and 17:00 in spring and summer (median 14:00) and earlier in the fall rush (10th percentile start 09:00 in September and 10:00 in October); a default of 08:00 to 17:00 would offer mornings he did not work. Hours are Ryan's to set on People. Counts: PR #72 shows one person comfortable at 6 blowouts, topping out at 7 or 8, repairs 3 a day, turn-ons never above 1 a day in 2026; the schema defaults (turn-on 8, inspection 8, blowout 10, repair 4) are higher than that. I recommend blowout 6, turn-on 5, inspection 3, repair 3. Fall peak: 54 blowouts in a week; one person at 6 a day holds 30, two hold 60.

## 8. Drive time

| Stage | Source | Cost | Used for |
|---|---|---|---|
| Now | Straight line times 1.3 at 40 km/h, 1.95 minutes a kilometre, plus the cushion `gap(d)` | none | the 10-minute tier, slot fit, ordering |
| Later | Google Routes API, Compute Route Matrix Essentials (no traffic) | $5.00 per 1,000 elements; 10,000 free a month ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing)); 625 elements a request | slot fit and ordering once errors matter |
| If Google's terms forbid caching | OSRM `table` in a container we host | a server | the same |
| Fallback | the straight-line row | none | any failure or call over 2 seconds |

**Why this matters more now.** A booked time is a promise, so the gap between two visits is a promise too. Straight-line times underestimate road time for some pairs (a creek, a highway); the 25 percent cushion and the 10-minute floor absorb most of it. A slot's added drive is one matrix call per neighbour pair, about 100 elements for a day-by-day offer. My estimate, not measured: 1,000 offers a season with 30 percent new addresses is about 30,000 elements, under $100 after the free 10,000 a month. **Cache:** key a pair of rounded coordinates (4 decimals, about 11 m), TTL 30 days until Google confirms route times may be cached (its [policy page](https://developers.google.com/maps/documentation/routes/policies) allows lat/lng for up to 30 days and does not say route times); it is the design's one new table, `drive_time`, at stage 7. **Fallback:** on any error, timeout (2 seconds) or quota, use the straight-line time, mark the offer `estimated`, write nothing to the cache. An offer is never blocked by the matrix.

## 9. Simulation: 2026 replayed through the rule with times

**Method.** Throwaway script, not committed (saved in the shared notes folder). Data: the saved Nov 12 Jobber pull (599 visits): 107 calendar blocks and 1 unscheduled dropped, aeration and 24 visits outside the six towns dropped, **466 customer visits** (PR #72 counts 508 because it adds 11 created after the pull and the 24 outside). Each visit is replayed in the order it was created; tomorrow is the first day; five soonest days with a slot, nearest three offered; slot length is the visit's real minutes (30 to 180); 30-minute grid; the gap cushion above; counts per person per day blowout 6, turn-on 5, inspection 3, repair 3; two people from Sep 21. **Assumed hours** (the data cannot say what Ryan would have offered): 11:00 to 18:00 April to September, 08:00 to 18:00 October and November. Coordinates: Nominatim geocoded each distinct street name with its town (no house numbers, no customer names; 287 queries); 385 of 466 visits got a street point, the rest and any match over 20 km from its town use the town centre. **Customer behaviour, two ways:** (a) takes the preselected day at its best-fit time; (b) takes the offered day and time **closest to the day and time they really had** (the more realistic one). Drive is measured along the booked order, since times fix the order.

**Result.**

| Arm | Driving days | Stops per day | Drive between stops (min) | Km depot to depot | Days with 2+ towns |
|---|---|---|---|---|---|
| Actual (Ryan and Scott, Jobber's times) | 166 | 2.81 | 3,544 | 3,662 | 85 |
| Rule, customer takes the preselected day and time | 160 | 2.91 | 4,438 | 4,020 | 87 |
| **Rule, customer takes the offer closest to the time they had** | **181** | **2.57** | **3,769** | **3,954** | **92** |
| Three soonest days only (Jobber-style), customer takes the closest | 180 | 2.59 | 3,873 | 3,971 | 96 |

**Headline.** With exact times the rule does not beat what Ryan did on driving days: 181 against 166 when customers choose times like the ones they had, 160 only if everyone accepts the preselected slot, and then drive between stops is 25 percent higher (4,438 against 3,544 minutes) because bookings fix an order the engine can no longer improve. The nearness part is worth little: against a Jobber-style three soonest days it saves 3 percent of the drive between stops (3,769 against 3,873 minutes) and 4 mixed-town days, with the same 180 to 181 days. Taken with the day-only replay (153 to 158 days, nearness worth about the same), nearness at 2026 volume is a small effect either way.

| Customers, closest-pick arm (466) | Number |
|---|---|
| Their real day was still open (a slot on it) | 392 (84 percent) |
| A slot within an hour of their real time on their real day | 370 (79 percent) |
| Their exact real time | 344 (74 percent) |
| Took an offered day earlier than the one they really had | 283 (61 percent); median wait versus the soonest open day 2.7 days |
| Took a later day than they really had | 42 (9 percent); 22 by 3 days or more, 6 by 7 days or more |
| Picked a time more than 2 hours from the time they had | 54 (12 percent) |
| No day offered | 0 |

**What the rule gets wrong, and what the replay cannot show.**

| Limit | Effect |
|---|---|
| **Ryan's real schedule is not feasible by this rule.** 37 consecutive pairs of actual visits overlap in time (31 person-days), and 70 of the 300 pairs have no room for the drive. Jobber lets him book that; the rule refuses it | The rule needs more days than he used. This is the main reason it loses on days, and the 25 percent cushion adds to it |
| Hours are my assumption. Real starts cluster 12:00 to 17:00, so afternoon slots fill and morning slots stay open | Different hours change the day count a lot; Ryan sets them |
| The preselected arm piles each customer on the earliest day at a time chosen by drive, not by preference; the closest arm is nearer the truth | Neither knows how many customers accept a suggestion |
| Untimed office visits, rain, cancels, Saturdays (35 of 466) and calendar blocks are not modelled | Real days will differ |
| Street-level points; 81 visits use a town centre | Distances under half a kilometre are noise |
| One season, an account opened in March | Treat the numbers as a direction |

## 10. The Jev seam

Jev is not in the booking path: a model takes 30 to 90 seconds and a customer needs an answer in under a second. Jev replaces two pure functions behind the same types, and reads and writes only through the API.

| Seam | Today | Jev may replace | Inputs | Outputs |
|---|---|---|---|---|
| `offerDays` | section 4.2 | the ranking of days, and the order of slots inside a day | the open days, each with `{ same, near }` and its slots with `added`, the service, the customer point | an ordered list of days and slots with one reason line each |
| `orderUntimed` | nearest neighbour plus 2-opt in the gaps | the algorithm, for a day that needs a solver | booked visits (fixed), untimed stops, a drive matrix, the start point | an order and the minutes saved |
| plan | none | whole-week planning (week-planning design, section 4) | `schedule.week`, `schedule.day`, `people.list`, `visits.list` | one write, `schedule.plans.create`, accepted by Ryan and applied through `visits.move` |

Records never change shape. Jev reads `visit`, `person`, `property`, `service` and writes only a plan. A plan can move only untimed visits, or a booked visit with its customer texted; the rules in section 6 are enforced by the app on accept, so Jev cannot move a promise silently or exceed a count online.

## 11. Data and API

**The one function that changes.** Today the portal's `visits.areaDays` and `visits.pick` call `openSlots` and `offeredDays` in `src/lib/pass/server/area-days.ts`, and the checkout's `schedule.offerDays` calls `openSlots` and `spreadDays`. The engine replaces those bodies with one pure function, `offerDays` in `src/lib/scheduling/offer.ts` (section 4.2), loaded by one server function, `offerFor(db, input, today, { page })` in `area-days.ts`. **This is no longer a swap with no screen change**: the customer now picks a time, so the checkout and the portal each gain a time step.

| Handler | Input | Output change |
|---|---|---|
| `visits.areaDays` | unchanged (`id`) plus optional `page` | `days` stays (day strings, so the portal builds today); adds `offers: [{ day, label, tier, preselected, slots: [{ start, end, personId, personName, addedMinutes, label }] }]` |
| `schedule.offerDays` | `town`, `kind`, `season`, `zones` kept; adds `serviceKey`, `lat`, `lng`, `visitId?`, `page` | `days[]` gain `label`, `tier`, `preselected` and `slots`; the 3-day spread goes |
| `visits.pick` | adds `start: "HH:MM"` (optional until the screens ship, then required for a customer) | accepts any day with an open slot at that start, re-checked at write (the slot may have just been taken: the next best on that day is returned with a message); writes `start_time` and `duration_minutes`; the event stores what was offered |
| `visits.move`, `visits.create` | `startTime` already exists; adds `confirm?: true`, `notify: "text" \| "none"` (not `none` for a booked time), `note?` | return `warnings[]` for soft conflicts; with `confirm: true` they are written |
| `visits.cancelSelf`, `visits.cancel` | unchanged | free the slot; nothing is stored, since slots are computed |
| `schedule.orderDay` (new) | `{ personId, day, apply?, undoBatch? }` | preview: before, after, drive minutes saved, booked times kept; `apply` writes untimed `stop_order` and returns a batch id; `undoBatch` restores |
| `schedule.rainOut` (new) | `{ personId, day, apply?, undoBatch? }` | the same shape: proposed moves with times, one apply with texts, then Undo |

**Columns** (no new table before stage 7):

| Column | Row for `docs/DATA_MODEL.md` |
|---|---|
| `service.bookable_from`, `service.bookable_to` | text `MM-DD`, nullable (both null: all year). Set in Settings › Services. Read by the offer, the booking picker's "Opens Apr 25", the move warning. Replaces `settings.windows` and the Seasons tab (decision 10) |
| `person.day_start`, `person.day_end` | text `HH:MM`, default `08:00` and `17:00`. Ryan's hours; set on People. Read by `slotsFor`, the move warning "works until 5:00 pm". One pair for every working day; per-weekday hours are a later widening if Ryan works different days differently |
| `person.start_lat`, `person.start_lng` | real, nullable; where the day begins (a second truck's driveway). Null: the shop in Erie. Read by Order the day. Stage 6 |

`visit.start_time` and `visit.duration_minutes` already exist; booking now writes both. `area` and its four settings are dropped after stage 1. The booked time is `visit.start_time`; there is no told-window state.

**Events** (new kinds in `src/lib/events/kinds.ts`, with words): `visit.scheduled` and `visit.moved` detail gain `start`, `offered: [{ day, tier, slots }]`, `rank`; `visit.moved` gains `asked: true` and `reason: "rain"` where they apply; `visit.confirmed` (reply YES); `visit.ordered` (old order and batch id).

**Tests, one per use case** (pglite for handlers, plain unit tests for the pure rule):

| Case | Test |
|---|---|
| New booking, each kind | The April example: A gets Tue Apr 28 with exactly two slots (4:30, 5:00), best 4:30; the repair gets Mon Apr 27 first |
| Slot fit | A 60-minute slot between two visits needs 60 minutes plus `gap(drive)` each side; half-hour gaps give none |
| Second customer, same street | Tuesday stays first, slots next to hers first, until no slot is left |
| Quiet town | Firestone gets the three soonest days |
| Reschedule | The visit's own slot is excluded; the old time reopens |
| Cancel frees | After `visits.cancelSelf`, the slot is offered again |
| Pick race | Two customers pick the last slot: the second gets "that time was just taken" and the next best |
| Ryan adds by phone | An overlap and a too-short gap return warnings; `confirm` writes |
| Move a booked time | `notify: "none"` is refused; the text names old and new time; a must-be-home visit shows Waiting on customer until `visit.confirmed` |
| Order the day | Booked `start_time`s unchanged; untimed stops fit the gaps; Undo restores |
| Rain day | Proposals keep the time of day where open; Apply texts each; Undo restores |
| Second truck | A new person with hours: slots open for either; no old visit moves |
| Fall rush | 54 blowouts in a week with two people at 6 a day fit; the next are offered in week three |
| Outside the six towns | `{ outside: true }`, nothing saved |
| No slot before `LAST` | "We'll call you", a job in Needs a day |
| Day-before run | Confirms the booked time; a visit with no time gets the day |
| Matrix down | A stub that throws: offers return `estimated`; nothing is blocked |
| Replay | The simulation on an anonymised fixture of points and times, no names: 181 days within 5 |

## 12. Build order and what is still open

| Step | Ships |
|---|---|
| 1 | `offer.ts` and `offerFor`; `visits.areaDays` and `schedule.offerDays` return `offers` with `slots` and labels (screens still use `days`); `service.bookable_from/to`; `person.day_start/end` on People; the April tests; `area` dropped |
| 2 | The time step on the checkout and the portal: customers pick a day and a time; `visits.pick` takes `start`; booked times written; the day-before text confirms the time |
| 3 | Order the day: preview, Apply, Undo, untimed visits ordered into the gaps |
| 4 | The Move split button (always texts for a booked time), the conflict list, Waiting on customer, YES replies |
| 5 | Rain-out review |
| 6 | Second truck: `person.start_lat/lng`, the sweep assignment |
| 7 | Road times: Google matrix and the `drive_time` cache, OSRM if caching is not allowed |
| 8 | The Jev plan seam |

**Open, in order of how much they matter:**

1. **Ryan's hours.** Real starts cluster 12:00 to 17:00 in spring and summer. Which hours should online slots use, per weekday and season? Default 08:00 to 17:00 would offer mornings he did not work.
2. **The rule is stricter than how Ryan worked.** His 2026 schedule has overlapping visits and no drive room on 107 of 300 pairs; the rule needs about 9 percent more driving days than he used (181 against 166). Keep the strict gap with a 25 percent cushion, or loosen it (cushion 0, floor 5 minutes)? Recommended: keep, and measure a season.
3. **Nearness is small either way** (3 percent of drive between stops against Jobber-style soonest days). Keep it as set, and measure real bookings before adding anything that trades soonest-first for density.
4. **Blowout count on People: 6 or 8?** Recommended 6, Ryan adding to 8 by hand with a warning.
5. **Google may not allow caching of route times.** Check before stage 7; OSRM is the fallback.
