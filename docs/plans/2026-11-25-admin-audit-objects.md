# Admin audit: Quote, Request, Job, Visit, Invoice, Payment (Nov 25 2026)

Read-only audit of the admin prototype on `review-prototypes` (commit `42949088`). No source was changed. The customer object is covered by another audit. Screenshots are in `docs/review/2026-11-25-admin-audit-objects/` (`1280-…` laptop, `375-…` phone). Phone screenshots are full-page captures, so the fixed tab bar and action bar are drawn once mid-page; that is the capture, not a bug.

What was looked at: the Storybook stories under Admin (Jobs grid, Job page one trip, Job page Season Pass and return trip, Requests, Quotes, Invoices, the Walkthrough's rail and receipt), rendered at 1280 and 375, plus the source of every page in `src/app/(admin)/admin/_screens/design/`.

## 1. Summary

1. The frame is sound: every record page is `RecordPage` + `SummaryBand` + `SectionCard` + `RecordFooter`, every list is `DataGrid`, every pill is `StatusPill`. The drift is in what each page puts inside the frame.
2. **Too many links is real and measurable.** One record is linked two to four times on the same page (the customer on an invoice: header chip, aside chip, property chip; the invoice on a job: Total tile, Billing banner chip, table chip, table icon). An Invoices row has six click targets, a Jobs row three orange links.
3. **The title rule differs by object.** A job is titled with the customer's name, a Season Pass job with its number, a quote and an invoice with their number, a request with the person's name. Two different jobs for Andrea both read "Andrea Dalton".
4. **The customer block is built three ways** (job and quote: `AsideCard`; invoice: a hand-built card with a chip; request: two cards), and the header carries a customer chip on quote and invoice but not on job.
5. **Summary band tiles behave three ways under one chevron**: scroll down the page, open another record, or leave for Settings (Who goes to Settings, People).
6. **The four lists are four designs**: tiles on Quotes and Invoices only, tabs on Quotes only, filter chips on the other three, a "Next action" column on Quotes, an unnamed button column on Invoices, a "Next" column on Jobs that means the next day, and nothing on Requests.
7. **The Jobs list still shows a job waiting on a quote** ("Quote later", an unscheduled installation), against the Nov 22 decision, and its last column is cut off at 1280.
8. **Dialogs disagree on small things**: titles with and without a question mark, "Cancel" versus "Keep it", "What Dana will read" versus "What Beth will get", a labelled and an unlabelled channel picker.
9. **A visit and a payment are not records with a page**, which is fine, but they are linked as if they were: a payment opens the customer's receipt by two different addresses, and a Season Pass visit carries its own footer and its own Notes and history inside the job.
10. Missing for Ryan's day: one place that answers "what is past due or waiting" across requests, quotes and invoices; a quote's Messages; the request and quote a job came from on every job; "Collect payment" on the Jobs list.

## 2. Findings by object

Severity: **High** blocks a job to be done or contradicts a decision; **Medium** is inconsistency a user will notice; **Low** is polish.

### 2.1 Lists (all objects)

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| L1 | The Jobs grid's last column (Next) is clipped at 1280 with eight columns and three chips per row. | `JobsGridDesign.tsx` | High | `1280-list-jobs.jpg` | Drop Property as a column (put the street under the customer as a quiet second line, as the phone card does) so the grid fits at 1280. Baymard and NN/g both advise against horizontal scroll in data tables for primary columns. |
| L2 | Jobs still lists work that waits on a price: "New sprinkler system installation, Unscheduled, Quote later". Nov 22: a job exists only after approval. | `JobsGridDesign.tsx` line "Quote later", `jobs-data.ts` fixture | High | `1280-list-jobs.jpg` | Remove the row and the "Quote later" branch. An unpriced installation lives on Quotes as a Draft. |
| L3 | First column and row identity differ: Jobs leads with the customer as plain orange text (not a chip, and it is not a link to the customer, it opens the job), Requests with the person as orange text, Quotes and Invoices with the record's number as a chip with an icon. | the four list files | Medium | the four `1280-list-*.jpg` | One rule: the first column is the record itself and is the only thing in the row styled as the primary link. For Job that is the job's name ("Sprinkler repair"), with the customer second. See anatomy rule A1. |
| L4 | Link load per row: Jobs has three orange underlined things (name, job chip, property chip); Invoices has six targets (invoice chip, customer chip, job chip, Remind, Collect payment, icon); Quotes three; Requests two. The whole row also opens the record. | same | High | `1280-list-invoices.jpg`, `1280-list-jobs.jpg` | In a list, only the first column is a link; other records are plain text (the row click and the record page reach them). Keep at most one row action. This is Hannah's "too many links". Linear, Attio and Jobber lists all keep secondary cells as plain text. |
| L5 | The Property chip on Jobs links to the customer page at `#property-h`; a chip that looks like a record but is an anchor on another record. | `JobsGridDesign.tsx` (`href="/admin/customers"` in the design grid, `propertyHref` in the walkthrough) | Medium | `1280-list-jobs.jpg` | Property is not a record with a page: show it as text. |
| L6 | Summary tiles on Quotes (five) and Invoices (four), none on Jobs or Requests. | lists | Medium | lists | Either every money list has tiles (Jobs: Today, Unscheduled, Done unpaid, Late) or tiles are only for money pipelines. Default: add four tiles to Jobs, none to Requests (it is an inbox). |
| L7 | Status filtering is tabs with counts on Quotes, filter chips on Jobs, Requests and Invoices. Quotes has no filter chips at all, so it cannot be filtered by service. | `QuotesList.tsx` | Medium | `1280-list-quotes.jpg` | One pattern. Default: tabs with counts for Status on all four (it is the main cut and shows the counts), chips for the rest. |
| L8 | The action column: Quotes "Next action" (Remind or Open as text), Invoices an unnamed column (Remind, Collect payment, an icon that means Open), Jobs "Next" meaning the next day, Requests none. "Open" as a next action is not an action. | lists | Medium | lists | Name the Jobs column "Next visit". One optional column named "Next action" holding one verb, empty when there is none: Requests "Send a quote" or "Create job", Quotes "Remind", Jobs "Schedule" / "Collect payment", Invoices "Remind". Drop "Open" and the icon; the row opens. |
| L9 | "Reminded today" is disabled text in the same slot as a live action. | Quotes, Invoices | Low | `1280-list-invoices.jpg` | Fine as a pattern; keep it identical on both (it is). |
| L10 | Date formats: Quotes "Nov 9" over "8 days ago", Requests "1 hour ago" only, Invoices "Nov 12", Jobs "Mon, May 3". | lists | Medium | lists | One list format: the date ("Nov 9"), with the age as a quiet second line only where waiting matters (Requests, Sent quotes, Past due invoices). Weekday only for a day in the future. |
| L11 | Money column names: "Total" then "Billing" (Jobs), "Amount" (Quotes, Invoices). | lists | Low | lists | "Total" for a job and a quote (they have lines), "Amount" for an invoice and a payment. Write it down. |
| L12 | The red "Late" pill on Jobs uses the `overdue` tone whose own word is "Past due"; the same row can then show red "Past due since" in Billing. Two reds, two meanings. | `GRID_TONE`, `StatusPill.tsx` | Medium | `1280-list-jobs.jpg` | Give Late its own status key (same red is fine) and never reuse the money key for work. |
| L13 | The header's Search button is on Quotes and Requests stories, not Jobs or Invoices; the rail differs per story (Jobs only; Requests; Quotes) and the Invoices stories light "Jobs" with no Invoices item. The walkthrough rail has nine items: Home, Schedule, Requests, Jobs, Quotes, Customers, Invoices, Reports, Settings. | story shells | Medium | lists, `1280-walkthrough-home.jpg` | One shell for every Admin story (the walkthrough's). Nine rail items is over the documented six; see question Q1. |
| L14 | Empty states agree in form ("No quotes yet" + one line, "No X match."), but Quotes sets `emptyTitle` to "No quotes match." itself. | `QuotesList.tsx` | Low | source | Use `noMatchTitle` only. |
| L15 | Phone cards: Invoices cards carry three text buttons under each card; Quotes one; Jobs and Requests none. | lists at 375 | Medium | `375-list-invoices.jpg`, `375-list-quotes.jpg` | One action under a card at most (L8); "Open invoice" goes, the card is the button. |

