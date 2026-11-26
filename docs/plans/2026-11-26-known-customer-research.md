# Recognizing a returning customer without sign-in: research

## 1. What products do

| Product | What it does | Words / evidence | URL read |
|---|---|---|---|
| ServiceTitan Scheduling Pro | Recognizes by PHONE typed in the scheduler, no code. Then lists existing addresses, masked, filtered by the ZIP already entered, plus "Enter Property". | A "message confirming you are a returning customer" (exact words not in the page). Addresses "masked for privacy". | help.servicetitan.com/commercial/docs/confirm-existing-contact-information |
| Housecall Pro online booking | No on-screen recognition found. Matches silently AFTER submit on first name + last name + phone + email (exact match). New address is added to the existing customer. | Page does not say any message is shown. | help.housecallpro.com/en/articles/8330061-new-online-booking-faqs |
| Stripe Link | Email typed, matches a Link account, one-time code by SMS. Saved details appear only after the code. | "sends the customer a secure, one-time code"; saved addresses/cards shown "after successful authentication" (search summary; full docs page fetched but too large to read in full). | docs.stripe.com/payments/link/accept-a-payment |
| Shop Pay (Shopify) | Email typed, 6-digit SMS code to the number on the account, or by email, or passkey. | Section titled "Confirm it's you". Masked phone: page does not say. | help.shop.app/en/shop/shop-pay/check-out |
| Calendly | Optional per-event email verification, 6-digit code to the typed email, required every booking, no returning exemption. | From help-center search snippets; page not read in full. | calendly.com/help/how-to-require-email-verification-for-event-types |
| Mangomint, Recranet (salon/booking) | Code by SMS or email before saved details load. | Search snippets only; Mangomint pages returned nav only. | not verified |
| HubSpot / ActionKit (web forms) | Cookie-based recognition with a reset link. | "Not Bob? Click here" (ActionKit). | search snippets only |
| OWASP | Never confirm whether an identifier exists. | "If that email address is in our database, we will send you an email..." | cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html |

NOT verified (no readable source found): Jobber client hub or booking recognition (help pages 403 or silent), Workiz, Thumbtack, Angi, Square Appointments, DoorDash, Uber Eats, Amazon address recognition, Baymard guideline 568 (page was a paywalled placeholder), NN/g. I found no product that shows a name for an address alone.

## 2. Privacy risk and accepted safe patterns

Risk: an address is public. Anyone can type your neighbor's address, so a screen that says "Welcome back, Andrea" or shows a phone or gate code hands a stranger private data. Even a bare "we know this address" is a small leak (it reveals the household is a customer), but it is far lower risk than a name. OWASP's rule is to answer identically whether or not a record exists, or to put the reveal behind a secret only the owner holds.

Patterns the products above actually use:
1. Recognize on a secret the user types (phone, email), never on the address alone (ServiceTitan, Housecall Pro, Stripe, Shop Pay).
2. Gate saved data behind a one-time code to the phone or email on file (Stripe Link, Shop Pay, Calendly).
3. Show only masked data before verification (ServiceTitan masks addresses). A masked name ("A*** R***") is a known pattern in my experience but I did not find a source for it.
4. Always offer an escape ("Not you?" / "Enter a new address").

## 3. Options for our form

**A. Keep today's behavior, sharpen the words (no new risk).** The chip says "We have worked at this address before." Nothing personal. Later fields prefill "On file". Name fills after the email matches. Cost: tiny copy change. Risk: leaks only "this is a customer address". Does not give the owner "Is this you?" but does say clearly that we recognize the place.

**B. Ask for the secret right at the address (recommended).** After the address is picked, show: "We have worked at this address before. Enter the email or phone number we have on file to fill in your details." One box, then the form fills (name, zones, access answer) and the chip becomes "Welcome back, Andrea. Not you? Start fresh." A wrong value says the same neutral line as a new customer, so no confirmation either way: "We will use what you enter." Cost: one extra input and one server check; rate limit it (the same address plus guessing emails is a probe). This is the ServiceTitan/Housecall Pro matching rule moved earlier in the flow. It gives the "we know you" moment safely, but only after the customer proves themselves.

**C. One-time code.** Same as B but after the typed email or phone we send a 6-digit code: "We sent a code to the phone ending 70. Enter it to fill in your details." Safest (also covers gate code and card on file), matches Stripe Link/Shop Pay. Cost: SMS or email per attempt, delivery failures (our Twilio number currently has delivery problems per project notes), an extra step on mobile, and likely lower completion. Worth it only for the card on file and gate code, not for name.

**Not recommended:** "Is this you, Andrea R.?" from the address alone, even masked. A masked first name plus a recognized street still lets a stranger learn who lives at an address; no product I could read does it.

**Recommendation:** B for name, zones and access, with C reserved for showing the saved card or gate code. Keep A's chip wording for the pre-email moment so the owner sees an acknowledgement immediately.

## 4. Evidence vs inference

Solid (read directly): ServiceTitan identifies by phone, no code, masks addresses; Housecall Pro matches on four exact fields and adds new addresses; Shop Pay sends a 6-digit code to the account's phone, "Confirm it's you"; OWASP's generic-response wording and its registration and reset examples; Calendly and Stripe use codes (via search summaries, secondary).

Inference: that every address-only recognition shows nothing personal (I found no counter-example, but absence of evidence); that masked names are an accepted pattern; that B converts better than C; that rate limiting is needed; the risk ranking of "customer exists" leakage. I could not confirm Jobber's own behavior, which is the closest competitor to the owner's expectation.
