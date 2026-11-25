# Admin audit: patterns and shell (Nov 25 2026)

Read-only audit of what cuts across the admin: the shell, navigation, lists, dialogs, forms, feedback, type, colour, motion and accessibility. The Customer object and the Quote, Request, Job, Visit and Invoice objects have their own auditors; this document only names an object where a shared pattern shows up on it. No source file was changed. Screenshots are in `docs/review/2026-11-25-admin-audit-patterns/` (94 files, taken from Storybook at 1280 and 375 with Playwright; a full-page shot shows the phone tab bar mid-page and the rail ending early, which is the capture and not the screen).

A number in backticks such as `10` is the screenshot whose file name starts with that number. How to read the evidence: "measured" means a script read the rendered page (heights, colours, counts); "grep" means a count over `src/app/(admin)` and `src/components/blocks`, stories and tests left out; "seen" means I looked at the named screenshot.

## 0. The short version

1. **The admin is two generations at once.** The shipped screens (Home, Schedule, Jobs, Customers, Settings, with records in a side panel) and the Nov 19 to 23 prototypes (record pages for the job, customer, invoice, quote and request, with their own lists) use different headers, cards, heading sizes, row heights, link rules and navs. Most of what reads as inconsistency is the seam between them. Pick the page generation as the keeper and retire the other, list by list.
2. **Too many links is measurable.** Orange link text per screen: Invoices list 45, Customer page 39, Jobs grid (prototype) 36, Quotes list 21, against 16 on the shipped Jobs grid. The contract already says "the first column is the link that opens the record, and nothing else on the row is a target"; the prototypes stopped following it.
3. **One pattern, many hand-typed copies.** A text link's classes are typed in 13 files, a select's in 8, a notice banner's in 6, money and date formatters are defined 9 and 12 times, and 78 of 141 `<Button>`s carry a hand-typed `min-h-11`.
4. **The customer side now has a system the admin does not use**: `type-*` roles (0 uses in the admin), `optionClass` (0 uses in admin screens; the admin has five other "selected" looks), `PriceLines`, the motion tokens (1 admin file).
5. **Real defects found on the way:** Settings › People overlaps its own fields at 1280; the focus ring is 1.75:1; the visit panel runs two sentences together; search does not find an invoice or a quote by its number.

## 1. Pattern inventory

Each row: the pattern, every distinct implementation found, where, and the verdict. Paths are under `src/`.

### 1.1 Page header

| # | Implementation | Where | Evidence |
|---|---|---|---|
| a | `PageHeader` portalled into the 56px bar: h1 28px/600, one muted line, actions right | Home, Schedule, Jobs, Customers, Settings, Reports, Invoices list, Quotes list, Requests list | `10`, `32`, `44` |
| b | `RecordPage` header in the page body: crumb, h1 30px/600, badges beside it, muted line, actions right; the 56px bar above it is empty | Job page, Customer page, Invoice, Quote, Request | `42`, `47` |
| c | `SidePanel` header: 24px/600, subtitle, pills under it, X | Customer, Job, Visit panels | `20`, `39` |
| d | Sheet header typed by hand (`font-display text-2xl`) | `NewJob.tsx:86` | `52` |
| e | Settings entry heading (`SettingsList`, 24px/600) under the page's h1 | Settings | `24` |

Verdict: (a) and (b) disagree on size (28 against 30, measured) and on where the title lives. On a record page the top bar is a blank strip with only the rail toggle. (d) is a one-off.

### 1.2 Lists and tables

| # | Implementation | Where | Row height (measured) |
|---|---|---|---|
| a | `DataGrid`, toolbar, text cells, one link | shipped Jobs, Customers, Schedule › List | 44 |
| b | `DataGrid` with `RecordChip` cells (icon square and underlined name) | prototype Jobs grid, Customers list | 49 |
| c | `DataGrid` with chips and inline row actions | Invoices list, Quotes list | 61 |
| d | `DataGrid toolbar={false}` embedded in a card (`BillingTables`, `MessageTable`, `CustomerTables`) | Customer page, Job page, Invoice | 56 |
| e | `DataGridCard` phone cards | every list under 768 | card |
| f | Hand-built rows: `TodayVisitRow` (Home), `StopRow` (Schedule › Day), `ToScheduleTray` rows (Unscheduled), `NeedsAttention` rows, `RequestRows`, `TripRow`, `RecordList` | Home, Schedule, panels | 54 to 59 |
| g | `WeekGrid` (a real `<table>`) | Schedule › Week | n/a |

Verdict: one grid, three densities and two cell languages (plain text, chips). `TodayVisitRow` and `StopRow` draw the same thing, a stop on a day, two ways (`10` against `15`): Home shows a "Scheduled" pill on every row, the Day view a tick only when done. The scheduler redesign owns the Schedule rows (section 4.5); Home should follow whatever it lands on.

### 1.3 Filter bar and view switches

| # | Implementation | Where |
|---|---|---|
| a | Toolbar dropdown chips ("Status ▾"), amber when active with an X and "Clear filters" | every `DataGrid` (`data-grid-toolbar.tsx`), `62` |
| b | A filter as a header button with `aria-pressed` ("2 invoices out") | `JobsScreen.tsx:95`, `32` |
| c | Line tabs with counts over the grid (All 7, Draft 2 …) | `quotes/QuotesList.tsx:156`, `46` |
| d | A header outline button as a filter ("Show archived") | prototype Customers, `91` |
| e | `SegmentedControl` (navy fill) for Week, Day, List | Schedule, `14` |
| f | `ui/tabs` pill (white card on stone) for By job, By person | `TodayVisits.tsx:104`, `10` |
| g | `ui/tabs` vertical with a line for Settings entries | `SettingsScreen.tsx:147`, `24` |
| h | `SummaryBand` tiles that filter the list when pressed | Invoices, Quotes, `44` |
| i | Select dropdowns "Everyone", "All areas" | Schedule, `14` |

Verdict: status is filtered four ways (a, b, c, d) and a two-way view switch is drawn two ways (e, f). DESIGN.md's recipe already names `SegmentedControl` for "Week, Day, List; By job, By person"; Home never moved.

### 1.4 Status pill and other chips

| # | Implementation | Where |
|---|---|---|
| a | `StatusPill` (tint, dot, word; five tones) | everywhere a status shows; consistent wherever I looked (`60`) |
| b | `Badge` used directly as a grey tag ("Text", "Email", key scopes) | `settings-tabs/Messages.tsx`, `ApiKeys.tsx`, `27` |
| c | `DoNotServiceTag` (red, square corners) | Customers, `91` |
| d | `DetailsPill`, `OnFileMark` | customer side |
| e | Loose muted text beside a pill ("day passed") | Visit panel header, `20` |

