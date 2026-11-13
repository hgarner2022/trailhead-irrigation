# Season Pass self-serve checkout and recurring revenue view

Draft PRD, 2026-11-12. Phase 1 of "Trailhead's own system": the one thing
Jobber cannot sell, built beside Jobber, with Jobber kept as the system of
record for everything it already records.

## Observation

- Trailhead's revenue is à-la-carte and seasonal. From the Jobber pull on
  2026-11-01 (my tally, not a Jobber report): roughly $70k across 325 paid
  invoices from April to October, with October alone around $18k from about
  150 blowouts at $95. Nothing is committed before the season starts.
- About 40 clients booked a spring or summer visit AND a fall blowout at
  à-la-carte prices. They already behave like plan customers but nobody has
  asked them to commit.
- Jobber already has a "Complete Plan" product ($320, turn-on + mid-season +
  blowout + priority + 10% off). Essentially nobody bought it. Every sale
  needed a phone call or an email, because Jobber has no way to sell a plan:
  online booking creates a single one-off appointment with a fixed price,
  there is no plan or membership record, and a new visitor cannot save a card
  from the public website (the card field only appears inside client hub).
- The site's `/season-pass` page is live with a zone selector and the
  published per-zone prices, and its button goes to the contact form. The
  page promises "three visits booked without you having to call", which the
  contact form does not deliver.
- Hannah wants to show recurring revenue: how much of next season is already
  committed, and from whom.

## Hypothesis

If a visitor can buy a Season Pass on the website by themselves (pick zones,
reserve a blowout week, save a card) and the three visits land on Ryan's
Jobber calendar without anyone typing them in, we expect:

1. **Passes sell without a phone call.** Target: 25 passes sold through the
   checkout between launch and 2027-04-30. The Complete Plan sold roughly
   zero with a person in the loop, so any self-serve sales are a signal; 25
   is the number that makes the second phase worth building.
2. **Committed revenue is visible before the season starts.** The revenue
   view shows passes sold, committed revenue by month, and the next charges,
   from live data. Measured by Hannah opening it instead of asking for a
   Jobber pull.
3. **October runs the same as before for Ryan.** Pass visits are ordinary
   Jobber jobs. Measured by zero pass visits scheduled by hand after launch.

## Proposed Solution

Three pieces, all inside the existing website repo and Vercel deploy.

### 1. Checkout on `/season-pass`

The existing `SeasonPassCalculator` keeps its zone selector. Its button
opens a two-step flow:

1. **Details.** Name, email, phone, service address (must be in one of the
   six towns), zone count carried over, a choice of blowout week from the
   weeks Ryan opens for October, and a line about when each visit happens.
2. **Card.** Stripe Checkout in setup mode. Nothing is charged today. The
   card is saved against a Stripe customer.

On return from Stripe the app:

- Writes a `season_pass` row (status `active`).
- Creates or matches the Jobber client and property.
- Creates three Jobber jobs (turn-on, mid-season, blowout) tagged
  `season-pass`, the blowout job inside the chosen week, the other two in
  their windows as unscheduled-day jobs for Ryan to place.
- Emails the customer a confirmation with the three windows, the reserved
  blowout week and a link to their pass page.
- Emails Ryan and Hannah: "New Season Pass: {name}, {town}, {zones} zones."

### 2. Charging after each visit

Jobber marks a visit complete. A Jobber webhook reaches the app, which
charges the saved card through Stripe at `visitPrice(visit, zones)` from
`src/lib/season-pass.ts`, emails a receipt, and records the charge in the
app. The Jobber invoice for that visit is then marked paid (see Open
Questions for how).

If a charge fails, the app emails the customer a Stripe link to update the
card, and tells Hannah. Nothing retries silently more than once.

### 3. Owner dashboard at `/admin`