### 2.2 Request

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| R1 | The match is shown twice: the band's Customer tile (a link) and the Customer match card (a chip). The address twice (band, Contact). | `RequestPage.tsx` | Medium | `1280-request-new-matches.jpg` | Band keeps Came in, Asked for, Where, Reach by. The match lives once, in the aside card. |
| R2 | Footer: for a quote-first service it is Send a quote (primary), Archive (outline), More (Mark as seen). Archive is the destructive-ish way out but is drawn as a plain outline; on a quote Archive is under More. | `RequestPage.tsx`, `QuotePage.tsx` | Medium | `1280-request-new-matches.jpg`, `1280-quote-sent.jpg` | Archive in the same slot on both: under More, last. |
| R3 | "Mark as seen" under More while opening the page already writes Seen. | `RequestPage.tsx` | Low | source | Remove the action, or stop marking on open. Default: remove. |
| R4 | New and Seen are the same gold; the only difference is the word. | `StatusPill.tsx` | Low | `1280-list-requests.jpg` | Fine if Seen stays; question Q4 asks whether Seen earns its place. |
| R5 | After conversion the request is a stub page ("This request became a quote") with the quote as primary button and as a chip. Good: no dead end. But the quote and the job do not link back to the request, only say "From a request" as text. | `BecameQuotePage`, `QuotePage` subtitle | Medium | `1280-request-became-quote.jpg`, `1280-quote-sent.jpg` | The words and photos already move to the quote, so no back link is needed; then drop "From a request" from the band's sub and keep it once in the subtitle. |
| R6 | The archive dialog's cancel button is "Cancel"; the quote's archive dialog says "Keep it". | `RequestDialogs.tsx`, `QuoteDialogs.tsx` | Low | `1280-dialog-archive-request.jpg`, `1280-dialog-archive-quote.jpg` | See drift D12. |
| R7 | Create job dialog lists eleven services as one flat choice, including quote-first ones under "Create job". | `RequestDialogs.tsx` | Medium | `1280-dialog-create-job.jpg` | Out of scope to redesign; at least hide unpriced services under Create job (they cannot be a job before a quote). |

