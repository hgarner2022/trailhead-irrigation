# Copy audit, Nov 13 2026

Read-only pass over every customer-facing string on the surfaces below, against `CLAUDE.md` "Copy rules", `docs/DESIGN.md` "Copy", the two copy skills and the new `docs/UX_WRITING.md` (rule numbers below, R1 to R10). Only strings that break a rule or are unclear are listed; the rest are fine. Line numbers are from the checkout as it stood on Nov 13 (another agent was editing, so they may drift by a few lines).

Phone for "call" rewrites: Ryan, (970) 692-7270 (`BUSINESS.phone`).

**Needs Ryan or Hannah before rewriting** (they change a promise, not just words): the "reserved in July" spots (Marketing), "two weeks before" vs "the day before" (Messages), and "when we're on our way" (Pass page).

## Checkout (13)

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 1 | `checkout-consent.tsx:21`, `lib/pass/server/checkout.ts:83,136` | Please accept the terms to continue | Accept the terms to continue. | R4, R1 (drop filler "please"; one string, three copies) |
| 2 | `lib/pass/server/checkout.ts:37` | That email has started a few passes in the last hour. Please try again in a bit, or call us. | We've started a few passes for that email this hour. Try again in an hour, or call Ryan at (970) 692-7270. | R3, R4 ("a bit" is vague, no number) |
| 3 | `lib/pass/server/checkout.ts:38` | Something in the answers needs another look. Go back a step and check them. | One of your answers didn't save. Go back a step and check each one. | R3 (names no field; "needs another look" is a shrug) |
| 4 | `lib/pass/server/checkout.ts:39` | We couldn't reach the card form just now. Nothing was charged. Please try again. | We couldn't open the card form. We haven't charged you. Try again. | R4, R5 |
| 5 | `checkout-errors.tsx:6` | 3 things need another look: Address, Access, Terms | Check these before you continue: Address, Access, Terms. | R3 (say the action, not "things") |
| 6 | `checkout-state.ts:110` | Welcome back. Your details are here; accept the terms and continue to open the card form again. | Welcome back. Your details are saved. Accept the terms and continue to open the card form. | R5 (semicolon) |
| 7 | `checkout-card.tsx:27` | Stripe's card form mounts here. | If this shows to a customer, replace with: Loading the card form. Otherwise keep it dev-only. | R3 ("mounts" is developer talk) |
| 8 | `TimingChoice.tsx:16` | Mid May is the first and second week. / Mid October is the second week. | Mid May means the first two weeks of May. Mid October means the second week of October. | R5 (clipped, month missing; confirm the weeks with Ryan) |
| 9 | `checkout-steps.tsx:85` | The spring turn-on has passed for this year, so your pass is what is still ahead. | The spring turn-on has passed for this year. Your pass covers the visits still ahead. | R5 (the "is what is" clause) |
| 10 | `checkout-steps.tsx:87` | Six zones or fewer is the starting price. Not sure? Count the stations on your controller, or we confirm it on the first visit. | The price starts at six zones or fewer. Not sure how many you have? Count the stations on your controller, or we'll confirm on the first visit. | R5, contractions |
| 11 | `checkout-inspection.tsx:46` | In July we run every zone, look for coverage gaps, clogged nozzles and zones running long, and adjust what we find. Billed after the visit like the others, and you can add it later by replying to any of our emails. | In July we run every zone and look for coverage gaps, clogged nozzles and zones that run long. We adjust what we find. You pay after the visit, like the others, and you can add it later by replying to any of our emails. | R5 (one sentence carries four ideas; passive "Billed") |
| 12 | `checkout-consent.tsx:27` | You can stop any time. Visit reminders and receipts are sent either way. | You can stop any time. We send visit reminders and receipts either way. | R5 (passive) |
| 13 | `checkout-steps.tsx:80` | per season, billed after each visit | per season, paid after each visit | R2 (the pass page and terms say "charged after the visit"; pick one verb and use it in all three) |

