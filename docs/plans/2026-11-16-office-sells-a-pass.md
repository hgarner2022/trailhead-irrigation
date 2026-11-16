# The office sells a Season Pass

Hannah, 16 Nov, on the live Visits page: "You also can't even manually add
a pass. What the fuck? Did you think about the data model?" She is right.
The job table has a kind `pass`, but the only office entry point is New
visit, which makes a one-off job. A pass can be sold on the website only.

## The job to be done

| Who | Situation | What they need |
|---|---|---|
| Ryan, phone in hand | "Sign me up for the pass." A customer calls, or says it at the door after a repair. | Name, address, zones, the July add-on, their days if they know them, and how they will pay. Under two minutes. The customer gets the same confirmation the website sends. |
| Ryan, at a stop | "Put me on the pass, here's a check." | The same, with the money noted at the visit, not up front. |
| Hannah, laptop | "Ryan took three passes by phone yesterday." | Each one in Visits with its two or three visits, each a No day yet or a day, each with the pass number, and the same emails as a website sale. |
| The customer | "I bought it by phone. What now?" | The confirmation email with the pass card, the days or "we'll be in touch", and, when they chose a card, one link to add it. The pass page works the same. |

## What a sold pass is, in the data model

A pass sold by the office is the same rows a website sale makes: a `job`
of kind `pass` (source `office`), a `season_pass` that is `active` from
the start (there is no pending step, nothing expires), two visits (three
with the inspection), a consent row with source `admin` (the terms were
read to them; the texts about their days are allowed), and the purchase
confirmation in `message_log`. Nothing new is invented for it.

The one thing a website pass has that an office pass may not is the
card. **An active pass with no card is allowed.** Its money works like a
one-off: Done asks how it was paid (check, Venmo, cash), and no
`pass-charge` task is queued for it. "Send card link" on the pass panel
turns it into a card pass at any time, and the customer's pass page
offers "Add a card". That is Hannah's simplicity rule applied to the
pass: "Venmo, close it. Check, close it. If you need to get a card, then
you get that."

Price is never typed: it comes from the zones through
`src/lib/season-pass.ts`, per visit, the same as the website.

## The screen

One sheet, "New pass", beside New visit on Visits and "Sell a pass" on
the customer panel, built on New visit's bones so the two feel the same:

1. **Customer**: find one, or a new one (name, address, town, email,
   phone), exactly as New visit does it. Email is required: the
   confirmation and the pass card go by email.
2. **Zones** (6 to 16) and **July inspection** (off by default). The
   prices appear as the zones change: "Spring turn-on $145 · Fall blowout
   $95 · billed after each visit".
3. **Days**: one date box per visit, each optional. Blank means No day
   yet. A day goes through the same rules as a move (an open day on a
   route day for the town). The three-open-days offer comes with build 2;
   for now the box is a date.
4. **Pays by**: "Card on file, we email a link to add it" or "At each
   visit (check, Venmo or cash)". Card on file queues the card link email
   with the confirmation.
5. **Terms read and accepted** (one box, required): records the consent
   with source `admin`.
6. **Sell pass**. The sheet closes, the toast says "Pass TH-2027-0009
   sold. Hannah will get the confirmation by email."

## API

`passes.sell` (scope write, office only): one call that makes the job,
the pass as active, its visits, the days, the consent, the onboarding
task and the confirmation, and the card link when asked. It reuses
`passes.create`'s row-making and `passes.activate`'s day placing and
`recordPurchase`, with no Stripe session. The MCP and OpenAPI pick it up
through the registry.

## Every row this touches (docs/DATA_MODEL.md)

job.source (a pass from the office), pass.status (active with no pending
step), pass.card (may be null on an active pass: "no card yet, collect at
the visit"), charge.method (a pass visit with no card is asked at Done),
consent.source (admin), visit.scheduled_on (the sheet's dates),
message_log purchase (the office sale's email), card link (sent at sale
when chosen).
