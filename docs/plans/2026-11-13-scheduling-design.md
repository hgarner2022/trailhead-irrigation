# Scheduling, decided against the evidence

> **Vocabulary (Hannah, 14 Nov, 4:10am: "I thought we were calling jobs
> visits").** A **visit** is the stop: the `visit` row with its day, time,
> truck, minutes, state, notes and charge. A **job** is the sold work it
> belongs to: a Season Pass (two or three visits) or a booking (one visit),
> with its price, status, customer and card. Move, Done, Not done and Edit
> act on a visit; Cancel the whole thing and the money live on the job. The
> office lists visits; the nav item is Visits, not Jobs. Where this document
> says "job" for a stop, read "visit".


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
your town's route days inside the visit's window, the first preselected.
The preselected one is the earliest route day with room, so Ryan's days
fill one after another; the other two are there for the few who care
(most people cannot know their May in November, so the default is the
product and the choice is the escape hatch). It is called "your day", not an appointment, and the
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

**3. What if I'm not home in the morning?** (Asked at the one moment the
customer cannot know; so the pass page lets them change the answer, and
morning or afternoon, in one tap right up to the route build.) The purchase asks one question:
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
text with a "pick another day" link. Slack lives where the weather hits,
not at the end of the window: every truck-day is capped below its real
capacity, Saturdays in October are kept unsold as pull targets, and days
are sold earliest-first so late October stays thin until it is needed.
(The first draft held back the last two weeks; that is backwards, since
those are the days that get pulled, not the room they get pulled into.)

**6. What if Ryan blocks that day in Jobber after I bought?** The daily
read of his calendar flags the conflict on Home, one row, one action: move
the stops, or clear the block. Nothing moves silently. Ryan is asked to
block personal days in Jobber as soon as he knows them, because offered
days shrink the same day he does.

**7. What if my street's day is full?** It is not offered; the checkout
offers the next days with room. No "window is full" stop and no waiting
list (Hannah, 14 Nov: "Don't worry about it. Window is full right now."):
if a whole window ever fills, Ryan adds capacity in Settings, a Saturday or
the second truck.

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

**12a. How does Ryan run a day?** The scheduling exists for this and the
first draft left it out. The crew day view, on his phone: today's stops in
route order, each with the address, the access note, the zones, the
customer's window if any, a map, and a Done tap that marks the visit
complete, charges the card and sends the receipt. Until it exists, the
Schedule's day column must at least read well on a phone. It is the next
phase after scheduling, not a later one.

