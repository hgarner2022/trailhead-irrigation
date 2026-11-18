# The scheduling engine

Design only, Nov 18 2026. No code is built until Hannah and the architect have read this. It replaces the area groups behind `openSlots`, `offeredDays`, `spreadDays` and the straight-line `orderStops` with one engine that works from where the customer lives. It builds on `2026-11-18-week-planning-design.md` (the Jev seam), `2026-11-18-online-booking-design.md` (the flow that shows the days) and `2026-11-18-routes-and-seasons-answers.md` (PR #72, Jobber's 2026 numbers).

Hannah, Nov 18: "A customer comes online, they book, we should allow them to book automatically by optimizing our schedule so we surface times that work for where their address is... We need to be best in class here. And then we do need the ability to potentially move customers or add customers."

## 1. The job to be done and the rules already settled

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

## 2. What the tools do

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

## 3. The offer rule

### 3.1 Inputs and constants

| Name | Value | Where it comes from |
|---|---|---|
| Customer point (lat, lng), town | the address from Places, geocoded; town centre if no point | `property.lat/lng`, `mapPoint` |
| Service S: kind, minutes, bookable dates | `service.kind`, `service.slot_minutes`, `service.bookable_from/to` (new, section 10) | catalogue |
| People | working days, `capacity_by_kind` | `person` |
| Booked visits | `visit.person_id, scheduled_on, kind, duration_minutes, stop_order, start_time`, property point; status not cancelled or skipped | facts |
| `LEAD` | 2 days (today's `PICK_LEAD_DAYS`) | code |
| `HORIZON` | 28 days from the first bookable day | PR #72: 90th percentile lead is 23 to 31 days |
| `OFFER` | 3 days, "Show more" to 9 | booking design 4.4 |
| `NEAR_KM` | 3 km straight line (about 6 minutes of town driving) | tuned in section 8 |
| `BONUS` | 3 minutes per neighbour, at most 4 neighbours | tuned in section 8 |
| `TOWN_BONUS` | 10 minutes when the day already has a stop in the customer's town | tuned in section 8 |
| `HABIT` | 4 minutes for the weekday the town was last worked, on a day with no stop in town or near (a seed day) | tuned in section 8 |
| `WAIT` | 1 minute per bookable weekday after the first; 2 for a repair | tuned in section 8 |
| `ROAD` and `SPEED` | 1.3 and 40 km/h, so 1.95 minutes per straight-line km | section 7 |

### 3.2 Pseudocode

```
offerDays(S, point, town, today, exceptVisitId?) -> Offer[]
  if town not in SIX_TOWNS: return { outside: true, phone }            # nothing saved
  first = max(today + LEAD, S.bookableFrom)
  last  = min(first + HORIZON, S.bookableTo)
  days  = weekdays in [first, last] where some active person works that weekday
  for each day d (index i = open weekdays since first):
    best = null
    for each person p working d:
      stops = visits on (p, d) except exceptVisitId
      # 1. hard tests: every one must pass
      if count(stops of S.kind) >= offerCap(p, S.kind):          continue    # People capacity
      route = bestRoute(stops + new)                                          # section 4 (NN + 2-opt)
      minutes = sum(service minutes) + S.minutes + driveMinutes(route) + LUNCH
      if minutes > DAY_MINUTES * (1 - buffer):                    continue
      if farthestHop(route) > MAX_HOP (45 min):                   continue    # Jobber, ServiceTitan: a drive ceiling
      if dayIsClosed(p, d):                                       continue    # time off or rain
      # 2. nearness
      added = driveMinutes(route) - driveMinutes(bestRoute(stops))           # insertion cost
      near  = count(stops within NEAR_KM of point)
      same  = count(stops in this town)
      cand  = { person: p, added, near, same }
      best  = min by (added, person != owner) between best and cand           # ties go to the owner
    if best:
      habit = (best.near == 0 and best.same == 0 and weekday(d) == lastWeekday(town))   # a seed day
      score = best.added - BONUS * min(best.near, 4) - (TOWN_BONUS if best.same >= 1)
              - (HABIT if habit) + WAIT * i
      offers.push({ day: d, person: best.person, score, ...best })
  sort offers by (score rounded to 0.1, more neighbours first, earlier date)
  label(o) = near >= 1 -> "neighbours"; same >= 1 -> "town"; added <= 15 -> "nearby"; else "seed"
  top = first OFFER offers; best = top[0]
  # never preselect a day more than 7 days after the earliest open day (customer waits)
  if best.date > earliestOffer.date + 7: preselect earliestOffer
  return top sorted by date, preselect marked
```

Every candidate carries an explanation object (`near`, `same`, `added`, `label`), because the screen, the event and Jev all read it.

**What the customer is told, one line per label** (sentence case, no times):

| Label | Line under the day | When |
|---|---|---|
| neighbours | We're already in Erie that day. | at least one stop within 3 km |
| town | We're in Erie that day. | a stop in the same town, farther away |
| nearby | We're close by that day. | added drive 15 minutes or less |
| seed | Next open day in your area. | nobody near; the first booking seeds the day |

`lastWeekday(town)` is read from facts: the weekday of the scheduled day of the newest non-cancelled visit in that town. It is how "Ryan is in Erie on Tuesdays" emerges without a Routes grid: the first booking in a quiet week seeds a day, and the next seed prefers the same weekday. It is the term that earns the density in section 8.

**Ties and edge cases.** Equal scores go to the earlier date, then the lower person id. A day Ryan already works in an adjacent town beats an empty day by the insertion cost, which is how a first Firestone booking lands on the Longmont Wednesday (section 3.3). With nobody anywhere the score is just `WAIT`, so the nearest days are offered. Fewer than three days pass: offer what passes. None pass: "These days are full. We'll call you", job in Needs a day.

### 3.3 Worked example: Ryan's April

Today is Fri Apr 24. Ryan works alone. Turn-on window Apr 15 to Jun 15. Cap: 5 turn-ons a person a day. The scores below are the rule's output on these stops in a throwaway script (positions are Erie coordinates I chose, not real customers; no weekday habit yet).

| Day | What Ryan already has |
|---|---|
| Mon Apr 27 | nothing |
| Tue Apr 28 | three Erie turn-ons (Briggs St area) |
| Wed Apr 29 | a Longmont turn-on and a Longmont repair |
| Thu Apr 30 | one Erie repair, west side |
| Fri May 1 | a Lafayette turn-on |
| Mon May 4 | two Erie turn-ons |

**Customer A, 480 Briggs St, Erie, turn-on, 8 zones.** First day is Mon Apr 27 (today plus 2).

| Rank | Day | Neighbours within 3 km | Added drive | Score | Shown as |
|---|---|---|---|---|---|
| 1 | Tue Apr 28 | 3 | 0 min | -18.0 | We're already in Erie that day. (preselected) |
| 2 | Mon May 4 | 2 | 0 min | -11.0 | We're already in Erie that day. |
| 3 | Thu Apr 30 | 1 | 1 min | -8.9 | We're already in Erie that day. |
| 4 | Mon Apr 27 | 0 | 1 min | 1.1 | not shown |
| 5 | Wed Apr 29 | 0 | 1 min | 3.1 | not shown |

Shown in date order: Tue Apr 28 (preselected), Thu Apr 30, Mon May 4. Note the added drive is near zero for every Erie day because Ryan's depot is in Erie, so the neighbour and town bonuses do the separating, and the Monday and Wednesday seed days sit 10 to 20 points behind. That is the rule's blind spot too (section 8): for Erie the drive term says nothing.

**Customer B, a neighbour on Briggs St, an hour later.** Tuesday now has four Erie stops; it scores -21.0 and is still first. The day fills by neighbourhood until it hits the cap (5 turn-ons) or the minutes limit (section 6), then falls to Mon May 4.

**Customer C, Longmont.** Wed Apr 29 first (two Longmont stops, 1 min added, score -13.0). The next best Longmont day is Thu Apr 30 at 45.5 added minutes, score 48.5, so it is a "seed". That gap is what keeps Ryan from criss-crossing.

**Customer D, Firestone.** Nobody in Firestone. Wed Apr 29 first (26 added minutes, riding with the Longmont day), then Tue Apr 28 (43), then Mon May 4 (40). The first Firestone booking seeds the Wednesday; the second Firestone customer sees Wednesday with a neighbour and gets it at the top.

## 4. Ordering the day

**When it runs.** Every time a person-day changes (a booking, a pick, a move, a cancel), for that person and day, and for the person and day it left. Today `orderDay` does this on move; this design keeps the call sites and changes the order and the times.

| Step | Rule |
|---|---|
| Stops | Visits on (person, day) with status scheduled, in `visit.stop_order` order |
| Pinned stops | A visit whose day-before text has been sent (a `message_log` row of kind `day-before`, key `<visitId>-<day>`) keeps its `start_time`. It is a fixed point; nothing is moved across it without a re-text (section 5) |
| Start | The person's start point (the shop in Erie until `person.start_lat/lng` exists, section 10), 8:00 first stop (`FIRST_STOP`) |
| Order | Nearest neighbour from the start, then 2-opt until no reversal shortens the route, with pinned stops held in their time order. Deterministic: same points, same order. Straight-line km now, road minutes from stage 6 |
| Times | `start_i = max(end_{i-1} + drive_i, pinned start_i)`; service minutes are `visit.duration_minutes`, else the kind's default (`defaultMinutes`) |
| Lunch | 30 minutes inserted at the first stop boundary after 11:30; dropped if the day would end before 13:00 |
| End of day | 17:00. A route that ends later is not refused: it is flagged "Over by 40 minutes" on the Schedule day and in the move warnings |
| Window | Start of window is the ETA rounded down to 30 minutes, never before 8:00; the window is 2 hours (`twoHourWindow`). A must-be-home customer gets 1 hour, and the ordering adds a lateness weight 3 for that stop so it sits where the drive estimate is firm (early in the day or right after a short hop) |
| Told once | The window is computed from the order every time it changes, but told to the customer only by the daily run the evening before; after that it is pinned |

**Two people on one day.** Assign before ordering: sort the day's stops by angle around the start point and cut into one contiguous sweep per person, weighted by each person's remaining minutes; then order each. It beats ordering one list and cutting it, because two trucks do not cross town. The busiest 2026 day was 15 stops with two people (Wed Oct 14, PR #72).

**When a real solver is worth it.** Not at 20 stops: NN plus 2-opt is within a few percent of optimal and runs in milliseconds, and the delivery research says the check must finish in milliseconds. A real solver (VROOM or Google Route Optimization, whose per-shipment price I could not find) earns its place when three or more people share a day, or when customers have hard time windows (a must-be-home customer who names an hour). Routific costs $150 a month for 1,000 orders (100 free); our 508 visits a season would fit the paid tier, so a hosted solver is a cost we do not need yet.

**What "Order the day" shows Ryan.** A button on the Schedule day and on Home's Today. It shows before and after, then Apply or Keep mine:

```
Order Tuesday, Apr 28      Ryan Garner
                 Before                       After
 1  Briggs St    8:00  Erie                   8:00  Briggs St
 2  Cheesman St  8:35  Erie                   8:40  ...
 Drive           94 min                       71 min       saves 23 min
 Windows told    2 stops fixed (told Monday)  unchanged
```

Pinned stops show a lock. Apply writes `stop_order` and `start_time` (the same columns) and one `visit.window_changed` event per visit whose told window moved.

## 5. Moving, adding and cancelling

| Action | Recompute | Frozen | Shown to Ryan |
|---|---|---|---|
| Customer picks or reschedules online (`visits.pick`) | Offer re-run with the visit's own slot excluded; the old person-day and the new one are ordered | The old day's other told windows | Home row "Hannah moved Tue Apr 28 to Thu Apr 30"; the freed day on the Schedule |
| Customer cancels (`visits.cancelSelf`, 24-hour rule) | Old person-day ordered; capacity returns because it is counted from facts | Told windows | Freed day; Home row |
| Ryan adds a customer by phone (`visits.create` with a day) | `rankDays` shows the same offers beside the day picker with labels; Ryan may pick any day | Told windows | Offers list with the engine's reason; picking a day the rule would not offer shows the conflict list below |
| Ryan moves a visit (`visits.move`) | Both person-days ordered; date text queued | Told windows on both days | Preview of the new day's order and drive minutes; the conflict list |
| Rain day | Ryan marks the day; its visits become Needs a day (`scheduled_on` cleared) and each is re-offered with the same rule; customers get the date-moved text with "weather" | A day that is past | One list: who needs a day, with the three offers each; "Place all" applies each customer's first offer, shown before it is written |
| Second truck added | A new person with working days and capacity; offers see both; no visit is rewritten | Everything already booked | People tab only |

**The day-before rule, exactly.** After the day-before text for a visit has been sent, the engine does not change that visit's `start_time`. New stops are inserted around pinned ones; an insertion that would make a pinned stop late by more than 30 minutes is refused as infeasible for customers and listed as a conflict for Ryan. Ryan can move a pinned window on purpose; the customer then gets a `window-changed` text and the event is `visit.window_changed`.

**Conflicts Ryan sees** (a warning list; the move does not fail unless it is a hard rule):

| Conflict | Hard or soft | Words |
|---|---|---|
| Visit already done, cancelled or skipped | hard | "This visit is done." |
| Person is not on the schedule | hard | "Tech Two is not on the schedule." |
| Over the person's capacity for the kind | soft | "Ryan has 7 blowouts that day; he is comfortable at 6." |
| Over the day's minutes | soft | "The day ends at 5:40 pm." |
| Outside the service's bookable dates | soft | "Fall blowout opens Sep 28." |
| Far from the day's other stops (over 45 min hop) | soft | "This is 38 minutes from the next stop." |
| Breaks a told window | soft | "Hannah was told 8 to 10 am. She will be texted." |
| Address outside the six towns | soft | "Outside the six towns." |

Today `placeVisit` throws on capacity and area. This design makes capacity, area and distance soft for staff (a confirm tick), while customer calls still never exceed them. That is Q1.

## 6. Capacity

**Per person per day, for a visit of kind K and minutes M:**

| Test | Formula | Source |
|---|---|---|
| Count | `count(K on the day) < offerCap(p, K)` | `person.capacity_by_kind[K]` |
| Minutes | `service minutes + drive minutes + lunch <= 600 * (1 - buffer)` | `WORKDAY_MINUTES`, `settings.buffer*` |
| Day open | person works the weekday and no block or time off | `working_days`, Jobber feed blocks |

`offerCap` is the People number Ryan sets. What the data says (PR #72): one person is comfortable at 6 blowouts, tops out at 7 or 8; turn-on 1 a day in 2026 was demand, not capacity; repair up to 3. The default row in the schema is turn-on 8, inspection 8, blowout 10, repair 4; for the first season set blowout 6, turn-on 5, inspection 3, repair 3 on People. The buffer is the old percent (10 or 20) kept in the settings JSON; it is a per-person cap, not a Settings screen. The hard cap Ryan may overbook to for the office is `offerCap + 2`.

**Full.** A day is full for K when no person passes both tests. A town is full when every day in the horizon is full for K. Full is derived, never stored.

**Look-ahead.** 4 weeks from the first bookable day. Check against the 2026 data: 90th percentile lead for blowouts 23 days (27 to 30 in the peak weeks), repair 20, inspection 17, turn-on 31. The fall peak is 54 blowouts in a week; one person at 6 a day holds 30, two hold 60, so with two people the week fits and with one the next two weeks absorb the rest, inside four.

## 7. Drive time

| Stage | Source | Cost | Used for |
|---|---|---|---|
| 0, now | Straight line (haversine) times 1.3, at 40 km/h: `minutes = km * 1.95`, calculated in the pure function | none | offers, ordering, windows |
| 6, later | Google Routes API, Compute Route Matrix **Essentials**, basic, no traffic | $5.00 per 1,000 elements, 10,000 free a month | offers and ordering once a second truck makes errors visible |
| fallback | stage 0 | none | any call that fails or takes over 2 seconds |

**Why straight line first.** The six towns are a 35 km square with few rivers or highway gaps between neighbours; Jobber's own max drive time and Zenbooker's bands are coarse (15-minute bands, accurate to 60 minutes), so a 20 percent error moves almost no ranking: the rule compares days, and the same error applies to every day. It does matter for the 45-minute hop ceiling and for an end-of-day estimate, which is why stage 6 exists.

**Google, later.** One offer needs the new address against the stops of up to 20 days: about 100 elements. My estimate, not measured: 1,000 offers a season, 30 percent of them new addresses, is about 30,000 elements, so about $100 at $5 per 1,000 after the free 10,000 a month (the free tier may cover most of it, since a month is far below 10,000); a re-run per reschedule adds little. Ordering a day of 20 stops is 400 elements, but only new pairs are fetched.

**Cache.** Key: a pair of property ids (or coordinates rounded to 4 decimals, about 11 m); value: minutes and km. Google's policy page allows caching lat/lng for up to 30 days and does not say route times may be cached; I could not open the terms text. Until that is confirmed with Google, treat the TTL as 30 days and refresh in the nightly run; if the answer is no, use OSRM in a container (free, our own cache). This is the design's one new table, `drive_time`, and only at stage 6.

**Fallback.** On any Google error, timeout (2 seconds) or quota, use stage 0, mark the offer's explain object `estimated: true`, and write nothing to the cache. An offer is never blocked by the matrix.

## 8. Simulation: 2026 replayed through the rule

**Method.** Throwaway script, not committed. Data: the saved Nov 12 Jobber pull (`.local-data/admin/jobber-raw-2026-11.json`, 599 visits): 107 calendar blocks and 1 unscheduled dropped, aeration and 24 visits outside the six towns dropped, **466 customer visits** (PR #72 counts 508 because it adds 11 created after the pull and the 24 outside). Kind from the visit's catalogue service, name-only visits in October and November counted as blowouts, otherwise repairs. Each visit is replayed in the order it was created (`createdAt`): offered ranked days from created plus 2 days for 28 days, taking the first (with the 7-day preselect cap). Two people from Sep 21 (when Scott's first visit appears), one before. Caps per person per day: blowout 6, turn-on 5, inspection 3, repair 3; 480 minutes with service minutes and drive. Drive is straight line times 1.3 at 40 km/h from an Erie depot, the route ordered by nearest neighbour and 2-opt. **Coordinates:** Nominatim geocoded each distinct street name with the town (no house numbers, no customer names: 287 street queries); 385 of the 466 visits got a street point, the rest (and any match more than 20 km from its town, a same-named street in another state) use the town centre. Street-level points mean differences under about half a kilometre are noise.

**Result, all 466 visits** (kilometres are straight line, depot to depot, summed over every driving day):

| Arm | Person-days driving | Stops per day | Km | Days with two or more towns | Erie days |
|---|---|---|---|---|---|
| Actual (what Ryan and Scott did) | 166 | 2.81 | 3,360 | 85 | 124 |
| First open day (no ranking) | 154 | 3.03 | 3,430 | 84 | 126 |
| Rule without the weekday habit | 148 | 3.15 | 3,364 | 81 | 120 |
| **Rule as designed (`HABIT` 4)** | **130** | **3.58** | **3,257** | 81 | **100** |
| Rule, `HABIT` 6 | 120 | 3.88 | 2,993 | 74 | 87 |
| Rule as designed, customer takes the closest of the 3 offered days to the day they really got | 147 | 3.17 | 3,439 | 92 | 119 |

By season, actual then rule as designed, person-days: spring (Apr to Jun) 52 then 46; summer 39 then 42; fall (Sep to Nov) 74 then 57, with 3.57 then 4.63 stops a day.

**Headline.** If every customer takes the preselected day, the rule needs 130 driving days against 166 (22 percent fewer) and drives 3 percent fewer kilometres (about 100 km, roughly 3 hours over the season at 1.95 minutes a kilometre). The gain is days, not drive: Ryan already clustered by judgement, and the six towns are close. The gain depends on customers taking the preselected day. If each takes the closest of three offers to the day they really picked, the saving drops to 147 days (11 percent) and kilometres rise 2 percent.

**Customers, rule as designed against what they got** (466):

| Measure | Number |
|---|---|
| First offered day is **earlier** than the day they got | 327 (70 percent), median 4 days earlier |
| Same day | 55 (12 percent) |
| First offered day is **later** than the day they got | 84 (18 percent) |
| Later by 3 days or more | 46 (10 percent) |
| Later by 5 days or more | 9 (2 percent) |
| Later by 7 days or more | 0 (the preselect cap) |
| The day they actually got was among the three offered | 140 (30 percent); it was still bookable (passed every hard test) for 386 (83 percent) |
| Worse offers by kind (later, of total) | repair 36 of 166; blowout 40 of 227; turn-on 4 of 36; inspection 3 of 30 |
| Customers with no day offered | 0 |

**Weights.** Sweeping `WAIT` (0.25 to 2), `BONUS` (0 to 10) and `TOWN_BONUS` (0 to 40) moved person-days by 1 to 3: the neighbour terms barely matter at 2026 demand. The weekday `HABIT` is what moves it: 0 gives 148 days, 4 gives 130, 6 gives 120, 8 gives 112, at the price of more customers offered a later day (before the 7-day preselect cap, customers offered a first day 7 or more days later than the one they got rise from 3 at `HABIT` 4 to 59 at 8). At `HABIT` 4 the worst case is 6 days later than what the customer got.

**What the rule gets wrong, honestly.**

| Limit | Effect |
|---|---|
| It only clusters toward days already seeded. In a sparse month two customers a week apart each take the earliest day and never meet; the habit term is a nudge, not a plan | Summer is the rule's worst season: 42 days against Ryan's 39 |
| Ryan's depot is in Erie, so the drive term is about zero for two thirds of customers | Erie is ranked by neighbours and habit only |
| The simulation has no cancels, reschedules, rain, Saturdays (35 of the 466 visits, 8 percent) or calendar blocks | Real density will differ both ways |
| "Takes the first" is not how customers choose: 61 percent of fall visits were picked online from any day (PR #72) | The honest range is 147 to 130 days, not 130 |
| Peak week (Oct 19 to 23): the rule put 35 stops on Mon, Tue and Thu (one on Wed, none on Fri) where Ryan and Scott ran 48 over five days; the rest shifted to other weeks | Density by habit concentrates a peak; the 6 a person cap holds, but a Friday of slack disappears and Wednesday, the overflow day in PR #72, goes unused |
| Coordinates are street level; 81 visits use a town centre | Distances under about 0.5 km are noise |
| One season, 466 visits, an account opened in March | Treat the numbers as a direction |


## 9. The Jev seam

Jev never sits in the booking path: a model takes 30 to 90 seconds and a customer needs an answer in under a second. Jev replaces two pure functions, both behind the same types, and reads and writes only through the API.

| Seam | Today (this design) | Jev may replace | Inputs | Outputs |
|---|---|---|---|---|
| `rankDays` | the score in 3.2 | the weights, or the whole function for a batch re-rank | candidate list with each explain object, `OfferWeights { near, bonus, wait, maxHop }`, the week's visits | an ordered list of days per visit, one line of reasons each |
| `orderStops` | NN plus 2-opt | the algorithm, for a day that needs a solver | stops, pinned stops, matrix, start point | an order, with drive minutes saved |
| plan | none | whole-week planning (week-planning design, section 4) | `schedule.week`, `schedule.day`, `people.list`, `visits.list`, `schedule.driveTimes` | one write: `schedule.plans.create`, accepted by Ryan, applied through `visits.move` |

Records never change shape: Jev reads `visit`, `person`, `property`, `service`; it writes nothing but a plan. Every rule in section 5 is enforced by the app on accept, so Jev cannot break a told window. Weights live in code, not in Settings; Jev may propose a change in a plan note, Ryan changes the code or accepts the plan.

## 10. Data and API

**No new table through stage 5.** Stage 6 adds `drive_time` (section 7). New columns:

| Column | Row for `docs/DATA_MODEL.md` |
|---|---|
| `service.bookable_from`, `service.bookable_to` | text `MM-DD`, nullable (both null: all year). Who sets: Ryan in Settings › Services. Read by: `offerDays`, the booking picker's "Opens Apr 25", `visits.move` warning, `placeVisit`. Replaces `settings.windows` (Season windows) as the source of when a service is offered |
| `person.start_lat`, `person.start_lng` | real, nullable; where the person's day begins (a second truck's driveway). Null: the shop (Erie centre). Who sets: Ryan, People tab. Read by: ordering. Stage 5 |

Nothing else: told windows are read from `message_log`; capacity is read from `person.capacity_by_kind`; stop order and time stay in `visit.stop_order`, `visit.start_time`.

**Handlers.**

| Handler | Change |
|---|---|
| `schedule.offerDays` (checkout scope) | Input gains `serviceKey`, `lat`, `lng`, optional `visitId` (reschedule), `more`; keeps `town`, `kind`, `season`, `zones`. Output days gain `why { label, near, same, addedMinutes, estimated }`, `preselected`. Pure ranking in `src/lib/scheduling/offer.ts`; `openSlots`, `offeredDays`, `spreadDays` and `area` are removed |
| `visits.areaDays`, `visits.pick` | Call the same function with `visitId`; `pick` refuses a day not in the current offer set and re-checks capacity at write |
| `schedule.orderDay` (new) | `{ personId, day, apply }`; without `apply` returns before, after, drive minutes saved, the pinned stops; with it writes the order and times |
| `visits.move`, `visits.create` | Return `warnings[]` for soft conflicts; a `confirm: true` writes anyway; hard conflicts still throw |
| `visits.cancel`, `visits.cancelSelf` | Order the freed day; nothing else, because capacity is derived |
| `schedule.week`, `schedule.day`, `schedule.driveTimes` | Read tools for Jev (week-planning design) |

**Events** (new kinds in `src/lib/events/kinds.ts` with words): `visit.scheduled` and `visit.moved` detail gains `offered: [{ day, label, score }]` and `rank` so an offer that was ignored is visible; `visit.window_changed` (who, from, to); `visit.rained_out` (the reason on a day's visits).

**Tests, one per use case** (pglite for handlers, plain unit tests for the pure rule):

| Case | Test |
|---|---|
| New booking, each kind | April example: Tue Apr 28 first with label `neighbours`; blowout in Oct with two people; repair gets 2 WAIT |
| Second customer, same street | Day with 4 stops still ranks first until the cap, then falls to the next |
| Reschedule | Own slot excluded; old day ordered; freed capacity offered to the next customer |
| Cancel frees | `visits.cancelSelf` then `offerDays` shows the day again |
| Ryan adds by phone | `visits.create` with a day outside the offers returns the soft warnings; `confirm` writes |
| Ryan moves | Both days ordered; told window kept; a pinned insertion refused for a customer |
| Second truck | New person: offers include a day both could take; no old visit changed |
| Rain day | Day cleared; each visit re-offered; `Place all` writes first offers |
| Fall rush | 54 blowouts in a week fits two people at 6 a day; the 55th offers week 3 |
| Must be home | 1-hour window, same offers |
| Outside six towns | `{ outside: true }`, nothing saved |
| No visits in town | Firestone seeds the Longmont Wednesday |
| Day-before rule | After the day-before message, `orderDay` leaves `start_time` unchanged |
| Provider down | Matrix stub throws: offers return with `estimated: true` |

## 11. Build order

Each step ships and has value on its own.

| Step | Ships | Replaces |
|---|---|---|
| 1 | `offer.ts` (pure; constants in one `OFFER_WEIGHTS` object), straight-line drive, tests of the April example and a replay test (the simulation on an anonymised fixture of points, no names, must give 130 driving days plus or minus 3); `schedule.offerDays` and `visits.areaDays` call it; the "We're already in Erie" line | `openSlots`, `offeredDays`, `spreadDays`; pass checkout days become ranked |
| 2 | `service.bookable_from/to`; booking picker reads them; `visits.pick` and `cancelSelf` use the engine | `settings.windows` as the season source |
| 3 | Order the day preview with told-window pins; `window_changed` event and text | `orderStops` call sites |
| 4 | Soft conflicts on `visits.move` and `visits.create`; the offers list beside Ryan's day picker; rain day "Place all" | `placeVisit` throws |
| 5 | Second truck: `person.start_lat/lng`, the sweep assignment | one-person assumption in `orderDay` |
| 6 | Google matrix, `drive_time` cache, OSRM fallback if caching is not allowed | straight-line estimate |
| 7 | The Jev plan seam | |

`area` and its four settings are removed in step 1's follow-up; nothing reads them after.

## 12. Five questions for Hannah

1. **May Ryan overbook a day by phone, with a warning?** Recommended: yes, to the cap plus 2, with one tick to confirm; customers never exceed the cap. Today the app refuses.
2. **Preselect the best-fit day, or always the earliest?** Recommended: best fit, but never a day more than 7 days after the earliest open day, and for a repair the earliest. Your words were "the first is preselected"; this keeps your Tuesday-with-three while stopping a week-long wait for a neighbour.
3. **When Ryan moves a window already told, text the customer?** Recommended: yes, one text, "Your window changed to 10 am to 12 pm". Without it the told window is a promise the app cannot keep.
4. **Frederick, Dacono, Boulder and Westminster were 24 visits in 2026. Online?** Recommended: no, still "call Ryan"; Ryan adds them by phone and the engine ranks days by nearest stop with an "outside the six towns" warning.
5. **Spend on Google road times when the second truck starts?** Recommended: yes; my estimate is under $100 a season, possibly nothing inside the 10,000 free elements a month; until then straight-line. Check the cache terms with Google before building step 6.
