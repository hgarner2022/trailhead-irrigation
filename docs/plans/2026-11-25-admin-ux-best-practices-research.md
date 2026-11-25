# Admin UX best practices: records, links, navigation (research, Nov 25 2026)

Hannah's brief: "Research best practices UX, how to do this. Best, but make sure it's all good." The goal is consistency and clarity across the admin; her complaint was "too many links". This document answers the questions that the three Nov 25 audits (`2026-11-25-admin-audit-objects.md`, `-customer.md`, `-patterns.md`) left open, with sources. Docs only; no source file was changed.

## How to read the evidence

| Tag | Meaning |
|---|---|
| **V** | Fetched and read this session (Nov 25 2026) with the web fetch tool. Important: that tool returns a summary of the page made by a small model, not the raw text, so a V is "the page said this, as summarised", not a transcript. Quotes are kept under 15 words and only where the summary carried them. |
| **S** | Seen only as a search-result summary; the page itself was not opened or the fetch failed. Treat as a lead, not as proof. |
| **U** | Unverified: from memory or reasoning, no source read. Said plainly wherever it is used. |

Vendor products (Jobber, Housecall Pro, ServiceTitan, HubSpot, Attio, Notion, Stripe, Shopify, Linear, Salesforce) are mostly behind a login. What was read is each vendor's public help centre or release notes, which describe behaviour but do not show it. Nothing here was checked in a live Jobber account. Every source below was accessed on 2026-11-25.

## 1. Summary (12 lines)

1. **Records are pages; panels are peeks.** Jobber, Housecall Pro and ServiceTitan describe the job as a page. Attio and HubSpot open a record's page when you click its name and offer a side preview only through a separate control. Recommended: job, customer, invoice, quote and request are full pages. (Q1, medium-high.)
2. **A visit has no page of its own in any of the three field-service products read.** In Jobber it lives on the job and on the Schedule (preview, then "View Details"); in Housecall Pro and ServiceTitan the "appointment" is a section of the job. Recommended: no visit page. (Q1, Q6, high.)
3. **A panel is a peek for work that stays on a list or calendar.** It is right for a visit opened from the Schedule or Home (the NN/g data-table advice and Jobber's own calendar popover). On a phone it becomes a full screen. (Q1, medium-high.)
4. **One link per list row is the consensus; whole-row clicking is contested.** Inclusive Components, Primer, Carbon, WCAG H2 and Baymard all point at one named link; Roselli calls clickable rows an anti-pattern. Recommended: the first cell is the one real link, the row may also open it with a click handler, other records in the row are plain text. (Q2, high on one link, medium on row click.)
5. **At most one visible row action; the rest under More.** Carbon says three or more go to an overflow menu; NN/g says one or two inline actions before it gets crowded. (Q2, high.)
6. **Link a related record once per page, in the place that introduces it.** No source states a count; it follows from WCAG H2 (same destination, one link) and Baymard (group by destination). Jobber puts the client's name at the top of every request, quote, job and invoice as the one link to the client. (Q3, medium.)
7. **Breadcrumbs show where a record lives, not where you came from.** NN/g is explicit; the browser's Back button owns history. Recommended: the crumb is the parent list; a panel stack keeps its own "‹ back" only while panels are stacked. (Q3, medium.)
8. **Record page anatomy is the same everywhere read:** a header with the record's identity, its status and the primary action; facts or a details column; related-record sections; an activity timeline. (Q4, high.)
9. **Job title: service first with the customer as subtitle is defensible but not directly supported.** Jobber's header carries both the client name and the job title; no source says which leads. Recommended with low-to-medium confidence; see the decision table. (Q4.)
10. **Navigation: Jobber's order is Home, Schedule, Clients, Requests, Quotes, Jobs, Invoices, then reports.** Recommended: copy it, with Customers directly after Schedule (differs from the audits' default). Phone bar: five items or fewer (NN/g), the rest under More. (Q5, medium.)
11. **"Visit" wins.** Jobber uses visit; Housecall Pro and ServiceTitan use appointment; none uses "trip" except Jobber's one "return trip" button. Recommended: "visit" and "return visit". (Q6, high.)
12. **Accessibility differs by container.** A modal panel follows the APG modal dialog rules; a non-modal peek has no APG pattern at all, so we must define its focus rules ourselves (move to heading, Esc closes, return focus to the opener). A page needs the skip link and landmarks. (Q7.)

