# Jobs to be done: the whole thing, from every chair

> **Vocabulary (Hannah, 14 Nov, 4:10am: "I thought we were calling jobs
> visits").** A **visit** is the stop: the `visit` row with its day, time,
> truck, minutes, state, notes and charge. A **job** is the sold work it
> belongs to: a Season Pass (two or three visits) or a booking (one visit),
> with its price, status, customer and card. Move, Done, Not done and Edit
> act on a visit; Cancel the whole thing and the money live on the job. The
> office lists visits; the nav item is Visits, not Jobs. Where this document
> says "job" for a stop, read "visit".


Written 2026-11-14, 3am, after Hannah: "Think through all the jobs to be
done. You are an excellent product manager." This is the product thought
through before more of it is built: who hires the app, in what situation,
to get what done, and what "done well" looks like. The screens come from
this, not the other way round.

## The people

- **The customer.** A homeowner in one of six towns with a sprinkler
  system. Does not think about it until it leaks or freezes. Wants it
  handled, wants to know when, wants to not be surprised on the card.
- **Ryan.** In the truck from spring to the first freeze. Wants a full day
  in one town, a list he can trust, no phone calls asking when he is
  coming, and the money to arrive without him chasing it.
- **Hannah.** Runs the business from a laptop, in the evenings and between
  other work. Wants to see in one glance that everyone who paid is going
  to get their visits, that the money is coming in, and what needs her.
- **The business.** Wants recurring revenue that renews itself, a
  reputation for showing up, and no dependence on Jobber.

## The customer's jobs, in the order they happen

| When | The job, in their words | Done well means |
|---|---|---|
| Thinking about it | "Is this worth it, and what does it cost?" | The pass page says the two visits, the price by zones, and that nothing is charged today, in under a minute of reading. |
| Buying | "Get me on the list without a phone call." | Address, zones, days, name, card: five minutes on a phone, no account to create, no password. |
| Buying, with a wrinkle | "I'm not home mornings" / "the gate is locked" / "I'm not sure how many zones" | One question each, answered once, remembered. Zones can be confirmed on the first visit. |
| Right after paying | "Did it go through, and when are you coming?" | The done screen and the email say the two days, what Ryan does, what it costs when, and have calendar buttons. The same email is how they get back in. |
| Months later | "When was that again?" | The calendar entry, or the pass page from any message, says the day. Nothing to remember. |
| Two weeks before | "Is it still on?" | A text confirms the day (and the window for someone who must be home). One tap to move it if it no longer works. |
| The day before | "Tomorrow, right?" | A reminder with the window. |
| The day | "Is he here yet?" / "Do I need to do anything?" | Ryan's own on-my-way text. The access note means they need not be home. |
| After the visit | "What did you do, and what did I pay?" | A receipt that names the visit, what was done, any parts, the amount, the card, and the next visit's day. |
| Something changed | "I'm moving / selling the house / going away in October" | Move a day, change the address, cancel from the pass page, with what happens to the money said plainly. |
| The card died | "Why did the charge fail?" | One email with a link that takes a new card in a minute, and the visit still happens. |
| Before the freeze | "Will you make it before it freezes?" | The fall day is set early, and if the forecast turns, they get one text with the earlier day and a link to pick another. |
| Next season | "Do I have to do this again?" | If they ticked renew: an email in December with next year's days and price, Change and Cancel, nothing else to do. If not: one tap to reserve, prefilled. |
| Something broke in between | "A head is spraying the sidewalk." | Book a repair from the pass page or the site, and it shows as a job on the same account. |

## Ryan's jobs

| When | The job | Done well means |
|---|---|---|
| The evening before | "Where am I tomorrow, in what order?" | A day list on his phone: stops in route order, address, gate code, zones, the window if one was promised, the drive between. |
| Morning | "Anything changed overnight?" | The list is current; a moved or cancelled stop is gone, a new one is in its place. |
| At a stop | "What is this system, what did we do last time, what's the code?" | The stop card: zones, last visit's notes, the access note, the customer's phone. |
| Done at a stop | "Mark it, charge it, next." | One tap: Done. The charge and the receipt happen; the next stop is up. Notes and a photo if he wants. |
| Can't do a stop | "No water on / can't get in / they asked to wait." | One tap: Not done, a reason, and the office sees it; the stop goes back for a day. |
| Found more work | "Needs two heads and a valve." | Add parts to the job, or a follow-up job, from the stop; the receipt carries it. |
| Running late | "I'm two stops behind." | He sends the on-my-way from his phone; nothing in the app pretends to know his minute. |
| A call comes in | "Can you come Thursday?" | New job from his phone: customer, kind, day, time or any time, done in a minute. |
| The forecast turns | "Freeze Tuesday. I need everything before it." | Pull a day earlier in one move; every stop on it is told; the slack was there because the app never sold it. |
| Planning the season | "Which towns which days? How many a day?" | Settings he fills once, in his words, and the offers follow. |
| Off the job | "Nothing to look at tonight." | No admin unless Home says so. |

## Hannah's jobs

| When | The job | Done well means |
|---|---|---|
| Any evening | "Is everyone who paid going to get their visits?" | Home: one count of jobs that need a day, one of days past without a Done, one of charges that failed, each with one action. |
| Weekly in season | "Is the week sane?" | Schedule: each truck-day in one town, under capacity, nothing stranded; thin days visible so she can fold them. |
| Month end | "What came in, what's owed, what's coming?" | Revenue: charged, failed, scheduled-not-yet-charged, by month and by kind. |
| A customer writes or calls | "Who is this, what do they have, what happened?" | Customers: name, address, pass, jobs, every message and charge, in one panel, with Contact right there. |
| A customer asks to change something | "Move it / add the inspection / change the card / cancel." | The same actions the customer has, on the job or pass panel, with the customer told. |
| Something failed | "A charge bounced / a text didn't send / a day is double-booked." | Home says so with the fix; nothing is found out from a customer. |
| Renewal season | "Who renews, who lapses?" | December: the renewal emails go; a list of who ticked, who didn't, who lapsed, with one reminder to send. |
| Compliance | "Are we allowed to text them / charge them?" | Consent is recorded per customer with the wording version; the renewal consent is separate; STOP is honoured by itself. |
| Growth | "Where do passes come from?" | The purchase event in analytics, lead source on the customer. |
| Leaving Jobber | "Can I stop paying for Jobber?" | Every job type on one list, invoices and quotes added in order, and the day the last Jobber job closes. |

## What the product is, from those jobs

Six surfaces, each owning the jobs above and nothing else.

1. **The checkout** (customer, buying): five steps, days chosen, one wrinkle question, done screen with dates and calendar.
2. **The pass page** (customer, after buying): the days, Move, Change the answer to "need to be home", Add the inspection, Update the card, Cancel, Book a repair, Renew.
3. **The messages** (customer, over time): confirmation, two-week, day-before, receipt, card failed, moved, cancelled, renewal. One per event, one channel each.
4. **The day view** (Ryan, in the truck): the list, the stop card, Done, Not done, Add parts, New job.
5. **The office** (Hannah, on a laptop): Home, Schedule, Visits, Customers, Reports, Settings. Home is two things only (Hannah, 14 Nov: "Home should be about what's coming up today, what needs action. Everything else can go in reports"): Today and tomorrow, each truck's stops in order, and Needs action, one row per thing with its one button and a Dismiss. Revenue, passes sold, the season chart, quotes and invoices live in Reports. Every action lives on the thing it acts on: the job panel has Move, Done, Not done, Edit, Contact, Cancel; the customer panel has Contact, New job, the pass; the pass panel has Add inspection, Card link, Resend, Cancel.
6. **The season logic** (the business, unattended): the offers, the route build, the texts, the pull, the renewals, the nightly Jobber read.

## What is built, and what the live admin showed

| Surface | Built | Seen tonight |
|---|---|---|
| Checkout | Yes, through step zero | Works end to end with the test card; the window shown at purchase is fake until the route build |
| Pass page | Prototype wired, no Move or Renew yet | Not walked tonight |
| Messages | Senders and templates in | Confirmation landed; texts fall back to email until the carrier approves |
| Day view | Not started | Ryan has nothing to run a day from without Jobber |
| Office | Shell, Passes, Customers, Schedule on live data | Lists the jobs, offers no action on the job; nav says Passes |
| Season logic | Offers exist but ignore settings; no route build, no pull, no renewals | Offered Saturdays and April 26 against the settings |

## The order, by whose job breaks first

1. **The office can act on a job, and Home is today plus what needs action** (Hannah tonight: "we need to reschedule things"): the Jobs page and the job panel with Move, Done, Not done, Edit, Contact, Cancel; New job. Without this Hannah cannot fix anything a customer asks for.
2. **The offers tell the truth**: honour the six sources, derive capacity from minutes, start the day at 8:00, drop the fake window. Without this the checkout promises days Ryan does not have.
3. **Ryan can run a day**: the day view with Done and Not done. Without this the Season Pass still depends on Jobber for the one thing that earns the money.
4. **The customer can move a day** from the pass page and the texts.
5. **The route build two weeks out**, the texts with windows for attended stops.
6. **The fall pull** and the terms line.
7. **Renewal**: the box, the December email, the January pass.
8. **Settings** in Ryan's words; the Jobber feed as a nightly read until it goes.
9. **Repairs as jobs**: book from the pass page and the site; parts on a job; invoices and quotes after.

## What I got wrong before this

I built the office screens as lists and the actions as side effects of
the Schedule, so the job a customer asks for ("move it") had no home. I
offered a window at purchase that the product cannot keep. I put Jobber in
the critical path when the direction was away from it. And I built step
zero's Jobs vocabulary before writing down what anyone does with a job.
Each item above fixes one of those, in the order someone's job breaks.
