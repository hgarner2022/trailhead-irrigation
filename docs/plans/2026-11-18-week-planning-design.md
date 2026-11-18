# Routes, seasons and planning the week

Design only, Nov 18 2026. Nothing is built; step 6 builds what Hannah settles. It answers her Nov 17 review of Settings and her ask to use an AI model for routing.

## 1. The job to be done

When Ryan is on the route: "I want to say which towns I'm in on which days, once, and have it stay that way. I want to say when each season runs, once, and have it come back every year. When a week is coming I want it laid out so I can trust it, and I want to change any part of it myself."

## 2. What the tools do

Sources are vendor pages unless marked.

- **Jobber.** Routing orders "anytime" visits only; a person picks the first and last stop and clicks Optimize. [help article](https://help.getjobber.com/en/articles/how-to-route/)
- **Housecall Pro.** A service area is a zip or city list for online booking and recommended techs, not for daily operations. [service area](https://help.housecallpro.com/en/articles/362750-service-area-overview) It markets route optimization; one review says it has none. [feature page](https://www.housecallpro.com/features/route-optimization-software/)
- **ServiceTitan.** Zones limit which technicians a job may go to, with a drive-time cap per zone. Dispatch Pro has Assist mode (the dispatcher reviews every suggestion) and Auto mode, switchable per day. [overview](https://help.servicetitan.com/docs/dispatch-pro-overview.md), [settings](https://help.servicetitan.com/docs/dispatch-pro-settings-reference-guide-in-servicetitan-max.md)
- **Service Autopilot.** Reviews praise its seasonal and recurring routes; no first-party source found. [review](https://fieldtradepro-astro.pages.dev/blog/service-autopilot-review)
- **FieldRoutes.** Separates route density (which towns earn a day) from route order; users dislike its straight-line distances. [GetApp](https://www.getapp.com/industries-software/a/fieldroutes/)
- **LawnPro.** Yearly off seasons every series skips; a rain day moves a whole day, or pushes open visits 1 to 7 days. [scheduling](https://www.lawnprosoftware.com/features/scheduling)
- **Google Route Optimization API.** Takes shipments, vehicles and time windows; returns each vehicle's ordered route; billed per shipment (amounts not retrieved). [billing](https://developers.google.com/maps/documentation/route-optimization/usage-and-billing)
- **OSRM.** Takes coordinates; `table` returns drive-time matrices, `trip` a rough ordering. Free, but you host it (a container, not Vercel). [API](https://project-osrm.org/docs/v5.24.0/api/)
- **GraphHopper.** Takes vehicles and stops; returns routes. Credits equal vehicles times stops per call; the free plan is non-commercial. Third-party listings show about $69 a month; check the page. [credits](https://docs.graphhopper.com/openapi/section/credit-costs-per-request)

Pattern: areas or zones as plain rules, order optimised, a person reviewing.

## 3. Settings: routes and seasons

**Three approaches**

- **Week grid.** Mon to Fri columns, towns as chips under the day. Same column means driven together. Answers "which towns on which days" directly. Dragging is fiddly on a phone.
- **Drawn map.** Tap a town on the six-town sketch, pick its day. Pretty, but the day hides in a popover, Tuesday cannot be seen at a glance, and `ServiceAreaMap` is marketing code the admin must not import.
- **Plain list.** One row per town with day chips and an order. Phone-proof, but "driven together" is only implied.

**Recommendation: the week grid**, collapsing to the plain list on a phone (one component, two layouts). It matches the Schedule's week, so Ryan learns one picture.

**Tabs: confirmed, two.** Routes and Seasons replace Areas, Fall order, Spring order and Season windows. The buffer card moves to Seasons.

```
Routes
 Mon          Tue         Wed          Thu          Fri
 [Longmont]   [Erie]      [Louisville] ·            ·
              [Firestone] [Lafayette]
                          [Broomfield]
 No day yet: (none)       Towns here can go any weekday.
 Which town goes first      Fall: 1 Firestone 2 Erie 3 Longmont ...
 [x] Spring and July go the other way around
```

| Where | Label | Help line |
|---|---|---|
| Routes grid | Days Ryan is in each town | Towns on the same day are driven together by one truck. |
| Routes grid, tray | No day yet | These towns can land on any weekday. Drag one onto a day to fix it. |
| Chip menu | Also on Thursday / Move to Tuesday / Take off this day | A town can have two days. |
| Order | Which town goes first | The town at the top gets the earliest days in the season. |
| Order | Fall / Spring and July | Fall starts north and high, where the first hard freeze lands. |
| Season card | Opens, Closes (month, day) | Comes back every year. |
| Season card | Remind me to plan it (weeks before) | Home reminds you this many weeks before the season opens. |
| Seasons, buffer | Held back, first two weeks / after (percent) | Left open for repairs and weather. |

Defaults (today's code has four groups and a Nov 15 blowout close, so these change): Erie and Firestone on one day; Longmont on one; Louisville, Lafayette and Broomfield on one; no weekday chosen until Ryan picks. Fall order Firestone, Erie, Longmont, Broomfield, Louisville, Lafayette; spring the reverse. Spring turn-on Apr 25 to May 31 (4 weeks), July inspection Jul 1 to 31 (4), fall blowout Oct 1 to 31 (2). A town in no group works alone, any weekday, as today. Windows cannot span New Year.

```ts
export interface RouteDay { id: string; weekday: Weekday | null; towns: Town[] } // null: any weekday, group kept
export interface SeasonDates { month: number; day: number }
export interface Season { kind: "turn-on" | "inspection" | "blowout"; opens: SeasonDates; closes: SeasonDates; leadWeeks: number }
export interface PlanningSettings {
  routeDays: RouteDay[]                                  // a town may sit on two weekdays, once per weekday
  townOrder: { fall: Town[]; spring: Town[] | "reverse" }
  seasons: Season[]
  bufferPercentEarly: number; bufferPercentLate: number
}
export const windowFor = (s: Season, year: number): { opensOn: string; closesOn: string } => /* pure */
```

**Migration (step 6).** Each `area` row becomes one `RouteDay` with `weekday: null`, so the scheduler and `placeVisit` check behave exactly as today until Ryan sets days; no weekday is guessed. `fallTownOrder` becomes `townOrder.fall`, and `springTownOrder` becomes `"reverse"` when it is the reverse. Each window keeps month and day from this year's row, `leadWeeks` is unchanged, and Home's reminder drops the hidden "plus two" (a behaviour change to confirm). No visit is rewritten; route days are read only when placing or moving. A drag to another weekday warns ("Longmont is usually Wednesday") and still moves.

## 4. Planning the week with a model

**Plan the week** sits on the Schedule and plans the next seven days.

```
Schedule  Week of Nov 2     [Plan the week]            [Throw away] [Accept plan]
          Mon   Tue            Wed   Thu         Fri
 Ryan     ...   Longmont (9)   ...   Erie (8)    ...    (plan shown with a dotted edge)
 Tue: Longmont, nine stops, about two hours driving. Jim moved to Thu: he must be home.
 Left for next week: two Firestone blowouts. The day was full.
```

**Given.** Open visits (town, kind, window, preference, customer-picked day, must be home, minutes), people with working days and capacity left, route days, season order, Jobber blocks, a drive-time matrix from the routing engine, and the free National Weather Service forecast.

**Tools.** Read only: `get_day`, `get_visit`, `drive_minutes` (a routing call) and `check_plan` (a dry run of the hard rules). One write: `submit_plan`, which stores a draft of visit, day and order assignments. It writes no visit.

**Returns.** The plan, a plain-words line per day, a "left for next week" list with reasons, and "needs your call" items, such as a customer-picked day the plan wants to change.

**Review.** The existing week grid shows the plan laid in. Ryan drags to change it, throws it away, or taps Accept. Accept sends each change through `visits.move` (`placeVisit`), so every hard rule runs again; a change that fails is listed, not forced. The usual date-moved texts queue and one event is recorded.

**Re-plan after rain.** Ryan marks a day rained out and runs the same action on the rest of the week; the day's visits join the open pile.

**What stays deterministic.** Windows, capacity, buffer, working days, one group per truck-day and route days are hard rules in code, and the routing engine does the arithmetic. The model chooses among legal options and explains them; it cannot allow an illegal one.

**Guardrails.** It never messages a customer and never changes a customer-picked day, only flags it. Every plan logs `plan.created` (explanation, model, tokens, cost); Accept logs `plan.accepted`. A plan can be thrown away.

**Cost (estimate, to measure).** I assume Claude Sonnet 5.5 at medium effort ($2 in, $10 out per million tokens). A 150-visit October week is about 10,000 tokens of context, five tool turns (about 40,000 input in total) and 10,000 output: roughly $0.20 and 30 to 90 seconds; Opus 5.5 ($4, $20) about $0.35. Eight weeks stay under $10 a season, plus the routing engine.

**Honest limit.** With six nearby towns, the deterministic scheduler plus a drive-time matrix does most of the work. The model earns its place on rained-out weeks, customer-picked collisions, thin days and the written explanation.

**Build order.**

1. **Step one, no model.** Replace the straight-line `orderStops` with road drive times from a routing engine (GraphHopper hosted; Google the alternative; OSRM only to host a container).
2. **Step two.** The model planner, behind the Plan the week button.

**Common practice.** Route days as rules: ServiceTitan zones. Engine orders stops, person confirms: Jobber. Review before anything lands: ServiceTitan Assist. Rain day moves a day: LawnPro. Dates roll yearly: LawnPro off seasons. Engine does the arithmetic: Google, GraphHopper.

## 5. Open questions for Hannah

1. Which weekday for each of the three groups (three words)?
2. Is Broomfield with Louisville and Lafayette, or its own day as today (with or alone)?
3. Is about 30 cents per plan fine to run whenever Ryan taps (yes or no)?
4. After a rain-out, may the plan offer to move a customer-picked day, flagged and unticked (yes or no)?
