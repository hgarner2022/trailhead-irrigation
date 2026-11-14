# What the 2026 season actually looked like, from Jobber

Written 2026-11-14, 3:30am, from a read-only pull of every Jobber visit
with a start in 2026: 571 visits, 552 usable after dropping blocks like
"Day off", test rows and zero-length entries. Nothing in Jobber was
touched. Towns were not pulled (it needs a property call per visit); the
title-based classification treats a name-only visit in October or
November as a blowout, which is what the fall calendar is. Jobber's visit
lengths are scheduling blocks (30, 60, 90, 120 minutes), not timed work,
so they say how Ryan planned, not how long a stop took; completion stamps
land within 30 minutes of the planned end for 61 percent of visits, so the
blocks are not far off.

## The numbers that set Settings

| Setting | Ryan said | Jobber shows | Use |
|---|---|---|---|
| Blowout length | 45 min | Planned at 30 min for 181 of 290; 45 for 34 | 45 min of work, and the route allows the 30 min gap he actually kept between fall stops |
| Turn-on length | 60 min | 60 to 120 min blocks, only 9 turn-ons in Jobber | 60 min |
| Inspection length | 60 min | 90 to 150 min blocks, 15 visits | 60 min to start; watch the first season |
| Repair | not asked | 120 min block typical (47 of 98) | 120 min default for a New job of kind repair |
| Install | not asked | 90 to 120 min blocks, 15 visits | 120 min default |
| Working day, fall | 8 to 5 | First stop median 10:00, last end 17:30; busiest days 9:00 to 18:00 | Offer 8 to 5; Ryan's own start is his |
| Working day, spring and summer | 8 to 5 | First stop median 12:30 to 13:00, last end 17:00; 2 stops a day | Spring days are half days today; capacity must come from Settings, not from this |
| Stops per truck-day, fall | | Median 3, upper quartile 5, max 8 (several 7 to 8 stop days in October) | Cap at 8 blowouts per truck-day; the offers fill to 6 and keep 2 as slack |
| Stops per truck-day, spring | | Median 2, max 4 | Cap at 5 turn-ons; real demand will set it |
| Gap between fall stops | | Median 30 min | 30 min drive allowance in the fall, 15 elsewhere is a guess |
| Weekdays, fall | | Mon 62, Tue 68, Wed 71, Thu 63, Fri 80, Sat 2, Sun 1 | Monday to Friday; no Saturdays in October, Ryan's answer notwithstanding |
| Weekdays, spring | | Mon 10, Tue 0, Wed 15, Thu 4, Fri 14, Sat 14, Sun 0 | Spring worked Saturdays and not Tuesdays; Ryan sets route days |
| Second truck | Apr 1 to Nov 15 | A second assignee appears in September (2), October (79) and November (32); none before | The second truck is a fall truck in the data; Settings should carry its season |
| Lead time, blowouts | | Booked a median 8 days ahead | Customers today book inside two weeks; the pass moves this to months |
| Lead time, turn-ons | | 14 days | |
| Turn-ons sold | | 9 all spring, against 290 blowouts | The spring side of the pass is new business, not a transfer from Jobber |

## What this changes in the design

1. The fall is the business: 290 blowouts in seven weeks, two trucks, 5
   to 8 stops a day at 30 minute spacing, Monday to Friday. Capacity and
   slack matter in October and almost nowhere else. The pull-earlier rule
   and the unsold slack are fall rules.
2. The spring in Jobber is repairs with a handful of turn-ons; days start
   after noon. The pass will fill mornings that are empty today, so spring
   capacity is a Settings number Ryan chooses, not a fact from last year.
3. Fall days hold 6 to 8 blowouts at 30 minutes each plus 30 minutes
   between. With 45 minutes of work and the same gap, 8 stops is 10 hours;
   the honest cap is 6 to 7 per truck-day, and the offers should fill to 6.
4. Saturdays: the fall did not use them; the spring did. Route days per
   town per window, set by Ryan, decide this, with Saturday off by default
   in the fall and available as a pull target.
5. The second person worked September to November only. Settings carry a
   season per truck; the offers only use a truck inside its season.
6. Blowouts were booked about a week out. The pass customer books months
   out, so the two-week confirmation is the first contact that resembles
   what customers are used to; it must carry the day and window clearly.

## Caveats

- No towns: the "one town per day" check was not possible without a
  property call per visit. A sample of 30 fall days is worth doing once.
- Lengths are blocks. Timed durations do not exist in Jobber for this
  account.
- "Other" in spring and summer (122 visits at 60 to 120 minutes) is
  name-only titles: some are turn-ons or inspections, most are repairs.
- Two assignees on one visit are recorded as the first.
