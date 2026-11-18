# The admin and Settings as one system (design, step 1: questions first)

Nov 18 2026. **Status: research, direction, a jobs map and the decisions that wait for Hannah. No screens are drawn yet.** Her method change: no designing before her questions are answered. The earlier full draft (wireframes, Settings, component recipe, build order, six Figma frames) is kept at commit `e8af13f` on this branch and in the shared notes folder as `admin-holistic-design-full-draft-v1.md`; it is a draft to be rebuilt from her answers, not a proposal. It still has Routes in it, which she has since removed.

**Hannah's decisions since the draft (settled, not questions):**

| Decision | What it means for the design |
|---|---|
| No seasons screen, no Routes setting, no Areas, no Capacity and windows | Settings is five tabs: People, Services, Billing, Messages, API keys |
| Capacity per kind lives on the person; a service carries optional "bookable from" and "to" | These are the only two inputs to which days a customer may pick |
| More than one truck, Jobber's way | A new truck is a new person with working days and daily capacity by kind; a day is open while anyone has room |
| One scheduling rule, no setting: offer the days best for our current schedule | Open days ranked by nearness to the address (same town that day, then a short drive, then any); first preselected; the same ranking for the pass, online booking and the portal; "day, never a time", the window is told the day before |
| "Order the day" in the Schedule handles drive time | Assigns each stop to a person and orders them by drive time; Ryan can drag between people's rows |
| The customer learns the person's first name only with the day-before text | Nothing on a day card names a person |

## 1. What the best products do, and what we take

Sources are vendor help pages. Where a page was not opened or said nothing, it is marked.