**12b. Jobber is on its way out (Hannah, 14 Nov: "we're going to try to
move away from Jobber, so don't worry too much about it").** So: pass
visits live in the app only; the routine that posted them into Jobber as
requests is dropped; the calendar feed stays as a nightly read of Ryan's
non-pass work while that work is still in Jobber, and goes when it is not;
no Jobber words, links or buttons in the admin. The crew day view (12a) is
therefore not a later phase but the thing Ryan runs his day from, and it
moves to right after the data step.

**12c. Ryan creates jobs himself (Hannah, 14 Nov: "we probably need
something in our admin that allows them to create visits, with what they
are, what the time is, all that").** A "New job" action on the Schedule and
on a customer: pick or add the customer and property (name, street, town,
email, phone, access note), the kind (turn-on, inspection, blowout, repair,
install, other), the day, a start time or "any time that day", the length
in minutes (defaulting from the kind's setting), the truck, the price or
"quote later", and notes. It creates the same job row the checkout
creates, with the same states, so it shows on the Schedule, the day view
and Home like any other, and is charged or invoiced the same way. This is
the first piece of the Jobber replacement for non-pass work and comes
right after the data step, before the route build, because Ryan needs it
to put his existing spring work on the calendar.

**12d. The admin's jobs to be done (Hannah, 14 Nov, on the live Passes
panel: "I feel frustrated from an administration perspective. We probably
need to reschedule things, go look at the job to be done").** From Ryan's
and Hannah's chair: see what is coming (today, this week, by truck, stops
in order); move a job to another day or time from wherever it is shown,
with the customer told; mark a job done or not done and have the charge or
the follow-up happen; add a job taken by phone; change a job's length,
truck, notes or access note; reach the customer from the job (call, text,
resend); see the money; cancel a job or a pass. Today only the Schedule
drag, the Home not-closed row, the pass panel's cancel and card link, and
Revenue exist, and none of the job actions is on the job itself. So:
**the Jobs page and the job panel**: the nav becomes Home, Schedule, Jobs,
Customers, Revenue, Settings; Jobs lists every job with the seven states
and filters (kind, truck, pass or not); the job panel carries Move, Done or
Not done, Edit, Contact, Cancel; New job sits on Jobs and on a customer;
the pass is opened from a job or a customer and keeps its own panel.

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

## What the data and the admin must carry (Hannah, 14 Nov: "make sure all those data points carry into the new data tables and the admin")

Every decision above is a fact the pass or the visit holds, and every fact
has one home. The live admin tonight still showed "Mid May" in the Passes
table while the panel's Charges knew "Apr 26": two sources of truth on one
screen. The rule from here: **the visit row is the only source**, the
screens read it, nothing is derived twice.

| Fact | Where it lives | Set by | Shown in |
|---|---|---|---|
| Chosen day | `visit.scheduled_on`, `visit.truck_id` | the checkout, a move, Ryan | Passes table (Turn-on, Blowout columns become dates), pass panel, Schedule, pass page, every message |
| Someone must be home, morning or afternoon | `pass.needs_customer_home`, `visit.time_preference` (new) | the checkout, the pass page | pass panel "Access" line, Schedule stop card, the route build |
| Access note | `pass.access_note` | the checkout | pass panel, the crew's stop |
| Arrival window | `visit.start_time`, `visit.window_minutes` (new) | the route build 14 days out, Ryan by hand | pass panel, Schedule, pass page, the two-week and day-before texts |
| Route built | `visit.stop_order`, `schedule_run` | the daily run | Schedule (ordered vs not yet) |
| Moves | `pass_change` kind `moved` with from/to and who | customer, Ryan, weather pull | pass panel history, Home count |
| Weather pull | `schedule_run` kind `pull` with the day and count | Ryan on the Schedule | Home, the texts |
| Jobber conflict | `admin_alert` kind `conflict` with the block and the stops | the daily feed read | Home row with Move or Clear |
| Renewal consent | `consent` row kind `renewal` with the wording version | the checkout box | pass panel "Renews" line, the December email |
| Renewal made | `pass.renewed_from` (new) | the January run | pass panel, Passes table filter |
| Status | `pass.status`: pending, active, cancelled, done | checkout, activation, cancel, season end | Passes table: pending is never shown as Active; pending older than an hour is expired by the cron |

**Visits are jobs (Hannah, 14 Nov: "think about Season Pass as jobs with
a status and all that; we can start with the Season Pass, but that is the
direction").** The `visit` row is the job. Two pills, never mixed (Hannah, 14 Nov: "their job status is really
weird, late, active"; "it needs to be very obvious that money was
collected, do we need to invoice them"): WORK: Needs a day, Scheduled,
Done, Not done (with its reason), Cancelled; a Scheduled visit whose day
has passed carries a small "day passed" note, not a state; whether the
window is set is a detail in the Time column. MONEY: Not yet (nothing is
owed before Done), Paid with how (card, check, Venmo, cash), Bill sent,
Failed. The job shows the same money summary across its visits ("1 of 2
paid"). Home lists every visit that is Done and not Paid, with the Paid-by
choice as its button.
A one-off booking creates a job row of its own kind rather than living in
its own table with its own lifecycle. Nothing pass-specific goes on the job
itself, so repairs, installs and the rest join the same list later; job
number, notes, photos, parts line items, quotes and invoices are added in
that order with the day view and field payments.

Admin changes that follow:

- Passes table: Turn-on and Blowout show the day ("Apr 26") and, once
  built, the window; a Pending status filter; "Renews" as a column.
- Pass panel: Access (needs home, morning or afternoon, the note), the
  days with their windows and a Move button each, the history of moves,
  "Renews next season: yes/no", Jobber link only when linked.
- Schedule: stops carry the preference and the window; a day shows
  "ordered" or "not yet"; the pull action; the conflict row.
- Home: counts for conflicts, moves this week, days not yet ordered
  inside 14 days.
- Settings: route days per town per window, working days, capacity, feed
  link, slack weeks, all "not confirmed" until saved.

The API carries the same fields on `visits` and `passes` so the pass page,
the admin and the routine never disagree.

## Build order, one PR each, the live checklist after each

0. The data: jobs as the one vocabulary (the seven states, the booking
   creating a job row), the new columns above (`time_preference`, `start_time`,
   `window_minutes`, `renewed_from`), the Pending
   status shown as pending, the Passes table and panel reading the visit
   row and nothing else, no Jobber words or buttons anywhere in the admin.
0a. The Jobs page and the job panel (12d): the nav rename, the list with
    the seven states and filters, Move / Done or Not done / Edit / Contact /
    Cancel on the job, the pass opened from a job or a customer.
0b. New job from the admin (12c): customer, property, kind, day, time or
    any time, minutes, truck, price, notes; the same job row as the
    checkout's.
1. Fix the offers: all six sources honoured (window, route days, working
   days, capacity, Ryan's calendar, placed visits), the last two fall weeks
   held back, one test per rule. Add "Does someone need to be home?" with
   morning/afternoon, replacing the access-only question.
1b. The crew day view on Ryan's phone: today's stops in route order with
   address, access note, zones, window, map, and Done (charge + receipt).
2. The route build fourteen days out: order, windows for attended stops,
   the confirmation text (day for everyone, window for attended), the
   calendar update. The day-before reminder already exists.
3. Move it: the pass page and the texts' link, 48 hours, two moves.
4. The fall pull: drag a truck-day earlier, one text per stop, the terms
   line at purchase.
5. The conflict row on Home.
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

## The alternative weighed and set aside

"Pick your week, we name the day two weeks out." Simpler for Ryan, never
breaks a promise, calendar entry as an all-day week. It gives the customer
less than a day, and nothing in the evidence says it is better. If Ryan's
answers below say his weeks are too unpredictable to promise a day, this
is the fallback, and it is a one-line change in the same model: offer
weeks instead of days.

## Answered so far (Hannah for Ryan, 14 Nov, 2am)

- The working day is 8:00 to 5:00. The slot grid starts at 8:00, not 7:00.
- A turn-on takes about 60 minutes, an inspection 60, a blowout 45.
- Capacity is derived, not guessed: a truck-day is 540 minutes; minus the
  buffer (25 percent to start) and about 15 minutes of driving per stop,
  that is roughly 5 turn-ons or 6 to 7 blowouts per truck-day. The old
  defaults (8 turn-ons, 14 blowouts) are wrong: 14 blowouts is 630 minutes
  before any driving. Settings take the day's hours, each job's minutes,
  the drive allowance and the buffer, and compute the number; Ryan may
  override it. Check the Jobber snapshot's visit lengths before setting
  the minutes in step 1.

## Questions for Ryan before the route days are set

1. Which weekday, per town, in April to May, in July, and in October?
2. (Answered: turn-on 60, inspection 60, blowout 45; the count per day is computed.)
3. Saturdays in October? The second truck on a freeze week?
4. Roughly what share of customers need to be home, and which kinds?
5. How many days' notice is realistic when you pull fall days earlier?
6. How much of late October do you want held back as slack?
7. Will you block personal days in Jobber ahead, or find out the same week?
8. Customers move themselves, or request a move?
9. Lose density, or lose a customer who needs an exact hour?
10. What do you do today when nobody answers at a stop?
