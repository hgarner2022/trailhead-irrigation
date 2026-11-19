# UX audit: Ryan's day on the live admin

Nov 18 2026. I played Ryan's day in the signed-in admin at https://www.trailheadirrigation.com/admin: Home, the call, the Schedule, the stop, the money, Jobs, Customers, Reports, Settings. Laptop width (1703 px) and phone width. Nothing was fixed. `resize_window` reported success but the viewport stayed 1703 px, so every phone check ran the real pages inside a 390 px iframe on the same origin (media queries, tap sizes and overflow are real; the browser chrome and the touch keyboard are not). The usage budget was tight, so this is a lean pass: what was read is listed, and what was not is in section 6. Words in quotes are the exact words on screen.

Live data touched, within the rules: one New job for Hannah Garner with no day (`9189931a-da05-4ede-9c23-4dff6cf1d772`, "Sprinkler repair visit", $145), opened, read, and canceled at the end through "Cancel job". No text, email, payment or day was sent or set. The Place all, Move, Send a text and Property Edit dialogs were opened and closed without confirming.

## 1. The ranked list

Severity: **blocks** (Ryan cannot do the job or is told something false), **confuses** (he can do it but will hesitate or get it wrong), **polish**.

| # | Sev | Screen and URL | Exact words on screen | What Ryan expects (pattern) | Fix |
|---|---|---|---|---|---|
| 1 | blocks | Visit panel of a customer who has other messages: `/admin/customers?visit=<id>` | On the brand-new Unscheduled repair: "Messages: Receipt: $145 for your repair, Receipt, email, Nov 18, Sent. Trailhead: your repair is Fri, Nov 20, 8 to 10 am. Calendar and changes: .../account/pass, Date set, text, Nov 18, Sent" while "When: Unscheduled" | A visit shows only what was sent about that visit (Jobber's visit timeline is per visit). Ryan reads this as "the customer was already told a day and paid". | Filter the visit panel's Messages by visit id; the customer panel keeps the customer-wide list. |
| 2 | blocks | Move dialog (visit panel, Move) `?visit=<id>` | "Moves the mid-season inspection to Thu, Jul 1." with "Move and text the customer" enabled and nothing changed (same day, same time) | A move with no change is a no-op: the button stays disabled until the day or time differs. Today one tap texts a customer "date moved" to the date they already have. | Disable both Move buttons until the day or time differs from the visit's. |
| 3 | blocks | Jobs on a phone `/admin/jobs`, also Customers and the Schedule's List | Columns Customer, Job, Property... then Status, Money, Next sit off the right edge; the page is 390 wide and the table scrolls inside its box | Housecall Pro and Jobber phone lists are cards: name, service, day, money word. The holistic design, section 2, lists "a table that only works sideways on a phone" as something a screen must never be. Ryan cannot see Status or Money without swiping. | Below `md` render each grid row as a card (name, job, day, money word); keep the table at `md` and up. |
| 4 | confuses | Home, Needs action row "Customer change: Hannah canceled Spring turn-on...", button "Open job" | The button says "Open job"; it opens the visit panel of the canceled turn-on, whose "When" reads "Unscheduled", Price "Canceled", status "Canceled" | A button opens what its label says; a canceled visit says Canceled (and the day it had), not Unscheduled. Unscheduled looks like work that needs a day. | Label it "Open visit" or open the job; show "Canceled, was Fri, Apr 30" in "When". |
| 5 | confuses | Job panel of a canceled job `?job=9189931a-...` | "Total: Quote later" and "Lines: Repair, canceled, Total: Quote later" on a $145 repair I had just canceled | Jobber keeps the amount and strikes it; "Quote later" is the unpriced state, not a canceled one. | Show the struck-through $145 for a canceled job; reserve "Quote later" for unpriced lines. |
| 6 | confuses | Settings `/admin/settings` | Tabs read "People, Services, Billing, Areas, Capacity and windows, Messages, API keys" | Settled: five tabs, People, Services, Billing, Messages, API keys. Areas and "Capacity and windows" are the tabs Hannah rejected; People still has the columns "Turn-ons per day, Inspections per day, Blowouts per day, Repairs per day, Season from, Season to". | Remove the two tabs and the Season columns when the engine takes over (step 7); until then hide them from Ryan. |
| 7 | confuses | Job panel footer, phone | The footer takes about a quarter of an 844 px screen: "Open visit", "Add a line", "New visit", "More", "Cancel job" in two rows plus a red link | A technician's job screen has one big button and a menu (Jobber's Complete visit, Housecall Pro's On My Way, Start, Finish strip). Five targets push Lines, Visits and Money under the fold. | On phone keep the one primary and More; put Add a line, New visit and Cancel job under More. |
| 8 | confuses | Customer panel, the call: `/admin/customers?customer=<id>` | Facts: "Phone (303) 819-6133, Email, Job None, Next Nothing ahead, Scheduled No, Card No card on file, Marketing Not asked"; no `tel:` or `sms:` link anywhere (checked in the DOM) | Jobber and Housecall Pro lead with Call and Text buttons and a balance due; a phone number is tappable. Ten-second test: card, pass, next visit yes; unpaid and last visit are not in the top block; gate code sits under Property, which reads "Nothing on file yet" when empty, so "none" and "hidden" look alike. | Make the phone a `tel:` link, add Call beside "Send a text", put "Unpaid $X" and "Last visit" in the facts. |
| 9 | confuses | Cmd+K search | "303 819 6133" and "Briggs": four customers each reading "Hannah, 480 Briggs St, Erie" and six jobs; none shows the phone or email that matched | Jobber's client search shows name, address and phone so two Hannahs are told apart. "Briggs" also returns every job and day on the street. | Show phone and email under each customer hit; cap Jobs and Days at three each with "See all". |
| 10 | confuses | New job sheet | "What are we doing? Choose one, Season Pass, Core aeration, Fall blowout & winterization, Free consultation, Mid-season inspection & tune-up, up to 12 zones, up to 16 zones, up to 8 zones, New sprinkler system installation, Christmas lights, Rachio smart controller install, 9 to 16 zones..." (15 entries, a line per zone band, not in the order Ryan sells) | One entry per service, the zones box picks the band (Jobber's Products and services). The earlier audit asked for this; it is not done. On a phone Ryan scrolls a native picker of 15. | One entry per service with the zones box choosing the band; order by what Ryan sells now (repair first). |
| 11 | confuses | Settings, People | Three people: "Ryan Garner", "Hannah Garner", "Hannahn.garner"; the change log reads "Second truck name from Second truck to Hannah Garner" | A person named like the customer "Hannah Garner" is a trap on the Schedule: two "Hannah Garner" lines in a day. Notes and history use the email prefix "Hannahn.garner" as the author. | Rename the test people before Ryan uses it; show a person's name, not an email prefix, as a note's author. |
| 12 | confuses | Home and the Schedule week | Home: "Today $335, Done $335... 3 done today" lists the Repair that is scheduled Fri Nov 20; the week shows that repair on Fri 20 as an ordinary block ("1 stop, 14 h open") | A done visit is marked done on the week (Jobber greys and checks it). Fri 20 reads as work ahead. | Show done blocks with a check and lighter; say "Done early" where the done day differs from the scheduled day. |
| 13 | confuses | Season Pass visit panel | "Job: Season Pass TH-2027-0008. $280 unpaid." while Home says "Unpaid $0" and Reports "Outstanding, 0 jobs, $0" | One word, one number. A pass whose charges are not due is not unpaid. | Say "$280 to be charged after each visit" until a visit is Done. |
| 14 | confuses | Place all preview | "Place all 1: Each job goes on the next open day, with the first person who has room... Hannah Garner, Erie · Repair, Thu Nov 19, Ryan Garner" | The row says when in the day ("Any time") and that the customer is texted in 60 s with Undo; today only the paragraph says so. | Add "Any time" and "text in 60 s" to each row. |
| 15 | polish | Add job, Cancel job | Add job took 4.4 s and Cancel job 3.7 s from tap to panel (the page's server HTML is 0.3 to 1.0 s: Home 0.97 s, others 0.3 to 0.5 s) | Under a second for an action. | Return the new row from the mutation and update the panel before revalidating. |
| 16 | polish | Phone tap targets | "By job" and "By person" 151 x 29, Settings tabs 29 high, Settings row buttons 16 x 16, New job sheet Close 16 high, "Must be home" checkbox 20 | 44 px minimum on a phone. | Raise to 44 px below `md`. |
| 17 | polish | Reports `/admin/reports` | "Quotes awaiting, $0: 0", "Pending passes, expire after an hour 0", season chart axis "AMJJASOND" | "Quotes awaiting" is a feature not built; "expire after an hour" is plumbing; one-letter months are hard to read. | Hide Quotes until they exist; "Passes not yet paid"; three-letter months. |
| 18 | polish | Customers list | Four rows "Hannah" (three test customers) and "Hannah Garner"; columns Name, Address, Town, Email, Phone, Pass, Next, Scheduled, Last visit, Marketing; no balance | Jobber's client list shows balance. | Add Unpaid; drop Marketing from the default view. |
| 19 | polish | Empty grid | "No jobs match. Clear filters" (good) but "Export 0 rows" stays enabled | A disabled export on an empty set. | Disable at zero rows. |
| 20 | polish | Home map | A blank cream box with the map credit and two people in the legend; no pins | "No stops left today" when every stop is done. | Say it. |
| 21 | polish | Schedule week, laptop | Blocks read "8:00 am Hannah Garn..." (name cut); "Place all 1" is a small orange text link | Jobber's block shows the short name; the list's action is a button. | Let the block wrap; make Place all an outline button. |

## 2. Things that do not make sense

- The visit panel's "At the property" lists "9 zones", "Must be home" and the customer's email as unlabeled lines. The email is not a property fact; "Must be home" has no label.
- A repair job panel is titled with the customer's name and a back link also reading "‹ Hannah Garner"; the job's own name is only in the subtitle, "Repair · sold Nov 18". An office-made repair is "sold".
- "Unpaid $145" on a job with no day and no work done.
- Pay later is offered only to a customer with no card (`src/lib/money/collect.ts`). A customer with a card who says "mail me a check" has Check (records it paid), Invoice or Charge; no "leave it unpaid".
- "Dismiss" under Needs action has no undo and no hint what it hides; a cancel and a move of one visit make two rows.
- The person "Hannah Garner" and the customer "Hannah Garner" appear on the same Schedule.

## 3. Research: how the field does the technician's day

From help pages and search summaries; I did not open a vendor's phone app. A cell marked "not reached" means no source was found, and nothing is claimed.

| Pattern | Jobber | Housecall Pro | ServiceTitan | Call |
|---|---|---|---|---|
| Today's list | Schedule tab lists the day's visits; open one to act ([Jobber app help](https://help.getjobber.com/en/topics/jobber-app/)) | Open the assigned job, review address and details ([training article](https://help.housecallpro.com/en/articles/4372680-scheduling-invoicing-and-payments-training)) | Field app job list with status actions ([cheat sheet](https://help.servicetitan.com/residential-s-r/docs/field-mobile-app-cheat-sheet)) | Follow: Home "By job / By person". Keep. |
| On my way | Button on the visit; minutes saved as next default; appears only if the client has a text-enabled phone | On My Way, Start, Finish, each timestamped; office alerted, customer notified if enabled | Dispatch ("on the way"), Arrive moves to Working | Follow Housecall Pro's strip minus Start/Arrive (one truck). Check our button hides without a text-enabled phone; not exercised. |
| Complete, then collect | "Complete visit", then Invoice now or later; Collect Payment by cash, check, other, card with Jobber Payments | Finish Job, then Accept Payment for cash or check, scan a card | Complete job, then payment against the invoice balance; required forms can block closing | Follow the two beats and the card first. Do not copy ServiceTitan's required forms for one truck. |
| Drag and move | not reached | not reached | not reached | Not judged. |
| Unscheduled | "Schedule later" and an Unscheduled list not confirmed by search (the earlier audit's vendor table lists them) | not confirmed | "Unassigned" per the earlier audit | Follow: Unscheduled under the week with Place and Place all. |
| Waiting on a customer | not reached | not reached | not reached | Ours has no vendor source here; it is Hannah's rule. Keep. |

NN/g and others on tables and panels: [Data tables](https://nngroup.com/articles/data-tables) says a modal obscures the table while a non-modal side panel shows one full record with the table still visible; NN/g's video [How to Fit Big Tables on Small Screens](https://www.nngroup.com/videos/big-tables-small-screens/) says to lock headers and let people choose a subset of columns; Hoober at [UXmatters](https://www.uxmatters.com/mt/archives/2020/07/designing-mobile-tables.php) argues against responsive tables because comparing down a column is lost, favouring another shape such as cards. No NN/g dashboard page was reached, so no dashboard claim is made.

Informed calls: keep the side panel on the laptop (NN/g); do not use a sideways table on the phone, use cards (row 3). Keep the two-beat finish with the card first, matching Jobber and ServiceTitan's separation of complete from collect.

## 4. What is good and should not change

- One panel at a time: opening a job from a customer replaced the customer panel; Back removed the panel and left `/admin`; Esc closes it, focus returns to the row that opened it, the address is cleared; focus enters the panel on open.
- The New job sheet's honesty: "No day yet, nothing is sent. The job waits on the Schedule's Unscheduled list." and customer search by phone and street.
- Place all's preview ("Undo inside the minute sends nothing") and the Move dialog's line "Hannah needs to be home, so the text asks them to reply YES or pick another day."
- Cancel job's confirm: "Its lines are canceled and its visits not done come off the schedule. The customer is not told. Nothing is deleted."
- Empty states: "No jobs match. Clear filters"; the Schedule's "Every job has a day."
- The phone shell: labeled bottom bar (Home, Schedule, Jobs, Customers, More), no horizontal page scroll at 390 px on any screen, panels are full sheets.
- Money words on Home and Jobs ("Paid, check", "$145 · Paid").

## 5. Not built yet that Ryan would hit

- Open slots in Move and Place (Move's time is a plain 7:00 am to 5:00 pm list): step 7.
- Block time for a day off ("Day off" shows on Sun 22, nothing writes one from the Schedule).
- Reports beyond the month's numbers: step 8.
- Photos on the visit panel: step 4b.
- Quotes: "Quote later" and "Needs a quote" are words with no quote screen.

## 6. What I could not test, and why

- On my way and Mark done up to "How is this paid?": they need a today visit that is not done; today's three are Done and I will not give a job a day. Read `src/lib/money/collect.ts` instead: the card on file is first and preselected, Pay later only without a card, a Season Pass visit reads "Charge the card as agreed". Not seen on screen.
- The invoice path on a Done and unpaid job: none exists on the live data.
- Drag on the Schedule: not performed (it texts through Move).
- The Move caret menu ("Move without texting"): the caret exists (41 x 44) but its menu did not open under a scripted click; unverified.
- Real phone: the 390 px iframe is faithful for layout and tap size, not keyboards or touch scrolling. `resize_window` did not change the viewport.
- Sign out and back in: skipped (not confirmed passwordless).
- Reports and Settings were read as text, not exercised; Save never pressed.
- Slow spots: only Add job (4.4 s) and Cancel job (3.7 s) were over two seconds; the map tiles did not paint in the laptop screenshot.

### Needs Hannah's yes

- Place or Place all confirm (sets a day, texts Hannah's phone after 60 s).
- "Move and text the customer" and "Move without texting" on a scheduled visit.
- Mark done and "How is this paid?" (card, check, Venmo, cash, invoice, later).
- On my way, Send a text, Send an invoice, Customer confirmed.
- Property Save, Settings Save.
