# The one admin prototype: implementation spec

**Sidebar as of Nov 20 2026 (supersedes the "Design" group named below).** The sidebar is: `Start here` (the review guide, `src/app/_review/`, its link list is `review-steps.ts` and a unit test checks every id), `Admin` (Walkthrough (clickable), Jobs grid, Job page one trip, Job page Season Pass and return trip, Customer page, Invoices, Confirmations with the payment reminder and Schedule dialog stories, Navigation), `Customer` (Walkthrough (clickable), Booking form), then Screens, Emails, Blocks and UI. The old `Design/Customer side: booking, account, texts`, `Design/Job flow (clickable)`, `Design/Payment reminder` and `Design/Schedule dialog` groups are gone; story ids now start `admin-` or `customer-`, and the customer walkthrough's phone loads `customer-walkthrough-clickable--phone-screens`.

Nov 19 2026. Hannah: "I want one holistic prototype of all this, in Storybook. Clean it up. Make sure it's easy to walk through." This is the spec a designer builds from, on a branch off `origin/review-prototypes`, with a PR into `review-prototypes`. Nothing here is wired to the API; it is the prototype step of the workflow (research, requirements and data model, Storybook prototype, build).

## 1. What exists (on `review-prototypes`, `src/app/(admin)/admin/_screens/design/`)

| Piece | File | Stories (Storybook ids) |
|---|---|---|
| Job page, one trip (every state) | `JobPage.tsx`, `JobPageParts.tsx`, `job-fixtures.ts` | `admin-job-page-one-trip--*` |
| Job page, Season Pass and return trip | `JobPageTrips.tsx`, `trip-fixtures.ts` | `admin-job-page-season-pass-and-return-trip--*` (the Season Pass flow story is here) |
| Job flow, clickable (Schedule → Scheduled → Today → Active → Done → Billed) | `JobFlow.tsx`, `confirm-copy.ts`, `MessageDialog.tsx`, `ReminderDialog.tsx` | the flow runs inside `admin-walkthrough-clickable--*`; its email, both-channels and card charge and refund stories are in `admin-job-page-one-trip--flow-*` |
| Jobs grid | `JobsGridDesign.tsx` | `admin-jobs-grid--*` |
| Customer page | `CustomerPage.tsx`, `CustomerBilling.tsx`, `customer-fixtures.ts` | `admin-customer-page--*` |
| Invoices list and invoice page | `InvoicesPage.tsx`, `InvoicePanel.tsx`, `invoice-fixtures.ts` | `admin-invoices--*` |
| Confirmations catalogue | `ConfirmActions.stories.tsx` | `admin-confirmations--*` (with the payment reminder and Schedule dialog stories) |
| Navigation (shell, account menu, More, record from Home/search/list) | `admin-navigation--*` (the blocks `TopBar`, `AdminAccountMenu`, `MoreMenu`, `AdminShell`) | |
| Schedule picker (design only) | `SchedulePicker.tsx` | |
| Blocks | `src/components/blocks/`: `RecordPage`, `SectionCard`, `SummaryBand` (tiles link), `AsideCard`, `StatusPill` (colour table applied), `RecordChip` + `RecordPreview`, `DataGrid` (embedded mode) + `DataGridCards`, `BillingTables`, `Toast`, `ConfirmDialog`, `SplitButton`, `MessageTable` | each has a story under Blocks |

Every record name is a `RecordChip` whose `href` comes from `recordHref.*` (`/admin/jobs?job=<id>`, `/admin/customers?customer=<id>`, `/admin/invoices?invoice=<id>`, `/admin/schedule?day=<yyyy-mm-dd>`, a person, a property). That is the seam the walkthrough uses: it never edits a page component.

In flight on `origin/customer-invoices-fixes` (another designer, do not touch its files: `CustomerPage*.tsx`, `CustomerBilling.tsx`, `customer-fixtures.ts`, `InvoicesPage.tsx`, `InvoicePanel.tsx`, `invoice-fixtures.ts`, `DataTable*`, `customer-confirm.ts`): the customer and invoice tables moving onto `DataGrid`, the Invoices list's toolbar and row actions, chip and date nowrap, photo captions, the "Not paid" tile. The walkthrough composes those pages as they are; when that branch merges, the walkthrough picks the fixes up with no change.

## 2. The walkthrough: one story, one in-memory router

**Where:** `src/app/(admin)/admin/_screens/design/walkthrough/` (new folder, new files only):

