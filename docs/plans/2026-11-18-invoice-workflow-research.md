# The invoice lifecycle: where an invoice lives, how you find it, how it is reminded and shown as paid

Written 2026-11-18. Research only. Nothing was built. Companion to `docs/plans/2026-11-18-job-and-visit-workflow-research.md`. The section that holds money on a job or customer is called **Billing** (Hannah's word tonight, Jobber's word).

## 0. What Hannah said

"When I create or invoice is sent, I can't see the invoice. I don't know where it is. I can't send a reminder. I can't see if it was paid, right? That's confusing." Earlier she said Invoices should be a primary item in the left column.

What exists today (from the CLAUDE.md bullets, not read from source): an invoice is visible only inside the job panel's money block and the customer panel's Invoices block, with Remind and Pay link. "2 invoices out" is a Jobs filter. There is no Invoices screen; a build started and stopped tonight. Statuses in `src/lib/money/invoice.ts` are sent, paid, overdue and cancelled, shown as Invoice sent, Past due, Paid, Canceled. Remind is a button, once per day per invoice, never automatic. Home has Done, unpaid and Invoice past due rows. The pay page and receipt exist.

## 1. How the tools do it

### 1.1 Comparison table

| Tool | Where an invoice lives | How you find it right after sending | Status words | Reminder, by hand | Reminder, automatic | How a payment lands, how paid shows | What the customer sees |
|---|---|---|---|---|---|---|---|
| Jobber | Its own Invoices list in the main navigation; also the job's Billing section and the client's page | Save and Send lets you email, text or collect payment straight after saving; the list's Overview tiles count invoices by status, and the status is a one-click filter | Draft, Awaiting Payment, Past Due, Paid, Bad Debt, Voided | "Follow up on outstanding invoices" from the list (article does not name the button) | Two different things: Invoice reminders are prompts to the owner to invoice; Follow-ups are automatic messages to the client that an invoice is past due, set under Settings, Automation, on select plans. Timing not stated in the page read | Collect Payment: pick a method, pick the invoices, amount defaults to the full balance, partial allowed; Charge for card, Save for cash or check. Full balance means status Paid. Close invoice has three options (with a payment, as bad debt, without a payment) | An email or text with a link to client hub where the invoice is viewed and paid; a pay button with Jobber Payments; text links expire after 24 hours but the client signs in with the last 4 digits of the phone; toggles control whether a late stamp and the balance show |
| Housecall Pro | Per job (invoice summary on the job page with progress invoicing); an Invoices area in the app (tab not confirmed from the pages read) | "View and Send Invoice" on the job | Not fully listed; Void is named | Resend from the invoice's three-dot menu (re-sending restarts the reminder cadence) | Settings, Notifications, Customer, Invoices: Reminder toggle; every 1, 2, 3, 5, 7, 14 or 30 days; 1 to 10 reminders; start after the due date; need a finished job, a due date, a balance and a sent invoice; stop when marked Paid; exclude customers | The card icon on the job's invoice summary records a payment; a payment must cover the full invoice; also "Mark as paid" and card-on-file automatic payments that charge when the job is finished or on the due date | A sent invoice with pay link; a receipt for the charge |
| ServiceTitan | Invoice is created when the job is booked (number matches the job number); completed jobs show in the Invoices module under Accounting | The invoice is on the job; the Invoices module searches by invoice number, batch number and customer name | Three separate status columns: Review (Needs Review, On Hold, Reviewed), Sent (Not Sent, Sent, Sent (Opened)), Paid (Unpaid, Partially Paid, Paid, Overdue). Batch and export have their own: Pending, Posted, Exported | Not read | Not read | Paid status is set by the system from payments | Not read; "Sent (Opened)" shows the office whether the customer opened it |
| Square Invoices | Own Invoices page in the Dashboard and in the POS app (Invoices in the navigation bar) with an Overview page above it | The invoice list; Overview | Filters: Sent (unpaid, overdue, paid, refunded, cancelled, failed), Outstanding (unpaid, overdue, undelivered), Paid; a short "Payment Pending" | In the invoice's three-dot menu: send reminder, duplicate, share, cancel, archive, download, edit, add payment | Set on the invoice: up to five reminders, a custom number of days before the due date, on it, or after, each with a note. Email only; not supported for text | Add payment, or Mark as paid for money received outside Square; paid invoices show in Transactions | Email, text or shared link; pays by card, Apple Pay, Google Pay and others; optional partial payment, tip, save card |
| QuickBooks Online | Sales, Invoices list | The list with a Status column | Sent, Viewed, Paid, Overdue; a "(Reminded)" tag after a reminder goes out | In the row's Action dropdown: Send reminder (customize the message, Send); a batch option on the list | Settings, Account and settings, Sales, Reminders: up to three, each from 0 to 90 days before or after the due date; unpaid, already emailed invoices only | Receive payment on the invoice; partial payments supported | An email with the invoice and a pay link |

