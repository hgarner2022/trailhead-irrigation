# Navigation audit against Mailchimp (Nov 19 2026)

Research only, nothing built. Hannah's brief: "Also do an audit of navigation patterns. Look at how Mailchimp does it." Her emphasis: "how does someone get back, and actions too", so both have their own section (5 and 6).

## 0. Evidence and its limits

Mailchimp's signed-in app is not public, so the comparison rests on what could be read:

| Tag | Meaning | Sources |
|---|---|---|
| V | Read at a source | [Arango, Mailchimp product navigation (2020)](https://jarango.com/2020/11/27/product-and-marketing-navigation/): a left icon rail, unlabelled with names on hover, in the order Dashboard, Create, Audience, Campaigns, Automations, Website, Content Studio, Integrations, Search, Profile; a click opens a vertical submenu; Search is an icon in the rail; small screens collapse to a hamburger that shows labels. [Mailchimp help, Manage Account Login and Profile](https://mailchimp.com/help/manage-account-login-and-profile/): the profile icon opens a menu with Profile, Account (or Account & billing, by user type) and Switch Account. [Mailchimp help, Manage Account Settings on Mobile](https://mailchimp.com/help/manage-account-settings-mobile/): the phone app switches accounts and logs out. [Mailchimp mobile dashboard post](https://mailchimp.com/resources/introducing-a-new-mobile-dashboard/): three tabs, Overview, Activity, Explore. [Mailchimp pattern library](https://ux.mailchimp.com/patterns/navigation) (search excerpts only; the page returned 503): local navigation inside a section with the current page highlighted, a "switcher" in list, campaign and report headers to jump between siblings, a combo button with the main action on its face and the rest in a dropdown, the primary action first in a dialog. |
| N | NN/g, read | [Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/), [Utility navigation](https://www.nngroup.com/articles/utility-navigation/), [Mobile navigation patterns](https://www.nngroup.com/articles/mobile-navigation-patterns/) |
| K | Recalled, not verified this session | Mailchimp's later sidebar (grouped sections, collapsible rail, a top bar with search, help and the profile) and its record pages (a "back to Campaigns" link above the title, a primary button top right). Likely, never a quote. Someone should screenshot the live app before any K item drives a build. |

NN/g, what we lean on. Breadcrumbs show where a page sits in the hierarchy, not the path taken, they supplement the browser's Back button, they are for deep sites (skip them on one or two levels), and on a phone show only the last level or two. Utility tools (Log in, Search, My Account) belong top right where people look first, an icon needs its text label, and hiding tools behind a bare hamburger, gear or ellipsis can backfire. A tab bar suits four or five sections people need often; the hamburger suits many options on browse-heavy sites; hidden options are forgotten.

## 1. The admin: ours versus Mailchimp's

| Part | Trailhead admin (read from code) | Mailchimp | Gap |
|---|---|---|---|
| Left column items and order | Home, Schedule, Jobs, Customers, Reports, Settings (`NAV`); Invoices is decided as a new item. Daily path first, then reports, then setup. | V: Dashboard, Create, Audience, Campaigns, Automations, Website, Content Studio, Integrations, then Search and Profile. Account setup lives in the profile menu (V). | Ours keeps Settings in the rail, fine at six or seven items. |
| Grouping | One flat list, no group headings. | K: grouped sections; V: a submenu per item (2020). | Flat is right to about eight items. |
| Icons | Icon and visible label, always. | V (2020): icons only, hover to learn; critiqued as "somewhat obscure". | We are ahead; NN/g agrees. |
| Active state | `sidebar-primary` fill, follows the address, `aria-current`. | V: current page highlighted in local nav. | Same. |
| Collapsed state | Icons only under 1024px or by the toggle in the top bar; tooltips name them. | V: the rail is icon-only by default. | Same idea; ours is a choice. |
| Top bar | 56px sticky: toggle, page title and context, the page's actions, Search. No help, no account. | V: logo, search, profile (older bar); K: help and notifications too. | No top-right utility zone for the account. |
| Search | Cmd or Ctrl+K and a Search button; customers, jobs, days; opens in place. | V: a rail icon. K: contacts, campaigns, help. | Ours finds records only: no recent, no help. |
| Account menu | None. The rail footer is one button, Sign out, with initials; the phone puts Sign out in More. | V: profile icon, menu with Profile, Account, Switch Account, log out. | Biggest structural gap. |
| Settings nav | A page with a vertical tab list (People, Services, Billing, Messages, API keys); on a phone the list is the page and a tab drills in with "‹ Settings". | V: local nav with the current page highlighted. | Same pattern. The tab is not in the address. |
| Record pages and back | No record pages: a panel over the list, in the address (`?customer=`, `?job=`, `?visit=`). Browser Back returns to the last record; Close returns to the page the first record was opened from; a record opened from another shows "‹ Andrea Reyes". | K: a record is a page with a back link above the title; V: a switcher between siblings. | Different model; section 5. |
| Phone | Bottom tabs Home, Schedule, Jobs, Customers, More (Reports, Settings, Sign out); top bar with logo and Search; a record is a full sheet. | V: hamburger on small screens (2020); three bottom tabs in the phone app. | We match NN/g for the four. More hides Reports, Settings and Sign out. |

## 2. The customer account and the marketing header

| Part | Trailhead | Mailchimp | Gap |
|---|---|---|---|
| Tabs | Header row: Home, Visits, Season Pass (only after a pass), Details; the lit one tinted. On a phone the row sits under the logo and scrolls sideways. | No end-customer account to compare; its own Account area uses local nav (V). | Four tabs in a top row suits a one-task site (NN/g). |
| Account menu | First name and chevron at the far right (Details, Open the admin for staff, Sign out), at every width. | V: profile icon, far right. | Matches NN/g. Details is both a tab and a menu item. |
| With and without a pass | The Season Pass tab appears only for someone who has held one; a signed-out visitor sees a quiet Sign in in the same place. | n/a | Header never changes shape: good. A customer with no pass has no way to one from the account. |
| Back | A visit page has one text link to Visits; the cancel dialog says "Back to my pass"; routes are real pages so browser Back works. | n/a | Fine. |
| Phone | Logo, tab row, name menu pinned right; no bottom bar, no hamburger. | V: tab bar in the app. | A scrolling row can hide Details on a 320px phone. |
| Marketing laptop | Services ▾, Service Areas ▾, Pricing, About, Blog, phone, Sign in or Your account, Book Online (one filled button). | n/a | Utilities at the right, one button: matches NN/g. Sign in and Your account is one link that changes text after a client probe. |
| Marketing phone | Logo, quiet Sign in or Your account, a bare hamburger, a full-screen sheet; a sticky Call and Book Online bar. | n/a | NN/g: a labelled, bordered hamburger is used more. |

## 3. Findings, ranked

### Confuses

1. **The admin has no account menu and no top-right utility zone.** Fix: add one account menu at the far right of the top bar (name or initials; Profile, Help, Open as customer, Sign out) beside Search, and take Sign out out of the rail and out of More.
2. **A panel does not say where Close or Back goes.** A record opened from another shows "‹ Andrea Reyes", one opened from Home or from search shows nothing, and from Reports or Settings a search hit goes to another page. Fix: always show a "‹" line naming where you came from ("‹ Today", "‹ Jobs", "‹ Andrea Reyes") and make a search hit from Reports or Settings return there on Close.
3. **Three controls do three things in a chain of records** (the X, the "‹" and the browser's Back). Fix: name them once: X and Esc close the panel to the list, "‹" goes to the record before, the browser's Back does the same as "‹".
4. **Reports, Settings and Sign out sit behind More on a phone**, and NN/g warns that tools hidden behind an ellipsis can go unfound. Fix: move Sign out to the account menu and label More with a border so it reads as a button; keep Reports and Settings under it.
5. **On a phone the page's primary action leaves the top bar for the page body**, so New job has two places. Fix: keep a "+ New job" in the sticky top bar on a phone.

### Inconsistent

6. **Settings tabs are not in the address**, so a link or a refresh loses the tab and Back leaves Settings. Fix: put the tab in the path (`/admin/settings/billing`).
7. **A page action and a panel action can be the same button in two places** (New job in the Customers header and in the Customer panel's footer). Fix: write the rule in `docs/DESIGN.md`: the page's primary is top right, a panel's actions are in its footer, and a panel never repeats the page's action.
8. **Details is a tab and a menu item in the customer header.** Fix: keep it as the tab and leave the menu with Open the admin and Sign out.
9. **The Invoices item arrives with no rule for when the list needs groups.** Fix: stay flat to eight items; past that group as Work (Home, Schedule, Jobs, Invoices, Customers) and Business (Reports, Settings).

### Polish

10. **Marketing Sign in and Your account flips text after load.** Fix: show "Sign in" until the probe answers, never a blank.
11. **The marketing hamburger is a bare icon.** Fix: add the word "Menu" and a border.
12. **Search finds records only.** Fix: add a Recent group, and a Help group when help exists.
13. **The customer's tab row scrolls sideways on a small phone.** Fix: let it wrap to two lines under 360px.

## 4. Recommendations, by surface

**Admin laptop.** Keep the rail: six or seven items with visible labels, a lit item, icon-only collapse. This is ahead of Mailchimp's unlabelled icons, which Arango criticises (V). Add what Mailchimp (V) and NN/g (N) have and we lack: an account menu at the far right of the top bar. Order in the bar left to right: toggle, page title, the page's action, Search, account.

**Admin phone.** Keep the four-tab bottom bar (NN/g: four or five frequent sections). Put the account next to Search in the top bar, keep a "+ New job" there, and keep More for Reports and Settings only.

**Getting back.** Treat the panel as a layer over a list: Close returns to the list, "‹" returns to the record you came from, the browser's Back agrees with "‹". Add no breadcrumbs to the admin: NN/g says skip them on shallow sites, and ours is two levels (list, record).

**Actions.** One filled button per page, top right; one per panel, in its footer; the rest in More; one destructive ghost last. This is what `docs/DESIGN.md` already says; it needs the "never repeat" rule (finding 7).

**Customer account.** Keep the tabs in the header and the name menu at the far right (NN/g utility guidance; Mailchimp's profile). Four places and one task per visit suit a top row; a bottom bar would push the name and Sign out out of sight.

**Marketing header.** Keep it; fix the label flip and label the hamburger.

## 5. Getting back

| Case | Trailhead today | Mailchimp and NN/g | Finding |
|---|---|---|---|
| Breadcrumb, Back link or the browser's Back | No breadcrumb. A "‹ Name" link above a panel title only when it was opened from another record; the browser's Back moves to the last record because the address holds it. | NN/g: breadcrumbs are location, not history, and supplement the browser's Back. K: a back link above a record's title. | Our "‹" is a history link; call and treat it as Back, not a crumb. |
| After opening from Home | `?visit=` is added on Home; Close returns to Home with the row lit; browser Back does the same. | Back returns. | Works; nothing on screen says "Today". |
| After opening from search | Opens in place on a screen with a record host, else goes to the record's own page; Close returns to the page you were on. | K: Back returns to where you searched. | From Reports or Settings Close lands on Jobs or Customers (finding 2). |
| After opening from another record | "‹ Andrea Reyes" above the title; Close skips the whole chain to the page; browser Back steps one record. | n/a | Right, but three controls (finding 3). |
| On a phone | The record is a full sheet: the X, the "‹" and the OS Back follow the address. Settings drills in with "‹ Settings". The bottom bar is hidden under the sheet. | NN/g: on a phone show only the parent. V: the app uses drill-ins. | Fine; the sheet covers the tabs, so leaving a section means closing first. |
| Where Close goes | The page the first record was opened from, with the row lit; a shared link strips the key. | n/a | Matches the design; keep. |
| Customer account | One text link to Visits on a visit page; real routes, browser Back works. | n/a | Fine. |

## 6. Actions

| Case | Trailhead today | Mailchimp and NN/g | Finding |
|---|---|---|---|
| The page's one primary, top right | New job, filled, in the bar on Home, Schedule, Jobs, Customers; Reports has none; Settings shows Save only when something changed. On a phone it moves into the body. | K: a filled button top right of list pages. V: a combo button, the main action on its face. NN/g: emphasise the main action with colour and a button. | Same on a laptop; differs on a phone (finding 5). |
| The secondary menu | No page-level More; the Schedule has an outline "Schedule N visits" and a view toggle; filters sit over the grids. | V: other actions in the dropdown of a combo button. | Add a page-level More only when a second action appears; never a second filled button. |
| Footer versus header | A panel: one filled primary, up to two outlines, More, one destructive ghost at the far right, in the footer (`RecordFooter`). A page: actions in the top bar. | V (dialogs): primary first. K: a record page has its actions at the top right. | Deliberate (a panel scrolls, its footer stays in reach); state it once (finding 7). |
| Destructive | Last, a ghost, then a `ConfirmDialog` in the destructive colour; Undo for the reversible ones. | K: a red button in a confirm dialog. | Fine. |
| A panel versus a page | Panel: footer. Page: top right. A sheet (New job) has its own footer with one button. | V: page top right, dialog bottom with the primary first. | Same once documented. |
| Customer account | Buttons in the body (Reschedule, Cancel visit, Text Ryan) and the next-visit card; Home leads with the invoice to pay. | n/a | Fine. |

## 7. The three questions for Hannah

1. **Should the admin get an account menu at the far right of the top bar, beside Search?** Default: yes, with the name, Profile, Help, Open as customer and Sign out, and Sign out leaves the rail and More.
2. **Should the customer account keep its tabs in the header with the name at the right, or move to a plain top bar with only the name and a menu?** Default: keep the tabs, because four places are too few to hide.
3. **Should Reports and Settings leave the phone's More menu?** Default: no, keep both under More, move Sign out to the account menu, and label More with a border so it reads as a button; revisit if the live walk shows nobody finds Reports on a phone.
