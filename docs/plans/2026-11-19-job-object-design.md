# The job object, Billing and Invoices (design in Storybook)

Status: design for Hannah's review. Pure screens over fixtures, nothing wired. Open it with `npm run storybook`, then **Design** in the sidebar. Built on her four answers of Nov 18: a one-trip job is one page, a job finishes itself, Invoices is in the left column with a Billing section on every job and customer, online payment is the full amount.

## Stories

**Design / Job page, one trip** (`JobPage`), each at 1280 and 375 (the `Phone` twin):
Unscheduled, ScheduledAhead, Today, Late, DoneUnpaid, DonePaid, InvoiceSent, PastDue, Canceled.

**Design / Job page, Season Pass and return trip** (`JobPagePass`, `JobPageReturnTrip`): BothAhead, OneDone, BothDone, PassCanceled, ReturnTrip.

**Design / Jobs, Invoices and Billing**: JobsGrid (+ Phone, Empty, NoMatch), InvoicesRows, InvoicesEmpty, InvoicesNoMatch, InvoiceSent, InvoiceRemindedToday, InvoicePastDue, InvoicePartPaid, InvoicePaid, InvoiceVoided (each with Phone), CustomerBillingSection (+ Phone).

Every story has a one-line description (docs panel) of what Ryan sees and the one primary action. Files are under `src/app/(admin)/admin/_screens/design/`; new blocks are in `src/components/blocks/`.

## New blocks (each with a story and a test, and a row in the DESIGN.md recipe table)

- `RecordPage`: the record panel's twin for the job as a page: header, facts in two columns (When, Where) from `lg`, sections, sticky footer bar (the same `RecordFooter`), and it gives `CollectPayment` its footer slot.
- `TripRow`: one trip as a row with its pills, money word and Move or Mark done on the row.
- `BillingSection`: Total, Paid, Unpaid, then invoice rows (open the invoice) and payment rows.
- `LineItemList`: lines with descriptions and the totals; used for What's included and for an invoice's frozen lines.

Reused as they are: `RecordFooter`, `SectionHeading`, `RecordFacts`, `RecordList`, `StatusPill`, `MoneyCell`, `CollectPayment`, `NotesAndHistory`, `MessageThread`, `PassCard`, `PageHeader`, `DataGrid` (with card slots), `StatTile`, `RecordPanel` (the invoice and the customer), `AdminShell`.

## Layout decisions

1. **The job is a page, not a panel.** One-trip job: title is the customer; subtitle "Sprinkler repair visit · Added Nov 18"; pills and the phone (tel link) under it; When and Where side by side (stacked on a phone); What's included beside Billing; Notes and history beside Messages. Nothing opens behind it.
2. **Buttons live in one footer bar**, per the recipe, not in the header too (one primary on screen). Which button leads, by state: Unscheduled Schedule; Scheduled Move; Today On my way; Late Mark done (with Skip); Done and unpaid Charge $145 (beat two is in Billing, its button in the footer); Done and paid none; Invoice sent and Past due Remind; Canceled no bar.
3. **More than one trip** (Season Pass, return trip): a Visits list in place of When; Move and Mark done sit on each row; the footer then has no primary. The pass is titled "Season Pass TH-2027-0008" with its card beside the lines.
4. **Billing on the job** reads the money word first ("Invoice sent, due Dec 2", red "Past due since Nov 17"), then Total, Paid, Unpaid, then the invoice as a row that opens the invoice panel (Remind and Record the payment live there and in the footer).
5. **Invoices screen**: four tiles, one grid, Past due first, seven columns, filters Status and Date, New invoice the one filled button. The invoice panel is the one `RecordPanel`: number, pill, customer and job links, sent, due, terms, reminder schedule line, frozen lines, payments, messages; footer Remind (or "Reminded today"), Record the payment, More (Copy pay link, Open job, Open customer), Cancel invoice.

## The Jobs grid column word: **Billing**

Not "Invoice": a job paid by card on file or by Venmo never has an invoice, so that column would be empty for most jobs, and the cell also says "$145 unpaid" or "Paid, Venmo". Billing matches the section on the job page and the customer page, so the grid, the page and the panel use one word. Cost: the glossary reserves "Billing" for the Settings tab; it needs the glossary row changed. Filter chips: Status, Billing (Unpaid, Invoice sent, Past due, Paid), Job (the services).

## The words

Money words are `src/lib/money/words.ts`'s ("Paid, Venmo", "Invoice sent, due Dec 2", "$145 unpaid"); status words are `jobs.ts`'s. Invoice statuses are Sent, Past due, Part paid, Paid, Voided (a canceled invoice stays on record). The tile Hannah called "Owed to you" reads **Unpaid**, because the design gate bans "Owed". No "Visits" nav item; "visit" and "trip" appear only on rows. No em dashes.

## The primary flow, in six lines

1. Ryan opens the job from Jobs, Home or the Schedule; the page shows the day, who and the line.
2. He taps the footer's primary (Schedule, Move, On my way).
3. On site he taps Mark done (one tap, "Done on" today).
4. "How is this paid?" appears in Billing: the card on file is selected; he taps Charge $145 in the footer, or picks Check, Venmo, Cash, Send an invoice.
5. Billing now reads "Paid, Venmo" or "Invoice sent, due Dec 2", and the job pill reads Done.
6. If an invoice is out, its row opens the invoice for Remind (by hand, plus 3 days before, on the due date, 7 days after) or Record the payment (a part payment is allowed).

## For Hannah to decide

1. **Buttons at the bottom or the top?** The design keeps the recipe's footer bar (sticky at the bottom, matches the panels). Jobber puts them at the top. Which do you want on the job page?
2. **A job with two trips has no primary button**; the work is on the rows. Is that clear, or should the footer lead with "Mark done" for the next trip?
3. **Billing as the grid word** (above), which changes one glossary row; and **Invoices in the nav** is not added in this PR (the rail still has six items) because a nav item with no route would 404 in the live admin.
