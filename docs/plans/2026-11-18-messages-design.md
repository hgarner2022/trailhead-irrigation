# Transactional emails and texts: design

Nov 18 2026. A design only; nothing is built until Hannah has read it. Hannah's note: a receipt carries the pass number, which makes no sense; the words should be irrigation, not "open their season pass", "it's their customer portal."

## 1. The job each message does

| Message | The customer's words |
|---|---|
| purchase-confirmation | "I want proof my season is reserved, and what happens next." |
| booking-confirmation | "I want to know my repair is booked, when, and who is coming." |
| date-set | "I want to know my blowout has a day." |
| date-moved | "My day changed. Tell me the new one before I plan around the old one." |
| date-confirm | "Two weeks out: is Friday still on?" |
| day-before | "I want to know it is tomorrow and who is coming." |
| receipt | "I want to know what I paid, for what, at which house, and how." |
| invoice | "I want to know what I have to pay, by when, and pay it in a minute." |
| invoice-reminder | "I forgot. Show me the bill again." |
| card-failed | "Tell me my card didn't go through and let me fix it." |
| card-expiring | "Tell me before my card stops working." |
| cancelled | "I want to know it's cancelled and that I won't be charged." |
| renewal | "Tell me when next season opens, and let me reserve it fast." |
| not-closed-crew, admin-alert | Office only: "What needs doing today?" |

## 2. What the tools do