A signed-in area for Hannah and Ryan only. This is the first screen of
Trailhead's own system and the place Hannah opens instead of Jobber's
reports. It reads from two sources: the app's own rows (passes, charges,
blowout capacity) and Jobber's API (clients, jobs, visits, quotes,
invoices), cached for a few minutes so it is fast and never hammers
Jobber's rate limit. In phase 1 it writes nothing to Jobber; every row
that is a Jobber object links straight to it.

**Home.** The morning view.

- Today and tomorrow: visits from Jobber, in order, with town and service.
  Pass visits marked.
- Four tiles: revenue this month against the same month last year, passes
  sold this season and their committed revenue, quotes awaiting a response
  with their total (about $33k sat there on the Nov 1 pull), and invoices
  unpaid past due.
- Season line: the current month on the April-to-November arc, with
  committed pass revenue shown by month ahead of today.
- Needs attention: failed charges, passes whose jobs failed to create,
  blowout weeks that are full, cards expiring before October.

**Revenue.** The recurring revenue view.

- Passes sold this season, and the committed revenue they represent
  (sum of the three visit prices per pass).
- Committed revenue by month (April to May, July, October) against what
  has already been charged, one chart.
- Total revenue by month from Jobber invoices, this year against last,
  so the pass line sits inside the whole picture.
- Upcoming charges: the next visits due, by week, with amounts.
- Renewal pipeline once passes reach their second year: renewed, lapsed,
  not yet asked.

**Passes.** Every pass holder: name, town, zones, blowout week, status,
charged so far, next visit. Filter by town, status and blowout week. A
pass opens to its season card (the same component the customer sees) plus
the three Jobber job links, the Stripe customer link, and the charge
history. Actions: resend confirmation, send card-update link, cancel.

**October.** The blowout planner. Ryan sets how many pass blowouts fit in
each week, sees how many are taken, and which towns they are in, so he can
route the week. This is the one thing the dashboard writes, and it is
app-owned data.

**Customers.** A read of Jobber's client list with what the app knows
layered on: which ones hold a pass, which did a spring visit and a blowout
last year at à-la-carte prices (the forty who already behave like pass
customers), and a one-click "send pass offer" email for the latter. This
is the pre-sell tool for January to March.

Charts and tiles follow the `dataviz` skill: one palette, light and dark,
legible before beautiful. Phase 1 ships Home, Revenue, Passes and October.
Customers follows once the first passes exist.

### 4. Customer pass page at `/account/pass`

Magic-link sign-in by email. Shows the three visits with their state
(reserved window, scheduled date, done and charged), the reserved blowout
week, the card on file (last four) with an update link, and a cancel
button. Cancelling sets the pass `cancelled`, removes any unstarted Jobber
jobs, and never charges again.

### 5. Renewal (second season)

In January a job emails every active pass holder a one-click renew link:
same zones, same card, pick a blowout week. Renewed passes create the next
season's three jobs. This is in scope for the PRD so the data model carries
a `season` from day one, but ships after the first sales.

## The loop, end to end

What happens from the first click to next year's renewal. Every step
names who acts and where the record lives.

1. **Buy (customer, website).** Zones, address, blowout week, card. The
   app writes the pass. Stripe holds the card. Nothing is charged.
2. **Onto the schedule (app → Jobber, seconds later).** The app creates the
   client and property in Jobber if they are new, then three jobs through
   Jobber's `jobCreate` mutation, each tagged `season-pass` with the pass id
   in an app-configured custom field. The blowout job carries the reserved
   week; the turn-on and mid-season jobs carry their windows. Ryan sees
   three new jobs on his Jobber calendar, the same as if he had typed them.
3. **Confirm (app → customer and Ryan, email).** The customer gets the three
   windows, the reserved week and a link to their pass page. Ryan and
   Hannah get a one-line heads-up.
4. **Place the day (Ryan, Jobber).** Ryan drags each job to a day as he
   builds his weeks, exactly as today. Jobber sends its normal reminders.
   The pass page shows the date because Jobber's visit webhooks tell the
   app.
