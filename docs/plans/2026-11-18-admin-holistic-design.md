# The admin and Settings as one system (design)

Nov 18 2026. Design only; nothing is built until Hannah has read it. Hannah: "hold up on build, you need to design all this beautifully and holistically"; "I'm not worried about seasons, I'm confused by that"; "in other systems we just need to optimize schedules; we can remove and add things in the booking flow". This doc is the one picture every later build is a step of. It reconciles `admin-hierarchy-design`, `done-and-paid-design`, `week-planning-design`, `routes-and-seasons-answers` (PR #72), `admin-ux-audit`, `status-words-audit`, `online-booking-design` and the two portal docs, and where they disagree this one decides and says so. Key screens are drawn in Figma (section 12).

## 1. What the best products do, and what we take

Sources are vendor help pages. Where a page was not opened or said nothing, it is marked.

| Product | What it does | We take |
|---|---|---|
| [Jobber](https://help.getjobber.com/en/articles/work-settings/) | Settings from one gear: Company, Work (quotes, jobs, invoices), Team, Products and services. Work settings hold arrival window and invoice terms. Per-service booking availability not found in its help | Settings grouped by what you are setting up, not by database table |
| [Housecall Pro](https://help.housecallpro.com/en/articles/7919484-settings-page-overview), [booking](https://help.housecallpro.com/en/articles/7034474-new-online-booking-settings) | Left rail of settings, sub-tabs on top. Each service has a "Show this service in Online Booking" toggle; its duration lives in the price book; employees are chosen for online booking | The service row owns its online switch and its minutes; a person owns who takes visits |
| [ServiceTitan](https://help.servicetitan.com/docs/configure-manage-your-account-1) | Settings home; roles set scope and defaults per user; zones and skills restrict who may take a job | Roles on the person; a town is a rule, not a screen |
| [Linear](https://linear.app/now/behind-the-latest-design-refresh), [shortcuts](https://linear.app/docs/creating-issues) | Dimmed navigation so the work area leads; softer borders; fewer icons; actions in predictable places; Cmd+K command bar, C to create | A navy rail that recedes; one place for every action; Cmd+K and N on a laptop |
| Stripe ([empty states](https://docs.stripe.com/stripe-apps/patterns/empty-state.md)) | Empty means first use, nothing matched, or all removed; "Clear filters" sits in the filter bar; loading, then error, then empty, then content | The empty-state table in section 9; the render order |
| Shopify ([index](https://shopify.dev/docs/api/app-home/latest/patterns/templates/resource-index), [save bar](https://shopify.dev/docs/api/app-bridge-library/reference/contextual-save-bar)) | One primary action slot per page, others secondary; an index page is a full-width table with filters; settings pages show a Save and Discard bar only once a field changed | One filled button per page header; one save bar for all Settings |

Not found: a first-party Stripe Dashboard design write-up (the Stripe pages above are for Stripe Apps) and Jobber's per-service booking dates. Our "bookable from and to" is the architect's answer, modelled on Housecall Pro's per-service switch.

## 2. The direction

Trailhead's admin looks like a well-kept trail map, not a spreadsheet: a cream canvas, a quiet navy rail that recedes (Linear's lesson), numbers set large in Barlow Condensed, everything else in calm Source Sans 3. Orange is spent on one thing per screen, the primary action, and on the lit nav item; it is never decoration. Structure comes from whitespace and hairlines, not boxes inside boxes. **A screen must never** show two filled buttons, a pill that repeats its own heading, a word an engineer would say ("webhook", "task gave up", "truck"), a table that only works sideways on a phone, a form that grows inside a panel, or a second panel stacked on the first.

## 3. Navigation and information architecture

The sentence a screen follows: **a customer has jobs, a job is done in visits, and the Schedule says when.** The left column is Home, Schedule, Jobs, Customers, Reports, Settings. Visits is gone from it.

| Screen | Its one job | Primary button |
|---|---|---|
| Home (h1 "Today") | What needs me this morning, and what is today | New job |
| Schedule | Which day and which person; place what has no day | New job |
| Jobs | Everything sold: what it is worth, is it paid, what is left | New job |
| Customers | Who is this and how do I reach them | New job |
| Reports | The month and the season in numbers | none (Export on each table) |
| Settings | The few things Ryan sets once | Save (only when something changed) |

**Where Visits went.** The Visits grid becomes the Schedule's third view, **List** (Week, Day, List), with the same columns and filters; `/admin/visits` redirects to `/admin/schedule?view=list`. Its jobs are covered: today's visits are Home, a day's stops are Day, visits with no day are the Unscheduled list, any other slice is List.

**How a record opens.** One panel at a time over the screen you are on (`?customer=`, `?job=`, `?visit=`, `?day=`); the address holds it, so the browser's Back returns to the last record, and a panel opened from another record shows a "‹ Andrea Reyes" link above its title. Close returns to the grid with the row lit. A row's first column is the only link; every "Job", "Next visit" and "Customer" line in a panel opens that record in the same panel.

**New job lives on every screen**, as the one primary in the page header. From the Schedule it is also on every day: a day's header has a "+" and an empty cell in a person's row opens New job with that day (and person) filled; the sheet says "Tuesday, Nov 24" at the top and the Day field is set. Day is optional everywhere (a job with no day is Unscheduled).

**Keyboard (laptop).** Cmd or Ctrl+K searches customers (name, street, phone), jobs (number) and days; N opens New job; Esc closes the panel; on the Schedule the arrows move the week. Nothing needs a keyboard.

```
LAPTOP 1440                                           PHONE 375
+------+--------------------------------------+      +----------------------+
| Trail| Today   Tue, Nov 24      [ New job ] |      | [logo]     [+ New job]|
| head |--------------------------------------|      | Today                |
|      |                                      |      |  (the screen,        |
| Home |  (the screen)                        |      |   one column)        |
| Sched|                                      |      |                      |
| Jobs |                                      |      |----------------------|
| Cust |                                      |      | Home Sched Jobs Cust |
| Rept |                                      |      |             More v   |
| Sett |                                      |      +----------------------+
+------+--------------------------------------+      More: Reports, Settings
```

The rail is navy at 240px, collapses to icons below 1024px; the lit item is `sidebar-primary`. On a phone the bottom bar has four tabs and More (Reports, Settings); the page header's primary becomes a "+ New job" at the top right so a thumb finds it; a record is a full sheet.

## 4. The screens as they should finally be

**Words that mark change** ("Changes") are against today's build.

### 4.1 Home (Today)

| Part | Final | Changes |
|---|---|---|
| Header | "Today" and "Tuesday, November 24"; primary New job | Title was Home; New job is new here |
| Money strip | Today, Done, Ahead, Unpaid (`StatTile` row), "View schedule" | Built with `StatTile` (merges `TodayMoney`) |
| Visits | By visit (Past its window, Ahead today, Done today) or By person; a row opens the visit panel in place | none |
| Map | Right of the visits; below them on a phone, drawn at once with a placeholder | Placeholder instead of a blank box |
| Needs action | One row per thing, plain words, one button; **the row opens its record in place** | Opens in place (today it leaves the screen); words per section 8 |
| Reminders | "Fall blowouts open Sep 28. Check your days." as a Needs action row, four weeks before a service's "bookable from" | Reads Services dates, not Seasons |

```
LAPTOP                                                    PHONE
Today  Tuesday, November 24                 [New job]     Today        [+ New job]
[Today $870] [Done $290] [Ahead $580] [Unpaid $145]       Tuesday, Nov 24
Past its window (1)          | map with numbered pins     [Today][Done][Ahead][Unpaid]
 8-10  Ann L. Erie  Repair   |                            Needs action (2)
Ahead today (4)              |                             Andrea's repair is done,
 10-12 Mia R. Erie  Turn-on  |                             $145 unpaid     [Collect]
Done today (2)  By person    |                            Ahead today (4)  By person
Needs action (2)             |                             10-12 Mia R. Erie Turn-on
 Andrea's repair is done, $145 unpaid       [Collect $145]
                                                          Map
```

### 4.2 Schedule

| Part | Final | Changes |
|---|---|---|
| Header | "Schedule", week name; a Week, Day, List control; arrows and "Today"; primary New job | "Schedule" button renamed (below) |
| Week | One row per person who takes visits, seven equal columns, a one-line stop with its area bar; each day header shows the towns Ryan is in that day ("Erie, Firestone") from Routes | Route towns in the day header (new) |
| Day | The day's stops as a `DataGrid` beside the map, in order | none |
| List | The Visits grid, every filter | Moved here from the nav |
| Unscheduled | Under the week: "Unscheduled (3)", a row per visit, **Place** at the right; Place opens a small list "Erie is Tuesday. Tue Nov 24, Fri Nov 27, Tue Dec 1" (route days first, then any day with room), then "Another day"; one pick places it and texts the customer, with Undo | Unscheduled holds one-off jobs too; Place shows route days |
| Place all | A quiet button "Place all 3" at the list's right, only when the list has rows; it uses the same route days and shows what it did | Was the unexplained "Schedule" |

```
LAPTOP                                                      PHONE
Schedule  Nov 23 to 29  <  Today  >  [Week|Day|List] [New job]  Schedule  [+ New job]
          Mon        Tue         Wed      Thu     Fri         [Week|Day|List]  < Nov 23 >
          Erie       Lou/Laf/Bro Longmont .       Erie        Mon 23  Erie, Firestone
Ryan  [8 Ann L.]    [10 Mia R.]    ...     [+]    [8 Cy B.]    8-10 Ann L. Repair
Tech2 [9 ...]       [+]                                       10-12 Cy B. Turn-on
Unscheduled (3)                        [Place all 3]        Unscheduled (3)
 Jim P.  Erie  Repair                  [Place]               Jim P. Erie Repair [Place]
```

On a phone the week is one day at a time with a day strip across the top (swipe or arrows), because a seven-column week does not fit 375px; the Week control reads Day, with the strip as the week.

### 4.3 Jobs

Header "Jobs" with "N jobs this season. M unpaid. K need a quote."; New job. Grid columns (eight, spans of 12): Customer 3 (link), Job 2, Status 1, Visits 1, Total 1, Money 2, Next 2; hidden: Property, Sold. Filters Status, Money, Job, Season (the year). Invoices out first, then newest. Changes: the Money cell has one shape ("$145 · Invoice sent, due Dec 1", "$115 unpaid", "$145 · Paid"); the Job subtitle says "created" not "sold" for a repair; whole row opens the panel on a phone (below).

```
LAPTOP                                                       PHONE
Jobs  4 jobs this season. 2 unpaid.             [New job]    Jobs       [+ New job]
[Status v][Money v][Job v][Season v]  Search   Export        [Search customers]
Customer      Job          Status Visits Total Money     Next   [Status v][Money v]
Andrea Reyes  Season Pass  Open   1 of 2 $290  $145 unpaid Apr 28   Andrea Reyes   $145 unpaid
Hannah G.     Repair       Done   1 of 1 $145  $145 Paid   -        Repair, Done   >
```

### 4.4 Customers

Header "Customers", New job. Columns: Name 3 (link), Phone 2, Town 1, Pass 2, Unpaid 1, Next 2, Last visit 1 (seven); hidden Address, Email, Scheduled, Marketing. Search by name, street or phone (today name only). Unpaid is new (the sum of the customer's jobs). Phone: a card row, name over a muted phone, "$115 unpaid" or the next visit at the right, 64px, the row opens the panel; the phone number is a tap-to-call link in the panel.

### 4.5 Reports

Header "Reports", no primary. Tiles (`StatTile`, each with its baseline in words): Revenue, Outstanding, Jobs sold, Passes sold, Invoices past due, Visits needing a day. Below: revenue by month (this year orange, last year dashed navy), the season line, and "Upcoming charges" (the next visits with a card on file). Changes: every number reads all jobs, not passes only; "Quotes awaiting" stays off until a quote screen exists; Export on each table. Phone: tiles two across, charts full width, tables as card rows.

## 5. The visit panel and the job panel

Both are `RecordPanel` (section 7): header, facts, sections, footer. The facts, sections and footer table of `admin-hierarchy-design` section 3 stand, with the done-and-paid flow folded in and "bill" worded as "invoice". Pills go under the subtitle; the label column is 112px; one Close.

**Visit panel, by state** (primary filled, up to two outline, More, one destructive ghost):

| State | Primary | Secondary | More | Destructive |
|---|---|---|---|---|
| Unscheduled | Place | Edit | Send a text | Cancel visit |
| Scheduled, before its day | Move | Edit | Send a text | Cancel visit |
| Scheduled, its day or past | Mark done | Move, Not done | Edit, Send a text, On my way | Cancel visit |
| Done, beat two open | the choice's button ("Charge $145") | none | none | none |
| Done, unpaid | Collect $145 | Open job | Send a text | none |
| Done, paid | Open job | none | Send a text | none |

**Mark done** opens beat two on the same panel at once, never charging: the header reads Done and "$145 unpaid", the body is `CollectPayment` (done-and-paid section 3): "How is this paid?" with the card on file preselected ("Charge the Visa ending 4242 now. Charges $145 to the card and emails a receipt"), Check, Venmo, Cash ("Record $145 paid"), Send an invoice ("Texts a pay link, due in 14 days"), and Pay later only for a customer with no card. A Season Pass reads "Charge the card as agreed" with "Paid another way" folded under it. Nothing moves money until the button is pressed. While it runs: "Charging $145 to the Visa ending 4242"; after: "Paid, card. Receipt emailed to Andrea." A refusal reads "The card didn't go through. Choose another way." and the customer is emailed at once (done-and-paid section 3). The morning after, a done visit with a card and no payment is a Home row: "Card not charged for Andrea's spring turn-on" with **Charge $145**.

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

**Collect $145 on a job opens `CollectPayment` as one dialog**, the same block as on the visit; "Send an invoice" and "Record the payment" are choices inside it as well as buttons. A footer button opens at most one dialog. Cancel job is refused with "This job has a payment. Refund it first." (as built).

```
LAPTOP: visit panel after Mark done                PHONE
+---------------------------------+               +------------------------+
| ‹ Andrea Reyes                  |               | < Andrea Reyes       X |
| Spring turn-on, Tue Apr 28    X |               | Spring turn-on, Apr 28 |
| [Done] [$145 unpaid]            |               | [Done] [$145 unpaid]   |
|---------------------------------|               | How is this paid?      |
| How is this paid?               |               | (o) Charge the Visa    |
| (o) Charge the Visa ending 4242 |               |     ending 4242 now    |
|     Charges $145 and emails a   |               | ( ) Check  ( ) Venmo   |
|     receipt                     |               | ( ) Cash ( ) Invoice   |
| ( ) Check ( ) Venmo ( ) Cash    |               | [  Charge $145  ]      |
| ( ) Send an invoice             |               +------------------------+
|---------------------------------|
| [ Charge $145 ]                 |
+---------------------------------+
```

Checking the running done-and-paid build against this: the choice list and button words above, the card preselected only with a real card, Done never charging, one `CollectPayment` used by both panels, the footer shapes in the tables.

## 6. Settings, whole

Settings is a list at the left of its own content (HCP's left rail) with six entries: **People, Services, Routes, Billing, Messages, API keys**. On a phone it is a list that drills into each. Every entry saves the same way (Shopify's save bar): nothing is saved while typing; the first change shows a bar at the top, "Unsaved changes. [Discard] [Save]", and leaving the page asks before throwing changes away; Save writes one line per field to the change log ("Changes" link at the top right of the list, one place). This replaces today's mix of save on leave and per-tab Save.

### 6.1 People

One row per person; the login and the truck are the same record. A person's email is how they sign in (an email link, no password); "Takes visits" decides whether they are a row on the Schedule (it replaces the truck label, which is never shown). Roles: Owner (everything), Admin (everything but billing and keys), Tech (their own work, no money; section 10). The last owner stays.

```
LAPTOP                                                          PHONE
People                                         [Add person]     People [Add person]
Name              Role    Takes visits  Works      Per day      Ryan Garner     Owner
Ryan Garner       Owner   Yes           Mon-Fri    8 blowouts   ryan@...  Takes visits
ryan@...                                                         Tech Two        Tech
Tech Two          Tech    Yes           Mon-Fri    8 blowouts   Takes visits
(a row opens the person's sheet)
Sheet: Name, Email (sign-in), Phone, Role, Takes visits, Works (day chips),
 Visits a day (turn-on, inspection, blowout, repair, other), On from, until, Remove
```

Daily capacity per person per kind stays here. Customers book into it; Ryan may place past it by hand and the Place list says "Over capacity, place anyway?". Jobber user stays under "Advanced" until the Jobber switch, then goes.

### 6.2 Services

One service per row. The 17 catalogue rows fold by kind: a turn-on, an inspection, a Rachio install and a repair are each one row; zone bands become "up to N zones" plus "each extra zone". Seasonal services carry optional **Bookable from** and **to** dates (month and day, repeating every year; empty means all year; a "to" earlier than the "from" wraps New Year, so Season Pass may run Nov 1 to Jun 15). The pass, the booking flow and Home's reminders read these dates.

| Column | Meaning |
|---|---|
| Name | Customer-facing ("Spring turn-on") |
| Price | For the included zones, whole dollars; "Quoted" for a quote-only service |
| Zones | Included zones ("up to 8") |
| Extra zone | Price per zone beyond them |
| Minutes | Visit length for the included zones |
| Online | Book a day, We quote, Off (replaces Bookable and the quote flag; HCP's per-service switch) |
| Bookable | "Apr 15 to Jun 15" or "All year" |
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
Sheet also holds: What's included (no prices in it), Taxable, Active.   dates, Taxable, Active)
```

The one number under the table, "Remind me N weeks before a service opens" (default 4), is the old lead weeks and drives the Home reminder row. A service outside its dates is shown on the booking page as "Opens Apr 15" (online-booking section 6), and the office's New job leaves it selectable.

### 6.3 Routes

The grid of the six towns against Monday to Friday, from `routes-and-seasons-answers` (Hannah's numbers): Mon Erie and Firestone; Tue Louisville, Lafayette and Broomfield; Wed Longmont; Thu Louisville, Lafayette and Broomfield; Fri Erie and Firestone. Two days per town allowed. Towns on one day are driven together. Drag a town chip onto a day, or tap it for a menu on a phone: "Also on Thursday", "Move to Tuesday", "Take off this day". A drag to another weekday warns ("Longmont is usually Wednesday") and still moves.

```
LAPTOP                                                      PHONE
Routes   Days Ryan is in each town              Routes
 Mon          Tue            Wed        Thu            Fri   Monday     Erie, Firestone
 [Erie]       [Louisville]   [Longmont] [Louisville]   [Erie] Tuesday    Louisville,
 [Firestone]  [Lafayette]               [Lafayette] [Firestone]            Lafayette,
              [Broomfield]              [Broomfield]                       Broomfield
 No day yet: (empty)  Towns here can go any weekday.         Wednesday  Longmont
 Which town goes first      Fall: 1 Firestone 2 Erie ...     (tap a town: menu)
 [x] Spring goes the other way around
```

Help lines (week-planning section 3, kept): "Towns on the same day are driven together by one truck."; "Fall starts north and high, where the first hard freeze lands." The look-ahead when a town's days are full is four weeks and not a setting. Jev's "may move a customer-picked day" stays off and is not on this screen until Jev exists.

### 6.4 Billing, Messages, API keys

Billing is as built: "Invoices are due in [14] days", the sales tax box and percent. Messages is as built: only what the office may edit (day set, moved, two weeks out, day before, on the way, invoice reminder), a Preview from the real renderer. API keys is as built. All three move onto the save bar; none changes content.

### 6.5 Areas and Capacity and windows: where every field went

| Old field | Where it lives now | Why |
|---|---|---|
| Area name | Dropped | A group is only "towns on one weekday"; the name was never read |
| Towns in an area | Routes grid, a chip on a weekday | Same fact, now with its day |
| Area's weekday (none today) | Routes grid column; "No day yet" tray | The day was never settable |
| Fall and spring town order | Routes: "Which town goes first" and the Spring box | Same fields, beside the days |
| Season window opens, closes (turn-on, inspection, blowout) | Services: Bookable from and to, per service | Hannah: not seasons; the service carries its dates |
| Lead weeks (and Home's hidden "plus two") | Services: "Remind me N weeks before a service opens"; the plus two is dropped | One honest number |
| Buffer, first two weeks, percent | Dropped (question 2) | Customers pick days from route days, nothing is held back |
| Buffer, after, percent | Dropped (question 2) | Same |
| Visits a day by kind, per person | Stays on the person (People sheet) | Hannah: capacity stays on the person |
| Working days, season from and to | Stay on the person | Same |

## 7. One component recipe

Every admin screen is built from these, nothing else. A screen composes blocks and holds no markup of its own for a list, panel, dialog or form.

| Part | Rule | Block (status) |
|---|---|---|
| Page header | 56px bar: title and one muted line left; at most **one filled button**, then outline ones, at the right | `PageHeader` (kept; gate counts filled buttons) |
| Grid | Eight columns at most, spans of 12, first column the one link, every column sorts, chips for filters, one count line, Export says how many, 44px rows; phone card rows (64px) | `DataGrid` (kept) |
| Record panel | Header, facts (112px labels), sections, footer bar; same for Customer, Job, Visit, Person, Service | `RecordPanel` (new, replaces `PanelParts`, `PassActions`, the per-panel footers) |
| Footer bar | One primary, up to two outline, More, one destructive ghost; a button acts with Undo or opens one dialog | `RecordFooter` (new) |
| Sheet | A form beside the page for making or editing (New job, a person, a service): the panel chrome, sticky footer with one primary | `SidePanel` with `variant="sheet"` (kept, extended) |
| Dialog | One question, 400px, destructive confirm reads "Keep it" and "Cancel visit"; never over a dialog | `ConfirmDialog` (moved up from `ConfirmCancel`) |
| Pill | The only status chip: neutral stone (Scheduled, Open, Unscheduled), positive (Paid, Done, Active), warning (Past due, Needs a quote), destructive (Failed, Canceled); in a panel under the subtitle, in a row at the right, never in a grid cell | `StatusPill` (kept; `JobPill` merges in) |
| Money word | Plain text from `words.ts`; warning colour only for Past due and Failed; never a pill in a grid | `MoneyCell` (new, thin) |
| Empty state | Title, one line, at most one button, with the "No match" variant and Clear filters in the filter bar | `EmptyState` (kept) |
| Form row | Label above, hint under, error under, 44px control; the one `Field` | `FormRow` (promoted from `settings-tabs/fields.tsx`) |
| Save bar | Shows on the first change in Settings: Discard, Save | `SaveBar` (new) |
| Settings list | Left list on a laptop, drilling list on a phone | `SettingsList` (new) |
| Section heading | Barlow Condensed 18px navy; one block for cards and panels | `SectionHeading` (merges `PanelHeading`, `CardTitleHeading`) |
| Collect | Beat two of Done and the job's dialog | `CollectPayment` (new, from done-and-paid) |
| Service picker | One list for Ryan and the customer | `ServicePicker`, `ZonesField` (online booking design) |
| Routes | The week grid of towns, list on a phone | `RoutesGrid` (new) |
| View control | Week, Day, List | `SegmentedControl` (new, from `ui/`) |

**Other existing blocks.** Kept: `AdminShell` (nav list, bottom bar with More), `SidePanel`, `WeekGrid`, `DayMap`, `StatTile`, `Chart`, `NotesAndHistory`, `ChangeLog`, `NeedsAttention` (rows render through one `ActionRow`), `TodayGroup`, `TodayVisitRow`, `UndoToast`, `AddressSearch`, the pass blocks (`PassCard`, `PassSeason`, `SeasonLine`, `TimingChoice`, `PreferenceDialog`). Renamed: `ToScheduleTray` to `UnscheduledList`. Merged: `TodayMoney` into a `StatTile` row; `MessageThread` into `NotesAndHistory` (messages are its quietest lines). Retired when their screens go: `VisitsScreen`'s page chrome (the grid lives on), the Settings `Areas` and `Capacity` tabs, `ScheduleSeasonButton`. The customer-side blocks (`AccountNav`, `VisitRow`, `JobRow`, `InvoiceBanner`, `ReceiptLine`, `NextVisitCard`) are not part of this system.

**What the design gate enforces** (added to `scripts/design-gate/`):

| Rule | Check |
|---|---|
| One primary per page | A screen's `PageHeader` has at most one `variant="default"` button |
| No filled buttons in a panel body | Only `RecordFooter` and the sheet's footer may render one |
| Words come from one file | Strings like "Owed", "Overdue", "Bill", "Cancelled", "Lapsed", "Truck" in the admin tree fail; status and money text comes from `src/lib/**/words.ts` |
| Overlays through blocks | `ui/dialog`, `ui/sheet`, `ui/popover` imported only from `blocks/` |
| No screen markup for a list or form | `<table>` and `<label>` outside `DataGrid` and `FormRow` fail |
| Eight columns | A `columns` array over eight fails |
| Stories | Each new block has Default, Empty, Phone (as today) |

## 8. Words

**Status and money** (from the status audit, section 7; vendors print the same):

| Record | Words | Read from |
|---|---|---|
| Visit | Unscheduled, Scheduled, Done, Canceled | day, done date, cancel; a visit that could not be finished goes back to Unscheduled with the reason as a note, and "Not done" is only the button |
| Job | Needs a quote, Quote sent, Open, Done, Canceled | lines, dates, visits |
| Pass | Pending, Active, Expired, Canceled | job and year |
| Money | Paid, Paid card (Venmo, check, cash), $145 unpaid, Invoice sent due Dec 1, Past due since Dec 1, Failed, Charging, Card not charged | payment rows and invoice |
| Home | Past its window, Done unpaid, Invoice past due, Card failed, Card not charged, Needs a day | facts |

**Buttons, one list.** New (the one sheet: "New job"), Add (a small thing on a record: Add a line, Add a note, Add person), Place (give an Unscheduled visit a day), Move (change a day), Mark done, Not done, Collect $145 or Charge $145 (card), Record $145 paid (check, Venmo, cash), Send an invoice, Remind, Send a text, Send card link, On my way, Edit, Save, Discard, Close, Back, Undo, Export, Clear filters. Destructive: Cancel visit, Cancel job, Cancel pass (a confirm dialog says "Keep it" and the same destructive words). A form's dismiss is "Cancel". Never "Submit", "OK", "Bill", "Schedule" alone.

**Page lines and empty states** (sentence case, no em dashes, warm):

| Where | Title and line | Empty state | Button |
|---|---|---|---|
| Home, no visits | Today, Tuesday, November 24 | No visits today. Visits with no day wait on the Schedule. | Open Schedule |
| Home, Needs action empty | Needs action | Nothing needs you. | none |
| Schedule, Unscheduled empty | Unscheduled | Every visit has a day. | none |
| Jobs | Jobs | No jobs yet. A job is what you sell: a repair, a turn-on, a pass. | New job |
| Jobs, no match | Jobs | No jobs match. | Clear filters |
| Customers | Customers | No customers yet. A customer is added when you make a job. | New job |
| Reports | Reports | Numbers show here once a job is paid. | none |
| Notes and history | Notes and history | No notes or history yet. Add a note and it shows here. | Add note |
| Settings, People | People | You are the only person. Add someone who takes visits. | Add person |
| Settings, Routes | Routes | Every town can go any weekday. Drag a town onto a day to fix it. | none |
| Load failed | the screen's title | We couldn't load this. Try again, or reload the page. | Try again |

Render order everywhere: loading skeleton, then error, then empty, then content (Stripe).

## 9. What a tech sees versus an owner

| Surface | Owner and Admin | Tech |
|---|---|---|
| Nav | Home, Schedule, Jobs, Customers, Reports, Settings | Home, Schedule, Jobs, Customers (no More) |
| Home | Everything, all people | Their own visits, the map, no money strip, no Needs action money rows |
| Schedule | All rows; Place, Move, New job | All rows read-only; Mark done on their own visits |
| Jobs and Customers | Full, with money | Name, address, phone (tap to call), service and visits; no money, notes or history of money |
| Visit panel | All; footer | At the property (zones, controller, backflow, must be home, gate code and access note on visits today or ahead; question 3), Mark done, Not done, On my way; no price, payment, card, email, footer money |
| Done | Beat two (collect) | A tech marks done only; a paid visit is collected by an owner or admin ("Ryan will collect") |
| Settings, Reports | Owner: all. Admin: all but Billing and API keys | Not shown |

A tech never sees a payment reference, a pay link, a card, a customer's email, the change log, or a Jobber link. It is shaped at the API (as built), never only hidden on screen.

## 10. Build order

Smallest steps, each leaving the admin whole and consistent. The two running builds stay on their branches; each is checked against this doc before it merges, and where it differs a follow-up step brings it in line, never a revert.

| # | Step | Leaves the admin | Folds in |
|---|---|---|---|
| 0 | Merge portal v2 (customer side, untouched here) and done-and-paid as designed; check done-and-paid against section 5; merge PR #72's answers | whole as today, plus Collect | portal v2 build, done-and-paid build, PR #72 |
| 1 | Foundation: `words.ts` words (Unpaid, Invoice, Past due, Canceled, Card not charged), `RecordPanel`, `RecordFooter`, `ConfirmDialog`, `SectionHeading`, `FormRow`, the gate rules; Customer, Job and Visit panels move onto it | one panel recipe on every record | hierarchy design sections 3 and 5; audit item 1 |
| 2 | Navigation: Visits out of the nav and into Schedule's List, `?customer=` and Back, New job on every screen and on a day, phone bar with More, Cmd+K | one clear map of the app | hierarchy design; audit items 2 and 7 |
| 3 | Home and Schedule: Needs action opens in place, plain words, Place with route days, Unscheduled for every job, "Place all", route towns in day headers (reads defaults until step 5) | Today and the week as in section 4 | audit items 1 and 6 |
| 4 | Settings shell and People and Services: `SettingsList`, `SaveBar`, People (Takes visits), Services one row per service with Online and Bookable dates (adds the two date columns), bands folded in the UI | Settings whole except Routes | status audit; week planning section 3 |
| 5 | Routes: the grid, migration of Areas (each area becomes a route day), fall and spring order, the scheduler and `placeVisit` read route days; Seasons, Areas and Capacity tabs go, Home reads Services dates for reminders | the Settings in section 6 | week planning section 3; PR #72 values |
| 6 | Reports on every job; Jobs and Customers columns to the final eight and seven; phone card rows | every screen as in section 4 | hierarchy design section 4 |
| 7 | Online booking reads Services dates and Routes (its own plan) | booking and admin agree | online booking design |

Steps 1 to 3 need no migration. Step 4 adds `bookable_from` and `bookable_to` to the service. Folding bands (4) writes every band of a kind through `services.update`, so first check that the band prices follow the included-zones plus per-extra-zone rule and that minutes per band are one base plus an increment; any band that does not is listed for Ryan and left as its own row until he says. Step 5 migrates per week-planning section 3 and drops the buffer fields with Hannah's answer to question 2.

## 11. Questions for Hannah

1. **Visits as the Schedule's List view, out of the left column?** Recommended: yes. Jobber and Housecall Pro have no Visits item; the same grid stays one click away and nothing is lost.
2. **Drop the buffer (hold back 20% early, 12% late)?** Recommended: yes. Customers pick days from route days, and the person's daily capacity already stops overbooking; Ryan can still place past it with a warning.
3. **May a tech see the gate code and access note for visits today and ahead?** Recommended: yes. A tech has to open the gate; the Nov 17 rule hid both. They still see no money, email, card or other days.
4. **One save bar for all Settings (replacing save on leave and per-tab Save)?** Recommended: yes. One habit, one place for the change log, and a warning before leaving with unsaved changes.
5. **Does Season Pass sale run Nov 1 to Jun 15 (its own bookable dates)?** Recommended: yes. It opens with the "Reserve next season" button and closes when the turn-on window does, so a pass is never sold after its first visit is gone.

## 12. Figma

[Trailhead admin: holistic design](https://www.figma.com/design/9TYdPIzdG8MLrHJm4qiUBu) (in Hannah's own Figma team). Six frames on the Trailhead tokens: Today and Schedule at 1440 (sections 4.1, 4.2), the visit panel after Mark done at 1440 and 375 (section 5), Routes with the save bar at 1440 (section 6.3), and Today at 375 with the bottom bar (section 3). They are flat layouts in Inter standing in for Barlow Condensed and Source Sans 3, not a component library; the fenced wireframes cover the remaining screens (Jobs, Customers, Reports, People, Services).
