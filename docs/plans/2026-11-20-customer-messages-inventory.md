# Customer messages: inventory, audit, research and one layout

Nov 20 2026. Hannah's asks, in her words: "also include all the customer emails that go out in another section", then "have them check what they are, then beautifully and professionally design them." Nothing here is wired: the live renderers in `src/emails/` and `src/sms/` are unchanged, and the new layout sits beside them in `src/emails/design/` until Hannah approves it. The Storybook section is **Messages** (`src/emails/messages/`); the old `Emails/All emails` group became `Messages/Archive: every live email`.

Hard rule from Hannah (booking form): never add anything the business did not decide. Every sentence of every prototype comes from the catalogue, the data model, a settled decision, `docs/UX_WRITING.md` or the fixture's own facts; where a fact is unknown the message says the minimum and the question is in "Open questions" at the end.

Contents: 1 the inventory, 2 the claims check, 3 copy problems in live messages, 4 the audit of the live emails, 5 the research, 6 the layout system, 7 the swap plan, 8 open questions.

## 1. Inventory

Read from the code, not from memory: `src/emails/render.ts` (`EMAIL_TEMPLATES`), `src/sms/texts.ts` (`SMS_TEMPLATES`, `TEXT_ONLY_KINDS`), `src/lib/messaging/queue.ts` (`MessageKind`, `BY_TEXT`, `queueStaffMessage`, `queueStaffText`, `queueNote`), `consent.ts` (`TRANSACTIONAL_KINDS`, `MARKETING_KINDS`), every `queueMessage(` call site, `src/emails/editable.ts` (the words the office edits), `docs/DATA_MODEL.md` (message rows), `docs/plans/2026-11-18-messages-design.md` and `docs/UX_WRITING.md`.

How a kind goes: a kind in `SMS_TEMPLATES` goes by text to the customer's mobile, and by email (the same kind's email renderer) when there is no mobile, after a STOP, or while `TEXTS_PAUSED` is on. Every other kind is an email. Transactional kinds ignore the marketing opt-in; a kind in `MARKETING_KINDS` needs it. "Rules" says whether Hannah's voice rules hold on the live words (a number points to section 3).

