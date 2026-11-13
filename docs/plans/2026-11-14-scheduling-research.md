# Scheduling research: how others do it, and what we should do

Written 2026-11-14. Goes deeper than `2026-11-13-scheduling-design.md` and `2026-11-13-checkout-scheduling-research.md`; it does not repeat them. Sources are cited inline by number and listed at the end. Where a source is a vendor or an anecdote, the text says so. I could not find FieldRoutes' own help pages on route days, and I found no controlled study of "customer picks the day" for unattended services; both gaps are named below rather than papered over.

## (a) Summary: what the industry does and what the evidence says

1. **Route businesses assign the day; the customer gets a window late.** Pool companies give each zone a weekday and every customer in the zone gets that day each week, and the fixed day is treated as a promise to the customer as well as a routing rule [5]. Irrigation companies are the closest match to us. Hydroscapes (PA) builds a master schedule from every contracted client, then emails a tentative date and an arrival window two to three weeks ahead with a confirm link [1]. Senske (WA) does not let customers pick a date online; staff assign it and send reminders one to two days ahead [1]. A Kentucky company sends the date and an approximate time, never a fixed slot, and says a truck in your street may be on a route set before you signed up [2]. A Colorado company groups blowouts into geographic routes with at least 72 hours' notice, a free move to another open day, and shorter notice allowed when freezing approaches [3].
2. **Nobody in this trade promises a day in November for the following May and an hour with it.** The pattern is: season contract, tentative date weeks before, window days before.
3. **Window size matters, but contact matters more.** In J.D. Power's telecom technician studies (2018 to 2020), scheduling satisfaction was 49 points higher for a one-hour window than for two hours, and 104 points higher than for four hours; being contacted before the tech arrived was worth 138 points on scheduling satisfaction in 2018 and 86 points on overall satisfaction in 2020 [7]. A plumbing study reported 8.01 of 10 for a one-hour window and 5.52 for four hours, about 0.82 points lost per extra hour [8]. These are telecom and plumbing, attended visits. Our unattended visits are less sensitive, our attended ones just as sensitive.
4. **Density and fixed windows fight each other.** Time windows turn routing from "shortest loop" into a harder problem where every visit must land inside its window [9]. The standard practical answer is cluster first, route second: group stops into one vehicle's territory, then order each group [10].
5. **Capacity, not choice, is the real design lever.** Grocery slot systems show only slots with room, mark the rest "sold out," and offer discounts on longer or slower-filling slots to steer demand [11]. Amazon Day lets the customer pick a weekday, defaults to nothing forced, and can be changed anytime [12]: choice at the level of the day, not the hour.
6. **Auto-renewal law asks for the same few things everywhere:** clear terms and a separate consent before the card is charged, a retainable confirmation, a reminder before each renewal (Colorado: 25 to 40 days [13]), and cancellation as easy as sign-up [13][14][15].

## (b) The problems to solve

1. What day are you coming?
2. What time?
3. What if I am not home in the morning?
4. Can I change it?
5. What if it freezes early?
6. What if Ryan blocks that day in Jobber after I bought?
7. What if my street's day is full?
8. What if I buy in July?
9. Does it renew?
10. How does Ryan keep a truck-day in one town?
11. When does the route get built?
12. What does the admin have to do, and when?

## (c) Each problem: how others solve it, options, recommendation

**1. What day are you coming?**
Others: pool and irrigation firms assign by zone or list [2][5]; Hydroscapes proposes a date and asks for confirmation [1]; Amazon Day lets the customer choose a weekday [12]. Colorado's Front Range firm offers a move to another open day [3].
Options:
- A. Assign: we pick, tell them in April. Best density, but a paid customer has no day for months (the complaint we had).
- B. Choose from three days inside their town's route days (the 11/13 model). Certainty and still dense, because only route days are offered.
- C. Choose a month only at purchase, we assign the day two to three weeks out (Hydroscapes). Maximum flexibility for Ryan, weakest promise.
Recommendation: B, with the offered days limited to that town's route days, and labelled "your day" not "your appointment." It is the only option that answers the owner's customer. Treat the day as firm for everything except weather and a Ryan-side conflict, and say so in the confirmation.

