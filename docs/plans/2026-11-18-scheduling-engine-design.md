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

Each is a story with what goes in and what must come out. "Decision" points to a question in section 3; nothing here depends on a design choice that is not listed there. Numbers are from Jobber's 2026 data (PR #72) unless marked.

| # | Story | In | Out | Decisions |
|---|---|---|---|---|
| 1 | **A new customer books a Season Pass.** Andrea, Erie, 8 zones, books on Fri Apr 24 | Address and point, zones, today, the two visits' windows (spring turn-on, fall blowout), the days Ryan and anyone else already have | For each of the two visits, a few days, one preselected, each with a reason in plain words ("We're already in Erie that day"). She picks, or accepts. Two visits made with their days; the day-before text will carry the window | 1, 2, 3 |
| 2 | **A new customer books a spring turn-on.** Same address, no pass | As above, one visit | Same days as story 1 for that date; first one preselected. If Ryan already has three Erie turn-ons on Tue Apr 28, that Tuesday is the first offer (Hannah's rule) | 1, 2, 3 |
| 3 | **A repair.** A broken head, today is Monday | Address, repair (about 2 hours, 3 a day at most) | The soonest workable days. A repair is urgent: this is where waiting for a neighbour matters least | 1, 12 |
| 4 | **A fall blowout in the rush.** Wed Oct 7, Erie | Address, blowout (about 30 minutes, 6 to 8 a person a day), a window of Sep 28 to Nov 15, 54 blowouts booked in the peak week | Days in the next 28 days that still have room; as a day fills, the next is offered; if Erie is full for 4 weeks, "These days are full. We'll call you" and a job in Needs a day | 1, 3, 9 |
| 5 | **A second customer on the same street.** An hour after story 2 | The same, plus Andrea's visit now on Tue Apr 28 | The same Tuesday first, so the day fills by neighbourhood, until it is full | 1, 9 |
| 6 | **A town with no visits yet.** First Firestone booking of the spring | Address; Ryan has nothing in Firestone | The nearest open days, ideally days Ryan is in a nearby town (Longmont); the first booking seeds a day, the second Firestone customer then sees it with a neighbour | 1 |
| 7 | **A customer must be home.** Jim; the controller is inside | The same, plus "I need to be there" | The same days. The day-before text gives a window; the question is how narrow | 7 |
| 8 | **A customer reschedules online.** Andrea moves Tue Apr 28 to another day, 5 days ahead | Her visit, today, the 24-hour rule | The same offer, with her own slot not counted against the day; the old day is freed and its other stops re-ordered; Ryan sees "Andrea moved Tue to Thu". Inside 24 hours: "Text or call Ryan" | 1, 5 |
| 9 | **A customer cancels.** One-off repair, 3 days ahead | Her visit, the 24-hour rule | Visit cancelled, line cancelled, the day's room returns for the next customer, a Home row for Ryan. Nothing is charged | none |
| 10 | **Ryan adds a customer by phone.** Mrs Tran calls while he is driving | A name, address, service, a day Ryan prefers | The same offers shown beside his day picker with their reasons, so he can see what the rule would suggest; he can pick any other day and sees what breaks (too long a day, over capacity, outside the dates, a window already told) | 4, 6 |
| 11 | **Ryan moves a visit** to another day or to the second truck | A visit and a target day and person | The old and new day re-ordered; the customer texted the new day; windows already told to other customers on either day are not changed behind their back | 4, 5 |
| 12 | **A second truck is added mid-season.** Scott joined on Sep 21 in 2026 | A new person with working days and what they do per day; where they start | Offers count both people; a day can be full for one and open for the other; no existing visit moves | 8, 10 |
| 13 | **A rain day.** Wed Oct 14, 15 stops, two people | Ryan marks the day rained out | Every visit that day needs a new day; each is offered days by the same rule; customers get the moved-date text with the reason | 9 |
| 14 | **An address outside the six towns.** Dacono (24 visits to Frederick, Dacono, Boulder and Westminster in 2026) | An address in none of the six | Online: "We don't serve that town yet. Call Ryan" and nothing is saved. By phone: Ryan can still add it | 6 |
| 15 | **The day before.** 6 pm Mon Apr 27, tomorrow's stops are ordered | The day's stops and their order | Each customer is told a two-hour window from that order. After the text goes out the window is a promise | 5 |
| 16 | **Ordering Ryan's day.** Tue Apr 28, five stops | The stops, their points, Ryan's start | A stop order, times from 8:00 with service minutes and drive, lunch, and a before-and-after: "Drive 94 min, now 71, saves 23" | 10 |

## 3. Decisions the design cannot make without Hannah

Numbers in the options come from Jobber's 2026 data or from a trial replay I ran for this: 466 of the season's customer visits through a draft of the rule. The replay is not in this file; it is saved in the shared notes folder and will be written up with the design.

**1. How much later than the soonest open day may the day we preselect be?** Today a customer is offered the soonest days. Putting them on a day Ryan is already near saves him days but can make them wait.

| Option | A customer | Ryan |
|---|---|---|
| A. Always the soonest open day (0 days) | Soonest possible | About 154 driving days a season in the trial, against 166 in 2026: little saved |
| B. Up to 3 days later | A short wait for a neighbour day | Roughly in between |
| C. Up to 7 days later (my recommendation) | Offered a later first day than they got in 18 percent of cases, never by 7 days or more | About 130 driving days (22 percent fewer), 3 percent less drive |
| D. Up to 14 days later | Many wait a week or more for a neighbour | About 110 days, but a third to two fifths of customers wait longer |

**2. How are the days shown?**

| Option | A customer | Ryan |
|---|---|---|
| A. Date order, the best-fit day preselected and labelled (recommended) | Reads like a calendar; the label says why | Same as C above |
| B. Best-fit first, then the others | The preselected one is always on top, but dates can jump around | Same |
| C. Only the best-fit day, with "Show more days" | Fewest choices, least friction | Strongest density; a customer who dislikes it must tap |

**3. How many days at first?**

| Option | A customer | Ryan |
|---|---|---|
| A. Three, "Show more" up to nine (recommended) | Enough choice, an escape | Offers stay near neighbours |
| B. Five | More choice | More days with a single stop |
| C. Three, no more | Simplest | Customers who cannot make them call |

**4. When Ryan adds or moves a customer and the day is over capacity, what happens?**

| Option | A customer | Ryan |
|---|---|---|
| A. Refused (today) | Never an overlong day | He must free room first |
| B. Warned, one tick to allow, up to the comfortable number plus 2 (recommended) | Rarely sees a late arrival | His business: he is told what breaks and decides |
| C. Allowed with no limit | Possible late windows | No friction, no safety |

**5. Once a customer has been texted tomorrow's window, may Ryan move it?**

| Option | A customer | Ryan |
|---|---|---|
| A. Never; he must call them | The window is kept | Hard when a day goes wrong |
| B. Yes, and the customer is texted "your window changed to 10 to 12" (recommended) | Told, never surprised | Free to fix the day |
| C. Yes, silently | May wait at home for nothing | Free, but the promise is broken |

**6. Frederick, Dacono, Boulder and Westminster (24 visits in 2026), and other addresses outside the six towns.**

| Option | A customer | Ryan |
|---|---|---|
| A. Online: "Call Ryan", nothing saved; by phone: Ryan may add them (recommended) | A phone call | Keeps full control; warned it is outside |
| B. Online: offered days if within a set drive of a day Ryan already works | Books like anyone | More small-town work, more far stops |
| C. Online: take an email to tell them when we arrive | No day, a promise | A list to work |

**7. A customer who must be home.**

| Option | A customer | Ryan |
|---|---|---|
| A. A two-hour window like everyone (recommended) | May wait at home two hours | Simplest day |
| B. A one-hour window, tighter ordering for that stop | Shorter wait | Stops with that rule are harder to fit |
| C. The customer names a half day (morning or afternoon) | Fits their day | Fewer days offered to them |

**8. Two trucks can both take a customer on a day: who gets them?**

| Option | A customer | Ryan |
|---|---|---|
| A. Whoever adds least drive, ties to the owner (recommended) | Unaffected | Routes stay tight |
| B. Spread evenly | Unaffected | Balanced days, more drive |
| C. The owner first until full | Unaffected | Second truck gets the leftovers |

**9. A rain day, 15 stops with no day.**

| Option | A customer | Ryan |
|---|---|---|
| A. The app proposes each visit's best day; Ryan reviews and presses one button; customers are texted (recommended) | Told once, with the new day and the reason | One review, not 15 calls |
| B. Each customer is texted to pick a new day | Choice, but 15 replies | Less control of the week |
| C. Ryan places each by hand | A text each | A long afternoon |

**10. Road drive times when the second truck starts: straight-line estimates, or Google Routes?**

| Option | A customer | Ryan |
|---|---|---|
| A. Straight line times 1.3 at 40 km/h for good (recommended to begin) | No visible difference | Free; errors on a few hops |
| B. Google Routes basic, cached; my estimate is under $100 a season and may fit the free 10,000 elements a month | Slightly truer windows | A small bill; check Google's cache terms first |
| C. A free road engine we host | Same as B | We run a server |

**11. Saturdays (35 of 466 visits in 2026, nearly all April to August).**

| Option | A customer | Ryan |
|---|---|---|
| A. Never offered online; Ryan adds them by hand (recommended) | Monday to Friday only | Saturday stays his choice |
| B. Offered when Ryan turns a Saturday on | More days in a busy week | He opts in week by week |
| C. Always offered | Most choice | A seven-day week |

**12. How many days does a repair get, and how fast?**

| Option | A customer | Ryan |
|---|---|---|
| A. The three soonest workable days, ignoring neighbours (recommended) | Fixed fast | Some single-stop days |
| B. The same rule as everything else | May wait a few days | Denser |

**13. The most one person does in a day, for the offers** (Ryan's number, not mine). PR #72: Ryan comfortable at 6 blowouts, tops out at 7 or 8; repair up to 3 in a day; turn-on one a day in 2026 was demand, not capacity.

| Option | A customer | Ryan |
|---|---|---|
| A. Blowout 6, turn-on 5, inspection 3, repair 3 per person (recommended, from the data) | Days fill a little sooner | Not overloaded |
| B. His own numbers | Whatever he says | His call |

**Not blocked, decided already:** no Routes or Seasons settings; a customer picks a day, never a time; nothing is deleted; cancel or reschedule online closes 24 hours before; the second truck is a person, not a new table.

**State of this branch.** Parts three to eleven of the brief (the rule, ordering, moving and adding, capacity, drive time, the replay, the Jev seam, data and API, build order) are not in this file. The full draft I had written is saved at `scheduling-engine-full-draft-2026-11-18.md` in the shared notes folder and in git history on this branch (commit before this one); PR #74 still carries that earlier draft.
