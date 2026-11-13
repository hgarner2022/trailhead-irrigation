# Scheduling, decided against the evidence

Second version, 2026-11-14 early, after the research in
`2026-11-14-scheduling-research.md`. The first version (13 Nov, late) was
written before the research; this one replaces it. Every decision below
names the problem it solves and what the evidence or the trade-off says.
Nothing on scheduling is built until Hannah agrees this is the model, and
the ten questions at the end go to Ryan before the route days are set.

## What the research settled

- Route businesses assign the day and give the time late. The irrigation
  firms closest to us send a tentative date and a window two to three weeks
  out (Hydroscapes), or the date with an approximate time (Everist), or
  staff assign and remind a day or two ahead (Senske). None gives an hour
  months ahead. [research 1, 2]
- Contact beats window size. Being contacted before arrival moved
  satisfaction more than narrowing a window from four hours to one. A
  one-hour window still scores well above a four-hour one, so hours matter
  where someone is waiting. [research 7, 8]
- Density comes from route days per zone, not from an optimizer. With two
  trucks and one town per day, nearest-neighbour plus a swap pass is the
  whole computation; the hard part is the rules. [research 9, 10]
- Choice works at the level of the day. Amazon Day lets you pick a weekday
  and change it anytime; grocery slots show only days with room. [11, 12]
- Nobody has done what we want: a day chosen at purchase, months ahead,
  with the window issued from a route built two weeks out. We would be
  first, and the risks of that are listed at the end.

## The decisions, by the question a customer or Ryan asks