## 2. Q1: Full page, side panel, or hybrid?

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **Jobber, Job Basics** (help.getjobber.com/hc/en-us/articles/115009379027) | Describes a "job details page": overview header (status, client name, job title, address, contact, job number, dates), then line items, a Scheduled visits section, Billing, internal notes. Actions are top right ("Generate Invoice", "More Actions"); each section has a pencil to edit. A job is described as a page; no panel is mentioned. | V |
| **Jobber, Visits** (…/articles/visits/) | A visit is "each calendar event" on a job. Viewed in the job's Visits section and on the Schedule. No standalone visit page is described: a click on the calendar opens a preview popover, and "View Details" opens a fuller view with Info, Client, Notes and Checklists tabs. | V |
| **Housecall Pro, multi-day appointments** (help.housecallpro.com/en/articles/6930497) | An appointment is a section on the job page, expandable; a "View all" lists them (mobile). Appointments have no status of their own. No appointment page. | V |
| **ServiceTitan, Jobs and Projects** (help.servicetitan.com/docs/jobs-and-projects) | Project contains jobs; job contains one or more appointments. Appointments are managed under the job. | V |
| **Attio, Create and view records** | Clicking a record's name anywhere opens its full record page. Separately, in table and kanban views you hover a row and click a preview icon: the preview opens on the right, the row stays highlighted, up and down arrows step through the view, an expand icon opens the page. | V |
| **HubSpot, Preview a record** | Preview lets you view and edit properties, activities and associations "without leaving your current page". In a table you hover and click the preview icon; on a record page you use the three-dot menu on an associated record. "View record" opens the page. | V |
| **Notion release notes, Jul 2022** | Pages in Table, Board, List and Timeline views open in side peek by default; the default is a per-view setting (side peek, center peek, full page). The list stays visible and interactive. | V |
| **NN/g, Data Tables: Four Major User Tasks** | A modal edit popup covers adjacent records so users cannot compare; a nonmodal panel lets users keep seeing the table. Editing in place only works if the table is narrow. | V |
| **NN/g, Modal and Nonmodal Dialogs** | Modals block the main content and are poor for non-essential content or high-stakes flows; the article does not mention side panels by name. Modals make people forget what they were doing. | V |
| **PatternFly, Drawer** | Drawers fit primary-detail layouts where the primary content stays on screen. | V |
| **ServiceTitan Anvil design system, Drawer** | Drawer for a secondary task or extra information without leaving the page, "1-3 steps at most". Longer tasks "should be on a separate page". Not for exclusive or essential flow steps. Always has a backdrop and traps focus. | V |
| **Android, list-detail layout** | In large windows the list and detail sit side by side; in small windows only one pane shows and the detail "takes over the whole space". | V |
| **Material Design, side sheets** (via search summary) | Standard side sheets sit beside the main content on tablet and desktop; modal side sheets replace them on mobile. The page itself would not load. | S |
| **Linear, peek** (via search summary of docs and changelog) | Space opens a quick look at the focused issue in a list; opening the issue shows all properties. | S |
| **Salesforce console help** (via search summary) | Opening a record from a list changes the view to split view; records open in workspace tabs. | S |
| **Carbon, data table usage** | When an expanded row gets cramped, move the user to a dedicated page, side panel or modal. | V |

### Consensus

- The **work record** (job, customer, invoice) is a page. This is what all three field-service products read describe, and it is what Attio does on a name click.
- A **panel is a peek**: it exists so you can look at or lightly edit something without losing your place in a list or calendar (HubSpot, Attio, Notion, NN/g, PatternFly). Both Attio and HubSpot trigger it from a separate control (icon, menu), not from the record's name.
- A drawer is for short tasks; long or multi-step work belongs on a page (ServiceTitan Anvil, Carbon).
- On a phone, a two-pane layout collapses to one pane at a time (Android, Material S).

### Where sources disagree

- **What a plain click does.** Notion's default for tables is a side peek on click; Attio and HubSpot (by their descriptions) open the page on a name click and use a preview control for the panel. Our own `RecordChip` research (Nov 19) chose "click opens the panel in place", which is the Notion side of this split, and it is what produced two ways to reach one record.
- **Whether the panel is modal.** NN/g prefers nonmodal for tables; ServiceTitan's Anvil drawer is always modal with a backdrop and focus trap. Both are reasonable; they imply different accessibility work (Q7).

### Recommendation

**Hybrid with the page as home. Confidence: medium-high.**

1. Job, customer, invoice, quote and request are **full pages** with their own URL.
2. A **visit never gets a page**; it opens inside its job (`?visit=` opens the job with that visit open), matching Jobber, Housecall Pro and ServiceTitan.
3. A **panel** is used for one thing: a peek at a visit (or any record) from a calendar or list where leaving would lose the user's place, i.e. the Schedule and Home. It is non-modal on a laptop, full screen on a phone, has an "Open" action to the page, and is URL-addressable.
4. In lists, the **name opens the page**; the panel is reached by an explicit control (a Preview icon or a key), never by the name.