- Jobber's on-my-way text is sent from the visit, says roughly when the crew arrives and carries a callback number ([help](https://help.getjobber.com/hc/en-us/articles/7448087796631)).
- Jobber's reminder links to the visit with a Confirm button, and its receipts go by email only (search summaries of [Jobber help](https://help.getjobber.com/es/articles/emails-and-text-messages-settings/); the receipt line is not read from the page).
- Housecall Pro texts and emails on scheduling, texts on the way (naming the employee), and sends invoices manually ([help](https://help.housecallpro.com/en/articles/357613-customer-notifications-overview)).
- Stripe's receipt is itemized, shows line items and taxes, and must carry the business name and support contact; its links expire after 30 days ([docs](https://docs.stripe.com/payments/advanced/receipts)).
- Transactional guides agree on one purpose, a clear subject and one main button ([Courier](https://www.courier.com/blog/transactional-email-templates-what-makes-them-effective-plus-six-examples), which draws examples from Really Good Emails; I did not find that site's own guidance).
- CTIA expects express consent and an opt-out such as STOP ([summary](https://www.kelleydrye.com/viewpoints/client-advisories/ctia-publishes-new-messaging-principles-and-best-practices-guidance.md)). Naming the sender stays a Trailhead rule, since I did not find CTIA's text.
- The FCC allows informational texts on prior express consent, and the revocation rules are still changing ([summary](https://natlawreview.com/article/fcc-clarifies-and-codifies-tcpa-consent-revocation-rules)). Honor STOP at once; counsel should confirm the rest.
- A segment holds 160 characters in GSM-7 ([Twilio](https://www.twilio.com/docs/glossary/what-is-gsm-7-character-encoding)); em dashes and curly quotes fall outside it. Keep texts plain ASCII.

## 3. The voice

Six rules, from `CLAUDE.md` "Copy rules" and the tagline (less time in the yard, more time on the trail):

1. **The fact first.** Subject and first line say what happened, to which service, at which address: "Fall blowout at 480 Briggs St."
2. **Sprinklers, not paperwork.** Say turn-on, blowout, zones, lines, yard. "Season Pass" and its number appear only on the purchase confirmation and renewal.
3. **Ryan when a person comes, we otherwise.** Never a truck label.
4. **One link, one button.** Every link to the account reads "your Trailhead account", the working name; the portal design has not published a name I can read, so one constant, `ACCOUNT_NAME`, holds it. The button says what happens.
5. **Money has three parts.** Amount, what for and where, how it was paid. A bill number is one quiet reference row on bills and their receipts, never in a subject or headline.
6. **Plain sentences.** Contractions, no fragments, no "not X, it's Y", no lists of nos, no em dashes, no exclamation marks.

| Today | After |
|---|---|
| "Thank you, Andrea. We charged $145 to your Visa ending 4242 for your spring turn-on on Season Pass TH-2027-0004." | "Thank you, Andrea. Your spring turn-on at 412 Ash St is paid: $145 on your Visa ending 4242." |
| "Trailhead: Ryan will be there tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Changes: {passUrl}" | "Trailhead: Ryan is coming tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Your Trailhead account: {link}" |
| "Hi Andrea, your spring turn-on on Season Pass TH-2027-0004 is done, but your card didn't go through for $145." | "Hi Andrea, your spring turn-on at 412 Ash St is done, but your Visa ending 4242 didn't go through for $145." |

## 4. Every template rewritten

Every email ends with the sign-off "The Trailhead crew" above the footer. Texts open "Trailhead:" and end "Reply STOP to opt out." The quiet Google and Apple calendar buttons stay where they are today (confirmation, set, moved, confirm, day before), under the facts. `{link}` is the account link.

| Kind, when, channel | Subject and words | Needs |
|---|---|---|
| **purchase-confirmation**, at sale, email | Subject "Your 2027 Season Pass is reserved". The pass card image sits first and links to the account. Headline "Welcome, Andrea". Rows: each visit with day and window, then "Where". The money line and the text-two-weeks promise as today. Button "Open your Trailhead account". Sign-off: "Less time in the yard. More time on the trail." Footer keeps the pass number. | customer, job (pass number, lines), visits, property address, card |
| **booking-confirmation**, at a booking, email | Subject "Your sprinkler repair is booked for Tuesday, May 5". Headline "Your repair is booked". "Hi Andrea, Ryan will be there Tuesday, May 5, between 8 and 10 am. We text you the day before." Rows Day, Who is coming, Where. Button "Open your Trailhead account". | visit, person, address, service |
| **date-set**, when a day is set, text with email fallback | Text: "Trailhead: your fall blowout is Fri, Oct 14, 8 to 10 am. Ryan will be there. Your Trailhead account: {link} Reply STOP to opt out." Email subject "Your fall blowout is Friday, October 14"; headline "Your fall blowout has a day"; the same rows. | visit, person, link |
| **date-moved**, day changes, text with email fallback | Text: "Trailhead: your fall blowout moved to Fri, Oct 21, 8 to 10 am. Another day? Your Trailhead account: {link} Reply STOP to opt out." Email subject "Your fall blowout moved to Friday, October 21". | as date-set |
| **date-confirm**, two weeks before, text with email fallback | Text: "Trailhead: your fall blowout is still Fri, Oct 14, 8 to 10 am. Need another day? Your Trailhead account: {link} Reply STOP to opt out." Email headline "Your fall blowout is in two weeks". | as date-set |
| **day-before**, 9 am the day before, text with email fallback | Text: "Trailhead: Ryan is coming tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Your Trailhead account: {link} Reply STOP to opt out." With no person: "We're coming tomorrow". Email subject "Tomorrow: your spring turn-on"; headline "We're coming tomorrow". | as date-set |
| **receipt**, a visit is paid, email | Subject "Receipt: $95 for your fall blowout at 480 Briggs St". Headline "Paid, thank you". "Thank you, Andrea. Your fall blowout at 480 Briggs St is paid." Rows Service, Where, Paid ("$95, Visa ending 4242" or "$95, Venmo"), Paid on. Next-visit line when one exists. Button "View the receipt" when a Stripe link exists. | payment, line name, address, card or method, receipt URL, next visit |
| **receipt**, a bill is paid, email | Subject "Receipt: $145 for your repair at 412 Ash St". Rows each line, Sales tax if any, Paid, Where, Bill (quiet). Same button. | payment, invoice lines, tax, address |
| **invoice**, bill sent, text with email fallback | Text: "Trailhead: your bill for the repair is $145, due May 21. Pay here: {payLink} Reply STOP to opt out." Email subject "Your Trailhead bill for the repair at 412 Ash St: $145"; headline "Your bill is ready"; rows lines, tax, Total, Due, Bill; button "Pay $145". | invoice, address, pay link |
| **invoice-reminder**, office taps Remind, text with email fallback | Text: "Trailhead: a reminder that $145 for the repair is still unpaid, due May 21. Pay here: {payLink} Reply STOP to opt out." Email subject "Your Trailhead bill, $145, is still unpaid"; headline "A reminder about your bill"; same rows and button. | as invoice |
| **card-failed**, charge didn't go through, email | Subject "The card for your spring turn-on didn't go through". Headline "Your card needs a quick update". Body as in section 3, then "Add a new card and we'll try it right away." Button "Update your card". Small print: "The link is good for 24 hours. Your Trailhead account can make a new one." Link request with no visit: subject "Update the card in your Trailhead account". | visit, address, card, amount, update URL |
| **card-expiring**, before expiry, email | Subject "Your Visa ending 4242 expires in July 2027". "Hi Andrea, the card we have for your visits expires in July 2027, and $190 of visits are still to come. A new card now keeps them on schedule." Button "Add a new card". | card, state, amount left, update URL |
| **cancelled**, pass cancelled, email | Subject "Your 2027 Season Pass is cancelled". "Hi Andrea, your 2027 Season Pass is cancelled and your remaining visits are off the schedule. We won't charge you again. If you want a visit later, book online or call (970) 692-7270." Button "Book a visit". No number. | customer, season |
| **renewal**, November 1 onward, email (marketing consent) | Subject "Reserve your 2028 turn-on and blowout". Headline "Season Pass 2028 is open". "Hi Andrea, you can reserve your Erie spring turn-on and fall blowout for 2028 now and pick your days in the same step. You pay after each visit, on the card we have on file." Button "Reserve 2028". Footer says how to stop. | customer, season, town, buy URL |
| **not-closed-crew**, **admin-alert**, office email | Unchanged. | unchanged |

## 5. Settings › Messages

Today I found no code outside the Settings screens that reads the saved templates, so editing changes nothing a customer sees. The build must make the sender read them.

- **The office may edit** the day-of voice: date-set, date-moved, date-confirm, day-before and on-the-way (the intro sentence of an email, the whole text) plus the invoice-reminder text. Never edited: receipts, bills, card, cancel, purchase and renewal, because they carry money and consent wording.
- **Placeholders**, in plain words: `{firstName}` the customer's first name, `{service}` "fall blowout", `{address}` the street address, `{day}` "Friday, October 14", `{window}` "8 to 10 am", `{who}` "Ryan", `{amount}` "$145", `{payLink}` the pay link. A saved `{visit}` becomes `{service}`, `{date}` becomes `{day}`, and `{truck}` and `{nextVisit}` go.
- **Locked**: the "Trailhead:" opening, the STOP line, the account link and the footer show under the field and cannot be removed. The invoice-reminder must keep `{amount}` and `{payLink}`.
- **Preview rule**: Preview runs the real renderer on a real visit, shows the text exactly as sent with its length in parts, and Save refuses an unknown placeholder ("We don't know {x}"), an em dash or an exclamation mark.

## 6. What changes in code

| File | Change | Test |
|---|---|---|
| `emails/format.ts` | add `ACCOUNT_NAME`, `address` on `VisitFacts`; reword the money lines | `templates.test.ts` |
| `emails/types.ts` | `passUrl` becomes `accountUrl`; `ReceiptData` gains `serviceName`, `address` and loses `passNumber`; `CardFailedData`, `CardExpiringData` gain `card`, `address` and lose `passNumber`; `CancelledData` gains `season`; `InvoiceData` gains `address` | fixtures in `DATA` |
| `emails/account-messages.ts`, `date-messages.ts`, `visit-block.ts`, `booking-and-staff.ts`, `invoice.ts`, `purchase-confirmation.ts` | the words in section 4; `who` replaces the truck label | `wording per kind` |
| `emails/calendar.ts` | file label "Season Pass" becomes "Visits" | calendar tests |
| `sms/texts.ts` | the texts in section 4 | `texts.test.ts` exact strings |
| `lib/messaging/data.ts` and each queuing caller | build `address`, `serviceName`, the card | `data.test.ts`, `queue.test.ts` |
| `settings-model.ts`, `settings-tabs/Messages.tsx`, `snapshot.json`, `send.ts` | placeholders, locked parts, saved templates read at send time | `settings-model.test.ts`, `send.test.ts` |

New assertions: only purchase-confirmation and renewal may say a pass number or "your pass"; every text is plain ASCII.

**Moves to `docs/UX_WRITING.md`**: the six rules, the glossary rows (Trailhead account, receipt, bill, paid, unpaid; Hannah's word, Nov 18, replacing "owed" in messages), the text length rule and the subject patterns. Bodies stay in code and tests.

## 7. Open questions for Hannah

1. Name in every message: "account" (your Trailhead account) or "portal" (your customer portal)?
2. Add the on-my-way text that Settings already lists, sent from a button on the visit: yes or no?
3. "Reply STOP to opt out." on every text, or the first only: "every" or "first"?
4. Buy a short link domain so texts fit one part: yes or no?
