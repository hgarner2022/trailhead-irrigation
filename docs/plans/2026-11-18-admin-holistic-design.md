# The admin and Settings as one system (design)

Nov 18 2026. Design only; nothing is built until Hannah has read it. It is the one picture every later build is a step of, so nothing is invented screen by screen again. It reconciles `admin-hierarchy-design`, `done-and-paid-design`, `week-planning-design`, `routes-and-seasons-answers` (PR #72, background only), `admin-ux-audit`, `status-words-audit`, `online-booking-design` and the two portal docs; where they disagree this one decides and says so. Key screens are drawn in Figma (section 14). Hannah's method was questions first; her ten answers are folded in below and are not open.

## 0. What is settled

| Decision | Consequence |
|---|---|
| Visits leaves the left column. A visit is one trip to the house; the word shows on screen only inside a job (its Visits section and the visit panel, which names its job) and on the customer side. This doc and the code still say "visit" | Elsewhere a row is named by its job and day; "stop" is only a place in a day's order |
| Settings is five tabs: People, Services, Billing, Messages, API keys. No seasons, Routes, Areas or Capacity tab | Capacity per kind lives on the person; bookable from and to on the service; nothing else decides which days are offered |
| More than one truck, Jobber's way: a new truck is a new person with working days and daily capacity by kind | A day is open while anyone has room; New job's Who defaults to "First with room" |
| One scheduling rule, no setting (section 6): offer the days best for the current schedule | Soonest first, nearness within the soon days; tomorrow is the earliest; when full, keep offering as far as the service's dates run; no waitlist |
| Capacity is a count per kind per person. Service minutes only order the day and derive the window | Customers pick a day, never a time; the window is told the day before |
| Order the day runs only when pressed, with Undo | It assigns stops to people and orders them by drive time; Ryan drags a stop between people's rows to override |
| Anyone on a truck may take any payment, and a tech sees the gate code and access note for every visit they have had | Section 11 |
| One Save bar on all Settings; the phone bar is Home, Schedule, Jobs, Customers, More | Sections 4 and 8 |
| Season Pass sells Nov 1 to Jun 15; the office may book any service any day; no buffer, repairs are their own capacity kind | Section 8 |
| Move is a split button: "Move and text the customer" (primary), "Move without texting" (caret), an optional line. Silence is yes, except a property that must be home: "Reply YES or pick another day", shown as "Waiting on customer". Every visit text carries a signed one-visit link that opens that visit signed in | Section 5.2 |


## 1. What the best products do, and what we take

Sources are vendor help pages. Where a page was not opened or said nothing, it is marked.

| Product | What it does | We take |
|---|---|---|
| [Jobber](https://help.getjobber.com/en/articles/work-settings/) | Settings from one gear: Company, Work (quotes, jobs, invoices), Team, Products and services. Work settings hold arrival window and invoice terms. Per-service booking availability not found in its help | Settings grouped by what you are setting up, not by database table |
| [Housecall Pro](https://help.housecallpro.com/en/articles/7919484-settings-page-overview), [booking](https://help.housecallpro.com/en/articles/7034474-new-online-booking-settings) | Left rail of settings, sub-tabs on top. Each service has a "Show this service in Online Booking" toggle; its duration lives in the price book; employees are chosen for online booking | The service row owns its online switch and its minutes; a person owns who takes visits |
| [ServiceTitan](https://help.servicetitan.com/docs/configure-manage-your-account-1) | Settings home; roles set scope and defaults per user; zones and skills restrict who may take a job | Roles on the person |
| [Linear](https://linear.app/now/behind-the-latest-design-refresh), [shortcuts](https://linear.app/docs/creating-issues) | Dimmed navigation so the work area leads; softer borders; fewer icons; actions in predictable places; Cmd+K command bar, C to create | A navy rail that recedes; one place for every action; Cmd+K and N on a laptop |
| Stripe ([empty states](https://docs.stripe.com/stripe-apps/patterns/empty-state.md)) | Empty means first use, nothing matched, or all removed; "Clear filters" sits in the filter bar; loading, then error, then empty, then content | The empty-state table in section 9; the render order |
| Shopify ([index](https://shopify.dev/docs/api/app-home/latest/patterns/templates/resource-index), [save bar](https://shopify.dev/docs/api/app-bridge-library/reference/contextual-save-bar)) | One primary action slot per page, others secondary; an index page is a full-width table with filters; settings pages show a Save and Discard bar only once a field changed | One filled button per page header; one save bar for all Settings |

Not found: a first-party Stripe Dashboard design write-up (the Stripe pages above are for Stripe Apps) and Jobber's per-service booking dates. Our "bookable from and to" is the architect's answer, modelled on Housecall Pro's per-service switch.

## 2. The direction

Trailhead's admin looks like a well-kept trail map, not a spreadsheet: a cream canvas, a quiet navy rail that recedes (Linear's lesson), numbers set large in Barlow Condensed, everything else in calm Source Sans 3. Orange is spent on one thing per screen, the primary action, and on the lit nav item; it is never decoration. Structure comes from whitespace and hairlines, not boxes inside boxes. **A screen must never** show two filled buttons, a pill that repeats its own heading, a word an engineer would say ("webhook", "task gave up", "truck"), a table that only works sideways on a phone, a form that grows inside a panel, or a second panel stacked on the first.



## 3. Jobs to be done across the admin

| # | Who | Wants to | Today's screen | What is wrong today | Now |
|---|---|---|---|---|---|
| 1 | Ryan, in the truck | See today's stops in order and open one | Home, Schedule day | Straight-line order; the map draws late; Needs action rows leave the screen | 5.1, 5.2 |
| 2 | Any person on a truck | Finish a job's visit and take payment | Visit panel | One click marks done and records a payment; a wall of inline forms | 7 |
| 3 | Hannah or Ryan, on a call | Take a call and make a job | New job sheet | Refuses a job with no day; 17 service entries | 5.3 |
| 4 | Hannah | Give a job a day, move it | Visits, Schedule | Visits in the nav; no New job on the Schedule; Move texts always | 4, 5.2 |
| 5 | Ryan | See which days are filling and where | Schedule week | No sense of neighbourhood; one person assumed | 5.2, 6 |
| 6 | The customer | Pick or change a day | Checkout, `/book`, portal | Three pickers, days from unset area groups | 6 |
| 7 | Hannah | Know who is calling | Customers | Name-only search; one-off jobs invisible | 5.5 |
| 8 | Hannah | See what is unpaid and chase it | Home, Jobs | Engineer words; two competing primaries | 7, 10 |
| 9 | Hannah | See the month | Reports | Passes only | 5.6 |
| 10 | Hannah | Change a person, service or message | Settings, seven tabs | Three save habits; rejected tabs | 8 |
| 11 | Ryan | Say when a service may be booked | Seasons, Capacity | Four date fields per season | 8.2 |
| 12 | Hannah | Add a second truck | People | A login row and a truck row for one person | 8.1 |
| 13 | A tech | Open the gate, do the work, get paid | Visit panel | Gate code hidden; no money path | 7, 11 |
| 14 | Anyone | Undo a payment or cancel | A toast | Nothing once it fades; no one-off cancel | 7 |

## 4. Navigation and information architecture

A customer has jobs, a job is done in visits, and the Schedule says when. The left column is Home, Schedule, Jobs, Customers, Reports, Settings.

| Screen | Its one job | Primary button |
|---|---|---|
| Home (h1 "Today") | What needs me this morning, and what is today | New job |
| Schedule | Which day and which person; place what has no day; order the day | New job |
| Jobs | Everything sold: worth, paid, what is left | New job |
| Customers | Who is this and how do I reach them | New job |
| Reports | The month in numbers | none (Export per table) |
| Settings | The few things set once | Save, only when something changed |

**Where visits went.** The Schedule's third view, **List** (Week, Day, List), is the old Visits grid under another name; `/admin/visits` redirects to `/admin/schedule?view=list`. Its rows read "Spring turn-on, Andrea Reyes, Tue Apr 28". Today's work is Home, a day's is Day, work with no day is Unscheduled, any other slice is List.

**How a record opens.** One panel at a time over the screen you are on (`?customer=`, `?job=`, `?visit=`, `?day=`). The address holds it, so Back returns to the last record; a panel opened from another shows "‹ Andrea Reyes" above its title. Close returns to the grid with the row lit. A row's first column is the only link; "Job", "Next" and "Customer" lines inside a panel open that record in place.

**New job is on every screen**, the one primary in the page header. On the Schedule every day header has a "+" and an empty cell in a person's row opens New job with that day and person filled. Day is optional everywhere.

**Keyboard (laptop).** Cmd or Ctrl+K searches customers (name, street, phone), jobs and days; N opens New job; Esc closes the panel; arrows move the Schedule's week. Nothing needs a keyboard.

```
LAPTOP 1440                                           PHONE 375
+------+--------------------------------------+      +----------------------+
| Trail| Today   Tue, Nov 24      [ New job ] |      | [logo]    [+ New job]|
| head |--------------------------------------|      | Today                |
| Home*|  (the screen)                        |      |  (the screen,        |
| Sched|                                      |      |   one column)        |
| Jobs |                                      |      |----------------------|
| Cust |                                      |      | Home Sched Jobs Cust |
| Rept |                                      |      |             More v   |
| Sett |                                      |      +----------------------+
+------+--------------------------------------+      More: Reports, Settings
```

The rail is navy at 240px, icons only below 1024px, the lit item `sidebar-primary`. On a phone a record is a full sheet and the bottom bar has four tabs and More.

## 5. The screens as they should finally be

"Changes" are against today's build.

### 5.1 Home (Today)

| Part | Final | Changes |
|---|---|---|
| Header | "Today", "Tuesday, November 24"; primary New job | Title was Home |
| Money strip | Today, Done, Ahead, Unpaid (`StatTile` row), "View schedule" | Built with `StatTile` |
| The day | By job or By person: Past its window, Ahead today, Done today; a row opens its panel in place | Wording only |
| Map | Right of the list; under it on a phone; a placeholder while it draws | Placeholder |
| Needs action | One plain row, one button; **the row opens its record in place** | Opens in place; words in section 10 |
| Reminders | "Fall blowout opens Sep 28. Check your days." four weeks before a service's "bookable from" | Reads Services dates |
| Waiting | "Waiting on customer: Jim P. was asked to confirm Thu" | New |

```
LAPTOP                                                    PHONE
Today  Tuesday, November 24                 [New job]     Today        [+ New job]
[Today $870] [Done $290] [Ahead $580] [Unpaid $145]       Tuesday, Nov 24
Past its window (1)          | map, pins numbered         [Today][Done][Ahead][Unpaid]
 8-10  Ann L. Erie  Repair   | per person                 Needs action (1)
Ahead today (4)              |                             Andrea's repair is done,
 10-12 Mia R. Erie  Turn-on  |                             $145 unpaid  [Collect]
Done today (2)  By person    |                            Ahead today (4)
Needs action (1)             |                             10-12 Mia R. Erie Turn-on
 Andrea's repair is done, $145 unpaid       [Collect $145]
```

### 5.2 Schedule

Week, Day and List for one person or several. Every person who takes visits is a row; a second truck is a second row, nothing more.

| Part | Final | Changes |
|---|---|---|
| Header | "Schedule", the week; Week, Day, List; arrows and Today; primary New job | New job added |
| Week | A row per person, seven columns, a one-line stop with its area bar. Each day header shows how full it is ("5 of 8") and the towns already in it ("Erie 3, Lafayette 2") so Ryan sees the day filling by neighbourhood | Fill and towns are new |
| Day | The day's stops per person in order beside one map; each person's route in their colour, pins numbered per person | Two people; map colour per person |
| List | The old Visits grid | Moved here |
| Unscheduled | Under the week, a row per job with no day; **Place** opens "Tue Nov 24, we're already in Erie that day · Fri Nov 27 · Tue Dec 1 · Another day" (the section 6 ranking, with its reason); one pick places it, picks "First with room" for Who, and texts the customer, with Undo | Includes one-off jobs; ranked days |
| Place all | A quiet "Place all 3" when the list has rows; same ranking, shows what it did | Was the unexplained "Schedule" |
| Order the day | Day view only, an outline button; see below | New |
| Move | Drag a stop to another day or person, or Move in its panel; one dialog, below | New dialog |

**Order the day.** Pressed on a day with two or more stops. It assigns each stop that has no person to the first person with room, then orders every person's stops by drive time, using each service's minutes. A stop Ryan placed by hand on a person stays with that person and is only ordered. A strip appears: "Ordered Tue Nov 24: Ryan 5 stops, 1 h 40 driving. Sam 4 stops, 1 h 10. [Undo]". The list renumbers per person and the map redraws each route in the person's colour. It sends nothing: the order is not a promise; the window is derived from it and told the day before. Today a plain algorithm does it; the routing engine and later Jev sit behind the same button (week-planning section 4). Under two stops the button is off with "Needs two or more stops".

**Move.** Dropping a stop (or choosing Move) opens one dialog: the day, the person, an optional line to the customer. Its button is split: **Move and text the customer** is primary, **Move without texting** is under the caret. A customer need not confirm (silence is yes). A property that must be home gets "Reply YES or pick another day"; the stop shows **Waiting on customer** until they answer. Every visit text carries a signed link that opens that visit signed in.

```
WEEK, two people                                           PHONE (one day at a time)
Schedule  Nov 23 to 29  <  Today  >  [Week|Day|List] [New job]  Schedule  [+ New job]
           Mon 23    Tue 24     Wed 25    Thu 26   Fri 27        [Week|Day|List] < Nov 23 >
           5 of 8    7 of 8     3 of 8    .        6 of 8         Mon 23  5 of 8
           Erie 3..  Lafay 4..  Longm 2   .        Erie 5         Ryan
Ryan      [8 Ann L.][8 Mia R.]  [10 Cy B.]  [+]    [8 Jo T.]       8-10 Ann L. Repair
Sam       [9 Lena ] [9 Omar ]   [+]        [+]     [+]             Sam
Unscheduled (2)                          [Place all 2]            9-11 Lena K. Turn-on
 Jim P. Erie Repair   [Place]  -> Tue Nov 24, we're already in Erie that day
```

```
DAY, Tue Nov 24                         [Order the day]  [New job]
Ryan  1 8:00 Mia R. Erie    2 9:15 Cy B. Erie   3 10:30 ...        +------------------+
Sam   1 8:30 Omar S. Lafayette  2 9:40 ...                          | map: Ryan route  |
Ordered Tue Nov 24: Ryan 5 stops, 1 h 40 driving. Sam 4...  [Undo]  | in navy, Sam in  |
                                                                     | orange, numbered |
```

### 5.3 New job (sheet)

One sheet from every screen; the same `ServicePicker` the customer sees, in its office variant. Fields in order: Customer (name, street or phone, "New customer" inside it), What are we doing (Season Pass first, then services), Zones (if the price depends on them), Day, Who, Notes, **Add job**.

| Field | Behaviour |
|---|---|
| Day | Optional and empty; under it the ranked days as chips ("Tue Nov 24, we're already in Erie that day"); typing any date is allowed, out of season included |
| Who | Defaults to **First with room**; the select lists every person who takes visits |
| Opened from a day | "Tuesday, Nov 24" at the top, Day set, Who set if opened from a person's row |
| After Add job | The new job's panel opens in place of the sheet; a job with a day and no Who is texted only once a person is set |

```
LAPTOP sheet (480)                          PHONE (full sheet)
New job                              X      New job                 X
Customer  [Andrea Reyes ........]           Customer [Andrea Reyes]
What      [Sprinkler repair  v ]            What     [Repair v]
Day       [          ]  Tue Nov 24 (we're   Day      [        ]
          already in Erie that day) ...     Who      [First with room v]
Who       [First with room    v]            Notes
Notes     [.....................]           [ Add job ]
          [ Add job ]
```

### 5.4 Jobs

Header "Jobs", "N jobs this season. M unpaid. K need a quote."; New job. Eight columns at most (spans of 12): Customer 3 (link), Job 2, Status 1, Progress 1 ("1 of 2 done"), Total 1, Money 2, Next 2; hidden Property, Created. Filters Status, Money, Job, Season. Open invoices first, then newest. Changes: one Money shape ("$145 · Invoice sent, due Dec 1", "$115 unpaid", "$145 · Paid"); "created", not "sold", for a repair; the whole row opens on a phone.

### 5.5 Customers

Header "Customers", New job. Columns: Name 3 (link), Phone 2, Town 1, Pass 2, Unpaid 1, Next 2, Last job 1; hidden Address, Email, Scheduled, Marketing. Search by name, street or phone. Unpaid is the sum over the customer's jobs. Phone: a card row, name over a muted phone, "$115 unpaid" or the next day at the right, 64px, the row opens the panel; the phone number is a tap-to-call link there.

### 5.6 Reports

Header "Reports", no primary. Tiles (`StatTile`, baseline in words): Revenue, Outstanding, Jobs sold, Passes sold, Invoices past due, Jobs needing a day. Then revenue by month (this year orange, last year dashed navy), the season line, and "Upcoming charges" (jobs with a card on file). Changes: every number reads all jobs; no "Quotes awaiting" until quotes exist; Export per table. Phone: tiles two across, charts full width, tables as card rows.

## 6. The scheduling rule

**One rule, no setting.** Offer the customer the days that fit our current schedule best. A day is *open* for a service when it is tomorrow or later, inside the service's bookable dates, and some person who works that day still has room for that kind. Days are offered **soonest first**; among the soon days (the next two weeks) the ones where we are already in the customer's town come first, then days with a stop within about ten minutes' drive, then any other open day. The first is preselected. When the soon days are full the offer keeps going as far as the service's dates run; there is no waitlist. The customer reads one line under a day that earned its place: "Tuesday, April 28: we're already in Erie that day". A day that is merely open has no line. The customer picks a day, never a time; the window is told the day before. The two weeks and the ten minutes are constants in code.

| Question | Answer |
|---|---|
| Reads | Stops with their property town and coordinates; each person's working days and capacity by kind; the service's kind and bookable dates; the customer's address |
| Lives in | `schedule.offerDays`, which exists for pass visits as area days; widened to take a service and an address, and returning `{ day, reason: "same-town" \| "near" \| "open" }` from one pure `rankDays` |
| Used by | The pass checkout, `/book`, the portal's reschedule (five days, the current one left out), the Schedule's Place list, New job's Day chips |
| Two trucks | Open means any person has room; the count adds both people's capacity for the kind |
| First in a town | With nobody in the town yet, the nearest open days are offered and the first booking seeds the town's day |
| Ryan sees | Each Schedule day's fill and towns (5.2); the Place list shows the same reason in words |
| Later, Jev | Replaces `rankDays` behind the same function and the `schedule.plans` seam; it may reorder the open set, never offer a day outside it; the explanation line stays the customer's wording |

PR #72's Jobber pattern (Erie and Firestone Monday and Friday, the south Tuesday and Thursday, Longmont Wednesday) is only a check that this rule, run on last season's visits, reproduces what Ryan did; it is not a setting.

## 7. The visit panel and the job panel

Both are `RecordPanel`: header, facts, sections, footer. The facts, sections and footer of `admin-hierarchy-design` section 3 stand, with done-and-paid folded in and "bill" worded "invoice". Pills go under the subtitle; the label column is 112px; one Close. The visit panel names its job in one line and links up to it.

**Visit panel, by state** (primary filled, up to two outline, More, one destructive ghost):

| State | Primary | Secondary | More | Destructive |
|---|---|---|---|---|
| Unscheduled | Place | Edit | Send a text | Cancel visit |
| Scheduled, before its day | Move | Edit | Send a text | Cancel visit |
| Scheduled, its day or past | Mark done | Move, Not done | Edit, Send a text, On my way | Cancel visit |
| Done, beat two open | the choice's button ("Charge $145") | none | none | none |
| Done, unpaid | Collect $145 | Open job | Send a text | none |
| Done, paid | Open job | none | Send a text | none |

**Mark done** opens beat two on the same panel at once and never charges: "How is this paid?" with the card on file preselected ("Charge the Visa ending 4242 now. Charges $145 to the card and emails a receipt"), Check, Venmo, Cash ("Record $145 paid"), Send an invoice ("Texts a pay link, due in 14 days"), and Pay later only for a customer with no card. A Season Pass reads "Charge the card as agreed" with "Paid another way" folded under it. Anyone on a truck may take any of these. While it runs: "Charging $145 to the Visa ending 4242"; after: "Paid, card. Receipt emailed to Andrea." A refusal: "The card didn't go through. Choose another way." and the customer is emailed at once. The morning after, a done visit with a card and no payment is a Home row: "Card not charged for Andrea's spring turn-on", **Charge $145**.

**Job panel, by state:**

| State | Primary | Secondary | More | Destructive |
|---|---|---|---|---|
| Needs a quote | Add a line | New visit | none | Cancel job |
| Open, a visit ahead | Open visit | Add a line | Record the payment, New visit | Cancel job |
| Open, no visit | New visit | Add a line | Record the payment | Cancel job |
| Done, unpaid | Collect $145 | Send an invoice | Record the payment, New visit | none |
| Invoice sent or Past due | Remind | Record the payment | Open the pay link | none |
| Done, paid | New visit | none | none | none |
| Season Pass | Change the pass | Send card link | Resend confirmation, Open in Stripe | Cancel pass |

Collect $145 on a job opens the same `CollectPayment` as one dialog; a footer button opens at most one. Cancel job is refused with "This job has a payment. Refund it first."

```
LAPTOP: visit panel after Mark done                PHONE
+---------------------------------+               +------------------------+
| ‹ Andrea Reyes                  |               | < Andrea Reyes       X |
| Spring turn-on, Tue Apr 28    X |               | Spring turn-on, Apr 28 |
| [Done] [$145 unpaid]            |               | [Done] [$145 unpaid]   |
|---------------------------------|               | How is this paid?      |
| How is this paid?               |               | (o) Charge the Visa    |
| (o) Charge the Visa ending 4242 |               |     ending 4242 now    |
|     Charges $145, emails receipt|               | ( ) Check  ( ) Venmo   |
| ( ) Check ( ) Venmo ( ) Cash    |               | ( ) Cash ( ) Invoice   |
| ( ) Send an invoice             |               | [  Charge $145  ]      |
|---------------------------------|               +------------------------+
| [ Charge $145 ]                 |
+---------------------------------+
```

Checking the running done-and-paid build: the choice list and words above, the card preselected only with a real card, Done never charging, one `CollectPayment` used by both panels, the footer shapes in the tables.

## 8. Settings, whole

Five entries in a list at the left of the content: **People, Services, Billing, Messages, API keys** (a drilling list on a phone). Every entry saves one way: nothing saves while typing; the first change shows a bar, "Unsaved changes. [Discard] [Save]", leaving asks first, and Save writes one line per field to the change log ("Changes", top right of the list).

### 8.1 People

One row per person; the login and the truck are one record. A person's email is how they sign in (an email link). "Takes visits" decides whether they are a row on the Schedule (it replaces the truck label, never shown). Roles: Owner (everything), Admin (everything but Billing and API keys), Tech (section 11). The last owner stays. **A new truck is a new person here**: name, email, Takes visits, working days, daily capacity by kind.

```
LAPTOP                                                          PHONE
People                                         [Add person]     People [Add person]
Name              Role    Takes visits  Works      Per day      Ryan Garner     Owner
Ryan Garner       Owner   Yes           Mon-Fri    8 blowouts   ryan@...  Takes visits
ryan@...                                                         Sam Torres      Tech
Sam Torres        Tech    Yes           Mon-Fri    8 blowouts   Takes visits
(a row opens the person's sheet)
Sheet: Name, Email (sign-in), Phone, Role, Takes visits, Works (day chips),
 Visits a day (turn-on, inspection, blowout, repair, other), On from, until, Remove
```

Capacity per kind stays here and drives which days are open; Ryan may still place past it by hand ("Over capacity, place anyway?"). Repairs are their own kind, which is the room held back for them. Jobber user stays under "Advanced" until the Jobber switch.

### 8.2 Services

One service per row; the 17 catalogue rows fold by kind (zone bands become "up to N zones" plus "each extra zone"). Seasonal services carry optional **Bookable from** and **to** (month and day, repeating yearly; empty means all year; a "to" before the "from" wraps New Year). The pass, the booking flow and Home's reminders read these. The office's New job leaves every service selectable.

| Column | Meaning |
|---|---|
| Name | Customer-facing ("Spring turn-on") |
| Price, Zones, Extra zone | Price for the included zones, how many, and the price per extra zone; "Quoted" for a quote-only service |
| Minutes | Used only to order the day and derive the window; not capacity |
| Online | Book a day, We quote, Off |
| Bookable | "Apr 15 to Jun 15" or "All year"; Season Pass "Nov 1 to Jun 15" |
| Taxable, Active | Switches |

```
LAPTOP                                                            PHONE
Services                          Remind me [4] weeks before a   Services
Name            Price  Zones  Extra  Min Online     Bookable       service opens
Season Pass     from   -      -      -   Book a day Nov 1-Jun 15  Spring turn-on   $145
Spring turn-on  $145   8      $10    60  Book a day Apr 15-Jun 15  up to 8 zones  >
Fall blowout    $95    6      $10    45  Book a day Sep 28-Nov 15 (a row opens a sheet:
Sprinkler repair $145  -      -      120 Book a day All year       description, price,
New system      Quoted -      -      -   We quote   All year        zones, minutes, online,
Sheet also holds: What's included (no prices), Taxable, Active.      dates, Taxable, Active)
```

### 8.3 Billing, Messages, API keys

As built, on the Save bar; no content changes. Messages adds the move texts: "Move and text the customer" (with the optional line), the "Reply YES or pick another day" ask for a must-be-home property, and the signed one-visit link in every visit text.

### 8.4 Where every old field went

| Old field | Now | Why |
|---|---|---|
| Area name, towns, weekday | Dropped | Jobber keeps no town-to-day rule; days come from capacity, dates and nearness (section 6) |
| Fall and spring town order | Dropped | Order the day orders by drive time; the soonest-first rule needs no order |
| Season windows opens, closes | Services: Bookable from and to, per service | Hannah: not seasons; the service carries its dates |
| Lead weeks (and the hidden "plus two") | Services: "Remind me N weeks before a service opens" | One honest number |
| Buffer, early and late | Dropped | Repairs are their own capacity kind per person |
| Capacity by kind, working days, season from and to | Stay on the person | Capacity stays on the person |

## 9. One component recipe

Every admin screen is built from these; a screen holds no markup of its own for a list, panel, dialog or form.

| Part | Rule | Block (status) |
|---|---|---|
| Page header | 56px bar: title and one muted line left; at most **one filled button** at the right | `PageHeader` (kept; gate counts filled buttons) |
| Grid | Eight columns at most, spans of 12, first column the one link, every column sorts, filter chips, one count line, 44px rows; phone card rows (64px) | `DataGrid` (kept) |
| Record panel | Header, facts (112px labels), sections, footer; Customer, Job, Visit, Person, Service | `RecordPanel` (new; replaces `PanelParts`, `PassActions`, the footers) |
| Footer bar | One primary, up to two outline, More, one destructive ghost; acts with Undo or opens one dialog | `RecordFooter` (new) |
| Sheet | Form beside the page for making or editing (New job, a person, a service) | `SidePanel variant="sheet"` (extended) |
| Dialog | One question, 400px; a destructive confirm reads "Keep it" and "Cancel visit"; never over a dialog | `ConfirmDialog` (moved up from `ConfirmCancel`) |
| Split button | Primary action with a caret for its quieter twin (Move) | `SplitButton` (new, from `ui/`) |
| Pill | The only status chip: neutral (Scheduled, Open, Waiting on customer), positive (Paid, Done, Active), warning (Past due, Needs a quote), destructive (Failed, Canceled); under a panel's subtitle or at a row's right, never in a grid cell | `StatusPill` (kept; `JobPill` merges in) |
| Money word | Plain text from `words.ts`; warning colour only for Past due and Failed | `MoneyCell` (new, thin) |
| Empty state | Title, one line, at most one button; a "No match" variant with Clear filters | `EmptyState` (kept) |
| Form row | Label above, hint under, error under, 44px control | `FormRow` (promoted from `settings-tabs/fields.tsx`) |
| Save bar, settings list | Section 8 | `SaveBar`, `SettingsList` (new) |
| Section heading | Barlow Condensed 18px navy | `SectionHeading` (merges `PanelHeading`, `CardTitleHeading`) |
| Collect | Beat two and the job's dialog | `CollectPayment` (new, done-and-paid) |
| Service picker | One list for Ryan and the customer | `ServicePicker`, `ZonesField` |
| Day strip | A day header with fill and towns; the stop row; the per-person route colours | `DayHeader`, `StopRow` (new, built on `WeekGrid`) |
| View control | Week, Day, List | `SegmentedControl` (new, from `ui/`) |

Kept: `AdminShell` (bottom bar with More), `SidePanel`, `WeekGrid`, `DayMap` (route per person), `StatTile`, `Chart`, `NotesAndHistory`, `ChangeLog`, `NeedsAttention` (rows through one `ActionRow`), `TodayGroup`, `TodayVisitRow`, `UndoToast`, `AddressSearch`, the pass blocks. Renamed: `ToScheduleTray` to `UnscheduledList`. Merged: `TodayMoney` into a `StatTile` row; `MessageThread` into `NotesAndHistory`. Retired: the Visits page chrome (the grid lives on), the Settings `Areas` and `Capacity` tabs, `ScheduleSeasonButton`. Customer-side blocks are not part of this system.

**What the design gate enforces** (added to `scripts/design-gate/`):

| Rule | Check |
|---|---|
| One primary per page | A `PageHeader` has at most one `variant="default"` button |
| No filled buttons in a panel body | Only `RecordFooter` and the sheet's footer |
| Words from one file | "Owed", "Overdue", "Bill", "Cancelled", "Lapsed", "Truck" fail in the admin tree; status and money text comes from `words.ts` |
| "Visit" only where allowed | The string fails in admin screens outside the job panel and the visit panel |
| Overlays through blocks | `ui/dialog`, `ui/sheet`, `ui/popover` imported only from `blocks/` |
| No screen markup for a list or form | `<table>` and `<label>` outside `DataGrid` and `FormRow` fail |
| Eight columns, stories | A `columns` array over eight fails; each new block has Default, Empty, Phone stories |

## 10. Words

| Record | Words | Read from |
|---|---|---|
| Visit | Unscheduled, Scheduled, Waiting on customer, Done, Canceled | day, done date, answer, cancel; a visit that could not be finished goes back to Unscheduled with the reason as a note ("Not done" is only the button) |
| Job | Needs a quote, Quote sent, Open, Done, Canceled | lines, dates, visits |
| Pass | Pending, Active, Expired, Canceled | job and year |
| Money | Paid (card, Venmo, check, cash), $145 unpaid, Invoice sent due Dec 1, Past due since Dec 1, Failed, Charging, Card not charged | payment rows and invoice |
| Home | Past its window, Done unpaid, Invoice past due, Card failed, Card not charged, Needs a day, Waiting on customer | facts |

**Buttons, one list.** New (the sheet: New job), Add (a small thing on a record: Add a line, Add a note, Add person), Place, Move, Move and text the customer, Move without texting, Order the day, Mark done, Not done, Collect $145 or Charge $145, Record $145 paid, Send an invoice, Remind, Send a text, Send card link, On my way, Edit, Save, Discard, Close, Back, Undo, Export, Clear filters. Destructive: Cancel visit, Cancel job, Cancel pass (a confirm says "Keep it" and the same destructive words). A form's dismiss is "Cancel". Never "Submit", "OK", "Bill", "Schedule" alone.

| Where | Title and line | Empty state | Button |
|---|---|---|---|
| Home, nothing booked | Today, Tuesday, November 24 | Nothing booked today. Jobs with no day wait on the Schedule. | Open Schedule |
| Needs action empty | Needs action | Nothing needs you. | none |
| Unscheduled empty | Unscheduled | Every job has a day. | none |
| Jobs | Jobs | No jobs yet. A job is what you sell: a repair, a turn-on, a pass. | New job |
| Jobs, no match | Jobs | No jobs match. | Clear filters |
| Customers | Customers | No customers yet. A customer is added when you make a job. | New job |
| Reports | Reports | Numbers show here once a job is paid. | none |
| People | People | You are the only person. Add someone who takes visits. | Add person |
| Load failed | the screen's title | We couldn't load this. Try again, or reload the page. | Try again |

Render order everywhere: loading skeleton, error, empty, content (Stripe).

## 11. What a tech sees versus an owner

| Surface | Owner and Admin | Tech |
|---|---|---|
| Nav | All six | Home, Schedule, Jobs, Customers (no More) |
| Home, Schedule | Everything, all people | Everything on the schedule, read-only, with Mark done and Collect on any visit; no money strip |
| Jobs, Customers | Full | Name, address, phone (tap to call), services, prices and money words, notes; no email, marketing consent, change log |
| Visit panel | All, with footer | At the property including **gate code and access note for every visit they have had**; Mark done, Not done, On my way, Collect (any method) |
| Done | Beat two | Beat two: **anyone on a truck may take any payment** |
| Settings, Reports | Owner all; Admin all but Billing and API keys | Not shown |

A tech never sees the change log, a Jobber link or a customer's email. This is shaped at the API (as built), not only hidden on screen.

## 12. Build order

Each step leaves the admin whole. The two running builds stay on their branches and are checked against this doc before merging; where they differ a follow-up brings them in line, never a revert.

| # | Step | Folds in |
|---|---|---|
| 0 | Merge portal v2 and done-and-paid after the fixes in section 13. **PR #75 already covers** `CollectPayment`, Mark done then "How is this paid?" (as two dialogs), `payments.chargeCard`, Card failed and Card not charged on Home, and a check, Venmo or cash refund; it covers none of steps 1 to 9 otherwise | PR #75, portal v2 (number to come); PR #72 kept only as the Jobber-pattern check |
| 1 | Foundation: `words.ts` words, `RecordPanel`, `RecordFooter`, `ConfirmDialog`, `SectionHeading`, `FormRow`, `SplitButton`, the gate rules; the three record panels move onto it | hierarchy design 3 and 5; audit item 1 |
| 2 | Navigation: Visits into Schedule's List, `?customer=` and Back, New job everywhere and on a day, the phone bar with More, Cmd+K | hierarchy design; audit items 2 and 7 |
| 3 | Schedule and Home for one or many people: person rows, Unscheduled for every job, Place and Place all, drag between rows, the Move dialog (split button, optional line, Waiting on customer), Needs action in place, plain words | audit items 1 and 6; the messages build for the move texts, the "Reply YES" ask and the signed one-visit link |
| 4 | **Move**: the split button "Move and text the customer" with "Move without texting", the optional line, "Waiting on customer" for a must-be-home property, and the "Reply YES or pick another day" text; replaces the visit panel's inline Move form (PR #75 left it as it was) | the messages build; portal v2's signed one-visit link |
| 5 | Settings shell, People, Services: `SettingsList`, `SaveBar`, Takes visits, one row per service, bookable from and to, bands folded in the UI (bands stay rows; one edit writes the kind's rows; first check the band prices follow the zones rule); the Areas, Capacity and Seasons tabs and their fields go, with a migration dropping them | status audit; week planning 3 (without Routes) |
| 6 | The one rule: `rankDays` behind `schedule.offerDays`; the pass checkout, `/book`, the portal's reschedule, the Place list and New job's chips use it; fill and towns on the Schedule's day headers | week planning 5; online booking 4.4; portal v2 |
| 7 | Order the day: the button, the strip, Undo, the map per person; a plain drive-time algorithm first, then the routing engine, then Jev | week planning 4 |
| 8 | Reports on every job; the final column sets; phone card rows | hierarchy design 4 |
| 9 | Online booking reads the rule and the Services dates (its own plan) | online booking design |

Steps 1 to 4 need no migration. Step 5 adds `bookable_from` and `bookable_to` to the service and drops `area`, the windows, the buffers and the town orders after a check that nothing reads them. Step 6 needs property coordinates on stops (geocoded when the address is saved).

**Defaults I chose, for review:** "soon days" are the next two weeks; a stop Ryan placed by hand keeps its person when the day is ordered; the Waiting on customer pill is neutral, not a warning.

## 13. Where the builds in flight diverge

Read against this design; each row is the fix to send back before merging. "Accept" means it can merge as built and a later step brings it in line.

**PR #75, done and paid** (green; 50 files). Matches the design on: the card on file first and preselected, a Season Pass reading "Charge the card as agreed" with "Paid another way" folded, Pay later only with no card, Tap to pay greyed, Done charging nothing, `payments.chargeCard` as the only card charge, a decline emailing the card link, and the choice words.

| # | Divergence | Fix |
|---|---|---|
| 1 | Anyone on a truck may take any payment (settled), but the new charge and record handlers need a manager, so a tech cannot collect | Add one scope, `collect`, that the tech role holds: Mark done, `payments.chargeCard`, `payments.record`, `invoices.send`. Refund, cancel, Edit and price changes stay with owner and admin |
| 2 | Home's row is named "Charge not pressed"; the status words say "Card not charged" | Rename in `NeedsAttention` and `words.ts`; the row's button stays "Charge $145" |
| 3 | Home's empty line reads "Failed charges, unscheduled visits and visits nobody marked done show up here." and the title "Nothing needs you right now"; "visit" may appear only inside a job | "Nothing needs you." with the line "Failed cards, jobs with no day and work nobody marked done show up here." |
| 4 | Mark done's dismiss is "Never mind" | "Cancel" (a form's dismiss; "Keep it" is only for a destructive confirm) |
| 5 | Send an invoice is hidden for a done visit while other visits of the same job are ahead, so the choice vanishes unexplained | Accept the rule (an invoice covers the job), but keep the choice greyed with "Other visits of this job are ahead. Send the invoice after the last one." |
| 6 | A card payment cannot be refunded from the panel; only check, Venmo and cash can | Accept for this merge; add "Refund to card" through Stripe in step 1, and the derived "Refunded" word waits for Hannah's answer in done-and-paid section 8 |
| 7 | The visit panel's Move is still the old inline form; no split button, no optional line, no "Waiting on customer" | Not a #75 defect; this is step 4 of the build order |
| 8 | Mark done and "How is this paid?" are two dialogs one after the other, and the footer carries Undo done and Refund as outline buttons | Accept; at step 1 beat two moves onto the panel itself (the header turns Done, the body is `CollectPayment`) and Undo done and Refund move under More |
| 9 | "Charge not pressed" is computed at page load from the rows | Accept; it matches "read from facts" and needs no daily run |
| 10 | The footer is hand-built, not `RecordFooter` | Accept; step 1 moves every footer onto the recipe |

**Portal v2** (customer side: cancel, reschedule, one timeline, the window as a message, signed one-visit links in texts): the PR is not open yet. I will check it for: the signed link opening that visit signed in; the 24-hour rule from one function; `visits.cancelSelf` and the Home alert; the window shown only once the day-before text exists; days offered through `rankDays` rather than a second picker (step 6); a must-be-home customer shown "Waiting on customer" to the office; and that no admin screen gains the word "visit".

## 14. Figma

[Trailhead admin: holistic design](https://www.figma.com/design/9TYdPIzdG8MLrHJm4qiUBu) (Hannah's own Figma team). Seven frames on the Trailhead tokens: Today at 1440 and 375 (5.1), the Schedule week for two people with the Place list (5.2), the Day with Order the day and one map for two people (5.2), the New job sheet with Who as "First with room" (5.3), and the visit panel after Mark done at 1440 and 375 (7). They are in Inter standing in for Barlow Condensed and Source Sans 3; flat layouts, not a component library. The fenced wireframes cover the rest.
