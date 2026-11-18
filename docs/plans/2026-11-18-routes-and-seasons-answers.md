# Routes and Seasons: the answers from Jobber's data

Nov 18 2026. Answers the four questions in section 6 of `2026-11-18-week-planning-design.md`. Hannah asked for research and answers, so each one is a recommendation with its numbers. Nothing in Jobber was changed; every call was a read.

## 1. What was read

| Item | Number |
|---|---|
| Jobber visits live today (`search_visits`, no filter) | 669 |
| Visits before Jan 1 2026 | 0. The account opened in March 2026, so "two seasons" is one: 2026 spring and fall |
| Read from the saved Nov 12 pull (`.local-data/admin/jobber-raw-2026-11.json`, 599 visits, 601 jobs with property address) | 599 |
| Read live today, created since that pull (`createdAt` after Nov 12 19:52Z, two pages) | 71 (599 + 71 is one more than the live 669; not chased) |
| Calendar blocks dropped (Pick up Mason, Scott available or unavailable, Ryan Test, Day Off) and 4 unscheduled | 161 |
| **Customer visits analysed** | **508** (Apr 8 to Nov 25 2026, plus one turn-on booked for May 5 2027) |
| Marked done | 392 (77%). Blowouts 210 of 249; the rest are ahead of today or never ticked |

Town: the job's property city, then the zip through `SERVICE_ZIPS` in `src/lib/places/index.ts`, the same order `serviceability` uses. Visit kind: the visit's catalogue service (421 of 574 had one); a name-only visit in October or November counts as a blowout, otherwise "Name only". The 11 post-pull customer visits were read from the live visit list and `search_jobs` addresses by hand, all blowouts. Times are Mountain.

## 2. Tables

**Visits per town per season**

| Town | Spring Apr-Jun | Summer Jul-Aug | Fall Sep-Nov | Total | Share of six towns |
|---|---|---|---|---|---|
| Erie | 77 | 65 | 166 | 308 | 64% |
| Lafayette | 17 | 7 | 44 | 68 | 14% |
| Longmont | 11 | 11 | 24 | 46 | 10% |
| Broomfield | 4 | 8 | 27 | 39 | 8% |
| Louisville | 4 | 2 | 12 | 18 | 4% |
| Firestone | 3 | 0 | 2 | 5 | 1% |
| Outside the six (Boulder, Westminster, Frederick, Dacono) | 4 | 3 | 17 | 24 | |

**Visits per town per kind**

| Town | Blowout | Turn-on | Inspection | Repair | Install, other | Name only |
|---|---|---|---|---|---|---|
| Erie | 151 | 25 | 20 | 68 | 5 | 39 |
| Lafayette | 37 | 5 | 6 | 15 | 0 | 5 |
| Longmont | 14 | 3 | 3 | 16 | 0 | 10 |
| Broomfield | 25 | 2 | 1 | 7 | 1 | 3 |
| Louisville | 9 | 0 | 0 | 4 | 0 | 5 |
| Firestone | 2 | 0 | 0 | 1 | 0 | 2 |

**Visits per group per weekday (all kinds)**

| Group | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| North (Erie, Firestone), 313 | 64 | 53 | 63 | 38 | 69 | 25 | 1 |
| Longmont, 46 | 5 | 6 | 14 | 9 | 8 | 4 | 0 |
| South (Louisville, Lafayette, Broomfield), 125 | 22 | 27 | 17 | 23 | 28 | 8 | 0 |

Blowouts only: North 28, 30, 29, 23, 42; Longmont 3, 2, 7, 1, 1; South 13, **20**, 10, 14, 14. Longmont's top day is Wednesday in fall and spring (7 and 7). Saturdays are 39 visits (8%), 38 of them April to August; the grid is Monday to Friday and they stay outside it.

**Busiest weeks, fall blowouts** (week starting Monday)

| Group | Peak weeks | Total |
|---|---|---|
| North | Oct 19: **36**, Oct 26: 29, Oct 12: 25, Nov 2: 18 | 153 |
| South | Oct 26: 15, Oct 5: 12, Oct 12 and Nov 2: 11 | 71 |
| Longmont | Oct 12: 6, Nov 2: 3 | 14 |
| All towns | Oct 19: **54**, Oct 26: 48, Oct 12: 43, Nov 2: 32, Oct 5: 25 | 249 |