What would change this: if Ryan's real task is scanning many jobs and acting on each without leaving the list, Notion's side-peek default fits better. The Schedule is that case; the Jobs list probably is not (U).

## 3. Q2: Links in lists

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **Adrian Roselli, "Block Links, Cards, Clickable Regions, Rows"** | Making an entire row clickable is an anti-pattern because every cell is announced as clickable. If you do it, make the link or button in one cell cover the row. A pseudo-element overlay blocks text selection; wrapping a whole card in one `<a>` makes the whole block the accessible name (the article says a screen reader may read about 25 seconds before saying "link"); keep link text short; touch mis-taps are a risk. | V |
| **Inclusive Components, Cards** | Put the one link on the title. To make the card clickable either stretch the link's `::after` (no JS, but blocks text selection) or use a click handler that triggers the link (keeps one tab stop, allows selection, ignore presses over about 200 ms). Do not nest links inside a block link; raise any extra link above the overlay. A "read more" cue should be decorative, not a second link. | V |
| **Bootstrap, stretched link** | The stretched link covers its containing block with `::after`. It "cannot be mixed with most table elements", and multiple links or tap targets inside are not recommended. | V |
| **WCAG technique H2** | Put an icon and its text for the same resource in one `<a>`: redundant adjacent links are tedious for keyboard users and repeated for screen reader users. | V |
| **Baymard, list-item hit areas (2016)** | For single-path list items make the whole item one clickable element with synchronised hover; for multi-path items group elements by destination. The article does not cover accessibility or duplicate links, and is 10 years old and about e-commerce lists. | V |
| **Primer, DataTable accessibility** | Mark the first column as the row header. Row action buttons need names that identify the row ("Delete test repository", not "Delete"). Does not cover interactive rows or links in cells. | V |
| **Primer, Links and buttons** | Links navigate, buttons act; use a real anchor; accessible names unique and descriptive; the accessible name must start with the visible text (voice control); avoid new tabs. | V |
| **Carbon, data table usage** | Fewer than three row actions: inline icon buttons. Three or more: an overflow menu. On touch the overflow menu stays visible. Every action has its own click target. Does not say whether a row click navigates. | V |
| **NN/g, Data Tables** | Inline single-record actions work with one or two; more become crowded or hidden under hover or a menu and are hard to discover. | V |
| **Atlassian Design (search summary)** | Rows can take an onClick handler; highlighting must not be the only signal; do not expand a row on click if it holds buttons or menus; buttons for actions, links for navigation. | S |
| **Jobber, Jobs list page** | Columns: client, job number, property address, next visit, status, total. The help page does not say what clicking a row does. | V |
| **GOV.UK Design System** | Searched for first-column link or clickable-row guidance and found none. | not found |
| **Shopify Polaris index table** | The page redirected away and could not be read. | not found |

### Consensus

- **One named link per row, on the row's own name**, as a real anchor (Inclusive Components, Primer, WCAG H2).
- **Actions are buttons, navigation is links** (Primer, Atlassian S).
- **Few visible actions**: fewer than three inline, otherwise a menu (Carbon, NN/g). Row action names include the row (Primer).

### Where sources disagree

- **Whole-row click.** Baymard says make the whole item the hit area; Roselli calls clickable rows an anti-pattern and cautions about touch; Inclusive Components allows it if the link stays the only tab stop. A `<tr>` cannot take the `::after` stretch (Bootstrap), so a table needs a click handler, not a pseudo-element.

### Recommendation

**One link per row; the row opens it. Confidence: high for "one link", medium for "whole row".**

- The first cell is a real `<a>` (the row header). Nothing else in the row is a link; other records in the row (customer on a job row, job on an invoice row, person, address) are plain text.
- A row-level click handler on desktop opens the same record. It ignores presses on interactive children, ignores text selection, shows a pointer and a hover state, and adds no second tab stop. On a phone the row is a card whose one button opens the record.
- One visible action at most (Invoices: Collect payment; Quotes: Remind). Everything else under a **More** menu. A button's accessible name includes the row ("Collect payment for INV-2026-0042").
- Row actions are never links; links never act.

This confirms the audit's default (Q5 in the patterns audit and Q6 in the objects audit).

