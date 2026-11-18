# Design: the customer portal

Nov 18 2026. Design only; nothing is built until Hannah has read it. Hannah's words: "It's not 'open their season pass', it's their customer portal… Booking users need to log on to a regular booking and change their times… I love the season pass elements, the holographic image; keep that where possible, weave it in." The booking flow (section 5 of `2026-11-18-week-planning-design.md`) and the transactional messages have their own designs; this doc only says where they link.

## 1. The jobs to be done

1. **"What's coming, and who's coming?"** The next day, the arrival window, Ryan's name, what he is doing, whether I must be home.
2. **"That day doesn't work."** Pick another day myself, without a phone call, and know it went through.
3. **"What do I owe, and what did I pay?"** Pay a bill in a tap; find last spring's receipt without digging through email.
4. **"What did I buy?"** My Season Pass, its visits, and reserving next year; my repair or blowout, what it cost.
5. **"Keep my details right."** My phone, my gate code, the card on file, my address.

## 2. What the tools do

- **Jobber Client Hub.** Sign-in is an emailed or texted link, no password; after 14 days without a link it asks for the email or last four phone digits. Shows past appointments and the next five, with arrival window and the team's first names; quotes (accept or ask for changes); invoices marked Awaiting Payment, Paid or Past Due, with online and part payment; PDFs of invoices and receipts; a card wallet. Its help page does not mention rescheduling. Not shown: draft or archived quotes, draft invoices. [what clients see](https://help.getjobber.com/en/articles/what-do-your-clients-see-in-client-hub/)
- **Housecall Pro.** Magic link, no username or password, good for 7 days. Appointments tab (upcoming and past), invoices with View & Pay, estimates, a card wallet. Its guide describes change and cancel as a message to the business, not a self-serve move. [customer guide](https://help.housecallpro.com/en/articles/8474580-customer-guide-to-the-portal), [using the portal](https://help.housecallpro.com/en/articles/8448657-using-the-customer-portal)
- **ServiceTitan.** Jobs in tabs (In Progress, Upcoming, Completed, Canceled); an unscheduled visit says "Call to Schedule"; no documented reschedule in the main guide (a release note mentions it only with Scheduling Pro). Paid and unpaid invoices, pay one or several, part payment on one; sign-up only with the email on the customer record; an emailed pay link works with no sign-in but cannot reach saved cards. Never shown: internal or dispatcher notes. [end-user guide](https://help.servicetitan.com/docs/the-new-customer-portal-end-user-experience.md), [overview](https://help.servicetitan.com/docs/customer-portal-overview.md)
- **Square Appointments.** The seller turns on "clients may reschedule or cancel" and picks a cut-off from one hour to two weeks; after it, the client sees the policy and the seller decides whether to charge. [cancellations](https://squareup.com/us/en/help/article/5493-manage-booking-cancellations-and-prepayment-policies)

Pattern: emailed-link sign-in for the email on record; appointments, bills and cards are the core; internal notes are never shown; self-serve reschedule is rare and, where it exists, has a cut-off. We can do better here, because `visits.pick` already moves a day.

## 3. Three approaches

- **(a) One page, stacked.** Next visit, then jobs, then pass, then account. Simple and phone-friendly. It grows without end once a customer has years of receipts, and the pass card gets buried.
- **(b) A small portal.** Home, Visits, Jobs, Season Pass, Details, each its own screen. Every job has an address you can text. More screens to build.
- **(c) Pass page kept, plus a home above it.** Least work. The pass stays the main character, so a one-off customer sees a page that is about something they did not buy.

**Recommendation: (b), with Home doing the work of (a).** Most customers only open Home, which stacks the next visit, any bill and the pass card; the other screens hold the full lists and give a text message a place to land. The pass page stays, so links already sent keep working.

## 4. The recommended portal, exactly

**Name:** "Your Trailhead account" (in messages, "your Trailhead account"). **URL:** `/account` is Home. `/account/pass` stays as the Season Pass screen, unchanged in content. New: `/account/visits`, `/account/jobs`, `/account/jobs/[jobId]`, `/account/details`. **Sign-in:** `/account/sign-in` as today (email link; only the email on a customer record gets in; `AccessDenied` reads "We don't have that email. Call Ryan at (970) 692-7270"). The page title changes from "Sign in to your pass" to "Sign in to your account". Sign-in already sends people to `/account`, which does not exist yet.

**Navigation:** Home · Visits · Jobs · Season Pass (only for someone who has held one) · Details.

```
PHONE: Home (375)              LAPTOP: Home (1280, max-w-5xl)
+----------------------+       +-----------------------------------------------+
| [logo]  Hi, Andrea   |       | [logo] Home Visits Jobs Pass Details  Andrea  |
| Home Visits Jobs ... |       |-----------------------------------------------|
|----------------------|       | Bill sent: Spring repair $115, due Dec 1 [Pay]|
| Bill sent, $115      |       |-----------------------+-----------------------|
| due Dec 1  [Pay now] |       | NEXT VISIT            |  [holographic pass    |
|----------------------|       | Tue, Apr 28           |   card: PassCard]     |
| NEXT VISIT           |       | Arrive 9 to 11 am     |   Season Pass 2027    |
| Tue, Apr 28          |       | Ryan · Spring turn-on |   Turn-on  Apr 28     |
| Arrive 9 to 11 am    |       | You'll need to be     |   Blowout  Oct 6      |
| Ryan · Spring turn-on|       | home.  [Change my day]|   [See your pass]     |
| Must be home         |       |-----------------------+-----------------------|
| [Change my day]      |       | YOUR JOBS                                     |
|----------------------|       | Season Pass 2027   2 visits   $240  Paid      |
| [PassCard]           |       | Sprinkler repair   Nov 3      $145  Paid      |
| See your pass        |       | See all jobs                                  |
|----------------------|       +-----------------------------------------------+
| YOUR JOBS (latest 3) |
+----------------------+
```

**Home, in order.** (1) Bill sent banner, only when a bill is open: "Bill sent: Spring repair, $115, due Dec 1" with **Pay now** (after the day: "Overdue since Dec 1"). (2) **Next visit card**: day, window ("Arrive between 9 and 11 am"), the person's first name ("Ryan"), what ("Spring turn-on"), "Must be home" when the property says so, and **Change my day**. With no day yet: "Pick a day" with the same three days. With no visits: "Nothing booked. Book Online". (3) **Pass card**: the existing `PassCard` (holographic, tilt on a phone), over the existing season line, linking to the pass screen. (4) **Your jobs**: the latest three.

**Change my day** opens the existing `PickDayButtons` with the three days from `visits.areaDays`, each as "Tuesday, May 5". Tapping one calls `visits.pick`; the screen says "Moved to Tuesday, May 5. We texted you the new date." The earlier day is shown as gone. Failure says "We couldn't save that day. Try another, or call Ryan at (970) 692-7270."

**Visits (`/account/visits`).** "Coming up" then "Past", one row per visit: day, what, who, pill. Pills in the customer's words:

| Admin pill | Customer sees |
|---|---|
| Unscheduled | **Pick a day** (with days offered) or **Day coming soon** |
| Scheduled | **Booked** |
| Done | **Done** |
| Not done (no day again) | **Needs a new day**, with the reason ("no water on") and Pick a day |
| Cancelled (or a skipped pass visit) | **Cancelled** / **Skipped** |

**Jobs (`/account/jobs`, `/account/jobs/[jobId]`).** One row per job: name, date sold, total, money word. The job screen shows its lines and total ("Spring turn-on $145"; a cancelled line struck through), its visits, and **Money**: each payment ("Paid Nov 3, card $145", "Paid, check"), a **Receipt** link on every payment, and the open bill with **Pay now**. Money words come from `src/lib/money/words.ts` through one customer wording: Paid, "$145 unpaid" on a job, "Bill sent, due Dec 1" on a bill, Overdue after the day; never "Owed". **Pay now** opens `/pay/<invoiceId>?token=` with a token the server signs for the signed-in customer. **Receipt** opens the card receipt link when the payment has one, otherwise a plain printable page built from the payment row (check and Venmo payments have no card receipt). A Season Pass job shows `PassSeason` under the same heading, so the pass is a job like any other.

**Season Pass (`/account/pass`).** As today: pass card and Save as image, the season line, pick a day, preferences, July add-on, skip, Reserve next season (from Nov 1), the card update, earlier seasons, cancel.

**Details (`/account/details`).** Name, mobile, email (changing it sends a link to the new address first), service address with the yard facts the customer knows best: zones, controller, backflow location, gate code, must be home, access note, on-site contact and phone (read from the property). **Card on file**: brand, last four, expiry, **Update card** (the existing Stripe page, now for the customer, not one pass). **Sign out.**

**What a customer never sees or changes:** prices, lines or totals (read only); other customers or properties; notes the office wrote and the event history; who else is on the schedule; the Jobber mirror; a draft or cancelled bill. A person appears by first name only.

**The reschedule rule.** Jobber, Housecall Pro and ServiceTitan leave changes to a call or message; Square sets a cut-off. Ours:
- *Which visits:* Booked or needing a day, of a kind with a season window or booked online (turn-on, blowout, online repair). Not installations or quoted work, not Done or Cancelled. Today `visits.pick` allows pass visits only; online repairs and one-off turn-ons need the same pass check relaxed to "a visit of mine with a window".
- *To which days:* one of the three `visits.areaDays` offers, at least two days from today (`PICK_LEAD_DAYS`), inside the visit's window, with the person who works the area. No other day can be typed.
- *How late:* **new rule**: until two days before the current day. After that Change my day becomes "Call Ryan at (970) 692-7270", since the person has been routed and the day-before text is out. Today `visits.pick` has no cut-off.
- *How often:* no limit, no fee. Each change texts the customer.
- *Nothing open:* "No open days left in this window. Call Ryan."

## 5. Where it is reached from

- **Marketing header:** a quiet **Sign in** link beside the phone number, never a second filled button (the one button stays Book Online).
- **Every transactional message** ends with one link, "your Trailhead account", signed so one tap lands on the right screen (the bill, the visit, the receipt) and asks for sign-in only if the signature has gone stale.
- **Booking flow done step:** "See it in your Trailhead account" with the same sign-in link.
- **Pay page:** after paying, "See your receipt in your account"; the pay page itself stays link-only so a bill can be paid without signing in.
- **Jobber-backed `/book`** retires at the exit; the portal's Change my day replaces its reschedule.

## 6. What changes in code

| Part | Change |
|---|---|
| Routes `(account)/account/` | Add `page.tsx` (Home), `visits/`, `jobs/` and `jobs/[jobId]/`, `details/`, a receipt print page, one shared layout with the navigation; `pass/` keeps its files |
| Handlers that exist | `passes.list|get`, `visits.areaDays|pick` (customer-scoped), `passes.startCardUpdate` |
| Handlers to add (all `customerSelf`, scoped to the caller's customer) | `jobs.list` / `jobs.get` (lines, visits, payments, open bill; no notes or events); `invoices.list` and `invoices.get` for a customer; `customers.updateSelf` (name, phone, email through a confirm link); `properties.updateSelf` (yard facts); `payments.receipt`; `customers.startCardUpdate` |
| Handlers to change | `visits.pick` and `visits.areaDays`: allow a non-pass visit with a window; add the two-day cut-off. The old ask-to-move handler stays for the office's inbox; no screen uses it |
| Blocks to reuse | `PassCard`, `PassSeason`, `SeasonLine`, `StatusPill`, `PickDayButtons`, `SignInCard`, money words; new: `NextVisitCard`, `BillBanner`, `AccountNav`, `JobRow`, `ReceiptLine`, each pure props |
| Stories | Home (next visit, no visit, bill sent, no pass), Visits, Job (paid, part paid, bill out), Details, Change my day (success, cut-off passed, nothing open), at 375 and 1280 |
| Tables | None |

## 7. Open questions for Hannah

1. How late may a customer change their day: **two days** before, the **day** before, or **never** (call only)?
2. May a customer change the email on their account by themselves (**yes** or **no**)?
3. Should the Season Pass tab show for customers who have never held one (**hide** or **show**)?
4. Should "Sign in" sit in the header on a phone, or only in the menu (**header** or **menu**)?