## Done step (2)

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 14 | `checkout-next.ts:13` | We text you the day two weeks before. | Ryan sets the day, and we text it to you two weeks ahead. | R6, R7 (and see Messages 34: the pass page says "the day before") |
| 15 | `checkout-next.ts:31` | Nothing is charged until each visit is done: $145 after the spring turn-on, then $95 after the fall blowout. | We charge you after each visit: $145 after the spring turn-on, then $95 after the fall blowout. | R5 (lead with what happens, not what does not) |

## Pass page (11)

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 16 | `PassPageScreen.tsx:158` | Change when we come with the link on a visit above, until its day is set. Skip one visit, or add the July inspection, here. Reply to any of our emails or call to update the address. You can also end the pass. | Change your timing from the link on a visit, until its day is set. Skip a visit or add the July inspection here. To change your address, reply to any of our emails or call Ryan. You can end the pass here too. | R5, R6 |
| 17 | `pass-page-model.ts:74` | Your card didn't go through. Update it and we'll try again; your visits stay as they are until then. | Your card didn't go through. Update it and we'll try again. Your visits stay as they are until then. | R5 (semicolon) |
| 18 | `pass-page-model.ts:79` | Reserve 2027 on the same card; nothing is charged until a visit is done. | Reserve 2027 on the same card. We charge it after each visit. | R5, R7 |
| 19 | `pass-page-model.ts:134` | Your blowout is preferred for mid October. Ryan sets the day in September. | You asked for mid October for your blowout. Ryan sets the day in September. | R5, R6 ("is preferred for" is jargon) |
| 20 | `pass-page-model.ts:135` | Next up: spring turn-on, preferred mid May. | Next up: spring turn-on. You asked for mid May. | R5 |
| 21 | `pass-page-model.ts:83` | We'll text you the day before, and when we're on our way. | We'll text you the day before. (Add "and when we're on our way" only if a text for it exists; `src/sms/texts.ts` has date set, moved and tomorrow, nothing for en route.) | R7 (promise with no template behind it) |
| 22 | `PickDayButtons.tsx:30,38`, `CancelPassDialog.tsx:32,36,42` | That day did not go through. Please try another, or call us. / That did not go through. Please try again, or call us. | We couldn't save that day. Try another, or call Ryan at (970) 692-7270. / We couldn't cancel your pass. Try again, or call Ryan at (970) 692-7270. | R3, R4 (same vague line five times, no number, no cause) |
| 23 | `PickDayButtons.tsx:58` | Thursday, October 14 it is. We'll text you the window the day before. | You're set for Thursday, October 14. We'll text you the window the day before. | R5 (folksy fragment) |
| 24 | `CancelPassDialog.tsx:51,70,75,78` | Cancel my pass / Cancel your Season Pass? / Keep my pass / Cancel the pass | Cancel my pass / Cancel your Season Pass? / Keep my pass / Cancel my pass | R2 (the button flips from "my" to "the" inside one dialog) |
| 25 | `PreferenceDialog.tsx:53,54` | Your fall blowout is now preferred mid October. / We'll set the day inside it and email you the date. | Got it. You asked for mid October for your fall blowout. / We'll set the day in that window and email you the date. | R5 ("inside it" has no clear noun) |
| 26 | `PassPageScreen.tsx:158` and `PassActions.tsx:57` | "the day comes by email" / "email you the date" / "text the day" | Pick one channel line for the pass: "We email and text your day." | R2 (see Messages) |

## Sign-in (3)

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 27 | `SignInCard.tsx:60` | It works once and for ten minutes. | The link works one time and expires in 10 minutes. | R5 (stilted) |
| 28 | `SignInCard.tsx:30` | We could not send the link. Try again in a minute. | We couldn't send the link. Try again in a minute. | R4, contractions |
| 29 | `SignInCard.tsx:34` | Admin sign in | Sign in to admin | R2 ("sign in" is the verb; "sign-in" is the noun) |

