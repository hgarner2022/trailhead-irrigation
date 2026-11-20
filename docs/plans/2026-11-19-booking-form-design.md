# Design in Storybook: the customer booking form

Nov 19 2026. Design only, as stories over fixtures; nothing is wired. Hannah, twice: "I want the booking form designed in here too." Open `npm run storybook` and look under **Customer / Booking form** (every step at 375 and 1280), **Blocks / ZoneChips, AccessChoice, PhotoPicker, BookingReview, ContactPreference**, and step 1 of **Design / Start here: the customer, clickable**, which now runs this same form. It builds on `2026-11-18-online-booking-design.md` (the flow and its rules), `docs/research/jobber-booking-2026-11-18/` (Hannah's live Jobber form, the content reference) and `2026-11-19-customer-side-design.md` (the day-and-time picker, the holographic card).

## The job to be done

"I need a sprinkler visit. I want to say what and where, see a day and an exact time that works, and know what it costs and when I'll be charged, in a few minutes on my phone."

## What the Jobber form teaches, and what we change

Jobber's order is zip code, services with their lengths, contact, address, service details, then a calendar with exact slots (the screenshots). We keep Jobber's services screen but not its zip code: **Hannah, Nov 20 2026: no zip step, the address qualifies the yard.** ("It's lame that they enter their zip code and then their address. Can you just qualify their location by their yard?") The first screen is the address, with the Season Pass checkout's type-ahead and its typed fallback; the town and zip come from the address chosen, and the area is decided by `serviceability` in `src/lib/places` (the six towns by name, then zip). The services come after it, then the details and the day before the contact, which Hannah decided on Nov 20 so that an abandoned booking leaves nothing. We change four things: the address answers at once (an address outside the six towns gets the six towns, the phone number and the way out under the box, and Continue stays off); the contact preference (text, email or both) is asked once with the contact fields; photos and a note are optional, not buried; and the last screen before booking says exactly what happens.

## The steps

Nov 20 2026, Hannah: **day first, contact after, so an abandoned booking leaves nothing.** Nothing is kept until the contact step is submitted; the open-day search needs only the address and the zones, which come before the day.

A service with a day has six counted steps, then the booked screen (it had seven with the zip step). "Step 3 of 6" sits over every question; the primary button is fixed at the bottom on a phone; every step but the first has Back, and every step has Close (see "Navigation and close").

| # | Step | What it asks | Continue is off until |
|---|---|---|---|
| 1 | Address | The type-ahead, "Can't find it? Type your address" (street, town, optional zip). The six towns are listed under the box. An address outside them shows the out-of-area line and Ryan's number under the box at once. A typed address, or a pick, with no town we can read asks for the town | never off, except an address outside the six towns (the out-of-area line); a press with no address, or no town, names what is missing as help |
| 2 | Services | Shown only after the area is qualified, with the address and its town in the line above ("480 Briggs St, Erie"). One radio card per service we book online with its price and length; a closed service shows "Opens Apr 25"; "Need a quote? Request one" under the list | a service is picked |
| 3 | Service details | Zones with the price under them ("About $145, charged after the visit."), whether we can reach the controller and shut-off, a note for the crew, photos (a real file input; "Add 2 sample photos" is the prototype's shortcut) | never off: access unanswered is named as help |
| 4 | Day and time | Three day cards, the best selected, "Show more days" to five, then only that day's exact start times; "None of these work? Tell us when" | a start time is tapped, or no day is open, or the customer said when |
| 5 | Contact | First and last name, email, phone; how we reach you (Text, Email, Text and email); the terms line; the separate, unticked "Send me tips and offers from Trailhead by email" | never off: a press names each missing field as help |
| 6 | Confirm | Every answer with its Change link and one sentence of what happens | |
| | Booked | The holographic card with the exact time, "You added 2 photos", what happens next, Add to calendar, "your Trailhead account" | |

When no day is open, or the customer says when instead, the day step passes and the contact step asks how we reach them; Confirm then reads "We'll use (970) 555-0123 to get back to you about a day." and the button is "Send to Ryan".

A request for a quote is the address, services (what we quote, with no prices), "Tell Ryan about it" (words and photos) and contact ("How can Ryan reach you?", no terms line, the button "Send to Ryan"), then "Thanks. We've got your request." Four counted steps (it had five): no day, no confirm, no card. It lists only what is not booked online: Christmas lights and Larger sprinkler repair. The Season Pass keeps its place first in the list and asks a day and time for each of its two visits.

## The Season Pass path (Nov 20 2026)

Hannah's decisions, final: the pass can be bought whenever; a buyer gets only the visits still ahead this season; it auto-renews each season until the customer cancels, and they pay only per visit done, after the visit. Research and the five causes of the old bug are in `docs/plans/2026-11-20-season-pass-booking-research.md`. Stories: **Customer / Booking form, Season Pass** (January, April, July, November at 375 and 1280) and **Screens / Account, Season Pass purchase**.

**One model.** `src/lib/booking/pass-visits.ts` is pure: given today it returns the visits still ahead, each with a mode and its window, and next season for a buyer after the last window. A visit **opens within two weeks or is open now: `exact`** (an exact day and time from the open slots, as the rest of the form does). A visit **months away: `preference`** (Early, Mid or Late in its window, no day). The windows live in one place, `PASS_WINDOWS`: the spring turn-on opens Apr 25 and closes May 31, the fall blowout opens Oct 1 and closes Oct 31 (the booking fixture's opening days, the seed's closing days). A buyer in November or December has no visit this season, so the pass starts next season with both visits as preferences. `pass-entry.ts` builds the list the form shows for the date (the pass card, and the single turn-on and blowout cards opening by the same windows). The test table is `pass-visits.test.ts`, every month and the edge days.

| Buys in | Visits on the pass | How each gets its day |
|---|---|---|
| Jan 1 to Apr 10 | Turn-on, blowout (this season) | Both preferences |
| Apr 11 to May 31 | Turn-on, blowout | Turn-on exact (open now or within two weeks); blowout a preference |
| Jun 1 to Sep 16 | Blowout | Preference |
| Sep 17 to Oct 31 | Blowout | Exact |
| Nov 1 to Dec 31 | Next season's turn-on and blowout | Both preferences |

**The steps for a pass** are address, services, details, then a Day and time step only when a visit is exact (headed "Your spring turn-on" or "Your fall blowout", the visit's own length: 60 minutes for the turn-on, 30 for the blowout, days from tomorrow or the day its window opens), then **"When would you like it?"** only when a visit is a preference (Early, Mid or Late with the window's real dates, "Oct 1 to Oct 10", Mid pressed, and "We'll schedule it about two weeks before and tell you the day."), contact, **the agreement**, confirm, booked. The services step shows the pass with only the visits ahead, each with its length, its price and "Opens Apr 25", and "From $" the sum for those visits only.

**The agreement step** holds one marked placeholder, "[Wording from Hannah]", never terms, and the renewal as stated facts: Renews (auto-renews each season until you cancel), Reminder (before each renewal), Cancel (in your Trailhead account), You pay (for each visit done, after the visit). The Season Pass terms box stays on the contact step.

**What the customer reads afterwards.** The confirm step has one row per visit: the exact day and time, or "Preference: Early October. We'll schedule it about two weeks before and tell you the day." The booked holographic card lists every visit the same way (`BookedCard` `visits`). The account's Home and Season Pass page show the next visit exact and each other visit with its preference and a Change control (`PassVisitRows`). The admin job page shows a visit that has only a preference as "Preference: Early October · No day yet" with Schedule on the row, and Next visit reads the preference when no visit has a day (`preferenceTripOf`).

**The only sentences that are not from the catalogue or the fixtures** are the two Hannah allowed: "We'll schedule it about two weeks before and tell you the day." and the preference words (`preferenceLabel`). Everything else in the pass path is a label of a decision above.

## The words

| Where | Words |
|---|---|
| Address outside the six towns | We don't serve Boulder yet. We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield. Not sure? Call Ryan at (970) 692-7270. (the number is a link) |
| Address with no town | Pick your town so we know which route you are on. (beside the Town field and in the summary) |
| Typed address too short | We need your street address, with the house number. |
| Address not picked | Pick your address from the list so we have it right. |
| Missing phone | Add a phone number so we can text you the day. |
| Missing terms | Tick the box to accept the terms. |
| Missing access | Tell us whether we can get to the system without you. |
| Price | About $145, charged after the visit. |
| No open day | These days are full. We'll call you to find one. (the box "When would suit you?" and "Or call Ryan at (970) 692-7270") |
| Confirm, text | We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done. |
| Confirm, both | We'll text a confirmation to (970) 555-0123 and email one to andrea@example.com, then email a receipt when it's done. |
| Booked photos | You added 2 photos. |
| Price, no catalogue price | Price set at the visit. (nothing more: no "free", no "Ryan quotes") |
| Request sent | Thanks. We've got your request. We'll use (970) 555-0123 to get back to you about your quote. Questions? Call Ryan at (970) 692-7270. |
| Leave | Leave without booking? Your answers aren't saved. (Keep booking, Leave) |

The time rule holds everywhere: an exact start time, never a window. A customer never reads job, line or stage.

## One catalogue, two lists

`src/lib/booking/services.ts` is one catalogue; every service carries `online`: `bookable`, `quote` or `off`, the same three as Settings > Services' Online select. The booking list is the bookable ones, the request path lists the quote ones, and what is off appears nowhere. Hannah, Nov 20: "Rachio and smart efficiency and installation are a bookable service."

| Service | Online | Minutes | Price shown |
|---|---|---|---|
| Season Pass, Spring turn-on, Fall blowout | bookable | 60, 60, 30 | From $240, From $145, From $95 |
| Sprinkler repair | bookable | 120 | $145 |
| Free consultation | bookable | 30 | Free (the catalogue's name and price 0) |
| Rachio smart controller install (8 and 16 zone bands) | bookable | 120 | From $350 ($420 above 8 zones) |
| Water efficiency and drip | bookable | 90 | Price set at the visit |
| New sprinkler system installation | bookable (a design visit) | 120 | Price set at the visit |
| Larger sprinkler repair, Christmas lights | quote | | none |
| Core aeration | off | | |

The three newly bookable services take the normal path (address, service, details, day and exact time, contact, confirm) with their own questions on the details step: the Rachio install asks the controller there now (Hunter, Rain Bird, Rachio, Toro, Orbit, Irritrol, Other, Not sure) and Wi-Fi at the controller, besides zones; water efficiency asks what to improve (a high water bill, dry spots, a garden bed to put on drip); the installation visit asks a new lawn or replacing a system, the rough area in square feet, and says photos are strongly suggested. Every one of these is optional; access is still the one required answer. A price the catalogue does not have is never invented.

## Navigation and close

Research, Nov 20 2026. Fetched pages are cited; anything I could not fetch is marked unverified.

- **NN/g, [progress indicators](https://www.nngroup.com/articles/progress-indicators/)** (fetched): show the number of steps rather than only a percentage, pair it with words, give it enough prominence, and for longer processes let people stop.
- **NN/g, [wizards](https://www.nngroup.com/articles/wizards/)** (fetched): include explicit buttons for the next and the previous step; show the steps and which one is current; a wizard is not gracefully interruptible, so quitting midway can lose work, and saving progress matters for long or central processes, not for simple ones. NN/g's multi-step forms article returned 404 and is not cited.
- **Jobber, [online booking](https://help.getjobber.com/en/articles/online-booking/)** (fetched; their form checks a zip first, ours checks the address): zip check first, then services with price and duration, contact and address, a calendar and a time, then Confirm Booking; a Back button returns to the previous screen; the page describes no exit or cancel control; a confirmation screen and an email follow.
- **GOV.UK Design System, [back link](https://design-system.service.gov.uk/components/back-link/)** and **[error summary](https://design-system.service.gov.uk/components/error-summary/)** (fetched): the back link takes people to the previous page in the state they last saw it, because the browser's Back button can break journeys; the error summary sits at the top, above the h1, moves focus to itself, links each message to its field (the first one when several) and uses the same words as beside the field.
- **WCAG 2.2, [page titled](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html)** and **[focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)** (fetched): a single-page app should change its title with the view, and changed content must keep a meaningful focus order.
- **MDN, [pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)** (fetched): each pushState is a history entry, and Back fires `popstate` with that entry's state.
- **Unverified.** Square Appointments' flow (the support page fetched was the help-centre home with no booking content), Calendly's invitee flow (help pages redirected; a search found only host-side rescheduling notes), OpenTable (only third-party critiques, which say it moves straight to a final reservation screen after a time is picked), Airbnb (only forum and help-centre notes: you can step through the request flow without sending, and nothing documents its back or close controls) and Typeform (its help page returned 403; community posts say its back arrows are hard to see and its progress bar can mislead with branching). None of these is used as evidence below.

The rules adopted:

1. **The logo links back to the site, and Close (an X, top right) is on every step.** It is a link to the website, so leaving is always one tap and works without JavaScript. On the booked screen it is still there. (Jobber's page names no exit; NN/g says people need a way to stop.)
2. **Close asks only once something is entered.** Before that it just leaves. After, it opens "Leave without booking? Your answers aren't saved." with Keep booking and Leave. Nothing is saved before the contact step, and the dialog says so truthfully.
3. **Back is a visible secondary button beside Continue, and always works.** It is never a small link at the far edge; it is 48px, outlined, left of Continue, and absent only on step 1 (where the logo and Close are the way out). NN/g asks for explicit previous and next buttons.
4. **Back and the browser's Back are the same thing.** Every step is a browser-history entry (`pushState` with the step as state; `popstate` restores it), so a phone's Back button goes to the previous step and never out of the form, with the answers kept; Forward works; the Back button calls `history.back()`. After booking, Back is ignored so Confirm cannot book twice. (GOV.UK: take people back to the state they last saw.)
5. **The progress is a real bar with words: "Step 3 of 6".** In the card, above the question, not fixed to the top of the screen. The count is the steps the path has, so a request for a quote reads "of 4". (NN/g: step counts, with prominence.)
6. **Enter submits a step** from a one-line field or a chosen card (not from a textarea, a button, a box or the address list, where Enter already means something).
7. **Focus moves to the step's heading on every change, and the page title follows** ("Pick your day and time, Step 4 of 6 | Book online | Trailhead Lawn & Irrigation"), so a screen reader hears the new question. (WCAG page titled and focus order.)
8. **Continue stays reachable.** On a phone Back and Continue are one bar fixed to the bottom of the screen, 48px tall, with the safe-area inset; on a laptop they are the pair at the card's foot. Continue is off only for a choice not made or a dead end, with a line saying why; otherwise a press names what is missing.
9. **Errors are summarised at the top of the step and the first bad field gets focus.** The summary lists each message in the same words as beside its field, each a button that focuses that field. (GOV.UK error summary; it focuses the summary, we focus the first field, because the field is where the fix is.)
10. **The booked screen has no Back and no Continue:** the card, what happens next, Add to calendar, "your Trailhead account" and "Back to the website". Nothing is left to go back to.

Layout that follows: the header is the logo (a link) at the left and Close at the right on a plain stone surface; the card sits at the top of a 640px column on a laptop (edge to edge on a phone with 16px gutters inside it); the ghosted photo is gone, because a faint photo made the card look unfinished and a photo strip would compete with the logo on a phone; the progress bar is in the card, so nothing is fixed at the top and nothing can sit under the walkthrough's Flow strip.

## Catalogue changes for the build step

Nothing here is wired and `src/lib/services.ts` is not edited. For the build step:

- `install` (New sprinkler system installation) goes from `quoteOnly: true, bookable: false` to bookable (kind `install`, 120 minutes), as a design visit, with no price (the service has `price` unset, so the form says "Price set at the visit").
- A new `water-efficiency` entry, bookable, 90 minutes, kind `other` or a new kind, no price, named "Water efficiency and drip" (there is no such entry in the catalogue today).
- `repair-large` and `lights` stay `quoteOnly: true`; `aeration` stays off online (`bookable: false, quoteOnly: false`).
- `rachio-install-8` and `rachio-install-16` are already bookable; the form folds the two bands into one "Rachio smart controller install" card whose price comes from the zone count ($350 up to 8 zones, $420 for 9 to 16).
- The services table needs a row for the new entry and the changed flags, and Settings > Services' Online select needs three values per service (Book a day, We quote, Off), which `bookable` and `quoteOnly` already encode (`bookable` is a day, `quoteOnly` is a quote, neither is off).
- The consultation's catalogue text promises "a quote to follow" and a layout and price "in writing"; the booking form does not repeat either, so that text is shown nowhere on it.
- Service-specific answers (controller brand, Wi-Fi, what to improve, project type, rough area) have no home in the data model yet: they would be notes on the visit until Hannah decides.

## Decisions

- **Address and details before the day.** The open-day search needs the town and the zone count (which sizes the price and later the visit's length). Access asked on the details step replaces the access question that sat under the address.
- **One marketing box, email, unticked, in its own group under a hairline;** the terms line is a required box above it. The text opt-in is in Details in the account (switches), as before.
- **Continue stays on where a press can name the problem.** It is off only for a choice not yet made (service, a start time) or a dead end (an address we do not serve), each with a line saying why. This also fixes the old "Contact Problems Phone" story, which pressed a disabled button.
- **No card step in this form.** The visit is charged after Ryan finishes and he asks how the customer wants to pay (card, check, Venmo or cash); the confirm step and the booked screen say so. This leaves question 1 of the online booking design (a card for a one-off, offered or required) as it was: offered, later, from the account. The old card step and its stories are gone with `BookingFlow`.

## What is a stand-in

Nothing is sent or saved; offers come from `fixtureDayTimes`; the address list is the fixture provider; "Add 2 sample photos" stands in for an upload; Add to calendar links are placeholders; the zip list behind the address check is `SERVICE_ZIPS` (Ryan confirms it before go-live).

## Questions for Hannah

1. **How long until we get back to a request?** The form says nothing about when. If you want a time ("by the next business day") it has to be a promise you will keep.
2. **Is the design visit (installation) free, and does Ryan give a price in writing?** The form says only "Price set at the visit". It cannot say the visit is free or that a price comes in writing until you say so.
3. **Is the water efficiency visit free or priced, and is a price given at the visit?** The same.
4. **Free consultation:** the catalogue names it free, so the form shows "Free". Is that still right, now that the design visit is also bookable?
5. **"These days are full. We'll call you to find one."** is the approved wording from the online booking design, so it stays. Does someone really call, or should it become "Call Ryan" with the number?
6. **Where do the Rachio, efficiency and installation answers go** (brand, Wi-Fi, goals, project type, area)? Today they would be notes on the visit.
7. **Photos on the installation visit are "strongly suggested", not required.** Right?

## For Hannah's review

1. Six steps, as in the brief's "Step 3 of 6": the zip step is gone (Hannah, Nov 20 2026), and the confirm step is the one new step.
2. Settled Nov 20: the day comes before contact, so nothing is kept until the contact step is submitted.
3. The sweep of invented promises (Nov 20, Hannah: "never add extra crap like this you don't know") is listed in the pull request.