**1. What day are you coming?** You pick it at purchase: three open days on
your town's route days inside the visit's window, earliest, middle, late,
the first preselected. It is called "your day", not an appointment, and the
confirmation says in one line what can move it (weather in the fall, a
conflict on Ryan's side) and that you will be told first and can pick
again. Why: a paid customer with no day was tonight's complaint; only route
days are offered, so density holds.

**2. What time?** Depends on whether anyone needs to be there.
- You said you need not be home (the default): you get the day. Two weeks
  before, a text confirms the day; the day before, a reminder. No hour is
  promised, because nobody is waiting for it and a promised hour Ryan
  misses is a broken promise nobody needed.
- You said you need to be home: you chose morning or afternoon at
  purchase. Two weeks before, when the route is built, you get a two-hour
  window inside your half, and the calendar entry updates to it. The day
  before, the reminder repeats it. Never 8 to 10 as a default; the window
  comes from your place in the route.
- Ryan's own "on my way" text from his phone stays his, not the app's.

**3. What if I'm not home in the morning?** The purchase asks one question:
"Does someone need to be home?" No is the default, with the access note
(gate code, dog, where the controller is). Yes asks "morning or afternoon",
and that choice is honoured when the route is built. Most visits are
unattended (TruGreen, LawnStarter and the blowout FAQs all say so), so most
customers answer No and never think about hours.

**4. Can I change it?** Yes, yourself, from the pass page or the link in
any text, to another open route day, free, up to 48 hours before. Two moves
per visit, then it becomes a call. Why: moving into an already-offered day
costs Ryan nothing, and an approval step only makes admin.

**5. What if it freezes early?** The fall day is yours, and the terms say in
plain words that a fall day may be moved up to 14 days earlier with at
least 48 hours' notice, free, and you may then pick another open day. Ryan
pulls a whole truck-day earlier on the Schedule; every stop on it gets one
text with a "pick another day" link. The last two weeks of the fall window
are never sold at checkout: they are Ryan's slack for exactly this.

**6. What if Ryan blocks that day in Jobber after I bought?** The daily
read of his calendar flags the conflict on Home, one row, one action: move
the stops, or clear the block. Nothing moves silently. Ryan is asked to
block personal days in Jobber as soon as he knows them, because offered
days shrink the same day he does.

**7. What if my street's day is full?** It is not offered. If no day in the
window has room, the checkout says so before the card step and takes your
email for the waiting list; Ryan sees the list on Home and decides whether
to open a Saturday or send the second truck. Nothing is sold that cannot be
placed.

**8. What if I buy in July?** Only the visits still ahead are sold, priced
for those visits; the days step offers days only in the windows that
remain. From November 16 the checkout sells next season. (Already built.)

**9. Does it renew?** Yes, if you say so. At purchase, a box next to the
terms, unticked, reads: "Renew my Season Pass each season on this card. We
email you 30 days before with your days and the price, and you can cancel
in one click." Colorado and California both require the consent to be the
customer's own act, so the box starts unticked and sits where it cannot be
missed; the benefit line beside it ("keep your route day next year") is what
earns the tick. In mid December the renewal email names the days chosen
for you (the earliest open route day per visit), the price, Change and
Cancel; the pass is created in mid January on the card on file; nothing is
charged until each visit is done, as always. A card that expired gets the
update link first. A lawyer reads the wording before the first renewal.

**10. How does Ryan keep a truck-day in one town?** Route days per town per
window, set once a season in Settings, and only those days are ever
offered. Later, a thin-day rule: a day with fewer than N stops two weeks
out is folded into the next route day, with one text per stop.

**11. When does the route get built?** Fourteen days before each truck-day,
the daily run orders the stops (fixed stops first, then nearest-neighbour
and a swap pass, morning and afternoon preferences honoured), assigns the
two-hour windows, sends the confirmation texts, and shows the day on the
Schedule as ordered. Ryan can drag any stop before or after. The day-before
run sends the reminders.

**12. What does the admin do, and when?** Four things. Once a season: route
days, working days, capacity, the calendar feed link. Weekly from
September: look at the freeze forecast and decide whether to pull a day.
Fourteen days before a truck-day: glance at the order, fix a stop by hand
if needed. Daily: clear the Home rows. Everything else is automatic.

## What the live run showed is broken today, and must be fixed first

- The offers ignored the settings: Saturdays and April 26 were offered
  against Monday-to-Friday working days and a May 1 opening. Every offer
  rule gets its own test before anything else is built on it.
- The offers do not see Ryan's real calendar because no feed link has been
  pasted into Settings. Until it is, the app offers days from a template of
  his week.
- The default settings are a guess from the Jobber data. Ryan's answers
  below replace them.

## Build order, one PR each, the live checklist after each

1. Fix the offers: all six sources honoured (window, route days, working
   days, capacity, Ryan's calendar, placed visits), the last two fall weeks
   held back, one test per rule. Add "Does someone need to be home?" with
   morning/afternoon, replacing the access-only question.
2. The route build fourteen days out: order, windows for attended stops,
   the confirmation text (day for everyone, window for attended), the
   calendar update. The day-before reminder already exists.
3. Move it: the pass page and the texts' link, 48 hours, two moves.
4. The fall pull: drag a truck-day earlier, one text per stop, the terms
   line at purchase.
5. The conflict row and the waiting list on Home; the "window is full"
   stop before the card.
6. Auto-renew: the box, the December email, the January pass, the lawyer's
   read.
7. Settings: route days per town per window, working days per truck,
   capacity, the feed link, "not confirmed" until saved.
8. The thin-day fold.

## Risks of being first, and what covers each

| Risk | Cover |
|---|---|
| A "firm" day moved by weather or a conflict | The terms line at purchase, a free move, one text, never silent |
| Slack sold out before a freeze | The last two fall weeks never sold; capacity capped below real |
| Days spread thin across a town | Only route days offered; the thin-day fold |
| October conflict rows swamp Ryan | One count on Home, one action each |
| A renewal that picks days looks like a changed deal | The email lists the days with Change and Cancel |
| No evidence chosen days are kept better than assigned ones | Measure moves and no-shows in the first season |

## Questions for Ryan before the route days are set

1. Which weekday, per town, in April to May, in July, and in October?
2. How many stops fit a truck-day for a turn-on, an inspection, a blowout?
3. Saturdays in October? The second truck on a freeze week?
4. Roughly what share of customers need to be home, and which kinds?
5. How many days' notice is realistic when you pull fall days earlier?
6. How much of late October do you want held back as slack?
7. Will you block personal days in Jobber ahead, or find out the same week?
8. Customers move themselves, or request a move?
9. Lose density, or lose a customer who needs an exact hour?
10. What do you do today when nobody answers at a stop?