### 2.3 Quote

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| Q1 | Repetition on a sent quote: the status pill twice (header, Quote card), the number twice (title, "Quote" fact), Total three times (band, facts, lines), Deposit twice, Sent twice, the address three times (band Where, Customer card, a Property card that holds only the address). | `QuotePage.tsx`, `QuoteParts.tsx` | High | `1280-quote-sent.jpg` | Delete the Quote card's pill and its Quote, Total and Sent rows (keep Decision, Deposit detail, Reminders, Quote page). Delete the Property card on a quote. Band: Total, Deposit, Sent, Decision. NN/g: redundancy on a detail page raises scanning cost. |
| Q2 | The customer is linked twice (header chip, aside card) and the address chip links to the customer a third time. | same | High | `1280-quote-sent.jpg` (12 links, 3 to one customer) | One customer link per page, in the aside card (anatomy rule A4). |
| Q3 | No Messages section, though a quote is sent, reminded and answered by text or email; the invoice and job pages have one. | `QuotePage.tsx` | Medium | `1280-quote-sent.jpg` | Add Messages in the main column, same card as elsewhere. |
| Q4 | "Open the quote page" is a text link in a facts row; the invoice's equal ("Open pay page") is under More. | `QuoteParts.tsx`, `InvoicePanel.tsx` | Low | `1280-quote-sent.jpg` | Both under More, same wording pattern: "Open quote page", "Open pay page". |
| Q5 | Primary button label "Send a quote" opens a dialog whose confirm is "Send the quote"; "Send a quote reminder" confirms with "Send the reminder". Consistent with each other; keep. The Draft page has two "Send a quote" buttons (header and editor card). | `QuotePage.tsx`, `QuoteEditor.tsx` | Medium | `1280-quote-draft.jpg` | One primary per page (the recipe): keep the header's, drop the card's, or the reverse on a phone where the header bar is sticky. |
| Q6 | A Draft's band holds Created, For, Where, Contact; a sent quote's holds Total, Deposit, Sent, Where. The band changes meaning by state. | `quoteBand` | Low | `1280-quote-draft.jpg` | Acceptable (the total is being built), but keep the same four slots with "Not sent" and "$0" so the eye learns one layout. |
| Q7 | Approved quote: the job is the header's primary ("Open job") and a Job card with a chip, a pill and "Job created Nov 12". | `JobMadeCard` | Low | `1280-quote-approved.jpg` | Keep the card (it is the lifecycle link), make the header button the only button; the chip is the only link in the card. Fine as is once Q1 and Q2 are done. |
| Q8 | Notes and history order is wrong in the fixture ("Nov 9 sent" above "Nov 10 created from a request"). | `quote-fixtures.ts` | Low | `1280-quote-sent.jpg` | Fix the fixture dates. |
| Q9 | Mark approved dialog's confirm is "Mark approved and tell Beth" with no visible way to not tell her; the code has a `tell` flag. | `QuoteDialogs.tsx` | Medium | `1280-dialog-approve-by-hand.jpg` | Use the `SplitButton` pattern the Move dialog uses (primary tells, caret "without telling"). Open question in the handoff already. |