## Messages: emails, texts, server lines (12)

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 30 | `emails/sign-in.ts:16,19,20` | It works once and for ten minutes. If you did not ask for it, you can ignore this email and nothing happens. | The link works one time and expires in 10 minutes. If you didn't ask for it, ignore this email. Your account stays as it is. | R5, contractions |
| 31 | `emails/purchase-confirmation.ts:18` | Your Trailhead Season Pass TH-2026-001 is ready | Your Season Pass is reserved | R2, R8 (the checkout says "reserved"; put the pass number in the body, not the subject) |
| 32 | `emails/purchase-confirmation.ts:19` | Season Pass TH-2026-001 for Erie is reserved for 2026, and your days are set. | Your Season Pass for Erie is reserved for 2026. Ryan sets each day inside the window you picked and we text it to you. | R7 (the days are not set at purchase; the done step says so) |
| 33 | `emails/purchase-confirmation.ts:11` | Nothing today. $145 after the turn-on, $95 after the blowout, to the card ending 4242. | You pay $0 today. We charge $145 after the spring turn-on and $95 after the fall blowout to the card ending 4242. | R5 (fragments) |
| 34 | `emails/purchase-confirmation.ts:6` | We confirm it by text two weeks before. If it has to move, we tell you first and you can pick another day. | Keep, but align with the pass page (see Pass page 21 and Patterns 4). | R7 |
| 35 | `emails/account-messages.ts:19` | ...your card was declined | ...your card didn't go through | R2, R4 (the pass page already says "didn't go through") |
| 36 | `emails/account-messages.ts:31` | Your card is ending | Your card expires soon | R3 (reads as if the card is ending its life) |
| 37 | `emails/account-messages.ts:36` | ...and the visits that had not happened are off the schedule. | ...and your remaining visits are off the schedule. | R5 |
| 38 | `emails/account-messages.ts:37` | If you would like a visit later, your pass page and (970) 692-7270 are both open. | If you want a visit later, book online or call (970) 692-7270. | R1, R5 (a page and a phone number are not "open") |
| 39 | `emails/account-messages.ts:21,29`, `lib/pass/server/messages.ts:59,60`, `emails/date-messages.ts:21` | we will help you / We will send the day / We are coming tomorrow | we'll help you / We'll send the day / We're coming tomorrow | R5 (customer text uses contractions; these do not) |
| 40 | `emails/booking-and-staff.ts:20-23` and `NeedsAttention.tsx:37` | 1 visit is not closed yet / Not closed yet / Visits not closed | 1 visit still needs to be marked done / Not marked done / Visits not marked done | R2 (Home already says "not marked done yet") |
| 41 | `emails/visit-block.ts:12` | Need a different day, or want to change anything else on your pass? Your pass page has it all. | Need a different day? Change it, or anything else on your pass, on your pass page. | R5 (stock line) |

## Marketing Season Pass copy (9)

The four "reserved in July" spots say the blowout date is booked or set in July. The product sets the day in September inside the customer's preference (`pass-page-model.ts:134`), and the done step shows the preference, not a date. Ryan should confirm what is true, then these read as below. If he does hold a date in July, change the checkout and pass page instead.

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 42 | `SeasonPassCalculator.tsx:79` | Blowout date reserved in July, before the freeze rush | Your blowout is scheduled before the freeze rush | R7 |
| 43 | `app/(site)/season-pass/page.tsx:25` | ...Blowout date reserved in July. Billed per visit, nothing up front. | ...Your blowout is scheduled before the freeze rush. You pay after each visit. | R7, no negation lists |
| 44 | `page.tsx:33` | ...Your date is set in July. | ...Ryan sets your date in September, inside the window you picked. | R7 |
| 45 | `page.tsx:44` | Your blowout date reserved in July, both visits booked without you having to call, and one card on file instead of separate invoices. | Your blowout is scheduled before the freeze rush, both visits are booked without a call from you, and one card covers every visit. | R7 |
| 46 | `page.tsx:139` | About 150 blowouts land in the four weeks before the first freeze. Pass customers get their October date in July, before that rush. | Blowouts bunch up in the weeks before the first freeze. Pass customers have their place in line before that rush. | R7 and `CLAUDE.md` (a number not on the service page or in Jobber; confirm "150" or cut it) |
| 47 | `page.tsx:64` | It is an add-on, not part of the pass: add it at checkout or later by replying to any of our emails, and it is billed after the visit like the others. | The July inspection is an add-on. Add it at checkout, or later by replying to any of our emails. You pay after the visit, like the others. | "not X, it's Y" rule, R5 |
| 48 | `SeasonPassSection.tsx:8` | Your October blowout is booked in July | Your October blowout is in the book before the rush | R7 (same promise) |
| 49 | `SeasonPassSection.tsx:14` | ...We book the dates, you don't have to remember to call. | ...Ryan books the dates, so you never have to remember to call. | R6 |
| 50 | `terms/page.tsx` s.17 "Changing or cancelling" | There is no cancellation fee for a Pass visit that has not yet been given a day. | You can cancel any visit that has no day yet at no charge. (Legal wording: have it confirmed before changing.) | R5 |