| Product | What it does | We take |
|---|---|---|
| [Jobber](https://help.getjobber.com/en/articles/work-settings/) | Settings from one gear: Company, Work (quotes, jobs, invoices), Team, Products and services. Work settings hold arrival window and invoice terms. Per-service booking availability not found in its help | Settings grouped by what you are setting up, not by database table |
| [Housecall Pro](https://help.housecallpro.com/en/articles/7919484-settings-page-overview), [booking](https://help.housecallpro.com/en/articles/7034474-new-online-booking-settings) | Left rail of settings, sub-tabs on top. Each service has a "Show this service in Online Booking" toggle; its duration lives in the price book; employees are chosen for online booking | The service row owns its online switch and its minutes; a person owns who takes visits |
| [ServiceTitan](https://help.servicetitan.com/docs/configure-manage-your-account-1) | Settings home; roles set scope and defaults per user; zones and skills restrict who may take a job | Roles on the person |
| [Linear](https://linear.app/now/behind-the-latest-design-refresh), [shortcuts](https://linear.app/docs/creating-issues) | Dimmed navigation so the work area leads; softer borders; fewer icons; actions in predictable places; Cmd+K command bar, C to create | A navy rail that recedes; one place for every action; Cmd+K and N on a laptop |
| Stripe ([empty states](https://docs.stripe.com/stripe-apps/patterns/empty-state.md)) | Empty means first use, nothing matched, or all removed; "Clear filters" sits in the filter bar; loading, then error, then empty, then content | The empty-state table in section 9; the render order |
| Shopify ([index](https://shopify.dev/docs/api/app-home/latest/patterns/templates/resource-index), [save bar](https://shopify.dev/docs/api/app-bridge-library/reference/contextual-save-bar)) | One primary action slot per page, others secondary; an index page is a full-width table with filters; settings pages show a Save and Discard bar only once a field changed | One filled button per page header; one save bar for all Settings |

Not found: a first-party Stripe Dashboard design write-up (the Stripe pages above are for Stripe Apps) and Jobber's per-service booking dates. Our "bookable from and to" is the architect's answer, modelled on Housecall Pro's per-service switch.

## 2. The direction

Trailhead's admin looks like a well-kept trail map, not a spreadsheet: a cream canvas, a quiet navy rail that recedes (Linear's lesson), numbers set large in Barlow Condensed, everything else in calm Source Sans 3. Orange is spent on one thing per screen, the primary action, and on the lit nav item; it is never decoration. Structure comes from whitespace and hairlines, not boxes inside boxes. **A screen must never** show two filled buttons, a pill that repeats its own heading, a word an engineer would say ("webhook", "task gave up", "truck"), a table that only works sideways on a phone, a form that grows inside a panel, or a second panel stacked on the first.


## 3. Jobs to be done across the admin

One row per thing a person is trying to get done. "Open" points to a question in section 4; "settled" means a decision above or an approved design already covers it.

| # | Who | Wants to | Today's screen | What is wrong today | Open decision |
|---|---|---|---|---|---|
| 1 | Ryan, in the truck | See today's stops in order and open one | Home (Today), Schedule day | Order is straight-line; the map draws late; Needs action rows leave the screen | Q7 |
| 2 | Ryan | Finish a visit and get paid | Visit panel | One click marks done and records a payment; a wall of inline forms | Settled (done-and-paid); Q6 |
| 3 | Hannah or Ryan, on a call | Take a call and make a job | New job sheet | Refuses a job with no day; 17 unsorted service entries | Settled (day optional, one service per entry) |
| 4 | Hannah | Give a job a day, move it | Visit panel, Schedule, Visits | Visits sits in the nav; no New job on the Schedule | Q1 |
| 5 | Ryan | See which days are filling and where | Schedule week | No sense of neighbourhood; two people are not drawn together | Q4, Q5, Q7 |
| 6 | The customer | Pick or change a day | Checkout, `/book`, portal | Three separate pickers; days from area groups with no weekday | Q5 (the one rule) |
| 7 | Hannah | Know who is calling | Customers panel | Search by name only; a one-off job is invisible in the facts | Settled (audit fixes) |
| 8 | Hannah | See what is unpaid and chase it | Home Needs action, Jobs, job panel | Engineer words; Remind and Record the payment compete as primary | Settled (status words, done-and-paid) |
| 9 | Hannah | See the month and the season | Reports | Counts passes only; a "Quotes awaiting" tile for a feature that does not exist | none |
| 10 | Hannah | Change a person, a service, a message | Settings, seven tabs | Three different ways to save; two tabs Hannah rejected | Q3 |
| 11 | Ryan | Say when a service may be booked | Seasons and Capacity tabs | Confusing; four date fields per season | Settled (service dates); Q9 |
| 12 | Hannah | Add a second truck | People tab | A login row and a truck row for one person | Settled (one person); Q4 |
| 13 | A tech | Do the visit: open the gate, mark it done | Visit panel | Gate code and access note hidden from the person who needs them | Q6, Q8 |
| 14 | Ryan | Hold repair slots in a busy season | Buffer percent in Capacity | A percent nobody can reason about | Q10 |
| 15 | Hannah | Undo a payment or a cancel | Toast only | Nothing after the toast fades; no refund or cancel on one-off jobs | Settled (done-and-paid builds the refund path) |

## 4. Decisions the design cannot make without Hannah

Each is one plain question. The option marked "my pick" is a recommendation, not an answer.

**Q1. Where do individual visits live, now that a job is what you sell?**
- A. A third view on the Schedule, "List", beside Week and Day (my pick). Visits leaves the left column; the same grid and filters stay one click away.
- B. A toggle on Jobs, "Jobs | Visits". Same grid, found where you look for a job.
- C. Keep Visits in the left column. Nothing moves; the confusion the audit found stays.

**Q2. What is on a phone's bottom bar?**
- A. Home, Schedule, Jobs, Customers, and More (Reports, Settings) (my pick).
- B. Home, Schedule, Customers, with Jobs inside a customer and one New job button always in view. Fewer tabs, but Jobs is two taps away.
- C. All six as icons only. Nothing hidden, but labels are lost at 375px.

**Q3. How does a Settings change get saved?**
- A. One save bar that appears when a field changes, with Discard and Save, and a warning before leaving (my pick). One habit on every tab, one change log.
- B. Each field saves when you leave it (People does this today). Fast, but a half-typed price can save.
- C. A Save button on each tab (Services and Billing do this today). Familiar, but the pattern differs by tab.

**Q4. How is a person's daily capacity counted? It decides which days are "open" with two trucks.**
- A. A count per kind per person (6 blowouts, 1 turn-on, 2 repairs), as People has today (my pick). Matches how Ryan thinks and the Jobber data (6 to 8 blowouts a day).
- B. Minutes per person per day, with each service carrying minutes. Truer for mixed days, but Ryan must enter and trust two sets of numbers.
- C. Both, whichever fills first closes the day. Most accurate and most to set up.

**Q5. How far is "near" when ranking days for a customer?** The ranking is: days already in the customer's town, then days with a visit within a short drive, then any open day.
- A. Three tiers, "a short drive" fixed in code at about ten minutes, no setting (my pick). Matches "no setting".
- B. Two tiers: same town, then any open day. Simplest to explain; a second-nearest town gets no credit.
- C. Three tiers with the drive time as a number Ryan can change. Flexible, but it is a setting, which you ruled out.

**Q6. Who may collect payment after Mark done?**
- A. Only an owner or admin; a tech marks done and the visit shows "Ryan will collect" (my pick). Money stays with the owner.
- B. A tech may also record cash and checks they are handed, but not charge a card or send an invoice. A truck can take a check at the door.
- C. Any person collects everything. Fastest on a second truck, widest money access.

**Q7. When does "Order the day" run?**
- A. Only when someone presses it on a day; it shows the result with Undo (my pick). Nothing moves until you say so (ServiceTitan's Assist mode).
- B. Automatically each time a visit is placed or moved, and a drag locks that stop. Always tidy; things move without being asked.
- C. Automatically the evening before, plus the button at any time. The day is ready in the morning; the day can still change under you overnight.

**Q8. May a tech see the gate code and access note?**
- A. Yes, for visits today and ahead, never past ones (my pick). They have to open the gate.
- B. No; the owner tells them. The Nov 17 rule stands, and a second truck cannot work alone.
- C. Yes for every visit they have ever had. Simplest, widest.

**Q9. When may a Season Pass be sold, and may the office book out of season?**
- A. The pass is sold Nov 1 to Jun 15 (a "wrapping" range), and the office may book any service any day (my pick). Customers see "Opens Apr 15"; Ryan is never blocked.
- B. The pass sells all year. A customer who buys in July holds a turn-on that has already passed.
- C. The office is held to the dates too. Consistent, but Ryan cannot book a late repair of a seasonal service.

**Q10. Keep any room back for repairs and weather?**
- A. No. Repairs are their own capacity kind per person, which already reserves slots (my pick).
- B. Keep a percent per person, held back for the first weeks of each service. The old Capacity tab's buffer, now on the person.
- C. Keep one number for the whole company. Less to set, less exact.

## 5. What happens next

On Hannah's answers I rebuild the full design from the kept draft: navigation, Home, Schedule (week and day for two people, the map, and the "Order the day" button), the New job sheet with Who as "First with room", Jobs, Customers, Reports, both panels, Settings in five tabs, the component recipe and the build order. Nothing is drawn until then. The draft's Figma file stays as a reference only: [Trailhead admin: holistic design](https://www.figma.com/design/9TYdPIzdG8MLrHJm4qiUBu).
