# The scheduler, whole: research, jobs to be done and the questions

Nov 25 2026. Research only. Nothing is designed or built from this until Hannah has answered the questions in section 8, one at a time. It covers the three surfaces as one system: the engine (which days and times are offered), the customer's booking, and the office calendar. It builds on `2026-11-18-scheduling-engine-design.md` (the offer rule, built as step 7a), `2026-11-18-admin-holistic-design.md` section 5 (the Schedule) and `2026-11-23-booking-day-time-and-repeat-research.md` (the customer's day step).

Hannah, Nov 25: "Design our scheduler from a backend perspective and a frontend perspective... present a mix of the earliest, but also optimized for drive time... use Jev and probably Google Maps API... the admin interface when someone calls, to put in where they are and the time and optimize the best groupings... The calendar needs to be best in class... we probably shouldn't automatically send people. On the notification box there's a notify customer when you move."

"Not found" means the page I or a research pass opened does not say. Nothing is filled in from memory.

## 1. Where we are today (read from the code, Nov 25)

| Part | Today | Gap against what Hannah asked |
|---|---|---|
| Offer rule (`src/lib/scheduling/offer.ts`) | Built and tested. Soonest five open days, ranked same town, then within 10 minutes, then date; three offered; slots on the half hour ordered by least added drive | Drive time is a straight line times 1.95 minutes a kilometre. No road times. No call to Google |
| Customer booking form | Storybook only, on fixture days and times. Live `/book` is still the Jobber embed | Not wired to the rule |
| Season Pass checkout, portal Reschedule | Wired to the rule, days only. `visits.pick` writes no time | No time or window is ever booked online |
| Office New job sheet | A plain date box and a fixed list of half hours | Shows Ryan nothing about which day or time is best for the caller's address. The rule exists and the sheet does not call it |
| Schedule, Week | A table: a row per person, seven day columns, one-line blocks stacked in each cell | Not a time grid. A visit's length, an overlap and an open gap cannot be seen |
| Schedule, Day | An ordered list of stops per person beside a map | Not a timeline |
| Schedule, Month | None | |
| Unscheduled | A card under the Week grid, Week view only. Schedule picks the day for Ryan | Not a side panel you drag from; no ranked choices |
| Map | MapLibre with free OpenFreeMap tiles, numbered pins in each person's colour, Day view and Home only | Not beside the week; unscheduled jobs are not on it |
| Drag | Native browser drag. Person and day only, no time, no resize. Off on a phone | |
| After a drop | **The customer is texted at once** (a visit with a booked time opens the Move dialog first). Only Schedule and Schedule all wait 60 seconds with Undo | Hannah: do not send automatically |
| Block time, Order the day, Rain out | Designed, not built. Busy time comes only from each person's calendar feed | Ryan cannot block an afternoon |
| Legacy | `visits.move` still enforces one area group per person per day and `settings.windows`; `schedule.ts`, `run.ts`, `slots.ts` are the old scheduler | Two rule sets disagree until the old one is retired (step 7b) |
| Jev | Docs only. The plan: Jev reads through the API and proposes a week plan Ryan accepts; never in the booking path | |

## 2. Jobs to be done

**The customer**

| # | When | I want | So that |
|---|---|---|---|
| C1 | I need a visit | to see when someone can come and take the first one that suits me | I am done in a minute |
| C2 | I have picked | to know exactly what was promised (a day; a time or a window) | I can plan my day |
| C3 | Something comes up | to change or cancel it myself | I do not have to call |
| C4 | The day before | to be told when and who | I am home, or the gate is open |
| C5 | Ryan moves me | to be told, once, in plain words | I am not surprised |

**Ryan on the phone with a caller**