5. **Do the visit (Ryan, Jobber app in the yard).** Notes, photos, mark
   complete. Nothing new on the phone. He does not collect payment; the
   job's custom field says so.
6. **Charge (Jobber → app → Stripe, within a minute).** Jobber's visit
   completed webhook reaches the app. The app charges the saved card for
   that visit's stored amount, emails the receipt, and marks the Jobber
   invoice paid (how, per open question 1). A failed card emails the
   customer an update link and tells Hannah.
7. **Repeat for July and October.** Same path. The blowout happens in the
   reserved week, which is the promise the whole thing sells.
8. **Show the money (Hannah, `/admin`).** Passes sold, committed
   revenue by month, charged so far, next charges, renewals due. Live,
   from the app's rows and Stripe.
9. **Renew (app → customer, January).** One email, one click, same card,
   new blowout week. Back to step 2 for the next season.

Jobber's webhooks deliver at least once, carry only an item id, and must
be answered within one second, so the app acknowledges, queues, re-reads
the visit from the API, and charges once per visit id no matter how many
times the event arrives.

## Experience

Hannah's bar: a very beautiful experience. The model is Typeform, not a
checkout page.

- **One question per screen.** Full-bleed, the question in the display
  face, one input, one button, Enter to continue, Up and Down arrow to go
  back. Six screens: Where is the yard → How many zones (with the price
  updating live) → Which week in October for your blowout (a row of week
  cards showing spots left) → Who are you (name, email, phone) → Save a
  card (Stripe, embedded so it never looks like leaving the site) → Your
  season is reserved.
- **The reserved moment is the hero.** The last screen shows the three
  visits on a single season line, April to October, with the blowout week
  lit in orange. This is the thing the customer bought, so it gets the
  animation and the breath of space. No confetti.
- **It knows what it knows.** If the address is in Jobber already, the
  name and phone screens are prefilled and skipped. A returning pass holder
  renewing from email answers one question: which week.
- **Brand, not SaaS.** Barlow Condensed headings, cream and navy, the
  trail photography as the backdrop at low opacity, the same voice as the
  site: short sentences, warm, no "Yes!", no exclamation marks in buttons.
  Progress is a thin orange line at the top, not a stepper with numbers.
- **Phone first.** Every screen designed at 375px before anything else.
  The week cards scroll horizontally with the selected one centered.
- **Instant and quiet.** No page loads between questions. Validation is
  inline and kind. Errors say what to do, not what went wrong.
- **The pass page is a season card, not a dashboard.** The same season
  line, the three visits with their state, the card on file, one update
  link, one cancel link. It should look good enough to screenshot.
- **The dashboard is the one exception.** Data first, built on the
  `dataviz` skill: tiles, the season line, one committed-versus-charged
  chart, the pass holder table. Beautiful means legible here, and it
  should still look like Trailhead: navy sidebar, cream canvas, the
  display face for the big numbers, never a generic admin template.
- **Build with `/frontend-design` on every screen,** with the aesthetic
  direction set before code: grounded, outdoor, calm, Typeform's pacing
  with Trailhead's palette.

## Scheduling preference (Hannah, 2026-11-12 evening; replaces the blowout-week capacity idea)

There are no capacity limits per week or per month. Ryan places every pass visit on a day in Jobber himself, as he does for every job today. What the customer gives at checkout is a preference for the two visits whose timing they care about, each with Trailhead's recommendation preselected:

- Spring turn-on: recommended the first or second week of May. Choices: Earlier, Recommended (first to second week of May), Later.
- Fall blowout: recommended the second week of October. Choices: Earlier, Recommended (second week of October), Later.
- July inspection: no preference asked; Ryan picks the day.

