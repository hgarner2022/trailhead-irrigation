# The scheduling engine

Part one, Nov 18 2026. Research, the use cases and the decisions that need Hannah. **The design itself (the offer rule, ordering, moves, capacity, drive time, the replay of 2026, the Jev seam, data and build order) is deliberately not in this file until her answers are in.** It will replace the area groups behind `openSlots`, `offeredDays`, `spreadDays` and the straight-line `orderStops` with one engine that works from where the customer lives. It builds on `2026-11-18-week-planning-design.md` (the Jev seam), `2026-11-18-online-booking-design.md` (the flow that shows the days) and `2026-11-18-routes-and-seasons-answers.md` (PR #72, Jobber's 2026 numbers).

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

### 3.2 What these do not answer: four questions

**Q1. How far past the soonest open day may we reach to find a neighbour day?** Decision 1 says soonest first and nearness orders "within the soon range". The April example: Mon Apr 27 is open and empty, Tue Apr 28 has three Erie turn-ons. The range is how far we may skip.

| Option | A customer | Ryan |
|---|---|---|
| A. No skipping: nearness only orders the first three open days | Always gets the soonest days | Little clustering; my earlier trial of this arm needed 154 driving days against 166 in 2026 |
| B. The soonest 5 open weekdays (about one week): offer the three nearest of them (recommended) | At most about 4 days later than the soonest day | More Erie work on the same days |
| C. The soonest 10 open weekdays (two weeks) | May wait up to two weeks for a neighbour day | Densest |

(My earlier trial used a different rule with a weekday habit, so its numbers are not these; the full design re-runs it on the rule you choose.)

**Q2. An address outside the six towns** (Frederick, Dacono, Boulder, Westminster: 24 visits in 2026).

| Option | A customer | Ryan |
|---|---|---|
| A. Online: "We don't serve that town yet. Call Ryan"; nothing is saved. By phone Ryan may still add it, with a warning (recommended) | A phone call | Keeps control of far stops |
| B. Online: offered days when it is within about ten minutes of a day Ryan already works | Books like anyone | Picks up Frederick and Dacono from Erie days; more far stops |
| C. Take an email to tell them when we arrive | No day, a promise | A list to work |

**Q3. A rain day: 15 stops lose their day.**

| Option | A customer | Ryan |
|---|---|---|
| A. The app proposes each visit's soonest nearest day; Ryan reviews and presses one button; each customer is texted the new day and the reason (recommended) | Told once | One review, not 15 calls |
| B. Each customer is texted to pick | Choice, but 15 replies | Less control of the week |
| C. Ryan places each by hand | A text each | A long afternoon |

**Q4. Ryan adds or moves a visit onto a day that is already at its count for that kind.**

| Option | A customer | Ryan |
|---|---|---|
| A. Refused: he frees room first | Never an overlong day | Blocked mid-call |
| B. Warned with what breaks, one tick to allow (recommended) | Rarely late | His business: told, then decides. Online offers still never exceed the count |
| C. Allowed silently | Possibly late | No friction, no safety |

**State of this branch.** Sections 3 to 11 of the original brief (the offer rule, ordering, moving and adding, capacity, drive time, the replay of 2026, the Jev seam, data and API, build order) are written after Hannah answers Q1 to Q4. An earlier full draft, written before Hannah's rule "soonest first", is in git history (commit 0f5a80e) and in the shared notes folder; PR #74 still carries it and is out of date.