- `Walkthrough.tsx`: the prototype. Renders the real `AdminShell` (navy rail: Home, Schedule, Jobs, Customers, Invoices, Reports, Settings; phone tab bar with More) around a screen chosen by an in-memory route `{ screen, id?, step? }` held in React state. No Next router, no URL changes (Storybook owns the URL).
- `routes.ts`: pure. `parseHref(href) → Route | null` maps the hrefs `recordHref.*` emits (and the nav links) to a route; `routeTitle(route)` gives the breadcrumb words. Unit-tested.
- `data.ts`: one consistent world, built from the existing fixtures (`job-fixtures`, `trip-fixtures`, `customer-fixtures`, `invoice-fixtures`), re-keyed so every chip resolves: Andrea Dalton (480 Briggs St, Erie) has the repair job that the flow walks, a 2026 Season Pass and a 2027 one ("Renewed from / as"), invoices INV-2026-0042 (sent) and INV-2026-0031 (paid); Marcus Bell has the past-due invoice; Dale Whitaker the renewed pass; the Jobs grid lists every job of those three plus the grid's other rows. Where two fixtures disagree about the same record (ids, dates, amounts), `data.ts` is the truth and the fixtures are shaped to it here, not edited.
- `Walkthrough.stories.tsx`: title `Design/Start here: the admin, clickable`, stories `Laptop` (1280, starts on Jobs) and `Phone` (375, starts on Jobs), plus `From Home` (starts on the Home placeholder) and `From Search` (Cmd+K open). Play functions: open a job from the grid, go to the customer from the chip, back, open an invoice from Billing, Invoices in the rail, assert each screen's heading.
- `Walkthrough.mdx`: the Docs page at the very top of the Design section, "How to walk through": the order below, what to click at each step, and a list of what is placeholder.

**Link interception:** one capture-phase `onClickCapture` on the prototype's root: for a click on an `<a href>` (or an element inside one) whose href parses to a route, `preventDefault()` and set the route; a href that does not parse (tel:, mailto:, Stripe, the pay page) opens nowhere and shows the toast "Outside the prototype: <href>". `useOpenRecord`-style callbacks the pages expose (`onOpen`, `onNavigate`) are passed the same setter. Buttons that would navigate in the live app (New job's "Add job", the flow's "Open job", a toast's "View") get the same route setter through their existing props; a page that lacks a prop for it keeps its link, which the interceptor catches.

**Screens by route:**

