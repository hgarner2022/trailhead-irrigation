# The scheduler, designed

Nov 25 2026. Design only. Nothing is built until Hannah has seen the Storybook prototype (section 9). It turns the answers in `2026-11-25-scheduler-research.md` (section 8, "Answers" and "Requirements Hannah added") into one design: the engine, the customer's booking, the office calendar, time off, and Jev. It keeps `2026-11-18-scheduling-engine-design.md` (the engine doc) wherever Hannah's new answers do not change it. Where they do, section 1 names the old decision it replaces.

What this means in one paragraph. When someone calls, Ryan types an address and a service and sees the best few openings, each with the minutes it adds to his driving. The calendar looks like Jobber's: days across, hours down, a block as tall as the visit is long. Moving a visit never texts anyone. A toast says "Visit moved" with Notify and Undo, and a visit whose customer has not been told wears a mark until someone decides. Each person can have days and hours off. Our own code does every sum. Jev reads the results, picks between them, explains them, and Ryan accepts or throws away what Jev proposes.

## 1. The decisions

Hannah's words are quoted from the research doc's answers table. "Replaces" names the earlier decision that no longer holds.

| # | Decision | Hannah's words, date | Replaces or changes |
|---|---|---|---|
| D1 | A customer books an exact start time | "keep it", Nov 25 | Nothing. Engine doc decisions 17 to 19 stand |
| D2 | On the phone, Ryan sees a short ranked list of openings, each with its added drive minutes. Picking a row lights it on the calendar and the map | "a short ranked list in New job, and picking a row lights it on the calendar and map", Nov 25 | Engine doc use case 10 (slots "beside his day picker"). The New job day box becomes Find a time |
| D3 | The Week view is Jobber's: days across, hours down, each day split by person. Day is one column per person. An Anytime strip on top. Unscheduled and Map are two side panels that can both be open. A Month view shows stops per day | "Like Jobber", Nov 25; Month carried as a working pick | Admin design 5.1 (a row per person, one-line blocks). `docs/DESIGN.md` "Schedule week" (the week is rows, the side panel is an overlay, Unscheduled sits under the week) |
| D4 | The customer's booking marks the recommended time. The mark never says why | "we can add a recommend, yes of course... Just don't say Ryan is already in Erie", Nov 25 | Engine doc 4.2 "What the customer reads" (the day and slot lines) and section 4.4 "Best fit". The look and word are Hannah's to pick (section 7.12) |
| D5 | A move never texts on its own. After any move the screen says "Visit moved" with Notify and Undo. Notify opens the message first | "we probably shouldn't automatically send people... a notify customer when you move", Nov 25 | Engine doc decision 7 and 18 (a booked time always texts; Move split button), section 6 and decision 13 (a rain day texts each customer on Apply). Step 4 of the admin design (`MoveDialog` split button). The 60-second `TextingStrip` |
| D6 | Each person can have time off: whole days and blocked hours, set from the Schedule. Nothing is offered or booked into it | "For a tech we can schedule days off and times and stuff too, for sure", Nov 25 | Engine doc decision 20 (`busy_block`). That table does not exist; section 6.1 builds `time_off` |
| D7 | Drive times come from Mapbox's Matrix API, behind one `DriveTimes` interface, with the straight-line estimate as the fallback on any failure or timeout. Google stays only for the address type-ahead | "yes use mapbox then", Nov 25 (after "We could also maybe use Mapbox, it might be free") | Engine doc section 8 (Google Routes, the `drive_time` cache table). Research section 6 working pick. The `drive_time` table is never built |
| D8 | Jev is part of this build. Jev is bad at math, so our engine does all of it and Jev only calls tools, chooses between results, and explains or proposes. Ryan accepts or throws away. Jev runs through Vercel's AI Gateway on its monthly free credit | "Jev is bad at math... Vercel has $5 a month we can use for Jev", Nov 25 | Engine doc section 10 and week-planning design 4(a) (GraphHopper for `schedule.driveTimes`) |
| D9 | The system must be optimized and smart | "Our system needs to be optimized and smart", Nov 25 | Drives the one score in section 2 and the day ordering in section 3.5 |
| D10 | The office may book over the rules, with a plain warning of what breaks | Not objected to, Nov 25; first decided Nov 18 | Nothing. Engine doc decision 14 stands |
| D11 | The map. Working pick: keep the free MapLibre map with OpenFreeMap tiles. Recommended upgrade, Hannah's to confirm: move to `mapbox-gl` with the Standard style, which is free at our volume (section 3.7) | Working pick Nov 25; Hannah likes the Mapbox look | Nothing yet |
| D12 | Mapbox must stay free and Hannah must never be billed by surprise. A usage counter stops every Mapbox call at 80 percent of each free allowance and the app falls back. A Mapbox failure never blocks a booking | Hannah's rule, Nov 25 | New: section 3.6 and `provider_usage` (6.6) |

Settled earlier and untouched: soonest first (engine 1), the 24-hour cut-off counted from the booked start (19), hours per person (21), no waitlist (4), tomorrow is the earliest day (2), the typed count as a cap (3), nothing is deleted.

## 2. One engine, three callers

Three things ask the same question: the customer's booking, the office's Find a time, and a drop on the calendar. All three call the rule in `src/lib/scheduling/offer.ts`. The customer gets a few days with times and one marked time. Ryan gets a ranked list with minutes. A drop gets a yes, or a plain list of what it breaks.

| Caller | Asks | Gets | Handler |
|---|---|---|---|
| Customer booking, portal Reschedule, pass checkout | Open days and times for my address | Up to three days, their times, one time marked `recommended`. Nothing else about why | `schedule.offerDays`, `visits.areaDays` (customer scope) |
| Ryan, Find a time | The best openings for this address and service | Up to six rows with day, start, person, added minutes, score, a sort control | `schedule.findTime` (office scope) |
| A drop, a resize, the Move dialog | Is this place allowed, and what breaks | `warnings[]` from the conflict table in the engine doc section 6 | `schedule.check` |

### 2.1 Hard rules that filter

A slot is a candidate only if every rule holds. These are already built in `offer.ts` (`personSlots`); the two marked "new" are the changes.

| Rule | Source |
|---|---|
| The person works the weekday and the slot is inside their hours (09:00 to 17:00 when null) | `person.working_days`, `hours_start/end` |
| The person has no time off over the slot (new: read from `time_off`, section 6.1) | `time_off` |
| No overlap with a booked, timed visit | `visit.start_time`, `duration_minutes` |
| Room for the drive on both sides: `gap(d) = max(10, ceil5(1.25 x d))` | engine 4.1 |
| The untimed visits' minutes still fit in the day | engine 4.2 |
| The day is inside the service's bookable dates | `service.bookable_from/to` |
| The typed count for the kind is not reached | `person.capacity_by_kind` |
| Tomorrow at the earliest (a customer; the office may pick today) | engine decision 2 |
| New: `d` comes from the injected `DriveTimes` (road minutes), else the estimate | section 3 |

The office may force a slot that fails a rule (D10); a customer never can.

### 2.2 One score

Every candidate slot gets one number. Lower is better. It mixes soonness and added drive, as Salesforce's weighted grade does ([research section 4](2026-11-25-scheduler-research.md)).

```
score = DAY_COST   x openDayIndex      # 0 for the soonest open day, 1 for the next open day, ...
      + DRIVE_COST x addedMinutes      # minutes of driving this slot adds to the person's day
      + EARLY_COST x startIndex        # a tiny tie-breaker, 0.01 per half hour into the day
```

| Constant | Value | Meaning | Where it lives |
|---|---|---|---|
| `DAY_COST` | 6 | One open working day later costs as much as 6 extra minutes of driving | `src/lib/scheduling/score.ts` |
| `DRIVE_COST` | 1 | One added minute of drive | same |
| `EARLY_COST` | 0.01 | Breaks a tie toward the earlier start | same |
| `REPAIR_DAY_COST` | 20 | A repair weighs soonness more: a broken head waits a day only if it saves 20 minutes | same |
| `EMPTY_DAY_DRIVE` | the round trip from the person's start point | A day with nothing booked is not free: its added drive is there and back | same |

`openDayIndex` counts open working days, not calendar days, so a weekend does not cost anything. The constants are plain code, tested, and changed in one place. They are not settings (Hannah, Nov 18: no routes or seasons settings).

**The change to `offer.ts`.** Today an empty day adds about zero, so it always wins on drive. `EMPTY_DAY_DRIVE` fixes that: a Longmont customer is not pulled to an empty Monday when a Wednesday already goes through Longmont. The engine doc's nearness tiers stay as labels for the office view; the score replaces the tier ranking as the order.

### 2.3 Worked example on the April data

Data: engine doc section 4.3 (Ryan alone, 12:00 to 18:00, turn-on 60 minutes). The numbers for Customer A come from that table. Customer F is an illustration, not a run: it uses the same bookings with a Longmont address and drive minutes I chose to show the mix, so Ryan's list can be checked by hand.

