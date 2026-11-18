# Finishing a visit and getting paid (design)

Nov 18 2026, revised with Hannah's four answers. Design only; nothing is built until Hannah has read it, and it runs after step 6 merges. Hannah: "It's not clear that when you complete Done, it's going to charge the card on file."

## 1. The job to be done

"I finished the visit. I need to get paid for it, now or later, and know it happened. The customer needs to know what they paid and for what."

This replaces the Nov 14 line "One tap: Done. The charge and the receipt happen". Ryan still builds no invoice; he makes one deliberate money choice right after Done.

## 2. What the tools do

- **Jobber:** completing a visit and Collect payment are separate screens. Collect charges a saved card, a typed card or the reader; cash and check are records that charge nothing. [Collect payment](https://help.getjobber.com/en/articles/how-to-collect-payment-on-an-invoice/)
- **Jobber** charges the saved card on completion only where "Get paid automatically" is on for the job, tries once, never retries, and tells only the admin when it fails. [Automatic payments](https://help.getjobber.com/en/articles/automatic-payments/)
- **Housecall Pro:** after the job you send an invoice or collect on the spot, and Tap to Pay makes the phone the terminal. [Payment processing](https://www.housecallpro.com/features/payment-processing/) It emails the customer when a service plan card fails. [Recurring payments](https://www.housecallpro.com/resources/recurring-service-agreement-payments/)
- **ServiceTitan:** collect the balance before closing the job, then email the invoice. [Handoffs](https://help.servicetitan.com/docs/manage-job-documentation-and-handoffs-1)
- **Stripe:** failed card payments retry automatically (new accounts default to up to 8 tries in 2 weeks) and dunning emails carry a link to update the card. [Automatic collection](https://docs.stripe.com/invoicing/automatic-collection)
- **Stripe Terminal:** Tap to Pay on iPhone exists only in native SDKs, so a web page cannot do it. [Tap to Pay](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay)

**Money follows ServiceTitan and Jobber's Collect screen: its own step, started by a button.** A failed card follows Stripe and Housecall Pro: email the customer at once with an update link, retry, tell staff in parallel. Jobber's no-retry way is not followed. Housecall and ServiceTitan details are from search summaries.

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

**Season Pass.** The card was agreed at checkout, so beat two reads "Charge the card as agreed", preselected, with no Pay later. A quiet "Paid another way" (today's wording) still opens Check, Venmo and Cash for money handed over at the door; Send a bill and Pay later are not offered. A pass sold by the office with no card yet gets the no-card choices above, Pay later included.

**During and after.** While it runs, choices and button are disabled with "Charging $145 to the Visa ending 4242". After, the money word ("Paid, card") and "Receipt emailed to Andrea."

**A card that doesn't go through is automated; nothing waits on Ryan.**
1. The panel says "The card didn't go through. Choose another way." and the other choices stay.
2. The customer is emailed at once with the card update link (`cardFailedEmail`).
3. The charge retries when the card is fixed (`applyCardUpdate`'s `afterCardUpdate` retry) and once more after 3 days. After that it stops.
4. In parallel, Today and Home's Needs action show "Card failed" with **Send card link**, until a payment exists.

**Undo.** Undo Done works until a payment row exists (it cancels an unpaid bill and any waiting retry). After a payment it says "Refund the payment from the job first".

**Pay later** shows under Needs action at once, as "Done, owed".

**The office path.** On the Jobs panel a Done and Owed job shows the same beat two, built once as `CollectPayment`, in place of the "Record the payment" dialog, for the job's balance. **Ryan's path** is the same two beats on the phone: two taps where today it is one.

## 4. What the customer gets

- **Card charged:** `receiptEmail` (`src/emails/account-messages.ts`), "We charged $145 to your Visa ending 4242", sent on success.
- **Check, Venmo, cash:** the same `receiptEmail`, "We received $145 by check", sent when Ryan presses Record. The reference stays private.
- **Bill:** `invoiceEmail` (`src/emails/invoice.ts`) and `invoiceText` (`src/sms/texts.ts`), sent on Send the bill; reminders stay a button.
- **Card didn't go through:** `cardFailedEmail` with the update link, at once; a second one only if the day-3 try fails too.

## 5. Statuses against the data model

Every cell is read from facts by `src/lib/money/words.ts` (`visitMoney`, `jobMoney`) and the locked lifecycle table (payment Succeeded or Failed, a refund a negative row; invoice Sent, Paid, Overdue). Check, Venmo and cash are one row: they differ only in the word.

| Outcome | Visit | Payment row | Invoice | Job money | Today / Home | Customer gets |
|---|---|---|---|---|---|---|
| Card charged | Done, Paid, card | +145 card_on_file, succeeded | none | Paid | Done today "Paid, card" | receipt |
| Card charge pending | Done, Owed (A) | +145 card_on_file, pending | none | $145 owed | "$145 owed" for seconds | nothing yet |
| Card failed | Done, Failed | +145 card_on_file, failed, with message | none | $145 owed (E) | Needs action "Card failed" + Send card link | card-failed email at once |
| Card failed, then fixed | Done, Paid, card | the failed row stays; a second row succeeded | none | Paid | leaves Needs action | receipt |
| Check, Venmo, cash | Done, Paid, check / Venmo / cash | +145 same method, succeeded, reference | none | Paid | Done today "Paid, Venmo" | receipt, "by Venmo" |
| Bill sent | Done, Bill sent | none | Sent, due +14 days | Bill sent | "Bill sent"; Overdue after the due day: Needs action "Bill overdue" + Remind | bill text or email |
| Bill paid on the pay page | Done, Paid, card | +145 card_now, succeeded, on the job | Paid | Paid | leaves | bill receipt |
| Bill paid by check later | Done, Paid, check | +145 check, succeeded | Paid (the payment settles it) | Paid | leaves | receipt |
| Pay later | Done, Owed | none | none | $145 owed | Needs action "Done, owed" at once | nothing |
| Full refund, card (on file or pay page) | Done, Owed (B) | a -145 row naming the payment, same card method, succeeded; Stripe refunds | stays Paid (D) | $145 owed | Needs action "Done, owed" | Stripe's own refund notice only (C) |
| Full refund, check, Venmo, cash | Done, Owed (B) | -145 row, record only | stays Paid (D) | $145 owed | Needs action "Done, owed" | nothing (C) |
| Part refund, any kind | Done, Owed | -40 row | stays Paid (D) | $40 owed | Needs action "Done, owed" | nothing (C) |
| Undo Done, no payment yet | Scheduled | none; any retry and open bill cancelled | Cancelled, if one was out | no word | leaves Done today | nothing |

**What the model cannot express yet** (decisions needed in the build):
- **A. Pending.** `words.ts` has no word for a pending row, so a charge in flight reads Owed. Add one derived word, "Charging", from the pending row.
- **B. Refunds.** There is no Refunded word: a full refund reads Owed and puts a done, refunded visit back on Needs action, which is wrong for a goodwill refund. Fix by cancelling the line, or derive "Refunded" from rows that net to zero.
- **C.** `payments.refund` queues no customer message.
- **D.** A paid bill still reads Paid after a refund; an invoice has no refund state.
- **E.** The visit says Failed and the job says "$145 owed".
- **F. Retries.** The day-3 retry needs a delayed queue item and a cap of three attempts; `applyCardUpdate` finds failed charges by pass id, so it must read the job.
- **G.** Today's row is "Charge failed" (`NeedsAttention.tsx:37`); it becomes "Card failed", Hannah's words.

## 6. What changes in code

| Part | Today | After |
|---|---|---|
| `doneAsksPaidBy`, `PaidByChoice` | `VisitMoveDone.tsx:140`, `:106` | Gone. `DoneForm` is the day and Mark done. |
| New `CollectPayment` block | n/a | One component used by `VisitPanel.tsx:155`, `JobPanel.tsx:120` and `JobDialogs.tsx`. |
| `visits.markClosed` | `src/api/v1/visits/money.ts:56`, takes `paidBy`, enqueues `pass-charge` | Splits: it only marks done and undoes; collecting is a separate call. |
| `payments.chargeCard` | does not exist | New. Charges the amount owed; refuses no real card, already paid, or a charge in flight. Runs `chargeVisit` inside the call. |
| `chargeVisit` | `charge-visit.ts:39` refuses a visit with no pass | Takes any job whose customer has a real card; schedules the day-3 retry on a failure. |
| `pass-charge` queue | enqueued by Done | Triggered by the button; retries only after a card update or on day 3. |
| Words, stories | `docs/UX_WRITING.md` | Add the new words. Stories `blocks-collectpayment--default-card`, `--pass-as-agreed`, `--no-card`, `--charging`, `--didnt-go-through`, `--phone`. |

No new tables.

## 7. Decided and still open

Hannah decided, Nov 18: the card is the default; a pass always charges it; a failed card is automated; Pay later shows at once. Still open, one word each:
1. Add a derived "Refunded" word so a refund does not read Owed (B)? (yes or no)
2. Keep "Paid another way" on a Season Pass visit that has a card? (yes or no)