| Route | Renders | Notes |
|---|---|---|
| `jobs` | `JobsGridDesign` | the start; every row and chip opens its record; "New job" opens the existing New job sheet (the live `NewJob` from `_screens/` if it mounts without data, else a one-screen placeholder that says what the sheet does and offers "Add job" which opens the flow at Schedule) |
| `job/<id>` | `JobPage` in the state the data gives it, or `JobPageTrips` for a pass; Andrea's repair renders `JobFlow` so the actions work | the flow's step strip stays; "‹ Jobs" goes back |
| `customers` | a plain list (DataGrid, embedded recipe) of the three customers: name, street, next visit, unpaid, pass pill | new, small, in `walkthrough/` |
| `customer/<id>` | `CustomerPage` | |
| `invoices` | `InvoicesPage` | the rail lights Invoices (add `invoices` to the shell's section type inside the walkthrough only if `AdminShell` needs it; never add a live nav link in `admin-nav.ts`) |
| `invoice/<id>` | `InvoicePanel` (the invoice page) | |
| `home`, `schedule`, `reports`, `settings` | a `Placeholder` screen: the heading, one line "Not part of this prototype. The live screen is /admin/<x>.", and for Schedule a day's link back to the job that day holds | never blank |
| `search` | the existing `CommandSearch` block over the walkthrough data, hits open routes | |

**Back and breadcrumbs:** the route stack is state; "‹ Jobs" / "‹ Andrea Dalton" at the top of a record (the `RecordPage` `back` slot) pops it; the browser back button is not used. A `TopBar` breadcrumb "Prototype · Jobs › Andrea Dalton › INV-2026-0042" sits under the real top bar in a quiet strip with a "Start over" button, the same strip the flow uses.

**Dialogs and toasts** are the pages' own (`ConfirmDialog`, `Toast`); the walkthrough adds a `ToastProvider` once at its root if `AdminShell` does not already.

**Phone:** the same story at 375 through the `Phone` story's viewport; the shell's tab bar routes the same way; the record pages are their phone layouts already.

## 3. Clean-up of the Storybook sidebar

- `.storybook/preview.tsx` `storySort`: Design first, inside it `Start here: the admin, clickable` (Docs page first, then Laptop, Phone, From Home, From Search), then `Job flow (clickable)`, `Job page, one trip`, `Job page, Season Pass and return trip`, `Customer page`, `Invoices`, `Confirmations`, `Navigation`, `Jobs grid`; then Screens (the live screens), Emails, Blocks, UI.
- Rename the story group `Design/Jobs, Invoices and Billing` to `Design/Jobs grid` (its invoice and billing stories were replaced by `Design/Invoices`); delete any story there that duplicates one in `Design/Invoices` or `Design/Customer page`. `design-stories.stories.tsx` and `design.test.tsx` are the files; keep the edit minimal and rebase on `review-prototypes` before the push (the other designer may touch them).
- Every Design story group gets a one-paragraph Docs description (`parameters.docs.description.component`) saying what it shows and what to click; every story name is sentence case and says the state ("Invoice sent", not "InvoiceSent").
- Stories that only exist as a catalogue of states stay; nothing is deleted that shows a state the walkthrough cannot reach.

## 4. Rules the prototype keeps (Hannah's, settled Nov 19)

Every record name is a chip and a link; a summary tile links to its thing; a section never holds a result message (toast plus a row); money words only "Paid", "Unpaid", "Invoice sent", "Past due", "Failed"; "Collect payment" is the one money button, "Record the payment" only the Check/Venmo/Cash confirm; every customer-facing action confirms in a dialog that states the exact effect and the channel from the contact preference, with a "without notifying" caret path (reminders have none); exact times, never windows; the status colour table (scheduled navy, unpaid/waiting gold, past due red, done/paid green, canceled grey, brand orange never a status); embedded tables have no toolbar and fit their card; chips never wrap inside their label; 44px controls and 16px gutters on a phone. `docs/DESIGN.md` is the contract; a new block goes into its recipe table with a story.

## 5. Checks before each push

`npx tsc --noEmit`, `npm run check:design`, `npm test` (blocks, design and walkthrough folders), the full `npm run test:stories` (919 of 921 is the baseline; the two failures, booking "Contact Problems Phone" and pass "Pick Day", are older than this work). Then look at the Laptop and Phone walkthrough stories rendered in a browser and click the whole path (Jobs → job → flow to Billed → customer → invoice → Invoices → back to Jobs) before reporting. Report: the commit, what each nav item and chip does, and what is placeholder.

## 6. Done looks like

Hannah opens Storybook, the first item in the sidebar is "Start here", the Docs page tells her the order, and from the Laptop story she can click every chip, tile, row, nav item and action across Jobs, a job and its flow, the customer, Invoices and an invoice without a dead end; a placeholder says so where a screen is not part of the prototype. The catalogue stories under it are the per-state reference.

## 7. The customer side: the second "Start here" (Hannah, Nov 19: "include the customer side too, I haven't been able to walk through that. I only need to see those two things.")

Two walkthroughs, nothing else at the top of the sidebar: **Start here: the admin, clickable** (sections 2 and 3) and **Start here: the customer, clickable**.

**What exists:** `src/app/_flows/` holds the clickable customer flows already (`Flows.stories.tsx`, `BookingFlowStory`, `AccountFlowStory`, `TextsStory`) over the shipped account screens (`src/app/(account)/account/_screens/`: Home, Visits timeline, Visit page with Reschedule and Cancel sheets, Details, Receipts, the pass page `PassPageScreen`), the Season Pass checkout (`(checkout)/season-pass/checkout/_screens/CheckoutFlow`), the booking flow (`(booking)/booking/_screens/BookingFlow`), the pay page and the customer-side design in `docs/plans/2026-11-19-customer-side-design.md` (Mailchimp structure, exact times, holographic PassCard confirmation, tabs kept, account menu at the right, Details once).

**Build:** `src/app/_flows/walkthrough/` (new files only; the same in-memory router pattern as section 2, `parseHref` extended with the account and booking hrefs: `/account`, `/account/visits`, `/account/visits/<id>`, `/account/details`, `/account/receipts/<id>`, `/account/pass`, `/booking/*`, `/pay/<id>`, `/season-pass/checkout`). One story group `Design/Start here: the customer, clickable` with `Phone` first (the customer is on a phone) and `Laptop`, and a Docs page "How to walk through" at its top. The path, each step one click from the last, with the same breadcrumb strip and "Start over":

1. **Book online** (`/booking`): service, address, day and exact time, contact (with the contact preference: text, email, both), confirm → the holographic PassCard-style confirmation.
2. **The texts and emails that follow** (the `TextsStory` phone view): date set, two weeks out, day before with the exact time, on my way, receipt, invoice; each text's link opens the visit page inside the prototype.
3. **Account Home** (`/account`): the next visit with Reschedule and Cancel (or Text Ryan inside 24 hours), an invoice to pay, the pass card, the latest visits.
4. **Visits** timeline → **a visit page** → **Reschedule** (three days and "Show more days") and **Cancel** sheets with their done steps.
5. **Pay an invoice** (`/pay/<id>`, Stripe's box as a drawn placeholder, never a real card field) → the receipt page.
6. **Season Pass** page: the card, the season line, add July, skip a visit, Reserve next season → the renewal checkout.
7. **Details**: contact preference, phone, yard notes, "Tell Ryan someone needs to be home".

A screen the customer side does not have yet is a Placeholder with the heading and "Not part of this prototype" (never blank). The rules in section 4 apply as the customer-side design words them: "visit", "invoice", "unpaid", "past due", "canceled", never "job", "line", "stage"; exact times, never windows; every link is "your Trailhead account".

**Sidebar after this:** Design → Start here: the admin, clickable → Start here: the customer, clickable → the catalogues (Job flow, Job page, Customer page, Invoices, Confirmations, Navigation, Jobs grid, Customer side: booking, account, texts) → Screens → Emails → Blocks → UI. The two "Start here" groups are the whole review surface; everything under them is reference.