### 2.4 Job (one trip, return trip, Season Pass, from a quote)

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| J1 | Title is the customer's name; two jobs for one customer have the same title, the browser tab and the back crumb cannot tell them apart, and it differs from quote and invoice (number) and from the Season Pass job (its number). | `JobPage.tsx`, `ApprovedJobPage.tsx`, `JobPageTrips.tsx` | High | `1280-job-invoice-sent.jpg`, `1280-job-pass-one-done.jpg` | Title = what the record is: "Sprinkler repair" (or "Season Pass 2027"), subtitle = "Andrea Dalton · 480 Briggs St · Added Nov 18". Jobber titles a job by its number and client; Linear and Attio title a record by its own name. See Q2 for Hannah. |
| J2 | Four job page builds: `JobPage`, `TripsPage`, `ApprovedJobPage` and the live `JobPanel`. The from-a-quote job has a different band (From quote, Total, Deposit, Where instead of When, Who, Where, Total), no Property card, no Messages, no Checklist or Photos, a different What's included (per-line Edit and "Add a line" versus one Edit), and its own Billing. | `quotes/ApprovedJobPage.tsx` vs `JobPage.tsx` | High | `1280-job-from-quote.jpg` vs `1280-job-unscheduled.jpg` | One job page. A job from a quote is the same page with one extra fact ("From quote Q-2026-0005", a chip, in the facts or the subtitle) and a Deposit row in Billing. The band is always When, Who, Where, Total. |
| J3 | "From quote" is said three times on the approved job: subtitle, band tile, a whole card. | `ApprovedJobPage.tsx` | Medium | `1280-job-from-quote.jpg` | Once, as a chip in the aside under the customer ("From quote Q-2026-0005, approved Nov 12"). |
| J4 | Band tiles do three things under the same chevron: When opens the Schedule, Who opens Settings › People, Where opens the customer page at Property, Total scrolls to Billing or opens the invoice. | `bandItems` in `JobPageParts.tsx` | High | `1280-job-invoice-sent.jpg` | A band tile either scrolls to its section on this page or does nothing. Never leaves the page. Who and Where become plain. (NN/g: the same signifier must mean the same action.) |
| J5 | The invoice is reachable four ways on one job (Total tile, Billing banner chip, table chip, table icon) and Remind twice (header primary, table row). | `BillingCard.tsx`, `JobPage.tsx` | High | `1280-job-invoice-sent.jpg` | The invoice chip in the Invoices table is the one link. Banner is text. Remind stays in the header only. |
| J6 | The aside's customer card links to `/admin/customers` (the list) on `JobPage` and `TripsPage`, and "See all 7" past visits does too; `ApprovedJobPage` links to the customer. | `Aside` in `JobPageParts.tsx` | High | links dump for `1280-job-pass-one-done` | Link to the customer record. A link that lands on a list is a dead end for the task. |
| J7 | Past visits: three chips per row (job, day, person) wrapping in a narrow aside; the person chip opens Settings. | `PastVisitsCard` | Medium | `1280-job-invoice-sent.jpg` | One line of text per visit, the service name as the only link (to that job): "Fall blowout · Oct 14, 2026 · Ryan". |
| J8 | Season Pass job has no primary button (Change the pass, Add July, More are all outlines) while the open visit inside has a filled "Move". Two footers on one page. | `JobPagePass`, `TripBody.tsx` | Medium | `1280-job-pass-one-done.jpg` | One primary per page, the next step for the job (here "Mark done" or "Move" for the next visit) in the header; a visit row keeps quiet text actions. |
| J9 | The open visit has its own "Notes and history" and the aside has another. Two note boxes on one page; a user cannot tell where a note goes. | `TripBody.tsx` | Medium | `1280-job-pass-one-done.jpg` | One Notes and history per page (the job's); a note can name its visit. |
| J10 | The first visit row shows a "Paid, card" pill and "Paid, card" text beside it. | `TripRow` fixture | Low | `1280-job-pass-one-done.jpg` | One or the other; the pill. |
| J11 | The pass card on the job says TH-2027-0001, the title TH-2027-0008. | fixture | Low | same | Fix the fixture. |
| J12 | What's included totals differ by page: job "Total, Paid, Unpaid"; pass "Season total, Paid so far"; invoice "Subtotal, Tax, Total, Paid, Unpaid"; quote "Total". Then Billing repeats Total, Paid, Unpaid again as a second layout (three small stats). | `LineItemList` callers, `BillingCard` | Medium | `1280-job-pass-one-done.jpg`, `1280-job-from-quote.jpg` | Lines end in Total only (plus Subtotal and Tax when taxed). Paid and Unpaid belong to Billing and appear once. |
| J13 | Billing's table is "Invoices and payments" on one job, "Payments" on another, with icon-only row buttons (receipt, Stripe, a three-dot menu) and a column headed "Buttons" for screen readers. | `BillingCard.tsx`, `CustomerTables.tsx` | Medium | `1280-job-from-quote.jpg` | Always "Invoices and payments". Row: one chip (invoice or receipt) and one More menu; no bare icons without a label (Apple HIG and NN/g: unlabeled icons are guessed wrong). |
| J14 | Messages dates are orange (the link colour) but the row opens a message preview, not a record. | `MessageTable` | Low | `1280-job-invoice-sent.jpg` | Plain text date; the row is the button. |
| J15 | "Edit" on What's included and on Property are text links in the card header; "Add a line" on the approved job is the same slot with a different verb. Fine as a slot; the rule is unwritten. | cards | Low | screenshots | Write it: a card header holds at most one quiet text action. |
| J16 | The live `JobsScreen`/`JobPanel` (Screens in Storybook) still has Needs a quote and Quote sent and is a side panel, not a page. | `src/lib/jobs/stage.ts`, `JobPanel.tsx` | Medium | handoff section 9 | Known; listed so the build step retires the panel in favour of the page. |

### 2.5 Visit

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| V1 | In the prototype a visit has no page: a one-trip job shows the visit's facts as the job's own band, checklist and photos; a multi-trip job shows visits as expanding rows. The live admin has a `VisitPanel` and `?visit=` addresses. Two models. | `JobPage.tsx`, `TripBody.tsx`, live `VisitPanel.tsx` | High | `1280-job-unscheduled.jpg`, `1280-job-pass-one-done.jpg` | Decide once (Q3). Default, matching Hannah's "act on the visit from the job": no visit page; `?visit=` opens the job with that visit open. |
| V2 | The words: "Visits" (card title, list column), "trip" (code, "Add a return trip", "Nothing to bill until the trip is done", "Return trip: new valve"). | `JobPageParts`, `BillingCard` | Medium | `1280-job-unscheduled.jpg`, `1280-job-return-trip.jpg` | "Visit" everywhere on screen; "return visit" for the second one. |
| V3 | A visit's status vocabulary inside a pass ("Scheduled", "Done", "Charged after this visit", "— Nothing due") differs from the job's Billing words. "Charged after this visit" is not a money word from `words.ts`. | `TripRow` fixtures | Medium | `1280-job-pass-one-done.jpg` | Money cell on a visit row uses only the five money words or is empty; the charging rule is a sentence in Billing (it already is). |
| V4 | One-trip job: Mark done is an outline beside primary Schedule while unscheduled. Marking done a visit with no day is odd as a peer action. | `job-fixtures.ts` footer plan | Low | `1280-job-unscheduled.jpg` | Under More until the visit has a day. |

### 2.6 Invoice

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| I1 | Customer linked three times (header chip, aside chip, property chip); the aside's customer card is hand-built, unlike `AsideCard` on job and quote. | `InvoicePanel.tsx` | High | `1280-invoice-sent.jpg` | `AsideCard`, one link. No header chip. |
| I2 | No subtitle; the header does not say what the invoice is for. The job is only in the aside. | `InvoicePanel.tsx` | Medium | `1280-invoice-sent.jpg` | Subtitle "Sprinkler repair · Marcus Bell · Sent Nov 12". |
| I3 | Notes and history is the last card of the main column; on job, quote and request it is in the aside. | `InvoicePanel.tsx` | Medium | `1280-invoice-sent.jpg` | Aside, last, everywhere. |
| I4 | A full Property card (zones, controller, gate code) on an invoice. Not needed to bill. | `InvoicePanel.tsx` | Low | `1280-invoice-sent.jpg` | Remove; the address is in the customer card. |
| I5 | The pill reads "Invoice sent" on a page titled INV-… under "Invoices"; a quote's reads "Sent". | `INVOICE_PILL` | Low | `1280-invoice-sent.jpg` | Keep "Invoice sent" (it is the money word and Hannah's rule); accept the asymmetry and write it down. |
| I6 | Reminders card shows two empty lines at once when paid ("No more reminders: it is paid." and "No reminders sent yet. They show here with how they went out."). | `RemindersCard` | Low | `1280-invoice-paid.jpg` | One line when done. |
| I7 | Cancel invoice dialog's sentence runs three clauses with "and … and"; the customer is "the customer" here and by first name elsewhere. | `confirm-copy.ts` | Low | `1280-dialog-cancel-invoice.jpg` | Two sentences, first name. Needs Hannah's wording. |
| I8 | Invoices is in the walkthrough rail but its own stories show a rail without it and light Jobs. | story shell | Low | `1280-invoice-sent.jpg` | L13. |

