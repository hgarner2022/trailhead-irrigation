# Admin UX audit: every job to be done, tried on the live app

Nov 18 2026, after step 6 and the status words shipped. Done by using the live admin in Hannah's signed-in browser, not by reading code: a test Repair job was made for the Hannah Garner customer record, scheduled, moved through Done and paid, and followed across every screen. Each row below is one thing Ryan has to get done. The columns are what is good, what needs to improve, and the bugs met on the way. The comparison is to Jobber, Housecall Pro and ServiceTitan, checked against their help centres, and to NN/g.

Words used here follow `docs/plans/2026-11-18-status-words-audit.md`. "Bug" means it does the wrong thing; "improve" means it does the right thing in a confusing or slow way; "not built" means the job cannot be done at all yet.

## The checklist

| # | Job to be done | Good | Needs to improve | Bugs and gaps |
|---|---|---|---|---|
| 1 | **Take a call and make a job** (New job sheet, from Jobs, Visits or a customer) | One sheet: customer type-ahead by name, street or phone, then what, day, who, price, notes. The price and what's included show under the service. "With a day, the customer is told the date by text" says what will happen before it happens. | The service list is the raw catalogue: 17 entries, unsorted, with the zone bands as separate lines ("Spring turn-on, up to 8 zones", "up to 12", "up to 16"). Jobber shows one line per service and prices from the quantity. Ours should show one entry per service and let the zones box pick the band. The day defaults to today, so a fast "Add job" books today by accident. | **Add job is disabled with no day.** Ryan cannot take a call and schedule later. Jobber's "Schedule later" and the Schedule's own "Unscheduled" list both expect this. A job with no day must be allowed and read Unscheduled. **"Any time" becomes "8 to 10 am"** on the visit. **After Add job, the visit panel opens on top of the Jobs screen, and opening the job then stacks a second panel** over it (two dialogs at once). |
| 2 | **Give a job a day and move it** | Move in the visit panel takes a day and a time, the customer is texted the new date, and the Schedule's Unscheduled list is the right idea. The day view's "Stops in order" with the map is good. | **Visits is in the left column** beside Jobs. Jobber's nav is Home, Schedule, Clients, Requests, Quotes, Jobs, Invoices; Housecall Pro has no visit word at all. Ryan thinks "a job gets a day". Visits should leave the nav; the day lives on the job (New job, the job panel, the Jobs grid's Next column) and the Schedule. **No New job on the Schedule.** In Jobber you click a day on the calendar and get New job with that day filled. The Schedule's only button says "Schedule", which does not say what it does. The map draws late, several seconds of cream box, on Home and the day view. | The Unscheduled list says "Jobs of active passes with no day show here", so an unscheduled one-off job has nowhere to appear (it cannot be made either, row 1). |
| 3 | **Finish a visit and get paid** | Done offers Check, Venmo, Cash or Send an invoice with a reference box; a receipt goes out; an Undo toast appears. The Notes and history line "$145 paid by check, Repair" is clear. | The visit panel is a wall of inline forms, Move, Done, Not done, Edit, Job, Send a text, Messages, with Close at the very bottom. Jobber's visit screen leads with one Complete Visit button and keeps the rest behind a menu. `docs/plans/2026-11-18-done-and-paid-design.md` already fixes this (Mark done, then "How is this paid?"); it should be the next build. | **One click marks done and records a payment.** "Mark done and record payment" with Check preselected and Done on set to today recorded a check payment that never happened, on a visit scheduled two days ahead, with no confirmation. **Undo lives only in the toast**; once it fades there is no way back: the payment row cannot be deleted (by design) and Done cannot be undone once a payment exists. A refund row is the only path and no screen offers it. **The date text links to /account/pass for a repair** ("Calendar and changes: …/account/pass"), a page about a pass the customer does not have. The receipt email said "Visit repair, Paid by check" in lowercase with no line, address, date or number (fix in flight in the messages build). |
| 4 | **Send an invoice and get paid online** | Send an invoice exists on a Done and unpaid job; the pay page keeps the card; Remind is a button, never automatic; Home shows Invoice past due. | Not tried live in this pass: it needs a Done and unpaid job, and making another fake payment on Hannah's record was not worth it. The pay page has never been opened live. | None seen; **unverified**. |
| 5 | **Know a customer when they call** | Facts (address, email, phone, pass, next, card), a Property block with Edit, Notes and history with the messages sent, Send a text, Consent history, Jobs with each job's state. | Search is by name only ("Search by name") while New job searches name, street or phone; Jobber searches phone and address. The facts say Job, Next and Scheduled; the design doc wants unpaid and next visit at the top, then reach-them. | **The facts ignore one-off jobs**: Hannah Garner reads "Job: None, Next: Nothing ahead, Scheduled: No" while a Repair job was open and scheduled on her record; only a pass fills those lines. The Jobs block names the repair "2026 · Nov 18, office", a season on a job that has none. "Consent history: No consent recorded" while texts go out to that number. |
| 6 | **Know what needs attention this morning** (Home) | Today money strip, Today's visits by visit and by person, the map with stop numbers, Needs action. Done rows show the money word. | Needs action rows leave the screen instead of opening the panel in place. "A stripe-webhook task gave up: The session saved no card" is engineer language in Ryan's face; it should say what to do ("Hannah's card was not saved. Send the card link."). The initials chip reads "T2" for "Second truck" (a person called Second truck is a leftover for Hannah to rename). | None. |
| 7 | **See every job: sold, worth, paid, what's left** (Jobs) | One row answers all four: Job, Sold, Status, Visits done, Total, Money, Next. Filters by Status, Money, Job, Season. Jobs with an invoice out come first. | Only the customer's name opens the row; the rest of the row does nothing when clicked. The subtitle "Repair · sold Nov 18" is odd for a repair call; Jobber says created. The Money cell has two shapes, "$240 · $145 paid" and "$145 · Paid". | **The job panel's primary button is "Record the payment" on a job that is not done yet.** The next step for a scheduled job is the visit; the design doc wants the primary to be the next step. **A one-off job cannot be cancelled**: the only Cancel is "Cancel pass". The job panel cannot change the day; it shows the visit's day and nothing to press. |
| 8 | **See the month** (Reports) | Revenue, passes, invoices past due, visits needing a day, season chart, revenue by month, upcoming charges. | Pass-centric: "Upcoming charges, the next pass visits" and "Passes sold" ignore one-off jobs. "Quotes awaiting" shows a feature that does not exist yet. | None. |
| 9 | **Change a person, a service, a message** (Settings) | People, Services, Billing, Messages and API keys are plain tables with Save and a change log. | "Changes apply from the next schedule run" is unexplained at the top. Areas and Capacity and windows are the tabs Hannah rejected; the Routes and Seasons design (`2026-11-18-week-planning-design.md`) replaces them. The second person is still named "Second truck". | Not retested in this pass (a People rename was fixed and verified on Nov 17). |
| 10 | **The customer's side** (what they get) | The pass page with the holographic card, the day-pick, the card update, the receipt and the day texts all work. | The portal is a pass page only; a repair customer gets a link to a pass page. `2026-11-18-customer-portal-design.md` grows it to /account for every job. | The date text's link (row 3). The receipt (row 3, in flight). |
| 11 | **On a phone** | The panel is a full-width sheet below lg; the sticky bar never covers the admin. | Not verified in this pass: the browser tool's resize did not take. Must be done on a real phone before Hannah looks. | Unverified. |

