# Scheduling, thought through once

Written 2026-11-13, late, after four changes to the rule in one evening and
Hannah's "It's a complex scheduling problem. You need to think about this a
lot more deeply." This document states the whole problem, the forces that
pull against each other, the model that resolves them, and every case a
customer or Ryan can hit. Nothing more is built on scheduling until this is
agreed.

## The problem in one paragraph

A customer pays in November for two or three visits in May, July and
October. They want to know, today, when Ryan is coming, in a form they can
put on a calendar. Ryan wants each truck-day to stay in one town so he does
twelve stops instead of six, wants to run blowouts before the first hard
freeze whatever the calendar said in November, and has a Jobber calendar of
repairs, installs and personal days that the pass calendar must fit around.
The app has to give the customer certainty and give Ryan room, and never
promise what it cannot keep.

## The forces

| Force | Pulls toward |
|---|---|
| Customer certainty | A day and a time at purchase |
| Route density | Same town, same day; the order decided late |
| Weather (fall) | Moving a whole day earlier on a week's notice |
| Ryan's other work | Days blocked after the pass was sold |
| Customers who must be home | A narrow window they can plan around |
| Honesty | Promising only what the app controls |

A fixed two-hour slot chosen in November for May satisfies the first force
and fights the next four. A bare window ("sometime in May") satisfies the
last five and fails the first, which is what the first live purchase showed.

## The model: the day is yours now, the window comes with the route

**At purchase the customer picks a day.** Three offered days per visit, on
their town's route days inside the window, under capacity, with Ryan's
calendar subtracted; earliest, middle, late; the first preselected. They
also say when in the day suits them: **morning, afternoon or either**,
default either. The day is committed: it is on their calendar, in the
email, on the pass page.

**Two weeks before the day, the app builds the route** for that truck-day:
stops ordered by distance, morning and afternoon preferences honoured, each
stop given a two-hour arrival window from its place in the route. The
customer gets the text: "Tuesday, May 5, 10 am to 12 pm." The calendar
entry updates to the window. This is the promise the copy already makes
("we confirm it by text two weeks before").

**The day before, the reminder** with the same window.

**A customer who must be home** picks morning or afternoon at purchase and
gets a window inside it. If they need a tighter commitment than two hours
or a specific hour, they call, and Ryan fixes the stop by hand on the
Schedule, which the route is then built around.

**Moves.** A customer moves their own day from the pass page, any time up
to 48 hours before, to another offered day (same rules). Ryan moves days on
the Schedule; every move sends the new day, and a new window if the route
was already built. A weather move in the fall is Ryan dragging a whole
truck-day earlier; every stop on it gets one text.

Why this and not fixed slots at purchase: slots chosen months ahead by
twenty customers in one town make a route that zigzags across Erie at the
times they chose, and a frost forecast cannot shift it. Why this and not
"we'll tell you in April": a paid customer with no day is the complaint we
had tonight. The day is the thing the customer actually plans around; the
hour within it is the thing Ryan has to control.

## Where the days come from

1. **Windows:** turn-on April 15 to May 31, inspection July 1 to 31,
   blowout October 1 to November 15. One place in code, used by the
   checkout, the offers, the scheduler and the copy.
2. **Route days:** each town has route days per window, from Settings
   (today's defaults are a guess from the Jobber data; Ryan sets them).
   Erie might be Monday and Thursday in spring, every weekday in October.
3. **Working days:** per truck, from Settings. Saturdays only if Ryan says
   so, and he may say so for October only.
4. **Capacity:** per truck-day per visit kind, minus a buffer, from
   Settings.
5. **Ryan's calendar:** the Jobber calendar feed, pasted once into Settings
   per truck, read daily. A blocked morning removes that morning's
   capacity; a blocked day removes the day.
6. **Visits already placed:** counted against capacity.

An offered day must pass all six. Tonight's live run offered Saturdays and
April 26 against Monday to Friday and a May 1 opening, so the current
`offerDays` does not; that is a bug to fix in the rebuild, with a test per
rule.

## Every case

| Case | What happens |
|---|---|
| Buys in November for next year | Picks a day for each of the visits still ahead (all of them). Windows come two weeks before each. |
| Buys in July | The turn-on has passed and is not sold; picks a day for the inspection (while July is open) and the blowout. Price is those visits. |
| Buys after November 15 | The checkout sells next season. |
| Buys a day that fills before activation | Takes the next open day; the confirmation says so in one line. |
| Must be home | Picks morning or afternoon; gets a window inside it. Can call for an exact hour, which Ryan fixes. |
| Wants to change the day | Pass page, "Move it", up to 48 hours before, same offered-day rules. |
| Ryan moves a day (weather, a job ran long) | Drag on the Schedule; each customer on it gets the new day, and the new window if built. |
| Ryan blocks a day in Jobber after it was sold | The daily read flags the conflict on Home; Ryan moves the stops or clears the block. Nothing is silently dropped. |
| A town's route day is full | Not offered. The fall needs more days than the spring; Settings decide whether that is Saturdays or the second truck. |
| Nothing fits in the window | The checkout says the window is full before the card step and offers the waiting list by email (call us). Never sells a visit it cannot place. |
| Cancels | Visits freed, capacity returns, Jobber told by the routine. |
| Renewal (auto, Hannah's decision) | A ticked box at purchase: "Renew my pass each season. We email you 30 days before with your days and the price. Cancel in one click." In January the app makes next season's pass on the card on file, picks the earliest open day per visit, emails Change and Cancel. Consent, the 30-day notice and the one-click cancel are what the auto-renewal laws require; a card that expired gets the update link first. |

## What Ryan sees

The Schedule shows each truck-day with its stops, unordered until two weeks
out, ordered after. A truck-day over capacity, a Jobber conflict, a customer
waiting for a day that filled: each is a row on Home with one action. The
Schedule button places only what has no day (admin-created passes, moves).
Settings hold route days, working days, capacity and the calendar feed, and
say "not confirmed" until Ryan saves them once.

## What changes in the build, in order

1. Fix `offerDays` to honour all six sources, one test per rule, and add
   the morning/afternoon/either choice to the days step and the pass.
2. Build the route two weeks out: a daily step that orders each truck-day
   fourteen days ahead, assigns the two-hour windows, and sends the
   confirmation text and calendar update. (The two-week text exists; it
   gains the window.)
3. Honour preferences and hand-fixed stops in `orderDay`.
4. "Move it" on the pass page with the 48-hour rule.
5. The Jobber-conflict row on Home.
6. The "window is full" refusal in the checkout, before the card.
7. Auto-renew as described, replacing "Reserve next season" as the default.
8. Settings: route days per town per window, working days per truck, the
   calendar feed field, all marked unconfirmed until saved.

Each is a PR with the live checklist run after it. None of them starts
until Hannah says the model above is the one.