| # | Message | Kind | Channel | Who triggers it, and when | Class | Renderer | Status | Rules |
|---|---|---|---|---|---|---|---|---|
| **Booking and visits** | | | | | | | | |
| 1 | Booking confirmation | `booking-confirmation` | email | A customer books online. Nothing queues it yet: the booking step is not wired, the renderer is ready | transactional | `emails/booking-and-staff.ts` | built, no trigger | CP 3 |
| 2 | Day set | `date-set` | text; email fallback | A day is set: the office schedules or places a visit, the customer picks a day, the checkout holds one (`scheduling/server/notify.ts`, `visits.pick`, `visits.move`) | transactional | `sms/texts.ts` `dateSetText`; `emails/date-messages.ts` `dateSetEmail` | built | yes (middle is the office's to edit) |
| 3 | Day moved | `date-moved` | text; email fallback | The office moves a visit (`visits.move` with notify); the customer moves it from the account. A property that must be home is asked "Reply YES or pick another day"; a same-day time reads "still Wed, now at 10:30 am" | transactional | `dateMovedText`; `dateMovedEmail` | built | yes |
| 4 | Two weeks out | `date-confirm` | text; email fallback | The daily cron, 14 days before the day (`scheduling/server/daily.ts`) | transactional | `dateConfirmText`; `dateConfirmEmail` | built | yes |
| 5 | Day before | `day-before` | text; email fallback | The daily cron, the day before (`daily.ts`); carries the exact time (this is where a window used to be told) | transactional | `dayBeforeText`; `dayBeforeEmail` | built | yes |
| 6 | On my way | `on-the-way` | text only | The visit panel's "On my way" button, for a visit today, once per visit per day (`messages.send`) | transactional | `onTheWayText` | built | yes |
| 7 | Visit canceled by the customer | `visit-cancelled` | text; email fallback | The customer cancels from their account (`api/v1/portal/cancel.ts`); a Season Pass visit becomes a skip and sends this same message | transactional | `visitCancelledText`; `visitCancelledEmail` | built | CP 4 |
| 8 | Visit canceled by us | none | text; email fallback | The office cancels a visit (`visits.cancel`): today it writes the event and sends nothing | transactional | none | **not built, prototyped** | n/a |
| 9 | A text from the office | `note` | text only (a plain email while texts are paused) | The office's "Send a text" (`queueNote`): free words, so no template to design | transactional | `emails/plain.ts` (paused only) | built | the office's own words |
| 10 | A text sent as an email while texts are paused | any text kind | email | `TEXTS_PAUSED` is on (Twilio error 30034): the text's own words in the one frame | transactional | `emails/plain.ts` | built | CP 9 |
| **Billing** | | | | | | | | |
| 11 | Invoice | `invoice` | text; email fallback | "Send an invoice" (`api/v1/invoices/send.ts`), from Done or any Done and Unpaid job | transactional | `invoiceText`; `emails/invoice.ts` `invoiceEmail` (with the visit report when on) | built | yes |
| 12 | Invoice reminder | `invoice-reminder` | text; email fallback | The office's Remind button, once a day per invoice, never automatic | transactional | `invoiceReminderText` (the office edits the words); `invoiceReminderEmail` | built | CP 1 |
| 13 | Receipt, by card, check, Venmo or cash | `receipt` | email only | A payment exists: `chargeVisit` after a card charge, `payments.record` for check, Venmo, cash, the pay page's webhook for an invoice paid | transactional | `emails/account-messages.ts` `receiptEmail` (the method is `paidBy`, or the card) | built | yes |
| 14 | Receipt as a text | none | text | Hannah's walkthrough assumes a receipt text; the receipt has no text template | transactional | none | **not built, prototyped** | n/a |
| 15 | Refund receipt | none | email and text | The office refunds a payment (a negative payment row, `payments.refund`): no message goes today | transactional | none (the walkthrough draws one inline, with an unsourced claim, CP 11) | **not built, prototyped** | CP 11 |
| 16 | Card didn't go through | `card-failed` | email only | A card charge fails after Mark done (`pass/server/charge-visit.ts`) | transactional | `account-messages.ts` `cardFailedEmail` | built | CP 2 |
| 17 | Update your card (the link) | `card-failed` with no visit | email only | The office's "Send card link" (`pass/server/card-link.ts`) | transactional | `cardFailedEmail` | built | CP 2 |
| 18 | Card expiring | `card-expiring` | email only | The card cron, before the month a card expires (`pass/server/card-expiry.ts`), once per customer | transactional | `cardExpiringEmail` | built | CP 8 |
| **Season Pass** | | | | | | | | |
| 19 | Purchase confirmation | `purchase-confirmation` | email only | A Season Pass is sold: the website checkout, or the office's New job (`pass/server/purchase.ts`) | transactional | `emails/purchase-confirmation.ts` | built | yes |
| 20 | Renewal (reserve next season) | `renewal` | email only | The January offer and the "Renewal" message on a pass (`messages.send`), to customers who chose marketing emails | **marketing** | `account-messages.ts` `renewalEmail` | built | CP 5 (no Unsubscribe link) |
| 21 | Season Pass canceled | `cancelled` | email only | The pass is canceled (`pass/server/cancel.ts`) | transactional | `cancelledEmail` | built | CP 6 |
| **Marketing** | | | | | | | | |
| 22 | The tips email | `pre-sell` (named in `MARKETING_KINDS`, nothing sends it) | email | Hannah's marketing opt-in ("Tips and offers by email") promises it; "Send pass offer" has no API behind it | **marketing** | none | **not built, prototyped** | n/a |
| **Account** | | | | | | | | |
| 23 | Sign-in link | `sign-in` | email only | A customer asks to sign in (`auth/send.ts`, link good for 10 minutes: `src/auth.ts` `maxAge: 600`) | transactional | `emails/sign-in.ts` | built | yes |
| **To the crew, not the customer** | | | | | | | | |
| 24 | Not marked done | `not-closed-crew` | email to owners and admins | The daily cron when yesterday's visits were not marked done (`daily.ts`) | staff | `booking-and-staff.ts` | built | staff |
| 25 | Admin alert | `admin-alert` | email to owners and admins | New Season Pass, card declined, tomorrow's crew summary, a customer changed a visit (`queueStaffMessage`) | staff | `booking-and-staff.ts` | built | staff |
| 26 | Customer changed a visit | none (`queueStaffText`) | text to owners and admins | A customer moves or cancels their own visit (`lib/portal/alerts.ts`); no opt-out line, no log row | staff | the text is `Trailhead: ` and the Home row's words | built | staff |
| 27 | Crew assigned | none | text to the crew person | A visit is given to a person; the admin walkthrough's Schedule dialog offers a crew text, no code sends one | staff | none | **not built, prototyped** | n/a |

Also sent, and not ours to design: Twilio's own reply to STOP, START and HELP (Twilio's Advanced Opt-Out sends it: `src/lib/messaging/inbound.ts`); Stripe's own card receipt behind "View the receipt".

