# How modern CRMs structure navigation, record pages and actions (Nov 19 2026)

Research only, nothing built. Hannah: "go look at other modern CRMs to see how they're doing it", then "research those that are ranked for really beautiful UX" and "how they display information". Follows `docs/plans/2026-11-19-navigation-audit.md` (Mailchimp). `docs/plans/2026-11-19-admin-page-layout-research.md` does not exist on main or any local branch.

## 0. Who, and how sure

**Chosen by reputation for design, not market share.** Attio is the one design write-ups single out: a roundup says it is universally praised for design, and a [Product Hunt review](https://www.producthunt.com:443/products/attio/reviews) calls the UI "beautiful" and "elegant"; another roundup likens it to Linear in how enjoyable it is ([crm.org review](https://crm.org/news/attio-review), [Rework list](https://resources.rework.com/tools/crm/best-attio-alternatives); V, from search excerpts). Folk is named as the closest look-alike, "clean, contact-centric" (V, excerpts; Folk's own articles are marketing). Twenty is described as "modern UX" but I found no independent design review (thin). Linear is the reference for a fast record UI ([its redesign write-up](https://linear.app/now/how-we-redesigned-the-linear-ui), V). Close and Pipedrive are the sales tools with good reputations, HubSpot is the mainstream baseline only. **Not compared:** Clay (an enrichment and outreach tool; no design review found) and Superhuman (email, not a CRM). No Mobbin or Godly gallery was readable this session, so there are no screenshot citations; a live walk should close that gap.

| Tag | Meaning |
|---|---|
| V | Read this session at the cited help page, blog or search excerpt |
| R | Recalled from use; likely, never a quote. Screenshot before a build leans on it |
| ? | Not found |

Sources: Attio [Navigating Attio](https://attio.com/help/reference/getting-started/navigating-attio), [Create and view records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), [Configure record pages](https://attio.com/help/reference/managing-your-data/records/configure-record-pages). HubSpot [Work with records](https://knowledge.hubspot.com/records/work-with-records), [default record layout](https://knowledge.hubspot.com/records/understand-the-default-record-layout). Pipedrive [deal detail view](https://support.pipedrive.com/article/deal-detail-view), [navigation announcement](https://www.pipedrive.com/en/blog/pipedrive-navigation-announcement), [interface preferences](https://www.pipedrive.com/en/blog/interface-preferences). Close [leads](https://help.close.com/docs/leads). Twenty [navigation docs](https://docs.twenty.com/user-guide/layout/capabilities/navigation). Folk [notes](https://help.folk.app/en/articles/5007332-adding-notes), [reminders](https://help.folk.app/en/articles/5658439-set-reminders-on-your-contacts). Linear [conceptual model](https://linear.app/docs/conceptual-model). Mailchimp rows are the audit's (V or K there).

## 1. Primary navigation

| Product | Sidebar and order | Collapsed, top bar |
|---|---|---|
| Attio | Left sidebar, six sections: control panel (workspace, settings, sign out), search, a nav panel (Home, Tasks, Notes, Emails, Reports, Sequences, Workflows, notifications inbox), Records, Lists, Chats (V) | Expands and collapses; no marketing-style top bar; help is "?" top right (V) |
| Twenty | Left: workspace switcher, search, settings, favourites, one shortcut per object (V, excerpts) | R: collapsible |
| Folk | Left: groups of contacts as the spine, views per group (R) | R |
| Close | Left rail: Leads, Inbox, Opportunities, Reports, Smart Views under Leads (R) | R: slim top bar with search |
| Pipedrive | Left: Leads, Deals, Contacts, Activities, Insights; the rest under "More"; the user picks and orders items (V); the menu moved from the top to the left (V) | Top bar keeps search, quick add, assistant, account (V) |
| HubSpot | Left sidebar of groups (CRM, Marketing, Sales...) with flyouts (R) | Top bar: search, create, notifications, help, account (R) |
| Linear | Left: workspace switcher at top, Inbox, My issues, then Teams, Projects, Views (V, R for exact order); the redesign kept navigation and only tightened alignment and hierarchy (V) | No top bar; each view has its own header (R) |
| Mailchimp | Icon rail, unlabelled: Dashboard, Create, Audience, Campaigns, Automations...; search and profile in it (V, 2020) | Hamburger on small screens (V) |
| Trailhead today | Left: Home, Schedule, Jobs, Customers, Reports, Settings, icon and label always (code) | Icons only under 1024px; 56px top bar with title, actions, Search |

## 2. Account menu and utilities

| Product | Account, settings, help, sign out | Notifications |
|---|---|---|
| Attio | Top of the sidebar: workspace switcher, settings, invite, apps, sign out; "?" top right for help (V) | Inbox in the nav panel (V) |
| Twenty | Workspace switcher and settings in the sidebar (V, excerpts) | ? |
| Folk | R: workspace and account top left | In-app Notification center, which also holds reminders (V) |
| Close | R: account menu bottom left | R: bell |
| Pipedrive | Profile menu in the top bar; Switch company and Log out at the bottom of it (V) | R: bell |
| HubSpot | R: avatar top right, with gear, help and notifications beside it | R: bell top right |
| Linear | Workspace menu top left: switch workspace, settings, sign out (V for the switcher, R for the rest) | Inbox in the sidebar (R) |
| Mailchimp | Profile icon far right: Profile, Account, Switch Account (V) | K |
| Trailhead today | None; Sign out in the rail footer and phone More | Home's Needs action |

## 3. Search

| Product | Palette and what it finds | How a hit opens |
|---|---|---|
| Attio | Cmd+K opens commands; "/" or the sidebar search box searches the whole CRM (V) | Its record page (V) |
| Twenty | Cmd+K to jump to any record, view or action (V, excerpts) | Side panel first, then Open for the full page; panel or page is a per-object and per-user setting (V) |
| Folk | R: Cmd+K over people, companies, groups | R: full page |
| Close | R: global search, Cmd+K command menu (not confirmed) | R: lead page |
| Pipedrive | Top-bar search over deals, leads, contacts, activities, projects, products, attachments (V) | Detail view |
| HubSpot | R: top-bar search by record type | Record page |
| Linear | R: Cmd+K for commands and issues, the model the others copy | In place |
| Mailchimp | Rail icon (V); contacts, campaigns, help (K) | K |
| Trailhead today | Cmd+K and a Search button: customers, jobs, days; no Recent, no help | In place on a screen with a record host |

## 4. A record page

| Product | Header and summary | Columns, tabs, feed |
|---|---|---|
| Attio | Name over tabs; record details and Lists in the right sidebar (V) | Tabs Overview, Activity, Emails; Overview opens with an AI summary then recent emails, tasks, notes, files; Activity is a timeline with chosen event types; admins configure tabs and widgets per object (V) |
| HubSpot | Highlights (primary and secondary properties) top left; actions (log activity, follow) in the left sidebar (V) | Left, middle (tabs About, Activities, Catch-up, Intelligence, Revenue), right (association preview cards) (V) |
| Pipedrive | Stage progress bar with days in each stage; a Summary section at the top of the sidebar: value, probability, close date, contact, organization (V); users asked for it back in the header after the redesign (V, forum) | Sidebar sections reorderable; History holds a Changelog (V) |
| Close | R: contact and opportunity blocks beside a timeline; up to five notes pinned at the top (V) | One timeline filtered by activity type; note, email, SMS, call from the page (V) |
| Twenty | Side panel summary with Open for the full record (V) | Tabs of configurable widgets that move between tabs (V) |
| Folk | R: fields beside notes, reminders and groups; notes follow the chosen group (V) | Reminders listed by due date on the profile (V) |
| Linear | R: title, status and properties in a right rail, description and activity in the main column | One feed of comments and changes (R) |
| Mailchimp | K: back link above the title, primary button top right | K |
| Trailhead today | Panel: pills under the subtitle, facts with 112px labels, sections, footer (code) | One column; Notes and history block |

## 5. Getting back

| Product | How a record returns |
|---|---|
| Attio | Click any record name to open its page (V); Back is the browser's (R) |
| Twenty | Side panel closes to the list; a full page is a route (V, R) |
| Pipedrive | R: back link to the list |
| HubSpot | R: back-to-list link top left of the record |
| Close | R: lead opens from a list or Smart View; Back to that view |
| Linear | R: opening an issue is a route; Esc or the browser's Back return to the same view; the redesign kept back, forward and history for the desktop app (V) |
| Folk, Mailchimp | R / K: a back link above the title |
| Trailhead today | Panel in the address; X closes to the page, "‹ Name" goes to the record before, browser Back steps one record |

## 6. Actions

| Product | Primary, menu, destructive, bulk |
|---|---|
| Attio | R: "+" and a ⋮ menu on a record, bulk bar on selected rows, destructive in ⋮ behind a confirm; ⋮ also opens page configuration (V) |
| Pipedrive | "+" quick add in the top bar (V); R: Won and Lost buttons on a deal; "..." holds Manage sidebar sections (V) |
| HubSpot | R: Create button top right, record actions in the left sidebar, delete under an Actions dropdown |
| Close | R: composer buttons on the page; bulk bar on selected leads |
| Twenty | R: the command menu doubles as the action list; bulk on selection |
| Linear | R: every action is a command in Cmd+K, repeated in the right-click menu; delete is deep in the menu |
| Folk | Quick actions menu on a contact (V, for reminders) |
| Mailchimp | V: combo button, the main action on its face |
| Trailhead today | One filled button per page top right; panel footer: one primary, two outlines, More, one destructive ghost |

## 7. Badges and status pills

Attio, Linear, Twenty (R): a small coloured dot plus the word, no filled block, one or two per row; Linear's status is an icon whose shape changes, not only colour. HubSpot (R): a light-tint pill for lifecycle stage. Pipedrive (V): the stage is a progress bar, not a pill. Close (R): a text label with a dot. Mailchimp (K): tinted pills. Trailhead today: tinted `StatusPill`, two on a visit.

## 8. Lists and tables

| Product | Columns, filters, saved views, row actions, phone |
|---|---|
| Attio | R: views with filters and sort saved per list, configurable columns, a click opens the record |
| Close | Smart Views are saved searches kept at hand in the sidebar (V, Close blog) |
| Folk | Group views as table or pipeline; a clock icon on rows with reminders (V) |
| Twenty | Views; favourites are pinned views (V) |
| Pipedrive | R: kanban or list, filters, saved filters |
| Linear | Views over the same work without changing it (V); R: keyboard-first rows |
| Trailhead today | `DataGrid`, filter chips, search; cards on a phone (code) |

## 9. Mobile

| Product | Phone |
|---|---|
| Pipedrive | R: native app, bottom tabs, More |
| Folk | Native iOS and Android, voice notes, edit records (V, third party) |
| Attio | R: native app, bottom tabs |
| HubSpot | R: bottom tabs, More hides the rest |
| Close | R: native app, Inbox and calling first |
| Linear | R: native app, Inbox, My issues, search |
| Mailchimp | Three bottom tabs: Overview, Activity, Explore (V) |
| Trailhead today | Four bottom tabs and More |

## 10. How information is displayed

| Product | Density and type | Surfaces versus whitespace | Key facts at a glance | Empty and loading | Colour |
|---|---|---|---|---|---|
| Linear | Tested very condensed to spacious and chose denser navigation with clearer hierarchy; Inter Display headings, Inter body (V) | Elevation by surface (background, panels, dialogs, modals) in an LCH theme of base, accent, contrast (V) | R: properties in a rail | R: one sentence and an action | Brand blue turned down so the palette is neutral (V) |
| Attio | R: compact rows | R: whitespace and hairlines, few boxes | Record details and lists in the right sidebar (V); AI summary first (V) | R: short, with a create button | R: dots for status, little else |
| Pipedrive | R: roomier cards | R: cards on grey | Summary at the top of the sidebar then a stage bar (V); users missed it in the header (V) | "No focus items yet" on empty deals, which users asked to remove (V, forum) | R: green and red for won and lost |
| HubSpot | R: card stack | R: many cards | Highlights, then the About card (V) | R: illustrated empties | R: orange brand accent used widely |
| Close | R: dense, one timeline | R: few boxes | Pinned notes at the top (V) | R | R |
| Trailhead today | App tokens in `docs/DESIGN.md` | Panels over lists | Facts block, 112px labels | Words per `docs/UX_WRITING.md` | Meaning only, per the design contract |

## 11. What the modern ones agree on (four or more)

1. **A left sidebar of a few daily destinations, with account and workspace in a menu**, not a bare Sign out (Attio, Pipedrive, Twenty, Linear, HubSpot; [Attio](https://attio.com/help/reference/getting-started/navigating-attio), [Pipedrive](https://www.pipedrive.com/en/blog/pipedrive-navigation-announcement)).
2. **Cmd+K for search and commands** (Attio, Twenty, Linear; R for Folk, Close).
3. **A record is tabs or sections: a key-facts block, a timeline, and an aside of details and associations** (Attio, HubSpot, Pipedrive, Twenty, Close; [Attio](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), [HubSpot](https://knowledge.hubspot.com/records/work-with-records), [Pipedrive](https://support.pipedrive.com/article/deal-detail-view)).
4. **One activity timeline, filterable by type, with the composer on the record** (Attio, Close, HubSpot, Pipedrive; [Close](https://help.close.com/docs/leads)).
5. **Saved views as sidebar entries** (Close Smart Views, Twenty favourites, Linear views, Attio lists, Folk groups).
6. **Status as a small dot and a word, a few per row, colour for state only** (Attio, Linear, Twenty, Close; mostly R, Linear's neutral palette V).

## 12. Where they differ and why

- **Panel or page.** Twenty opens a side panel with Open for the full page and makes it a setting ([docs](https://docs.twenty.com/user-guide/layout/capabilities/navigation)); Attio, HubSpot and Pipedrive go straight to a page. The panel keeps the list in view, the page has room for tabs.
- **Where the summary sits.** Pipedrive put it at the top of a sidebar and users asked for it back in the header (V, forum); HubSpot puts highlights top left. A deal's value is what people open it to see.
- **Configurable layout.** Attio and Twenty let admins move tabs and widgets; Linear and Close do not. A horizontal CRM holds objects the vendor cannot predict; a one-truck business knows its objects.
- **Fixed or user-chosen sidebar.** Pipedrive lets people pick and order items (V), because one CRM sits in front of many products.
- **Palette.** Linear derives themes from three inputs (V); HubSpot leans on a brand accent (R). Linear's job is to disappear.

## 13. What Trailhead should take

1. Move the account into a top-right menu (name, Profile, Help, Open as customer, Sign out) and take Sign out out of the rail, as Pipedrive does ([Pipedrive](https://www.pipedrive.com/en/blog/pipedrive-navigation-announcement)).
2. Keep the flat six-item rail, since Attio has six sections and Pipedrive five items plus More ([Attio](https://attio.com/help/reference/getting-started/navigating-attio)).
3. Keep Cmd+K, add a Recent group and "/" for plain search, as Attio does ([Attio](https://attio.com/help/reference/getting-started/navigating-attio)).
4. Put the job's key facts (day, who, price, money word) in one block at the top of the panel, and do not bury the total in a sidebar the way Pipedrive's redesign did ([Pipedrive](https://support.pipedrive.com/article/deal-detail-view), [forum](https://community.pipedrive.com/discussion/12010/new-details-screen-for-deals)).
5. Show Notes and history as one feed filterable by type with the note box on top, like Close's type filter and pinned notes ([Close](https://help.close.com/docs/leads)).
6. Keep the panel over the list, with Open to a full page for the customer only, as Twenty does ([Twenty](https://docs.twenty.com/user-guide/layout/capabilities/navigation)); still no breadcrumbs, as in the audit.
7. Do not add saved views beyond Week, Day, List; Close and Twenty show the pattern, but the Schedule's three views already serve it ([Close blog](https://blog.close.com/custom-activities/)).
8. Status as a dot and a word, one or two per row, colour for state only; Linear lowered its brand colour for the same reason ([Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)).
9. Empty states one sentence and one action, and no "nothing yet" filler rows, which Pipedrive users asked to remove ([forum](https://community.pipedrive.com/discussion/12010/new-details-screen-for-deals)).
10. Dense navigation with clear hierarchy and a display weight only for headings, as Linear tested; the app keeps its tokens in `docs/DESIGN.md` ([Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)).

Gaps: no Mobbin or Godly shots; no logged-in walk of any product; Folk's and Close's current sidebars are recalled; Twenty's and Folk's design reputation rests on thin or marketing sources; Clay and Superhuman not covered.

## 14. Questions for Hannah

1. **Add the account menu top right and drop Sign out from the rail?** Default: yes (the audit's question 1; most of the modern set has it).
2. **Should a record's key facts (day, who, price, paid or not) sit in one block at the very top of every panel?** Default: yes, a four-line facts block under the title before any section.
3. **Should a customer open in the side panel with an Open link to a full page, as Twenty does, or stay panel only?** Default: panel, plus Open on the customer only, because a customer has enough history to deserve a page.