### 2.7 Payment

| # | What | Where | Sev | Evidence | Recommendation |
|---|---|---|---|---|---|
| P1 | A payment has no admin page. `PaymentChip` and the "Paid on" tile go to `/admin/payments?payment=…`, which the walkthrough draws as the customer's receipt ("As Andrea sees it"); the Season Pass job's row goes to `/account/receipts/…` instead. Two addresses for the same thing, and a chip that looks like a record. | `RecordChips.tsx`, `CustomerTables.tsx`, `walkthrough/receipts.tsx` | Medium | `1280-payment-receipt.jpg`, links dump | One address. A payment is a row with a "Receipt" link that opens the receipt; not a chip. |
| P2 | Refund is reachable from a row's three-dot menu on one page, a header More on another, and a dialog on a third. | `BillingCard`, `ApprovedJobPage`, `JobPage` | Medium | `1280-job-from-quote.jpg` | Refund lives in the payment row's More menu only (it acts on that payment). |
| P3 | "How is this paid?" is one dialog everywhere it was checked (job, customer, invoice list). Good. | `CollectBlock` | none | `1280-dialog-collect-payment.jpg` | Keep. Title appears twice in the DOM in the customer story (dialog title and block heading); check it is drawn once. |
| P4 | Deposit words: "paid by card" (quote), "Paid by card" (band), "Nov 12 · Nora, online" (payments row), "kept on file" (invoice). | several | Low | screenshots | One helper for "how a payment was made" words. |