## What is good across the board

- One New job sheet everywhere, one side panel everywhere, one grid everywhere, the same status words everywhere since PR #59. That is the consistency Hannah asked for, and it holds.
- States are read from facts: nothing on these screens is a typed status, and every money word comes from the payment rows.
- Every action tells the customer: a day set, a day moved, a visit done, each queues a text or an email, and the panel shows what was sent.

## What was never built

- Unscheduled one-off jobs (row 1) and New job from the Schedule (row 2).
- The two-beat Done then "How is this paid?" flow with the card on file preselected (`done-and-paid-design.md`).
- Undo after the toast, a refund from a screen, cancel on a one-off job.
- A quote: Needs a quote and Quote sent are stages with no screen behind them.
- Routes and Seasons settings, online booking for every service, the customer portal, the Jev seam (all designed, none built).
- Phone-width verification of the admin.

## Against the field

| Pattern | Jobber | Housecall Pro | ServiceTitan | Trailhead today |
|---|---|---|---|---|
| Left column | Home, Schedule, Clients, Requests, Quotes, Jobs, Invoices | Dashboard, Schedule, Customers, Jobs, Invoices | Dispatch, Calls, Customers, Jobs, Invoices | Home, Schedule, **Jobs, Visits**, Customers, Reports, Settings |
| New job from the calendar | Click a day, New job with the day filled | Same | Same | Not there |
| Schedule later | "Schedule later" leaves the job unscheduled | Unscheduled jobs list | Unassigned | Add job refuses a job with no day |
| Complete vs collect | Complete Visit, then Collect payment, two steps | Finish, then Collect payment | Complete, then Payment | One button does both, Check preselected |
| Receipt and invoice email | Line items, totals, Pay button | Line items, totals, Pay | Line items, totals, Pay | Three rows, no lines (fix in flight) |
| Customer page top | Name, balance due, call and text | Next three appointments | Balance due, More menu | Pass-only facts; a one-off job is invisible |

## Order to fix

1. **Now, small and sharp (one PR):** Add job without a day; "Any time" stays any time; the date text links to /account; customer facts count one-off jobs; no second panel over a panel; Cancel on a one-off job; the job panel's primary is the next step, not Record the payment.
2. **Done and paid** (`done-and-paid-design.md`): the two beats, the card preselected, Pay later, confirmation on a future-day visit, Undo that lasts, a refund from the panel.
3. **A job gets a day** (`admin-hierarchy-design.md`): Visits out of the nav, the day on the job and in New job, New job from the Schedule's day, Needs action opens in place, one service per entry in the sheet.
4. **Messages** (in flight): the receipt and invoice with line items.
5. **Portal, Routes and Seasons, online booking** in that order.
6. **Preview database** so a pushed branch never migrates production (a Neon branch per preview); not UX, but the biggest risk left in the build.

## Test data left behind

One Repair job on the Hannah Garner record (job `d68575f2-2cd5-4cb1-9046-a4d669e5b85a`): scheduled Fri Nov 20, marked done Nov 18, "$145 paid by check" that never happened, one date text and one receipt email sent to Hannah. Nothing is deleted in this model; it can be refunded and cancelled once those buttons exist, or left as the example it is.
