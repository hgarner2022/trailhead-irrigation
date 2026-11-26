# Admin cleanup, round 2: titles, one nav, parent-list crumbs, search by number, "visit"

Round 2 after the three audits of Nov 25 (`docs/plans/2026-11-25-admin-audit-*.md`), on Hannah's five decisions of Nov 25 2026. Round 1 (the link diet, PRs 182 and 183) is in `docs/review/2026-11-26-admin-link-diet/`. Every picture here was taken from Storybook on this branch with `shots.mjs` (headless Chromium, 1280 by 900 and 375 by 812): `node docs/review/2026-11-26-admin-titles-nav/shots.mjs docs/review/2026-11-26-admin-titles-nav`.

## 1. The title rule (one rule, `src/lib/admin/record-title.ts`)

| Record | Title | Line under it | Browser tab |
|---|---|---|---|
| Job | The service: "Sprinkler repair" | "for Andrea Dalton · Added Nov 18" | "Sprinkler repair for Andrea Dalton · Trailhead admin" |
| Season Pass job | "Season Pass 2027" | "for Andrea Dalton · Sold Nov 2, website" | "Season Pass 2027 for Andrea Dalton · Trailhead admin" |
| Job from a quote | The service | "for Dana Whitfield" | the same pattern |
| Quote | Its number: "Q-2026-0005" | "<service> for <customer> · From a request" | "Q-2026-0005 · <service> for <customer> · Trailhead admin" |
| Invoice | Its number: "INV-2026-0042" | "Sprinkler repair for Marcus Bell · Sent Nov 12" | "INV-2026-0042 · Sprinkler repair for Marcus Bell · Trailhead admin" |
| Request | "Request from Rosa Delgado" | "Christmas lights · Came in Nov 18 at 9:02 am" | "Request from Rosa Delgado · Christmas lights · Trailhead admin" |
| Customer | The customer's name | "Customer since Apr 2026 · 480 Briggs St, Erie" | "Andrea Dalton · Customer · Trailhead admin" |

Pictures: `10`, `11` (job), `12` (Season Pass job), `13` (return visit), `14` (job from a quote), `20`, `21` (quote), `30`, `31` (invoice), `40`, `41` (request), `50`, `51` (customer).

## 2. The nav, one order

Home, Schedule, Customers, Requests, Quotes, Jobs, Invoices, Reports, Settings. One list (`NAV` in `admin-nav.ts`) read by the rail, the phone's bar and More sheet, the walkthrough and every design story (`DesignShell`). The lit item is the record's own list: `02` Invoices, `03` Quotes, `04` Requests, `01` and `10` Jobs, `50` Customers, `70` the walkthrough's rail.

The phone's bar stays five: **Home, Schedule, Customers, Jobs, More** (`05`). Those four are what is opened from a truck (today, the week, a person, the work); Requests, Quotes and Invoices are desk work, one tap further. More opens a sheet from the bottom with the rest in the rail's order, each with its count, the open screen marked (`06`, `07`, `76`).

## 3. Crumbs

A record page's crumb is its parent list ("‹ Jobs", "‹ Invoices", "‹ Quotes", "‹ Requests", "‹ Customers"), from `listCrumb(section)`. `74`: Invoices, then INV-2026-0035, then its customer: the crumb reads "‹ Customers" and Customers is lit. `75`: pressing it lands on the Customers list.

## 4. Search by number

Cmd+K finds an invoice and a quote by number (whole, or the last digits), in an Invoices and a Quotes group, each hit titled with the number: `60`, `61` (INV-2026-0042), `62`, `63` (Q-2026-0005), and in the walkthrough `71` (found), `72` (opened), `73` (quotes).

## 5. Words

"Visit", never "trip", on screen and in story names (`13`: "Return visit: new valve", "Add a return visit"). The Jobs list has no "Quote later" and no job waiting on a price (`80`). A customer with no quotes has no Quotes card (`81`, and `74`).

## Proposals: new or changed words in this round (nothing here was decided by Hannah word for word)

1. **"Request from Rosa Delgado"** as the request's title (the objects audit's default; the customer audit suggested "Request: larger sprinkler repair").
2. **"for Andrea Dalton · Added Nov 18"**: the word "for" before the customer is hers; joining it to the existing "Added Nov 18" with a middle dot is mine.
3. **"Season Pass 2027"** as a pass job's title (the audit's example). The pass number is no longer in the title; it is on the pass card on the page. The Jobs list still names the row "Season Pass TH-2027-0008".
4. **A count beside Invoices**: the invoices past due (screen readers hear "2 past due"). Requests and Quotes already had counts; this one is new.
5. **The browser tab ends "· Trailhead admin"**.
6. **Cmd+K's hint is unchanged** ("Search by name, street, phone or pass number"). Proposed, not done: "Search by name, street, phone or number".
7. "Return visit", "Add a return visit", "Visit 1", "Visit 2 ahead", "Nothing to bill until the visit is done.", "This visit was Mon, Nov 16 and was never marked done." are the old lines with "trip" replaced.

## Not done, on purpose

- **The shipped side panels** (Home, Schedule, Jobs, Customers in the live app) still say "‹ Andrea Reyes" above a record opened from another. That is a Back step inside one screen, and changing it is the pages-or-panels question of the audits.
- **The request's stub pages** ("This request became a quote", "This request became a job") keep their own titles.
- **The Jobs list's first column** still reads "Season Pass TH-2027-0008" for a pass (its search box finds a pass by number through that text).
- The live app has no Requests, Quotes or Invoices page, so its rail is the same order without them, and a live invoice hit opens the invoice's job.