**Counts.** 27 rows: 23 to a customer, 4 to the crew or office. Of the 23 customer messages 19 are built (1 of them with no trigger yet) and 4 are not built and prototyped (visit canceled by us, receipt as a text, refund receipt, the tips email). Of the 4 crew rows 3 are built and 1 is prototyped (crew assigned). Row 13 is shown in four ways (card, check, Venmo, cash) and row 17 is its own story (the card link), so the Storybook section has 27 messages plus those 4 receipt variants.

**Texts and emails of one kind** (2 to 7, 11, 12): the same facts in two renderers. The text is never redesigned here (a text has no layout); the email is.

## 2. Claims check

Every factual claim in every message, and where its value comes from. A claim with no source is removed; none was removed from a prototype in this pass because each prototype sentence was written from a sourced one (see the "Source" column). The shared claims first, then what is specific to a message.

| Claim as it reads | Where the value comes from |
|---|---|
| "Hi Andrea," | `customer.first_name`, first word, through `greetingName` (`emails/layout.ts`): "Hi there," when no usable name |
| "your repair", "your spring turn-on", "your fall blowout" | the visit's service, `kindName` / `LINE_NAMES`, never the catalogue band name |
| "at 412 Briggs Street" | `property.street` (`jobAddress`, `VisitFacts.address`) |
| "Wed, Apr 28", "Wednesday, April 28" | `visit.scheduled_on` (`shortDay`, `longDay` in `emails/format.ts`) |
| "at 10:30 am" | `visit.start_time`, shown only when the visit has a booked time (`timeBooked`; a Season Pass visit's stacked time is not told until the day-before row exists, `windowTold`). A message never says a window or a span |
| "Ryan will be there", "Ryan is coming tomorrow" | `VisitFacts.who`, the first name of the person on the visit; "Ryan and the crew" / "We're coming" when no one has it (`whoIsComing`) |
| "Text Ryan at (970) 692-7270", the phone in the footer | `BUSINESS.phone`; "Text Ryan" is `TEXT_RYAN_LINE`, the day-before wording settled in the UX audit fixes, Nov 18 |
| "Last day to change online: Mon, Apr 26" | `lastChangeDay`, from `cutoffAt` (the 24-hour rule, Hannah, settled) |
| "Doesn't work? Pick another day:" + link | settled day-of wording (`visitLinkTail`); the link is the visit's signed page `visitLinkUrl` (30 days) |
| "Reply YES or pick another day" | `VisitFacts.asked`, a property with `must_be_home` (`visits.move`) |
| "$145", "Repair", "Subtotal", "Sales tax", "Total" | the job's lines (`line_item`), `jobTotal`; Sales tax only when a line is taxed (Settings › Billing) |
| "INV-2026-0042", "Invoice" row | `invoice.number` |
| "due May 12", "Due Wednesday, May 12" | the day the invoice was sent plus `settings.billing.dueDays` |
| the pay link / "Pay $145" | the signed `invoice-pay` token, `/pay/<invoiceId>?token=` |
| "Paid, Check #2210", "Venmo @andrea-d", "Cash", "Visa ending 4242" | the payment row's `method` and `reference` (`payments.record`); the card from `cardWords(customer)` |
| "R-1A2B3C4D" | `receiptNumber(paymentId)` |
| "Reply STOP to opt out." | `OPT_OUT`, on the first text to a number only (`isFirstText`; Hannah chose first only, Nov 18) |
| "Trailhead:" opening, ASCII only | `docs/UX_WRITING.md` rule 9 |
| "The Trailhead crew" sign-off | `SIGN_OFF`; the purchase confirmation keeps the tagline (`PURCHASE_SIGN_OFF`) |
| "Your Trailhead account" | `ACCOUNT_NAME`, settled in the portal design |
| the address and phone in the footer | `BUSINESS` in `emails/format.ts` |
| "You are getting this because ..." | each message's own `why`: a statement of the event that made it, no promise |
| "The link works one time and expires in 10 minutes" | `src/auth.ts` `maxAge: 600` |
| "The link is good for 24 hours" (card link) | Stripe Checkout's default session expiry; **not set in our code, unverified** |
| "Ryan turns the water on, runs every zone and checks the heads." | `RYAN_DOES`, the catalogue's description of the visit |
| "We confirm it by text two weeks before and remind you the day before. If it has to move, we tell you first and you can pick another day." | `CONFIRM_LINE`, settled; true only for a customer who gets texts (see CP 3) |
| "You pay $0 today. We charge $145 after the spring turn-on ... to the card ending 4242." | `moneyLine` from the lines and the card on file |

Specific claims, where they differ:

| Message | Claim | Source |
|---|---|---|
| Visit canceled by the customer | "Nothing was charged." | the visit had no payment (`visitCancelledMoney(0)`); with a payment: "The $145 you paid stays as it is." is true (a cancel never moves money); the live words add "and Ryan will contact you about it", which has **no source** (CP 4) |
| Visit canceled by us (prototype) | "Nothing was charged." | `visits.cancel` stops a charge not yet made; with a payment the message says the same "stays as it is" line, nothing else |
| Season Pass canceled | "your remaining visits are off the schedule. We won't charge you again." | `passes.cancel` cancels the remaining visits and their lines; settled in the messages design section 4 |
| Card didn't go through | "Add a new card and we'll try it right away." | the card-link return retries the charge; **timing unsourced** (CP 2) |
| Card expiring | "$190 of visits are still to come" | the sum of the pass's unpaid live lines (`card-expiry.ts`); "A new card now keeps them on schedule" has no source for "on schedule" (CP 8) |
| Receipt | "Your fall blowout is planned for early October." | `nextVisitLine`: the next unfinished visit's preference |
| Renewal | "You pay after each visit, on the card we have on file." | the pass rule; wrong for a customer with no card |
| Refund (prototype) | "We refunded $145 to your Visa ending 4242." | the negative `charge` row, `refunds_payment_id`; **no timing sentence** (the walkthrough's "5 to 10 days" is unsourced and removed, CP 11) |
| Receipt as a text (prototype) | "receipt for $145, your repair at 412 Briggs Street, paid by check #2210" | the payment row; no other claim |
| Tips email (prototype) | "You are getting this because you chose marketing emails." | the booking form's unticked marketing box and Details' switches (`marketing-choice.ts`, the walkthrough's mail footer); the body is placeholder words for Ryan to write, never real tips |
| Crew assigned (prototype) | day, time, service, name, street, town | the visit and the customer and property rows; no gate code (a tech never sees it) |

## 3. Copy problems in live messages

Found by `scripts/voice-audit.mts` (the voice rules in `src/emails/messages/voice.ts` run over every live email and text) and by reading each renderer against Hannah's rules and the hard "no promises" rule. The live files are not changed; each has the file, the words and the corrected words, for review.

| CP | Where | Words today | Problem | Corrected words |
|---|---|---|---|---|
| 1 | `src/emails/invoice.ts:21`, the invoice and reminder preheader | "Due Friday, May 21. Pay online, or see the job in your account." | says "job", a system word (the voice rules: no "job", "line", "stage") | "Due Friday, May 21. Pay online, or see it in your account." (`SEE_JOB` is already "See it in your account") |
| 2 | `src/emails/account-messages.ts:45` and `:50` (the card-expiring preheader at `:61` says it too), card didn't go through | "Add a new card and we'll try it right away." / preheader "It takes a minute. The link is good for 24 hours." / "Reply to this email and we'll help you update it." | "right away" and "it takes a minute" are promises of timing nobody decided; "we'll help you" promises a reply and the sending mailbox is not confirmed as monitored | "Add a new card and we'll try it again." (if that is what happens), preheader "The link is good for 24 hours.", and the reply line only once Hannah confirms who reads replies (question 5) |
| 3 | `src/emails/booking-and-staff.ts:11` (lead) and `:15` (preheader) | "Ryan will be there Wednesday, April 28 at 10:30 am. We text you a reminder the day before." | a customer who chose email only is promised a text | "We remind you the day before." (true by either channel) |
| 4 | `src/emails/account-messages.ts:84` `visitCancelledMoney` (also the text, `sms/texts.ts:63`) | "The $145 you paid stays as it is, and Ryan will contact you about it." | a promise of what Ryan will do, with no source | "The $145 you paid stays as it is." |
| 5 | `src/emails/account-messages.ts:78`, renewal footer | "You are getting this because you chose to hear about next season. Reply to stop these emails." | a marketing email with no Unsubscribe link (the walkthrough's marketing mail footer carries one, and so does the FTC guide's opt-out rule) | the footer says why and carries an "Unsubscribe" link; the proposed layout has it (marketing footer) |
| 6 | `src/emails/account-messages.ts:67` `cancelledEmail` (the intro), "We won't charge you again." | a promise about money | settled in the messages design section 4, so it stays unless Hannah says; listed because it is a promise | keep (settled) |
| 7 | `src/emails/date-messages.ts:52` day-before preheader when the visit has no time | "We text you if anything changes." | a promise nobody decided | leave the preheader to the fact: "Ryan is coming tomorrow." |
| 8 | `src/emails/account-messages.ts:56`, card expiring | "A new card now keeps them on schedule." | "on schedule" is a consequence nobody decided | "$190 of visits are still to come." (stop there) |
| 9 | `src/emails/plain.ts:14` (texts paused) | "You are getting this by email because Trailhead's texts are on hold while our number is registered with the carriers." | tells a customer about a vendor process; not a decided customer sentence | "You are getting this by email instead of a text." until Hannah words it |
| 10 | texts, `sms/texts.ts` `visitLinkTail` | the whole signed URL, 60 to 90 characters with its token, ends the text | a raw link, and the reason a day text runs two parts (147 to 217 characters). Hannah chose to keep the full link (Nov 18); listed so it is visible | none today; the Storybook shows links as a short domain on purpose, and a short link domain is open question 4 of the messages design |
| 11 | `src/app/_flows/walkthrough/receipt-data.ts:52` (the refund the walkthrough draws) | "It can take 5 to 10 days to show on your statement. You do not need to do anything." | a statistic and a reassurance with no source | removed in the prototype: "We refunded $145 to your Visa ending 4242 for your repair at 412 Briggs Street." |
| 12 | `src/emails/format.ts:108` `CONFIRM_LINE` (used at `purchase-confirmation.ts:37`) | "We confirm it by text two weeks before and remind you the day before." | said to an email-only customer too | "We confirm it two weeks before and remind you the day before." |

Checked and clean: no live text or email says a window or span of hours, "bill", "overdue", "cancelled", "truck", an em dash or an exclamation mark; every text opens "Trailhead:" and is ASCII; no text asks more than once (the earlier count counted the `?` of a link's query string, which does not count); "Season Pass" and its number are on the purchase, renewal and cancel messages only.

## 4. The audit of the live emails

Every live email rendered by its real renderer from `src/emails/fixtures.ts` at 600px and 375px: `docs/plans/2026-11-20-email-audit/<kind>-600.png` and `<kind>-375.png`, plus `metrics.json` (`npx tsx scripts/email-audit.mts` rebuilds them; nothing is sent). The pass-card image in the purchase confirmation is a fixture URL and shows as a broken image in the screenshot.

What is good and stays: one column, 600px, a white card on a tinted page, one h1, one filled button, a plain-text twin on every email, the footer with the business name, address, phone and a why line, `lang="en"`, `role="presentation"` tables, four type sizes, no email over 10 KB.

What is weak, ranked by what a customer would feel:

1. **The one action is not always the first thing.** On a phone the invoice's Pay button sits under 14 rows (Where, Done, Invoice, two lines, Subtotal, Sales tax, Total, Amount due, Due): the amount is in the lead sentence and again in the button, but there is no single block that says "$145, due Wednesday, May 12" above the button. The receipt and the purchase confirmation have the same problem (the purchase confirmation is 1,490px tall at 600px wide, with four calendar links).
2. **Hierarchy is one weight.** The facts table, the money table and the "Amount due / Due" rows are all the same small grey-label rows, so the figure a customer came for (what they owe, what they paid, when someone comes) is not larger or boxed anywhere.
3. **Money is not set for scanning.** Amounts are right-aligned but not in tabular figures (`font-variant-numeric` is on no cell), the label column of the second table (Paid, Paid on) and the first table do not share a rule weight with the money table, and "Amount due" repeats the Total above it.
4. **Brand presence is thin.** The logo is a 145px strip on a white header with an orange rule; the heading is Helvetica Neue at 28px, so there is nothing of Barlow Condensed's character (the web site's headline face) in an email. Nothing carries the navy.
5. **Dark mode is light only.** `color-scheme` is `light`, there is no `prefers-color-scheme` style and no dark palette. Apple Mail and Gmail desktop show the light email; Gmail on iOS and Outlook for Windows invert it and the flattened logo plate is the only protection.
6. **The footer has no way back in.** It has the business name, address and phone and a why line, but no "Your Trailhead account" link, no reply address, and the marketing email (renewal) has no Unsubscribe link (CP 5).
7. **Link text.** "Doesn't work? Pick another day:" (every day text) is vague on its own: a screen reader list of links reads "Doesn't work? Pick another day", and the cause ("doesn't work") is not named. In the emails the secondary links are good ("Add to Google Calendar", "View the receipt", "See it in your account") but "See it in your account" does not say what "it" is out of context.
8. **The plain-text twin is complete but flat.** It has every fact and link, but the link line for the main action is not marked (`Pay here:` and `See it in your account:` read the same), the money table is a list of "Name: $" lines with no alignment, and the footer repeats the HTML's footer without the account link.
9. **Phone width.** The 112px label column stacks above its value (good), but the table, the lead and the button each carry their own spacing, so a 375px receipt is 1,430px tall and the invoice 1,395px. The button is full width (good) and 52px tall (more than it needs).
10. **Contrast.** Quiet text `#57534E` on white is 7.6:1 and the button text 5.0:1 (both pass). Orange `#D97706` on white is 3.2:1 and is used only for the rule (never for text). The footer's quiet text on cream is 7.3:1.
11. **The sign-in email** shows the whole raw URL as a long unbreakable string on a phone (the fallback is good practice; it needs to wrap and sit in its own small block) and says "expires in 10 minutes" without the exact time (Postmark's guidance is to state the exact time).

Each live email's numbers (sizes, buttons, links, text lines) are in `metrics.json`; every one has one h1, one button, four sizes, `lang`, a light-only colour scheme, no dark styles and no tabular figures.
