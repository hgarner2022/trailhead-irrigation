# Routes, seasons, and the seam for Jev

Design only, Nov 18 2026. Nothing is built; step 6 builds what Hannah settles. It answers her Nov 17 review of Settings and her plan for Jev, her AI agent, to schedule and route later. Settings come first and ship first.

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

## 4. The seam for Jev

Jev is Hannah's AI agent. It plugs into the app through the MCP surface (`src/api/mcp.ts` makes one tool per API handler, scoped by API key), and a plain routing algorithm must be able to use the same seam first.

**(a) Read tools, which exist or are small additions.** `visits.list` and `visits.get` (windows, customer-picked days, must be home), `schedule.week` and `schedule.day`, `people.list` (capacity), and `settings.get` (route days and seasons, in the section 3 shape). New: `schedule.driveTimes`, taking a day's addresses and returning a drive-time matrix in minutes. **Engine: GraphHopper hosted.** It returns road times, bills a known credit formula, and needs no server to run, which Vercel does not give us; Google's API is the alternative, and OSRM is free only if Ryan hosts a container.

**(b) The one write.** `schedule.plans.create` takes visit, day and order assignments plus a plain-words line per day ("Tuesday: Longmont, nine stops, about two hours driving; Jim moved to Thursday because he must be home; two Firestone blowouts wait for next week, the day was full"). It stores a draft and moves nothing. It checks every assignment and returns rejected ones with the rule broken, so Jev can fix them. A new key scope, `write-plans`, allows this tool and nothing else, because the sample "Appy agent" key holds `write-schedule`, which also lets a caller use `visits.move`. Jev's key gets `read` and `write-plans`.

**(c) What Ryan sees.** The Schedule's week grid with the plan laid in (dotted edge), the explanation under each day, drag to change, and two buttons: Accept plan and Throw away. Accept writes each assignment through `visits.move` and records one `plan.accepted` event carrying the explanation.

```
Schedule  Week of Nov 2      [Throw away] [Accept plan]
          Mon   Tue            Wed   Thu         Fri
 Ryan     ...   Longmont (9)   ...   Erie (8)    ...    (plan has a dotted edge)
 Tue: Longmont, nine stops, about two hours driving. Jim moved to Thu: he must be home.
 Needs your call: Ann Lee (picked Tue) would fit Wed.  [ ] Move her
```

**(d) Hard rules the app enforces on Accept.** Windows, capacity and route days are checked again by the code `visits.move` already runs (`placeVisit`); a failing assignment is listed, never forced. A change Ryan drags by hand is his: it still obeys windows and capacity but only warns on route days. A customer-picked day moves only when Ryan ticks it. Jev never messages a customer: its key has no `send-messages` scope, and the app queues the usual date-moved texts after Accept.

**(e) Rain.** Ryan marks a day rained out, and a plan is made again for the rest of the week from the same tools. The day's visits are open again; the rest follows (c) and (d).

**(f) Build order.**

1. **Order the day.** Routing-engine ordering of each day's stops replaces the straight-line `orderStops`. No model.
2. **The plan seam, used by a plain algorithm.** The existing scheduler plans the week and calls `schedule.plans.create`. The grid, Accept, the event and the rules are proven before any model.
3. **Jev.**

**Cost when Jev runs on Claude (estimate, to measure).** Assuming Claude Sonnet 5.5 at medium effort ($2 in, $10 out per million tokens): a 150-visit October week is about 10,000 tokens of context, five tool turns (about 40,000 input in total) and 10,000 output, roughly $0.20 and 30 to 90 seconds. Opus 5.5 ($4, $20) is about $0.35. With six nearby towns, a plain algorithm does most of the work; a model earns its place on rained-out weeks, customer-picked collisions and the explanation.

**Common practice.** Zones as rules: ServiceTitan. Engine orders stops, person confirms: Jobber. Review before anything lands: ServiceTitan Assist mode. Rain day moves a day: LawnPro.

## 5. Online booking: what the customer picks

One flow replaces the Season Pass checkout and the Jobber-backed `/book` page, built after step 6. `/book` keeps its URL, since every Book Online button and `book_click` points there; the Jobber page goes at the exit.

```
Service   Address   Day   You   Card
( ) Season Pass          ( ) Sprinkler repair visit  $145
( ) Spring turn-on       ( ) New system: we'll call you
Days for Erie (Tuesdays):  (o) Tue Apr 28  ( ) Tue May 5  ( ) Tue May 12
```

1. **Service.** The active catalogue from `src/lib/services.ts`: name, what is included, price.
2. **Address.** The existing Places step; its town drives the rest.
3. **Day.** The next three route days for the town (section 3), inside the service's window, with room for that kind of visit (the `schedule.offerDays` pattern). The first is selected.
4. **Contact, then card,** then the job and its visit are made with the customer's day kept.

**No route day for the town:** offer the next three days anyone has room, as today. **Next three full:** look further ahead inside the window; if the window ends first, say "These days are full. We'll call you," and make the job in Needs a day. **Quoted services** (installation, larger repair, lights) skip days and card: contact and notes, "We'll call you," and a job in Needs a quote.

## 6. Open questions for Hannah

1. Which weekday for each of the three groups (three words)?
2. Is Broomfield with Louisville and Lafayette, or its own day as today (with or alone)?
3. May Jev offer to move a customer-picked day, flagged and unticked (yes or no)?
4. When a town's days are full, look ahead how many weeks (a number)?