Verdict: the pill itself is the most consistent thing in the admin. Three notes. The `Blocks/StatusPill › All` story shows 17 statuses and leaves out the 12 newer ones (Today, Active now, Refunded, the request and quote words), so the catalog no longer shows the set. DESIGN.md says a pill is "never in a grid cell" in one place and approves grids with a Status column in another; every grid has them (16 on shipped Jobs, measured). And Home prints "Scheduled" on all five rows that are simply ahead (`10`): a pill for the default state is noise.

### 1.5 Button hierarchy

| # | Implementation | Count or place |
|---|---|---|
| a | `Button` default (filled, 40px), `outline`, `ghost`, `secondary`, `link`; sizes 32, 40, 48 | `ui/button.tsx` |
| b | `Button` with a hand-typed `min-h-11` | 78 of 141 (grep) |
| c | Text buttons typed by hand as link classes (`LINK`, `TEXT_BUTTON`, `QUIET`): Edit, Remind, Collect payment, Update card, New quote | 13 files |
| d | Icon-only row actions typed by hand (`ICON_LINK`, `ICON_BUTTON`) | `InvoicesPage.tsx`, `BillingActions.tsx` |
| e | `RecordFooter` (one primary, two outlines, More, destructive ghost) | panels and record page headers, `74` |
| f | `SplitButton` | Move, Schedule dialog, `56`, `57` |
| g | A destructive confirm as class overrides on the default button | `ConfirmDialog.tsx:79`, `dialog-styles.ts` (the `destructive` variant is used once) |

Heights of buttons on screen (measured at 1280): 44 (header primary, footers), 40 (Settings), 36 (Columns, Export), 34 (filter chips), 32 (Schedule row buttons, Previous and Next, "+ New job" in the Navigation stories, Close X), 29 (week blocks). The page primary is "New job" at 44 on the shipped screens and "+ New job" at 32 in `Admin/Navigation` (`01` against `10`).

Verdict: the hierarchy is right (one filled per page is enforced by the gate and held everywhere I looked). The sizes are not a system: `Button` offers no 44 or 36, so every screen picks its own.

### 1.6 Dialogs and sheets

