# How booking tools and irrigation companies schedule a prepaid season plan

Written 2026-11-13 evening, after the first live purchase. Hannah: "As a user,
this is my first time purchasing and I need to book, or should we just book
for them? I've already bought and I want to renew my pass. What do I do? Is
this what other booking tools do?" This is what the tools and the companies
actually do, then the rule for Trailhead.

## What exists in the wild

Three models, and every seller uses one of them.

**1. Buy, then pick your dates right away.** ALS Waterstone (a seasonal
irrigation plan priced by zone count) sells the plan and says "After checkout,
you'll be automatically directed to our online scheduling page." TLC lets
small systems "schedule and pay for your winterization right here in a couple
of minutes." Nature's Carpet (Denver) takes a booking form and sends a
prepayment link. Jobber's own online booking is this model for single visits:
the customer picks a service and a time from the team's availability, and the
arrival window is shown from the company's settings.
([Waterstone](https://newlawn.com/waterstone-seasonal-service-plan/),
[TLC](https://www.tlcincorporated.com/lawn-sprinkler-system-winterization/),
[Nature's Carpet](https://lawnandsprinkler.com/sprinkler-blowout),
[Jobber online booking](https://help.getjobber.com/hc/en-us/articles/13808363916951-Online-Booking))

**2. Buy, and the company schedules you, with notice.** The Sprinkler Company
(Wisconsin): "When you sign up for an irrigation maintenance agreement, your
services will be automatically scheduled. We will send you advance
notifications and confirmation of when we'll be servicing your system." Kelly
Green: "We contact you to schedule standard service visits." Shakopee
Sprinklers contacts plan members during each seasonal window and members
confirm and provide access. SeasonGreen: pay first, then wait for the company
to set a date.
([The Sprinkler Company](https://thesprinklercompany.com/maintenance),
[Kelly Green](https://kellygreenirrigation.com/seasonal-plans/),
[Shakopee](https://shakopeesprinklers.com/),
[SeasonGreen](https://www.seasongreen.com/lawn-sprinkler-systems/fall-winterize-and-blow-out.html))

**3. The office books from a list.** This is what the field-service software
does for plan visits. Housecall Pro's service plans generate the visits and
the office schedules them from an "Unscheduled Visits" table, overdue on top;
customers do not self-schedule plan visits, they get reminders that prompt
them to call. Jobber's recurring jobs are set up by the admin with a start
date and a repeat rule; its online booking is a single-visit flow.
([Housecall Pro](https://help.housecallpro.com/en/articles/3075085-schedule-service-plan-visits),
[Jobber recurring jobs](https://help.getjobber.com/hc/en-us/articles/115009542848-Create-a-Recurring-Job))

What the prototype built on the 12th was model 3 with model 2's notice: the
visits sat in a list, the app placed them four weeks out, the customer got a
text with the day. Correct by the software's standards, and still not what a
person who just paid wants to see, which is a day.

## What the customer holds after paying, under each model

| Model | After checkout the customer has | Who must be home | Where it breaks |
|---|---|---|---|
| 1 Pick now | Two dates on the calendar | Picks a day that works | Dates months out can move; needs a move flow |
| 2 We schedule you | A promise and a window | Told the day, can object | "When are you coming?" calls; feels passive |
| 3 Office list | Nothing until the office acts | Office calls them | Worst for the customer; fine for the office |

Only model 1 gives the customer something to add to a calendar on the day they
pay. Nobody found does model 1 for a plan bought months ahead with a
pre-selected best day; that part is ours.

## Renewals: what the plan sellers and the law say

- The HVAC maintenance-plan guidance is consistent: a dedicated consent for
  renewal terms (never fine print), a reminder 15 to 45 days before the
  renewal, any price change sent on its own, the card checked before the
  renewal date, and **the first visit booked in the same flow as the renewal**.
  ([LeadDuo renewals](https://www.leadduo.io/en/blog/hvac-maintenance-plan-reminders),
  [SmartAC on auto-renewal](https://www.smartac.com/blog/auto-renewal-in-hvac-maintenance-contracts),
  [Tradeswork guide](https://tradeswork.app/guides/hvac-maintenance-plans))
- Automatic renewal of an annual plan is regulated: California requires
  express consent, a 15 to 45 day notice and online cancellation; New York
  requires written notice before the cancellation deadline; Colorado has its
  own automatic-renewal disclosure and cancellation rules in the Consumer
  Protection Act (confirm with counsel before charging anyone automatically).
- None of the irrigation companies found describes a renewal flow at all;
  they re-sell the plan each spring with a prepay deadline (JD's, Grapids,
  Adaptive: pay by March 31 or April 1 for the discount).
  ([JD's](https://www.jdsirrigation.com/), [Grapids](https://grapids.com/services/service-memberships/))

## The rule for Trailhead

**First purchase: model 1, with the best days already chosen.** After the
card is saved, the customer sees "Your days": for each visit the pass holds,
the three best open days on their town's truck-day inside the window, the
first one selected. Continue without touching anything gives good dates;
tapping another gives the one that suits them. Everyone leaves with real dates
and calendar buttons on the done step and in the confirmation. The "can we
reach the controller without you" answer becomes a note for Ryan, not a fork.
Under it, one line: "We confirm it by text two weeks before. If it has to
move, we tell you first and you can pick another day."

**Changing a day:** the pass page and every dated message carry "Move it",
which shows the same three-day choice. A move by Ryan sends the new date with
new calendar buttons.

**Renewal: opt-in, one tap, dates in the same flow.** No automatic charge.
From November 1 the pass page shows "Reserve next season", and in January the
renewal email goes out. Both open a checkout already filled in: address,
zones, add-on, card on file. The customer confirms the price, picks the days
(same three-day screen), and is done; nothing to retype. The card on file is
checked before the email goes out, and a customer whose card expired gets the
card-update link first. This is the HVAC guidance's "book the first visit in
the same flow as the renewal" and stays clear of the auto-renewal laws.

**What the office does:** nothing, unless a day fills or slips. The daily
Schedule run places only visits with no day (admin-created passes, moves), and
Home shows the exceptions.

## What changes in the build

- The timing step of the checkout becomes "Your days" (three offered days per
  visit, first selected), fed by a public `schedule.offerDays` handler on the
  slots logic.
- `passes.create` stores the chosen days; `passes.activate` schedules them,
  orders the truck-days, and falls to the next open day if one filled.
- The done step and the confirmation show the dates, the calendar buttons,
  the two-week line and the money line.
- `needsCustomerHome` stops gating anything; it is the access note.
- The pass page: "Move it" per visit; "Reserve next season" from November 1,
  opening the prefilled checkout.
- Phase 12's January renewal email links to the same prefilled checkout.