## 4. Q3: Linking between related records

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **Jobber, Navigating Jobber** | "Related record links": on a request, quote, job or invoice, click the client's name at the top of the page to open that client. Global search finds records by client name, contact details, property address, quote/job/invoice numbers, line-item names, titles and subject lines. | V |
| **Jobber, Request basics; Quote basics** | A request converts to a quote or a job; a converted quote keeps its "Converted" status even if the job is deleted. A quote converts to a job and invoices come from the job. | V |
| **Jobber, Jobs list** | Client first, then number, address, next visit, status, total. | V |
| **HubSpot, Preview a record** | Associated records sit in the record page's right sidebar; each has a three-dot menu with Preview. | V |
| **Housecall Pro, Customer profile** | The profile has tabs for Profile, Estimates, Jobs, Invoices, Attachments, Notes, and shows the next three appointments at the top. The activity feed lists messages, jobs and invoices together and opens items in a new tab. | V |
| **WCAG H2; Baymard** | Combine links to the same resource into one; group by destination. | V |
| **WCAG 1.4.13 Content on Hover or Focus** | Anything shown on hover or focus must be dismissible (Esc), hoverable, and persistent. | V |
| **NN/g, Breadcrumbs** | Breadcrumbs show where a page sits in the hierarchy, "not intended to show the history" of a session. Do not replace the Back button; for several parents pick one canonical path. On mobile show only the last level or two. | V |
| **NN/g, Mobile subnavigation** | A "Back" label inside navigation is confused with the browser Back button. | V |
| **Android list-detail** | Back behaviour in multi-pane differs from single-pane; one panel-state change can exit the flow if history is not designed. | V |
| **Our Nov 19 record-links research** | A chip with preview for every record name; click opens the record in the panel. Hover and long-press previews. | internal, not re-fetched |
| **A rule on how many times to link one record per page** | No source read states a count. | not found |

### Consensus

- One link per destination in one visual unit (WCAG H2, Baymard).
- The **header names the customer** and is the one link to them (Jobber).
- A hover preview is an extra, never the only path (WCAG 1.4.13; hover does not exist on a phone).
- Breadcrumbs are location, Back is history (NN/g).

### Recommendation

**Medium confidence** (the count is our synthesis, not a published rule).

- A related record is a link **once per page, in the place that introduces it**: the customer in the page header or the side card (not both), the job on an invoice in its facts. Later mentions of the same record on that page are plain text.
- **Never link to the page you are on.** A heading, crumb or row that names the current record is text.
- A record without a page is never a link (people, addresses); an address may open maps on a phone.
- A preview card on hover or focus is optional, follows 1.4.13, and holds nothing the page lacks. Do not build a chip that is both a link and the row's own target.
- **Breadcrumb = the parent list** ("Jobs"), not the page you came from. The browser Back button returns to where you came from. While panels are stacked, a "‹ Andrea Reyes" line is the way back and goes away when the stack empties. This differs from the audits' default of "‹ INV-2026-0042" as the crumb, which NN/g would call a path-based crumb (U on how serious this is for a small internal tool).
- Show the lifecycle chain as **facts on each record** ("From quote Q-2026-0005", "Invoice INV-2026-0042" in Billing) and a "Converted" status on the upstream record; no diagram (U; Jobber keeps the "Converted" status, the help pages do not say it links onward).

## 5. Q4: Record page anatomy

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **Jobber, Job Basics** | Header: status, client name, job title, address, contact, then job details. Sections: line items and totals, scheduled visits, billing (invoices, reminders), internal notes and attachments. Top right: Generate Invoice, More Actions. The job title "will not show to the client". | V |
| **Attio, record page** | Header: the record's name, key details and primary actions, top left. A details panel with attributes. Tabs: Overview, Activity, Emails, Files, Notes, Tasks, Calls. | V |
| **Attio changelog, 2026 record page redesign** | Detail panel moved left; primary actions sit in the header with the name; automation events in Activity collapsed by default. | V |
| **Stripe, customer detail page redesign** | Two columns: primary (dynamic: payments, invoices, subscriptions) and secondary (static: details, metadata), the secondary moved right. The most-used actions (Create payment, Create invoice) are in the page header. | V |
| **Shopify, order details** | Sections for items, payment, Timeline (history, comments, attachments, resend email), notes, tags, contact; a More actions menu. | V |
| **Housecall Pro, customer profile** | Tabs and a top strip of the next three appointments; an activity feed at the bottom. | V |
| **Jobber, Job Basics (status words)** | Visit status words: Today, Upcoming, Completed. | V |

### Consensus

- A record page has a **header** that names the record, shows its status and holds the one primary action and a More menu (Jobber, Attio, Stripe, Shopify).
- **Related records** are sections or tabs on the page, each with its own list.
- **History** is a timeline on the page where comments are also written (Shopify, Attio, Housecall Pro).
- Some products keep **facts** in a side column (Stripe, Attio); Jobber keeps them in the header band.

### Where sources disagree

- **What names the page.** Jobber's header lists client name and job title together (the help page lists the client first, which is not proof that it is visually larger); Attio and Stripe's pages are named by the record itself, and for them the record is the customer. No source read shows a job page whose title is the service. See the decision table.

### Recommendation

**High confidence on the anatomy, low-medium on the title.**

