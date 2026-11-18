# Admin information hierarchy, actions and flows (design)

Nov 18 2026. Design only; nothing is built until Hannah has read it. Hannah asked for consistent, repeatable patterns: the information hierarchy, how actions work, spacing and sizes, the grids, how things move through flows, and the holographic pass card woven in.

It extends `docs/DESIGN.md` (Uniformity, Tables, Navigation). The Done-and-paid flow is `docs/plans/2026-11-18-done-and-paid-design.md` (branch `claude/musing-lamarr-1a3b82`); it is referenced, not redone.

## 1. Jobs to be done

- **Customers.** Hannah: "Who is this, what have we done for them, what do they owe?" "How do I reach them?" Name, phone, owes and next visit show before any click.
- **Jobs.** Hannah: "What did we sell, what is it worth, is it paid, what is left to do?" One row answers all four.
- **Visits.** Ryan: "What is today, what is next?" "Mark it, next." Day, who and status in one row; Done is one tap.
- **Customer panel.** "They are on the phone." Phone, owes, next visit and the pass at the top.
- **Job panel.** "What is this sale, and what gets it paid?" Lines, visits, money, then the next step as the primary button.
- **Visit panel.** Ryan: "What is the system, what is the code, what did we do last time?" Then Mark done.

## 2. What the tools do

