# UX writing guide

How Trailhead's words work in the checkout, the pass page, texts, emails and the admin. It sits under `CLAUDE.md` "Copy rules" and `docs/DESIGN.md` "Copy"; where they differ, those win. Written Nov 13 2026 from the sources at the bottom.

## The ten rules

1. **A button says what happens, with a verb.** "Save card and reserve", "Email me a link", "Keep my pass". Never "Submit", "OK" or a bare "Continue" where a verb fits. Why: people decide to press on the label alone (Polaris, Material).
2. **One name per action, everywhere.** If the button says "Skip a visit", the confirmation says "skipped", not "removed". Why: different verbs for one action read as different actions (Material). Example: not "closed" in one place and "marked done" in another.
3. **Name the field and the fix in an error.** "We need a ten-digit phone number for the day-of text." Say what is wrong, then what to do; keep what they typed. Why: vague errors cost minutes at checkout (Baymard, NN/g).
4. **Never blame, never apologise twice.** "We couldn't save that day. Try another, or call Ryan at (970) 692-7270." Why: a calm, specific message keeps the sale (NN/g).
5. **Short sentences, one idea each, active voice.** Aim for a reading age of about nine. Split on every semicolon. Why: GOV.UK content design; customers read on a phone in a driveway.
6. **"We" for Trailhead, "Ryan" when the person matters, "you" for the customer.** "Ryan sets each day inside the window you picked." Why: it is a two-truck company and Ryan shows up; a face beats a brand.
7. **Say the date, the amount and the card.** "$145 after the spring turn-on, to the card ending 4242." Never promise a number, day or text that the product does not send. Why: confirmation pages and receipts exist to remove doubt (NN/g, Stripe).
8. **Put the point first.** Email subject: what happened plus the thing (Your spring turn-on is Tuesday, April 14). First line: the next step. One button per message. Why: subject and preheader decide whether it is read (Stripe).
9. **Text messages start with the business name, stay under about 160 characters, carry one link, and end with the opt-out line.** "Trailhead: your fall blowout is Tue Oct 14. Calendar and changes: link. Reply STOP to opt out." Why: carriers and Twilio's messaging policy expect the sender named and a way out.
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
| truck | what the admin schedules | route, unit |
| reserved | the pass is bought and the season is held | confirmed, approved, firm, locked in |
| set, moved | a visit has a day; a day changed | scheduled (customer side), rescheduled, proposed |
| marked done | a visit is finished (admin) | closed, completed (in UI) |
| "Ryan" | when the person matters: who sets days, who comes | "our team", "a technician" |
| "we" | Trailhead as a company: emails, texts, charges | "Trailhead will", "the company" |

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