## 3. Drift table

| # | Pattern | Where it differs | One version |
|---|---|---|---|
| D1 | Page title | Job: customer name. Pass job: "Season Pass TH-…". Quote, Invoice: number. Request: person's name. | The record's own name: Job = service name, Quote and Invoice = number, Request = "Request from Rosa Delgado" (Q2). |
| D2 | Subtitle | Job "service · Added date"; Pass "customer · Sold date, source"; Quote "service · origin"; Invoice none; Request "Request for X · Came in …". | "What · Who · key date", always present. |
| D3 | Header badges | Job: one or two pills (+ note). Quote, Invoice: pill + customer chip. Request: pill. | Pills only (work pill, then money pill). No chips in the header. |
| D4 | Customer block | `AsideCard` (job, quote, approved job); hand-built SectionCard with chip (invoice); Customer match + Contact (request). | `AsideCard` everywhere there is a customer; a request keeps its match card. |
| D5 | Property card | Job: gate, must be home, access with Edit. Quote: address only. Invoice: address, zones, controller, gate. Approved job, request: none. | Only on a job (where someone goes to the yard). |
| D6 | Notes and history | Aside (job, quote, request); main column (invoice); twice (pass job). | Aside, last, once. |
| D7 | Messages | Job, invoice: yes. Quote, approved job, request: no. | Every record that sends the customer something has it, main column, last. |
| D8 | Band tiles | Scroll, open a record, open Settings; a Draft quote and an approved job have different tiles. | Four fixed tiles per object; a tile scrolls on this page or is plain. |
| D9 | Lines and totals | `LineItemList` with five different totals sets; per-line Edit (approved job) vs card-level Edit (job); the customer side uses `PriceLines`. | `LineItemList` ending in Total (Subtotal and Tax when taxed). The admin does not need `PriceLines`; it should share its type roles (`type-item`, `type-value`, `type-figure` for the total) so a line reads the same to Ryan and to the customer. |
| D10 | Billing | Banner + stats + table (pass, approved job); banner + Card on file + table (job); none (quote); own Payments card (invoice). | One `BillingCard`: the money word sentence, Total / Paid / Unpaid once, "Invoices and payments" table. |
| D11 | Footer | Job: primary + outlines + More. Pass job: outlines only. Request: Archive as an outline. Quote: Archive in More. Paid invoice: More alone. | One primary (the next step) when there is a next step, up to two outlines, More; anything that ends a record (Archive, Cancel) last in More in the destructive colour. |
| D12 | Dialog cancel button | "Cancel" (send, remind, revise, archive request, create job); "Keep it" (archive quote, cancel invoice, cancel job). | "Cancel", except when the confirm verb is itself "Cancel …": then "Keep it". Archive quote should say "Cancel". |
| D13 | Dialog title | "Send a quote", "Send a payment reminder" (verb); "Revise this quote?", "Archive this request?", "Cancel this job?" (question); "Mark this quote approved", "Cancel invoice" (neither). | The button's own words as the title for a send; "Verb this thing?" for anything that ends or replaces a record. So: "Cancel this invoice?", "Mark this quote approved?". |
| D14 | Channel picker in a dialog | Labelled "Send by" (quote send, quote reminder); unlabelled (invoice reminder). | Labelled "Send by". |
| D15 | Preview heading in a dialog | "What Dana will read" (send quote, invoice reminder); "What Beth will get" (quote reminder). "Edit the wording in Settings" only on the invoice reminder. | "What Dana will read"; the Settings link wherever the wording is editable. |
| D16 | Notice strip | `Notice` component (job); the same classes pasted by hand (quote, request, approved job). | `Notice`, moved to blocks. |
| D17 | Text link and text button styles | `LINK` defined in six files, `TEXT_BUTTON` in two, `EditLink` in one. | One `TextAction` in blocks. |
| D18 | Money and date helpers | `money` defined four times; `dayOf` (quotes) and `dayWords` (invoices) do the same job; "Nov 12", "Thu, Nov 19", "Oct 14, 2026", "Today, Wed Nov 18", "Nov 18 at 6:12 am". | `src/lib/admin/format.ts` only. Past dates "Nov 12" (year only when not this year), future days "Thu, Nov 19", today "Today". |
| D19 | Status words across objects | "Sent" (quote) / "Invoice sent" (invoice); "Archived" (request, quote) / "Canceled" (job, invoice); "Active" green (pass) and "Active" solid navy (job on the way); "Late" drawn with the Past due key. | Keep the words; fix the two collisions: the on-the-way job should not share the word "Active" with a pass (Q5), and Late gets its own key. |
| D20 | Row actions inside cards | Text ("Remind"), bare icons (receipt, Stripe), three-dot menu, chips. | One chip for the record + one labelled action or one More menu. |
| D21 | List header | New job / New quote filled button (Jobs, Quotes); none (Requests, Invoices). Search button on two of four. | Fine for the buttons (nothing to create by hand on the other two); Search on all or none. |
| D22 | Record addresses | `/admin/jobs?job=`, `/admin/quotes?quote=`, `/admin/invoices?invoice=`, `/admin/payments?payment=` (no such screen), `/account/receipts/…`, `/admin/customers?customer=…#property-h`, `/admin/settings?tab=people` for a person. | Only records with a page get an address: customer, request, quote, job, invoice. |