The preference is stored on the pass, shown on the pass card and the pass page in words ("Turn-on: early May, Blowout: second week of October"), carried into the Jobber job title so Ryan sees it when he places the day, and shown in the admin Passes grid and side panel. The checkout's blowout-week picker and the admin October page from the first draft are withdrawn. If limits are ever needed they apply to all three season windows as one feature, never to October alone.

## System of record

Hannah's requirement: one good system of record. The split is:

| Thing | Lives in | Why |
|---|---|---|
| Client, property, contact details | Jobber | Ryan already works from Jobber; every other customer is there |
| Jobs, visits, schedule, completion, job notes, photos | Jobber | Ryan's calendar and phone app do not change |
| Invoices | Jobber | One place for the accountant; QuickBooks sync stays as it is |
| Season Pass (zones, blowout week, season, status, Stripe customer, charges) | App database | Jobber has no record type for a plan |
| Saved card | Stripe | A new website visitor cannot save a card into Jobber; Stripe is built for this |
| Charges and receipts | Stripe, mirrored into the app, and the Jobber invoice marked paid | So Jobber's reports still show the revenue |

Every pass row stores its Jobber client id, property id and the three job
ids. Every Jobber job carries the `season-pass` tag and a custom field with
the pass id, so the link is visible from both sides. If the two ever
disagree, Jobber wins for anything about the visit and the app wins for
anything about the pass.

## Technical Notes

- **Stack additions to the website repo:** Postgres (Neon or Vercel
  Postgres), Drizzle for the schema, Stripe (`stripe` + Checkout in setup
  mode, SetupIntent, PaymentIntent off-session), Auth.js with the Resend
  email provider for the magic link (Resend is already a dependency), Jobber
  GraphQL API client with OAuth tokens stored server-side. No new framework.
- **Tables:** `season_pass` (id, season, customer name, email, phone,
  address, town, zones, blowout_week, status, stripe_customer_id,
  stripe_payment_method_id, jobber_client_id, jobber_property_id,
  created_at), `pass_visit` (id, pass_id, kind, window, jobber_job_id,
  jobber_visit_id, completed_at, amount, stripe_payment_intent_id,
  charged_at, status), `blowout_week` (season, week_start, capacity,
  booked), `admin_user` (email).
- **Blowout week capacity:** Ryan sets how many pass blowouts fit in each
  October week. The checkout only offers weeks with room. This is the
  "reserved date" promise made real.
- **Jobber webhooks:** subscribe to visit completed (and job/visit changes
  so a rescheduled date shows on the pass page). Verify signatures. Idempotent
  on visit id so a replayed webhook never double-charges.
- **Stripe webhooks:** `checkout.session.completed` (pass created),
  `payment_intent.succeeded` / `payment_failed` (charge state),
  `payment_method.detached` (card gone).
- **Prices come from one place.** `src/lib/season-pass.ts` already feeds the
  page and `public/pricing.md`. The charge uses the same functions. Store
  the amount on the `pass_visit` row at purchase so a later price change
  does not change what an existing pass holder pays.
- **Existing patterns:** `src/app/api/contact/route.ts` is the model for a
  route handler; `SeasonPassCalculator` is the entry point; the pass page
  and admin page use `SectionHeader`, `CheckList`, `Card`, and shadcn
  `table`, `dialog`, `select`, `label` added with `npx shadcn add`.
- **Design system:** no new system. The app screens use the site's tokens
  and primitives. Once the three app screens exist, write `docs/DESIGN.md`
  for the app surfaces from what actually repeated.
- **Conversion tracking:** a `season_pass_purchase` GA4 event on the
  thank-you page, alongside the existing `book_click` and
  `contact_form_submit`.
- **Jobber as a dependency:** if the Jobber API is down at checkout, the
  pass is still saved and the card still stored; job creation retries from a
  queue and Hannah is told. The customer never sees a Jobber error.

## Rabbit Holes

- **Replacing Jobber's calendar, dispatch or field app.** Not this phase.
  Ryan keeps Jobber for the whole 2027 season; this build has to prove
  itself first.
