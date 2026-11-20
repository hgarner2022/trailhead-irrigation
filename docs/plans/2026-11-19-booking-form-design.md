# Design in Storybook: the customer booking form

Nov 19 2026. Design only, as stories over fixtures; nothing is wired. Hannah, twice: "I want the booking form designed in here too." Open `npm run storybook` and look under **Design / Booking form** (every step at 375 and 1280), **Blocks / ZipCheck, ZoneChips, AccessChoice, PhotoPicker, BookingReview, ContactPreference**, and step 1 of **Design / Start here: the customer, clickable**, which now runs this same form. It builds on `2026-11-18-online-booking-design.md` (the flow and its rules), `docs/research/jobber-booking-2026-11-18/` (Hannah's live Jobber form, the content reference) and `2026-11-19-customer-side-design.md` (the day-and-time picker, the holographic card).

## The job to be done

"I need a sprinkler visit. I want to say what and where, see a day and an exact time that works, and know what it costs and when I'll be charged, in a few minutes on my phone."

## What the Jobber form teaches, and what we change

Jobber's order is zip code, services with their lengths, contact, address, service details, then a calendar with exact slots (the screenshots). We keep that order for the whole form, as Hannah asked, and change four things: the zip step answers at once (a zip we serve says so; one we do not gets the six towns, the phone number and the way out); the contact preference (text, email or both) is asked once with the contact fields; photos and a note are optional, not buried; and the last screen before booking says exactly what happens.

## The steps

A service with a day has seven counted steps, then the booked screen. "Step 3 of 7" sits over every question; the primary button is fixed at the bottom on a phone; every step has Back (the first has "Back to the website").

| # | Step | What it asks | Continue is off until |
|---|---|---|---|
| 1 | Zip code | Five digits; the answer appears under the box | the zip is one we serve (a half-typed zip says what to add when Continue is pressed) |
| 2 | Services | One radio card per service we book online with its price and length; a closed service shows "Opens Apr 25"; "Need a quote? Request one" under the list | a service is picked |
| 3 | Contact | First and last name, email, phone; how we reach you (Text, Email, Text and email); the terms line; the separate, unticked "Send me tips and offers from Trailhead by email" | never off: a press names each missing field as help |
| 4 | Address | The type-ahead, "Can't find it? Type your address" | never off, except an address outside the six towns (the out-of-area line) |
| 5 | Service details | Zones with the price under them ("About $145, charged after the visit."), whether we can reach the controller and shut-off, a note for the crew, photos (a real file input; "Add 2 sample photos" is the prototype's shortcut) | never off: access unanswered is named as help |
| 6 | Day and time | Three day cards, the best selected, "Show more days" to five, then only that day's exact start times; "None of these work? Tell us when" | a start time is tapped, or no day is open, or the customer said when |
| 7 | Confirm | Every answer with its Change link and one sentence of what happens | |
| | Booked | The holographic card with the exact time, "You added 2 photos", what happens next, Add to calendar, "your Trailhead account" | |

A request for a quote has the same steps 1 to 5 (the list is what we quote, with no prices; step 5 is "Tell Ryan about it": words and photos), then Confirm ("Send to Ryan") and "Thanks, Ryan will call you by tomorrow." No day, no card. The Season Pass keeps its place first in the list and asks a day and time for each of its two visits.

## The words

| Where | Words |
|---|---|
| Zip served | Good news, we work in Erie. |
| Zip not served | We don't serve 80302 yet. We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield. Not sure? Call Ryan and he'll tell you. |
| Missing phone | Add a phone number so we can text you the day. |
| Missing terms | Tick the box to accept the terms. |
| Missing access | Tell us whether we can get to the system without you. |
| Price | About $145, charged after the visit. |
| No open day | These days are full. We'll call you to find one. (the box "When would suit you?" and "Or call Ryan at (970) 692-7270") |
| Confirm, text | We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done. |
| Confirm, both | We'll text a confirmation to (970) 555-0123 and email one to andrea@example.com, then email a receipt when it's done. |
| Booked photos | You added 2 photos. Ryan sees them before the visit. |

The time rule holds everywhere: an exact start time, never a window. A customer never reads job, line or stage.

## Decisions

- **Details before the day.** The zone count sizes the price (and later the visit's length), so details come before the day, as in Jobber. Access asked there replaces the access question that sat under the address.
- **One marketing box, email, unticked, in its own group under a hairline;** the terms line is a required box above it. The text opt-in is in Details in the account (switches), as before.
- **Continue stays on where a press can name the problem.** It is off only for a choice not yet made (service, a start time) or a dead end (a zip or address we do not serve), each with a line saying why. This also fixes the old "Contact Problems Phone" story, which pressed a disabled button.
- **No card step in this form.** The visit is charged after Ryan finishes and he asks how the customer wants to pay (card, check, Venmo or cash); the confirm step and the booked screen say so. This leaves question 1 of the online booking design (a card for a one-off, offered or required) as it was: offered, later, from the account. The old card step and its stories are gone with `BookingFlow`.

## What is a stand-in

Nothing is sent or saved; offers come from `fixtureDayTimes`; the address list is the fixture provider; "Add 2 sample photos" stands in for an upload; Add to calendar links are placeholders; the zip list is `SERVICE_ZIPS` (Ryan confirms it before go-live); each step is not yet a browser history entry (a phone's Back button would leave the form).

## For Hannah's review

1. Seven steps is one more than the "Step 3 of 6" in the brief: contact comes before the address, as in Jobber, and the confirm step is new. Merge the zip into the services screen, or the address into contact, if you want fewer.
2. The contact step comes before the address and the day, so an abandoned booking leaves a name and a phone number. Is that wanted, or should the day come first as the online booking design proposed?
