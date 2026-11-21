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

## Navigation, second pass (Nov 21 2026)

Hannah, on a visit page: "On their account, double navigation is not necessary. If it says Visits, there's a visit link. Go look at best practices for navigation. This is way too much going on." Her screenshot shows the four tabs (Home, Visits, Season Pass, Details) with Visits lit and, under them, a second "Visits" link above the visit's title.

### Research (fetched Nov 21 2026; what could not be fetched is marked UNVERIFIED)

| Source | What it says | Used for |
|---|---|---|
| NN/g, [Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/) | Breadcrumbs show the site hierarchy, not the session history, and supplement the global navigation, never replace it. Skip them on flat sites one or two levels deep. On a phone avoid a wrapping trail; if anything show only the parent link, with a large touch target | The account is two levels (a tab, then a record). A trail adds nothing the lit tab does not already say |
| NN/g, [Duplicate links](https://www.nngroup.com/articles/duplicate-links/) | Extra links to the same place add choices, compete for attention and make people wonder whether two links differ. Duplicates help only when far apart on a long page, or to explain a complex choice | The "Visits" link under the Visits tab, "See all visits" under Visits, "See your pass" under Season Pass, a second "Sign out" |
| NN/g, [Navigation: You Are Here](https://www.nngroup.com/articles/navigation-you-are-here/) | Navigation should show where you are, not only where you can go. The listed mechanisms include a highlighted current item, headings and page titles; subtle cues often go unseen | The lit tab is the location cue, so a detail page must keep its parent tab lit |
| GOV.UK Design System, [Back link](https://design-system.service.gov.uk/components/back-link/) | A back link goes to the previous page in the state it was last seen, sits at the top before the main content, and is never used together with breadcrumbs. "Back" suits a simple journey; a complex one says "Go back to [page]". It exists because some sites break the browser's own back button | One back link at most, and only where there is no tab bar |
| Apple HIG, navigation bars and tab bars | UNVERIFIED: the page returned only its title. From memory: a tab bar holds a few peer sections and stays visible; a navigation hierarchy lives inside a tab; the back button shows the previous screen's title | Detail pages keep the tab bar (the header) and add no second bar of links |
| Material 3, navigation bar | UNVERIFIED: the page returned only its title. Not cited for any rule | none |
| Stripe, [customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal) | The integration page describes sessions and a `return_url` only; it says nothing about the portal's own navigation, back links or breadcrumbs. Not usable as evidence | none |

### The rules we adopted

1. **The lit tab is the only "you are here" and the only way to its own place.** No link, button or crumb on an account page repeats a tab's word and goes to that tab. Home, Visits, Season Pass and Details are reached by the header and nowhere else.
2. **A detail page keeps its parent tab lit.** A visit and a receipt belong to Visits; the header stays exactly as it is on the list. A receipt used to light no tab.
3. **No breadcrumb and no "back to the list" link on a page that has the tab bar.** The browser's back button and the lit tab do that job (the account's pages are plain addresses, so back always works). "Back to your visits" would be a duplicate.
4. **A back link exists only where the tab bar does not.** That is a page opened from a text's link with no sign-in (the one-visit page): there the single link is "See your account", it says where the way on leads, and it is not repeated anywhere on the page.
5. **One line of context under the title, never a trail.** A visit: the pill beside the title and the Season Pass label under it; a receipt: "Paid Nov 3" under "Receipt". The day, the place and the money live in the summary band, not in a second line.
6. **The four tab pages show the lit tab as their title.** Each keeps an h1 for a screen reader (screen-reader only), exactly as Home already did, so a page does not say "Visits" as a tab, as a title and as a link. Section headings stay visible.
7. **An account action lives where it belongs, once.** Sign out is in the account menu and only there (Details no longer repeats it); Reserve next season, Update card and Cancel pass stay beside the thing they act on.
8. **Every control stays 44px** (`min-h-11`), and a page has at most one filled button, apart from a form's own Save (Details has two forms, so two Saves).

### What changed on screen

| Screen | Removed | Rule |
|---|---|---|
| A visit | the "Visits" link above the title | 1, 3 |
| A receipt | nothing to remove; it lights Visits now | 2 |
| Home | "See all visits" under Recent visits and "See your pass" under the pass | 1 |
| Visits, Season Pass, Details | the visible h1 that repeated the lit tab | 6 |
| Details | the second "Sign out" button | 7 |
| The one-visit page opened from a text | nothing; its "See your account" stays as the only link out | 4 |

Not changed, on purpose: the Home card's visit title links to its visit (a place no tab names), and each Visits row opens its visit. Also fixed while looking: a visit with nothing to list (an invoice out, no price line, no receipt) drew an empty white card under the band, and a band of three cells drew a grey empty fourth cell (`SummaryBand` now fits its cells).

## How an invoice is paid (Nov 21 2026)

Hannah: "On the invoice, how do they collect payment? Did you not show the Stripe setup here? How does that work?" The walkthrough used to jump from the pay page's button straight to "paid". The path is now drawn end to end, with `PayFlow` (stories under **Screens/Pay, how an invoice is paid**, each at 375 and 1280; customer walkthrough step 5):

1. **The way in.** Home's Pay now, the invoice email's Pay button or the text's link all open `/pay/<invoice>?token=`.
2. **The pay page.** The sentence under "Your invoice" names the service and the street ("Hi Andrea, here is invoice INV-2027-0001 for your repair at 412 Briggs Street."), then the lines, What we did (when the invoice includes the report), the total, the due day and one button, "Pay $115 by card".
3. **Stripe's card page, drawn** (`StripeCardPage`). In the live app the button redirects to a Stripe Checkout Session in payment mode for the invoice's total; this is that page: what is being paid and for what, email, card number, expiry and CVC as drawn boxes (never a real field), Stripe's unticked **Save my payment method for future use** box (the live session shows it with `payment_method_save` offered; Stripe's invoice docs say the method is kept only if the customer ticks it), the Pay button and "Powered by Stripe". A strip says it is a placeholder. The sentence about how a saved card may be used is still Hannah's to write, so it is the same marked placeholder the quote page uses.
4. **Processing.** After Pay, Stripe's own state: the button reads Processing and the page cannot be pressed. Back from the card page is the invoice as it was; nothing is charged until Pay.
5. **Paid.** Our `/pay/<invoice>/paid` page: "Thank you, your payment went through", View the receipt, Open your Trailhead account. The receipt is the page with What we did (next section).
6. **A card on file.** The pay page's one filled button is "Pay $115 with Visa ending 4242" and an outline "Use a different card" opens the card page; one tap goes straight to Processing, then Paid. The walkthrough has two chips ("No card on file", "Visa ending 4242") to walk both. The live pay page does not offer this yet: it needs `payView` to say which card and an off-session charge action (`savedCard` and `payWithSavedAction` are optional, so the live page is unchanged).

## What we did, on the receipt, the invoice and the pay page (Nov 21 2026)

Hannah: "I thought the receipt was supposed to have the checklist of things that they did, including the photos and stuff." The invoice already carried a report (the Include the visit report box, checked by default); the receipt did not. One block, `VisitReport`, and one email part, `visitReport`, now carry it on: the receipt page (under Amount paid), the receipt email (live and proposed layout, with a plain-text twin), the invoice email and the pay page (open and paid). It is the visit's checklist, a check mark on each done item and an open circle with "Not done" on an open one (the service's checklist template: turn-on, blowout, repair, inspection, the same words as the job page, held equal by a test), and the photos Ryan shared (`shown_to_customer` on, the visit done) as a small grid. **Only the heading and the checklist items are words**: no caption (photos have none in the data), no crew note, no sentence of ours; the old report had both and they were removed. Unchecked on the invoice, the section is absent everywhere, including on the receipt of that invoice; with nothing to list, nothing is drawn.

Build notes: `ReceiptOut.report` and `ReceiptData.report` are optional and nothing fills them yet (nothing is wired); the sender builds them from the visit's checklist rows and its shared photos, and a photo in an email needs a signed address (see the messages inventory, open question 13).
