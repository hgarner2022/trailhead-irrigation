# Scheduling: the simple flow

Written 2026-11-12 late, after Hannah: "I don't know what proposed means",
"think simple", and "account for booking months in advance and mid-season".
This replaces the suggest-then-approve flow in the earlier plans. It is the
whole of how a pass visit gets a day.

## What the research says

- ServiceTitan memberships and Housecall Pro service plans both do the same
  thing: a plan creates its visits as **a list of visits due**, in date
  order, overdue on top, and the office books from that list. Neither has a
  "proposed" state. ([ServiceTitan recurring services](https://help.servicetitan.com/docs/manage-recurring-services),
  [Housecall Pro service plan visits](https://help.housecallpro.com/en/articles/3075085-schedule-service-plan-visits))
- Automation guidance for field service: automate the routine, send
  exceptions to a person, and keep a way for the customer to reach a human.
  ([Fieldcode](https://fieldcode.com/en/resources/blog/balancing-automation-human-touch-in-field-service),
  [FieldCamp](https://docs.fieldcamp.ai/en/articles/14431351-accepting-or-rejecting-ai-dispatch-suggestions))
- Nobody found addressed a plan bought mid-season; that part is ours.

## The jobs

- Ryan: "Which visits need a day, and can the app just put them on my
  calendar?"
- Hannah: "Is everyone who paid going to get their visits?"
- The customer: "When are you coming?"

## The flow, one state

1. **A pass creates its visits as "to schedule".** Each visit has a window
   (turn-on May 1 to 31, inspection July 1 to 31, blowout October 1 to
   November 15) and the customer's preference inside it. They sit in the
   "To schedule" list on the Schedule, earliest first, overdue on top.
2. **One button, Schedule, puts them on the calendar.** It takes every
   visit in the list whose window opens within the lead time (four weeks)
   and places each on a truck-day: the truck's area for that town, the
   customer's preference inside the window, the days the truck works,
   under the truck's capacity. Placed means scheduled: the visit goes to
   Jobber and the customer gets the date by email and text. Ryan presses
   it, or Home's prompt presses it for him, once a week in season.
3. **Ryan moves what he wants.** Drag on the week, or Place one visit from
   the list by hand. A move sends "your date moved". A move he makes in
   Jobber is read back and marked.
4. **The crew marks it done** (Jobber today, the day view later), the card
   is charged, the receipt goes out.

Nothing is hatched, nothing waits for approval, there is no planned
versus firm. Weather is handled by *when* Schedule runs, not by a second
state: in October the lead time is two weeks, so the button only commits
the fortnight the forecast can see, and Ryan runs it each Monday.

## The timing cases

| Bought | What the customer buys | What happens |
|---|---|---|
| November to April (months ahead) | Turn-on and blowout, July optional | All visits sit in the list until their window is four weeks out. The confirmation names the windows, not days; the date comes when it is scheduled. |
| During a window (say May 10) | The same | The turn-on is due now: it goes to the top of the list and the next Schedule run places it in the remaining days of the window. The confirmation says "we'll set your turn-on day within a week". |
| After the turn-on window (June to September) | The blowout, July optional while July is open | The checkout only offers visits still ahead; the price is those visits. The customer sees "the spring turn-on has passed for this year" on the zones step. |
| After the blowout window (mid-November on) | Next season's pass | The season rolls over on November 1 (wiring plan decision 15); the checkout sells next year. |
| Mid-season with a visit already booked separately | Whatever is ahead | A visit of the same kind already on the calendar for that property is skipped by the checkout, not sold twice. |

## The customer picks a time (Hannah, late: "they need to pick a time that's best for them")

The tension: the app wants density (one area per truck-day), the customer
wants a time they will be around, and people cancel when they are not.
What the sources say, and what to do with it:

- **Most pass visits do not need the customer home.** Irrigation companies
  say so in their own FAQs: the tech needs the controller (garage) and the
  water shut-off, and a garage code or an unlocked service door covers it
  ([one Minneapolis company's FAQ](https://d1rda7xm7zvxwc.cloudfront.net/twin-cities/about-us/blog/2019/september/prep-for-your-minneapolis-fall-sprinkler-blowout/),
  [HomeAdvisor](https://www.homeadvisor.com/r/who-to-hire-blow-out-sprinklers),
  [Angi](https://angi.com/articles/who-to-call-to-blow-out-sprinklers.htm)).
  So the checkout asks it once: "Can we reach the controller and the
  shut-off without you?" Yes with a note (gate code, dog, where the
  controller is) is the common answer and the default; No means this
  customer must be there.
- **Specific windows, not "morning or afternoon".** Satisfaction falls
  about 0.8 points per extra hour of arrival window; a one-hour window
  scores 8.0 and a four-hour one 5.5 ([Zion & Zion](https://www.zionandzion.com/research/waiting-for-the-plumber-how-consumer-satisfaction-is-affected-by-wait-time));
  Jobber's own advice is specific slots over wide windows
  ([Jobber Academy](https://www.getjobber.com/academy/how-to-prevent-customer-cancellations/)).
  Pass visits get a two-hour window from the stop order, firmed the day
  before.
- **Confirm or pick, by reply or link.** The reminder that says "Reply C
  to confirm or R to reschedule" is the standard
  ([Housecall Pro handbook](https://www.housecallpro.com/learn/last-minute-cancellations/)),
  and contact before arrival is the single biggest satisfaction lever
  ([J.D. Power](https://www.jdpower.com/business/press-releases/us-telecom-home-service-technician-study)).
  Nobody found supports a magic number of options; two or three is a
  reasonable default to test.

The rule that falls out, in one state and no approvals:

1. **"No need to be home" customers (the default):** the app places the
   visit on their area day and tells them the day and the two-hour window
   two weeks out, with a link to their pass page. No action means the day
   stands. The link shows the other area days inside their window (the next
   two or three) and they pick one; the visit moves and the customer gets
   the new date. Messages are one-way (Hannah, late): the link does the
   work, nobody replies. Density holds because every choice offered is an
   area day.
2. **"I need to be there" customers:** the app does not fix the day. When
   the window opens it sends them the two or three area days with windows
   and they pick ("Pick a day" on the pass page and in the text). Until
   they pick, the visit shows on the Schedule as "waiting for the customer
   to pick", with a nudge after five days and a row on Home after ten so
   Ryan can call. This is the only waiting state, and it is the customer's,
   not the office's.
3. **Everyone:** the day-before reminder with the window and the link,
   "on my way" from Ryan's own phone, and the 48-hour change rule already
   in the terms.

What a cancellation is now: a customer who could not make the day had
two chances to move it (two weeks out, and the day before); a customer
who must be there picked the day themselves. The remaining cancellations
are the ones no scheduler prevents.

## What changes in the prototype

- Schedule: the week (solid blocks, Jobber-move marker), the "To schedule"
  list, Place on a row, one Schedule button in the header. Propose,
  Approve week, Confirm week, hatched blocks and dotted blocks go.
- Home's season prompt says "Schedule the spring" and presses the same
  button.
- Settings loses "firm days ahead"; the lead time per window stays, and
  October's is two weeks.
- The checkout offers only the visits still ahead for today's date, and
  asks "Can we reach the controller and the shut-off without you?" with a
  note for the gate code, the dog and where the controller is.
- A visit for a customer who must be there carries "waiting for the
  customer to pick" until they do; the pass page and the text offer the
  area days to pick from.
- `Visit.proposed` and `Visit.firm` leave the types and the fixture.

## What changes in the wiring plan

- Phase 10: `propose.ts` becomes `schedule.ts`; its output is written as
  scheduled visits, pushed to Jobber and messaged in the same run. No
  `schedule.approve`. The admin alert after each run: "12 turn-ons
  scheduled for the week of May 3; 2 could not be placed" with the two on
  Home as rows.
- Phase 8: `passes.create` sells only the visits whose window has not
  closed; the confirmation email reads from the same rule.
- Settings: `leadWeeks` per window (spring 4, July 4, fall 2); no
  `firmDaysAhead`.