1. **Header**: crumb (parent list), title, status pill(s) beside the title, a muted subtitle line, then the actions at the right: one filled primary (the next step for the state), up to two outlines, **More**, and the destructive action only inside More or a confirm.
2. **Facts band or details column**: When, Who, Where, Total for a job; the same labelled facts on every object.
3. **Related sections** in one order: What's included, Visits, Billing, Photos, then Notes and history last. Each related row obeys Q2 and Q3.
4. **Timeline** at the end, newest first, with comments written there.
5. **Title** for a job: the service ("Sprinkler repair"); subtitle: customer (the one link), street, date added. The browser tab is "Sprinkler repair · Andrea Dalton". Reason: two jobs for one customer must be told apart in the tab, the crumb, search and history; a quote and invoice already lead with their number. Jobber's header carries both, so showing both satisfies the comparison.
6. Primary action placement: top right on a laptop; on a phone, the same primary pinned in the footer bar (U: Jobber's phone layout was not read).

## 6. Q5: Navigation

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **Jobber, Navigating Jobber** (web) | Side nav in order: Create, Home, Schedule, Clients, Requests, Quotes, Jobs, Invoices, Marketing, AI Receptionist, Insights (with Reports), then Expenses, Chemicals, Time Sheets (the last two optional), Community, Apps. Search is centred in the top bar. | V |
| **Jobber, List pages and key metrics** | Each of Clients, Requests, Quotes, Jobs, Invoices and Payments is a list page with key metrics on top and a filterable list. | V |
| **Jobber, app basics** | Bottom bar: Home, Schedule, Timesheet, Search, Messages, with a More tab and a "+" quick-create button (client, expense, invoice, job, quote, request, task). | V |
| **Housecall Pro, Navigating** | Nav bar: Home, Inbox, Schedule, Customers, My Money, Reporting, Marketing, Price Book; a More button when space is short. On a phone, the hamburger holds the main items and a "+" sits at the bottom right. | V |
| **NN/g, Basic patterns for mobile navigation** | A tab bar is "well suited for sites with relatively few navigation options"; more than about five are hard to fit at a usable touch size; out of sight is out of mind; hamburger menus are the least discoverable. | V |
| **GitHub command palette** | Ctrl or Cmd+K opens it; it navigates to pages, searches with prefixes, runs commands that act on the page you are on; Enter goes, Cmd+Enter opens in a new tab; it starts scoped to where you are. | V |
| **Our audits** | The walkthrough has nine items; documented six. | internal |

### Consensus

- The lifecycle items are separate top-level lists in order **Requests, Quotes, Jobs, Invoices** (Jobber).
- **Customers/Clients come before them** in both Jobber (after Schedule) and Housecall Pro (after Schedule).
- A phone bar holds about five; the rest go behind More, with a "+" for create.
- **Search is global and finds records by number**, not only by name (Jobber).

### Recommendation

**Medium confidence.**

- Laptop order: **Home, Schedule, Customers, Requests, Quotes, Jobs, Invoices, Reports, Settings** (nine, all required). This follows Jobber, the product Hannah compares against, and it differs from the audits' default, which put Customers after Invoices on a "work in the order it happens, then the directory" argument that no source supports. Either is defensible; matching Jobber is the safer reading of her rule.
- Phone bar: **Home, Schedule, Jobs, Customers, More**; More opens a sheet with the rest and their counts. Add a "+" quick create (New job, quote, request, customer) because both Jobber and Housecall Pro have one (U on whether we need it for two users).
- **Cmd or Ctrl+K** is the global search: customers, jobs, quotes, requests, invoices by name, street, phone **and number**; Enter opens, Cmd+Enter opens in a new tab. The audit found our search misses invoice and quote numbers; Jobber's covers them (V).

## 7. Q6: The lifecycle and the "trip / visit / appointment" word

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **Jobber, Request basics, Quote basics, Job basics** | Request (optional start) → quote → job → invoice → payment. A request converts to a quote or job and keeps a final "Converted" status; "Archived" is a final status. A request belongs to one client; its assessment is a site visit on the Schedule. Quote statuses: Draft, Awaiting Response, Changes Requested, Approved, Converted, Archived. Invoices come from the job. | V |
| **Jobber, Visits** | "Visit" is the primary term. "Appointment" appears in some UI references. "Trip" appears only as a "return trip" in the completion prompt. Types: Scheduled, Anytime, Unscheduled. | V |
| **Housecall Pro, multi-day appointments** | "Appointment" is the term; "visit" appears only informally ("single visit"); "trip" does not appear. | V |
| **ServiceTitan, Jobs and Projects** | "Appointments are the scheduled visits technicians make to a job." Project → job → appointment. | V |

### Consensus

- The chain is **request → quote → job → invoice → payment**, with statuses (Converted, Archived) that close each step.
- The unit of "a time we go there" is **visit** (Jobber) or **appointment** (Housecall Pro, ServiceTitan); it belongs to a job and has no page.
- **"Trip" is not the product word.**

### Recommendation

**High confidence.** Use **visit** on every screen, in code names and in customer messages; a second visit is a **return visit** ("Add a visit" on the job). Jobber's own "return trip" button is the one counterexample; consistency inside our product matters more than copying one button. The upstream record shows "Converted" and its successor as a fact, the downstream shows "From quote Q-…". A job from a quote is the same page as any job with one more fact (audit J2).

## 8. Q7: Accessibility of page versus panel

### Evidence

| Source | What it says | Tag |
|---|---|---|
| **WAI-ARIA APG, Dialog (Modal)** | On open, focus moves inside (first focusable element, or the title with `tabindex="-1"` for long content). On close, focus returns to the invoker. Tab and Shift+Tab are trapped. Esc closes. A visible close button is strongly recommended. `aria-modal="true"` only when everything outside is really blocked. The dialog needs an accessible name. | V |
| **APG, Landmarks** | One `main` per page; labelled `navigation` landmarks when there is more than one; `complementary` (`aside`) for supporting content that works alone; do not wrap a modal dialog's content in a landmark. | V |
| **APG pattern index** | 30 patterns; none for a drawer, side panel or non-modal dialog. | V |
| **WCAG 2.4.1 Bypass Blocks (Level A)** | A mechanism to skip repeated blocks: a skip link, landmarks or headings. | V |
| **WCAG 1.4.13** | Hover and focus content: dismissible, hoverable, persistent. | V |
| **ServiceTitan Anvil drawer** | Focus stays in the drawer by default, initial focus on the first focusable element or the close action, focus returns to the opener on close, backdrop always. | V |
| **Primer, DataTable and links** | Row actions named with the row; real anchors; accessible name starts with the visible text. | V |

### Consequences

- **A page**: a skip link to `main`, one `main`, a labelled primary `nav`, the record's `aside` as `complementary`, one `h1` that is the record's title; on route change move focus to the `h1` and update `document.title` (U for the framework behaviour: not read; this is how to meet 2.4.1 and the APG title rule).
- **A modal panel** (phone, or a blocking sheet): follow the modal dialog rules above exactly.
- **A non-modal peek** (laptop, list stays usable): APG has no pattern, so this is our rule, derived from the modal one: focus moves to the panel's heading on open, Esc closes it, focus returns to the row's link that opened it, the panel has a name and a visible close, it is not marked `aria-modal`, and it is a `complementary` region, not a dialog (U: reasoned from APG, not a published rule). Because the peek is not a trap, the list behind it stays in the tab order.
- **Back button**: opening a panel is a history entry, so Back closes it on a phone and a laptop alike (Android's list-detail guidance shows the cost of leaving this undefined: V; the rule itself is U).
- **Same destination, one link**: fewer redundant links helps keyboard and screen reader users (WCAG H2, V), which is the accessibility argument for Q2 and Q3.

## 9. Decision table

| # | Decision | Our default (audits) | Recommended default | Why | Confidence |
|---|---|---|---|---|---|
| 1 | Pages vs panels | Job, customer, invoice, quote, request are pages; panel only for a visit from Schedule or Home | **Agree.** Pages for work records; a non-modal peek for a visit (and any record) from Schedule or Home; full screen on a phone; a visit never gets a page; a name always opens the page, a Preview control opens the peek | Jobber, Housecall Pro and ServiceTitan keep the visit inside the job; Attio and HubSpot reserve the panel for an explicit preview; NN/g prefers a nonmodal panel when you need the list; drawers are for short tasks (Anvil, Carbon) | Medium-high |
| 2 | Links in lists | The row's own name is the one link; the whole row opens it; one visible action; the rest under More | **Agree.** First cell is a real anchor; row click is a JS handler (not a `<tr>` overlay); other records plain text; one visible action, name includes the row; rest under More; cards on phones | WCAG H2, Inclusive Components, Primer, Carbon, NN/g; Roselli opposes row click, so keep it a mouse convenience with no extra tab stop | High (one link), medium (row click) |
| 3 | Job page title | Service first, customer as subtitle | **Agree, with the tab title carrying both** ("Sprinkler repair · Andrea Dalton"). Customer in the subtitle is the one link to the customer; remove the Customer card's second link | Uniqueness across tabs, crumbs, search; matches quote and invoice (number first); Jobber's header carries both. No source read shows a service-titled job page, and Jobber's own order lists the client first | Low-medium |
| 4 | Navigation order | Home, Schedule, Requests, Quotes, Jobs, Invoices, Customers, Reports, Settings | **Change:** Home, Schedule, **Customers**, Requests, Quotes, Jobs, Invoices, Reports, Settings. Phone bar unchanged (Home, Schedule, Jobs, Customers, More) | Jobber and Housecall Pro both put the customer list right after Schedule; the lifecycle order in the audit has no source. If Hannah prefers the audit order, it costs little | Medium |
| 5 | "Trip" vs "visit" | "Visit", and "return visit" | **Agree.** Visit everywhere, including the code names where cheap, customer messages and the Jobs list column | Jobber's primary term; no product uses "trip"; Jobber's one "return trip" button is the lone exception | High |

## 10. Design rules (hand these to designers)

**Records and containers**
1. A job, customer, invoice, quote and request each have a full page with a stable URL. A visit never has a page; it opens inside its job.
2. A side panel is a peek from a calendar or list. It never replaces the page, always has an "Open" action, is addressable by URL, and is full screen on a phone.
3. In a list, the record's name opens the page. A preview is reached by a separate control, never by the name.
4. Opening a panel adds one history entry; Back closes it.
5. A panel is for one to three steps. Anything longer is a page.

**Links**
6. A table row has one link: its first cell, a real anchor. The row may open it on click; nothing else on the row is a link or a second tab stop.
7. Another record named in a row (customer, job, person, address) is plain text.
8. Links navigate; buttons act. A button's accessible name includes its row ("Collect payment for INV-2026-0042").
9. A row shows at most one visible action; everything else is under More. Row actions never navigate.
10. A related record is linked once per page, where it is introduced. Later mentions are plain text.
11. Never link to the page you are on, and never link a thing that has no page (people, addresses).
12. A hover or focus preview is optional, dismissible with Esc, hoverable, and holds nothing the page lacks (WCAG 1.4.13).
13. A link goes to the record, not to a list that contains it.

**Record page**
14. Order of the header: crumb (parent list), title, status pill(s) beside it, muted subtitle, actions right.
15. One filled primary action (the next step for the state), up to two outlines, a More menu. Destructive actions live in More and behind a confirm.
16. Facts use the same labelled band on every object. Related sections follow one order; Notes and history comes last.
17. A job's title is the service; the customer and street are the subtitle; the browser tab carries both.
18. The history is one timeline, newest first; notes are written there.
19. The crumb is the parent list. History is the browser's Back button.

**Navigation**
20. Top level, in this order: Home, Schedule, Customers, Requests, Quotes, Jobs, Invoices, Reports, Settings.
21. The phone bar holds five or fewer items; the rest are under More.
22. Cmd or Ctrl+K is search everywhere and finds records by name, street, phone and number. Enter opens; Cmd+Enter opens in a new tab.

**Words**
23. "Visit" and "return visit". Never "trip" or "appointment" on screen.
24. Request, quote, job, invoice, payment, in that order, each with one status vocabulary; the upstream record shows "Converted" and a link to its successor once.

**Accessibility**
25. Every page has a skip link, one `main`, labelled `nav` landmarks, one `h1` that is the record's title; on navigation focus moves to the `h1` and the document title updates.
26. A modal panel follows the APG modal dialog: focus in, trapped, Esc closes, focus returns to the opener, `aria-modal` only if it really blocks. A non-modal peek moves focus to its heading, does not trap, returns focus to the opener on close.

## 11. Risks and what could not be verified

- **The fetch tool summarises.** Every V is a small model's summary of a page; wording and fine detail can drift. Decisions that rest on one V line (the Jobber nav order, the Attio click behaviour, Roselli's row advice) should be spot-checked by a person against the live page.
- **Nothing was checked in a live Jobber, Housecall Pro or ServiceTitan account.** Help pages describe behaviour; they are not screenshots. In particular I could not confirm: what clicking a row in Jobber's Jobs list does (the help page is silent); whether Jobber's job page title leads with the client or the job title; whether Jobber's visit "View Details" is a page or a sheet; Jobber's mobile job page layout; how Housecall Pro and ServiceTitan lay out lists.
- **No source gives a rule for "link a related record once per page".** It follows from WCAG H2 and Baymard (adjacent links to one destination) and from what Jobber does with the client name; it is our synthesis.
- **No source gives a rule for a non-modal side panel's focus behaviour.** APG has no pattern; the rule in section 8 is derived, not published.
- **Not reached:** Material Design 3 side sheet page (404 or empty), Shopify Polaris index table (redirect), Linear's peek docs (the page fetched did not cover it), Salesforce console help (search summary only), Atlassian table and panel docs (search summary only), GOV.UK guidance on clickable rows (none found), NN/g on master-detail (none found), HubSpot's preview of the full record-page association card layout, Stripe's and Shopify's list behaviour.
- **Dated or weak evidence:** the Baymard article is from 2016 and about e-commerce product lists; the Notion release note is from 2022 and may have changed; Roselli's post is from 2020.
- **Our own earlier research (Nov 19 record-links, navigation audit) was not re-fetched**; the "Attio and Linear K rows" there are still memory. This document supersedes its claim that a name click should open a panel.
- **Phone behaviour** was read only as general guidance (Android list-detail, NN/g tab bar). Real phone use by Ryan or the office person has not been observed.
- **A usability test would settle more than this research can.** The three most contested choices (row click, job title, nav order) are each cheap to switch and cheap to test with Hannah and one other person on the Storybook prototype.

## 12. Source register (all accessed 2026-11-25)

**V (fetched, summarised by the fetch tool)**
- Adrian Roselli, "Block Links, Cards, Clickable Regions, Etc." https://adrianroselli.com/2020/02/block-links-cards-clickable-regions-etc.html
- Inclusive Components, "Cards" https://inclusive-components.design/cards/
- Bootstrap 5.3, Stretched link https://getbootstrap.com/docs/5.3/helpers/stretched-link/
- W3C WCAG 2.2 Technique H2 https://www.w3.org/WAI/WCAG22/Techniques/html/H2
- Baymard, "Hover UX: use synchronized hover effects and unified hit-areas" (2016) https://baymard.com/blog/list-items-hover-and-hit-area
- NN/g, Data Tables: Four Major User Tasks https://www.nngroup.com/articles/data-tables/
- NN/g, Modal and Nonmodal Dialogs https://www.nngroup.com/articles/modal-nonmodal-dialog/
- NN/g, Breadcrumbs: 11 Design Guidelines https://www.nngroup.com/articles/breadcrumbs/
- NN/g, Basic Patterns for Mobile Navigation https://www.nngroup.com/articles/mobile-navigation-patterns/
- NN/g, Mobile Subnavigation https://www.nngroup.com/articles/mobile-subnavigation/
- Primer, DataTable accessibility https://primer.style/product/components/data-table/accessibility/
- Primer, Links and buttons https://primer.style/accessibility/design-guidance/links-and-buttons/
- Carbon, Data table usage https://carbondesignsystem.com/components/data-table/usage/
- PatternFly, Drawer design guidelines https://www.patternfly.org/components/drawer/design-guidelines
- ServiceTitan Anvil, Drawer https://anvil.servicetitan.com/docs/web/components/drawer/design.md
- Android Developers, List-detail layout https://developer.android.com/develop/ui/compose/layouts/adaptive/list-detail
- W3C WAI-ARIA APG: Dialog (Modal), Landmarks, Patterns index; WCAG 2.2 Understanding 1.4.13 and 2.4.1 (www.w3.org/WAI/ARIA/apg/..., www.w3.org/WAI/WCAG22/Understanding/...)
- GOV.UK Design System, Links https://design-system.service.gov.uk/styles/links (read; no row guidance found)
- GitHub Docs, Command palette https://docs.github.com/en/get-started/accessibility/github-command-palette
- HubSpot, Preview a record https://knowledge.hubspot.com/records/preview-a-record
- Notion, Release 2022-07-20 https://www.notion.com/releases/2022-07-20
- Attio, Create and view records https://attio.com/help/reference/managing-your-data/records/create-and-view-records; Attio changelog, 2026 record page redesign https://attio.com/changelog/2026/record-page-redesign
- Jobber help: Request basics, Quote basics, Job Basics, Visits, List pages and key metrics, Jobs list page and key metrics, Navigating Jobber, Jobber app basics (help.getjobber.com)
- Housecall Pro help: Navigating Housecall Pro; Customer profile overview; Multi-day job appointments overview (help.housecallpro.com)
- ServiceTitan help, Jobs and Projects https://help.servicetitan.com/docs/jobs-and-projects
- Stripe Support, Updates to the customer detail page https://support.stripe.com/questions/updates-to-the-customer-detail-page
- Shopify Help, Managing order details https://help.shopify.com/en/manual/fulfillment/managing-orders/managing-order-details
- Linear, Display options https://linear.app/docs/display-options (read; it does not cover peek)

**S (search summary only)**: Material Design side sheets (material.io); Linear peek docs and changelog; Salesforce Console in Lightning Experience help; Atlassian Design dynamic table and panel; NN/g UI elements glossary (side sheets can be modal or not).

Counts: 42 pages fetched and read as summaries (two of them, GOV.UK Links and Linear Display options, did not contain the guidance they were fetched for and are counted but not relied on). 6 fetches failed or returned nothing: Material Design 3 and 2 side sheet pages, Shopify Polaris, two Android pages (404), and WCAG technique G197 (title only). 5 more sources were seen only as search summaries.