230 of 249 blowouts (92%) fell between Sep 28 and Nov 15; 177 (71%) in October; 64 (26%) from November 1; 14 after Nov 15. Busiest spring weeks (all kinds): Erie 10 (Jun 1), 9 (May 11), 9 (Jun 22); no other town had more than 4 in a week. Spring and summer weekdays: 23 of 65 in Apr-Jun had no visit, the most on any day was 4.

**Real daily capacity**, done visits per day, Oct 1 to Nov 12 (blowouts per person by `completedBy`; other kinds all people)

| Kind | Median | 90th percentile | Most in a day | Source |
|---|---|---|---|---|
| Blowout, Ryan | 4 | 6 | 7 | 31 days |
| Blowout, Scott (second person, Sep to Nov only) | 3 | 6 | 8 | 21 days |
| Blowouts, two people together (all stops that day) | 9 | not measured | 15 (Wed Oct 14) | 22 two-person days |
| Turn-on | 1 | 1 | 1 | 26 days; demand, not capacity, limited it |
| Inspection | 1 | 2 | 2 | 24 days |
| Repair | 1 | 2 | 3 | 66 days (120-minute blocks) |

One person tops out at 7 or 8 blowouts and is comfortable at 6, which agrees with the Nov 14 season doc (cap 8, offer to 6). Spring is far below capacity: the spring pass will fill empty mornings, so spring capacity comes from Settings, not from last year.

**Booking lead time**, first visit per job, days from created to scheduled

| Kind | n | Median | 75th | 90th | Longest | Booked 3+ weeks ahead |
|---|---|---|---|---|---|---|
| Blowout | 249 | 7 | 14 | 23 | 51 | 31 (12%) |
| Turn-on | 36 | 13.5 | 20 | 31 | 187 | 7 |
| Inspection | 33 | 9 | 14 | 17 | 20 | 0 |
| Repair | 109 | 8 | 14 | 20 | 42 | 10 |

For blowouts in the peak service weeks (Oct 5 to Oct 26) the 90th percentile lead was 27, 30, 26 and 19 days, longest 49. Jobber exposes `createdAt` on every visit, so this is measured, not inferred.

## 3. Geography

Town centres are public gazetteer coordinates I entered by hand; `city-data.ts` and the places library hold none. Minutes are straight-line miles at 35 mph, no routing engine, so real road times run longer (Erie to Longmont crosses a highway and a grid).

| From, minutes to | Erie | Firestone | Longmont | Louisville | Lafayette | Broomfield |
|---|---|---|---|---|---|---|
| Erie | 0 | 13 | 15 | 11 | 8 | 16 |
| Firestone | 13 | 0 | 16 | 24 | 20 | 26 |
| Longmont | 15 | 16 | 0 | 23 | 21 | 29 |
| Louisville | 11 | 24 | 23 | 0 | 4 | 8 |
| Lafayette | 8 | 20 | 21 | 4 | 0 | 9 |
| Broomfield | 16 | 26 | 29 | 8 | 9 | 0 |

Louisville, Lafayette and Broomfield sit within 4 to 9 minutes of each other. Firestone is nearest Erie (13). Longmont is nearest Erie and Firestone (15, 16) and far from the south (21 to 29). The three current groups are the sensible ones. Erie is close to Lafayette (8), so Erie overflow can go south without a long drive. In October, busy days already mixed towns: of 24 days with 5 or more stops, only 2 stayed in one group, 11 used two, 9 used three, 2 used four. Customers picked those days, not a route.

## 4. The four answers

**1. Which weekday per group.** North Monday and Friday; Longmont Wednesday; South Tuesday and Thursday.
- North is 65% of the six towns' visits, and Monday (64) and Friday (69) are Erie's two busiest days over the year. Fall blowouts there were 28 on Monday and 42 on Friday.
- Longmont is 10%, with 14 blowouts in seven weeks and a top week of 6. It earns one day; Wednesday is its busiest (14 of 46; 7 of 14 blowouts).
- South is 26%. Tuesday is its top fall day (20 of 71) and Thursday is Broomfield's top day (12). Its peak week was 15, which one day cannot hold (6 to 7 a person), so two days.
- A busy town needing two days in season: yes for North and South, no for Longmont. At one person and 6 a day, Erie's peak week of 36 needs 5 or 6 days; with a second person (as in Sep to Nov 2026) 2 to 3. Two days cover 28 of the peak 36 with two people. The rest waits a week or goes to a Wednesday with room, which fits the look-ahead below and the 7-day median lead customers already accept. If Ryan is alone next fall, the grid is right but Erie fills sooner.
- Wednesday is the pressure valve: Longmont averages 2 a week in fall, so most of that day is free for overflow from either side (Erie is 15 minutes from Longmont).