### 1.2 Sources

- Jobber, invoices list and key metrics: https://help.getjobber.com/en/articles/invoices-list-page-and-key-metrics/ (Overview tiles, Issued, Average invoice price, Average time to get paid; statuses; filters by status and due date; sorting by client, number, due date, status, total, balance)
- Jobber, invoice basics: https://help.getjobber.com/en/articles/invoice-basics/ (statuses, Save and Send, Reminders vs Follow-ups, Collect Payment, Close invoice, client hub). That page does not clearly describe how invoices list on the job or client page; it names the job's Billing section as a place to create one, which matches Hannah's screenshot.
- Housecall Pro, invoice reminders: https://help.housecallpro.com/en/articles/4249157-how-do-i-set-up-invoice-reminders
- Housecall Pro, invoice actions and summary: https://help.housecallpro.com/en/articles/8160826-invoice-actions-and-summary (the page does not mention an Invoices tab, so none is confirmed)
- Housecall Pro, marking invoices and jobs as paid: https://help.housecallpro.com/en/articles/7062125-marking-invoices-and-jobs-as-paid (from search summary)
- Housecall Pro, reminders vs auto invoicing: https://help.housecallpro.com/en/articles/4539516-what-s-the-difference-between-auto-invoicing-and-invoice-reminders (from search summary)
- ServiceTitan, understand invoice statuses: https://help.servicetitan.com/docs/understand-invoice-statuses ; overview of the invoicing process: https://help.servicetitan.com/docs/overview-of-the-invoicing-process (search summary)
- Square, manage Square Invoices online: https://squareup.com/help/au/en/article/6105 ; invoice reminders: https://squareup.com/us/en/invoices/features/invoice-reminders (search summary; the manage page lists no filters, the filter words come from the search summary of Square's help text)
- QuickBooks, send invoice reminders automatically or manually: https://quickbooks.intuit.com/learn-support/en-us/help-articles/send-email-payment-reminders-for-your-invoices/00/261887 ; the "(Reminded)" tag is from a search summary only

Not found: the Jobber follow-up schedule's timing (the page does not state it, so Hannah's "3 days before due, on the due date, 7 days after" is from her own look at the Jobber screen, not a source here); Housecall Pro's full status list; ServiceTitan's reminder behaviour; screenshots of any tool.

### 1.3 What they agree on

