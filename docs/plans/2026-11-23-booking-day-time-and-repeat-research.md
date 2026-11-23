# Research: the day-and-time step, and the repeat customer (booking form, third pass)

Nov 23 2026. Hannah's phone review of Nov 22 asked for two things to be researched before they are built: "an e-commerce booking flow" for the day and time (a calendar, the soonest days marked, the recommended day already chosen, then the times), and what a customer who has booked before should not have to retype. This is the short version; the design that follows from it is in `2026-11-19-booking-form-design.md`, "Third pass (Nov 23 2026)". Where a source could not be confirmed it says so.

## 1. The job

"I need a visit. Show me when someone can come, let me take the first one that works, and tell me nothing I do not need."

## 2. The day and the time

**What the sources agree on**

- **Show the times from the first view, and start on the earliest opening.** The Government of Canada's digital-service booking pattern library says many calendars make a person pick a date before any times appear, which sends them back and forth when none of the times work, and advises the interface to start on the first available time. ([CDS booking design patterns](https://cds-snc.github.io/project-docs/booking/design-patterns).) An Eleken article on time pickers makes the same point for flights and hotels: pre-selecting the next open slot saves long scrolling lists. ([Eleken, time picker UX](https://www.eleken.co/blog-posts/time-picker-ux).)
- **Open days are the only days you can press; the rest are visibly off.** UXcel's pickers lesson: non-selectable dates are disabled when designing for booking. ([UXcel, pickers](https://uxcel.com/lessons/pickers-285).)
- **Clarity about which dates and times exist beats decoration.** Baymard's time-booking benchmark says testing favoured a clear visual hierarchy for dates and times, and its session notes report people struggled to understand which dates and times were available because of how they were presented. The detail is behind Baymard's paywall; only that summary was read. ([Baymard, time booking interface](https://www.baymard.com/ecommerce-design-examples/time-booking-interface); [Baymard, calendar date picker](https://baymard.com/ecommerce-design-examples/date-picker).)
- **Show the weekday and label the control.** UX Planet: the day of the week matters in appointment forms. UXPin: an explicit label such as "Choose an appointment date" helps screen readers and cognition. ([UX Planet](https://uxplanet.org/date-picker-design-best-practices-41bd522f10a5); [UXPin](https://www.uxpin.com/studio/blog/date-picker-ui-design/).)
- **Keyboard and screen reader behaviour is settled.** The W3C's ARIA Authoring Practices date picker uses a grid of day buttons, one cell in the Tab order (roving tabindex), arrow keys by day and week, Page Up and Page Down by month, Home and End to the week's ends. ([W3C APG, date picker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog.html).) The calendar already built (`DayCalendar`) follows it.
- **Calendly** shows a month grid with the open days enabled and, once a day is picked, the times beside or under it; Housecall Pro's and Jobber's online booking offer a day, then a time from the schedule. Their help pages do not describe the step order in words that could be quoted, so this is read off the products, not off a document. ([Calendly, sharing and booking](https://calendly.com/help/sharing-booking); [Housecall Pro, online booking FAQ](https://help.housecallpro.com/en/articles/8330061-online-booking-faqs); [Jobber, online booking](https://help.getjobber.com/en/articles/online-booking/).)

**What no source settled, so it is a choice**

- Whether to choose a time for the customer. Booking tools differ. The form keeps the earlier decision: the day starts chosen (the soonest open day), a time never does, so a booking always needs one deliberate press for the time.
- "Recommended" as a second mark next to "Soonest". Without a reason beside it ("We're already in Erie that day" is gone by Hannah's rule) it asks the customer to trust a label. The recommended day is the soonest open day, so there is one mark, not two. The scheduling engine's own ranking (same town first) is not shown and does not move the chosen day. See the open question in the PR.

**What this gives the form**

1. A month grid. Every day with an opening carries a quiet dot; days with none are plain and cannot be pressed. The soonest open day is chosen when the step opens, carries the orange dot and the word "Soonest" under the grid.
2. The times of the chosen day are under the grid, earliest first, none chosen.
3. No sentence about where Ryan is on which day, and no "Best fit".
4. With no day open: one sentence and Ryan's phone number, as before.

## 3. Motion

Hannah: the chosen day settles in with one short scale, open days carry a quiet dot, nothing pulses, the chosen time confirms the same way.

- MDN: `prefers-reduced-motion` reports that a person asked their device for less non-essential motion; it is Baseline and widely available; the guidance is to remove motion unless it carries information. ([MDN, prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion); [web.dev](https://web.dev/articles/prefers-reduced-motion).)
- So: hand-written CSS only, no animation library. One transition of `transform` from `scale(0.94)` to `scale(1)` over 160 ms with an ease-out curve, played once when a day or a time becomes chosen (a keyframe on the chosen element, so it does not replay on re-render). Nothing loops. Under `prefers-reduced-motion: reduce` the element simply is chosen: no transform, no transition. Color changes stay (they are not motion).

## 4. The repeat customer

Hannah: "someone with an account who has had a visit before books again."

**What sources say**

- A returning shopper is recognised by their email and proves it with a one-time code, then their saved details are reused. Chargebee's hosted checkout and Salesforce's Storefront Next both describe it: email, a code by email (or text), then billing, address and payment method come back. ([Chargebee, returning customers](https://chargebee.com/checkout-portal-docs/feature-returning-customers.html); [Salesforce, email verification](https://developer.salesforce.com/docs/commerce/sfnext/guide/sfnext-email-verification.html); [Salesforce, one-click checkout](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/one-click-checkout.html).) BigCommerce describes the same with an emailed one-time link that expires in 15 minutes. ([BigCommerce, guest customers and checkout](https://support.bigcommerce.com/articles/en_US/Knowledge/Guest-Customers-and-Checkout).) Salesforce recommends a captcha in front of passwordless sign-in, to stop bots using it to send mail.
- Housecall Pro does the quiet version: when the booking form is submitted, it matches an existing customer and attaches the booking to that record, to avoid duplicates. It does not ask the customer to sign in. ([Housecall Pro, online booking FAQ](https://help.housecallpro.com/en/articles/8330061-online-booking-faqs).) Jobber's Client Hub is the signed-in route to request work and see visits. ([Jobber, Client Hub](https://getjobber.com/features/client-hub/).)
- Baymard (public summaries only): address lookup and autofill matter, and people kept on an old saved address risk picking the wrong one, so a saved address must be easy to change. ([Baymard, automatic address lookup](https://www.baymard.com/blog/automatic-address-lookup); [Baymard, address book](https://baymard.com/ecommerce-design-examples/59-address-book).)

**Three things follow**

1. **Two jobs, kept apart.** *Matching* (so the visit lands on the right customer, no duplicate) happens on the server after the contact step, silently, as Housecall Pro does. *Saved details* (showing a name, an address and a card number's last four) need proof of identity first, because showing them to whoever types an email is a leak.
2. **A code, in the form.** The account signs in by an emailed link (`/account/sign-in`). A link opens a new tab and takes the person out of a half-finished booking; a six-digit code is typed where they are. The form asks for the email, emails a code, takes the code, and fills in. The account's own sign-in is unchanged. [Wording from Hannah: whether the account should also move to a code; the code needs the same sender as the account's mail.] The code is a prototype stand-in in Storybook.
3. **Never reveal who is a customer.** The offer is the same for every visitor ("Booked with us before?"), not a banner that appears only when the typed email matches. The earlier pass showed the offer only on a match, which tells anyone who types an email whether it is in the system. An unknown email with a code request answers the same as a known one ("We sent a code if we have that email"); a drawn prototype cannot show the difference, the PR says it.

**What we keep, what is asked again**

| Kept (filled in after the code) | Asked again |
|---|---|
| First name, last name, email, phone | The service, the zones count (the yard may have changed; the saved count is the default) |
| How we reach them (text or email) | The day and time |
| The saved card (brand and last four, never more); the card step reads "Visa ending 4242" with Change | Access and the note for the crew (they belong to this visit) |
| The address on file, offered when it is the one typed; a different address is added as a new one | The terms box |

Not kept: anything before the contact step is submitted. A visitor who leaves leaves nothing; the code request stores nothing but the code's expiry. "Not you?" empties every filled field.

**A signed-in customer** (already in their account) skips the code: the booking opens with the same fields filled. That needs the live session; in Storybook it is the "Signed in" story.