## 4. Canonical anatomy of an admin record page (proposed rules)

**A1. Title.** The record's own name, never another record's. Job: the service ("Sprinkler repair", "Season Pass 2027"). Quote, invoice: the number. Request: "Request from {name}". The crumb above is the list it belongs to.

**A2. Subtitle.** One line: what, who, the key date. Always present. Plain text, no links.

**A3. Pills.** Under or beside the title: the work pill first, the money pill second, at most two. No chips in the header. A pill is never repeated lower on the page.

**A4. One link per related record per page.** The customer is linked once, in the aside's customer card. A job, quote or invoice that this record came from or led to is linked once, as a chip, in the section that is about it (Billing for an invoice, "From" for a quote). Everything else that names the record is plain text. A person and a property are not records: they are text.

**A5. Actions (top right; sticky at the bottom on a phone).** One filled primary, which is the next step in the lifecycle (Send a quote, Schedule, Mark done, Collect payment, Send a payment reminder). Up to two outlines. Then More. Whatever ends the record (Archive, Cancel job, Cancel invoice) is last in More in the destructive colour. A record with no next step has no primary. Nothing in the page body repeats a header action.

**A6. Summary band.** Exactly four tiles, fixed per object, the same in every state (a state shows "Not sent" or "No day yet", it does not swap the tile). A tile with a chevron scrolls to its section on this page. A tile never leaves the page.
- Request: Came in, Asked for, Where, Reach by.
- Quote: Total, Deposit, Sent, Decision.
- Job: When (or Next visit), Who, Where, Total with its money word.
- Invoice: Amount, Sent, Due, Paid.

**A7. Main column, in this order.** (1) the thing itself: What they wrote (request), What's included (quote, job), Lines (invoice); (2) the work: Visits, with checklist and photos inside the visit (job only); (3) Billing: the money sentence, Total / Paid / Unpaid once, Invoices and payments (job), or Payments and Reminders (invoice); (4) Messages. A section that has nothing yet shows one quiet line, not a hidden card, so the page keeps its shape.

**A8. Aside, in this order.** Customer (`AsideCard`: name as the one link, phone, address), then where it came from or what it became (one chip each: request, quote, job), then Property (job only), then Notes and history, last, once.

**A9. Facts are said once.** A number shown in the band is not repeated in a facts card. A facts card exists only for facts the band and the lines do not hold.

**A10. Money.** Words only from `src/lib/money/words.ts`. A list of priced lines is `LineItemList` and ends in Total. Paid and Unpaid belong to Billing.

**A11. Dialogs.** One `ConfirmDialog`. Title per D13. Body: one sentence of exact effect, then who is told and how ("Send by"), then "What {first} will read". Buttons: "Cancel" (or "Keep it" when the confirm is "Cancel …") and the verb with its object ("Send the quote"). A send that can be silent uses `SplitButton`. The result is a toast and the page changes state.

**A12. Lists.** First column is the record and the only link in the row; the row opens it. Status is tabs with counts; other filters are chips. One optional "Next action" column with one verb. On a phone, one card = one button, with at most one action under it.