1. **An invoice is a first-class record with its own list.** Jobber, Square, QuickBooks and ServiceTitan all give invoices a screen of their own. Housecall Pro ties them most closely to the job. Nowhere is the only way to find an invoice to open the job it belongs to.
2. **The list answers "who owes me money" in one glance.** Jobber's Overview tiles break all invoices down by status, with each status a filter. Square groups into Sent, Outstanding, Paid.
3. **The status words are few and about the money:** Draft, awaiting or sent, past due or overdue, paid, plus voided or canceled. Jobber is the only one with Bad Debt. ServiceTitan alone splits review, sent and paid into three columns, because it serves accountants.
4. **A reminder has two forms.** By hand, from the row's menu (QuickBooks Action, Square three-dot, Jobber Follow up). Automatic, from a setting with a short schedule: QuickBooks up to three, from 0 to 90 days either side of the due date; Square up to five, before, on or after; Housecall Pro a repeat every 1 to 30 days, 1 to 10 times, after the due date. All stop when the invoice is paid, and re-sending restarts it (Housecall Pro).
5. **Paid shows as a status plus an activity line, and from the job.** A payment is recorded on the invoice (Jobber Collect Payment, Housecall Pro card icon, QuickBooks Receive payment), the status flips to Paid when the balance reaches zero, and partial payments are supported in all but Housecall Pro.
6. **The customer gets one link to one page where they see the invoice and pay.** Jobber's client hub, Square's invoice page. ServiceTitan marks "Sent (Opened)" so the office knows it was seen.

## 2. The gap in our admin, in her words

| She said | Why it happens today |
|---|---|
| "I can't see the invoice. I don't know where it is." | It exists only as a block inside two panels. After Send an invoice nothing takes you to it |
| "I can't send a reminder." | Remind is on the invoice row, inside the job panel's money block and the customer panel; there is no list to start from, and Home shows it only once the invoice is past due |
| "I can't see if it was paid." | Paid is shown as a word in the Money cell and in the block, after the fact, with no activity trail you can open from where you are |

## 3. The options

### 3.1 Where an invoice lives, and how it is found

**Option 1. Its own screen and its own panel in the left column.** Invoices sits in the left column between Jobs and Customers (the nav becomes Home, Schedule, Jobs, Invoices, Customers, Reports, Settings). It is a grid, one row per invoice: Invoice number, Customer, Job, Sent, Due, Total, Balance, Status. A strip above it shows the overview as tiles (Out, Past due, Paid this month, Draft or not sent), each tile a filter, as Jobber's and Square's do. A row opens the invoice panel on the same `RecordHost` as every other record: lines, totals, the pay link, its activity (Sent by text, Reminded, Opened pay page, Paid by card), the footer (Remind or Send again, Record the payment, Open the pay link, Cancel invoice). After Send an invoice, the invoice's panel opens at once.
- Plus: answers all three of her complaints directly; matches Jobber, Square and QuickBooks; she asked for it as a nav item.
- Minus: a seventh left-column entry. The phone bottom bar already has five slots, so Invoices would go under More or replace nothing.

**Option 2. No new screen; a Billing section on the job that opens the invoice.** The job panel's and customer panel's Billing section lists each invoice as a row (INV 36, $145, Sent Nov 18, due Dec 2, Past due) and a row opens the invoice panel on top. Jobs grid's Billing column shows the same words.
- Plus: nothing new in the nav, nothing to learn.
- Minus: no way to ask "what is unpaid across everything" except the Jobs filter. That is the screen she could not find, so the problem stays for the weekly money question.

**Option 3. Rows on Home only.** Home already has Done, unpaid and Invoice past due. Add an Invoice sent row ("Invoice for Andrea, $145, waiting") with Remind and Open.
- Plus: reaches Ryan where he already looks.
- Minus: Home is today's list; an invoice sent three weeks ago is not today's work. Never enough alone.

