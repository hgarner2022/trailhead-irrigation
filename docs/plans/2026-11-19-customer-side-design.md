# Design in Storybook: the customer side with day and time

Nov 19 2026. Design only, as stories over fixtures; nothing is wired and no server code changed. Open it with `npm run storybook` (port 6006) and look under **Screens/Booking**, **Screens/Account day and time**, **Screens/Checkout day and time**, **Screens/Pay**, **Blocks/DayCalendar** (Nov 23: the calendar replaced the day cards), **Blocks/ServicePicker**, **Blocks/FlowShell**, **Blocks/BookedCard**, **Blocks/RescheduleSheet** (the Timed stories) and **Blocks/NeedsAttention** (WithQuoteRequest). Today in every story is Wednesday, April 14, 2027.

## The primary flow in six lines

1. Pick a service we book (the Season Pass first); the turn-on and blowout show "Opens Apr 25" and "Opens Oct 1" until their season.
2. Zones, only when the price depends on them. The repair has none.
3. Address (type-ahead, or "Can't find it? Type your address"), then whether we can reach the controller without them.
4. Pick a day (the soonest open day is selected and marked), then tap a start time. Continue stays off until a time is tapped.
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
| | DayLaptop, DayPhone, DayTimeTappedPhone, DayMoreDaysLaptop, DaysFullPhone, DaysFullLaptop | Soonest day selected, times under it and none selected, Continue off; "These days are full" |
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
| Blocks | DayCalendar, ServicePicker, FlowShell, BookingSummary, BookedCard, RescheduleSheet Timed*, NeedsAttention WithQuoteRequest | Each with Default, Empty, Phone and a unit test |

## Layout decisions

- One block for the one question: `DayCalendar` (first drawn as day cards, a calendar since Nov 23). Booking, the Season Pass days (once per visit) and Reschedule all use it, so a customer is asked the same way everywhere. A real grid, so arrow keys and Enter work.
- The frame the checkout built became a block, `FlowShell`; the flow's step logic is plain functions in `booking-model.ts`. `CheckoutFlow` itself was left alone; it moves onto `FlowShell` when the flow is built.
- Address and contact reuse the checkout's own steps; the only edits are an optional `terms` prop (Season Pass, booking, or none for a request) and an optional `summary` under the zone chips.
- Phone: the day cards stack, the time chips are three across, every target is 44px, Continue sticks to the bottom with its hint above it. Laptop: three cards across at `max-w-3xl`, chips six across.
- The portal keeps its layout. The next-visit card gains the time and the arrival half hour; the timeline row gains the time; Reschedule opens the same calendar.

## The words

| Where | Words |
|---|---|
| Day step | Pick your day and time. Ryan is in Erie on Tuesdays and Thursdays. He texts you the day before. |
| Times | The chosen day's name over its start times. |
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
2. **Reschedule offers the calendar**, the same as booking (settled Nov 23); the sheet scrolls inside, with its title and button in view.
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

*Superseded Nov 22 2026: the customer's report lists only the checked items and the shared photos; an unchecked item is never shown, not even as "Not done". See "What we did, the visit report" under "Account structure (Nov 22 2026)" below. The paragraph is kept as it was written.*

Hannah: "I thought the receipt was supposed to have the checklist of things that they did, including the photos and stuff." The invoice already carried a report (the Include the visit report box, checked by default); the receipt did not. One block, `VisitReport`, and one email part, `visitReport`, now carry it on: the receipt page (under Amount paid), the receipt email (live and proposed layout, with a plain-text twin), the invoice email and the pay page (open and paid). It is the visit's checklist, a check mark on each done item and an open circle with "Not done" on an open one (the service's checklist template: turn-on, blowout, repair, inspection, the same words as the job page, held equal by a test), and the photos Ryan shared (`shown_to_customer` on, the visit done) as a small grid. **Only the heading and the checklist items are words**: no caption (photos have none in the data), no crew note, no sentence of ours; the old report had both and they were removed. Unchecked on the invoice, the section is absent everywhere, including on the receipt of that invoice; with nothing to list, nothing is drawn.

Build notes: `ReceiptOut.report` and `ReceiptData.report` are optional and nothing fills them yet (nothing is wired); the sender builds them from the visit's checklist rows and its shared photos, and a photo in an email needs a signed address (see the messages inventory, open question 13).


## Account structure (Nov 22 2026)

