# UX writing guide

How Trailhead's words work in the checkout, the pass page, texts, emails and the admin. It sits under `CLAUDE.md` "Copy rules" and `docs/DESIGN.md` "Copy"; where they differ, those win. Written Nov 13 2026 from the sources at the bottom; the transactional section was added Nov 18 2026.

## The ten rules

1. **A button says what happens, with a verb.** "Save card and reserve", "Email me a link", "Keep my pass". Never "Submit", "OK" or a bare "Continue" where a verb fits. Why: people decide to press on the label alone (Polaris, Material).
2. **One name per action, everywhere.** If the button says "Skip a visit", the confirmation says "skipped", not "removed". Why: different verbs for one action read as different actions (Material). Example: not "closed" in one place and "marked done" in another.
3. **Name the field and the fix in an error.** "We need a ten-digit phone number for the day-of text." Say what is wrong, then what to do; keep what they typed. Why: vague errors cost minutes at checkout (Baymard, NN/g).
4. **Never blame, never apologise twice.** "We couldn't save that day. Try another, or call Ryan at (970) 692-7270." Why: a calm, specific message keeps the sale (NN/g).
5. **Short sentences, one idea each, active voice.** Aim for a reading age of about nine. Split on every semicolon. Why: GOV.UK content design; customers read on a phone in a driveway.
6. **"We" for Trailhead, "Ryan" when the person matters, "you" for the customer.** "Ryan sets each day inside the window you picked." Why: it is a two-truck company and Ryan shows up; a face beats a brand.
7. **Say the date, the amount and the card.** "$145 after the spring turn-on, to the card ending 4242." Never promise a number, day or text that the product does not send. Why: confirmation pages and receipts exist to remove doubt (NN/g, Stripe).
8. **Put the point first.** Email subject: what happened plus the thing (Your spring turn-on is Tuesday, April 14). First line: the next step. One button per message. Why: subject and preheader decide whether it is read (Stripe).
9. **Text messages start with "Trailhead:", say the fact first, carry one link, and are plain ASCII.** "Trailhead: your fall blowout is Fri, Oct 14, 8 to 10 am. Ryan will be there. Your Trailhead account: link". "Reply STOP to opt out." ends the first text to a phone number and no later one (CTIA asks for the opt-out on the first message; Hannah chose first only, Nov 18 2026). One part holds 160 characters of plain ASCII and 153 each once a text runs to two; an em dash or a curly quote moves it to a shorter encoding. We keep the full link and accept a two-part text where the link forces one, instead of buying a short link domain. Why: carriers and Twilio's messaging policy expect the sender named and a way out.
10. **Empty and finished states tell the next move.** "No passes yet. Passes appear here as customers reserve their season." Why: a blank panel leaves people unsure whether something broke (NN/g).

Always: sentence case, contractions in customer text ("we'll", "didn't"), no em dashes, no exclamation marks, whole dollars, dates written out where there is room.

## Glossary: what we call things