| # | Implementation | Where |
|---|---|---|
| a | `ConfirmDialog`: title 24px, one line, body, footer right aligned (dismiss, confirm) | most confirms, Move, Schedule, reminders, `54` to `59` |
| b | `CollectPayment` inside a dialog: confirm left aligned, no dismiss button | Job panel "How is this paid?", `34` |
| c | `CollectPayment` as the panel body with its button in the panel footer | Visit panel beat two, `50` |
| d | `SidePanel` (resizable sheet) | records, `20` |
| e | A sheet typed by hand on `ui/sheet` with its submit in the scrolling body | `NewJob.tsx` (on the gate's ALLOW list since Nov 18), `52` |
| f | Customer dialogs writing their own shell from `dialog-styles.ts` | `RescheduleSheet`, `CancelVisitSheet`, `PassActions` |
| g | `CommandSearch` (cmdk dialog) | `08` |
| h | Popovers: `DayField`, `TimeField`, `RecordPreview` hover card, dropdown menus | forms, chips |

Verdict: three footer layouts (right aligned pair, left aligned single, button in the body). (b) opens a dialog over an open panel, which the contract's "never over a dialog" was written to stop; the panel is itself a modal dialog.

### 1.7 Form fields

| # | Implementation | Where |
|---|---|---|
| a | `FormRow` stacked (label over, hint, error) | dialogs, `70` |
| b | `FormRow inline` (112px label left) | Settings, `24`, `71` |
| c | Hand-written `<label>` with a `LABEL` constant | `NewJob.tsx`, `NewJobPass.tsx`, `NewJobService.tsx`, `CustomerPicker.tsx` (ALLOW debt) |
| d | Native `<select>` with the class string retyped (`FIELD`, `SELECT`) | 17 files, 8 definitions; `ui/select` has no user |
| e | `ui/checkbox` at 16px; a hand-built switch in `ConsentCard` | Settings, Consent, `24`, `40` |
| f | Radio cards with an orange tint when chosen (`RADIO`) | `CollectPayment.tsx:49`, `34` |
| g | Rounded "Who" chips with an orange tint when chosen | `design/SchedulePicker.tsx`, `57` |
| h | `TimeChips`, `DayCalendar`, `DayField` (navy when chosen) | Move, Schedule, New job, `56` |
| i | `SegmentedControl` used as a form choice (Text, Email, Both) | reminder and quote dialogs, `59` |
| j | Native `<details>` with the browser's triangle for "Advanced" and "More details" | Settings › People, New job, `24`, `52` |

Verdict: a choice has four looks in the admin (f, g, h, i) where the customer side has one. Field heights are 44 in dialogs and New job, 40 in Settings, 36 for the grid search.

### 1.8 Empty, error and loading states

| # | Implementation | Where |
|---|---|---|
| a | `EmptyState` (title 20px, one line, optional button) | 9 files; grids, Messages, `16`, `65` |
| b | A quiet sentence typed in place: "No jobs on record.", "No quotes.", "No visits.", "No paid invoices yet.", "No charges scheduled yet.", "Nothing here" | panels, cards, Revenue, `39`, `40` |
| c | A missing value: "—" (`MoneyCell`), "None", "Nothing ahead", "No day yet", "Unscheduled", "No one yet", "Not sent", "Quote later" | grids and facts, `32`, `36`, `38`, `46` |
| d | Errors: `role="alert"` red line under a form (20 files), `SaveBar` problems, `ConfirmDialog` problem line, Photos tile | forms |
| e | Loading: `DataGrid` skeleton rows, one route `loading.tsx` for the whole shell | `64` |
| f | Not found, error boundary | none under `(admin)` |

Verdict: (c) is where it hurts. For "no next day" the shipped Customers grid says "Nothing ahead", the prototype says "None", the Jobs card on a phone prints a bare "None" under the pill with no label (`33`, `36`), and a job says "Unscheduled". The List view says "No visits yet." twice, once as the count line and once as the empty state (`16`). There is no admin not-found or error page.

### 1.9 Toast, undo and saved feedback

| # | Implementation | Where | Behaviour |
|---|---|---|---|
| a | `Toast` | prototypes only (17 design files) | bottom centre, 4 s, no button, `66` |
| b | `UndoToast` | shell provider; Schedule | top centre, 10 s, Undo, `67` |
| c | `TextingStrip` | Schedule | inline strip, 60 s countdown, Undo, `19`, `68` |
| d | `SaveBar` | Settings | sticky card, "Saved just now", `29` |
| e | Inline status text after an action (`FORM_STATUS`) | shipped panels | under the form |

Verdict: the answer to "did it work?" appears in four places on the screen depending on where you are. The shipped Jobs and Customers screens never raise a toast (grep). The scheduler design (D5) replaces (c) with a "Visit moved" toast carrying Notify and Undo, so there will be a toast with two actions; the block should be designed for that once.

### 1.10 Tooltips and help

`InfoTip` (a 44px info button over `ui/tooltip`) is the block; `ui/tooltip` is also used directly in `ScheduleScreen`, `SegmentedControl` and `BillingActions`. Help otherwise is a hint line under a field (`FormRow`) or a paragraph under a heading. The Billing tables carry up to four icon-only actions in a row (`40`); each has an accessible name (measured: none without one), but nothing visible until hover.

### 1.11 Section heading and card shell

| # | Implementation | Measured | Where |
|---|---|---|---|
| a | `ui/card` + `SectionHeading level={2}` | 24px/600, 24px padding | Home, Schedule, Reports, `10` |
| b | `SectionCard` (title bar with a hairline) | 18px/400, 20px padding | every record page, `42` |
| c | `SectionHeading` in a panel | 18px/400 | panels, `20` |
| d | `SectionHeading size="sub"` | 16px/600 body face | Billing |
| e | `SettingsList` heading, row titles | 24px/600, 18px/400 | Settings, `24` |
| f | A card typed by hand (`rounded-lg border border-border bg-card …`) | | 10 admin files |
| g | Group headings typed by hand: 14px display ("3 ahead today"), 14px display uppercase (`DayHeader`, `WeekGrid`) | | Home, Schedule |

Verdict: a card's title is 24px semibold on Home and 18px regular on a job. Both are "the title of a card on a screen".

### 1.12 Key-value facts

`RecordFacts` (112px label column; `divided` adds hairlines), `SummaryBand` (four cells, label over a display-face value, optional icon and chevron), `AsideCard`, `SettingsFact`, `TodayMoney` and `StatTile` (label over a 36px number), plus a small label-over-number row in `BillingBody`. Six ways to put a label beside a value. They are mostly doing different jobs, but `SummaryBand`, `TodayMoney` and `StatTile` are the same idea at three sizes (`10`, `44`, `77`, `78`), and a record page repeats one fact in several of them: the quote page shows the total three times, the number three times and "Sent" twice above the fold (`47`).

### 1.13 Money display

Formatters (grep, definitions): `money` ×5 (`quote-view.ts`, `pay-model.ts`, `quote-deposit.ts`, `invoice-fixtures.ts`, `booking/services.ts`), `dollars` ×3 (`emails/format.ts`, `pass/server/messages.ts`, `money/collect.ts`), `formatMoney` ×1 (`lib/admin/metrics.ts`). They differ: two round, two handle a negative, the rest do neither. On screen: `MoneyCell` in grids (plain, red for Past due and Failed), `LineItemList` on a job (`42`), a hand-built totals block on a quote, `StatTile` and `SummaryBand` figures, and `PriceLines` on the customer side only.

### 1.14 Date and time display

Formatters: `dayWords` ×4 with different outputs (`lib/admin/jobs.ts` takes a visit, `lib/admin/undelivered.ts` gives "Nov 18", `invoice-fixtures.ts`, `checkout-days.ts` gives the long form), `dayLabel` ×2, `longDay` ×3, `shortDay` ×2, `timeWords`, and 24 direct `Intl.DateTimeFormat` calls. On screen, in one walk: "Nov 12" (grids), "Tue, May 4" (cards), "Thu, Nov 19" (band), "Nov 19, 2026" (customer's Jobs table), "Today, Wed Nov 18" (job band), "Wed, Apr 8, any time" (visit panel) beside "Any time" (day list), "October 13" (Day view title), "Tuesday, Oct 13" (its context line), "8 days ago" (quotes).

### 1.15 Links

| # | Look | Where |
|---|---|---|
| a | Orange, medium, no underline until hover | a grid's first column (`DataGrid` `LINK`) |
| b | Orange, underlined, with an icon square or initials (`RecordChip`) | prototype grids, tables, asides |
| c | Orange, underlined, no icon | facts in panels ("Job", a phone number), `20` |
| d | Orange, no underline: actions that are not links (Edit, Remind, Collect payment, Open, New quote, Update card) | cards and rows |
| e | Orange, no underline: a date that opens a message | Messages table, `40` |
| f | `‹ Jobs` crumb | record pages |
| g | `Button variant="link"` (`text-primary`, the lighter orange) | 3 uses |

The class string for (a) to (d) is typed out in 13 files (`CustomerPage.tsx`, `CustomerBilling.tsx`, `CustomerQuotes.tsx`, `ConsentCard.tsx`, `InvoicePanel.tsx`, `InvoicesPage.tsx`, `JobPageParts.tsx`, `quotes/QuoteParts.tsx`, `quotes/QuotesList.tsx`, `requests/RequestPage.tsx`, `DataGrid.tsx`, `BillingActions.tsx`, `AsideCard.tsx`, plus `RecordChip.tsx` and `RequestRows.tsx` with their own). Counts per screen are in finding F2.

## 2. Consistency findings

Severity: **High** costs Ryan time or trust every day, or blocks polish; **Medium** is visible inconsistency; **Low** is tidiness.

### F1. Two generations of the admin, shown side by side. High

- **What:** panels against pages. Shipped: a record opens in `SidePanel` over its list (`34`, `39`). Prototype: a record is a page with a header, a summary band, section cards and an aside (`42`, `40`, `47`). The lists differ too: shipped Jobs has 9 plain columns, a Money column that is cut off at 1280 ("$145 · Past due sinc", `32`) and a "2 invoices out" header filter; prototype Jobs has chips, a Billing column and no header filter (`35`).
- **Why it matters:** every other finding below is worse because of this seam. A polish agent that fixes the panel version of a pattern is polishing something that is about to go.
- **Recommendation:** keep the page generation (Hannah's Jobber reference is a page; the handoff's build step lists it). Keep `SidePanel` for one thing only: a visit opened from the Schedule or Home, where leaving the calendar would lose the user's place. Until the build step lands, mark the shipped `Screens/Jobs`, `Screens/Customers` and the panel stories as "superseded" in Storybook so nobody reviews or polishes them. Question Q1.

### F2. Too many links. High

- **What, measured at 1280 (orange text targets in the main area / of those underlined / all targets):** Invoices list 45 / 27 / 60. Customer page 39 / 21 / 55. Jobs grid (prototype) 36 / 24 / 50. Quotes list 21 / 14 / 41. Job page 16 / 9 / 41. Shipped Jobs grid 16 / 0 / 31. Shipped Customers 25 / 0 / 69.
- **Where it comes from:** (1) every record named in a row is a `RecordChip`: the prototype Jobs row links the customer, the job and the property (`35`); an Invoices row links the invoice, the customer and the job, then adds Remind, Collect payment and a receipt icon (`44`). (2) A row links its own record twice: the Quotes row has the number and an "Open" in Next action (`46`). (3) On a record page the same record is linked in every table: Andrea's job names appear under Jobs, again under each invoice and again under each payment (`40`). (4) Actions are drawn as links (1.15 d), so the eye cannot tell "goes somewhere" from "does something".
- **Why:** when everything is orange nothing is. NN/g's guidance is that links navigate and buttons act, and that the two should look different; Linear, Attio and Jobber lists make the row the target and keep other records as plain text until the record is open.
- **Recommendation, the single version:**
  1. **In a list, the row opens its own record and nothing else is a link.** First column is the name (look a); the whole row is clickable from `md` up as the phone card already is. Customer, job and property in other columns are plain text. This is what DESIGN.md "Tables" already says.
  2. **At most one visible row action, and only where the list is a work queue** (Invoices: Collect payment; Quotes: Remind). Everything else goes in a More menu at the row's end. Never a second link to the row's own record.
  3. **On a record page a related record is linked once**, in the place that is about it (the Customer aside, the band's cell). Tables inside cards show names as text; the row opens the thing the table lists.
  4. **Actions are never orange text.** A quiet action in a card title (Edit, New quote) is `Button variant="ghost" size="sm"` in the foreground colour; orange text is reserved for navigation.
  5. One `TextLink` block replaces the 13 typed strings, with two looks: plain (in a grid's first column) and `RecordChip` (in prose, facts and asides).
- Expected effect: Invoices list from 45 orange targets to 9 names and 5 buttons; Customer page from 39 to about 12.

### F3. The selected state has five looks in the admin. High

- **What:** navy fill (`SegmentedControl`, `TimeChips`, `DayCalendar`); orange tint with an orange border (`CollectPayment` radios, `34`); orange tint on a rounded-full chip (Schedule dialog's Who, `57`); white card on stone (`ui/tabs` on Home, `10`); an underline (Quotes tabs, Settings entries); amber fill (an active filter chip, `62`).
- **Recommendation:** three, each with one meaning. **A choice in a form** is `optionClass` (navy when chosen), the customer side's rule: move `CollectPayment`'s radios and `SchedulePicker`'s chips onto it. **A view switch** is `SegmentedControl` (Home's By job, By person moves; DESIGN.md already says so). **A scope of a list** is line tabs (Quotes; Settings entries). The amber filter chip stays: it marks "a filter is on", not a choice. Orange tint as "selected" goes away, which also keeps orange for actions only.

### F4. The admin has no type scale. High

- **What, measured:** h1 28px (lists) and 30px (records). Card titles 24px/600 (Home, Schedule, Settings, Reports) and 18px/400 (every record page). Display-face headings are sometimes 600 and sometimes 400 with no rule (`EmptyState`, `CollectPayment`'s heading, `DataGrid`'s empty title and `SectionHeading size="section"` are 400). Arbitrary sizes: `text-[11px]` ×10, `text-[10px]` ×7, `text-[9px]`, `text-[13px]`, `text-[1.75rem]` ×2. `font-display` is typed with its own size in 24 block files and 6 screen files.
- **Recommendation:** give the admin roles in the same place the customer's live (`src/app/base.css`), denser where it should be (section 3). Then `PageHeader`, `RecordPage`, `SidePanel`, `ConfirmDialog`, `SectionHeading`, `SectionCard`, `EmptyState`, `SummaryBand`, `StatTile` read the roles and no screen types `font-display text-…`. The gate can then fail on `font-display` outside those blocks.

### F5. Settings › People overlaps its own fields at 1280. High (defect)

- **What (seen, `24`, `29`):** the label "Most per day, by kind" sits on top of the Hours end time ("5:00 pm" and its chevron run under the label). The four small labels read "Turn-ons InspectionsBlowouts Repairs" with no gap, and the Blowouts box shows "1" with the second digit clipped. At 375 the same row is fine (`31`).
- **Where:** `settings-tabs/People.tsx` with `FormRow inline` in a two-column grid; the two time fields plus "to" are wider than the column.
- **Recommendation:** Hours on its own full-width row; the four counts as a 4-column grid with `gap-3` and a minimum box width that fits two digits. Add a story assertion like the tables' FitTheCard one (no control overlaps the next label).

### F6. Buttons have no admin size, so every screen sets its own. High

- **What:** see 1.5. 78 of 141 `<Button>`s add `min-h-11`; the grid toolbar adds `h-9 text-sm`; Schedule's row buttons are the bare `sm` (32px, 12px text). The page's primary is 44 high on shipped screens and 32 in the Navigation prototype, and is labelled "New job" in one and "+ New job" in the other.
- **Recommendation:** two sizes in `ui/button.tsx` for the app: `md` = 36px at `md` and up, 44px below (`h-11 md:h-9`), 14px text, for everything in a page; `lg` = 44px for a page header's primary and a footer. Delete the hand-typed heights. Add a real `destructive` variant use in `ConfirmDialog` in place of class overrides. Decide the label once (Q4).

### F7. Feedback after an action appears in four places. Medium

- **What:** 1.9. Bottom centre (`Toast`), top centre (`UndoToast`), inline under the list (`TextingStrip`), under the form (panels), in a sticky card (`SaveBar`).
- **Recommendation:** one `Toast` block, one place (bottom centre; on a phone above the tab bar), with an optional action or two (Undo; Notify and Undo for the scheduler). 4 seconds without an action, 10 with one. `UndoToast` becomes that block's `action` case; `TextingStrip` is retired by the scheduler. `SaveBar` stays: unsaved changes are a state, not a result. Every shipped action that today prints a status line under a form raises the toast.

### F8. Forms: the select, the label and the footer are retyped. Medium

- **What:** 1.7 c, d, e, j. Also the New job sheet's "Add job" sits in the scrolling body, left aligned, with its consequence line under it (`52`); every other sheet and dialog has a fixed footer.
- **Recommendation:** a `SelectField` block (the native select, styled once, used inside `FormRow`), and delete the 8 constants. Pay the gate's ALLOW debt on New job (it is the oldest entry, Nov 18, "step 2"): `FormRow`s, `SidePanel variant="sheet"` with a fixed footer (primary right, Cancel left of it). Checkboxes get a 44px hit area on a phone (F12). One disclosure sign: replace the two native `<details>` triangles with the chevron the customer side uses.

### F9. Dialog footers and stacking. Medium

- **What:** 1.6. "How is this paid?" has no Cancel when it is a dialog (`34`) and has one when it is a panel body (`50`); its button is left aligned where every `ConfirmDialog` is right aligned. It opens over an open panel.
- **Recommendation:** `CollectPayment` renders its confirm through `ConfirmDialog`'s footer (`renderConfirm`), so it gets the same dismiss and alignment. With F1 (records become pages) the stacking goes away on its own; until then leave it.

### F10. A missing value has eight spellings; an empty card has no block. Medium

- **What:** 1.8 b and c.
- **Recommendation:** one rule in DESIGN.md and one helper. A missing number is "—" (`MoneyCell` already). A missing day is "Unscheduled" (the status word, already used for a job). A missing person is "No one yet". Nothing else: "None" and "Nothing ahead" go. On a phone card a value never appears without its label (the bare "None" under the pill). An empty card is `EmptyState size="line"` (one muted sentence), replacing the hand-typed `<p>`s. The List view's count line is hidden when the grid is empty.

### F11. Money and dates are formatted in many places. Medium

- **What:** 1.13 and 1.14.
- **Recommendation:** one module, `src/lib/format.ts`: `money(n)` (whole dollars, comma, a leading minus for a refund), `dayShort` ("Nov 12"), `dayWithWeekday` ("Thu, Nov 19"), `dayLong` ("Thursday, November 19"), `timeOf` ("2:30 pm", "Any time"). Rules: a grid cell uses `dayShort`; a card, band or panel uses `dayWithWeekday`; a year only when it is not this year; "Today" replaces the date only in a band or a pill. The emails and the customer side import the same functions.

### F12. Phone: controls under 44px, and desktop controls that have no use. Medium

- **What, measured at 375 (targets under 44px / all):** Schedule 34/46 (week blocks 29 high, "Schedule" 32, Previous, Today, Next 40, the two selects 36). Settings entry 35/52 (inputs 40, checkboxes 16×16). Job page 21/55 (checklist checkboxes 20×20, note and photo icons 32 wide). Every list: search 36, filter chips 34, Columns and Export 36, Next 32 (`18`, `33`, `95`). Visit panel: Close 32×32. Shell: "+ New job" 32 high in the prototype top bar.
- **Also (seen):** Columns and Export take a whole toolbar row on a phone where the list is cards and has no columns (`33`, `36`). The phone top bar is logo, New job, search, account in the prototype (`03`) and logo, account in the shipped stories with New job in the page (`11`, `33`). On Schedule the header's filled "New job" and the day's outline "New job" are both on screen (`17`).
- **Recommendation:** F6's responsive size fixes most heights. Hide Columns below `md`; move Export into the list's More. Filter chips 44 on a phone. Checkbox and icon buttons get `min-h-11 min-w-11` hit areas. One phone top bar (the prototype's). On Schedule's phone day view drop the second "New job" (the header's already fills the day). Apple's HIG asks for 44pt targets; WCAG 2.2 AA asks for 24px, which the 16px checkboxes also miss.

### F13. The focus ring is too faint, and there is no skip link. Medium (accessibility)

- **What:** `focus-visible:ring-primary/50` is on 72 elements and in `ui/button.tsx`. Orange #D97706 at 50% over white is about #ECBB83, which is 1.75:1 against white (computed); WCAG 2.2 1.4.11 asks 3:1 for a focus indicator. DESIGN.md says new primitives use `ring-ring` (solid #D97706, 3.2:1); grep finds one use. Native selects and the calendar's month arrows show the browser's blue ring instead (`52`, `56`), so there are two ring colours.
- **Keyboard path (measured by pressing Tab):** from page load it takes 8 stops (six nav items, the account menu, the rail toggle) to reach the page; there is no skip link in `AdminShell`. In a record panel focus is kept in, Escape closes, and the order is Resize panel, Close, body, links, footer buttons left to right; the first stop being "Resize panel" is odd but harmless. Every stop showed a ring except the Settings tab panel container.
- **Recommendation:** `ring-ring` (solid) with `ring-offset-2` everywhere, in one sweep of `ui/button.tsx`, `option-styles.ts` and the typed strings (F2's `TextLink` removes most). Give selects the same ring. Add "Skip to content" as the first stop in `AdminShell`.

### F14. Three navigations. Medium

- **What:** the shipped rail has 6 items (`admin-nav.ts` `NAV`); DESIGN.md's recipe describes 8 (with Requests and Quotes); the clickable walkthrough has 9 (it adds Invoices, `89`). In the standalone stories the lit item is wrong: Invoices lights Jobs (`44`), a quote page lights nothing (`47`).
- **Recommendation:** one `NAV` holding every item, with `requests`, `quotes` and `invoices` behind the same flag the screens ship on; `AdminSection` derived from the address for every record page. See section 4 for the order and the phone.

### F15. Notices and banners are typed by hand. Low

- **What:** six looks for "a line that tells you something": the move lock (`VisitMove.tsx:122`), texts paused (`settings-tabs/Messages.tsx:82`), `InvoiceBanner`, `DoNotServiceTag`'s line, `BillingBody`'s status line, the Photos tile. Tints are `/10` in some and `/14` in others.
- **Recommendation:** a `Notice` block with the pill's five tones and an optional icon and action; the six become uses of it.

### F16. Three card shells. Low

- **What:** 1.11 a, b, f.
- **Recommendation:** `SectionCard` is the one; Home, Schedule and Reports move onto it (their titles drop to the card-title role in F4); the hand-typed shells go.

### F17. Motion is on the customer tokens in one admin file. Low

- **What:** `--motion-*` is used by `AdminShell` only. Elsewhere the admin has `duration-200` ×4, `duration-300` ×2, `duration-400`, `duration-500`, `transition-all` ×2 and bare `transition-colors` (Tailwind's 150ms).
- **Recommendation:** hover and press on `--motion-fast`; sheet, dialog, popover and toast on `--motion-base`; nothing longer. A chosen option settles as on the customer side once F3 lands. I did not check the sheet and dialog animations under `prefers-reduced-motion`.

### F18. Icons: several for one meaning. Low

- **What (grep of imports):** an invoice is `Receipt` (10), `ReceiptText` or `FileText`, and a quote is also `FileText`; a day is `CalendarDays` (7) or `Calendar` (3); a person is `UserRound`, `Users` or `UsersRound`; done is `Check`, `CheckCircle2` or `CircleCheck`; a warning is `TriangleAlert` or `AlertCircle`; more is `MoreHorizontal` or `Ellipsis`. Sizes are mostly `size-4` (68) with `size-3.5` (14) and `size-5` (16).
- **Recommendation:** one `icons.ts` in blocks that names them by meaning (`InvoiceIcon`, `QuoteIcon`, `DayIcon` …); 16px in text and buttons, 20px in a band's circle.

### F19. Small things seen on the way. Low

- Visit panel notice runs two sentences together: "Closed, texts only The day passed on Wed, Apr 8. Mark it done or move it." (`20`).
- Visit panel: the Job fact's link text is the word "Job", and a "Job" section under it says the same thing again (`20`).
- `RecordFooter` wraps "Cancel visit" onto its own line at the panel's default width when four buttons are present (`20`, `74`).
- Settings' change log fixture still says "Truck 2 working days" and "Buffer, first two weeks", words the gate bans on screens (`24`).
- Settings › Messages opens with a seven-line paragraph of placeholders (`27`); it is a reference list and should be one.
- Quote page history is out of order (Nov 9, Nov 10, Nov 9) (`47`).
- Shipped Jobs search placeholder is cut off: "Search by name, street or p" (`32`).
- Command search finds customers, jobs, days and waiting requests. It does not find an invoice or a quote by its number (`record-search.ts`), though both now have numbers people will read off a text.

## 3. Admin against the customer system

| Thing | Customer side (now consistent) | Admin today | Adopt, or differ on purpose |
|---|---|---|---|
| Type roles | `type-title` 36, `type-heading` 24, `type-option` 20, `type-body` 16, `type-item`, `type-value`, `type-label` 14, `type-meta` 14, `type-caption` 12, `type-figure` 36 | none; sizes typed per block (F4) | **Adopt the mechanism, differ on sizes.** Admin roles in the same file: page title 28, record title 28 (not 30), card title 20/600, section 16/600 body face, body 14, label 14/500, meta 13 or 14, caption 12, figure 28 in a band and 36 in a stat tile. Laptop-first and dense is right for an office tool (Linear and Attio run 13 to 14px body). |
| Money in a list | `PriceLines` + `PriceTotal`, `type-value`, tabular, right aligned | `LineItemList`, a hand-built totals block on quotes, `MoneyCell` | **Adopt** for every list of line items (a job's What's included, a quote, an invoice). `MoneyCell` stays for grid cells. |
| Selected option | `optionClass`: navy fill, settles once, one focus ring | five looks (F3) | **Adopt** for every choice in a form. |
| Day and time | `DayCalendar`, `TimeChips`, `DayField` | already the same blocks (`56`, `57`, `88`) | **Already adopted.** The one gap is the Who chips beside them. |
| Disclosure | one chevron, 44px, `aria-expanded` | native `<details>` triangle ×2, chevrons in menus | **Adopt.** |
| Motion | `--motion-press/fast/base/draw`, off under reduced motion | Tailwind durations (F17) | **Adopt** fast and base. **Differ:** no draw animations and no staggered reveals in the admin; an office tool should feel instant. |
| Dialog | `ui/dialog`, title `type-heading`, outline dismiss, primary or destructive confirm, 44px buttons | `ConfirmDialog` does the same with hand-typed classes | **Adopt** `DIALOG_TITLE` and `DIALOG_DESTRUCTIVE` in `ConfirmDialog`, so both sides read one definition. |
| Buttons | 48px in a flow, 16px text | 32 to 44, 12 to 14px (F6) | **Differ:** 36px on a laptop, 44 on a phone. |
| Control height | 44 to 48 everywhere | 36 to 44 | **Differ on a laptop, match on a phone.** |
| Empty and error | `EmptyState`, not-found pages with a way on | `EmptyState` plus typed lines; no not-found | **Adopt** an admin not-found (a bad `?job=` id today has no designed answer). |
| Feedback | a done step or page, no toasts | four kinds (F7) | **Differ:** the admin needs a toast; one. |
| Status words | `src/lib/portal/words.ts` | `StatusPill`, `money/words.ts` | **Differ:** the two audiences read different words by design. Keep. |
| Links | few; one action per card | F2 | **Adopt the restraint.** |

## 4. Navigation and shell

Read from the screens, the stories and the code. I did not click through the walkthrough end to end, so the click counts are the shortest path each design allows, not a timed test.

### 4.1 Orientation

- **Good:** the rail is short and flat, the lit item is strong (solid orange on navy), the page title is in a fixed place on list pages, the account menu is where Linear, Attio and Mailchimp put it (bottom of the rail), and Cmd+K exists (`01`, `02`, `08`).
- **Weak:** on a record page the only "where am I" is a 14px crumb; the 56px bar is empty (`42`). Put the crumb and the record's name in the bar (it is sticky, so the name stays as the page scrolls) and keep the big title in the page. The Search button is in the bar in some stories and missing in others (`01` against `10`); it should be there always.
- **Nine items is the ceiling.** Home, Schedule, Requests, Jobs, Quotes, Customers, Invoices, Reports, Settings (`89`). It reads fine at 1280 because there are no groups, but the order mixes the pipeline with the directory. A grouping that costs nothing: Home, Schedule; then the work in the order it happens: Requests, Quotes, Jobs, Invoices; then Customers; then Reports and Settings at the foot. Q2.

### 4.2 Clicks to the common jobs

| Job | Shortest path | Clicks | Note |
|---|---|---|---|
| Collect a payment on a finished job | Home › Needs action row "Done, unpaid" › Collect $145 › method › Record | 4 | Good. The row's button could be "Collect $145" itself and save one. |
| Collect on an invoice | Invoices › "Collect payment" on the row › confirm | 3 | Good; keep this one row action. |
| Collect from a customer | Customers › customer › Collect payment › confirm | 4 | Fine. |
| Schedule a new job | New job (header, any screen) › customer › service › day and time › Add job | 1 to open, then the form | Good: one filled button, same place on every list page. Missing on record pages, where the primary is the record's own (correct), so Cmd+K should offer "New job" as an action. |
| Schedule an unscheduled job | Schedule › Unscheduled row › Schedule | 2 | Good today. The list is 25 undifferentiated rows with 25 buttons (`14`); the scheduler redesign turns it into a side panel. |
| Send a quote from a request | Requests › request › Send a quote › (convert sheet) › editor › Send › confirm | 6 or 7 | The longest path. The object auditors own the steps; from the shell's side, the sheet and the editor are two surfaces where one would do. |
| Send a quote by hand | Quotes › New quote › fill › Send › confirm | 4 plus the form | Fine on a laptop. On a phone Quotes is under More: 5. |
| Find a customer | Cmd+K › type › Enter | 2 keys and a name | Good. |

### 4.3 Search

Cmd+K is the right tool and is built well: grouped results, the record opens in place, a second line with the street and phone (`08`). Gaps: no invoices or quotes by number (F19); no actions (New job, New quote, Go to Settings), which is what makes a command palette in Linear and Attio worth learning; the group called "Days" lists a customer's name with a day under it, which reads as a third copy of the same customer (`08`). Rename the group for what it holds (a visit) or fold it into Jobs.

### 4.4 The phone

- **Bottom bar:** Home, Schedule, Jobs, Customers, More (`03`). More holds up to five things once Requests, Quotes and Invoices ship, and carries the count badge for requests (`90`). That hides the newest work two taps down. Ryan in the truck needs Home (today), Schedule, and what is waiting on him. Proposal: Home, Schedule, Jobs, Customers, More stays, but Home's Needs action carries the request and quote rows (it already does, `RequestRows`), and More opens a full sheet of the remaining items with their counts rather than a small menu. Q3.
- **Top bar:** see F12. One bar: logo, the page's primary, search, account.
- **Lists as cards** work (`33`, `95`). The card needs a label on every value (F10) and the toolbar needs to lose Columns and Export.
- **Record pages** stack well and keep the actions in a sticky bar over the tab bar (`43`). The Customer page on a phone is very long (`41`); the section order is the Customer auditor's.
- **Sideways scroll:** none on any of the 14 phone screens measured.

### 4.5 The Schedule and the scheduler redesign

The scheduler docs are not on `review-prototypes`; they are on `origin/scheduler-prototype` (`docs/plans/2026-11-25-scheduler-design.md`, `-research.md`, `-reconciliation.md`, with a Storybook prototype). That design replaces most of what this audit saw on the Schedule: the week becomes a time grid like Jobber's (D3), Unscheduled and Map become side panels, a move no longer texts by itself and raises a "Visit moved" toast with Notify and Undo (D5), and the 60-second `TextingStrip` and the Move split button go. So for polish agents: **do not touch `ScheduleScreen`, `WeekGrid`, `ScheduleDay`, `StopRow`, `ToScheduleTray`, `TextingStrip`, `VisitMove` or `SplitButton`.** Three things from this audit should reach that session: its toast is the one `Toast` of F7 (design it with two actions once); its phone day rows are 29px high today (F12); and Home's `TodayVisitRow` should become the same row its Day view draws.

## 5. Accessibility quick scan

| Check | Result | Evidence |
|---|---|---|
| Automated (axe) | Every story runs axe as an error in `npm run test:stories`; I did not re-run the suite. Contrast of text is therefore machine-checked; the items below are what axe does not catch. | `.storybook/preview.tsx` |
| Focus ring contrast | **Fails.** 1.75:1 for the 50% orange ring on white; two ring colours. | F13 |
| Skip link | **Missing.** 8 tab stops before the page. | F13 |
| Keyboard path through a record panel | Passes: focus moves in, is trapped, Escape closes, order follows the layout, footer reachable. | F13 |
| Keyboard path on a list | Passes: nav, bar, toolbar, sortable headers, then rows. Name links and sort buttons are 20px high (acceptable on a laptop). | measured |
| 44px targets at 375 | **Fails on the Schedule, Settings and the job checklist;** every list toolbar is 34 to 36. | F12 |
| Icon-only buttons | All have an accessible name on the 17 screens measured (0 without). | measured |
| Colour alone | Status pills carry a word and a dot; money uses red only with the words Past due and Failed. The week's area colour bars rely on a legend and colour only; the scheduler owns it. | `14`, `60` |
| Heading order | h1, then h2 for cards, h3 in panels. Home has an h2 at 16px/400 and h3s at 14px; sizes do not follow levels (F4) but the order is valid. | measured |
| Native details | The two `<details>` are keyboard operable; only the sign differs. | `24` |
| Not checked | Screen reader output, zoom to 200%, reduced motion on sheets, the tech (read-only) role, colour contrast by hand. | section 8 |

## 6. Polish backlog

Ordered. Each task names the files it owns so two agents never share one. S is under half a day, M about a day, L more. Tasks marked **wait** depend on an answer or on the scheduler branch.

**Group A. Foundations (do first, one agent at a time: they touch shared primitives).**

| # | Task | Files | Size |
|---|---|---|---|
| A1 | Admin type roles beside the customer's; move the header and heading blocks onto them; record title to 28 | `src/app/base.css`, `PageHeader`, `RecordPage`, `SidePanel`, `SectionHeading`, `SectionCard`, `EmptyState`, `ConfirmDialog` (title only), `SummaryBand`, `StatTile`, `docs/DESIGN.md` | M |
| A2 | Button sizes `md` (36, 44 on a phone) and `lg`; delete hand-typed `min-h-11`, `h-9` on Buttons; real `destructive` variant | `ui/button.tsx`, then a mechanical sweep of `<Button` in admin and blocks (not the Schedule files of 4.5) | M |
| A3 | Solid focus ring everywhere; skip link | `ui/button.tsx`, `option-styles.ts`, `ui/input.tsx`, `ui/textarea.tsx`, `AdminShell.tsx`, `globals.css` if a utility is added | S (do with A2) |
| A4 | `src/lib/format.ts` for money and days; replace the scattered definitions (9 for money, 12 for days) in the admin and blocks | new file, `lib/admin/metrics.ts`, `lib/admin/calendar.ts`, `visit-panel-model.ts`, `design/invoice-fixtures.ts`, `design/quotes/quote-deposit.ts`, `money/collect.ts` | M |

**Group B. One block per pattern (parallel after A; each owns its block and the listed callers).**

| # | Task | Files | Size |
|---|---|---|---|
| B1 | `TextLink` block; replace the 13 typed link strings; quiet actions become ghost buttons | new `blocks/TextLink.tsx`; `design/CustomerPage`, `CustomerBilling`, `CustomerQuotes`, `ConsentCard`, `InvoicePanel`, `JobPageParts`, `quotes/QuoteParts`, `requests/RequestPage`, `AsideCard`, `BillingActions` | M |
| B2 | Link diet in lists: one link per row, row click, one visible action, More menu | `DataGrid.tsx`, `data-grid-columns.tsx`, `design/JobsGridDesign`, `design/InvoicesPage`, `design/quotes/QuotesList`, `design/requests/RequestsList`, `design/walkthrough/WalkScreens` (customers columns) | L. **wait** for Q5 |
| B3 | Link diet on record pages: related record linked once; table rows plain | `design/CustomerTables`, `BillingTables`, `MessageTable`, `design/JobPageParts` (past visits) | M, after B2 |
| B4 | `SelectField` block; replace 8 constants and 17 native selects' classes | new `blocks/SelectField.tsx`; `JobDialogs`, `VisitEditText`, `VisitMoveDone`, `JobLinesSection`, `design/CustomerDialogs`, `design/quotes/QuoteDialogs`, `design/requests/RequestDialogs`, `design/requests/ServicePicker`, `settings-tabs/fields.tsx` | M |
| B5 | New job onto the recipe: `FormRow`s, fixed footer, chevron disclosure; remove its four ALLOW entries | `NewJob.tsx`, `NewJobPass.tsx`, `NewJobService.tsx`, `CustomerPicker.tsx`, `scripts/design-gate/admin-rules.mjs` | M. **Check first:** the scheduler branch edits `NewJob.tsx` and `NewJobService.tsx`; do this after it merges |
| B6 | One `Toast` with optional actions and one position; `UndoToast` folds in; shipped actions raise it | `Toast.tsx`, `UndoToast.tsx`, `AdminShell.tsx`, `use-runner.ts` | M. Agree the two-action shape with the scheduler session first |
| B7 | `Notice` block; six banners become uses | new `blocks/Notice.tsx`; `settings-tabs/Messages.tsx`, `InvoiceBanner`, `DoNotServiceTag`, `BillingBody`, `Photos` (not `VisitMove`, scheduler's) | S |
| B8 | Selected state: `CollectPayment` radios onto `optionClass`; its dialog footer through `ConfirmDialog`; Home's toggle onto `SegmentedControl` | `CollectPayment.tsx`, `JobCollect.tsx`, `TodayVisits.tsx` | S |
| B9 | Missing-value words and `EmptyState size="line"`; labels on phone card values; hide the count line on an empty grid | `EmptyState.tsx`, `DataGridCard.tsx`, `jobs-columns.tsx`, `customers-columns.tsx`, `CustomerJobs.tsx`, `RevenueScreen.tsx`, `VisitsList.tsx` | M |
| B10 | Card shell: Home and Reports onto `SectionCard`; delete hand-typed shells | `HomeScreen.tsx`, `HomeMap.tsx`, `ReportsScreen.tsx`, `RevenueScreen.tsx`, `SettingsScreen.tsx` | S, after A1 |
| B11 | Icons by meaning | new `blocks/icons.ts`, then imports | S |
| B12 | Motion tokens in sheet, dialog, popover, toast, hover | `ui/sheet.tsx`, `ui/dialog.tsx`, `ui/popover.tsx`, `SidePanel.tsx` | S |

**Group C. Shell and navigation.**

| # | Task | Files | Size |
|---|---|---|---|
| C1 | One `NAV` with every item behind flags; lit item from the address on record pages | `admin-nav.ts`, `admin-section.ts`, `AdminShell.tsx`, `AdminTabBar.tsx`, `MoreMenu.tsx` | S. **wait** for Q2, Q3 |
| C2 | Top bar: Search always; crumb and record name in the bar on record pages; one phone bar; one label for the primary | `TopBar.tsx`, `PageHeader.tsx`, `RecordPage.tsx`, `admin-bar.ts` | M. **wait** for Q4 |
| C3 | Command search: invoices and quotes by number; actions (New job, New quote, Settings); rename "Days" | `CommandSearch.tsx`, `record-search.ts`, `search-action.ts` | M |
| C4 | Phone toolbar: hide Columns, Export into More, 44px chips and search | `data-grid-toolbar.tsx` | S |
| C5 | Admin not-found and error pages | new files under `(admin)/admin/(shell)/` | S |

**Group D. Defects (each alone, any time).**

| # | Task | Files | Size |
|---|---|---|---|
| D1 | Settings › People overlap at 1280, with a no-overlap story check | `settings-tabs/People.tsx`, `SettingsScreen.stories.tsx` | S |
| D2 | Visit panel: the run-together notice, the "Job" link text, the duplicate Job section | `VisitPanel.tsx`, `visit-panel-model.ts` | S |
| D3 | `RecordFooter` wrap at the default panel width | `RecordFooter.tsx` | S |
| D4 | Settings: fixture words (Truck, Buffer); Messages placeholders as a list; phone checkbox hit areas | `settings-tabs/Messages.tsx`, `settings-tabs/People.tsx` fixtures, `SettingsScreen.stories.tsx` | S |
| D5 | `StatusPill › All` story shows every status; settle the "pill in a grid cell" sentence in DESIGN.md | `StatusPill.stories.tsx`, `docs/DESIGN.md` | S |
| D6 | Shipped Jobs grid: Money column cut off, search placeholder cut off | `jobs-columns.tsx`, `JobsScreen.tsx` | S. Skip if Q1 retires the screen |
| D7 | Mark superseded stories in Storybook (shipped Jobs, Customers, the three panels) | the stories' titles or a docs note | S. **wait** for Q1 |

Suggested order: D1, D2, D3 (visible today) › A1, A2 with A3, A4 › B1, B4, B7, B8, B11, B12 in parallel › Q answers › B2, B3, C1, C2 › the rest.

## 7. Questions for Hannah

Each is small and has a default; say "default" to any.

1. **Q1. Records: pages or panels?** Default: a job, customer, invoice, quote and request are pages (the prototypes); the side panel stays only for a visit opened from the Schedule or Home. The old Jobs and Customers screens are marked superseded.
2. **Q2. Nav order.** Default: Home, Schedule, Requests, Quotes, Jobs, Invoices, Customers, Reports, Settings (the work in the order it happens, then the directory).
3. **Q3. Phone bottom bar.** Default: keep Home, Schedule, Jobs, Customers, More; More opens a full sheet listing the rest with their counts.
4. **Q4. The primary's label.** "New job" or "+ New job"? Default: "New job", no plus, 44px, the same on a laptop and a phone.
5. **Q5. Links in a list.** Default: only the row's own name is a link and the whole row opens it; other records in the row are plain text; one visible action on Invoices (Collect payment) and Quotes (Remind), the rest under More.
6. **Q6. A pill for the default state on Home.** Default: a stop that is simply ahead shows no pill; pills appear for Done, Unpaid, Invoice sent, Not done and Waiting on customer.
7. **Q7. One toast, where?** Default: bottom centre on a laptop, above the tab bar on a phone, for both "done" and "Undo".
8. **Q8. Admin text size.** Default: body stays 14px, card titles become 20px semibold everywhere (down from 24 on Home, up from 18 regular on a job).

## 8. What I did not look at

- **Reports and Revenue on screen.** Their stories threw "Invalid hook call" from Recharts in my Storybook instance (a duplicate React in the dependency cache of my own run, most likely from linking `node_modules` into the worktree). I read `ReportsScreen.tsx` and `RevenueScreen.tsx` and nothing else; findings about them (the `ui/card` shell, typed empty lines, a 30px figure) are from code. Someone should open `Screens/Reports` in the usual Storybook to confirm it renders there.
- **The scheduler prototype's own stories** on `origin/scheduler-prototype`. I read the first third of its design doc and the file list, not the screens.
- **The live app and real data.** Everything is Storybook on fixtures.
- **768 (tablet), 1440, the collapsed rail, and the tech's read-only role.**
- **Screen reader output, 200% zoom, reduced motion on sheets, and contrast by hand** (axe covers text contrast in the story suite; I did not re-run the suite).
- **Clicking through the walkthrough.** Section 4.2's counts are read from the screens and the code.
- **The inside of each object** (what a customer, quote, request, job, visit or invoice shows and in what order): the other auditors' scope. Where I name them it is for a shared pattern.
- **Emails, the customer account and the booking form**, except four screenshots as the comparison's reference (`85` to `88`).
- **About a third of the 94 screenshots were captured as evidence and not each studied closely.** The ones cited by number in this document are the ones I looked at.

## Sources

- Nielsen Norman Group: "Command Links vs. Buttons" and "Guidelines for Visualizing Links" (links navigate, buttons act; make them look different); "Signal-to-Noise Ratio" (drop elements that carry no information); "Icon Usability" (icons need labels); "Empty States in Complex Applications"; "Data Tables: Four Major User Tasks".
- Baymard Institute: list-item hit areas (make the whole item clickable rather than only its title).
- W3C, WCAG 2.2: 1.4.11 Non-text Contrast (3:1 for focus indicators), 2.4.1 Bypass Blocks (skip link), 2.5.8 Target Size (24px minimum).
- Apple Human Interface Guidelines: 44pt minimum touch target.
- Jobber (Hannah's reference), Linear, Attio: record as a page with one primary action, rows as the target, a command palette with actions, dense 13 to 14px body. Carried from `docs/plans/2026-11-19-crm-patterns-research.md` and `2026-11-19-navigation-audit.md`; not re-fetched today.
- This repo: `docs/DESIGN.md` (Tables, Uniformity, The recipe, Navigation, Status colours, The customer type scale), `docs/plans/2026-11-20-handoff.md`, `scripts/design-gate/admin-rules.mjs`.