| # | When | I want | So that |
|---|---|---|---|
| P1 | Someone calls | to type the address and the service and see the best few days and times, each with what it adds to the drive | I can say "Tuesday afternoon, we're already in Erie" while they are on the line |
| P2 | They say "I can only do Thursday" | to see Thursday's open gaps and what breaks if I force one | I can say yes or offer the next best |
| P3 | They are not sure | to save the job with no day | it waits in Unscheduled |

**Ryan planning the week** (Hannah: "I need to be able to see them")

| # | When | I want | So that |
|---|---|---|---|
| W1 | I open the Schedule | to see each person's days as blocks of real length on a clock, with the gaps | I see a full day, an overlap and a hole at a glance |
| W2 | I look at a day | to see the same stops on a map, by person, in order | I see a stop that is out of the way |
| W3 | Jobs have no day | to see them in a list and on the map, and drop one where it fits | every job gets a day |
| W4 | I move a visit | to drag it, see what breaks, undo it, and choose whether the customer is told | a slip of the hand never texts anyone |
| W5 | A day is out of order | to press one button that orders the untimed stops and keeps every promised time | I drive less |
| W6 | I am not working an afternoon | to block it | nobody books it |
| W7 | It rains, or I am running late | to move a day, or tell the rest of the day I am late | customers hear it from me |
| W8 | There are two of us | to see both people side by side and move a stop between them | the work is shared |

**Ryan and the tech on the road**

| # | When | I want | So that |
|---|---|---|---|
| R1 | I am in the truck | today's stops in order on my phone, with the map | I know where next |
| R2 | A visit runs long | to see what it pushes and tell those customers | nobody waits unannounced |

**The business**

| # | Job |
|---|---|
| B1 | Fill days by neighbourhood, so there is less driving and more visits per day, without making a customer wait longer than they would have |
| B2 | Never break a promise the customer was given |
| B3 | Cost close to nothing to run at 500 visits a year |

## 3. What the established tools do: the office calendar