- **Season Pass for repairs, aeration or lights.** Irrigation visits only.
  Other services stay à-la-carte.
- **Discounts, bundles, referral codes.** The offer is the reserved date
  and the kept schedule at the published price. No coupon system.
- **Charging up front or a deposit.** The page says "after each visit" and
  that is what ships. Revisit after one season of data on no-shows.
- **QuickBooks integration.** Jobber's existing sync covers it as long as
  the Jobber invoice is marked paid.
- **A native mobile app for customers.** The pass page is a web page.
- **Per-visit add-ons or repair quotes inside the pass flow.** Repairs are
  quoted in Jobber as today.
- **Multi-property customers.** One pass, one property. A second property
  is a second pass.

## Open Questions

1. **How does the Jobber invoice get marked paid?** Three options:
   (a) the app records the payment on the Jobber invoice through the API if
   the API allows it; (b) Ryan marks it paid in Jobber with the Stripe
   receipt attached, a thirty-second habit; (c) skip Jobber invoices for pass
   visits and treat Stripe plus the app as the book of record for passes.
   (a) is cleanest; whether it is possible is a Jobber API schema check.
   **Engineering, first chore.**
2. **Scheduling fields on `jobCreate`.** Confirmed from Jobber's developer
   docs (2026-11-12): `jobCreate` exists with `JobCreateAttributes` carrying
   `customFields`, `lineItems` and `jobFormIds`; webhooks follow the
   `OBJECT_ACTION` pattern with topics listed in `WebHookTopicEnum`; apps
   can define their own custom fields on jobs. Still to confirm in
   GraphiQL on a tester account: the exact visit scheduling input on
   `JobCreateAttributes` (start date, window, assigned user) and the visit
   completed topic name. If a job cannot be created with a visit, create it
   unscheduled with the window in the title and let Ryan place it, which
   is what he does anyway. **Engineering, first chore.**
3. **Blowout week capacity.** How many pass blowouts does Ryan want to hold
   per October week, and does he want pass customers in the first weeks of
   October or spread out? **Ryan.**
4. **Who sees `/admin`?** Hannah and Ryan by email allow-list, or a
   shared sign-in? **Hannah.**
8. **Jobber read scopes for the dashboard.** The dashboard needs read
   access to clients, jobs, visits, quotes and invoices through the app's
   OAuth connection, and Jobber's rate limit (a cost budget per account)
   sets how fresh the cache can be. Confirm the scopes on the app and size
   the cache from the limits page. **Engineering.**
5. **Mid-season visit in July: fixed window or Ryan's choice?** The page
   says July. The checkout can show "July, date set by us" or let the
   customer pick a week. **Ryan.**
6. **Terms.** The pass needs a short terms block: cancellation, what happens
   if a visit cannot be done (weather, access), card update obligations. The
   Terms page currently says services are as-is. **Hannah, with the existing
   Terms page.**
7. **Sales tax.** Irrigation labor in Colorado is generally not taxable;
   confirm with the accountant before the first charge so the receipt is
   right. **Hannah.**

## User Job Stories