- **Jobber's job page** runs status and client, then line items, visits, billing, notes ([source](https://help.getjobber.com/en/articles/job-basics/)), with Generate Invoice and More Actions top right and edits per section. We follow the order and the More menu, with buttons in a footer a thumb reaches.
- **Jobber's visit screen** leads with Complete Visit; "…" holds Delete ([source](https://help.getjobber.com/hc/en-us/articles/360042930793)). We follow: one primary, delete tucked away.
- **Jobber's mobile client** shows name and balance with call and text icons ([source](https://help.getjobber.com/en/articles/client-information-in-the-jobber-app/)); **Housecall Pro's customer** shows the next three appointments up top ([source](https://help.housecallpro.com/en/articles/9764383-customer-profile-overview)); **ServiceTitan's** has a balance-due row and a More menu ([source](https://help.servicetitan.com/roofing/docs/customer-and-location-records-overview)), and its dispatch flyout links up to the full record ([source](https://help.servicetitan.com/docs/use-the-job-details-flyout-on-the-dispatch-board)). We follow: owes, next and reach-them first.
- **NN/g: a non-modal side panel suits one record beside its table; over two row actions, use a menu** ([source](https://www.nngroup.com/articles/data-tables/)). **Primary is filled, secondary outlined, tertiary plain** ([source](https://www.nngroup.com/articles/button-states-communicate-interaction/)). **Over two disclosure levels hurt** ([source](https://www.nngroup.com/articles/progressive-disclosure/)), so a footer button opens one dialog, never two.
- **NN/g on mobile tables: lock the header and first column** ([source](https://www.nngroup.com/articles/mobile-tables/)). It is silent on list rows; card rows are our call (question 3).
- **Refactoring UI: shrink and lighten labels** ([source](https://www.refactoringui.com/previews/labels-are-a-last-resort)). We use muted labels, medium values.

Not confirmed: which button those tools treat as primary; ours is our own rule.

## 3. One panel recipe

One block, `RecordPanel`, on `SidePanel`, used by Customer, Job and Visit. Each panel passes data, never markup.

**Header.** Name (Barlow Condensed 24px navy), a muted one-line subtitle that never repeats a pill, the pills under it, Close at the right. This changes Uniformity's "no pills in the header": Job and Visit already lead the body with them.

**Facts block**, directly under the header, no heading:

| Panel | Subtitle | Pills | Facts, in order |
|---|---|---|---|
| Customer | street, town | pass status, "Owes $115" | Phone, Email, Next visit (links), Owes, Card, Marketing |
| Job | "Repair · sold Nov 3" or "Season Pass TH-2027-0007 · 2027" | stage, money | Customer (links), Property, Total, Paid, Owed, Next visit |
| Visit | "Spring turn-on, Tue Apr 26" | work, money | When, Who, Minutes, Price, Job (links), Customer phone (tap to call) |

**Sections**, one Barlow Condensed 18px heading each, a quiet Edit or Add link at its right:

- **Customer:** Property, Jobs (job, stage pill, money; opens the job), Season Pass (thumbnail, pass facts, season line; visits and charges live on the job), Notes and history, Messages. Consent history joins Notes and history.
- **Job:** a pass job opens with the pass card and season line as its hero above the facts. Then Lines and total, Visits, Money (payments, bill), Notes and history.
- **Visit:** At the property (address, zones, controller, gate code, access note, must be home), What is included, Its job (one row; a pass visit shows the thumbnail), Notes and history.

**Hidden from a tech:** gate code, access note, on-site phone, email, card, bill, pay link, payment references, footer buttons.

**Footer action bar** (replaces the actions now in the body). Left to right: one filled **primary**, up to two **outline** secondaries, a **More** menu, one **destructive ghost** at the far right. A button either acts at once with a ten-second Undo, or opens one dialog; no form grows in the body. On a phone the primary has its own row.

| Panel, state | Primary | Secondary | More | Destructive |
|---|---|---|---|---|
| Visit, Unscheduled or Not done | Give it a day | Edit | Send a text | Cancel visit |
| Visit, Scheduled | Mark done (Move first before its day) | Move, Not done | Edit, Send a text | Cancel visit |
| Visit, Done | Owed: Collect $145 (Done-and-paid `CollectPayment`). Paid: none | Open job | Send a text | none |
| Job, Needs a quote | Add a line | New visit | none | Cancel job |
| Job, Open | New visit | Add a line | Record the payment | Cancel job |
| Job, Done and Owed | Send a bill | Record the payment | New visit | none |
| Job, Bill sent or Overdue | Remind | Record the payment | Open the pay link | none |
| Job, Season Pass | Change the pass | Send card link | Resend confirmation, Open in Stripe | Cancel pass |
| Customer | New job | Send a text, Edit | Send card link, Record phone opt-out, Send pass offer | none |

A Paid job shows New visit only. Change the pass and Edit become dialogs; Edit customer is new. Once Done-and-paid is built, Send a bill and Record the payment become choices inside `CollectPayment`; we ask that design to open it in a dialog from the footer, so every primary lives there.

**Tokens**, all on the 4px grid: width 360 minimum, 480 default, 70% of the window at most, a phone full width (as built). Side padding 24, header and footer 16 top and bottom, 24 between sections, 8 under a heading. Fact rows 14px with 8 between and a **label column fixed at 112px** (the one addition; today it is `auto` and differs per panel). List rows 44 minimum with a hairline. Type: title 24, subtitle 14, section heading 18, label 14 muted, value 14 medium, pill 12. Buttons 44 tall, 8 apart.

**The pass card.** `PassCard` stays as built, no new size. On a pass job it is the hero at `size="full"` held to the panel's content width (432px at default, about 327px on a phone), interactive on a laptop, above the facts. On the Customer panel it is the 160px `thumb` beside the pass facts; on a pass visit the thumb sits in the Its job row and opens the job. Nowhere else.

```
LAPTOP: the three panels (480px, over the page)
+-- Andrea Reyes -------------- X + +-- Andrea Reyes ------------ X + +-- Andrea Reyes ------------ X +
| 1450 Main St, Erie             | | Season Pass TH-2027-0007 2027  | | Spring turn-on, Tue Apr 26     |
| [Active] [Owes $115]           | | [Open] [$145 owed]             | | [Scheduled] [$145]             |
|--------------------------------| | +----------------------------+ | |--------------------------------|
| Phone      (970) 555-0142      | | |  pass card (432 wide)      | | | When     Tue Apr 26, 8 to 10   |
| Email      andrea@...          | | +----------------------------+ | | Who      Ryan Garner           |
| Next visit Apr 26 (link)       | | Customer   Andrea Reyes        | | Minutes  60                    |
| Owes       $115                | | Property   1450 Main St        | | Price    $145                  |
| Card       Visa 4242           | | Total $290  Paid $145          | | Job      Season Pass (link)    |
| Marketing  Yes                 | | Owed $145  Next  Apr 26        | | Customer (970) 555-0142        |
| Property               Edit    | | Lines and total                | | At the property               |
| Jobs                           | |  Spring turn-on  1 x $145      | |  Zones 8, gate 4410, ...       |
|  Season Pass  [Active]  >      | |  Fall blowout    1 x $145      | | What is included               |
|  Repair  [Done] $115 owed  >   | | Visits                         | | Its job   [thumb card]  >      |
| Season Pass  [thumb] season    | |  Turn-on  Apr 26  [Scheduled]> | | Notes and history              |
| Notes and history              | | Money    Paid $145 by card     | |  [Add note]                    |
| Messages                       | | Notes and history             | |--------------------------------|
|--------------------------------| |--------------------------------| | [Mark done] [Move] [Not done]  |
| [New job][Send a text][Edit][..]| | [Change the pass][Send card link]| | [..]               Cancel visit|
+--------------------------------+ | [..]                Cancel pass | +--------------------------------+
                                   +--------------------------------+

PHONE (375, full sheet; the same order, the footer's primary on its own row)
+------------------------+ +------------------------+ +------------------------+
| Andrea Reyes         X | | Andrea Reyes         X | | Andrea Reyes         X |
| 1450 Main St, Erie     | | Repair, sold Nov 3     | | Spring turn-on, Apr 26 |
| [Active] [Owes $115]   | | [Done] [$115 owed]     | | [Scheduled] [$145]     |
| Phone   (970) 555-0142 | | Customer Andrea  >     | | When  Tue Apr 26, 8-10 |
| Email   andrea@...     | | Total $115  Owed $115  | | Who   Ryan Garner      |
| Next    Apr 26   >     | | Lines and total        | | Job   Repair  >        |
| ... sections scroll    | | ... sections scroll    | | ... sections scroll    |
|------------------------| |------------------------| |------------------------|
| [      New job       ] | | [    Send a bill     ] | | [     Mark done      ] |
| [Send a text][Edit][..]| | [Record the pay][..]   | | [Move][Not done][..]   |
+------------------------+ +------------------------+ +------------------------+
```

## 4. The grids

All four are `DataGrid`. Widths are spans of 12 in `meta.span`, which the grid writes as `<col>` widths. Below 1024px the first column freezes and the rest keep a 96px minimum, scrolling inside the box. Other columns live in the Columns menu and the CSV.

| Grid | Columns and spans (12) | Hidden by default |
|---|---|---|
| Customers | Name 3 (link), Phone 2, Town 1, Pass 2, Owes 1, Next 2, Last visit 1 | Address, Email, Scheduled, Marketing |
| Jobs | Customer 3 (link), Job 2, Status 1, Visits 1, Total 1, Money 2, Next 2 | Property, Sold |
| Visits | Customer 2.5 (link), Town 1, Service 1.5, Day 1, Time 1, Who 1, Status 2, Money 2 | none |
| Schedule day list | Stop 0.5, Customer 3 (link), Town 1, Service 1.5, Time 1, Who 1, Status 2, Money 2 | none |

Customers has ten columns and Jobs nine today; the cap is eight. Owes is new (the sum of its jobs' owed money).

- **Link and row:** the first column is the one link and opens the panel; no other cell is a target.
- **Sort:** every column. Defaults: Customers by name; Jobs bills out first (as built), then newest sold; Visits by day, Unscheduled on top.
- **Filters and header line:** chips in column order and one sentence of counts, as built; search is the name column.
- **Empty:** no data, title and next move (as built); no match, "No jobs match" and Clear filters.
- **Phone:** card rows (question 3) from the panel's own row: name over a muted detail, one pill or money word at the right, 64px tall, the whole row opens the panel.

## 5. How things move

**A website booking.** (1) Home, Needs action: Unscheduled (`bookings.create` does not write the job yet). (2) Jobs: Open, or Needs a quote. (3) Job panel: price the Lines; one Unscheduled visit. (4) Schedule: Place it; the customer is texted. (5) Home, Today: Ahead today; the row opens the visit panel. (6) Visit panel: Mark done, then Collect (Done-and-paid). (7) Jobs: Done, Paid.

**A Season Pass sale.** (1) Checkout or New job; Home alert. (2) Jobs: the pass job opens on its card and season line. (3) Each visit runs steps 4 to 7 above from the job's Visits; the season line fills as they are done.

**A customer calls to move a day.** (1) Customers: search, open the panel. (2) Next visit (a link) opens the visit. (3) Footer Move, pick a day, Undo toast, customer told.

**A quote (future).** (1) New job, "Quote later": Jobs, Needs a quote. (2) Job panel: Add a line per item. (3) Primary becomes Send a quote; stage Quoted. (4) Accepted by link: Open; booking steps 3 to 7.

**Open links and back.** A header link or row (customer, job, visit) opens that record's panel, and the browser's Back returns to the last, because the open record is in the address (`?customer=`, `?job=`, `?visit=`). Close returns to the grid with the row lit. Today's rows open the visit panel in place; Needs action rows should too.

**Where today breaks the pattern**

| Screen | Does now | Should do |
|---|---|---|
| Visit panel | Actions are body forms; two Close buttons; two job links | Footer and dialogs; one Close; one Job row |
| Job panel | Up to seven footer buttons, Open customer among them | Primary, two, More, destructive; customer is a facts link |
| Customer panel | Mixed footer; Bills section and inline text form; Job and Next twice | Footer per section 3; once each |
| All panels | Facts label width `auto`; pills in the body or absent | 112px; pills under the subtitle |
| Customers, Jobs | 10 and 9 columns, auto widths; open record held in state | Spans of 12; record in the address, so Back works |
| Home | Today rows open the panel in place; Needs action rows leave the screen | Both in place (question 1) |
| Phones | Sideways tables; Today's rows are cards | Card rows (question 3) |

## 6. Open questions for Hannah

1. Open a record over the screen you are on, or on its own screen? (Over or Own)
2. Should the pass card be big at the top of a pass job's panel? (Yes or No)
3. On a phone, lists as card rows (this reverses the 2026-11-12 rule "tables are never turned into cards")? (Cards or Table)
4. Is Send a bill the job's primary when a done job owes money, with Record the payment second? (Yes or No)
