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

Hannah: "someone with an account who has had a visit before books again." Her decision of Nov 23 2026, after the first version of this section proposed an emailed six-digit code: **no sign-in and no code. A repeat customer is recognised by their address** (the normalized street and ZIP).

**The decision and the reason: privacy of what we show.** Anyone who knows an address can type it. So an address that matches a property is recognised, the booking links to that existing customer and property (no duplicate customer is made), and **nothing personal is shown back**: no name, phone, email, card, gate code or access note. Only non-sensitive yard facts prefill (the zone count and the controller). The form never asks anyone to sign in.

**What sources say (kept, because they explain the shape).**

- Housecall Pro does the quiet version of this: when the online booking form is submitted it matches an existing customer and attaches the booking to that record, to avoid duplicates, without asking the customer to sign in. ([Housecall Pro, online booking FAQ](https://help.housecallpro.com/en/articles/8330061-online-booking-faqs).) Jobber's Client Hub is the signed-in route to see visits and request work; its public booking form does not describe recognising a returning client. ([Jobber, Client Hub](https://getjobber.com/features/client-hub/).)
- Checkout tools that do show saved details first ask for proof of identity (a one-time code or link) and then reuse billing, address and payment method. ([Chargebee](https://chargebee.com/checkout-portal-docs/feature-returning-customers.html); [Salesforce](https://developer.salesforce.com/docs/commerce/sfnext/guide/sfnext-email-verification.html); [BigCommerce](https://support.bigcommerce.com/articles/en_US/Knowledge/Guest-Customers-and-Checkout).) That is the reason this form shows nothing personal: without proof, nothing is shown. Hannah's answer takes the other branch, no proof and no personal detail.
- Baymard (public summaries only): address lookup and autofill matter, and a saved address must be easy to change. ([Baymard, automatic address lookup](https://www.baymard.com/blog/automatic-address-lookup); [Baymard, address book](https://baymard.com/ecommerce-design-examples/59-address-book).)

**What the form does**

| Moment | New address | Address on file |
|---|---|---|
| Address step | as normal | as normal. Nothing about the customer shows. |
| Service step | zones as typed | the zone count and the controller fill in (non-sensitive yard facts) |
| Contact step | asks as normal | asks as normal: no name, phone or email is filled in |
| Card step | asks for a card (a one-off may say "Not now") | **same email as on file and a card on file:** "Use the card on file", Visa ending 4242, with "Use a different card". **Any other email, or no card:** asks for a card as for a new customer |
| Review | Address row marked **New** | Address row marked **On file** |
| Booking | makes a new customer and property | links to the existing customer and property |
| Office | none | a **different email** still books, as the same property; the request or booking shows "Email differs from the one on file" |

The visit is charged after the visit, as today. The card is the one place the email matters, and it is compared, never shown: the email on file is not on any screen of the form.

**What is a stand-in.** The lookup is one fixture, 480 Briggs St, Erie 80516 (`fixtureKnown`); the live form asks the server by `addressKey` (the normalized street and ZIP), which must answer the same way, in the same time, for every visitor, and be rate limited so it cannot be used to list addresses.

**What leaks, stated.** The "On file" mark on Review tells a visitor that an address is a customer's. It is Hannah's mark and says nothing about who. A matched address with a different email books as the same property, so someone who knows an address can attach a booking to it; the office sees "Email differs from the one on file" and decides.

**Not kept, not asked.** Nothing before the contact step is stored; the lookup stores nothing. No account, sign-in, code or link anywhere in the form.