| Say | Means | Do not say |
|---|---|---|
| pass, Season Pass | the two-visit season (turn-on and blowout) | package, plan, membership, subscription |
| visit | one trip to the property | appointment, job (customer side), service call |
| spring turn-on | the April to May visit | start-up, activation, opening |
| fall blowout | the October visit that clears the lines | winterization (page titles only), shut-down |
| mid-season inspection, July inspection | the optional add-on | check-up, tune-up as a name |
| day | the date we come | slot, appointment time |
| window | the time range inside that day ("8 to 10") | arrival time, ETA |
| timing preference, "mid October" | what the customer asked for before a day is set | request, demand |
| Early season, Our recommended, Late season | the three timing choices a customer sees for a visit we schedule for them (the data's earlier, recommended, later), each with its month under it ("Mid May"); Our recommended is the middle of the window and the default; Hannah, Nov 22 2026 | Mid season (there is no fourth value), Earlier, Later |
| Season Pass tab, "Become a Season Pass holder" | the plan: the card, each visit's state or timing, how it is paid; for a customer with none, the one quiet page that explains it; never a card on Home or Visits | Season Pass in a Visits list, membership, plan |
| truck | what the admin schedules | route, unit |
| reserved | the pass is bought and the season is held | confirmed, approved, firm, locked in |
| set, moved | a visit has a day; a day changed | scheduled (customer side), rescheduled, proposed |
| Unscheduled | a visit with no day (the pill, the filter, the header line "1 unscheduled"); Hannah's word, Nov 17 2026 | no day yet, needs a day, unplaced |
| Not done | a visit that was tried and came back without a day; the reason follows the pill ("Not done · could not get in") | failed visit, skipped |
| Paid | money that arrived, by any method ("Paid this month", "Paid so far", "Paid, Venmo") | charged (a Jobber word) |
| Past its window | on Home's Today, a visit whose window end has passed and that is not done; the heading counts it ("2 past their window"); Hannah's words, Nov 17 2026 | overdue, late, behind (Past due is an invoice word only) |
| Ahead today | a visit scheduled today whose window is not over, or that has no window yet ("3 ahead today") | remaining, upcoming, active |
| Done today | a visit done today, the customer line struck through, the money word at the right: "Paid, Venmo", "$95 unpaid", "Invoice sent" ("4 done today") | completed |
| Invoice | what we send a customer for work that is done: Sent, Past due, Paid, Voided; the button is "Send an invoice", the Home row "Invoice past due", the header chip "2 invoices out"; Hannah's word, Nov 18 2026 | bill, billing (the Settings tab is the one place "Billing" stays) |
| Invoice sent | the money word on a job or visit while an invoice is out before its due day ("$145 · Invoice sent, due Dec 1") | Bill sent, awaiting payment |
| Past due | an invoice whose due day has passed ("$145 · Past due since Dec 1"); never for a visit | overdue |
| Voided | an invoice that was canceled and stays on record; the button that does it still says Cancel | cancelled invoice |
| Unpaid | money still to come on a done job or visit, with the amount ("$115 unpaid", "2 of 3 paid, $115 unpaid"); on Home "Done, unpaid"; Hannah's word, Nov 18 2026 | owed |
| Mark done | the first beat of a finished visit: the button and the dialog; it writes that the visit happened and nothing else, so it never says charge, paid or receipt; when the visit's day is ahead the dialog asks "This visit is scheduled for Friday. Mark it done today?"; Hannah's flow, Nov 18 2026 | Done and record payment, Complete |
| How is this paid? | the second beat, opened by Mark done or by the footer's "Collect $145"; its choices in this order: "Charge the Visa ending 4242 now" (a Season Pass visit: "Charge the card as agreed"), Check, Venmo, Cash, Send an invoice, Pay later (only with no card); no Tap to pay row is drawn until it exists; its buttons are "Charge $145", "Record $145 paid", "Send the invoice", "Leave it unpaid"; the result reads "Paid, card" and "Receipt emailed to Andrea." | Paid by, Record payment, Collect payment |
| Card not charged | the Home row for a done visit whose customer has a card and nobody pressed Charge, from the next morning; its button is "Charge $145" | Uncharged, Not billed |
| Card failed | the Home row (and the panel's "The card didn't go through. Choose another way.") when a card charge did not go through; the customer was already emailed the card link | Charge failed |
| Refund | taking a recorded check, Venmo or cash payment back: the button "Refund $145", a refund row, nothing deleted | Reverse, Void payment |
| Quote sent | a job whose quote went out and has not been accepted | Quoted, proposed |
| Canceled | US spelling, for a visit, job, pass, line and a message; database values keep `cancelled` | Cancelled |
| Expired | a Season Pass whose season has passed without a renewal | Lapsed |
| marked done | a visit is finished (admin) | closed, completed (in UI) |
| "Ryan" | when the person matters: who sets days, who comes | "our team", "a technician" |
| "we" | Trailhead as a company: emails, texts, charges | "Trailhead will", "the company" |
| Trailhead account, "your Trailhead account" | the customer's page for their visits, invoices, card and details (`/account`); the one name in every link, button and sentence, held in code as `ACCOUNT_NAME` | pass page, customer portal, dashboard, login |
| receipt | what we send once money arrives: the amount, what it was for and where, how it was paid; an invoice number is one quiet row on an invoice and its receipt, never in a subject | confirmation (that word is for a reserved season or a booked visit) |

## Transactional emails and texts

Written Nov 18 2026 from `docs/plans/2026-11-18-messages-design.md`. The words of every template live in code (`src/emails/*`, `src/sms/texts.ts`), pinned by `src/emails/templates.test.ts` and `src/sms/texts.test.ts`; this section is the voice they are written in.

### The six rules

1. **The fact first.** The subject and the first line say what happened, to which service, at which address: "Fall blowout at 480 Briggs St."
2. **Sprinklers, not paperwork.** Say turn-on, blowout, zones, lines, yard. The pass number appears only in the purchase confirmation's footer; "Season Pass" is named only by the purchase confirmation, the cancel and the renewal; no other message says a pass number or "your pass".
3. **Ryan when a person comes, we otherwise.** The person on the visit is named ("Ryan is coming tomorrow"); with no one it reads "We're coming". Never a truck label.
4. **One link, one button.** An email has one button and it says what happens ("Open your Trailhead account", "Pay $145", "Update your card"). Every other action is a text link under it; the link to a job or receipt reads "See it in your account", and a sentence that names the page says "your Trailhead account".
5. **Money has three parts.** Amount, what for and where, how it was paid. An invoice number is one quiet row on invoices and their receipts, never in a subject or headline.
6. **Plain sentences.** Contractions, no fragments, no "not X, it's Y", no lists of nos, no em dashes, no exclamation marks. Every email ends with "The Trailhead crew" above the footer; the purchase confirmation ends with "Less time in the yard. More time on the trail."

### The template every email is built on

One frame in `src/emails/layout.ts`; an email supplies words and picks parts and never writes a size, a colour or a margin. Research and the audit are in `docs/plans/2026-11-18-email-template-design.md`.

| Part | Rule |
|---|---|
| Frame | One column, 600px, white card on #F5F5F4, the logo on its white plate (`logo-email.png`) over a 4px orange rule, a cream footer |
| Type | One web-safe stack (Helvetica Neue, Helvetica, Arial). Four sizes only: 28 the heading, 18 the lead, 16 everything you read, 14 labels, small print and the footer. Secondary text is #57534E |
| Heading | One `h1`, the fact in a few words; never the customer's name |
| Greeting | "Hi Andrea," on its own line under the heading, from the first word of the stored first name; "Hi there," when there is no usable name. No greeting on staff emails or the sign-in link. Never "Hi, Andrea," and never a greeting inside the lead. A saved sentence in Settings that opens with "Hi {firstName}," loses that opening at send time |
| Lead | One sentence, 18px: what happened, to which service, at which address |
| Facts and money | Fact rows have a 112px label; the money table ends in a bold Total under a navy rule; Subtotal and Sales tax are quiet |
| Button | One per email: filled orange-dark, 52px tall, 16px bold white. A second action is a text link under it, one per line |
| Preheader | 20 to 100 characters that add to the subject and the heading; never the lead; the frame pads it |
| Footer | Business name, address, phone, one why-you-got-this sentence, on every email. Customer emails end "The Trailhead crew" above it |
| Plain text | Written with the HTML: greeting, lead, facts, the links on their own lines, sign-off, address, phone, the why line |

### Subject patterns

| Message | Subject |
|---|---|
| Purchase confirmation | Your 2027 Season Pass is reserved |
| Booking confirmation | Your sprinkler repair is booked for Tuesday, May 5 |
| Day set, moved | Your fall blowout is Friday, October 14 / Your fall blowout moved to Friday, October 21 |
| Day before | Tomorrow: your spring turn-on |
| Receipt | Receipt: $95 for your fall blowout at 480 Briggs St |
| Invoice, reminder | Your Trailhead invoice for the repair at 412 Ash St: $145 / Your Trailhead invoice, $145, is still unpaid |
| Card didn't go through | The card for your spring turn-on didn't go through |
| Card expiring | Your Visa ending 4242 expires in July 2027 |
| Canceled | Your 2027 Season Pass is canceled |
| Renewal | Reserve your 2028 turn-on and blowout |

### What the office may edit

Settings › Messages lists the day-of voice (day set, day moved, two weeks out, day before, on the way) and the invoice reminder text. Receipts, invoices, card, cancel, purchase and renewal carry money and consent wording and are never edited. Placeholders are plain words: `{firstName}`, `{service}`, `{address}`, `{day}`, `{window}`, `{who}`, `{amount}`, `{due}`, `{payLink}`. Under each field the screen shows what the sender always adds (the "Trailhead:" opening, the account link, the opt-out line, the sign-off, the footer). Save refuses an unknown placeholder, an em dash, an exclamation mark, a non-ASCII character in a text, and an invoice reminder without `{amount}` and `{payLink}`.

## Words we never use

`proposed`, `approve`, `firm`, `submit`, `error`, `invalid`, `oops`, `please note`, `kindly`, `Yes!`, any exclamation mark, ALL CAPS for emphasis, "unfortunately", "we regret", "failed" (say "didn't go through"), "declined" (say "didn't go through"), "bounced" (say "not delivered"), "closed" for visits. "Please" is allowed only when a step is a real favour; default to the bare verb.

## Sources

- Nielsen Norman Group, Error-Message Guidelines. https://www.nngroup.com/articles/error-message-guidelines/ (plain language, name the problem, offer the fix, never blame, keep input)
- Nielsen Norman Group, Designing Empty States in Complex Applications. https://www.nngroup.com/articles/empty-state-interface-design/ (status, teach, direct to the task)
- Baymard Institute, Adaptive Validation Error Messages and Checkout/Payment UX. https://baymard.com/blog/adaptive-validation-error-messages and https://baymard.com/learn/payment-ux (specific, field-level wording; "Card number appears incomplete" over "Invalid payment information"; labels that say what to enter). Full guideline text is paywalled; points taken from the free articles.
- Material Design writing guidance. https://m1.material.io/style/writing.html (sentence case; do not describe one action with different verbs)
- Carbon Design System, Writing style. https://carbondesignsystem.com/guidelines/content/writing-style (sentence case for all UI text including buttons)
- Shopify Polaris, Actionable language. https://polaris.shopify.com/content/actionable-language (button labels lead with a verb and say the outcome; the page redirected when fetched, so this rests on the system's published summary)
- GOV.UK content design, writing guidelines. https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/ (plain words, short sentences, active voice, address the reader as "you"; the page redirected when fetched, so this rests on well-known GOV.UK practice)
- Stripe, How to write an invoice email and Dunning emails 101. https://stripe.com/resources/more/how-to-write-an-invoice-email and https://stripe.com/resources/more/dunning-emails-101-what-theyre-for-and-how-to-write-them (clear descriptive subject with business name, one prominent action, amount and date in the body)
- Twilio, Opt-in and opt-out text messages and Messaging Policy. https://www.twilio.com/en-us/blog/insights/compliance/opt-in-opt-out-text-messages and https://www.twilio.com/legal/messaging-policy (name the sender, remind recipients how to stop, STOP keyword). The 160-character figure is the standard single-segment SMS length and was not confirmed on a Twilio page this session.