Sources: Jobber [new schedule](https://help.getjobber.com/en/articles/new-schedule/), [schedule overview](https://help.getjobber.com/en/articles/schedule-overview-new-schedule/), [Find a Time](https://help.getjobber.com/hc/en-us/articles/29840886387351), [route optimization](https://help.getjobber.com/es/articles/route-optimization-new-schedule/); Housecall Pro [schedule page](https://help.housecallpro.com/en/articles/6367496-schedule-page-overview), [Optimize by drive time](https://help.housecallpro.com/en/articles/14093813-optimize-by-drive-time); ServiceTitan [reschedule a job](https://help.servicetitan.com/residential-s-r/docs/reschedule-a-job); Hannah's five Jobber screenshots of Nov 25.

| Pattern | Who does it | Ours today |
|---|---|---|
| Month, Week, Day. Day is a column per person on a clock | Jobber, Housecall Pro | Week (rows), Day (list), List |
| Hours down the side; a visit is a block as long as the visit | Jobber, Housecall Pro, ServiceTitan | No |
| "Anytime": a visit with a day and no time sits in a strip above the clock | Jobber, Housecall Pro | "Any time" is a word on the block |
| Unscheduled as a side panel with a count on its button; drag a job onto the calendar; drag it back to clear the day | Jobber (sorts: oldest, newest, client name, value), Housecall Pro (count bubble) | A card under the week, a Schedule button |
| Map as a second side panel; pins in the person's colour; hovering a visit lights its pin; opening Unscheduled adds those jobs to the map | Jobber. Housecall Pro: a Map button, routes with drive time on hover in Day view | Day view and Home only |
| Filters: type, team, status | Jobber | Who, Area |
| Drag to move, drag the edge to change the length, drag across people to reassign | Jobber, Housecall Pro, ServiceTitan | Day and person only |
| Bulk "Reschedule and reassign" | Jobber (More menu) | No |
| Order a day: only Anytime visits move; a locked stop stays | Jobber (pin first and last), Housecall Pro (lock icon) | Designed, not built |
| Phone: day list and a map, no drag | Jobber app (Day, List, 3 Day, Week, Map) | One day at a time, no drag |

**After a move, every tool asks. None sends on its own.**

| Tool | What happens after a drag | Source |
|---|---|---|
| Jobber | The toast in Hannah's screenshot: "Rescheduled visit" with **Notify**. The help page describes "Notify client?" with skip, text or email, and the message can be read and edited before it goes. Reminders tied to the old time are cancelled | new schedule article |
| Housecall Pro | A pop-up: "Notify Customer" or "Don't Notify Customer". After Optimize: "Save & notify customers" (main button), "Save & don't notify customers" (under the caret) | schedule page; optimize article |
| Google Calendar | Asks whether to email guests when an event changes | [support page](https://support.google.com/calendar/answer/37161?hl=en) |
| Square Appointments | A "Reschedule Appointment" pop-up after the drag | [Square](https://community.squareup.com/t5/Product-Updates/New-Drag-amp-drop-to-reschedule-appointments-available-on-Square/ba-p/702876) |
| ServiceTitan | Not found | |

Ours is the odd one out: a drop texts at once, and a visit with a booked time cannot be moved without a text. Guidance agrees with Hannah: a drag must be reversible by a confirm step or an undo ([WCAG technique G210](https://www.w3.org/WAI/WCAG22/Techniques/general/G210.html); [Apple HIG, drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop.md)), and every drag needs a way to do the same thing with a plain click ([WCAG 2.2, 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)), which our Move dialog already is.

What none of them documents: one-click Undo of a drag; a standing mark on a visit whose customer has not been told about a move; drive time from home to the first stop.

## 4. What the established tools do: booking a caller

This is the job Hannah described ("put in where they are and the time and optimize the best groupings"). Five tools have a named helper for it.

| Tool | What the office types | What comes back | Source |
|---|---|---|---|
| **Jobber, Find a Time** | Client, line items, who | On the calendar itself: the open gaps turn white; once the client is added, each gap shows the drive time it would add; the shortest-drive gaps are green; a gap can read "Unavailable" (a conflict) or "Unfeasible" (no room for the drive). No ranked list. The first and last drive of the day are left out | [Find a Time](https://help.getjobber.com/hc/en-us/articles/29840886387351) |
| **ServiceTitan, call booking** | Job type, customer, location | "First Available": the first four openings, the earliest starred. "Most Efficient": the same openings sorted by the time each adds to a route. "All Available": a calendar with a dot under days that have openings. A slot that cannot be booked says why | [Adaptive Availability](https://help.servicetitan.com/how-to/use-adaptive-availability-in-call-booking), [drive time in availability](https://help.servicetitan.com/v1/docs/optimize-routing-with-drive-time-and-technician-assignment-in-get-adaptive-availability.md) |
| **ServiceTitan, Schedule Assistant** | Date range, weekdays, job type | A card per person headed "+ 12 min (4 mi)", the time added to the route, sorted by "Driving Efficiency" or "First Available" | [Schedule Assistant](https://help.servicetitan.com/docs/use-schedule-assistant-1) |
| **Salesforce Field Service** | From the work order | A list of slots graded "Ideal", "Recommended", "Satisfactory", the top three pinned. The grade is a weighted score: sooner, less travel, preferred person | [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/update-a-schedule), [scheduling policies](https://trailhead.salesforce.com/en/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies) |
| **Dynamics 365, Schedule Assistant** | Location, date range | Recommended people with estimated travel time; a map with numbered routes | [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/schedule-assistant) |
| **ServiceM8** | From the job card | Suggested times, each previewed beside its neighbours with the travel from the stop before | [ServiceM8](https://www.servicem8.com/updates/booking-previews) |
| Housecall Pro | Only for service-plan visits | Suggestions at the right of the schedule, ranked by straight-line nearness to existing jobs, next 7 days | [HCP](https://help.housecallpro.com/en/articles/8124459-service-plan-scheduling-suggestions) |

**The settled shape:** hard rules filter first (hours, room for the drive, the service's dates), then the openings are shown two ways, soonest and least added drive, and each carries the added drive as a number. The office always makes the final pick. Our rule already computes every piece of this; it is only missing from the screen.

## 5. Which slots to offer a customer: the method

| Finding | Source |
|---|---|
| The published method is the one our rule uses: for each candidate slot, try inserting the new address into that day's route; offer the slot only if it fits; rank by the drive it adds; check again when the customer confirms | [Truden et al.](https://arxiv.org/abs/2010.00385v3); [Agatz et al. 2011](https://repub.eur.nl/pub/25987/TimeSlotManagement_2011.pdf); ServiceTitan's "time added to a technician's overall route" |
| **The length of the promise is the biggest lever.** Short windows "can increase delivery costs significantly"; the same authors build routes as bookings arrive and offer long windows as the standard. In one working paper 15 percent fewer customers accepted when only short windows were offered | [Köhler, Ehmke, Campbell 2020](https://ideas.repec.org/a/eee/jomega/v91y2020ics030504831830803x.html), [working paper](https://journals.ub.ovgu.de/index.php/FEMM-WPS/article/view/61/65) |
| Our own replay of 2026 says the same: with exact times the rule needed 181 driving days against Ryan's 166, because a booked exact time fixes an order nothing can improve afterwards. With days only it needed 153 to 158 | `2026-11-18-scheduling-engine-design.md` section 9 |
| Telling the customer which slot is the efficient one moves choices about as much as a discount does: slots labelled as ones where "a delivery van will already be in your area" worked as well as price cuts, and a simulation cut vehicle miles by up to about 12 percent. No acceptance percentage is published | [Agatz, Fan, Stam 2021](https://www.rsm.nl/discovery/2021/sustainable-delivery-label/) |
| Route-based trades treat density as the first lever on productivity (55 percent of surveyed pest-control firms ranked it first; one went from 8 or 9 stops a route to 14) | [FieldRoutes](https://www.fieldroutes.com/blog/route-density) |
| Housecall Pro is adding "Time Slots": the customer is given a committed block and the tech moves inside it. Jobber's own online booking books an exact slot | [HCP time slots](https://help.housecallpro.com/en/articles/16140047-schedule-with-time-slots) |

**What this means for "a mix of the earliest and optimized for drive time".** The mix is a weighted score, as Salesforce does it: each open slot gets points for being soon and points for adding little drive, and the top few are shown. We have that already in a simpler form (soonest five, nearest three). The research says two other things move drive time far more than a better score:

1. What is promised: a two-hour arrival window leaves room to order the day; an exact time does not.
2. Whether the customer is told which slot suits the route.

Both are Hannah's earlier decisions (Nov 18: an exact time, as Jobber's form does; Nov 22: no "We're already in Erie that day" line and no "Best fit"). They are questions 1 and 4 below because the evidence bears on them, not because they were wrong.

## 6. Road drive times and Google

Prices are per 1,000, after a free monthly allowance, from Google's [pricing page](https://developers.google.com/maps/billing-and-pricing/pricing) and [Routes billing page](https://developers.google.com/maps/documentation/routes/usage-and-billing), read Nov 25.

| Need | Service | Free each month | Then | Our likely bill |
|---|---|---|---|---|
| Road minutes between addresses | Routes API, Compute Route Matrix, Essentials (no traffic) | 10,000 elements | $5.00 | $0 to $20, if the straight-line estimate first cuts each day to its three nearest stops; about $130 unpruned |
| The same with live traffic | Routes API, Pro | 5,000 | $10.00 | not needed in six small towns |
| Order one person's day | Our own code (nearest neighbour and 2-opt), or Compute Routes with waypoint ordering (25 stops at most) | | | $0 |
| Plan a whole day or week for one or two trucks with windows and breaks | Route Optimization API | 5,000 shipments (one truck), 1,000 (two or more) | $10 / $30 | $0 to $6 for a day; about $1,300 a month if used for every customer offer, so never for offers |
| Address type-ahead | Places Autocomplete (New), already wired in the checkout | 10,000 requests | $2.83 | $0 |
| The map on screen | Google Dynamic Maps | 10,000 loads | $7.00 | $0. Today's MapLibre map is free with no limit |

**What Google does not allow.** Coordinates may be kept 30 days and place IDs for good; the [Routes policy page](https://developers.google.com/maps/documentation/routes/policies) lists distance matrix results among the content not to store. So the `drive_time` cache table in the Nov 18 design should not be built on Google's numbers: road minutes are asked for when an offer is computed and not kept. (The full terms page would not load for the research pass; this should be read once by a person before the build.)

**Alternatives.** Mapbox Matrix: 100,000 elements free, then $2.00, 25 addresses a request ([pricing](https://www.mapbox.com/pricing)). TravelTime, which Jobber uses: annual subscription, says itself it "isn't competitive at low volume" ([pricing](https://traveltime.com/pricing)). OSRM, VROOM, OR-Tools: free but need a server of our own; none runs inside a Vercel function. Timefold: from EUR 329 a month.

**Recommendation.** Keep the rule in our own code (it runs in milliseconds for 20 stops, and no hosted solver publishes a response time). Add Google's route matrix for road minutes, pruned by the straight-line estimate, falling back to the estimate on any failure. Use the Route Optimization API only where a whole day or week is planned at once (Order the day for two people, Rain out, Jev's week plan); it accepts a previous plan with parts held fixed, which is what "never move a promised time" needs ([route plan guide](https://developers.google.com/maps/documentation/route-optimization/route-plan)).

## 7. Building the calendar, and coss ui

| Finding | Source |
|---|---|
| coss ui is a new open-source component set funded by coss.com, which Cal.com is adopting. It is built on Base UI (ours is Radix), needs Tailwind v4 (we have it), and installs by copying source through the shadcn CLI. 56 components. Its licence is not stated on the pages opened | [coss.com/ui](https://coss.com/ui), [docs](https://coss.com/ui/docs) |
| **It has no scheduler.** Its Calendar is a date picker. No week view, time grid or event calendar is listed | same |
| The nearest open event calendar, Origin UI's, calls itself "early alpha and not recommended for production" and has no per-person columns | [origin-space/event-calendar](https://github.com/origin-space/event-calendar) |
| Every library with per-person columns plus drag is paid or beta: FullCalendar Premium from $480, Schedule-X Premium (drag moved to paid in v4), MUI X Scheduler in beta | [FullCalendar](https://fullcalendar.io/pricing), [Schedule-X](https://schedule-x.dev/docs/calendar/resource-scheduler), [MUI X](https://mui.com/x/react-scheduler/) |
| Drag: `@dnd-kit/react` has mouse, touch and keyboard sensors; Atlassian's Pragmatic drag and drop leaves accessible controls to us | [dndkit.com](https://dndkit.com), [Atlassian](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/) |

Not researched in this pass, so no claim is made: Mobiscroll, Bryntum, DayPilot, Syncfusion, and how Notion Calendar, Cal.com, Linear and Attio handle keyboard shortcuts and density. That pass is owed before the calendar is drawn.

**Recommendation.** Build the time grid ourselves as blocks in our own library (the way `WeekGrid` and `DayCalendar` were), with a drag library that works by touch. A bought calendar brings its own styles and would not pass the design gate or the 375px rule. Take coss ui as the reference for finish (spacing, quiet borders, the toast, the segmented control), and copy nothing from it until its licence is confirmed.

## 8. Direction, and the questions for Hannah

**Taken as given from Nov 25 (not asked again):** a move never texts on its own. After any move the screen says "Visit moved" with **Notify** and **Undo**, as Jobber does; Notify opens the message (text or email, editable) before it goes. This replaces the split button and the 60-second strip.

**What the research points to, to be confirmed by the answers:**

- One engine answers three callers the same way: the customer's booking, Ryan's New job sheet, and the Schedule's drag (a drop is checked by the same rules and says what breaks).
- New job gains "Find a time": address and service in, the best openings out, shown as Soonest and Least driving, each with its added minutes, and lit up on the calendar and the map.
- The Schedule becomes a clock: Day is a column per person, Week is seven days, Month is counts; an Anytime strip on top; Unscheduled and Map as two side panels that can both be open, as in Hannah's screenshots.
- Road minutes from Google replace the straight line.

**Questions, in the order they shape everything after them. One at a time.**

| # | Question | Options | What the research says |
|---|---|---|---|
| 1 | What does a customer book online? | (a) An exact start time, as decided Nov 18 and as Jobber's form does. (b) A day and a two-hour arrival window ("between 12 and 2"). (c) A day and morning or afternoon | The window is the biggest lever on drive time (section 5). Our replay: exact times cost about 9 percent more driving days than Ryan's real 2026. Housecall Pro is moving to committed blocks. Recommended: (b) |
| 2 | On the phone, how does Ryan see the best times? | (a) A ranked list in the New job sheet, Soonest and Least driving, as ServiceTitan. (b) Lit gaps on the calendar with drive minutes, as Jobber's Find a Time. (c) Both: the list, and picking a row lights the calendar and map | Recommended: (c), list first because it works on a phone |
| 3 | Week view: which shape? | (a) Jobber's: days across, hours down, each day split by person. (b) Keep rows per person, but as a clock running left to right. (c) Jobber's for Day, today's rows for Week | Jobber and Housecall Pro both use (a). With two people (a) holds; at four it gets narrow |
| 4 | Does the customer see which time suits the route? | (a) No mark; it is only listed first (today). (b) A quiet mark on the best one or two, no sentence. (c) A short reason | A label moves choices about as much as a discount (section 5). Hannah removed the sentence on Nov 22. Recommended: (b) |
| 5 | Google: approve road drive times at about $0 to $20 a month, and stay on the free map? | (a) Yes to both. (b) Road times yes, and move the map to Google's too. (c) Stay on the straight-line estimate | Recommended: (a) |
| 6 | What should Jev do first? | (a) Propose a week plan Ryan accepts or throws away. (b) Suggest where each unscheduled job goes. (c) Nothing until the calendar and Find a time are in use | Jev cannot sit in the booking path (a model takes too long). Recommended: (c), then (b) |
| 7 | May the office book over the rules? | (a) Yes, with a plain warning of what breaks (decided Nov 18). (b) Only the owner | Ryan's 2026 had 37 overlapping pairs; he works that way. Recommended: keep (a) |
| 8 | Is a Month view wanted, and what should a day show in it? | (a) Yes: a count of stops and the towns. (b) No | Jobber has it; ours would be new |

**Answers**

| # | Hannah's answer | Date |
|---|---|---|
| 1 | Keep the exact time, as Jobber's form does today ("keep it") | Nov 25 2026 |
| 2 | List and calendar: a short ranked list in New job, and picking a row lights it on the calendar and map | Nov 25 2026 |
| 3 | Like Jobber: days across, hours down, each day split by person; Day is a column per person | Nov 25 2026 |
| 4 | Yes, mark the recommended time ("we can add a recommend, yes of course"). The look and exact word are shown to her in the Storybook prototype. The mark never says why: no word about where Ryan is or who else he is visiting ("Just don't say Ryan is already in Erie") | Nov 25 2026 |
| 6 | Jev is part of this build, not later. Jev is bad at math, so the math (drive times, the best order, the best slot) is done by our engine and Google's API, and Jev works on top of those results. Jev runs on Vercel's monthly AI credit ("Vercel has $5 a month we can use for Jev"; the credit to be confirmed before the build). "Our system needs to be optimized and smart" | Nov 25 2026 |
| 5, 7, 8 | Not objected to when listed; carried as the working picks, open to change at the prototype review: Google road times with the free map kept; the office may book over the rules with a warning; a Month view with stops per day | Nov 25 2026 |
| 5 (added) | Consider Mapbox for drive times, since it may be free ("We could also maybe use Mapbox, it might be free"). Section 6 has its price: 100,000 matrix elements free a month, then $2.00 per 1,000, against Google's 10,000 free. Our need is about 13,500 to 36,000 a month, so Mapbox would cost nothing. Its storage terms were not read; the design checks them. **Decided: "yes use mapbox then."** Mapbox is the drive-time provider; Google stays for address type-ahead only | Nov 25 2026 |
| 6 (corrected) | **Jev never moves a customer who already has a day.** "We can't just move customers around" (Nov 25, on seeing the prototype's "Jev's plan" of moves). Jev's place is New job: when Ryan books a caller, Jev's pick of the best time is there ("I thought Ask Jev would be there"). Jev may also suggest a day and time for jobs that are still Unscheduled. No week plan that reshuffles booked visits; this also matches the Nov 18 answer that Jev may not move a picked day | Nov 25 2026 |
| 6 (her summary) | "Jev is for Unscheduled, and new jobs, and then what we surface to the customer." Three places, one brain: placing Unscheduled jobs, picking the time in New job, and choosing which times a customer is shown and which one is recommended. Never moving a customer who has a day. The customer must not wait on a model, so the instant answer comes from the engine and Mapbox, and any slower model work runs ahead of time | Nov 25 2026 |

**Requirements Hannah added while answering**

| Requirement | Her words | Where it stands today |
|---|---|---|
| Time off for each person: whole days off and blocked hours, and nothing is offered or booked into them. **Where it is set (Hannah, Nov 25, on seeing the prototype): in Settings, on the person, beside Working days and Hours. Not a button in the Schedule header ("set from the Schedule" was Claude's reading, not hers). The Schedule shows it as a band** | "For a tech we can schedule days off and times and stuff too, for sure" (Nov 25 2026) | People holds each person's working weekdays and one pair of hours. Busy time comes only from a calendar feed. Block time is designed, not built. Her Jobber screenshots show the same job done with events ("Scott Unavailable") |

**Where this stopped (Nov 25, usage limit).** The Storybook prototype exists, uncommitted, on branch `review-prototypes` ("Screens/Schedule prototype (Nov 25)", blocks under "Blocks/Scheduler"). Hannah reviewed it and it needs one fix pass before she sees it again: (1) the language audit, stopped part way (words must be the app's own, with the job page prototype in `_screens/design/` as the first source; any table at `2026-11-25-scheduler-language-audit.md` is unfinished); (2) clicking a visit opens the real job page prototype and its Schedule dialog, not the stand-in panel and Move dialog; (3) time off moves to Settings > People, no button on the Schedule; (4) Jev: no week plan of moves and no Ask Jev header button; Jev's pick sits in New job, on Unscheduled rows and behind the customer's recommended time. **First thing next time (Hannah, Nov 25):** before fixing anything, look at the other session's prototype, the clickable admin walkthrough (Storybook story `admin-walkthrough-clickable--laptop`, which she had open on port 6009; find which worktree or branch serves it), and use its components and its language wherever they exist. She suggests merging that work and this Schedule prototype together so there is continuity between the job flow and the Schedule. Her three open picks: the look of the recommended mark, the map's look, whether "Visit moved" closes itself.

After the answers: requirements with the data model checked (`docs/DATA_MODEL.md` rows for whatever a window, a block of time and a hold need), then the Storybook prototype at 375 and 1280, then the build.