Hannah, on her second phone review: "Season pass is confusing with visits. Should season pass be under visits? I don't know. I guess I'm confused how we're doing this a little bit. Go ask a marketer how they would market it. I would like them to opt in anytime we need their preferences. We schedule them before that timeframe, like blowouts two weeks ahead of time or turn-ons. They get reminders. I just want this to all be crystal clear. It's not quite crystal clear. I do love the cards. I love the character and the brand. I think it's excellent, so it makes me want to weave that in. Maybe it's fine to have them separated and everything, but run a UX, run a marketer agent, see what they say. Review everything for clarity. Go back through the account with this fine tooth to make sure the information hierarchy and things are visible, and language is clear. 'Reply STOP to opt out': do we need to include that in every message? Their details should also have what they prefer for spring turn-ons: our recommended, mid season, late season. We should never send anything that's not checked. That's weird."

What was wrong, read from the code: the pass's visits were drawn in at least five places (the pass card, a season line and the Recent visits list on Home, the Visits tab, and on the Season Pass page a season line and plan rows again), so a customer could not tell which place was the plan and which was the list.

### Research (a research pass, Nov 22 2026; F = page fetched, U = UNVERIFIED: a search summary, memory, or the page would not load)

| Source | What it says | Used for |
|---|---|---|
| F, [Peloton, membership](https://www.onepeloton.com/app/membership) | A non-member sees the plans and a free trial; a member manages the plan on a separate "My Memberships" page with Upgrade and Manage buttons | The plan has its own place, with its own name, apart from the things you use |
| F, [Costco Canada, auto-renew](https://www.costco.ca/f/-/auto-renew) | The membership is managed from the "My Account" menu (Renew Membership), where the card and auto-renew live. Canada page only; the US page returned 404 (U) | The plan is its own place inside the account, with the card |
| F, [Housecall Pro, selling a service plan](https://help.housecallpro.com/en/articles/2921514-how-to-sell-a-service-plan) | The customer opens "View My Agreement" to see the visits, duration and cost; a recurring plan prompts a portal account to review terms, the billing schedule and the card; the plan is tracked apart from jobs and gets its own receipts | The closest field-service case: the plan is an agreement, separate from the visits it produces |
| F, [Housecall Pro, customer portal](https://www.housecallpro.com/features/customer-portal/) and Jobber, [what clients see in Client Hub](https://help.getjobber.com/en/articles/what-do-your-clients-see-in-client-hub/) | Housecall Pro's portal areas are Bookings, Referrals, Estimates, Payments; Jobber's are Requests, Quotes, Appointments, Invoices. Neither lists a plan | Neither competitor gives a plan a place in the portal. We have the chance to, and must not bury it under appointments |
| F, [ServiceTitan, membership types](https://help.servicetitan.com/residential-s-r/docs/create-membership-types) | A membership has an internal Name and an optional Display Name shown to the customer in the portal | The customer's name for it ("Season Pass") is deliberate; the office's word (a pass job) never reaches the screen |
| F, NN/g, [Designing empty states](https://www.nngroup.com/articles/empty-state-interface-design/) | An empty place should say what the thing does, how it gets filled and where to start, with one direct button. It does not discuss selling to someone who is not eligible | The tab of someone with no pass |
| F, NN/g, [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Put what is needed often up front, keep the rare behind one labeled control; what is on the main view signals priority | Home holds what is next; the plan's settings are one tab away |
| F, Shopify, [membership programs](https://www.shopify.com/blog/membership-program) | Name it as belonging, not a transaction; lead with a few perks members will use; make it easy to find | The heading is Hannah's "Become a Season Pass holder"; the lines lead with what the customer gets |
| F (third-party summaries), [Commoncog on April Dunford](https://commoncog.com/obviously-awesome/), [Lenny's Newsletter](https://www.lennysnewsletter.com/p/summary-april-dunford-on-product) | Lead with the value for a specific audience; choose the category name last because it sets expectations; vague grand claims backfire | Lead with "scheduled for you every season" and repair priority; "billed after each visit" is reassurance, not the headline |
| U | Amazon Prime help (503), Chewy Autoship (429; a search summary says a "Manage Autoship" page holds skip, change and cancel), Costco US (404), TruGreen (404; a summary says a "My Account" shows the next service date), a Jobber community post that conflicts with Jobber's own help, Recurly and Chargebee guides, any NN/g page on selling to ineligible users, April Dunford's own pages (404), and what a non-member sees inside a signed-in Costco, Prime or Chewy account | Nothing is claimed from these |

**Where the evidence is thin.** No fetched page shows a non-member's view inside a signed-in account, and none covers lawn-plan account layouts or upsell placement. The verdicts on the no-pass tab and on where the brand goes are judgment from the NN/g empty-state and progressive-disclosure pages, not a sourced rule; test the tab with a few customers.

### The one structure

The Season Pass is **the customer's plan and has its own tab**; Visits is **the list of every visit, the pass's included**; the two never draw the same rows. Four tabs, each named by what the customer came to do or see, in the header and nowhere else:

| Tab | The customer's question | What it holds, once | What it never holds |
|---|---|---|---|
| **Home** | What is next? | The invoice to pay; the quiet timing banner while we ask; the next visit with its exact time and Reschedule; the Season Pass card | A list of visits, a season timeline, anything sold |
| **Visits** | What is coming and what has been done? | Every visit, Coming up then Past, each with its day, the pill, the money word and its Receipt; a pass visit wears the label "Season Pass 2027" | The plan, preferences, a card button |
| **Season Pass** | What is my plan? | The pass card at full size; Your season (one plan line per visit the pass holds: its state, or its timing with Change); how it is paid; add the July inspection, skip a visit, cancel; next season; earlier seasons | A money word, a receipt, an Update card button (Details has it), "Change your day" (the visit's own Reschedule) |
| **Details** | What do you have on me? | You; **Preferences**; each service address with the yard; the card on file | Anything about visits or the plan |

Where each fact lives once: a visit's day and money are Visits' (Home repeats only the next one); the plan's timing is the Season Pass tab's, with the same choice in Details › Preferences and in the quiet banner; the card is Details'; the receipt is on its visit.

**A customer with no pass** sees the same four tabs, so the header never changes shape. The Season Pass tab for them is one quiet page, "Become a Season Pass holder": the two visits and that we schedule them every season, repair visits first, the price per zone, one button, "Get a Season Pass", and the card artwork beside it. Home and Visits sell nothing, ever. (If Hannah would rather the tab is hidden for them and one line sits at the foot of Home instead, that is a small change; question 1.)

**Brand, woven and not scattered.** The pass card is the one showcase: the card at full size at the top of the Season Pass tab, with its moving sheen (Hannah chose the flat artwork with the sheen over the baked-in holographic art, Nov 12; the holographic art stays for the email and the saved image); the same card, smaller, beside the next visit on Home, so a holder sees it where they land; the bare artwork on the no-pass page as the picture of what they would hold. The headings stay in the display face. Nothing else on an account screen gets a flourish, so the card keeps its power. I found no separate "sunrise character" asset in the repo: the card artwork carries the badge's sun, and the ridge-and-sun band is Hannah's rule for the marketing closing strip only (question 2).

**What we market, in the words we have.** Lead: "Become a Season Pass holder" (Hannah's words), then "We schedule your visits every season, so you never have to remember." (Hannah, Nov 21), then "Repair visits go to Season Pass customers first." (the site's existing copy), then "From $240 for 6 zones, $20 more for each extra zone." (`src/lib/season-pass.ts`). The old line "Pick your days once for the whole season" is gone: it described the checkout, not the plan.

### Preferences

Hannah: "Their details should also have what they prefer for spring turn-ons: our recommended, mid season, late season", "I would like them to opt in anytime we need their preferences".

**What I chose, and why.** The data model has three values, `earlier`, `recommended` and `later` (`TimingPreference`), and the date words already call the middle one "Mid" (Early, Mid, Late with the month). There is no fourth value, so "mid season" and "our recommended" are the same choice. The customer sees **Early season**, **Our recommended** (the default, with "Mid May" or "Mid October" under it) and **Late season**, each with its month. One value per visit kind (spring turn-on, fall blowout), kept for every season, as decided Nov 21. (The booking form, which another designer owns, still says Early, Mid and Late; it is the same three values.)

**The flow, as a prototype.**
1. **Details › Preferences** holds the standing choice for each kind, for a customer who holds a pass.
2. **Whenever we need it** (before a visit's window), the customer is asked, three ways that write the same value: the new **Preference request** message (a text or an email by their contact preference; its link opens that visit's page), a quiet banner on **Home** and on the **Season Pass** tab ("When would you like your fall blowout?" with one outline button, "Choose when"), and the same banner on that visit's page. The button opens a dialog with the three choices and Save.
3. **We schedule the visit about two weeks before and tell them the day.** That is Hannah's existing sentence ("We'll schedule it about two weeks before and tell you the day.") and the only promise on any of these screens or in the message.
4. **They get reminders:** the messages that already exist, the two-weeks-out and day-before texts. The Preference request promises none of them.

The words are in `src/lib/portal/preference-words.ts`; the blocks are `PreferencePicker` and `PreferenceAsk` (with `TimingDialog`); the message is in `src/emails/design/preference-request.ts` and the Messages section ("Preference request", a prototype in both channels). Nothing is wired: the page has no action behind Details' Save yet, and nothing decides when the request goes out (question 3).

### The first pass over every screen: what was removed

| Screen | Removed | Why |
|---|---|---|
| Home | The Recent visits list (3 rows) | They are the Visits tab's rows |
| Home | The season line under the pass card | The card's own band says what each visit is |
| Home | The sell card for a customer with no pass | Sold once, on its own tab |
| Season Pass | The big headline when the pass is simply on its way ("Next up: ...", "Your 2027 season is reserved.") | The card and the plan lines say it; a headline stays only for a card that failed, a day to pick, next season, a canceled pass |
| Season Pass | The season line and its caption | The plan lines say it |
| Season Pass | "We'll schedule it about two weeks before and tell you the day." on every line | Said once under the list |
| Season Pass | The "Card on file" card with its Update card button | Details has the card; one line says how it is paid, and a pass with no card keeps an Add a card button |
| Season Pass | The "Need to change something?" card and its paragraph ("Change a day from the link on a visit above. Skip a visit or add the July inspection here. To change your address, reply to any of our emails or call Ryan. You can end the pass here too.") | The buttons say it; the day is changed on the visit |
| Season Pass | The "Change your day" and "Call or text Ryan" block for a booked visit | A day is changed on the visit (Reschedule), once |
| Season Pass | The cream page behind the content | Account content sits on the stone page, white cards (the polish rules) |
| Visits | "No past visits yet." under an empty Past heading | An empty section is not drawn |
| A receipt | The "For" row when the lines already name the service | Said twice |
| Receipt, invoice, pay page | Every "Not done" row | See the report section below |
| Sign in (link sent) | "It comes from Trailhead." | The sender is in the inbox already |
| No-pass page | "Pick your days once for the whole season." and the eyebrow "Season Pass" | Old checkout wording; the heading is Hannah's |

Kept on purpose: the visit page's one summary band and its single Cancel visit, Reschedule and Add to calendar (one primary per screen), Details' "text us" lines for the email and the address (a fact and an instruction each).

### "Reply STOP to opt out." (Hannah: "do we need to include that in every message?")

No. The rule is `isFirstText` (`src/lib/messaging/saved.ts`): the line ends the first text a phone number ever gets and no later one, and the live queue already does exactly that. The samples did not: the customer walkthrough's phone thread, the account flow's texts and the receipt text ended every text with it. Now only the first text in a thread has it (`allMessages`, `bookingMessages`, `src/app/_flows/flow-texts.ts`, the receipt text, an admin fixture), an email twin never has it, the Messages stories already show the first text with it and every other without (`firstText` in the catalog), and `src/app/_flows/texts.test.ts` pins it.

### What we did, the visit report (Hannah: "We should never send anything that's not checked")

This supersedes the "Not done" description in the section above. The customer's "What we did" (the receipt page and email, the invoice email, the pay page) lists **only the items that were checked, and the photos shared**. An unchecked item is not drawn anywhere, not even as "Not done". If nothing was checked the section shows only the photos; if there is no photo either, there is no heading. One function, `checkedItems` in `src/emails/visit-report.ts`, is the only reader of the checklist for a customer, so no renderer can show an open item. The crew's checklist on the job page keeps showing unchecked items for Ryan.

### Questions for Hannah

1. **The Season Pass tab for someone with no pass.** I kept the tab (the header never changes) with one quiet "Become a Season Pass holder" page. The alternative is no tab for them and one line at the foot of Home. The research cannot choose between them. Which?
2. **The "sunrise character".** I found no separate asset; I used the card artwork (it carries the badge's sun) and the display face. If you mean a separate character, where does it live, and where should it appear?
3. **When is a customer asked?** The prototype shows the banner and the message but nothing decides the moment. "Before the window" is yours: how many weeks before the turn-on window (opens Apr 26) and the blowout window (opens Oct 1)? And should a customer who already chose once, and sits on Our recommended, be asked again every season, or only the first time? (Their choice is kept either way.)
4. **Mid season.** The data has no fourth value, so "Our recommended" is the middle of the window and there is no separate "Mid season". Is that what you meant by "our recommended, mid season, late season"?
5. **Preferences for a customer with no pass.** Details shows Preferences only to someone who holds a pass, because a one-off visit gets an exact day when it is booked. Right?
