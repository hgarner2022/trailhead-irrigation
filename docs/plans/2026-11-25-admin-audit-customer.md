# Admin audit: the customer object and the links between records (Nov 25 2026)

Hannah: "Audit the customer object, the quote object, and every object. Things need to be consistent when done, like links with the customer object. Too many links. It needs to be cleaned up."

Scope of this document: the customer object and every link between records. Read-only audit of `review-prototypes` at `42949088`. No source file was changed. Screenshots are in `docs/review/2026-11-25-admin-audit-customer/`.

How it was done: a Storybook on port 6013, a headless Chromium at 1280 and 375 that rendered each story, saved the screenshot and counted every visible link and button with its colour, underline, height and address (the numbers in section 2 are that count, not an estimate), and a second script that clicked each kind of link in the clickable walkthrough and recorded where it landed. The code was read for every count that looked wrong.

## 1. Summary

1. Hannah is right, and it is measurable. The customer page for a pass holder has **57 things to click, 39 of them orange, 22 of them record chips**; the Invoices list has 45 orange targets in nine rows; the Jobs grid 36 in twelve.
2. The cause is one rule taken literally: "a record's name is always a `RecordChip`" (record-links research, rule 1). It made every job, day, person, address, invoice and customer name an underlined orange link with an icon, in every row.
3. The customer is linked **three ways on one screen** on the quote page and the invoice page (a chip beside the title, the Customer card in the aside, and the address chip, which also opens the customer).
4. There are **five different renderings of "a customer's name you can click"**: `RecordChip`, `AsideCard`'s hand-rolled link, the grid's plain orange name, the shipped `RecordLink`, and a summary-band tile.
5. The same-looking name does different things: in the Jobs grid "Andrea Dalton" opens the **job**; in Invoices and Quotes it opens the **customer**; in Requests the row has the name twice, one opening the request and one the customer.
6. Many links leave the context for little: all person chips go to Settings, People; day chips go to the Schedule; the address chip on the customer's own page links to the page you are on.
7. Dead ends in the component code (hidden by the walkthrough's rewiring): the job page's customer name, "See all 7" and the Jobs grid's property chip all point at the Customers **list**, not the customer.
8. The customer page itself is sound in structure but repeats itself: unpaid is said five times, the Season Pass four, the card three, the open invoice is linked three times.
9. On a phone the customer's **phone number is at the bottom of a 5,700px page** and there is no Call or Text in the header, so Ryan's first job (call or text this person) is the furthest thing away.
10. Recommendation: one link rule with a budget (section 4): the row's own record plus at most one other; one customer link per record page; people, days and addresses are text. That removes roughly two thirds of the orange without removing a single route.

## 2. Link inventory

"Click" is every visible link or button outside the left rail. "Orange" is the subset drawn in the link colour. "Chips" is `RecordChip`s. "To customer" is how many targets on that screen open the customer (or the Customers list).

### 2.1 Counts per screen (1280 wide unless noted)

| Screen (story) | Click | Orange | Chips | To customer | Screenshot |
|---|---|---|---|---|---|
| Jobs grid, 12 rows (`admin-jobs-grid--jobs-grid`) | 53 | 36 | 24 (12 job, 12 property) | 12 (property chips, all to the list) | `01-jobs-grid-1280.jpg` |
| Invoices list, 9 rows | 62 | 45 | 27 (9 invoice, 9 customer, 9 job) | 9 | `11-invoices-list-1280.jpg` |
| Quotes list, 7 rows | 45 | 21 | 14 (7 quote, 7 customer) | 7 | `06-quotes-list-1280.jpg` |
| Requests list, 6 rows | 20 | 7 | 1 | 1 | `08-requests-list-1280.jpg` |
| Customers list (walkthrough), 19 rows | 71 | 38 | 19 (property) | 19 (each a second link to the row's own customer) | `40-walk-customers-list-1280.jpg` |
| Job page, one trip, scheduled | 40 | 16 | 9 (3 job, 3 day, 3 person) | 3 | `02-job-page-scheduled-1280.jpg` |
| Job page from a quote | 17 | 9 | 1 | 1 | `05-job-from-quote-1280.jpg` |
| Quote page, sent | 15 | 6 | 2 | **3** | `07-quote-page-sent-1280.jpg` |
| Invoice page, sent | 17 | 7 | 4 | **3** | `12-invoice-page-sent-1280.jpg` |
| Request page, matched | 12 | 4 | 1 | 2 | `09-request-page-match-1280.jpg` |
| **Customer page, pass holder, unpaid** | **57** | **39** | **22** (8 job, 5 day, 5 person, 3 invoice, 1 property) | 1 (itself) | `13-customer-page-pass-unpaid-1280.jpg` |
| Customer page, same, 375 | 45 | 17 | 3 | 1 | `17-customer-page-pass-unpaid-375.jpg` |
| Home, busy day (shipped screen) | 28 | 0 | 0 | 0 | `21-home-busy-1280.jpg` |
| Schedule week (shipped screen) | 62 | 0 | 0 | 0 | `23-schedule-week-1280.jpg` |
| Visit panel (shipped screen) | 54 incl. the grid behind | n/a | 0 | **0** | `26-visit-panel-1280.jpg` |
| Job panel (shipped screen) | 43 incl. the grid behind | n/a | 0 | 1 | `27-job-panel-owed-1280.jpg` |
| Customer panel (shipped screen) | 81 incl. the grid behind | n/a | 0 | 0 | `28-customer-panel-1280.jpg` |

### 2.2 Every place the customer is named, how it looks, where it goes

| Screen | Where on the screen | How it looks | Component | Goes to | Preview on hover | File |
|---|---|---|---|---|---|---|
| Jobs grid | Customer column | Orange name, no underline, no avatar, 20px tall | `DataGrid` name cell (a `<button>`) | **The job** (the row's record), not the customer | No | `design/JobsGridDesign.tsx:49` |
| Jobs grid | Property column | Pin icon, orange, underlined | `RecordChip kind="property"` | `/admin/customers` (the **list**); the walkthrough rewires it to the customer at `#property-h` | No | `JobsGridDesign.tsx:53`, `walkthrough/WalkScreens.tsx:45` |
| Jobs grid, phone | Card | Whole card is one button; the customer's name on top is orange like a link, but the card opens the job | `DataGridCard` | The job | No | `47-jobs-grid-375.jpg` |
| Invoices list | Customer column | Initials avatar, orange, underlined, red dot for Do not service | `CustomerChip` | Customer page | Yes | `design/InvoicesPage.tsx:91` |
| Quotes list | Customer column | Same | `CustomerChip` | Customer page | Yes | `design/quotes/QuotesList.tsx:85` |
| Requests list | Request column | Orange name, no underline (it is the person who wrote in) | `DataGrid` name cell | The request | No | `design/requests/RequestsList.tsx` |
| Requests list | Customer column | Avatar chip, same name again, or "No match" | `RecordChip kind="customer"` | Customer page | **No** (no `preview` passed) | `RequestsList.tsx:33` |
| Customers list | Customer column | Orange name, no underline, "Do not service" tag beside it | `DataGrid` name cell | Customer page | No | `WalkScreens.tsx:99` |
| Customers list | Property column | Pin chip | `RecordChip kind="property"` | The same customer, at Property | No | `WalkScreens.tsx:101` |
| Job page | Page title | Plain H1, the customer's name | `RecordPage title` | Nothing | No | `design/JobPage.tsx:33` |
| Job page | Where tile in the band | Tile with chevron | `SummaryBand` cell | Customer at `#property-h` (default id `c-1` when none is passed) | No | `JobPageParts.tsx:105` |
| Job page | Customer card in the aside | 40px initials circle, orange semibold name, **no underline** | `AsideCard` (hand-rolled `Link`) | `/admin/customers` (the **list**) in the component; the walkthrough rewires it | **No** | `JobPageParts.tsx:163`, `blocks/AsideCard.tsx` |
| Job page | "See all 7" under Past visits | Orange text link | `Link` | `/admin/customers` (the list) | No | `JobPageParts.tsx:148` |
| Job from a quote | Customer card | Same `AsideCard` | `AsideCard` | Customer page (correct id here) | No | `quotes/ApprovedJobPage.tsx:80` |
| Quote page | Beside the title, after the status pill | Small avatar chip, underlined | `CustomerChip` | Customer page | Yes | `quotes/QuotePage.tsx:98` |
| Quote page | Customer card in the aside | `AsideCard` (big circle, no underline) | `AsideCard` | Customer page | No | `QuotePage.tsx:107` |
| Quote page | Property card, Address | Pin chip | `AddressChip` | Customer page at Property | No | `QuotePage.tsx:109` |
| Invoice page | Beside the title | Avatar chip | `CustomerChip` | Customer page | Yes | `design/InvoicePanel.tsx:117` |
| Invoice page | Customer card in the aside | The **same chip again** (not `AsideCard`), phone under it, "Contact by text" | `CustomerChip` in a `SectionCard` | Customer page | Yes | `InvoicePanel.tsx:127` |
| Invoice page | Property card, Address | Pin chip | `AddressChip` | Customer page at Property | No | `InvoicePanel.tsx:142` |
| Request page | Page title | Plain H1, the person's name | `RecordPage title` | Nothing | No | `requests/RequestPage.tsx` |
| Request page | Customer tile in the band | Tile with chevron, "Andrea Dalton, Same email and phone" | `SummaryBand` cell | Customer page | No | `09-request-page-match-1280.jpg` |
| Request page | Customer match card | "Matches" then an avatar chip | `RecordChip kind="customer"` | Customer page | **No** | `RequestPage.tsx:258` |
| Customer page | Address in the Property card | Pin chip | `AddressChip` | **The page you are on** (`?customer=<same>#property-h`) | No | `design/CustomerPage.tsx:191` |
| Cmd+K | Customers group | Plain row: people icon, name, "480 Briggs St, Erie · Active", phone | `CommandSearch` item | Customer page | n/a | `42-walk-cmdk-andrea-1280.jpg` |
| Cmd+K | Requests and Jobs groups | Row starting with the customer's name | `CommandSearch` item | The request or the job | n/a | same |
| Home (shipped) | Today's jobs row | First name and town, whole row is a button | `TodayVisitRow` | The visit panel | No | `21-home-busy-1280.jpg` |
| Home (shipped) | Needs action row | Sentence plus one outline button ("Open job", "Open visit", "Open customer") | `NeedsAttention` + `RecordLink` | The named record's panel | No | `blocks/NeedsAttention.tsx:101` |
| Schedule week, day, list (shipped) | Block, stop row, List's Customer column | First name and town in a button; List: orange name button | `WeekGrid`, `StopRow`, `DataGrid` | The visit panel | No | `23-schedule-week-1280.jpg` |
| Visit panel (shipped) | Title | Plain H2, the customer's name | `RecordPanel` | **Nothing. The visit has no link to its customer at all**; only Job is linked | No | `_screens/VisitPanel.tsx:45`, `26-visit-panel-1280.jpg` |
| Job panel (shipped) | Customer fact | Orange underlined text, 14px, 20px tall | `RecordLink` | Customer panel, in place, with "‹ back" | No | `_screens/JobPanel.tsx:121`, `27-job-panel-owed-1280.jpg` |
| Customers list (shipped) | Name column | Orange name button | `DataGrid` | Customer panel | No | `28-customer-panel-1280.jpg` |
| Messages (Send a message dialog, Messages table) | To line and rows | Plain text | none | Nothing | No | `design/MessageDialog.tsx`, `CustomerTables.tsx:140` |

### 2.3 Links from the customer page to other records (pass holder, unpaid)

| Section | What is linked | Count | Goes to |
|---|---|---|---|
| Band | Next visit, Unpaid, Season Pass (tiles) | 3 | The job, the invoice, the pass job. Card on file scrolls down the page |
| Jobs table | Job name, day, person in each of 5 rows | 15 | Job page; Schedule's Day view; **Settings, People** |
| Season Pass card | none in this state ("Renewed from" and "Earlier seasons" add job chips) | 0 | |
| Billing | The open invoice in the banner, again as a row, a paid invoice, the job under each invoice and payment | 3 invoice + 3 job | Invoice page; job page |
| Billing | Remind, Update card, Open in Stripe, receipt and overflow icons | 9 | Dialogs, Stripe, receipt |
| Messages | The date of each row is the orange name link | 3 | The message (a toast in the prototype) |
| Aside | Phone, email, address chip, two Edit, Consent history | 6 | `tel:`, `mailto:`, **this page**, dialogs |

Clicked and confirmed in the walkthrough: a person chip lands on Settings; a day chip lands on the Schedule's day; the address chip stays on the customer; from Invoices, a customer chip opens the customer and its crumb then reads "‹ Customers" and returns to the Customers list, not to Invoices.

## 3. Findings

Severity: **High** is a wrong destination, a missing route, or the thing Hannah named. **Medium** is an inconsistency that makes the admin feel like several products. **Low** is polish.

### A. Too many links

**A1. The "always a chip" rule floods every table. High.**
What: every cell that names anything is an underlined orange chip with an icon square. Invoices: 3 chips a row plus Remind, Collect payment and a receipt icon, so 5 to 6 orange targets a row and 45 on the screen. Customer page Jobs table: job, day and person linked in each row.
Where: `InvoicesPage.tsx:86-92`, `JobsGridDesign.tsx:50-55`, `CustomerTables.tsx:46-65`, `QuotesList.tsx:80-85`.
Evidence: `11-invoices-list-1280.jpg`, `01-jobs-grid-1280.jpg`, `13-customer-page-pass-unpaid-1280.jpg`.
Why it matters: when everything is orange and underlined nothing is. Status pills and the past-due red have to compete with link colour; choosing among many similar targets is slower (Hick's law); and `docs/DESIGN.md` line 148 already says the opposite of what was built: "the first column is the link that opens the record ... nothing else on the row is a target".
Recommendation: adopt the budget in section 4. In a table: the first column is the row's own record; at most one more record (the customer) is a link, drawn quietly; job, day, person and address are plain text. Row actions stay, one visible plus overflow.

**A2. Person chips: about one per row, all to Settings. High.**
What: "Ryan", "Hannah", "Tech Two" are chips in the Jobs grid's Who column, the customer page's Jobs table, the job page's Past visits and the trip's Who fact. Every one goes to `/admin/settings?tab=people`. Five on one customer page.
Where: `record-preview-model.ts` (`recordHref.person`), `CustomerTables.tsx:65`, `JobPageParts.tsx:141`, `TripBody.tsx:37`, `JobsGridDesign.tsx:55`.
Evidence: `13-customer-page-pass-unpaid-1280.jpg`, `02-job-page-scheduled-1280.jpg`; walkthrough click landed on `settings`.
Why: Ryan clicking his own name on a customer's job row is thrown into Settings and loses the customer. A person has no page, so by the research's own rule 1 it should be the quiet, unlinked form.
Recommendation: a person is never a link outside Settings. Show initials and name as text (the Home row's "RG" badge is already this).

**A3. Day chips in every row. Medium.**
What: each job row's day is a chip to the Schedule's Day view (5 on the customer page, 3 in Past visits). Hannah asked for "a scheduled day is a link" on the job page's When tile; it was then applied to every past and future day in every table, including days in 2025.
Where: `CustomerTables.tsx:58`, `JobPageParts.tsx:140`.
Recommendation: keep the day link in exactly one place per record: the When tile (or the next visit). A past day, and a day in a table row, is text.

**A4. The address chip is a second link to the customer, and on the customer page a link to itself. High.**
What: "Property: 480 Briggs St" is a chip whose address is `/admin/customers?customer=<id>#property-h`. On the quote and invoice pages that is a third route to the customer. On the customer page it reloads the page you are on. On the Customers list it is a second link in every row to the same place as the name (19 extra links). The research's rule 9 says "an address is not a record".
Where: `RecordChips.tsx` (`AddressChip`, `propertyHref`), `CustomerPage.tsx:191`, `WalkScreens.tsx:101`, `QuotePage.tsx:109`, `InvoicePanel.tsx:142`.
Evidence: `13-...`, `40-walk-customers-list-1280.jpg`, `07-...`, `12-...`.
Recommendation: an address is text everywhere. If it does anything, it opens maps for directions (question 4). Remove `AddressChip`.

**A5. The same record linked more than once on one screen. Medium.**
- Quote page: customer chip by the title, Customer card, address chip. Three. `07-quote-page-sent-1280.jpg`.
- Invoice page: customer chip by the title, the same chip in the Customer card, address chip. Three. `12-invoice-page-sent-1280.jpg`.
- Request page: Customer tile in the band and the chip in Customer match. Two. `09-request-page-match-1280.jpg`.
- Customer page: invoice INV-2026-0042 is the Unpaid tile, the chip in the Billing banner and the chip in the invoice row. Three. "Sprinkler repair" is in the Jobs table and again under its invoice.
- Requests list: the person's name in column one and the matched customer chip beside it, the same words twice.
Recommendation: one link per distinct record per screen (section 4, rule 2). On a record page the customer lives in the aside Customer card only; drop the chip beside the title (the title area is for this record's own status). In Billing, the banner says the words and the row carries the link.

### B. Inconsistent look and behaviour

**B1. Five renderings of a clickable customer name. High.**
(1) `CustomerChip`: small avatar, underlined, hover card. (2) `AsideCard`: 40px circle, no underline, no hover card. (3) grid name cell: orange, no underline, no avatar. (4) shipped `RecordLink`: underlined text, no avatar. (5) summary-band tile on the request page.
The quote page shows (1) and (2) side by side; the invoice page uses (1) inside the same card where the job and quote pages use (2), so the "Customer" card is two different components across four record pages, and only the invoice's adds "Contact by text".
Where: `blocks/AsideCard.tsx`, `InvoicePanel.tsx:125-131`, `QuotePage.tsx:107`, `JobPageParts.tsx:163`.
Evidence: `07-...` against `12-...` against `02-...`.
Recommendation: one `CustomerCard` for every record page's aside (name as the one chip with the preview, phone, email, address as text, "Contact by text"), used by job, quote, invoice and request. Retire `AsideCard`'s hand-rolled link. Section 4 fixes the two list forms.

**B2. The same-looking name opens different things. High.**
In the Jobs grid the orange "Andrea Dalton" opens the job. In Invoices and Quotes the orange "Joe Alvarez" opens the customer. In Requests "Andrea Dalton" appears twice in one row and the two go to different pages. In the shipped Schedule List the orange customer name opens the visit.
Where: `JobsGridDesign.tsx:49`, `RequestsList.tsx`, `_screens/visits-columns.tsx`.
Evidence: `01-...`, `08-requests-list-1280.jpg`, `11-...`.
Why: a link should say where it goes (WCAG 2.4.4 Link Purpose; 3.2.4 Consistent Identification). Jobber's Jobs list has the same shape (client name first) but the whole row opens the job and nothing in it is styled as a separate link.
Recommendation: the first column names the row's own record: Jobs leads with the job ("Sprinkler repair") with the customer as the second column, exactly like Invoices and Quotes lead with their number. Then "a customer's name opens the customer" is true on every screen. If Hannah prefers Jobber's customer-first Jobs list, keep the name first but as plain navy text and let the row open the job (question 2).

**B3. Two navigation models: pages in the prototype, panels in the shipped screens. Medium.**
The design prototype opens every record as a full page with a crumb to its own list. The shipped Home, Schedule, Jobs and Customers open records in the side panel through `RecordHost` with "‹ Andrea Reyes" as the way back, and the walkthrough mixes both (Home and Schedule are the shipped screens). The research's rule 5 says "click opens the record in place (the one panel)"; the prototype does not.
Consequence seen in the walkthrough: Invoices, then a customer chip, then the crumb "‹ Customers" lands on the Customers list. The invoice list, its filters and the place in it are gone.
Recommendation: decide once (question 1). Default: pages are the record's home (Jobber, and what Hannah approved), and the crumb is where you came from when you came from another record ("‹ INV-2026-0042"), falling back to the list. Peeking without leaving is the chip's hover card, so the panel is not needed for records that have pages.

**B4. Three pages are titled with the customer's name. Medium.**
The job page's H1 is "Andrea Dalton". The request page's H1 is "Andrea Dalton". The customer page's H1 is "Andrea Dalton". Quote and invoice pages are titled by their number. With a pass holder's three jobs open in tabs, three tabs say the same thing.
Where: `JobPage.tsx:33`, `ApprovedJobPage.tsx:71`, `RequestPage.tsx`.
Recommendation: a record page's title is that record ("Sprinkler repair" with "Andrea Dalton · 480 Briggs St, Erie" under it; a request: "Request: larger sprinkler repair"). The customer is the first card in the aside. This is a change to an approved layout, so it is question 3 with the default "keep the name as the title on the job page, as Jobber does, but make it the one customer link and drop the Customer card's name".

**B5. Contact details are drawn four ways. Medium.**
- Phone link height: 44px on the customer, job, quote and invoice pages; **20px** on the request page and in the shipped visit, job and customer panels (below Apple's 44pt and under WCAG 2.5.8's 24px floor).
- Phone icon: only in `AsideCard`. Underline: only in the shipped panels.
- `tel:` format: `tel:+19705550123` on the customer, job and invoice pages; `tel:9705550148` (no country code) on the quote page, the job from a quote and the request page (`QuotePage.tsx:107`, `ApprovedJobPage.tsx:80`, `RequestPage.tsx:168`).
- Email: a `mailto:` link on the customer and request pages; **plain text** in the shipped customer panel; absent from the job, quote and invoice pages.
- "Contact by text" (the customer's channel) shows on the invoice page only; the request page calls the same fact "Reach by"; the customer page puts it at the bottom of the Consent card as a select.
- Address: "480 Briggs St, Erie" (grids, request facts, subtitle), "480 Briggs St" over "Erie, CO" (aside and band), "480 Briggs St" alone (chip).
Recommendation: one `ContactLines` block (phone with one `tel:` helper, email, channel word "Contact by text") used inside the one `CustomerCard`; one `formatAddress(short | full)` helper.

**B6. Record chips that carry no preview. Low.**
`CustomerChip` shows the hover card; the customer chips on the Requests list and the request page's match card, every chip on the Jobs grid, `QuoteChip`, `PaymentChip` and `AddressChip` do not. A user learns "hover shows a card" on one screen and gets nothing on the next.
Recommendation: with the budget in section 4 there are few chips left; every one of them gets the preview.

### C. Dead ends and wrong destinations

**C1. Component links that go to the Customers list. High at build time.**
`JobPageParts.tsx:163` (the job page's customer name), `:148` ("See all 7") and `JobsGridDesign.tsx:53` (property chip) are `href="/admin/customers"`; `bandItems` falls back to customer `c-1` for the Where tile (`:105`). The walkthrough hides all four by rewriting them (`WalkScreens.tsx:45` says so in a comment). Whoever wires the job page from the component gets four links to the wrong place.
Evidence: the census of `02-job-page-scheduled-1280.jpg` (addresses listed in section 2.2).
Recommendation: `Aside` and `PastVisitsCard` take a `customerId`; no page component contains a bare `/admin/customers`. Add it to the design gate.

**C2. The visit has no route to its customer. High.**
The shipped visit panel names the customer only as its title. The one linked fact is Job. From a stop on the Schedule, reaching the customer (to see what they owe, their other jobs, their consent) is visit, then job, then customer.
Where: `_screens/VisitPanel.tsx:45`. Evidence: `26-visit-panel-1280.jpg`.
Recommendation: the visit's facts get a Customer line built from the one `CustomerCard` data, the same as the job panel has.

**C3. Messages name no one and link to nothing. Low.**
A row in a Messages table opens the message; it has no link to the job, visit or invoice it was about, and the message dialog's "To" is text. Acceptable while Messages only appears inside a record. If a Messages list is ever built it needs the customer as its one extra link.

**C4. Story chrome. Low.**
The standalone Invoices and invoice-page stories light "Jobs" in the rail and have no Invoices item; the walkthrough has one. Not a product defect, but a reviewer reading the story sees the wrong place lit (`11-...`, `12-...`).

### D. The customer object itself

Looked at: `admin-customer-page--pass-holder-unpaid` at 1280 and 375, the one-off, Do not service and nothing-yet states at 1280 (census only for the last three), the walkthrough's Andrea Dalton, and the shipped customer panel.

**D1. On a phone, calling the customer is seven screens down. High.**
At 375 the page is 5,729px tall and the aside (Contact, Property, Consent) is stacked after Notes and history. The header's actions are New job, Send a message, Collect payment, More. There is no Call. The shipped panel it replaces has Call and Send a text in its footer.
Evidence: `17-customer-page-pass-unpaid-375.jpg`.
Recommendation: below `md`, Contact and Property come directly after the band, before Jobs; the header's second action on a phone is Call (a `tel:` link), with Send a message beside it. On a laptop the aside is already beside the band and needs no change.

**D2. Each fact is said several times. Medium.**
For this customer: **Unpaid $145** is in the band tile, the Collect payment button's reason for being, the Billing banner, the Billing totals and the invoice row (and the Jobs row says "Invoice sent"). **Season Pass 2027** is a header badge, a band tile, the first Jobs row and its own card. **Visa 4242** is a band tile and a Billing row. DESIGN.md's rule for the Billing card is "each fact is said once"; the page as a whole does not follow it.
Recommendation: the band is the summary and the sections are the detail, so remove the middle layer: drop the "Season Pass 2027" badge (the pill row keeps status and Do not service only), drop Billing's Total, Paid, Unpaid trio when a banner already says it, and let the Card on file tile be the only place the card is named outside Billing's own row.

**D3. Order does not follow Ryan's jobs. Medium.**
Order today: Jobs, Quotes, Season Pass, Billing, Messages, Photos, Notes and history. An empty "Quotes: No quotes." card sits second for every customer who never had a quote, above the Season Pass and above money.
Recommendation: Jobs, Billing, Season Pass (only for a holder, as now), Quotes (only when there is one; "New quote" is already under More), Notes and history, Messages, Photos. Notes ("gate sticks, dog is friendly") matter more on the way to a job than the message log.

**D4. What Ryan needs, checked one by one.**
| Job to be done | On the page today | Verdict |
|---|---|---|
| Call | Phone link in Contact; top right on a laptop, bottom on a phone; no Call action | Fails on a phone (D1) |
| Text | "Send a message" in the header | Works |
| Find the next visit | Band tile "Next visit Thu, Nov 19, 2:30 pm, Ryan", links to the job | Works. It opens the job, not the visit or the day; I did not check that the tile's job is the one holding that visit in every fixture |
| Collect payment | "Collect payment" in the header when something is unpaid; Remind on the invoice row | Works |
| See what they owe | Band, banner, totals, row | Works, over-said (D2) |
| See the yard | Property card: zones, controller, backflow, gate code, must be home, access note | Works on a laptop; near the bottom on a phone (D1). No contact-at-the-property name and phone, which the data model and the shipped panel have (`contact_name`, `contact_phone`) |

**D5. Archive and Do not service are consistent where shown; the mark is not shown everywhere. Low.**
The Do not service mark is a red tag on the customer page and the Customers list and a small red dot on a `CustomerChip` (Invoices list, invoice page). It is absent from the job page's Customer card (`AsideCard` has no flag), the quote page's card and the Jobs grid (none of the three has a way to show it in code); Cmd+K was not checked for it. A job page is where Ryan most needs it.
Recommendation: the one `CustomerCard` carries the tag; a customer's name in any list carries the dot.

**D6. Words. Low.**
The archive confirmation says "Andrea Dalton owes $145" (`CustomerPage.tsx`, archive dialog). Hannah's money words are Unpaid, Invoice sent, Past due; "owed" was retired on Nov 18. Not changed here (no invented copy): flagged for her.

**D7. Shipped panel versus prototype page. Low.**
The shipped customer panel still shows facts the page dropped or renamed (Job, Next, Scheduled, Last visit, Marketing Yes) and email as plain text. It is superseded by the page; nothing to fix until the page is wired, but the panel should not be polished further.

### E. Against the record-links research (PR 115)

| Research rule | Shipped in the prototype? |
|---|---|
| 1. A record's name is always a chip, on asides, bands, rows, Notes and history, Cmd+K, Home | Partly, and too literally. Rows: yes, to excess (A1). Asides: job and quote pages use `AsideCard`, not the chip. Notes and history, Home rows, Cmd+K: plain (correctly so for Cmd+K and Home, which are whole-row targets under rule 7) |
| 2. Orange, thin underline, icon or initials | Yes for chips; the grid name and `AsideCard` are orange without underline |
| 3. Kind for screen readers | Yes ("Customer: Andrea Dalton"), including in `AsideCard` |
| 4. Hover, focus, long-press preview | Only `CustomerChip`, `JobChip`, `InvoiceChip`, `PersonChip`, `DayChip` (B6) |
| 5. Click opens in place in the one panel | No. The prototype navigates to pages (B3) |
| 6. One data object, three renderings | Preview builders exist; `AsideCard` and Cmd+K rows do not read them |
| 7. A chip never sits inside a row that is itself a target | Broken on the embedded tables and lists: the row opens its record and holds three chips |
| 8. A scheduled day is a link | Yes, and extended to every past day (A3) |
| 9. Phone and address are not records | Phone: yes. Address: no, `AddressChip` exists (A4) |

The research said "someone should screenshot Attio, Linear and Mailchimp before we lean on the K rows". That was not done before rule 1 was applied everywhere. Rule 1 is the one to amend.

## 4. Proposed: one link pattern, with a budget

The principle: **a link is a promise of a different place worth going to.** A name that goes nowhere new, or somewhere unrelated to the task, is text.

### 4.1 Which things are records you can open

| Thing | Link? | Why |
|---|---|---|
| Customer, job, quote, invoice, request | Yes | Each has a page |
| Visit | Yes, from the job page and the Schedule | It is a trip of a job |
| Payment | Only as "Receipt" on its own row | It has a receipt, not a page |
| Day | Once per record: the When tile or next visit | Hannah's rule; not every date |
| Person (Ryan, Tech Two) | **Never** | No page; Settings is not where the reader wants to go |
| Address | **Never a record link** | Not a record (research rule 9). Text, or maps |
| Phone, email | `tel:` and `mailto:`, always the same block | Not records |

### 4.2 The three forms, and when each is used

| Form | Looks like | Use it when | Never |
|---|---|---|---|
| **Name link** | The record's name in orange, medium weight, no icon; underline on hover and focus | The first column of a list or embedded table (the row's own record), and the one other record in a row (the customer), which is drawn in navy with the underline on hover so the row has one orange thing | Twice for the same record in a row |
| **Chip with preview** | Icon or initials, name, thin underline, the hover card | A record named on its own as a relation: the Customer card in a record page's aside, "From quote Q-2026-0005", "Matches Andrea Dalton", "Renewed as", the invoice in Billing | Inside a table row; for a person, a day in a row, or an address |
| **Button** | An outline or filled button with a verb | An action, including the one "Open job" on a Home Needs action row and on a "became a job" page | As a second way to open something already linked on the same screen |

Whole-row targets (Home rows, Schedule blocks, phone cards, Cmd+K results) are one button with no links inside, as now.

### 4.3 The budget

1. **A table row: at most two record links** (itself, and the customer or the job), plus one visible action and an overflow menu.
2. **A record page: one link per distinct other record.** The customer is linked once, in the aside's Customer card. Not beside the title, not through the address.
3. **Never link to the page you are on.**
4. **A band tile links only to a different record or scrolls to its section**; it is the one place the day link lives.
5. **Every chip has a preview; every customer name carries the Do not service mark.**
6. **One Customer card** (`CustomerCard`: chip, phone, email, address as text, "Contact by text", the Do not service tag) on the job, quote, invoice and request pages and in the visit's facts, reading `customerPreview`'s data.
7. **A customer's name opens the customer, everywhere.** A list whose rows are not customers does not lead with a customer-coloured name (B2).
8. **The way back names where you came from** when that was another record; otherwise the list.

### 4.4 What this does to the counts (estimate, from the census)

| Screen | Orange now | After |
|---|---|---|
| Invoices list, 9 rows | 45 | about 19 (9 invoice names, 9 quiet customers shown navy, one action a row counted with them) |
| Jobs grid, 12 rows | 36 | 12 |
| Customer page, pass holder | 39 | about 14 (5 job names, 2 invoices, the day tile, phone, email, row actions) |
| Quote page | 6, three to the customer | 4, one to the customer |
| Customers list, 19 rows | 38 | 19 |

Every destination that exists today is still reachable in the same or one more click; only repeats, self-links, people and addresses stop being links.

## 5. Questions for Hannah (one at a time, each with a default)

1. **Page or panel?** When Ryan clicks a customer on an invoice, does he go to the customer's page (as the prototype does) or does it slide in over the invoice (as the live Schedule does)? Default: the page, with the way back reading "‹ INV-2026-0042".
2. **Jobs list: job first or customer first?** Default: job first ("Sprinkler repair", then the customer), like Invoices and Quotes lead with their number, so a customer's name always opens the customer.
3. **Job page title.** Keep the customer's name as the title (Jobber does) or title it with the service? Default: keep the name, make it the one link to the customer, and remove the name from the Customer card under it.
4. **Addresses.** Plain text, or a tap opens maps for directions? Default: plain text on a laptop, opens maps on a phone.
5. **People.** OK that "Ryan" is never a link outside Settings? Default: yes.
6. **Past days.** OK that only the next or current day links to the Schedule, and past days are text? Default: yes.
7. **Phone layout of the customer page.** Contact and Property right after the summary, and a Call button in the header on a phone? Default: yes.
8. **Empty Quotes card.** Hide the Quotes section for a customer with no quotes (New quote stays under More)? Default: yes.
9. **"Season Pass 2027" badge beside the name.** Remove it, since the band tile and the card both say it? Default: remove.
10. **The archive message says "owes $145".** Reword to your money words? Default: "Andrea Dalton has $145 unpaid." needs your OK because it is copy.

## 6. What I did not look at

- The quote, job, invoice and request objects beyond how they show and link the customer (two other audits cover objects and patterns).
- Every state of every page: for the customer page the pass-holder state was read closely at both widths; one-off, Do not service and nothing-yet were counted but only skimmed. Dialogs (Edit details, Merge, Collect, Send a message, Consent history) were not opened.
- Hover cards other than the customer's on the invoice page (`44-invoice-customer-hover-1280.jpg`); keyboard focus order; screen reader output; long-press on a phone.
- The shipped screens' own behaviour (panels, back stack) beyond one story each for Home, Schedule week, visit panel, job panel, customer panel. The Schedule Day and List views and Reports and Settings were counted, not studied.
- Phone widths for the lists other than the Jobs grid; tablet widths.
- The customer-facing side, emails and texts.
- Jobber's own screens were not opened this session; statements about Jobber are from the earlier research docs and from memory, and should be checked against a real account before they decide anything.
- The in-app browser pane was in use by another session, so all rendering was done headless; I looked at the saved screenshots listed here and at no others.

## 7. Sources

Read in earlier research docs in this repo and relied on here, not re-fetched this session:
- NN/g, Guidelines for Visualizing Links: https://www.nngroup.com/articles/guidelines-for-visualizing-links/ (links must look like links, and non-links must not; overuse weakens the signal).
- WCAG 2.2, 1.4.13 Content on Hover or Focus: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus
- HubSpot, Preview a record: https://knowledge.hubspot.com/records/preview-a-record (one association card per related record, previewable).

From general knowledge, not re-read this session (treat as pointers, not quotes):
- WCAG 2.2, 2.4.4 Link Purpose (In Context), 3.2.4 Consistent Identification, 2.5.8 Target Size (Minimum, 24px): https://www.w3.org/TR/WCAG22/
- Apple Human Interface Guidelines, 44pt minimum hit target: https://developer.apple.com/design/human-interface-guidelines/accessibility
- NN/g, Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g, Breadcrumbs: https://www.nngroup.com/articles/breadcrumbs/ (breadcrumbs show location; a separate back affordance returns to where the user was).
- Hick's law: https://lawsofux.com/hicks-law/
- Attio and Linear record chips and hover cards: recalled from use, as the Nov 19 research already marked them.

Internal: `docs/DESIGN.md` line 148 (the first column is the one link in a row), `docs/plans/2026-11-19-record-links-research.md`, `docs/plans/2026-11-19-navigation-audit.md`.
