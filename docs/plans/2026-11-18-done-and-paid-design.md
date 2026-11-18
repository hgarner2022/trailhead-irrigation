# Finishing a visit and getting paid (design)

Nov 18 2026, with Hannah's answers and her endorsement of the flow. Design only; nothing is built until Hannah has read it, and it runs after step 6 merges. Hannah: "It's not clear that when you complete Done, it's going to charge the card on file."

## 1. The job to be done

"I finished the visit. I need to get paid for it, now or later, and know it happened. The customer needs to know what they paid and for what."

This replaces the Nov 14 line "One tap: Done. The charge and the receipt happen". Ryan still builds no invoice.

## 2. What the tools do

- **Jobber:** completing a visit and Collect payment are separate screens. Collect charges a saved or typed card, or the reader; cash and check are records that charge nothing. [Collect payment](https://help.getjobber.com/en/articles/how-to-collect-payment-on-an-invoice/)
- **Jobber** charges on completion only where "Get paid automatically" is on, tries once, never retries, and tells only the admin on failure. [Automatic payments](https://help.getjobber.com/en/articles/automatic-payments/)
- **Housecall Pro:** after the job you send an invoice or collect on the spot, and Tap to Pay makes the phone the terminal. [Payment processing](https://www.housecallpro.com/features/payment-processing/) It emails the customer when a service plan card fails. [Recurring payments](https://www.housecallpro.com/resources/recurring-service-agreement-payments/)
- **ServiceTitan:** collect the balance before closing the job, then email the invoice. [Handoffs](https://help.servicetitan.com/docs/manage-job-documentation-and-handoffs-1)
- **Stripe:** failed cards retry automatically (default up to 8 tries in 2 weeks) and dunning emails carry an update link. [Automatic collection](https://docs.stripe.com/invoicing/automatic-collection)
- **Stripe Terminal:** Tap to Pay on iPhone needs a native app, not a web page. [Tap to Pay](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay)

**Money follows ServiceTitan and Jobber's Collect screen: its own step, started by a button.** A failed card follows Stripe and Housecall Pro: email the customer at once, retry, tell staff in parallel; Jobber's no-retry way is not followed. Housecall and ServiceTitan details are from search summaries.

## 3. The flow, two beats on one screen

The visit panel stays open between beats.

**Beat one, "Mark done".** The day and the button; "Not done" with its reasons is the alternative.

**Beat two, "How is this paid?"** replaces beat one at once. The card on file is the default: preselected for every customer with a real Stripe card, and still a button. Nothing moves money until the button is pressed; Done never charges.

| Choice | Line under it | Button |
|---|---|---|
| Charge the Visa ending 4242 now (default, only with a real card) | Charges $145 to the card and emails a receipt | Charge $145 |
| Check, Venmo | Check number or handle field, emails a receipt | Record $145 paid |
| Cash | Emails a receipt | Record $145 paid |
| Send a bill | Texts a pay link, due in 14 days | Send the bill |
| Pay later (only when the customer has no card) | Nothing is collected now; it reads Owed until a payment or a bill | Leave it owed |
| Tap to pay (greyed) | Not built yet | none |

```
LAPTOP, visit panel                        after Mark done (customer has a card)
+------------------------------+          +------------------------------+
| Andrea Reyes   [Scheduled]   |          | Andrea Reyes   [Done] [$145] |
| Spring turn-on · $145        |          | Spring turn-on · $145 owed   |
| Mark done                    |  press   | How is this paid?            |
| Done on [Nov 18]             |  ----->  | (o) Charge the Visa ending   |
| [ Mark done ]                |          |     4242 now                 |
| Not done: [reason v]         |          |     Charges $145 to the card |
| [ Mark not done ]            |          |     and emails a receipt     |
+------------------------------+          | ( ) Check ( ) Venmo ( ) Cash |
                                          | ( ) Send a bill              |
                                          | ( ) Tap to pay (not built)   |
                                          | [ Charge $145 ]              |
                                          +------------------------------+
```

```
PHONE, beat two (rows 56px, one button pinned at the bottom)
+--------------------------+
| < Andrea Reyes           |
| Done  ·  $145 owed       |
| How is this paid?        |
| [x Charge the Visa 4242] |
| [ Check ] [ Venmo ]      |
| [ Cash ]  [ Send a bill ]|
| [ Charge $145 ]          |
+--------------------------+
```

**Season Pass.** The card was agreed at checkout, so beat two reads "Charge the card as agreed", preselected, with no Pay later. A quiet "Paid another way" still opens Check, Venmo and Cash for money handed over at the door. A pass sold by the office with no card gets the no-card choices, Pay later included.

**During and after.** While it runs, choices and button are disabled with "Charging $145 to the Visa ending 4242". After: the money word ("Paid, card") and "Receipt emailed to Andrea."

**A card that doesn't go through is automated; nothing waits on Ryan.**
1. The panel says "The card didn't go through. Choose another way."
2. The customer is emailed at once with the card update link (`cardFailedEmail`).
3. The charge retries when the card is fixed (`applyCardUpdate`'s `afterCardUpdate`) and once more after 3 days, then stops.
4. In parallel Today and Home's Needs action show "Card failed" with **Send card link** until a payment exists.

**Done but never charged, never automatic.** Jobber has the same hole and lives with it: its manual Collect path leaves the invoice Awaiting Payment until someone collects. We add one row and still never charge on our own. The next morning (done on an earlier day, no payment row, a card on file) Needs action reads "Charge not pressed for Andrea's spring turn-on" with **Charge $145** on the row, and the visit's money reads "$145 owed · card on file".

**Undo.** Undo Done works until a payment row exists (it cancels an unpaid bill and any waiting retry). After a payment it says "Refund the payment from the job first".

**Pay later** (no card) shows under Needs action at once, as "Done, owed".

**Office and phone.** The Jobs panel shows the same beat two on a Done and Owed job (one `CollectPayment` component). Ryan's phone has the same two beats: two taps where today it is one.

## 4. What the customer gets

- **Card charged:** `receiptEmail` (`src/emails/account-messages.ts`), "We charged $145 to your Visa ending 4242", on success.
- **Check, Venmo, cash:** `receiptEmail`, "We received $145 by check", on Record.
- **Bill:** `invoiceEmail` (`src/emails/invoice.ts`) and `invoiceText` (`src/sms/texts.ts`), on Send the bill; reminders stay a button.
- **Card didn't go through:** `cardFailedEmail` with the update link, at once; again only if the day-3 try fails.

## 5. Statuses against the data model

Every cell is read from facts by `src/lib/money/words.ts` (`visitMoney`, `jobMoney`) and the locked lifecycle table (payment Succeeded or Failed, a refund a negative row; invoice Sent, Paid, Overdue). Check, Venmo and cash are one row: only the word differs.

| Outcome | Visit | Payment row | Invoice | Job money | Today / Home | Customer gets |
|---|---|---|---|---|---|---|
| Card charged | Done, Paid, card | +145 card_on_file, succeeded | none | Paid | Done today "Paid, card" | receipt |
| Card charge pending | Done, Owed (A) | +145 card_on_file, pending | none | $145 owed | "$145 owed" for seconds | nothing yet |
| Card failed | Done, Failed | +145 card_on_file, failed | none | $145 owed (E) | Needs action "Card failed" + Send card link | card-failed email |
| Card failed, then fixed | Done, Paid, card | failed row stays; a second succeeded | none | Paid | leaves Needs action | receipt |
| Check, Venmo, cash | Done, Paid, Venmo | +145 same method, succeeded | none | Paid | Done today "Paid, Venmo" | receipt |
| Bill sent | Done, Bill sent | none | Sent, due +14 days | Bill sent | "Bill sent"; past due: "Bill overdue" + Remind | bill text or email |
| Bill paid on the pay page | Done, Paid, card | +145 card_now, succeeded, on the job | Paid | Paid | leaves | bill receipt |
| Bill paid by check later | Done, Paid, check | +145 check, succeeded | Paid | Paid | leaves | receipt |
| Charge not pressed (card on file) | Done, Owed · card on file (H) | none | none | $145 owed | Done today; next morning "Charge not pressed" + Charge $145 | nothing |
| Pay later (no card) | Done, Owed | none | none | $145 owed | "Done, owed" at once | nothing |
| Full refund, card | Done, Owed (B) | -145 naming the payment, succeeded; Stripe refunds | stays Paid (D) | $145 owed | "Done, owed" | Stripe's notice only (C) |
| Full refund, check, Venmo, cash | Done, Owed (B) | -145, record only | stays Paid (D) | $145 owed | "Done, owed" | nothing (C) |
| Part refund | Done, Owed | -40 | stays Paid (D) | $40 owed | "Done, owed" | nothing (C) |
| Undo Done, no payment | Scheduled | none; retry and open bill cancelled | Cancelled if out | no word | leaves Done today | nothing |

**What the model cannot express yet:**
- **A.** No word for a pending row, so a charge in flight reads Owed. Add a derived "Charging".
- **B.** No Refunded word: a full refund reads Owed and returns the visit to Needs action, wrong for a goodwill refund.
- **C.** `payments.refund` queues no customer message.
- **D.** A paid bill still reads Paid after a refund.
- **E.** The visit says Failed, the job says "$145 owed".
- **F.** The day-3 retry needs a delayed queue item and a cap of three; `applyCardUpdate` finds failed charges by pass id and must read the job.
- **G.** Today's row is "Charge failed" (`NeedsAttention.tsx:37`); it becomes "Card failed".
- **H.** `visits-model.ts:63` adds " · no card" to Owed; add " · card on file" and a Needs action kind beside "Done, owed".

## 6. Checked against

- **Lifecycle table:** every state is a payment row or an invoice date; words come from `words.ts`. Nothing is typed.
- **Season Pass checkout:** it promises "We charge the card after each visit" (`checkout-summary.tsx:39`) and the site says "once the visit is done" (`season-pass/page.tsx:49`). The charge is one press right after Done; the morning row keeps the promise.
- **Today's Done today group:** a done visit stays there with its money word; no new group.
- **Receipt and card-failed messages:** both unchanged, sent by the charge result, never by Done.
- **Customer portal:** the pass page reads the same rows (Paid, Owed, the bill's link), so an unpressed charge shows Owed, which is true.
- **Jobber's Collect payment:** a separate screen where a charge is a button and cash or check a record; ours matches, card first.
- **ServiceTitan:** it advises collecting before closing. We collect right after Done on the same panel, since Done also moves the schedule; the morning row stands in for its nudge.

## 7. What changes in code

| Part | Today | After |
|---|---|---|
| `doneAsksPaidBy`, `PaidByChoice` | `VisitMoveDone.tsx:140`, `:106` | Gone. `DoneForm` is the day and Mark done. |
| New `CollectPayment` block | n/a | Used by `VisitPanel.tsx:155`, `JobPanel.tsx:120`, `JobDialogs.tsx`. |
| `visits.markClosed` | `src/api/v1/visits/money.ts:56`, takes `paidBy`, enqueues `pass-charge` | Only marks done and undoes; collecting is a separate call. |
| `payments.chargeCard` | does not exist | New. Charges the amount owed; refuses no real card, already paid, or a charge in flight. |
| `chargeVisit` | `charge-visit.ts:39` refuses a visit with no pass | Takes any job with a real card; schedules the day-3 retry. |
| `pass-charge` queue | enqueued by Done | Triggered by the button; retries after a card update or on day 3. |
| Words, stories | `docs/UX_WRITING.md` | Add the new words. Stories `blocks-collectpayment--default-card`, `--pass-as-agreed`, `--no-card`, `--charging`, `--didnt-go-through`, `--phone`. |

No new tables.

## 8. Decided and still open

Hannah decided, Nov 18: the card is the default; a pass always charges it; a failed card is automated; Pay later shows at once. Still open, one word each:
1. Add a derived "Refunded" word so a refund does not read Owed (B)? (yes or no)
2. Keep "Paid another way" on a Season Pass visit that has a card? (yes or no)
