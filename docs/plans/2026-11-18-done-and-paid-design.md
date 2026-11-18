# Finishing a visit and getting paid (design)

Nov 18 2026. Design only; nothing is built until Hannah has read it, and it runs after step 6 merges. Hannah: "It's not clear that when you complete Done, it's going to charge the card on file."

## 1. The job to be done

"I finished the visit. I need to get paid for it, now or later, and know it happened. The customer needs to know what they paid and for what."

This replaces the Nov 14 line "One tap: Done. The charge and the receipt happen" (`docs/plans/2026-11-14-jobs-to-be-done.md`). Ryan still builds no invoice; he makes one deliberate money choice, on the same screen, right after Done.

## 2. What the tools do

- **Jobber:** completing a visit and Collect payment are separate screens. Collect charges a saved card, a typed card or the reader; cash and check are saved as records that charge nothing. [Collect payment](https://help.getjobber.com/en/articles/how-to-collect-payment-on-an-invoice/)
- **Jobber** charges the saved card on completion only where "Get paid automatically" was switched on for that job, and emails a receipt. [Automatic payments](https://help.getjobber.com/en/articles/automatic-payments/)
- **Housecall Pro:** once the job is finished you send an invoice or collect on the spot; Tap to Pay makes the phone the terminal. [Payment processing](https://www.housecallpro.com/features/payment-processing/)
- **Housecall Pro** emails the customer a receipt on payment. [Take payments](https://help.housecallpro.com/en/articles/2785726-take-payments)
- **ServiceTitan:** collect the balance before closing the job; pay, confirm amount and type, get a signature, email the invoice. [Handoffs](https://help.servicetitan.com/docs/manage-job-documentation-and-handoffs-1)
- **Stripe Terminal:** every in-person payment must offer a printed or emailed receipt; Tap to Pay on iPhone exists only in native SDKs, so a web page cannot do it. [Receipts](https://edge-docs.stripe.com/terminal/features/receipts), [Tap to Pay](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay)

**This follows ServiceTitan and Jobber's Collect payment screen: money is its own step, started by a button.** It skips Jobber's automatic charge on completion, the behavior Hannah found unclear. (Housecall and ServiceTitan details are from search summaries.)

## 3. The flow, two beats on one screen

The visit panel (laptop side panel, phone full screen), which stays open between beats.

**Beat one, "Mark done".** The day and the Mark done button; "Not done" with its reasons is the alternative. Undo for ten seconds.

**Beat two, "How is this paid?"** replaces beat one at once. One choice, then one button that says what it does. Nothing moves money until that button is pressed, and Done never charges a card.

| Choice | Line under it | Button |
|---|---|---|
| Charge the Visa ending 4242 now (only for a real card on file) | Charges $145 to the card and emails a receipt | Charge $145 |
| Check | Check number field, emails a receipt | Record $145 paid |
| Venmo | Venmo handle field, emails a receipt | Record $145 paid |
| Cash | Emails a receipt | Record $145 paid |
| Send a bill | Texts a pay link, due in 14 days | Send the bill |
| Pay later | Nothing is collected now. It reads Owed until a payment or a bill | Leave it owed |
| Tap to pay (greyed) | Not built yet | none |

A visit with no price yet also asks "Amount received". The 14 is `settings.billing.dueDays`.

```
LAPTOP, visit panel                        after Mark done
+------------------------------+          +------------------------------+
| Andrea Reyes   [Scheduled]   |          | Andrea Reyes   [Done] [$145] |
| Spring turn-on · $145        |          | Spring turn-on · $145 owed   |
|                              |  press   |                              |
| Mark done                    |  ----->  | How is this paid?            |
| Done on [Nov 18]             |          | (o) Charge the Visa ending   |
| [ Mark done ]                |          |     4242 now                 |
|                              |          |     Charges $145 to the card |
| Not done: [reason v]         |          |     and emails a receipt     |
| [ Mark not done ]            |          | ( ) Check  ( ) Venmo ( ) Cash|
+------------------------------+          | ( ) Send a bill ( ) Pay later|
                                          | ( ) Tap to pay (not built)   |
                                          | [ Charge $145 ]              |
                                          +------------------------------+
```

```
PHONE, beat two (same choices, rows 56px tall, one button pinned at the bottom)
+--------------------------+
| < Andrea Reyes           |
| Done  ·  $145 owed       |
| How is this paid?        |
| [ Charge the Visa 4242 ] |
| [ Check ] [ Venmo ]      |
| [ Cash ]                 |
| [ Send a bill ]          |
| [ Pay later ]            |
| [ Charge $145 ]          |
+--------------------------+
```

**Before, during, after.**

- Before: "$145" and the Scheduled pill. After Done: "$145 owed" and the Done pill, read from the facts (no payment row).
- During: choices and button are disabled and a status line reads "Charging $145 to the Visa ending 4242" ("Recording..." and "Sending the bill..." for the others).
- After: the money word is read from the rows, not typed: "Paid, card", "Paid, Venmo" (and check, cash), "Bill sent, due Dec 2", or "$145 owed" for Pay later. The line under it: "Charged $145 to the Visa ending 4242. Receipt emailed to Andrea."
- When the card doesn't go through, beat two stays open with "The card didn't go through. Choose another way." and the card choice is marked.

**Undo.** Undo Done works until a payment row exists (today's rule; an unpaid bill is cancelled with it), so it works after Pay later. After a payment it says "Refund the payment from the job first" (`payments.refund`).

**Leaving beat two alone.** A done visit with nothing paid shows beat two whenever the panel opens and reads Owed on Today and Home; Pay later is that state chosen on purpose.

**The office path.** Hannah opens the job on Jobs. A Done and Owed job shows the same beat two, built once as `CollectPayment`, in place of the "Record the payment" dialog, for the job's balance.

**Ryan's path.** The same two beats on the phone, with the bigger rows above: two taps where today it is one.

**Season Pass.** The card was agreed at checkout, so "Charge the card as agreed" is preselected, with the line "Charges $145 to the Visa ending 4242 and emails a receipt". It is still a button. Any other visit preselects nothing and the button stays off until a choice is made.

## 4. What the customer gets

Existing templates, no new wording.

- **Card charged:** `receiptEmail` (`src/emails/account-messages.ts`), "We charged $145 to your Visa ending 4242", with View the receipt. Sent when the charge succeeds.
- **Check, Venmo, cash:** the same `receiptEmail`, "We received $145 by check". Sent when Ryan presses Record. The reference is not shown to the customer.
- **Bill:** `invoiceEmail` (`src/emails/invoice.ts`) and `invoiceText` (`src/sms/texts.ts`), "Trailhead: your bill for the repair is $145, due Dec 2. Pay here: ...". Sent when Ryan presses Send the bill; reminders stay a button.
- **Card didn't go through:** `cardFailedEmail`, as today.
- **Pay later:** the customer hears nothing until a payment or a bill.

## 5. What changes in code

| Part | Today | After |
|---|---|---|
| `doneAsksPaidBy`, `PaidByChoice` | `VisitMoveDone.tsx:140`, `:106` | Gone. `DoneForm` is the day and Mark done. |
| New `CollectPayment` block | n/a | One component with the choices, lines and button, used by `VisitPanel.tsx` (`:155` "Record the payment"), `JobPanel.tsx:120` and `JobDialogs.tsx`. |
| `visits.markClosed` | `src/api/v1/visits/money.ts:56`, takes `paidBy`, enqueues `pass-charge`, records payments, sends bills | Splits: it only marks done and undoes; collecting is a separate call. |
| `payments.record`, `invoices.send` | exist | Unchanged; the buttons call them. `visits.recordPayment` goes in step 6. |
| `payments.chargeCard` | does not exist | New, scope write. Charges the amount owed; refuses no real card, already paid, or a charge in flight. Runs `chargeVisit` inside the call, so the panel can show the pending state. |
| `chargeVisit` | `src/lib/pass/server/charge-visit.ts:39` refuses a visit with no pass ("not-a-pass-visit") | Takes any job whose customer has a real card, since the card lives on the customer (step 3). |
| `pass-charge` queue | enqueued by Done | Triggered by the button; the queue only retries after a card update (`afterCardUpdate`). |
| Words | `docs/UX_WRITING.md` | Add "How is this paid?" and "Pay later"; "charge" is a button and email verb only (the money word stays Paid). Update `DESIGN.md` and the JTBD rows. |
| Stories | n/a | `blocks-collectpayment--pass-preselected`, `--one-off-card`, `--no-card`, `--unpriced`, `--charging`, `--paid-card`, `--didnt-go-through`, `--pay-later`, `--phone`. Tests: Done writes no payment row; `chargeCard` is idempotent. |

No new tables.

## 6. Open questions for Hannah

1. For a one-off customer who has a card on file, should the card be preselected like a pass? (yes or no)
2. May Ryan choose Pay later on a Season Pass visit? (yes or no)
3. When the card doesn't go through at the visit, do we email the customer at once, as today, or tell Ryan first? (email or Ryan)
4. Should Pay later wait until tomorrow before it shows under Needs action? (yes or no)