**Customer A, 480 Briggs St, Erie, turn-on.** Open days in order: Mon 27 (0), Tue 28 (1), Wed 29 (2), Thu 30 (3), Fri May 1 (4). Best slot of each day:

| Day | Best slot | Added | `DAY_COST` x index | Score |
|---|---|---|---|---|
| Mon Apr 27 | 12:00 | 1 | 0 | 1.0 |
| Tue Apr 28 | 4:30 pm | 1.5 | 6 | 7.5 |
| Thu Apr 30 | 2:30 pm | 4 | 18 | 22.0 |
| Fri May 1 | 2:30 pm | 14 | 24 | 38.0 |
| Wed Apr 29 | 5:00 pm | 29 | 12 | 41.0 |

**To recompute in step 1:** Monday is an empty day, so under `EMPTY_DAY_DRIVE` its added drive is the round trip from Ryan's start point to Briggs St, not the 1 minute the engine doc's older rule gave. Both are in Erie, so the trip is a few minutes and Monday very likely stays first, but the table's Monday row and the step 1 test are set from the real run, not from this draft.

Recommended is Mon 12:00 (score 1.0). Both sorts agree: it is the soonest and the least driving. The Tuesday slot is second on both.

**Customer F, a Longmont address, turn-on (illustration).** Wednesday has Longmont stops at 12:00 and 2:00 pm, so a 5:00 pm slot adds 3 minutes. Monday is empty, so its added drive is the round trip from Erie, 30 minutes.

| Day | Best slot | Added | Score |
|---|---|---|---|
| Wed Apr 29 | 5:00 pm | 3 | 12 + 3 = 15.0 |
| Tue Apr 28 | 4:30 pm | 15 | 6 + 15 = 21.0 |
| Mon Apr 27 | 12:00 | 30 | 0 + 30 = 30.0 |
| Thu Apr 30 | 2:30 pm | 15 | 18 + 15 = 33.0 |
| Fri May 1 | 2:30 pm | 20 | 24 + 20 = 44.0 |

Recommended is Wed 5:00 pm. The soonest is Mon 12:00. The least driving is Wed 5:00 pm (3 minutes). This is the mix Hannah asked for: Monday is sooner, and Wednesday saves 27 minutes for two days' wait.

### 2.4 How Recommended is chosen, and the office list

| Question | Rule |
|---|---|
| Which time is Recommended | The one candidate slot with the lowest score across the offered days. Ties: earlier day, earlier start, lower person id. Exactly one time carries it |
| Which days a customer sees | The existing rule: soonest five open days, three offered (`SOON`, `SHOWN`), now ranked by each day's best score instead of tier. Shown in date order. A repair's first day is always the earliest open day |
| What the customer is told | A time marked `recommended: true`. No day label, no added minutes, no person, no neighbour, no town. The API's customer scope strips them (section 5.3) |
| Selection | The recommended time is a suggestion. It is not selected. Continue stays off until a time is tapped (engine decision 22) |
| Office list default | Recommended: lowest score first |
| Office sort 1, Soonest | Day, then start, then person |
| Office sort 2, Least driving | Added minutes, then day, then start |
| Office rows | At most six, one per person-day-start. Each row shows day, start to end, person, "adds 4 min", and a small "Next to an Erie visit" line (office only, from the neighbour) |
| A forced row | A "Show all times" link lists slots that fail a rule, each with its first conflict in the engine doc's words. They are greyed and need one tick |

## 3. Where drive time comes from

Road minutes come from Mapbox. A pure estimate always backs them up. Google is called only for the address type-ahead.

### 3.1 Mapbox against Google, at our volume