| Job to Be Done | Priority | Notes |
|----------------|----------|-------|
| When I decide I want my sprinklers handled this year, I want to buy the Season Pass on the website in a few minutes, so I can stop thinking about it | Must Have | Zone count, address, blowout week, card |
| When I buy a pass, I want to see my blowout week reserved before I pay anything, so I know I will not be scrambling in October | Must Have | The core promise |
| When a visit is done, I want to be charged the price I was shown and get a receipt, so there are no surprises | Must Have | Price stored at purchase |
| When I want to check my dates or my card, I want a page I can open from my email, so I do not have to call | Must Have | Magic link, no password |
| When a visit is scheduled or moved in Jobber, I want to see the date on my pass page and get the usual Jobber reminders, so I know when Ryan is coming | Must Have | Jobber reminders stay as they are |
| When my card expires, I want an email with a link to update it, so my blowout is not at risk | Must Have | Stripe-hosted update |
| When I want out, I want to cancel from my pass page with nothing further charged, so the promise on the page is true | Must Have | |
| When next January comes, I want one click to renew with the same details, so I never fill the form again | Nice to Have | Phase 1 data model, phase 2 ship |
| As Hannah, when I open the dashboard in the morning, I want today's visits, this month against last year, passes sold and what needs attention on one screen, so I run the business from here instead of Jobber's reports | Must Have | Dashboard home |
| As Hannah, when I open the revenue page, I want to see passes sold, committed revenue by month and the next charges, so I can show recurring revenue without a Jobber export | Must Have | The reason for the build |
| As Hannah, when a customer calls about their pass, I want to find them in two keystrokes and see their season card, charges and Jobber links, so I can answer without switching tools | Must Have | Passes page |
| As Hannah, when January comes, I want to see who booked a spring visit and a blowout last year and send them the pass offer in one click, so the pre-sell takes an afternoon | Nice to Have | Customers page, after first passes |
| As Hannah, when a charge fails or Jobber job creation fails, I want an email the same hour, so nothing silently breaks | Must Have | |
| As Ryan, when a pass is bought, I want the three jobs to appear in Jobber like any other job, so my day does not change | Must Have | System of record |
| As Ryan, when I look at a pass job in Jobber, I want to see it is a pass visit and open the pass, so I know not to collect payment on site | Must Have | Tag + custom field |
| As Ryan, when I set up October, I want to say how many pass blowouts fit each week, so the checkout only offers what I can do | Must Have | Small admin form |

## Chores

| Chore | Priority | Notes |
|-------|----------|-------|
| Confirm Jobber API can create jobs with visits, and record payments on invoices, from the app's OAuth scopes | Must Have | Decides open questions 1 and 2; do first |
| Stripe account in live mode with Checkout, SetupIntents and off-session charges enabled; webhook endpoint | Must Have | |
| Postgres database on Vercel, Drizzle schema and migrations, env vars in Vercel | Must Have | |
| Jobber OAuth app, token storage and refresh, webhook subscriptions with signature verification | Must Have | |
| Auth.js magic link via Resend for `/account/pass` and `/admin` | Must Have | |
| Add shadcn `table`, `dialog`, `select`, `label`, `alert`, `tabs`, `sidebar`, `chart` to `src/components/ui/` | Must Have | Library-first rule; `chart` wraps Recharts for the dashboard |
| Jobber read cache: a small sync that pulls visits, quotes and invoices on a schedule into app tables for the dashboard, sized to Jobber's rate limits | Must Have | Dashboard never queries Jobber per page view |
| Rewrite the `/season-pass` CTA, FAQ answers ("Reserve by contacting us") and `public/pricing.md` to describe the checkout | Must Have | Copy rules in CLAUDE.md |
| Season Pass terms block, reviewed against the existing Terms page | Must Have | |
| GA4 `season_pass_purchase` event in `ConversionTracking` | Must Have | |
| Test pass end to end in Stripe test mode against a Jobber test client before launch | Must Have | Never ship a payment flow unseen |
| `docs/DESIGN.md` for the app surfaces, written from the three shipped screens | Nice to Have | After launch |
| Jobber "Complete Plan" product retired or renamed so it does not compete with the pass | Nice to Have | |
| IndexNow for `/season-pass` after the copy change | Must Have | Standing rule |

## Design

No mockups yet. The checkout is the six-screen Typeform-style flow in the
Experience section, entered from the `SeasonPassCalculator` button with the
zone count carried in. The pass page and the revenue page are the first
app screens and set the pattern for `docs/DESIGN.md`. Next step: a Figma
or in-browser prototype of the six screens at 375px before any backend
work, so the flow is approved before it is wired.