Sources: NN/g, "Visual Hierarchy" and "Signifiers" (one signifier, one meaning); NN/g, "Data Tables: Four Major User Tasks" (find, compare, view a row, act; keep row actions few and labelled); NN/g, "Icon Usability" (unlabeled icons); Baymard, account and order-detail findings (one clear path to each related record, no duplicate links competing); Apple HIG, Buttons (one prominent button per view) and Alerts (verb-labelled buttons, "Cancel" consistent); Jobber's job page (title, client card at the side, Line items, Visits, Billing, Internal notes last) and its list views (plain-text cells, one status, row opens); Linear and Attio record pages (title is the record's name, properties in a side column, activity last, Cmd+K). `docs/plans/2026-11-19-record-links-research.md` and `2026-11-19-admin-page-layout-research.md` in this repo already cite most of these; this audit asks for the "every record name is a link" rule to become "once per page".

## 5. Missing against the jobs to be done

| Job to be done | State today | Gap |
|---|---|---|
| Find my next action | Home has Needs action for visits and money; request rows exist as a story. Quotes waiting more than N days and Draft quotes not sent are not on Home. | One Needs action list across requests (New), quotes (Draft with a price, Sent and old), jobs (Unscheduled, Late, Done unpaid), invoices (Past due). |
| See what is overdue | Invoices: tile and filter. Jobs: "Late" pill and a Billing filter. Quotes: "Oldest: 8 days" only. | No single "past due and waiting" view; no age threshold on quotes. |
| Collect payment | Job header, invoice header, invoice list row, customer page. Not on the Jobs list for a Done unpaid job. | Add it as the Jobs list's next action. |
| Send a quote | Request page, Quotes list (New quote), customer page. | Good. Missing: the quote's Messages (Q3) and a visible "without telling" on Mark approved (Q9). |
| Create a job from a request | Create job dialog; lands on the job. | Good. The job does not show the customer's words and photos in every build (the approved job shows photos only when passed in). |
| Follow the lifecycle | Request → stub page → quote → Job card → job → invoice (aside Job card) → payment (receipt). | The chain reads forward. Backward it breaks at job → quote on a normal job page (only `ApprovedJobPage` shows it) and invoice → quote (never). A one-line "From request Nov 9 → Quote Q-0007 → this job → INV-0042" trail in the aside would settle it in one place. |
| Know a visit's state from the job | One-trip: the page is the visit. Multi-trip: rows. | V1: decide the visit model before build. |

## 6. Questions for Hannah (one at a time, each with a default)

1. **The left rail has nine items in the walkthrough** (Home, Schedule, Requests, Jobs, Quotes, Customers, Invoices, Reports, Settings). Keep nine, or group Requests and Quotes? Default: keep nine, in lifecycle order (Requests, Quotes, Jobs, Invoices), Customers after them.
2. **What is a job's title?** Today it is the customer's name. Default: the service ("Sprinkler repair") with the customer and street under it, so two jobs for one customer differ and it matches quote and invoice.
3. **Does a visit ever get its own page in the admin?** Default: no. It opens inside its job, and a link to a visit opens the job with that visit open.
4. **Does a request need "Seen"?** Default: keep New and Archived only; New means nobody has made a quote or a job of it yet.
5. **A job that is on the way reads "Active", and so does a Season Pass.** Default: the job says "On the way".
6. **In lists, should the customer, the job and the address stop being links** (the row still opens the record)? Default: yes, one link per row.
7. **On a record page, the customer once (in the side card) instead of in the header too?** Default: yes.
8. **Archive in the same place on a request and a quote** (under More)? Default: yes.
9. **"Trip" or "visit" on screen?** Default: visit, and "return visit".
10. **Mark approved: tell the customer by default, with "without telling" under the caret?** Default: yes.

## 7. Not looked at

- The customer page and Customers list (the other audit), Home, Schedule, Reports, Settings, New job sheet, Cmd+K search results.
- The live (wired) screens under Screens in Storybook beyond noting J16; the live `VisitPanel`, `JobPanel` and their dialogs were read in `CLAUDE.md`, not rendered.
- Every state of every story: one or two states per object were rendered (job: unscheduled, done unpaid, invoice sent, pass one done, return trip, from a quote; quote: draft, sent, approved; request: new with a match, became a quote; invoice: sent, paid). Refunded, part refunded, canceled, declined, replaced and archived states were read in source only.
- Phone: the four lists, a sent quote, a sent invoice and a job were captured; only the Invoices list and the sent quote were inspected closely. Tap target sizes, focus order, keyboard use and axe results were not checked.
- Dialogs were read as text and source; only their words and buttons were compared, not their layout at 375.
- Colour contrast, motion and dark surfaces; the emails and texts a dialog sends; the customer-facing quote and pay pages.
- Hover preview cards on chips (`RecordPreview`) were not opened.