**What the tools suggest.** Every one of them does Option 1 for the list plus Option 2 for the job (the job's Billing is where an invoice is created and shown; the list is where it is tracked). Home rows are an extra, for the exceptions.

### 3.2 Status words

Today: Invoice sent, Past due, Paid, Canceled (on the job as Unpaid, Invoice sent, Past due, Paid). Choices:
- **Keep Jobber's names for the invoice:** Draft, Awaiting payment, Past due, Paid, Voided. Familiar to Hannah, who knows Jobber. "Voided" and "Draft" are new here (a draft means an invoice made but not sent; our invoices are sent when created, so Draft only exists if she wants it).
- **Keep ours, plain:** Sent, Past due, Paid, Canceled. Matches the words Hannah ruled on Nov 18 (Invoice, not bill; Past due, not overdue; Canceled).
- Partial payments: today a visit is paid in full or not, and an amount above what is unpaid is refused. Say "Paid $50 of $145" only if she wants partial payments (Jobber, Square and QuickBooks allow them; Housecall Pro does not).
- Two things shown together on the job and the list: the invoice's status and the job's billing line ("$145 · Invoice sent, due Dec 2"), as in Jobber's Billing column. Never a second status vocabulary.

### 3.3 Reminders

- **Manual, as now:** a Remind button, once per day per invoice, never automatic. Reachable from three places: the invoice panel, the invoices grid row, and the Home Invoice past due row.
- **Automatic, a setting:** Settings › Billing, a short schedule for texts and emails. QuickBooks allows up to three at 0 to 90 days either side of the due date; Square up to five before, on or after; Housecall Pro repeats every 1 to 30 days for 1 to 10 times after the due date. Hannah's reading of Jobber is "3 days before due, on the due date, 7 days after". Our default could be those three, editable, off by default or on by default. All stop when paid, and a canceled invoice stops them; re-sending restarts them (Housecall Pro's rule).
- Both: the manual button stays, since a person may want to nudge today; the automatic schedule is the safety net. The reminder text is the one already editable in Settings › Messages.
- The activity line must show every reminder, automatic or manual ("Reminded by text, Nov 25, by schedule"), so nobody sends a second one by hand without knowing.

### 3.4 How paid shows everywhere

One truth, the payment rows, read the same way on every screen (this is already how `src/lib/money/words.ts` works):
- the invoice panel (status Paid, activity "Paid by card, Nov 20, receipt emailed");
- the invoices grid (Status, Balance 0, and the Paid this month tile);
- the job's Billing section (the invoice row and the "Paid, card" line) and the Jobs grid's Billing column;
- the customer panel's Billing block;
- Home: the row goes away; no Paid row, because "paid" is not work (the row for the invoice disappears and the Revenue figure moves);
- the customer's side: the pay page changes to "Paid" with a receipt link, and the account shows a Receipt link.

## 4. Recommendation

**Build Option 1 and Option 2 together, with the Home rows kept: an Invoices screen and invoice panel in the left column, a Billing section on the job and the customer that lists each invoice and opens its panel, and Home rows for the exceptions.** Keep our words (Sent, Past due, Paid, Canceled) with the amount and due date, show manual Remind from all three places, and add the automatic schedule as a Settings › Billing option, default three reminders (3 days before the due date, on it, and 7 days after), editable, and stopped by payment or cancel.

Reasons from the research: every tool studied has a list of invoices and shows them on the job; reminders come in both manual and scheduled forms and stop on payment; and one payment source of truth means "paid" can show everywhere without a second status.

Reasons from her words: she could not see the invoice (list and panel opened on send), could not send a reminder (the button is in the panel, the grid row and Home), and could not see if it was paid (status, balance and activity).

What it changes in the data model: probably nothing for the screen. The invoice record, its status derivation and the reminder-once-a-day rule exist. The automatic schedule needs a place to store the schedule (a Settings › Billing setting) and a way to record each reminder sent (an `event` row of kind `invoice.reminded`, which the event writer already supports in principle) and a job that runs the schedule. That is new work, not a model change to the invoice. Confirm by reading `src/lib/money/invoice.ts` before building: not done here.

## 5. Questions for Hannah, in the order to ask

1. **Do you want Invoices as its own item in the left column, a list of every invoice, as well as a Billing section on each job?** Options: both (the default), or only Billing on the job and customer.
2. **Should reminders also go out on their own on a schedule, or only when you press Remind?** Options: automatic as well (default: three, 3 days before it is due, on the day, and 7 days after, editable in Settings › Billing), or only the button.
3. **Do you want customers to be able to pay part of an invoice, and should the screen show "Paid $50 of $145"?** Options: no, an invoice is paid in full or not at all (default, as now), or yes, with part payments shown.

Words are not asked: she ruled on them Nov 18 (Invoice, Past due, Paid, Canceled) and Billing tonight.