**2. Broomfield rides with Louisville and Lafayette.** It is 8 and 9 minutes from them and 16 from Erie, 29 from Longmont. It had 39 visits all season (8%) and a peak week of 6 blowouts, about one a day, so a day of its own would run nearly empty. Keep the current "Louisville, Lafayette and Broomfield" group.

**3. May Jev offer to move a customer-picked day? No for the first season.** The data shows no empty days caused by picked days. 139 of 228 fall visits (61%) were customer-picked online (`clientConfirmed`, a "Service details" form), and Jobber let them pick any day. Of 31 weekdays from Oct 1 to Nov 12, 27 had 4 or more stops and 20 had 6 or more. The 4 thin days were Oct 1 and Oct 6 (the season starting) and Nov 10 and 11 (the tail, with Scott away). The app will offer only route days, so picked days will cluster more, not less. Leave the tickbox in the design but off by default and unticked, and revisit after one season of real route-day picks.

**4. Look ahead 4 weeks when a town's days are full.** Four weeks (28 days) covers the 90th percentile lead for blowouts (23 days, 27 to 30 in the peak weeks), repairs (20) and inspections (17), and is near turn-ons (31, from 36 visits). It also matches the length of the windows: a look-ahead past the window's end is refused anyway ("We'll call you"). Customers already waited a median 7 days and one in eight waited 3 weeks or more, so offering days up to 4 weeks out is within what they accepted this year.

## 5. Values to enter

| Setting | Value | Why |
|---|---|---|
| Routes grid, Monday | Erie, Firestone | North, day one |
| Routes grid, Tuesday | Louisville, Lafayette, Broomfield | South, day one |
| Routes grid, Wednesday | Longmont | Longmont's busiest day; overflow day |
| Routes grid, Thursday | Louisville, Lafayette, Broomfield | South, second day |
| Routes grid, Friday | Erie, Firestone | North, second day |
| No day yet | (empty) | every town has a day |
| Look ahead when full | 4 weeks | 90th percentile lead 23 to 31 days |
| Jev may move a picked day | Off (unticked) | picked days left no empty days |
| Order, fall / spring | unchanged: fall Firestone, Erie, Longmont, Broomfield, Louisville, Lafayette; spring reverse | not tested; no data either way |
| Season: Spring turn-on | opens Apr 15, closes Jun 15 | 23 of 31 turn-ons fell in it; the old Apr 25 to May 31 would catch 13 |
| Season: July inspection | opens Jul 1, closes Jul 31 | unchanged; it is the July add-on. Jobber's 33 inspections ran Apr to Oct |
| Season: Fall blowout | opens Sep 28, closes Nov 15 | 230 of 249 (92%); the old Oct 1 to 31 would turn away 26% (the first hard freeze median is Oct 20, no hard freeze yet in 2026 through Nov 1) |
| Seasons, remind me to plan it | 4 weeks, unchanged | today's value; no data to move it |
| Buffer, early / late | 20% / 12%, unchanged | today's values |

Caveats: one season of Jobber data, from an account opened in March 2026; turn-ons are 36 visits; spring was repair work with a handful of turn-ons; 72 spring and summer visits have no catalogue service and are counted as "Name only"; the coordinates are typed in by hand; drive times are straight line.

## For Hannah, in a minute

Ryan is in Erie and Firestone on Monday and Friday, in Louisville, Lafayette and Broomfield on Tuesday and Thursday, and in Longmont on Wednesday. Erie is two thirds of the work and the fall rush is huge (54 blowouts in the peak week, 15 in one day with two people), so Erie and the south each get two days and Longmont gets one. Broomfield rides with Louisville and Lafayette because it is only 8 or 9 minutes from them and too small for a day of its own. Jev does not move a day a customer picked; the data shows customers' own picks filled the days anyway. When a town's days are full the app looks four weeks ahead, because nine in ten customers booked within three to four weeks this year. Spring turn-ons run April 15 to June 15 and fall blowouts September 28 to November 15, which is when the work happened.
