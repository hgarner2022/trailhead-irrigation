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
| 11 | Invoice | `invoice` | text; email fallback | "Send an invoice" (`api/v1/invoices/send.ts`), from Done or any Done and Unpaid job | transactional | `invoiceText`; `emails/invoice.ts` `invoiceEmail` (with "What we did" when the visit report is on) | built | yes |
| 12 | Invoice reminder | `invoice-reminder` | text; email fallback | The office's Remind button, once a day per invoice, never automatic | transactional | `invoiceReminderText` (the office edits the words); `invoiceReminderEmail` | built | CP 1 |
| 13 | Receipt, by card, check, Venmo or cash | `receipt` | email only | A payment exists: `chargeVisit` after a card charge, `payments.record` for check, Venmo, cash, the pay page's webhook for an invoice paid | transactional | `emails/account-messages.ts` `receiptEmail` (the method is `paidBy`, or the card; since Nov 21 2026 it carries "What we did", the visit's checked items and the photos shared with the customer, from `ReceiptData.report`, absent when the invoice it paid left the report out; an unchecked item is never shown, Nov 22 2026) | built | yes |
| 14 | Receipt as a text | none | text | Hannah's walkthrough assumes a receipt text; the receipt has no text template | transactional | none | **not built, prototyped** | n/a |
| 15 | Refund receipt | none | email and text | The office refunds a payment (a negative payment row, `payments.refund`): no message goes today | transactional | none (the walkthrough draws one inline, with an unsourced claim, CP 11) | **not built, prototyped** | CP 11 |
| 16 | Card didn't go through | `card-failed` | email only | A card charge fails after Mark done (`pass/server/charge-visit.ts`) | transactional | `account-messages.ts` `cardFailedEmail` | built | CP 2 |
| 17 | Update your card (the link) | `card-failed` with no visit | email only | The office's "Send card link" (`pass/server/card-link.ts`) | transactional | `cardFailedEmail` | built | CP 2 |
| 18 | Card expiring | `card-expiring` | email only | The card cron, before the month a card expires (`pass/server/card-expiry.ts`), once per customer | transactional | `cardExpiringEmail` | built | CP 8 |
| **Season Pass** | | | | | | | | |
| 19 | Purchase confirmation | `purchase-confirmation` | email only | A Season Pass is sold: the website checkout, or the office's New job (`pass/server/purchase.ts`) | transactional | `emails/purchase-confirmation.ts` | built | yes |
| 20 | Renewal (reserve next season) | `renewal` | email only | The January offer and the "Renewal" message on a pass (`messages.send`), to customers who chose marketing emails | **marketing** | `account-messages.ts` `renewalEmail` | built | CP 5 (no Unsubscribe link) |
| 21 | Season Pass canceled | `cancelled` | email only | The pass is canceled (`pass/server/cancel.ts`) | transactional | `cancelledEmail` | built | CP 6 |
| 28 | Preference request | none | text; email fallback | Before the window of a visit we schedule for the customer (the fall blowout, the spring turn-on) when it needs a timing; its link opens that visit's page, where the same choice sits as a quiet banner (and on Home, the Season Pass tab and Details) | transactional | none (`src/emails/design/preference-request.ts`) | **not built, prototyped** | n/a |
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