## Admin (9)

| # | file:line | Current | Rewrite | Rule |
|---|---|---|---|---|
| 51 | `MessageThread.tsx:35` | Bounced | Not delivered | R2 (jargon) |
| 52 | `NeedsAttention.tsx:35` | Jobs not created | Visits missing a Jobber job | R3 |
| 53 | `RevenueScreen.tsx:110` | ...The customers not yet asked are the ones to send the offer to. | ...Send the offer to the customers you haven't asked yet. | R5 |
| 54 | `ScheduleScreen.tsx:169,170,178` | ...scheduled; the customers get their dates. / ...could not be placed; Home lists them. | ...scheduled. The customers get their dates. / ...couldn't be placed. Home lists them. | R5 (semicolons) |
| 55 | `ScheduleScreen.tsx:203` | Sam scheduled on Truck 1, Oct 14; they get the date. Drag it if another day is better. | Sam is scheduled on Truck 1 for Oct 14, and we'll send the date. Drag it if another day is better. | R5 ("they" is unclear) |
| 56 | `SettingsScreen.tsx:115` | You can read the settings; a manager changes them. | You can read the settings. A manager changes them. | R5 |
| 57 | `HomeScreen.tsx:86` | Check the trucks, capacity and areas, then schedule the season: every pass visit gets its day and the customers get their dates. | Check the trucks, capacity and areas, then schedule the season. Every pass visit gets a day and every customer gets a date. | R5 |
| 58 | `schedule-model.ts:61` | That visit cannot be moved. | Say why: "Done visits can't be moved." / "That visit is on a day that has passed." | R3 |
| 59 | `needs-attention-action.tsx:16,18` | Send card link (twice) | Keep, but when both can appear on one row, the second reads "Resend card link" | R2 |

## Counts

| Surface | Strings flagged |
|---|---|
| Checkout | 13 |
| Done step | 2 |
| Pass page | 11 |
| Sign-in | 3 |
| Messages (emails, texts, server) | 12 |
| Marketing Season Pass | 9 |
| Admin | 9 |
| Total | 59 |

Already good and not listed: the address and zone validation lines, the out-of-area message, the SMS templates (name first, one link, opt-out), the date-set subjects, the NeedsAttention, Messages and Customers empty states, and the receipt email.

## Patterns: the five fixes that recur most

1. **Contractions are inconsistent.** The UI says "we'll" and "didn't"; the emails and server lines say "we will", "did not", "could not". Customer text always uses contractions (Messages 30, 39; Pass page 22; Sign-in 28).
2. **Semicolons and four-idea sentences.** Split on every semicolon; one idea per sentence (Checkout 6, 11; Pass page 17, 18; Admin 54, 56, 57).
3. **Failures that do not say what failed or how to reach Ryan.** "That did not go through. Please try again, or call us." and "needs another look" appear many times. Name the thing, say what to do, give (970) 692-7270 (Checkout 2, 3, 5; Pass page 22).
4. **Promises the product does not make.** "Reserved in July", "your days are set", "two weeks before" against "the day before", and "when we're on our way" with no text behind it. Decide the real timeline once (set in September, text two weeks ahead, reminder the day before) and use it in the checkout, the email, the pass page, the terms and the marketing page (Marketing 42 to 46, 48; Messages 32, 34; Pass page 21).
5. **One thing, several names.** closed / marked done, declined / didn't go through, ready / reserved, preferred / "asked for", bounced / not delivered, billed / charged / paid. Pick from the glossary in `docs/UX_WRITING.md` (Messages 31, 35, 40; Checkout 13; Pass page 19, 20, 24, 25; Admin 51).