Sources: Mapbox [Matrix API docs](https://docs.mapbox.com/api/navigation/matrix/) and [pricing](https://www.mapbox.com/pricing), Google [Routes policies](https://developers.google.com/maps/documentation/routes/policies) and [pricing](https://developers.google.com/maps/billing-and-pricing/pricing), all opened Nov 25. Google's figures are from the research doc, section 6.

| Question | Mapbox Matrix API | Google Routes, Compute Route Matrix Essentials |
|---|---|---|
| Free each month | 100,000 elements | 10,000 elements |
| Price after | $2.00 per 1,000 (100,001 to 500,000), then $1.60 | $5.00 per 1,000 |
| Billed by | element (sources x destinations) | element |
| Coordinates per request | 25 for `driving` (the docs: "Maximum 25 input coordinates per request"), 10 for `driving-traffic`; at most 625 elements. We use `driving` | 625 elements per request |
| Rate limit | 60 requests a minute for `driving`; 30 a minute for `driving-traffic` | 3,000 elements a minute (research) |
| Our need, pruned | about 18,000 to 27,000 elements a month (section 3.3) | the same, so about $40 to $85 a month after the free 10,000 |
| Our need, unpruned worst case | about 90,000, still free | about $400 |
| Cost for us | $0 | $0 only if heavily pruned |
| What may be stored | **Not found.** The Matrix docs page has no guidance on storing results. Mapbox's Terms of Service (mapbox.com/legal/tos) has sentences about Mapbox caching Your Content and about destroying content on cancellation, and none about storing API results. A third-party comparison says Matrix results are not storable; that is a secondary source and unverified | The Routes policy page lists "directions, distance matrix results" among content not to store, and allows latitude and longitude to be cached "for up to 30 consecutive calendar days" and place IDs "indefinitely" |

**Pick: Mapbox.** It is free at our volume with room to spare (100,000 against about 27,000), it costs a tenth as much past the free tier, and Hannah chose it. Its storage terms are silent, so we treat the answer as no: nothing from the Matrix API is stored (3.4). That makes the question of what the terms allow moot until someone reads the Mapbox Product Terms.

### 3.2 The interface

```
interface DriveTimes {
  // minutes[i][j] = drive minutes from points[from[i]] to points[to[j]]
  matrix(req: { from: LatLng[]; to: LatLng[] }, opts: { timeoutMs: number }): Promise<{ minutes: number[][]; source: "mapbox" | "estimate" }>
}
```

Every Mapbox call first asks the usage counter (3.6). A refusal falls back exactly as an error does.

| Implementation | File | Used when |
|---|---|---|
| `mapboxDriveTimes` | `src/lib/scheduling/server/drive-times-mapbox.ts` | `MAPBOX_ACCESS_TOKEN` is set |
| `estimateDriveTimes` | `src/lib/scheduling/drive-times-estimate.ts`, wraps today's `driveMinutes` (straight line x 1.95 minutes a km, town centres when a point is missing) | the token is missing, Mapbox errors, answers 429, or takes over `MAPBOX_TIMEOUT_MS` (default 1500) |
| `withFallback(primary, estimate)` | `src/lib/scheduling/server/drive-times.ts` | always the one the handlers use. Any error is caught, the estimate answers, and the result says `source: "estimate"` |

`offer.ts` stays pure. The loader asks `DriveTimes` once per candidate day, then hands `offerFor` a lookup `drive(a, b)` in `OfferInputs`. Without one, `offer.ts` uses the estimate, so every existing test still passes. A response with `source: "estimate"` carries `estimated: true`, and the office list shows "Estimated drive times" in grey.

Env vars: `MAPBOX_ACCESS_TOKEN` (a secret server token, never sent to the browser) and `MAPBOX_TIMEOUT_MS`. Read by name through `readOptionalEnv`, like the other optional keys. The MapLibre map keeps its free OpenFreeMap tiles and needs no token.

### 3.3 Pruning, the 25-coordinate limit, and the numbers

Pruning means we never ask about a day's whole stop list. For each candidate day we pick the customer's point plus at most `K = 4` stops: the four nearest to the customer by straight line (their neighbours in time order are what the slot fit actually needs, so the nearest-first pick also keeps the two timed neighbours of the best gap). One request per candidate day asks for the full square of those points, so `(K + 1)^2 = 25` elements and 5 coordinates, far under 25. A day with more than 24 stops is always pruned this way, so the limit can never be hit.

| Number | Value | Basis |
|---|---|---|
| Elements per offer, pruned | 125 | 5 candidate days x 25 |
| Requests per offer | 5, sent together | one per candidate day |
| Rate limit headroom | 60 a minute allows 12 offers a minute | a token bucket of 50 a minute in code; past it the estimate answers |
| Elements a month: 150 customer offers | 18,750 | 150 x 125 |
| Elements a month: 45 Find a time calls | 5,625 | about 10 phone calls a week x 125 |
| Elements a month: 100 drops checked on the server | 2,500 | 25 each, one day |
| Elements a month: ordering days | about 6,000 | 100 days x 8 stops squared (64) |
| Total | about 33,000 | free allowance 100,000; cost $0 |
| Unpruned worst case | about 90,000 | a ten-stop day is 121 elements, x 5 days x 150 offers |

All numbers are mine from the formula, not measured. A real month of logging replaces them (`drive_source` and the element count go in each offer event's detail, section 6.5).

### 3.4 What is stored

| Item | Stored? | Rule |
|---|---|---|
| Drive minutes from Mapbox | No. A memo inside one request only | No durable drive-time table. The terms say nothing either way, so we assume no |
| Directions geometry | No. Drawn, kept in the browser for the open panel | Treated as not storable, like the Matrix |
| A customer's point (`property.lat/lng`) | Yes, as today | Written by the `geocode` task. **Not verified:** Google allows its coordinates only 30 days; see the open verifications at the end |
| Google place id | Yes | Allowed indefinitely by Google |
| The estimate | No | Computed on demand |

### 3.5 Ordering a day, a rain day, a week plan: which tool does it

(Findings from Mapbox's [Optimization docs](https://docs.mapbox.com/api/navigation/optimization/) read Nov 25.)

The tool is our own code. It holds promised times fixed by construction: the engine already treats every booked time as a place no one may move, and it only places the other stops into the gaps.

| Option | What I could verify | Decision |
|---|---|---|
| **Our own code** (nearest neighbour then 2-opt inside each gap, gap rule from 2.1, matrix from `DriveTimes`) | It is the engine doc's section 5, already specified and tested on the engine's pure functions. Fixed times are the gaps' walls | Used for Order the day, Rain out and the week plan candidates |
| Mapbox Optimization API v1 | 12 coordinates at most and no time windows | Unusable |
| Mapbox Optimization API v2 ([docs](https://docs.mapbox.com/api/navigation/optimization/)) | Public beta, access by request. Asynchronous: POST, then GET. Up to 1,000 locations. Vehicles with start, end and breaks; services with a `strict` time window. **A promised time could be pinned with a very tight strict window; that is my inference and is not on the page.** Pricing not found | Not used now. An optional later upgrade once access is granted and a test shows it holds a fixed time |
| Google Route Optimization API | Not used (Hannah's decision keeps Google for the type-ahead only) | Not used |

**Decision:** ordering a day, rain out and the week plan are our own code: timed visits are fixed, untimed stops are ordered into the gaps by nearest neighbour and 2-opt, over a Mapbox matrix.

Ordering needs one matrix request per person-day (a day of up to 24 stops fits in the 25-coordinate limit; a day of 8 stops is 64 elements).

### 3.6 Never billed by surprise

Hannah's rule: Mapbox stays free. Mapbox gives us no hard cap to lean on, so we build one. Sources: Mapbox [demo access](https://docs.mapbox.com/accounts/guides/demo-access/) and [pay-as-you-go billing](https://docs.mapbox.com/help/faq/how-does-pay-as-you-go-billing-work).

| Fact | Finding |
|---|---|
| An account with no card ("demo access") | Has lower caps that are not published, and turns all Mapbox APIs off at a cap until upgraded |
| An account with a card | Has no hard spending cap. Mapbox only emails when a free tier is first exceeded |
| So | Keep the account on whichever plan Hannah picks, and enforce our own cap in code. A cut-off account (a failed call) is treated as any other failure |

**The counter.** One row per Mapbox product per month in `provider_usage` (6.6), added to before each call.

| Product | Free allowance a month | Our stop (80 percent) | Counted as | Falls back to |
|---|---|---|---|---|
| Matrix | 100,000 elements | 80,000 | elements of the request (sources x destinations) | the straight-line estimate, `estimated: true` |
| Directions (route lines) | 100,000 requests | 80,000 | requests | straight line segments between stops, no road line |
| Map loads (only if `mapbox-gl` is adopted, 3.7) | 50,000 | 40,000 | map loads, counted by a client beacon `POST /api/usage/map-load` | a static "Map is resting" panel with the stops as a list |

| Rule | Detail |
|---|---|
| Before a call | `DriveTimes` asks `reserve(product, n)`. If used plus n exceeds the stop, it returns no and the call is skipped. The reservation is one atomic update (`used = used + n where used + n <= stop`), so two requests cannot both pass |
| After a call | The reserved count stands. A failed call is still counted (a failed request may be billed) |
| At 80 percent | One Home row (`admin_alert`, kind `provider-limit`, key `mapbox-matrix-2026-11`) "Mapbox drive times paused for November: the free allowance is nearly used. Estimated times are in use." with Dismiss. It clears itself when the month turns |
| A month turns | A new row; nothing carries over. The Mountain month is the key |
| An account cut-off, 401, 403, 429, a timeout, a network error | Fall back; never block an offer, a drop or a booking. A repeated 401 or 403 raises the same Home row once with the words "Mapbox is not answering" |
| In the dev and test builds | The counter reads a fake clock; no test calls Mapbox |

Our volume is about 33,000 matrix elements a month (3.3), so the stop at 80,000 is a guard. A runaway loop or a bot hitting the public booking is what it protects against. The public booking is also rate limited per address by the existing checkout limits.

### 3.7 Route lines and the map

| Need | Tool | Free allowance | Notes |
|---|---|---|---|
| A person's route line on the map for a day | Mapbox Directions, `driving`, the stops in the order given ([docs](https://docs.mapbox.com/api/navigation/directions/)) | 100,000 requests | 2 to 25 waypoints; it returns geometry and does not reorder, which is what we want (our code orders). A day over 25 stops is drawn as straight segments. One request per person-day viewed, memoised in the browser for the visit of the panel; counted in `provider_usage` |
| The map itself, working pick | MapLibre with OpenFreeMap tiles | no limit, free | Mapbox tiles through MapLibre bill per tile request outside the map-load bundle ([docs](https://docs.mapbox.com/help/dive-deeper/mapbox-in-maplibre/)), so do not mix them |
| The map itself, recommended upgrade | `mapbox-gl` with the Standard style: light presets (dawn, day, dusk, night) and 3D landmarks ([docs](https://docs.mapbox.com/map-styles/standard/)) | 50,000 map loads, then $5.00 per 1,000; our load is about 4,000 | Hannah likes the Mapbox look |
| Isochrones | Not used | | Its results must be shown on a Mapbox map with Mapbox libraries |
| Mapbox geocoding or Search Box | Not used | | Temporary results may not be cached; permanent has no free tier and needs a card; results may only be used together with a Mapbox map ([docs](https://docs.mapbox.com/api/search/geocoding/)). Google Places stays for the type-ahead |
| Static images in email | Not used | 50,000 free | Terms for email use not found |

**The move to `mapbox-gl`, for Hannah to confirm.** It is free at our volume. The work: swap the package in `DayMap` and `MapPanel`, add a public token (`NEXT_PUBLIC_MAPBOX_TOKEN`, URL-restricted to our domain in Mapbox's dashboard), re-test every `DayMap` layer (pins, route lines, hover sync, the Home map), and add the map-load counter. Whether `react-map-gl` supports React 19 was not found; the check is `npm info react-map-gl peerDependencies`, or draw with `mapbox-gl` directly. Until Hannah confirms, the design stays on MapLibre and the Map panel is the same block either way.

## 4. Jev

**Corrected by Hannah on Nov 25 after seeing the prototype: "We can't just move customers around."** Jev never proposes moving a visit that already has a day. Everything below about a week plan of moves, `schedule.proposeWeek`, and the plan strip of moves (4.3, 7.11) is withdrawn. What stays: Jev sits inside New job, where it picks the best time for the caller from the engine's ranked openings and says why in one office-only line; and Jev may suggest a day and time for each job still in Unscheduled, which Ryan accepts or ignores one by one. Jev still does no math, messages no one, and is never in the customer's booking. There is no Ask Jev button in the Schedule header.

Jev is useful and optional. Every sum Jev's output depends on is done by our code. If Jev is down, over its credit, or switched off, nothing else in the scheduler changes.

### 4.1 What Jev may and may not do

| Jev may | Jev may not |
|---|---|
| Call the read tools and `schedule.findTime`, `schedule.check`, `schedule.orderDay` (preview), `schedule.proposeWeek` | Do any arithmetic the tools return. It copies their numbers |
| Choose among the results those tools return (the three candidate plans, the six rows of a Find a time) | Write a move that no tool returned, or a time the rule would not offer (the server re-checks) |
| Write one plain line of reason per move and a summary | Message a customer. Its key has no `send-messages` scope |
| Create a draft plan with `schedule.plans.create` | Call `visits.move`, `visits.pick`, `schedule.timeOff.*` or `visits.notifyMove` |
| | Sit in the customer's booking path (a model takes 30 to 90 seconds) |

### 4.2 The tools

| Tool | Kind | What Jev gets |
|---|---|---|
| `schedule.week`, `schedule.day`, `schedule.month` | read | what is booked, by person, with times and Anytime visits |
| `visits.list`, `visits.get` | read | a visit, its job, its yard, whether the customer must be home |
| `people.list`, `schedule.timeOff.list` | read | hours, working days, time off |
| `schedule.findTime` | read | for one unscheduled job: the ranked rows with added minutes and scores |
| `schedule.check` | read | the conflicts for one proposed placement |
| `schedule.orderDay` (`apply` absent) | read | the before and after of one day with minutes saved |
| `schedule.proposeWeek` | read (new) | our engine's greedy insertion: up to three candidate plans for a date range, each with total drive minutes, days used, towns per day, latest finish. Plain numbers, no model |
| `schedule.plans.create` | write-plans (new) | stores one draft plan: moves, a reason per move, a summary. Moves nothing |

Scope: a new API key scope `write-plans` allows `schedule.plans.create` and nothing else. Jev's key holds `read` and `write-plans`.

### 4.3 What a plan is

A plan is a draft list of moves. It is stored, drawn on the calendar, and applied by Ryan one press at a time. Section 6.2 has the tables.

| Fact | Rule |
|---|---|
| A move | A visit, a person, a day, an optional start time, the line of reason, and a status: pending, applied, rejected |
| Created | `schedule.plans.create` checks every move with the same `schedule.check`. A failing move is returned with its broken rule, so Jev can fix or drop it. A move that would need a forced tick is always rejected for Jev: it may only choose slots the rule offers |
| Drawn | On the Week grid and the Day columns as a dotted-edge block in the person's colour, with a thin line to the visit's old place; the Map panel dots the new pins; a strip under the header ("Jev's plan for the week of Nov 2: 11 moves. Throw away | Accept all") lists each move with its reason and a tick per move |
| Accept | Runs each ticked move through `visits.move` (the code `placeVisit` already runs), re-checking every rule. A move that fails is listed and skipped. Writes one `plan.accepted` event with the summary. **Accept moves visits and texts no one**; the moved visits then sit in the Not told list (section 7.8), where Ryan presses Notify all |
| Throw away | Marks the plan discarded. Nothing moves. `plan.discarded` event |
| Goes stale | A move whose visit changed after the plan was made is skipped on Accept and marked "Changed since" |
| A customer-picked day | Moves only when Ryan ticks it, flagged "Customer picked this day" (week-planning design 4(d)) |

### 4.4 Where Jev runs, and what it costs

**Jev's routing math goes through our handlers.** Mapbox publishes an MCP server ([docs](https://docs.mapbox.com/location-ai/mcp-servers/mcp-server/), hosted at mcp.mapbox.com/mcp or run with `npx -y @mapbox/mcp-server` and `MAPBOX_ACCESS_TOKEN`) with directions, matrix, isochrone and optimization tools, billed as normal API usage. It is an option for Hannah's own tooling. Jev does not use it for scheduling, because our handlers apply our rules (hours, time off, the gap, the cap), count every element in `provider_usage` so the 80 percent stop holds, and leave one audit trail. A Jev that called Mapbox directly would bypass the counter and could be billed.

Jev runs as a queued job in our app (`jev-plan`, drained by the existing queue), calling the model through Vercel's AI Gateway and the tools through `callApi` with Jev's principal. The same tools are also on the MCP server (`src/api/mcp.ts` makes one tool per handler), so Hannah's own Jev can call them from outside.

**The Vercel credit, checked Nov 25.** Source: [AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing) (last updated Sep 8 2026), opened in full.

| Finding | Status |
|---|---|
| "Every Vercel team account gets access to both a free tier and a paid tier" and there is a "monthly free credit" | Confirmed on the page |
| The free credits "start when you make your first AI Gateway request" | Confirmed |
| The free tier "includes a subset of models, not the full catalog"; free requests are rate limited per model, lower than paid | Confirmed. **Which models are in the subset: not found.** Jev's model must be on the free-tier list ([models page](https://vercel.com/ai-gateway/models?freeTier=true)); I did not check that a Claude model is |
| "Once you purchase credits, your account transitions to the paid tier and the monthly free credit no longer applies" | Confirmed. We must never top up, or the free credit ends |
| No markup on tokens | Confirmed |
| **$5 a month** | The page I opened says "monthly free credit" with no number. A search of Vercel's docs reported "$5/month included on the free tier" and "every 30 days after you make your first request". I could not confirm the number on the page itself |
| Renewal reliability | Several Vercel community posts report the credit did not renew for some Hobby accounts. Treat it as a stated policy that may not hold |

**Cost estimate.** Prices are the $2 per million input and $10 per million output tokens used in the week-planning design for a Sonnet-class model. They were not re-checked on the gateway's model page.

| Job | Tokens | Cost |
|---|---|---|
| One week-plan proposal a week: Jev reads three candidate plans and the week (about 8,000 tokens a turn, four turns) and writes a summary and reasons | 32,000 in, 3,000 out | $0.064 + $0.03 = about $0.10 |
| One "where should this unscheduled job go": the job, its yard, six `findTime` rows, two turns | 6,000 in, 600 out | $0.012 + $0.006 = about $0.02 |
| Ten of those a week | | about $0.20 |
| A month (4.3 weeks) | | about $1.3 |

That is a quarter of $5, and it holds at three times the price. If the credit lapses or a 429 comes back, the Jev button says "Jev is resting" and everything else works. Each Jev run has a hard cap of 8 tool turns, 60,000 input tokens and a 60 second limit, and logs its tokens to the plan's `detail`. **Not verified:** the function time limit on our Vercel plan; the job is queued so a long run is drained, not held by a request.

## 5. API

Every handler goes through `callApi`, is validated by Zod, and is in the MCP list. Scopes: `read`, `write` (the office), `collect` (a tech), `checkout` (the public booking), `write-plans` (Jev). "Customer scope" means a customer caller or a signed one-visit link.

### 5.1 New and changed handlers

| Handler | Method and path | Input | Output | Scope |
|---|---|---|---|---|
| `schedule.findTime` (new) | GET `/schedule/find-time` | `town`, `lat?`, `lng?`, `serviceKey`, `zones?`, `minutes?`, `day?` (that one day only), `personId?`, `exceptVisitId?`, `sort?` = `recommended` / `soonest` / `driving`, `limit?` (default 6, max 12), `includeForced?` | `{ rows: [{ id, day, start, end, personId, personName, addedMinutes, score, recommended, nextTo: string \| null, forced: bool, conflicts: Conflict[] }], estimated, soonestId, leastDrivingId }` | read |
| `schedule.check` (new) | POST `/schedule/check` | `visitId?` or `{ serviceKey, minutes, point }`, `personId`, `day`, `start?` (null = Anytime), `durationMinutes?` | `{ ok, hard: Conflict[], soft: Conflict[], addedMinutes, estimated }`. `Conflict` = `{ rule, words }` from the engine doc conflict table, plus new rule `time-off` | read |
| `visits.move` (changed) | POST `/visits/{id}/move` | `personId?`, `scheduledOn`, `startTime?` (null clears to Anytime), `durationMinutes?`, `confirm?` | `{ visit, warnings: Conflict[], undoToken, customerNotTold: bool }`. **No `notify`, no `note`; it texts no one.** Soft conflicts need `confirm: true` or it answers 422 with the list | write, collect for own visits |
| `visits.undoMove` (new) | POST `/visits/{id}/undo-move` | `undoToken` | the visit as before the move. Refused if the visit changed since | write |
| `visits.notifyPreview` (new) | GET `/visits/{id}/notify-preview` | `channel` = `text` / `email` | `{ body, channels: { text: bool, email: bool }, whyNot? }` built from the saved `date-moved` template (Settings > Messages), editable text | write |
| `visits.notifyMove` (new) | POST `/visits/{id}/notify-move` | `channel`, `body?` (max 480), `skip?: true` | `{ visit }`. Queues the text or email through the existing `queueDateMessage` with the edited body, writes `visit.customer-told` (or `visit.told-skipped` when `skip`) | write |
| `visits.notifyMany` (new) | POST `/visits/notify-many` | `ids[]`, `channel` | per visit `{ id, sent }`; each message is built from its own preview. The dialog shows the one template first | write |
| `visits.pick` (changed) | as today | adds `start: "HH:MM"` (engine doc section 11) | as today plus `lockedOnline` | write, customerSelf |
| `schedule.hold` (new) | POST `/schedule/hold` | `{ days: [{ visitKey, day, start }] }` | `{ holds, expiresAt }`, all or none, 10 minutes | checkout |
| `schedule.timeOff.create` (new) | POST `/schedule/time-off` | `personId`, `fromDay`, `toDay?`, `startTime?`, `endTime?` (both null: whole days), `note?` | `{ timeOff, visitsInside: [visit summary] }` | write |
| `schedule.timeOff.list` (new) | GET `/schedule/time-off` | `from`, `to`, `personId?` | `{ data: TimeOff[] }`; a tech sees their own | read |
| `schedule.timeOff.remove` (new) | DELETE `/schedule/time-off/{id}` | none | `{ timeOff }` with `removedAt` set | write |
| `schedule.month` (new) | GET `/schedule/month` | `month` (YYYY-MM), `personId?` | `{ days: [{ day, stops, towns[], byPerson: [{ personId, stops }], off: personId[], openMinutes }] }` | read |
| `schedule.week`, `schedule.day` (changed) | as today | adds `from/to` for any range up to 8 days | blocks gain `startTime`, `durationMinutes`, `customerNotTold`, `waiting`; adds `timeOff[]` and `plan` (pending moves of a draft plan) | read |
| `schedule.orderDay` (new) | POST `/schedule/order-day` | `personId`, `day`, `apply?`, `undoBatch?` (engine doc section 5) | before and after, minutes saved, "Doesn't fit today"; writes `stop_order` only | write |
| `schedule.rainOut` (new) | POST `/schedule/rain-out` | `personId?`, `day`, `apply?`, `undoBatch?` | proposed moves (visit, new day and time, added minutes), one `apply`; no texts | write |
| `schedule.proposeWeek` (new) | GET `/schedule/propose-week` | `from`, `to`, `jobIds?` | up to three `{ label, moves[], driveMinutes, daysUsed, townsPerDay, latestFinish }` | read |
| `schedule.plans.create` | POST `/schedule/plans` | `kind`, `from`, `to`, `summary`, `moves: [{ visitId, personId, day, start?, reason }]` | `{ plan, rejected: [{ move, conflict }] }` | write-plans, write |
| `schedule.plans.list`, `.get` | GET | `status?` | plans with moves | read |
| `schedule.plans.accept` | POST `/schedule/plans/{id}/accept` | `moveIds?` (default all pending) | `{ applied, skipped: [{ visitId, why }] }` | write |
| `schedule.plans.discard` | POST `/schedule/plans/{id}/discard` | none | `{ plan }` | write |
| `schedule.plans.requestJev` (new) | POST `/schedule/plans/request-jev` | `kind` = `week` / `unscheduled`, `from?`, `to?`, `visitIds?` | `{ plan }` with status `drafting`; queues `jev-plan` | write |
| `schedule.offerDays`, `visits.areaDays` (changed) | as today | as today | **customer scope:** `offers: [{ day, slots: [{ start, end, recommended }] }]` and nothing else per slot. **Office scope:** the full shape (label, tier, added, person) | as today |

`schedule.findTime` reuses `loadOfferInputs` and returns every open slot scored, not three days, so the office list and the lit calendar read the same rows. All handlers that read a person's day go through one function, `placementProblems`, in `src/lib/scheduling/placement.ts`. It is pure so the browser can run it on drag hover from the loaded week; the server runs it again with road times on drop and on Accept.

### 5.2 Customer scope never says why

| Output field | Customer scope | Office scope |
|---|---|---|
| `recommended` | yes | yes |
| `label`, `tier`, `same`, `near` | removed | present |
| `addedMinutes`, `score` | removed | present |
| `personName`, `personId` | removed | present |
| `nextTo` | removed | present |
| `estimated` | removed | present |

A test reads the JSON of a customer response and fails on any of the removed keys, and on the words "already", "near", "Erie that day" and "route" in its strings.

### 5.3 What retires

| Retires | Why | When |
|---|---|---|
| `src/lib/scheduling/schedule.ts`, `run.ts`, `slots.ts` and their tests; `schedule.run` | The old area-group scheduler; `schedule.slots` already delegates to the offer rule | Step 9, after the checkout reads `offers` |
| The area rule and the `capacityAfterBlocks` buffer inside `visits.move` / `placeVisit`, and its read of `settings.windows` | Two rule sets disagree (research section 1). `placeVisit` calls `placementProblems` instead | Step 4 |
| `notify` and `note` on `visits.move`; `queueDateMessage` call inside `placeVisit` | D5. A move texts no one | Step 4 |
| `orderDay` stacking from 08:00 after a move (`order-day.ts`) | A pass visit's stacked `start_time` would draw a false block on the clock. Untimed visits get `stop_order` only. Verify `timeBooked` in `move-rules.ts` at build | Step 4 |
| `TextingStrip`, `use-texting-queue.ts`, the Move `SplitButton` use | D5 | Step 4 |
| `PlaceAllDialog` and `placeAllPlan` | Replaced by a plan from `schedule.proposeWeek` that Ryan accepts | Step 8 |
| `area`, `settings.windows`, `bufferPercent*`, `capacityFor` | After nothing reads them; guard-before-drop push | Step 10 |

## 6. Data

Each new table is its own additive migration (migration safety, section 10). `docs/DATA_MODEL.md` gets the rows below in the same push.

### 6.1 `time_off` (new table)

A person's time off. Whole days when the times are null, a span of hours when set. The engine doc's `busy_block` was never built: busy time today is `jobber_visit` rows with `is_block = true`, read by `loadBlocks` from a calendar feed. Those stay until the Jobber exit, and the loader merges both into the same `BlockedSpan` list.

| Entity.field | Lives in | Set by | Shown in |
|---|---|---|---|
| time_off (id, organization_id, person_id, created_at) | `time_off`, org-scoped, indexed on `(organization_id, person_id, from_day)` | `schedule.timeOff.create` | the Schedule (a hatched band), Time off dialog, People (next time off) |
| time_off.from_day, to_day | `time_off.from_day`, `to_day`, date; `to_day` equals `from_day` for one day | the Time off dialog | hatched band across the days |
| time_off.start_time, end_time | `time_off.start_time`, `end_time`, text "HH:MM", both null for whole days; if one is set both are, end after start | the Time off dialog | the band's height on the clock, "Ryan off 1:00 to 3:00 pm" |
| time_off.note | `time_off.note`, text, max 140, nullable | the Time off dialog | the band's label and the Time off list. Staff only, never a customer |
| time_off.created_by | `time_off.created_by`, text, the signed-in email | the handler | the event |
| time_off.removed_at | `time_off.removed_at`, timestamp, nullable. Removing sets it; the row stays (nothing is deleted) | `schedule.timeOff.remove` | gone from the Schedule |

Read by `loadOfferInputs` (a span per day, whole days as no start and no end, which `BlockedSpan` already supports), `schedule.check`, `dayFill` (open time less the span) and the Month view. A tech may add their own time off; only an owner or admin may add another person's. Events: `person.time-off-set` and `person.time-off-removed`, written with `about: "person"` once `EVENT_ABOUT` gains `person` (a code change in `kinds.ts`, no migration, since `event.about` is text).

### 6.2 `schedule_plan` and `schedule_plan_move` (new tables)

| Entity.field | Lives in | Set by | Shown in |
|---|---|---|---|
| schedule_plan (id, organization_id, created_at) | `schedule_plan` | `schedule.plans.create`, `requestJev` | the plan strip on the Schedule |
| schedule_plan.kind | text `week` or `unscheduled` | the creator | strip heading |
| schedule_plan.from_day, to_day | date, the range the plan covers | the creator | strip, the dotted blocks |
| schedule_plan.status | text `drafting`, `draft`, `accepted`, `discarded` | handlers; `stale` is derived, not stored | strip buttons |
| schedule_plan.summary | text, max 600, plain words, no customer data beyond first names | Jev or the office | strip |
| schedule_plan.created_by | text: `jev` or an email | handler | strip "Jev's plan" |
| schedule_plan.detail | jsonb: tokens used, model, candidate labels, `drive_source` | the Jev job | admin only, never a screen in this build |
| schedule_plan.decided_at, decided_by | timestamp, email | accept or discard | history |
| schedule_plan_move (id, plan_id) | `schedule_plan_move`, one row per move | `plans.create` | the strip's list |
| schedule_plan_move.visit_id, person_id, day, start_time | the proposed place | creator | dotted block; the old place is read from the visit |
| schedule_plan_move.reason | text, max 160 | Jev or the engine | the strip line |
| schedule_plan_move.status | text `pending`, `applied`, `skipped`, `rejected` | accept, create | the strip tick or "Changed since" |
| schedule_plan_move.visit_updated_at | timestamp of the visit when the plan was made | creator | the stale check on Accept |

### 6.6 `provider_usage` (new table, the Mapbox counter)

| Entity.field | Lives in | Set by | Shown in |
|---|---|---|---|
| provider_usage (id, organization_id, created_at) | `provider_usage`, one row per organization, product and month, unique on `(organization_id, product, month)` | `reserve()` in `DriveTimes`, the Directions caller, the map-load beacon | the Home row; no screen of its own |
| provider_usage.product | text: `mapbox-matrix`, `mapbox-directions`, `mapbox-map-load` | the caller | the Home row words |
| provider_usage.month | text `YYYY-MM`, Mountain | the caller | the Home row key |
| provider_usage.used | integer; elements, requests or loads | the atomic reserve update | the Home row ("80,412 of 100,000 elements") |
| provider_usage.stop_at | integer, 80 percent of the free allowance, set when the row is made from constants in code | row creation | the stop test |
| provider_usage.paused_at | timestamp, nullable; set when a reserve is first refused | `reserve()` | the Home row, cleared when the month turns |

The allowances (100,000, 100,000, 50,000) are constants in `src/lib/scheduling/server/provider-limits.ts`. They are not settings. A Mapbox pricing change is a code change.

### 6.3 Derived, not stored

| State | Derived from | Rule |
|---|---|---|
| Customer not told | `event` rows about the visit | The newest of `visit.scheduled` and `visit.moved` written by staff (`who` is an email) has no later `visit.customer-told` or `visit.told-skipped`. A customer's own pick is never "not told". A visit with no day is never "not told" |
| Waiting on customer | as before | newest `visit.moved` with `asked: true` and no later `visit.confirmed` or `visit.picked` |
| A drop's undo | the `visit.moved` event's `detail.from*` | `visits.undoMove` restores the `from` day, person, start and duration if no later event touched the visit |
| Anytime | `visit.scheduled_on` set and `visit.start_time` null | the strip on top of the day |
| A block's length | `visit.duration_minutes`, else `defaultMinutes(kind)` | the block's height |
| A plan is stale | `schedule_plan_move.visit_updated_at` less than the visit's `updated_at` | "Changed since" |
| Today's person colour | `personClass` | unchanged |

### 6.4 New columns

| Column | Row |
|---|---|
| `person.start_lat`, `start_lng` (engine doc, stage 6) | real, nullable; where the day starts (null: the shop in Erie). Set on People. Read by `EMPTY_DAY_DRIVE`, Order the day. Own migration |

`visit` gets no new column. `visit.moved` detail gains `fromStart`, `fromDuration`, `fromPersonId` (so Undo is exact) and `viaPlan`. `event.kind` is text, so new kinds need no migration.

### 6.5 New event kinds (`src/lib/events/kinds.ts`, with `eventWords`)

| Kind | About | Detail | Words |
|---|---|---|---|
| `visit.customer-told` | visit | channel, `body`, messageId | "Ryan told Andrea about the move by text" |
| `visit.told-skipped` | visit | reason? | "Ryan chose not to tell Andrea about the move" |
| `visit.move-undone` | visit | from the undone event | "Ryan undid the move" |
| `person.time-off-set`, `person.time-off-removed` | person | from, to, start, end, note | "Ryan took off Fri Dec 4" |
| `plan.created`, `plan.accepted`, `plan.discarded` | schedule | plan id, move count, summary | "Jev proposed 11 moves for the week of Nov 2" |
| `visit.ordered` | visit | batch id, old order (exists in the engine doc) | "Tuesday was ordered" |

`EVENT_ABOUT` gains `person` and `schedule`. Offer events (`visit.scheduled`, `visit.moved`) carry `drive_source` and the element count.

## 7. Screens

Widths: 1280 and 375. Every screen uses the recipe (`docs/DESIGN.md`): `PageHeader`, `SegmentedControl`, `SidePanel`, `ConfirmDialog`, `RecordPanel`, `FormRow`, tokens only. Words follow `docs/UX_WRITING.md`: sentence case, no em dashes, "visit", "person", "Unscheduled", "Any time". On a phone nothing is dragged; section 7.13 lists every replacement.

### 7.1 Schedule, Week (1280)

```
Schedule   Week of Nov 23     [Week|Day|Month|List]   [Unscheduled 4] [Map]   [New job]
< Today >    Filters: Who [All v]            3 not told                   Jev plan [Ask Jev]
         |  Mon 23           |  Tue 24           |  Wed 25  ...
         |  5 stops 3 h open |  4 stops          |
         | Ryan | Tech Two   | Ryan | Tech Two   | Ryan | Tech Two
Anytime  | [Cheesman St]     | [Dry Cr Rd]  |    |
 8 am    |                   |
 9 am    | +------+ +-----+  |
10 am    | |Briggs| |Rdge |  |     (block height = visit length; person colour bar on left)
11 am    | |9:00  | |9:30 |  |
12 pm    | +------+ +-----+  |     ////// Ryan off 12 to 2 //////
 1 pm    |     [dashed edge: not told]
```

States: empty day (no blocks, a faint "+" to add a job at that hour); a block in conflict (red outline, words on hover); a not-told block (dashed left edge and a small bell, 7.8); a time-off band (hatched, person's colour at 20 percent); a planned block (dotted edge, 7.11); selected block (navy ring, opens the visit panel through `RecordHost`); loading (a skeleton grid). Hours run from the earliest start of any person to the latest end, at least 8:00 to 17:00, 48 px per hour. Two overlapping visits of one person sit side by side. Drag a block to move it, drag its bottom edge to change its length, drag across people to reassign. The "Now" line shows today.

### 7.2 Schedule, Week (375)

```
Schedule  Nov 23-29           [New job]
[Week|Day|Month|List]  [Unscheduled 4] [Map]
 Mon 23   Tue 24   Wed 25  Thu 26 ...     (a day strip, swipe)
 Ryan  [Tech Two]  [All]                  (a person chip)
 Anytime  Cheesman St      Dry Creek Rd
 9:00 Briggs St, turn-on, 1 h
10:30 ...
```

The phone shows the selected day for the selected person on the clock. Tapping a block opens the visit sheet. The Week segment on a phone is the day strip plus that day's column; the full grid is not drawn below 768 px.

### 7.3 Schedule, Day (1280)

```
Wednesday, Nov 25     [Week|Day|Month|List]   [Unscheduled 4] [Map]
         | Ryan                    | Tech Two                |
Anytime  | [Cheesman St]           |                         |
 9 am    | +---------------------+ | +---------------------+ |
         | | 1 Briggs St  9:00   | | | 1 Main St  9:30     | |
```

One column per working person, the same clock, stops numbered by route order. Anytime visits are numbered in the strip. A drop into a column reassigns; the column header shows "Ryan, 5 stops, 3 h open" from `DayHeader`.

### 7.4 Schedule, Month

```
November 2026        [Week|Day|Month|List]
 Mon   Tue   Wed   Thu   Fri   Sat   Sun
 23    24    25    26    27
 5     4 *   6     off   3          (* = a not-told move, the number is stops)
 Erie  Lafy  Erie        Lngmt
```

Each day shows the stop count, the towns (two at most, "+1"), a dot per person in their colour, and a hatch when a person is off. Tapping a day opens it in Day view. On a phone each day is a cell with the count only; tap goes to Day. No drag in Month. States: a day with no stops is blank; a day with time off for all is hatched.

### 7.5 The Anytime strip

A visit with a day and no start time (`start_time` null) sits in a strip above the clock for each person, in stop order, as a short chip: street, kind, minutes. Dragging a chip down onto the clock gives it a start time ("Move"), dragging a block up into the strip clears the time. Order the day only reorders this strip and fits chips into gaps, never touches a timed block. Empty strip: it collapses to a thin line "Anytime".

### 7.6 Unscheduled panel and Map panel

Two side panels, each a `SidePanel` that docks to the right at 1280. Both can be open at once and then split the column. They are buttons in the header with a count: "Unscheduled 4", "Map". Neither covers the week; the grid narrows.

```
Unscheduled (4)   sort [Oldest v]       Map   [Ryan][Tech Two] [Unscheduled]
 Andrea Reyes  Erie                     +--------------------------+
 Spring turn-on  1 h   [Find a time]    |   1   2    (pins by person)  |
 ...                                    |        (o) unscheduled job  |
                                        +--------------------------+
```

Unscheduled rows sort by oldest, newest, name. A row can be dragged onto the clock, or its **Find a time** button opens the list in 7.9. While the panel is open, the Map shows its jobs as hollow pins. Hovering a row lights its pin; hovering a block lights its pin; hovering a pin lights the block. The Map panel draws each person's route as a line in their colour for the selected day (existing `DayMap`). On 375 each panel is a full-height sheet from the bottom, one at a time.

### 7.7 Find a time, inside New job

```
New job                                            [x]
 Customer  [Andrea Reyes v]     Address [480 Briggs St, Erie]
 Service   [Spring turn-on v]   Zones [8]
 [Find a time]   Sort [Recommended | Soonest | Least driving]   Estimated drive times
 +----------------------------------------------------------------+
 | * Wed Apr 29  5:00 pm  Ryan       adds 3 min   Next to a Longmont visit |
 |   Mon Apr 27  12:00    Ryan       adds 30 min                           |
 |   Tue Apr 28  4:30 pm  Ryan       adds 15 min                           |
 | Show all times (7 more)                                                 |
 +----------------------------------------------------------------+
 Tuesday only? [Thu Apr 30 v]     [Add job]  [Add without a day]
```

Picking a row selects it, and the week grid behind (or the Schedule's Day view) scrolls to it and lights a ghost block in the person's colour, while the Map panel pins the address and draws the line to the neighbour. States: before an address (the button is off, "Add an address to find a time"); searching (skeleton rows, 1.5 s at most); no openings ("No time before Nov 30. Pick a day yourself"); an address outside the six towns (words from engine decision 12 plus a warning); estimated (grey note); forced row chosen (the conflict words under the row and a tick "Book it anyway"). On 375 the list is the sheet's body; picking a row shows a "View on calendar" link that opens Day with the ghost block. "Add without a day" saves it Unscheduled (job P3).

### 7.8 The moved toast, the Notify dialog and "not told"

```
+-------------------------------------------------+
| Visit moved   Briggs St to Thu 30, 9:00   [Notify] [Undo]   x |
+-------------------------------------------------+
```

The toast shows for 10 seconds after any move (drag, resize, the Move dialog, a plan accept shows one toast "11 visits moved" with Notify all and Undo). It says "Visit moved", or "Visit scheduled" for a first placement. **Notify** opens:

```
Tell Andrea about the new time
 (o) Text  (  ) Email          to (970) 555-0100
 +--------------------------------------------------+
 | Trailhead: your spring turn-on is now Thu, Apr 30, 9 to 9:30 am... |   (editable)
 +--------------------------------------------------+
                                  [Send]   [Don't tell]
```

The message starts from the saved `date-moved` template (words from `src/emails/editable.ts`, owned by Settings > Messages). Ryan edits it before it goes; nothing sends without Send. "Don't tell" writes `visit.told-skipped`. A visit with no phone and no email says "No way to reach Andrea" and offers neither. A must-be-home yard keeps the existing "Reply YES or pick another day" line.

**What a not-told visit looks like.** A dashed left edge on its block, a small bell icon, and the line "Customer not told" in its panel with Notify and Don't tell. **Where Ryan sees all of them:** (1) a count in the Schedule header, "3 not told", that opens the list as a tab in the Unscheduled panel (same panel, a second tab "Not told"); (2) a Home Needs action row "3 moves the customer has not been told about" with Open Schedule; (3) the Notes and history block. The list is read from events (6.3) and has Notify, Don't tell and Notify all (one dialog showing the template). A move whose customer would learn it first from the day-before text still stays in the list until decided.

The customer's account and signed link always show the present day, so "not told" does not hide anything from them; they just were not messaged.

### 7.9 Time off

**Changed by Hannah on Nov 25 after seeing the prototype:** time off is set in Settings, on the person (Settings > People, beside Working days and Hours), where a person's availability already lives. The Schedule has no Time off button in its header. The Schedule only shows the band; pressing a band opens that person's time off. The dialog below is the form People opens. The sentences under it about opening it from the day header and by dragging across the clock no longer hold.

```
Time off                                      [x]
 Person   [Ryan Garner v]
 [ ] All day     From [Fri Dec 4 v]  To [Fri Dec 4 v]
 Times    [1:00 pm v] to [3:00 pm v]   (off when All day is on)
 Note     [Dentist]                        (staff only)
 2 visits are inside this time. They stay where they are.  Cassie, Erie ...  [Move them]
                                    [Add time off]
```

Opened from the person's day header menu, from the clock (drag across empty hours, release, the dialog opens with the span), and from People. On 375: a "Time off" button in the day's overflow menu opens the same dialog with From, To and time boxes (no drag). The band shows on Week, Day and Month; clicking it opens the dialog with Remove. Adding time off over booked visits never moves them; it lists them. Nothing is offered or booked into it (a forced booking warns "Ryan is off 1:00 to 3:00 pm").

### 7.10 The drop that breaks a rule

```
(Dragging Briggs St over Ryan, Tue 3:00 pm)
  cell turns red:   Ryan has Dry Creek at 3:00 pm.     (from the engine doc's conflict table)
After drop:  a dialog (ConfirmDialog)  "Move anyway?"
   Ryan has Dry Creek at 3:00 pm.
   Needs 15 minutes after Cheesman St; there are 5.
   [Keep it where it was]   [Move anyway]
```

The hover colour uses `placementProblems` in the browser with the loaded week (estimated drive times). The drop calls `schedule.check` with road times. No conflicts: it moves and the toast shows. Soft conflicts: the dialog above, its words from the engine doc section 6 conflict table plus "Ryan is off 1:00 to 3:00 pm." (new). Hard conflicts (visit done or cancelled, person inactive): the drop is refused with the words. The destructive-looking button is the primary because the choice is the rule being broken.

### 7.11 A Jev proposal

```
Jev's plan, week of Nov 30  11 moves, 94 fewer driving minutes          [Throw away] [Accept all]
 [x] Dry Creek Rd  Tue 1 to Thu 3, 9:30    Erie stops are together on Thursday.
 [x] Cheesman St   Wed 2 to Thu 3, 11:00   Same street as Dry Creek.
 [ ] Ann Lee       Wed 2 to Tue 1          Customer picked Wed. Needs your call.
```

The strip sits under the header. The blocks of every move are drawn dotted at their new place with a faint line to the old one; the Map dots the new pins. Hover a row to light its block. Tick or untick moves. **Accept** runs the ticked moves, shows one toast "11 visits moved" with Notify all and Undo, and the moved visits join Not told. **Throw away** clears the strip. States: drafting ("Jev is working", with a Cancel), failed ("Jev is resting. Try again later"), stale rows ("Changed since", unticked and skipped), empty ("Jev found nothing to change"). On 375 the strip is a sheet listing the moves, with the dotted blocks visible on the Day view.

### 7.12 The customer's day and time step, with the mark

The existing `DayCalendar` stays (a quiet dot on open days, soonest chosen, times under the grid). One time, the lowest score, carries the mark. Nothing says why.

```
Pick a day                          Wed, Apr 29
 < April >                           9:00 am   12:00 pm   2:30 pm   5:00 pm  [mark]
  M  T  W  T  F                      [ More times ]
  27 28 29 30  1
  .  .  .  .  .
                                      [Continue]  (off until a time is tapped)
```

**The mark, three candidates, for Hannah to choose.** Each is shown in Storybook on the same time button at 375 and 1280, in light and dark.

| Candidate | Look | Accessible name |
|---|---|---|
| A | The word "Recommended" in small orange text under the time | "Recommended" |
| B | A small orange star in the corner of the time button | "Recommended time" |
| C | An orange outline on the button with the word "Suggested" above it | "Suggested time" |

No other copy is invented: no promise, no time frame, no reason. Words come from Hannah's pick. A customer sees no mark on a time that is not the best; a day with one open time marks it; if the customer picks another time nothing changes.

### 7.13 What a phone does instead of a drag

WCAG 2.2 SC 2.5.7 requires a single-pointer way to do each drag, on desktop too.

| Drag | Replacement, on every screen size |
|---|---|
| Move a block to another day, time or person | Open the visit, press Move: the one dialog with Day, Time (half hours), Person, Length |
| Change a block's length | The Move dialog's Length stepper (15 minutes a step); a "-" and "+" on the block's menu |
| Drag an Unscheduled job onto the clock | **Find a time** on its row, or Place (opens the list in 7.7) |
| Drag a chip to or from Anytime | The block menu: "Set a time" / "Make it Any time" |
| Drag across empty hours to add time off | The day header menu, "Time off" |
| Keyboard | A focused block moves with the arrow keys (dnd-kit's keyboard sensor), Enter drops, Escape cancels |

Every drop, by any route, ends in the same toast and the same Undo.

## 8. Blocks

New blocks go in `src/components/blocks/`, each with a story, a test, and a line in the gate's `NEW_BLOCKS`. The calendar is built by us on CSS grid with a drag library. `@dnd-kit/react`: `npm info` on Nov 25 shows version 0.5.3 with peer dependencies `react ^18.0.0 || ^19.0.0` and `react-dom ^18.0.0 || ^19.0.0`, so it supports React 19. Its touch and keyboard sensors are claimed by its own site and the research doc; I did not re-open it. Nothing is copied from coss ui (its licence is not stated); it is a reference for finish only.

| Block | Does | Reuses |
|---|---|---|
| `TimeGrid` | The clock: hours down, columns across (days in Week, people in Day), blocks placed by `startTime` and `durationMinutes`, drop targets on 15-minute rows, the now line | `DayHeader`, `personClass` colours |
| `TimeBlock` | One visit as a block: customer, kind, time, colour bar, not-told edge, conflict outline, planned dotted edge, resize handle | `StatusPill` |
| `AnytimeStrip` | The chips above a column | `TimeBlock` (compact) |
| `TimeOffBand` | The hatched band | tokens |
| `UnscheduledPanel` | The list with sort, Find a time, drag source, a second tab "Not told" | `SidePanel`, `SegmentedControl` |
| `MapPanel` | The map beside the week: person pins and lines, hollow pins for unscheduled, hover sync | `DayMap`, `SidePanel` |
| `FindATime` | The ranked list, sort control, forced rows, lit-calendar callbacks | `FormRow`, `SegmentedControl`, `RecordList` |
| `MovedToast` | "Visit moved" with Notify and Undo, 10 seconds, queue of toasts | the app's own `UndoToast` block, widened to carry a second action (no new toast library) |
| `NotifyDialog` | The editable message, channel choice, Send and Don't tell | `ConfirmDialog`, `FormRow` |
| `NotTold` | The mark (bell and dashed edge) and the list rows | `RecordList` |
| `TimeOffDialog` | The time off form | `ConfirmDialog`, `FormRow` |
| `PlanStrip` | Jev's plan list with ticks, Accept, Throw away | `RecordList`, `ConfirmDialog` |
| `MonthGrid` | Month cells with counts, towns, dots, hatch | `DayCalendar` pieces |
| `RecommendedMark` | The mark (the three candidates until Hannah picks) | tokens |
| `MoveDialog` (changed) | Day, Time, Person, Length, conflict words, no text option; confirm "Move" | `ConfirmDialog` |

| Retires | Replaced by |
|---|---|
| `WeekGrid`'s table | `TimeGrid` |
| `TextingStrip`, `use-texting-queue` | `MovedToast`, `NotifyDialog` |
| `SplitButton` in Move (the block stays, used elsewhere) | one Move button |
| The Unscheduled card under the week (`ScheduleUnscheduled`) | `UnscheduledPanel` |
| `PlaceAllDialog` | `PlanStrip` |
| `DayCalendar` (customer) | kept; gains the mark |

## 9. The Storybook prototype

Drawn before any wiring, at 375 and 1280, over fixtures (the April data of the engine doc and the week of Nov 23), in Storybook under Admin / Schedule and Customer / Booking.

| # | Story | States |
|---|---|---|
| 1 | Week, two people | full week, empty week, a day with an overlap, a visit with a conflict |
| 2 | Day, two people | route numbers, the Anytime strip, one person off |
| 3 | Month | busy, quiet, a day with time off, a not-told day |
| 4 | Anytime strip | empty, three chips, one dragged to the clock |
| 5 | Unscheduled panel alone, Map panel alone, both open | sort orders, hover sync (pin and block), hollow pins |
| 6 | Find a time in New job | before address, searching, results in three sorts, forced rows, outside the six towns, estimated, no openings; lit calendar and map |
| 7 | Moved toast and Notify dialog | drag toast, resize toast, "11 visits moved" toast, text and email, edited message, no way to reach |
| 8 | Customer not told | the block mark, the panel line, the Not told tab, the Home row |
| 9 | Time off | whole day, hours, over booked visits, Month hatch, remove |
| 10 | A drop that breaks a rule | hover red, the confirm dialog with two conflicts, a refused hard rule |
| 11 | Jev proposal | drafting, a draft of 11 moves, a stale row, a customer-picked row, accepted, thrown away, resting |
| 12 | Customer day and time with the mark | candidates A, B and C side by side, light and dark, screen reader name shown, one open time |
| 13 | Phone replacements | Move dialog with Length, the block menu, the day header menu |
| 14 | Drag affordances | keyboard move of a focused block, a resize, a drop on another person |

Hannah reviews the stories; nothing is wired until she does (the workflow rule of Nov 19). Each story renders at 375 and 1280 through `npm run test:stories` with axe.

## 10. Build order

Each step ships alone. Preview and Production share one database, so every pushed migration runs live: additive only; a drop goes in its own later push, behind a guard that aborts if the backfill is incomplete (the pattern of data-model step 6). Each new table and column ships with its `docs/DATA_MODEL.md` rows. Tests: pure rule tests unit, handlers on pglite, stories through `test:stories`.

| Step | Ships | Migration | Tests |
|---|---|---|---|
| 1 | The score (`score.ts`), `EMPTY_DAY_DRIVE`, the `DriveTimes` interface with the estimate and Mapbox implementations and the fallback, the `drive` lookup in `OfferInputs`, the `provider_usage` counter and its Home row | `provider_usage` | the April table of 2.3 to the decimal; Longmont illustration; empty day adds the round trip; Mapbox stub that throws, times out, answers 401, 403 or 429: `estimated`; request builder never exceeds 25 coordinates; the 50 a minute bucket; the counter refuses at 80,000 elements and two parallel reserves cannot both pass; the month turn; no booking is ever blocked by a refusal |
| 2 | `schedule.findTime`, `schedule.check`, `placementProblems`; customer scope output stripped, with the recommended mark | none | ranks and the three sorts; a customer response has none of the removed keys or words; one recommended per offer; forced rows return the engine's conflict words |
| 3 | `time_off` table and its three handlers; the loader reads it; `dayFill` and `schedule.check` read it | `time_off` | a span offers no slot; a whole day offers none; removing reopens; a tech adds only their own; adding over a visit lists it and moves nothing; the Jobber feed blocks still merge |
| 4 | Moves never text: `visits.move` drops `notify` and `note`, `undoToken`, `visits.undoMove`, `visits.notifyPreview`, `notifyMove`, `notifyMany`; events `visit.customer-told`, `told-skipped`; the derived not-told read; `orderDay` stacking removed; the area rule removed from `placeVisit` | none | a move queues no message; Notify sends the edited body; Don't tell clears the state; a customer's own pick is never not told; Undo restores day, person, start, length; Undo refused after a later change |
| 5 | The calendar: `TimeGrid`, `TimeBlock`, `AnytimeStrip`, Week, Day, Month, `UnscheduledPanel`, `MapPanel`, drag and resize with dnd-kit, the toast, the Notify dialog, Time off dialog, `schedule.month`, `schedule.week/day` fields | none | handler shape tests; story tests at 375 and 1280; keyboard and button alternatives for each drag; the toast follows each route |
| 6 | Find a time in New job and Place on Unscheduled rows (the list lights the calendar and map) | none | row pick lights the block; Add without a day saves Unscheduled |
| 7 | The customer's day and time step with the mark and `visits.pick` taking `start`, `schedule.hold` (engine doc step 2) | none | the engine doc's race, hold, cut-off and daylight saving tests; the mark appears once |
| 8 | `schedule.orderDay`, `schedule.rainOut`, `schedule.proposeWeek`, `schedule_plan` tables, `PlanStrip`, plan accept and discard | `schedule_plan`, `schedule_plan_move` | booked times unchanged by an order; rain keeps the time of day where open; accept re-checks every rule; a stale move is skipped; no text on accept |
| 9 | Jev: `write-plans` scope, `schedule.plans.create`, `requestJev`, the queued job, AI Gateway call, caps, Jev's tool list | none | a Jev key cannot call `visits.move` or messages; a forced move is rejected; a Jev outage leaves the screen working; a run stops at its token cap |
| 10 | Retire `schedule.ts`, `run.ts`, `slots.ts`, `schedule.run`, `area`, `settings.windows`, buffers | the drop push, with a guard | nothing imports the old files; no screen reads `area` |

Steps 1 to 4 are the engine and the rule that nothing texts on its own; they can ship before any new screen. Step 5 is the large one and has its own review of the stories.

## 11. Open for Hannah

Five at most. Each has my recommendation.

1. **Which mark should the customer see: A "Recommended", B a star, or C "Suggested" with an outline?** Recommend A: it is a word, so a screen reader and a quick glance both get it.
2. **Do you want the map to move to Mapbox's look (`mapbox-gl`, Standard style)?** It is free at our volume and guarded by the 80 percent counter. Recommend yes, after the calendar ships, so the swap is tested on its own.
3. **Should "Visit moved" close after 10 seconds?** Recommend yes. The visit keeps its Not told mark afterward, so nothing is lost.
4. **After a Jev plan is accepted, may "Notify all" open one dialog with a checkbox per customer and the same editable message?** Recommend yes. Each customer still gets a message only when Ryan presses Send.
5. **Should the Mapbox account have a card on file?** A card account has no hard cap (only our 80 percent stop protects the bill); an account with no card has lower, unpublished caps and turns every Mapbox API off at them. Recommend no card for the first season, so Mapbox itself stops the bill, with the estimate as the fallback. **Where it stands:** Hannah opened the account on Nov 25 with no card ("Usage limited"). Its default public token has no URL restriction yet; before anything goes live we make one token locked to our domain for the map and a separate one for the server's drive-time calls.

**Owed before the calendar is drawn:** the research pass on how Notion Calendar, Cal.com, Linear and Attio handle keyboard shortcuts and density (research doc, section 7).

## Could not verify

| Item | Status |
|---|---|
| Mapbox rules on storing Matrix or Directions results | Not found. The Matrix docs page is silent; the Terms of Service page opened has no sentence on it; the Product Terms PDF was unreadable. A third-party page says no, unverified. Design stores nothing. **Pre-build check: read the Mapbox Product Terms PDF** |
| Mapbox Optimization v2 pinning an exact time with a tight strict window | An inference, not on the page; access is by request; pricing not found |
| Mapbox Directions rate limit | Not found on the page I read |
| `react-map-gl` and React 19 | Not found; check peer dependencies before the map move |
| Mapbox demo-access caps | Unpublished |
| Vercel AI Gateway's $5 | The pricing page says "monthly free credit" without a figure; the $5 and "every 30 days" came from a search summary of Vercel's docs. Community reports say renewal can fail |
| Whether a Claude model is on the free tier's model subset | Not checked |
| Model prices used in the Jev estimate ($2 and $10 per million) | Taken from the week-planning design, not re-checked on the gateway model page |
| Google's limit on using Places coordinates with a non-Google map (we draw on MapLibre and now route with Mapbox), and the 30-day limit on stored `property.lat/lng` | Not read in the Service Specific Terms. Read once before step 1. If it bites: Mapbox's geocoder for the point, Google for the suggestion text and place id |
| Google Route Optimization holds visits fixed | Research claim, not re-opened. Not used |
| Mapbox Optimization v2 can hold visits fixed | Not found on its docs page; pricing for v2 not found. Not used |
| `@dnd-kit/react` touch and keyboard sensors, and drag-resize | The npm peer range is checked; the sensors are from the research doc, not re-opened |
| Vercel function time limit on our plan | Not checked; Jev's job is queued |
| `timeBooked` and the pass stack in `move-rules.ts` after the 08:00 stack is removed | Not read to the end; a step 4 check |