**2. What time?**
Others: ServiceTitan builds windows from business-hours slots, its own examples three hours, and sends day-before reminders plus an on-my-way text [6]. The Kentucky firm gives an approximate time [2]. Hydroscapes gives a window with the date [1]. J.D. Power favours narrower windows and any contact before arrival [7].
Options:
- A. Two-hour windows built two weeks out (11/13 model). Matches J.D. Power's middle band.
- B. Half-day (morning or afternoon) only, plus an on-my-way text. Easiest for Ryan, but four hours scores worst on the evidence [7][8].
- C. Day only for unattended visits; windows only for customers who must be home. Least promised, least to break.
Recommendation: C as the base, A for anyone who ticked "must be home." Most of our visits are unattended; only promise hours where someone is waiting. Everyone gets the day-before text and an on-my-way text, because contact is the larger effect [7].

**3. What if I am not home in the morning?**
Others: TruGreen says you need not be home and leaves a summary at the door; it recommends a first-visit presence only [4]. A Minnesota provider says the tech can finish without you [see 4's search results; vendor claim]. LawnStarter says most visits do not need you home [4].
Options:
- A. Ask one question at purchase: "Do you need to be home?" Yes means morning, afternoon or either; no means no window needed.
- B. Ask "morning, afternoon, either" of everybody. More data, more friction, and most answer "either."
- C. Ask nothing; they call.
Recommendation: A. The answer decides whether we promise a window at all. Default "No, you do not need to be home" with the access note (gate, pets, controller location), since blowouts are often done from the outside meter or garage. Never use 8 to 10 as a default window; the owner is right that it is the worst hour for working households.

**4. Can I change it?**
Others: a Colorado firm lets the customer move to another open day at no fee but charges $10 to cancel and $49 inside 48 hours [3]; Hydroscapes accepts a change by reply or phone [1]; Amazon Day is changeable anytime [12].
Options:
- A. Self-service move to another offered day, up to 48 hours before (11/13 model).
- B. Request only, Ryan approves.
- C. Free move once, then a fee.
Recommendation: A, free, because moving into an already-offered day costs Ryan nothing, and B only creates admin. Add a limit of two moves per visit before it becomes a call.

**5. What if it freezes early?**
Others: Hydroscapes treats October 1 as the earliest start and aims to finish before Thanksgiving, with urgency rising as ground temperatures stay below freezing [1]. The Colorado firm allows shorter notice in fast-changing weather and waives fees if notice was short [3]. Snow removal has no booked time at all: service is triggered by depth and runs in a priority route order [16].
Options:
- A. Pre-commit a day but write in the terms that fall days may move up to 14 days earlier with at least 48 hours' notice, free; customer may then pick a new day from what is open.
- B. Date the fall visit as a week ("week of October 20") only.
- C. Two tiers: reserved day, or "first available before freeze" at a lower price.
Recommendation: A. Say it at purchase in plain words, send one text per stop on a moved day, and give a one-tap "this day does not work, offer me another" link. Hold back the last two weeks of the window as slack capacity; do not sell every day.

**6. What if Ryan blocks that day in Jobber?**
Others: Hydroscapes keeps daily buffer time for emergencies and fills gaps with reschedules [1]; the Colorado firm waives fees when it gives short notice [3]. No source solves a calendar feed conflict; field-service tools simply re-optimize the day [vendor claims, FieldRoutes summaries].
Options:
- A. Daily read of Jobber blocks; conflict row on Home; Ryan moves stops (11/13 model).
- B. Auto-move conflicted stops to the next offered day and text the customer.
- C. Block days in advance through a "pass days" calendar Ryan owns, and never double-use.
Recommendation: A for now, with C as the long fix: ask Ryan to block personal days when he knows them, and the offered days shrink at once. Keep B off until we trust the offers, because silently moving a paid day creates the very surprise we are avoiding.

**7. What if my street's day is full?**
Others: grocery systems show only slots with room, mark the rest sold out, and sometimes steer with price [11]. Senske books late customers for next season if there is no room [1].
Options:
- A. Show only open days; if none, say so before the card step and take an email.
- B. Open Saturday or add capacity for that town.
- C. Charge a premium for a late or crowded slot (the Kentucky firm sells next-day service [2]).
Recommendation: A, and let Ryan see the waiting list so he can choose B. Do not use C yet; a premium on a prepaid pass is a surprise.

**8. What if I buy in July?**
Others: Senske and Hydroscapes book active customers first and slot late ones into leftover room [1].
Options: A. Sell only visits still ahead, priced for those visits (11/13 model). B. Sell the full pass and credit the missed visit. C. Do not sell the pass after the spring window; sell visits singly.
Recommendation: A. It is honest and needs no refunds.

**9. Does it renew?**
Others: see the law notes below. Plan sellers word an unticked box and a reminder email that names the price and the cancel link; I could not verify specific competitor wording and do not quote any.
Options: A. Ticked-by-the-customer opt-in at checkout, renew each season. B. Reserve next season only, no charge. C. Annual manual repurchase.
Recommendation: A, with the box unticked by default and the terms next to it ("Renews each October... you will be charged $X on [month] unless you cancel. Cancel any time in one click"), plus a retainable confirmation email, plus the reminder. Colorado requires at least 25 and no more than 40 days before renewal, by mail or email (text only if the customer authorised it) [13]. New York wants 15 to 45 days before the cancellation deadline for terms of a year or more [14]. California's 2025 changes need separate consent to the renewal itself, a yearly reminder, and kept consent records [15]. A reminder at 30 days satisfies both Colorado's and New York's ranges. Note: the 11/13 design renews in January with a 30-day email; check that the 30 days is counted before the charge date, not before the first visit. I read the statutes through summaries; a lawyer should confirm the wording before launch.

**10. How does Ryan keep a truck-day in one town?**
Others: cluster first, route second [10]; pool "pool days" [5]; Senske's router slots recurring customers [1]; the Colorado firm "geographically optimized routes" [3].
Options: A. Route days per town per window, offered days only (11/13 model). B. Rolling rule: a town opens a day only after a minimum of N stops commits. C. Optimizer chooses days.
Recommendation: A now. A town day exists only if Ryan names it. B is a later refinement: if after a week a day has only two stops, move them. C is overkill (see below).

**11. When does the route get built?**
Others: Hydroscapes at 2 to 3 weeks with a confirm link [1]; Senske at 1 to 2 days [1]; Kentucky firm sends a date with approximate time [2].
Options: A. Fourteen days out, window sent (11/13 model). B. Seven days out. C. Day before only.
Recommendation: A for attended customers, who need planning time; B for everyone else, with the day-before text.

**12. What does the admin have to do, and when?**
Others: Hydroscapes' master schedule, supervisors and router each handle a piece; staff handle exceptions [1].
Recommendation: four recurring tasks only. (1) Once a season: set route days, working days, capacity. (2) Weekly, from September: check the freeze forecast and decide whether to pull a day. (3) Fourteen days before each truck-day: review the proposed order, fix any stop by hand, press send. (4) Daily: clear Home rows (conflicts, full days, waiting list). Everything else automatic.

### What a two-truck company needs from an optimizer, versus what is sold

Vendor tools and OR-Tools solve many vehicles, many windows and many depots at once [9]. With two trucks, one town per day and mostly open windows, the problem is small enough for nearest-neighbour plus a swap pass, fixed stops placed first as anchors, and a manual drag. Buy or build an optimizer only if Ryan adds a third truck or most customers demand tight windows. The scarce skill is deciding the rules (route days, capacity), not computing the loop.

## (d) What we would be the first to do

A day chosen at purchase, with a window issued from a route built two weeks out, has no exact precedent I found. Hydroscapes is closest: tentative date plus window two to three weeks ahead, but the customer did not choose the day at purchase [1]. Risks:
- **Broken promise:** a "firm" day moved by weather or Ryan. Mitigation: terms in plain words at purchase, a free move, one text.
- **Sold out the slack:** if every day is sold, there is no room to pull fall days earlier. Mitigation: reserve the last two weeks and cap each truck-day below real capacity.
- **Density drift:** customers choose spread-out days in one town. Mitigation: only route days are offered, and Ryan can close a thin day.
- **Admin load:** a conflict row per week in October could swamp Ryan. Mitigation: Home shows one count, one action each.
- **Legal:** a renewal that auto-picks days could look like a material change. Mitigation: the reminder lists the days and offers change or cancel.
- **Evidence gap:** no study I found says customers keep a chosen day more reliably than an assigned one. Test it with the first season's move and no-show rates.

## (e) Open questions only Ryan can answer

1. Which weekday, per town, do you want in April to May, July and October?
2. How many stops fit in a truck-day for a turn-on, an inspection and a blowout?
3. Do you work Saturdays in October? Would a second truck be used on a freeze week?
4. Which customers must be home, in your experience: share, and which kinds?
5. How early can you pull fall days earlier, and how many days of notice is realistic?
6. How many days of slack would you hold back in the last two weeks of October?
7. Will you block personal days in Jobber more than two weeks ahead, or find out the same week?
8. Do you want customers to move themselves, or request a move?
9. Would you rather lose density or lose a customer who needs an exact hour?
10. What do you do today when nobody answers at a stop: skip, wait, come back?

## Sources

1. Landscape Professionals blog, "Optimizing operations: scheduling irrigation winterizations" (Hydroscapes, Senske): https://blog.landscapeprofessionals.org/optimizing-operations-scheduling-irrigation-winterizations/
2. Everist Irrigation, "FAQs about winterizations": https://everistirrigation31.snappages.site/blog/2022/10/07/faq-s-about-winterizations
3. Front Range Outdoor Solutions (Colorado) blowout booking page: https://tally.so/r/obLKzN
4. TruGreen FAQ and customer reviews: https://www.trugreen.com/blog/trugreen-lawn-care-services/trugreen-answers-frequently-asked-questions ; LawnStarter: https://www.lawnstarter.com/blog/lawnstarter/lawnstarter-fertilization-weed-control/
5. SmartService, "Pool service route": https://www.smartservice.com/blog/pool-service-route (vendor)
6. ServiceTitan help center, arrival windows and notifications: https://help.servicetitan.com/docs/set-up-arrival-windows-for-customer-notifications-and-confirmations
7. J.D. Power, US Telecom In-Home Service Technician Study: https://www.jdpower.com/business/press-releases/us-telecom-home-service-technician-study ; 2020: https://www.jdpower.com/business/press-releases/2020-us-telecom-home-service-technician-study
8. Zion & Zion, "Waiting for the Plumber": https://www.zionandzion.com/research/waiting-for-the-plumber-how-consumer-satisfaction-is-affected-by-wait-time
9. Google OR-Tools, Vehicle Routing Problem with Time Windows: https://developers.google.com/optimization/routing/vrptw
10. Cluster-first, route-second and the sweep method (university lecture notes): https://imada.sdu.dk/u/march/Teaching/AY2013-2014/DM204/Slides/dm204-lec13.pdf
11. Grocery slotting and incentives: Campbell and Savelsbergh (Peapod), https://myweb.uiowa.edu/acampbll/papers/CDbookchap.pdf ; Strauss et al., https://opus4.kobv.de/opus4-whu/files/799/Dynamic_pricing_Strauss_2020_Preprint.pdf
12. Amazon Day Delivery: https://www.aboutamazon.com/news/operations/what-is-amazon-day-delivery
13. C.R.S. 6-1-732: https://colorado.public.law/statutes/crs_6-1-732
14. N.Y. General Business Law 527-a: https://newyork.public.law/laws/n.y._general_business_law_section_527-a
15. California AB 2863 summary (Kilpatrick Townsend): https://ktslaw.com/insights/alert/2024/10/california-latest-automatic-renewal-law-amendments-take-effect-in-july-2025
16. Snow route planning (vendor): https://www.upperinc.com/guides/how-to-build-snow-removal-routes/