**Counts.** 27 rows: 23 to a customer, 4 to the crew or office. Of the 23 customer messages 19 are built (1 of them with no trigger yet) and 4 are not built and prototyped (visit canceled by us, receipt as a text, refund receipt, the tips email). Of the 4 crew rows 3 are built and 1 is prototyped (crew assigned). The Storybook section has **28 messages** with a story pair each: the 27 rows, less the office's free-words text (row 9, no template to design) and the receipt text (row 14, shown beside each receipt), plus the receipt in four ways (card, check, Venmo, cash). **Of those 28: 20 are built, 4 are whole prototypes** (visit canceled by us, refund receipt, the tips email, crew assigned) **and 4 are built emails with a prototype text** (the four receipts: the receipt has no text template yet). `npx tsx scripts/count-messages.mts` prints the same numbers from the catalog. **Copy problems: 12** (section 3).

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
| "Reply STOP to opt out." | `OPT_OUT`, on the first text to a number only: **the rule is `isFirstText`** (`src/lib/messaging/saved.ts`), which the queue asks for every text; Hannah chose first only, Nov 18, and asked again Nov 22 ("do we need to include that in every message?"). In every sample thread (the walkthrough's phone, the flows, the Messages stories) only the first text carries it, an email twin never does, and `src/app/_flows/texts.test.ts` pins it |
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
| 2 | `src/emails/account-messages.ts:45` and `:50` (the card-expiring preheader at `:61` says it too), card didn't go through | "Add a new card and we'll try it right away." / preheader "It takes a minute. The link is good for 24 hours." / "Reply to this email and we'll help you update it." | "right away" and "it takes a minute" are promises of timing nobody decided; "we'll help you" promises a reply and the sending mailbox is not confirmed as monitored | "Add a new card." (the lead already says it did not go through), preheader "The link is good for 24 hours.", and with no link "Call or text Ryan at (970) 692-7270 to update your card." in place of the reply line, until Hannah says who reads replies (question 4). The proposed layout already uses these |
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

## 5. The research

Fetched Nov 20 2026 (the pages that loaded are linked; anything I could not read is listed under "Not confirmed"). The rules that came out of it, each with its source, are on the Storybook page **Messages / Design rules**; this is the same list.

**What the best senders do, from the pages that loaded.**

| Source | What it shows | Used for |
|---|---|---|
| Stripe, [receipts](https://docs.stripe.com/receipts), [invoice customize](https://docs.stripe.com/invoicing/customize), [hosted invoice page](https://docs.stripe.com/invoicing/hosted-invoice-page), [send email](https://docs.stripe.com/invoicing/send-email) | One receipt per payment; a receipt must carry the legal business name, a support address and email and a privacy URL; branding is one logo, one brand colour and one accent; the email is light and points to one hosted page that shows the invoice, takes payment and offers the PDF; separate emails for finalized, receipt, failed payment, card expiring, refund and cancellation | the footer's lines; one action to one page; a refund email of its own |
| Jobber, [Emails and Text Messages Settings](https://help.getjobber.com/hc/en-us/articles/9335574672151-Emails-and-Text-Messages-Settings) and the Client Hub article | The invoice email has a message part and an uneditable payment-options part; a PDF is not attached; receipts are email only; booking, reminder, reschedule and on-my-way messages carry a Client Hub link; one button opens the item, and if it fails the email ends with the address to copy; a text reminder can be confirmed with a reply | one button; the address under it for the one-time link; receipts are email |
| Housecall Pro, [invoice settings](https://help.housecallpro.com/en/articles/6088692-invoice-settings-customer-view) and [send an invoice](https://help.housecallpro.com/en/articles/2876243-send-an-invoice) | The customer invoice shows the invoice and job numbers, the service date, the technician, line items with quantity and unit price, a subtotal and the terms; the sender chooses which sections show. No email layout or button wording on the pages read | the fact rows (invoice number, who, when) |
| Mailchimp, [mobile friendliness](https://templates.mailchimp.com/design/mobile-friendliness/) and [accessibility](https://mailchimp.com/resources/accessibility-in-email-marketing/) | 16px minimum body; call-to-action buttons at least 46px, full width on a phone; avoid clustered links; real heading order, alt text, link text that says where it goes, 4.5:1 contrast, line spacing at least 1.5, avoid all capitals | sizes, button, contrast |
| Postmark, [receipt and invoice templates](https://github.com/ActiveCampaign/postmark-templates), [best practices](https://postmarkapp.com/guides/transactional-email-best-practices), [design write-up](https://postmarkapp.com/blog/designing-a-modern-email), [design podcast](https://postmarkapp.com/podcast/how-we-approach-designing-transactional-email-templates) | A 570px white card on a tinted page that goes full width under 600px; body 16px at line height 1.625, small print 13px; the invoice opens with a tinted Amount Due and Due By box, then the pay button, then a two-column line table (80/20, amounts right-aligned, a ruled bold total), then the sign-off, a rule, the raw button URL and the footer with name and postal address; one main call to action; exact expiry time on a magic link; a plain-text part close to the HTML | the summary block, the button after it, the table, the footer |
| Litmus ([accessible emails](https://www.litmus.com/blog/ultimate-guide-accessible-emails), [dark mode](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers), [web fonts](https://www.litmus.com/blog/the-ultimate-guide-to-web-fonts)), Email on Acid, Campaign Monitor | `lang`, `role="presentation"`, one h1 then h2 and h3, alt on every image, links that make sense alone, live text; the color-scheme meta tag and a `prefers-color-scheme` block; Gmail on iOS and Outlook for Windows invert without asking; a transparent logo needs an outline or a plate; web fonts are partial, so a safe stack ending in a generic family | the build rules, the dark palette, the font stack |
| caniemail.com `@font-face` and `prefers-color-scheme`; W3C WCAG 2.2 contrast minimum and target size; FTC CAN-SPAM guide | Web fonts work in Apple Mail, iOS Gmail and Outlook.com but not Gmail on the desktop (Litmus lists fewer: the two conflict); 4.5:1 text contrast; 44px enhanced target size (24px at AA); a marketing email needs a valid postal address and a clear opt-out, and a transactional email must keep its promotion out | contrast table, the marketing footer |
| Really Good Emails, receipt and payment category | Read as a list of examples by subject only; the page says the shared traits are clear order details, transparent pricing and human copy. No layout data | nothing measured |

**Not confirmed (marked UNVERIFIED on the rules page).** Stripe's email layout is in screenshots I could not read, so no Stripe width, size or colour is quoted. Jobber's "View Invoice" and "Pay Invoice" labels came from a search snippet. Housecall Pro's on-my-way page, GOV.UK Notify and Litmus's plain-text guide were search summaries. **No fetched page names Arial Narrow as a fallback for Barlow Condensed**; that is our choice and must be looked at in Apple Mail, Gmail and Outlook before the swap. The dark palette was checked in a browser with the Dark switch, not in Gmail on iOS or Outlook for Windows. The research also says tabular figures (a CSS feature) were not checked in email clients.

**The ten rules**, in short (the page has the reasons and the sources):

1. One column, one white card, 600px at most, full width under 480px.
2. The fact first: the headline says it; the subject and preheader add what the headline does not.
3. One primary action, right after the summary, its label naming what happens.
4. The button is live HTML, 44px or more, full width on a phone, with no cluster of links.
5. The one figure first: a block at the top says what is owed, what was paid or when someone comes.
6. Money in two columns, amounts right-aligned in tabular figures, a ruled bold total.
7. The header is the brand; the footer says why you got this and how to reach us, and a marketing email adds Unsubscribe and the postal address.
8. Body 16px at line height 1.5, labels 14px at the least, every text pair 4.5:1.
9. Built to be read without sight or styles: `lang`, presentational tables, one h1, alt text, links that make sense alone, live text, a plain-text twin.
10. Fonts and dark mode are extras: the email must read right in Helvetica on a light page.

## 6. The layout system

Code: `src/emails/design/frame.ts` (the parts and `compose`) and `src/emails/design/messages.ts` (every email on it). Look at it in Storybook under Messages (Current beside Proposed), and at `docs/plans/2026-11-20-email-audit/proposed/` (every proposed email at 600px and 375px, with dark mode for the receipt, the invoice and the day set). `scripts/email-proposed.mts` rebuilds them.

| Part | What it is |
|---|---|
| Frame | One 600px column on a white card with 8px corners over `#F5F5F4`, a hidden preheader, a plain-text twin built from the same parts so the two never drift |
| Header | `logo-horizontal-trim.png` (the horizontal logo, 190px wide, transparent PNG) on a white band, then a 4px rule: a 64px orange segment (the sun) running into navy. Never the badge |
| Headline | 32px, Barlow Condensed, Arial Narrow as the stand-in, bold navy. The fact in a few words |
| Greeting and lead | "Hi Andrea," on its own line; one 18px sentence under it: what happened, to which service, at which address |
| Summary | One quiet bordered block on cream: the key figure on top in 28px bold tabular figures (Amount due $145 / Due Wednesday, May 12; Paid $145; the day and exact time), then facts as 14px label and 16px value rows, then the money rows (amounts right-aligned in tabular figures, a thin rule between, a ruled bold Total; Subtotal only when there is tax or more than one line) |
| Button | The one primary action: 44px tall, brand orange `#B45309`, white bold 16px label (5.0:1), 8px corners, left-aligned, full width on a phone. The invoice puts it right after the key figure, above the line items |
| Secondary links | Text links, 16px bold underlined, one per line |
| Sign-off | "The Trailhead crew" (the purchase confirmation keeps its tagline) |
| Footer | Cream band: business name, address, the phone and "Your Trailhead account" on one line, one why-you-got-this sentence; a marketing email adds "Unsubscribe" to that sentence |
| Type | Five sizes: 32 headline, 28 key figure, 18 lead, 16 everything read, 14 labels and footer. Body stack `'Source Sans 3','Helvetica Neue',Helvetica,Arial,sans-serif`; no web font is loaded, so what is read is Helvetica or Arial |
| Dark mode | `color-scheme` and `supported-color-schemes` "light dark" and a `prefers-color-scheme: dark` block: charcoal page, navy card, cream text, the same orange button, light-orange links, a white header band so the logo is always on its own plate. All values are from the existing brand block: no new colour |

What changed from the live layout, and why:

| Live | Proposed | Why |
|---|---|---|
| Amount, due day and number spread over a lead sentence, two tables and a button | One summary block with the figure on top, the facts under it, the button right after | audit 1 and 2 |
| Heading in Helvetica Neue 28px; orange rule only | Condensed 32px headline; orange segment into a navy rule; larger logo | audit 4 |
| Amounts right-aligned, no tabular figures, Subtotal always | Tabular figures; Subtotal only with tax or several lines | audit 3 |
| Light only | A dark palette and the color-scheme meta | audit 5 |
| Footer: name, address, phone, why | The same plus "Your Trailhead account"; Unsubscribe on marketing | audit 6 |
| 52px button | 44px | the brief; WCAG 2.5.5 and Mailchimp's 46px are the references |
| Plain text: facts and links in a flat list | Aligned money rows, the key figure as its first line, links labelled by what they do | audit 8 |

Where the proposed words differ from the live words, it is only for the copy problems in section 3 (1, 2, 3, 4, 7, 8, 9 and 12). A test (`src/emails/messages/design.test.ts`) checks that every number, day, time, invoice and receipt number and the phone in a live email is still in the proposed one, and that every proposed email and every text passes the voice rules.

## 7. The swap plan (after Hannah approves)

Nothing here is done. One pull request, in this order.

1. **Frame.** Move `src/emails/design/frame.ts` into `src/emails/layout.ts` (keeping `EMAIL_COLORS`, `esc`, `greetingName`, `greetingLine`, `nameOrThere` where they are, because the senders and texts import them). The design gate's one hex block stays in `layout.ts`.
2. **Renderers.** Replace the bodies of `account-messages.ts`, `booking-and-staff.ts`, `date-messages.ts`, `invoice.ts`, `purchase-confirmation.ts`, `plain.ts` and `sign-in.ts` with the code in `src/emails/design/messages.ts` (same exported names and signatures, so `render.ts` and every caller are unchanged). Delete `job-table.ts`'s HTML (keep `doneWords`, `paidWords`, `linesOf`, `sentence`) and `visit-block.ts`.
3. **Corrected words.** Apply copy problems 1, 2, 3, 4, 7, 8, 9 and 12, and CP 4 in `visitCancelledMoney`, which `sms/texts.ts` shares, so the visit-canceled text changes too.
4. **New kinds.** `refund`, `visit-cancelled` for a visit the office canceled, `tips` and a receipt text, each with a `queueMessage` call at its site (`payments.refund`, `visits.cancel`, a tips send), a row in `SMS_TEMPLATES` or `EMAIL_TEMPLATES`, an entry in `TRANSACTIONAL_KINDS` or `MARKETING_KINDS`, and `message_log` kinds in `MessageKind`. Each waits on the answers in section 8.
5. **Unsubscribe.** A signed one-click route (or the Details marketing switches) for the link every marketing email carries; the `renewal` kind passes it.
6. **Fonts (optional).** A Barlow Condensed woff2 under `public/fonts` and an `@font-face` in the head. The email reads right without it.

**Tests that change.** `src/emails/templates.test.ts`: the structure checks (one `<style>` is already allowed; the font-size set becomes 32, 28, 18, 16, 14; the logo is `logo-horizontal-trim.png`; the button is 44px; the colour-scheme meta is "light dark"; the facts rows now sit inside the summary), the exact-string checks for the words changed by section 3, and the `sign-in.test.ts` fixtures. `src/sms/texts.test.ts`: only the visit-canceled text. `src/emails/messages/design.test.ts` then tests the live renderers, and the Current column of every Messages story goes. **Unchanged:** `editable.test.ts` (the words the office edits), `queue.test.ts`, `send.test.ts`, and the data shapes, so a row queued before the swap still renders (the HTML is built at send time from the stored arguments).

**How the saved, editable words keep working.** Settings > Messages stores only the first sentence of the day-of emails and the middle of the day-of texts (`src/emails/editable.ts`). The proposed `intro()` reads them through the same `bodyOf`, `withoutGreeting`, `fillTemplate` and `capitalFirst`, so a saved sentence lands where the lead goes, exactly as today; the greeting, the summary, the button, the sign-off and the footer are fixed and are shown under the field as "locked". The Settings Preview runs the real renderer, so it shows the new layout the moment the swap lands. The one signature difference: the live renderers take `templates` in an options object, the proposed ones as a second argument; the swap keeps the options object.

## 8. Open questions for Hannah

Each is a fact I did not have; the message says the minimum until you answer.

1. **The layout.** Is the proposed header (horizontal logo, orange segment running into a navy rule), the condensed headline and the key-figure block the look you want?
2. **Barlow Condensed in email.** Show it only where a client has it (Arial Narrow everywhere else), or host the font file so more clients show it? Nothing breaks either way.
3. **Unsubscribe.** Should the link open a one-click page ("You are unsubscribed") or take the customer to the marketing switches in Details?
4. **Replies.** Who reads a reply to a message from Trailhead? The live card emails promise "Reply to this email and we'll help you"; the proposed ones say "Call or text Ryan at (970) 692-7270". Should receipts carry a support email (Stripe requires one on a receipt)?
5. **Refund.** Say nothing about how long it takes, as now, or give a sentence once you know the real answer?
6. **Visit canceled by us.** Should the office choose whether to text, and may it add a line (as Move does)? Is there a reason to tell the customer?
7. **Receipt as a text.** Should a customer with a mobile get the receipt by text as well as by email, or by text alone?
8. **Tips email.** Who writes it, how often, and is "Book Online" the one button? The words in the prototype are placeholders.
9. **Crew assigned.** Which message goes to the crew person and when (when the visit is given to them, or the evening before), and may it carry the customer's phone?
10. **Fixture year.** The brief's visit is Wed Apr 28 (2027) and the invoice is INV-2026-0042; pick one year for the walkthrough's story.
11. **Settled lines I only listed.** "We won't charge you again" (Season Pass canceled) and "The link is good for 24 hours" (Stripe's own default for the card link, not set by us).
12. **Paused texts.** What should the email say about why it came by email? The proposal says only "You are getting this by email instead of a text."
13. **What we did, Nov 21 2026.** The receipt (page and email), the invoice email and the pay page carry the visit's checked items and the photos Ryan shared (never an unchecked item, Nov 22); there is no caption and no crew note because the data has neither. (a) Should a receipt for a payment with no invoice (card on file, Venmo, cash) always carry it when the visit is done? It does in the prototype. (b) Should the crew's per-item notes ever be shared with the customer? They are not. (c) A photo in an email needs an address that works without a sign-in; the build must sign each one like a visit link (the photo route reads a `?t=` token today).

## 9. Requests and quotes (prototypes, Nov 20 2026)

Seven messages added to the Messages section (`Messages / Requests and quotes`, and two under `To the crew`), all prototypes ("Prototype, not built yet"), built on `src/emails/design/quote-messages.ts` and the words in `src/lib/portal/quote-words.ts`. The proposed layout and the voice rules are unchanged, with one exception: the voice rules ban the word "request" as a system word, and Hannah's own answer (Nov 20, answer 9) is "Thanks. We've got your request.", so `voiceProblems` takes `mayNameRequest`, set on the thank-you and on the office's note about a request only.

| Message | Kind (none yet) | Channel | To whom | Class |
|---|---|---|---|---|
| Request received | none | email only (a stranger's phone has not opted in) | the person who asked | transactional |
| Your quote | none | text or email by the contact preference | the customer | transactional |
| Quote reminder | none | text or email | the customer, only when Ryan presses Remind | transactional |
| Quote approved | none | text or email | the customer, after the link's Approve (or Ryan's Mark approved, if he chooses to tell them) | transactional |
| Quote declined | none | text or email | the customer, after the link's Decline | transactional |
| A new request | none | email and text | owner and admins, every request. The email's preheader reads "Open it in the admin to make a job of it or archive it." (Hannah, Nov 20 2026: nobody accepts a request, it becomes the job; no message anywhere says "accept".) | to the crew |
| A quote was decided | none | email and text | owner and admins | to the crew |

**Claims check.** Every claim, and its source. A sentence with no source was not written.

| Claim | Where it is | Source |
|---|---|---|
| "Thanks. We've got your request." and nothing about when anyone will reply | Request received (lead) | Hannah, answer 9. No call-back time is promised in any message. |
| The service, the street and the person's own words | Request received (summary) | the request row |
| "Your quote for Christmas lights at 412 Briggs Street is $1,200" | Your quote, reminder, approved, declined | the quote's frozen total, the job's service and the property |
| "a $300 deposit is due when you approve" | Your quote, reminder (only when set) | the quote's deposit, Hannah's answer 5 |
| "Approve or decline here" and one link | Your quote, reminder (text) | Hannah's answer 4 (two buttons on the link) |
| "A reminder about your quote" | Quote reminder | Hannah's answer 8 (sent only when Ryan presses Remind) |
| "We received your $300 deposit" | Quote approved (only when a deposit was paid) | the payment row; a receipt for it is its own message (answer 5) |
| "You declined the quote" and "Text or call Ryan at (970) 692-7270" | Quote declined | the customer's own action; the business phone |
| Nothing about refunds, a deposit's fate, an expiry, "free", a guarantee or a time | every message | Hannah's answers 7 and 9; the memory rule (no invented promises) |
| The person, the service, the town, their words, "Open it in the admin" | A new request (office) | the request row |
| Who, the number, the total, the deposit and "paid" | A quote was decided (office) | the quote row and the payment row |

**Open questions for Hannah** (each is a fact the messages do not have): (1) Should the first email after a request carry the sign-in link? It does not now, because someone could type another person's address. (2) The quote email's headline is "Your quote is ready" and its button "View your quote": are those the words you want? (3) Should the approval message to the customer go every time Ryan marks a quote approved by hand, or only when he chooses (the prototype lets him choose)? (4) The quote's text subject patterns follow the invoice ("Quote: $1,200 for Christmas lights at 412 Briggs Street"); is that right?

## 10. Preference request (prototype, Nov 22 2026)

Hannah, Nov 22 2026: "I would like them to opt in anytime we need their preferences. We schedule them before that timeframe, like blowouts two weeks ahead of time or turn-ons. They get reminders." One message added (row 28): **Preference request**, a text and an email, a prototype in both channels, in the Messages section under Season Pass ("Prototype, not built yet"), on the proposed layout (`src/emails/design/preference-request.ts`, the words in `src/lib/portal/preference-words.ts`). The same choice is the quiet banner on Home, the Season Pass tab and the visit page, and Details › Preferences (`docs/plans/2026-11-19-customer-side-design.md`, "Account structure (Nov 22 2026)").

| Part | Words | Source |
|---|---|---|
| Subject and heading | "Tell us when you'd like your fall blowout" / "Choose when for your fall blowout" | the visit's service, the voice rules (a verb, the fact) |
| Lead and text | "Tell us when you'd like your fall blowout at 412 Briggs Street." | the visit and the property's street |
| The three choices | Early season, Our recommended, Late season, each with its month (Early, Mid or Late October) | `TimingPreference` (earlier, recommended, later) and `preferenceLabel` |
| What happens next | "We'll schedule it about two weeks before and tell you the day." | Hannah's sentence (`SCHEDULE_NOTE`), the only promise in the message |
| Button and link | "Choose when", the signed one-visit link (`visitLinkUrl`) | the same link every visit text carries |
| Why line | "You are getting this because we are scheduling your fall blowout." | the visit |
| Opt-out line | "Reply STOP to opt out." only when it is the first text the number gets | `isFirstText` |
| Nothing | no deadline, no response time, no reminder of its own, no "Season Pass" | the no-invented-copy rule; the reminders are the two-weeks-out and day-before messages that already exist |

**Open questions for Hannah** (facts the message does not have): (1) How long before a visit's window does it go out, and is it sent to a customer who already chose, every season? (2) Should a customer who does not answer get a second request, or is silence "Our recommended"? The prototype assumes silence means the choice on file (Our recommended until they say otherwise), and says nothing about it. (3) Should the link open that visit's page (the prototype) or the Season Pass tab, which needs a sign-in?

**Counts, Nov 22 2026.** `npx tsx scripts/count-messages.mts`: 36 messages; 20 built; 12 whole prototypes (the one new one is the Preference request); 4 built emails with a prototype text (the receipts).
