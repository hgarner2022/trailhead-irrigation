# Design in Storybook: the customer side with day and time

Nov 19 2026. Design only, as stories over fixtures; nothing is wired and no server code changed. Open it with `npm run storybook` (port 6006) and look under **Screens/Booking**, **Screens/Account day and time**, **Screens/Checkout day and time**, **Screens/Pay**, **Blocks/DayTimePicker**, **Blocks/ServicePicker**, **Blocks/FlowShell**, **Blocks/BookedCard**, **Blocks/RescheduleSheet** (the Timed stories) and **Blocks/NeedsAttention** (WithQuoteRequest). Today in every story is Wednesday, April 14, 2027.

## The primary flow in six lines

1. Pick a service we book (the Season Pass first); the turn-on and blowout show "Opens Apr 25" and "Opens Oct 1" until their season.
2. Zones, only when the price depends on them. The repair has none.
3. Address (type-ahead, or "Can't find it? Type your address"), then whether we can reach the controller without them.
4. Pick a day (the best one is selected: "We're already in Erie that day"), then tap a start time. Continue stays off until a time is tapped.
5. Name, mobile, email and the booking terms; then the card step ($0 today, charged after the visit).
6. Done: the booked card ("Tuesday, April 20 at 10:30 am, Ryan arrives between 10:30 and 11:00 am"), what happens next, Add to calendar, "your Trailhead account".

## The request path (Hannah, Nov 18)

A service whose Online setting is "We quote" is **not in the form or on the site**; Off appears nowhere. Under the booking list sits one line, "Need a quote? Request one", which opens a short path: the service we quote (no prices), the address, "Tell Ryan about it" (a few words and photos, both optional), contact (no terms box, button "Send to Ryan"), then "Thanks, Ryan will call you by tomorrow." No day, no card. The marketing install page button goes to the same path. In the office it lands as a quote in draft with its received date; **quotes have no model yet, so that is a later research item**. Until then Home shows one row, "Quote request: Andrea Reyes, installation, received Nov 19", with Open customer (`NeedsAttention` story WithQuoteRequest, a new `quote-request` row kind, type only).

## Stories

| Group | Stories | What they show |
|---|---|---|
| Screens/Booking, the flow | ServiceLaptop, ServicePhone, ServiceDeepLinkPhone | Only services we book; deep link preselects the repair |
| | ZonesLaptop, ZonesPhone | The chips and the live price ("charged after the visit") |
| | AddressLaptop, AddressPhone, AddressOutOfAreaPhone | The existing `AddressSearch`; Boulder gets the out-of-area line and Continue off |
| | DayLaptop, DayPhone, DayTimeTappedPhone, DayMoreDaysLaptop, DaysFullPhone, DaysFullLaptop | Best day selected, times under it, "Best fit" not selected, Continue off; five days; "These days are full" |
| | ContactLaptop, ContactPhone, ContactProblemsPhone | Four fields, booking terms, "Did you mean gmail.com?", inline problems |
| | CardLaptop, CardPhone, CardRefusedPhone | What is charged and when; Stripe's form described; a declined card |
| | DoneLaptop, DonePhone | The booked card, the trail of what happens next |
| | PassDaysLaptop, PassDaysPhone, PassDonePhone | The Season Pass: a day and time for each of its two visits |
| | RequestServicePhone/Laptop, RequestAddress, RequestDetails, RequestContact, RequestDone (each at 375 and 1280) | The request path, ending "Thanks, Ryan will call you by tomorrow." |
| Screens/Account day and time | HomePhone/Laptop, HomeTextedPhone, HomeInsideCutoffPhone/Laptop, HomeInvoicePhone/Laptop, HomePastDuePhone/Laptop | Next visit with day and time; after the day-before text; Text Ryan / Call Ryan; the invoice on top |
| | TimelinePhone/Laptop | Each booked visit's time in the row |
| | VisitPhone/Laptop, VisitRescheduleOpenPhone/Laptop, VisitInsideCutoffPhone/Laptop, VisitCanceledPhone, VisitPaidPhone/Laptop, VisitPartPaidPhone | The visit page; Reschedule as the day-and-time picker; the cut-off; canceled; paid with its receipt |
| Screens/Checkout day and time | DaysAndTimesLaptop, DaysAndTimesPhone | The pass's "your days" step: the same picker once per visit |
| Screens/Pay (existing) | PastDue and PhonePastDue now read "Past due since Dec 1" | The pay page and the receipt page already have their states |
| Blocks | DayTimePicker, ServicePicker, FlowShell, BookingSummary, BookedCard, RescheduleSheet Timed*, NeedsAttention WithQuoteRequest | Each with Default, Empty, Phone and a unit test |

## Layout decisions

- One new block for the one new question: `DayTimePicker`. Booking, the Season Pass days (once per visit) and Reschedule all use it, so a customer is asked the same way everywhere. Native radios, so arrow keys and Space work with no code.
- The frame the checkout built became a block, `FlowShell`; the flow's step logic is plain functions in `booking-model.ts`. `CheckoutFlow` itself was left alone; it moves onto `FlowShell` when the flow is built.
- Address and contact reuse the checkout's own steps; the only edits are an optional `terms` prop (Season Pass, booking, or none for a request) and an optional `summary` under the zone chips.
- Phone: the day cards stack, the time chips are three across, every target is 44px, Continue sticks to the bottom with its hint above it. Laptop: three cards across at `max-w-3xl`, chips six across.
- The portal keeps its layout. The next-visit card gains the time and the arrival half hour; the timeline row gains the time; Reschedule opens the same picker (three days, "Show more days" to five).

## The words

| Where | Words |
|---|---|
| Day step | Pick your day and time. Ryan is in Erie on Tuesdays and Thursdays. He texts you the day before. |
| Times | Start times on Tuesday, April 20. Start times for a 2 hour visit. Best fit. |
| Continue off | Tap a start time to continue. |
| Full | These days are full. We'll call you to find one. |
| None fit | None of these work? Tell us when. When would suit you? |
| Next visit | Wednesday, April 28 at 10:30 am. Ryan arrives between 10:30 and 11:00 am. We'll text you the day before. |
| Inside 24 hours | Text Ryan, Call Ryan, and "Ryan plans his route the day before, so changes this close go through him." |
| Invoice | Repair: $115 unpaid, due Dec 1 (Pay now). Past due: Repair: $115 unpaid, past due since Apr 1. |
| Request | Need a quote? Request one. Tell Ryan about it. Send to Ryan. Thanks, Ryan will call you by tomorrow. |

The window wording changes with slots (audit rows 11 and 12): a booked visit says its time at once, the day-before text confirms it, and "We'll text your window the day before" goes away for a visit with a booked time. A visit with no booked time (a pass visit Ryan placed) keeps the old sentence.

## Questions for Hannah's review

1. **The arrival half hour.** I show "Ryan arrives between 10:30 and 11:00 am" (the engine's day-before window) as soon as it is booked, so a customer is never told a bare time as a promise. Do you want that, or only the exact time ("at 10:30 am")?
2. **Reschedule offers three days with "Show more days" to five**, the same as booking, so the sheet is short on a phone. The portal design said five at once. Which?
3. **The booked card is a card of its own on navy, not a second face of the holographic `PassCard`.** A visit face for `PassCard` is more work and risks the card you love. Keep it plain, or build the face?

Not decided here: the quote object (a draft with a received date) is a later research item; the card-optional rule for a one-off is still question 1 of the booking design.
