# Customer side polish: research, requirements, glossary

Nov 19 2026. Hannah's review of PR #105. Her three answers are applied, not asked again: (1) the exact time only, never an arrival window, anywhere; (2) Reschedule offers the same day picker as booking (the calendar since Nov 23); (3) the booking confirmation is a second face of the holographic PassCard. Sources were fetched Nov 19; where a source did not say, this doc says so.

## 1. Research

### a. Hierarchy and spacing on an account home

- **NN/g, visual hierarchy** ([nngroup.com/articles/visual-hierarchy-ux-definition](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)): order elements by importance; the most important one is the largest; about three text sizes and no more than two large elements; things close together read as related, extra space separates groups; borders and fills only when space is not enough. Squint test.
- **Refactoring UI** (summaries only, the book was not fetched; [rjseymour66.github.io/webdev/refactoring-ui](https://rjseymour66.github.io/webdev/refactoring-ui/), [Presta](https://wearepresta.com/spacing-in-ui-design/)): start with too much white space and remove it; pick spacing from a fixed scale (4, 8, 16, 24, 32, 48, 64) and never invent values; space between groups is larger than space within a group; proximity is the grouping device.
- **Apple HIG and Material** (HIG and Material pages returned no body text to the fetch; the figures below are the published ones, not re-verified today): touch targets 44 pt (Apple) and 48 dp (Material), tab bars hold a few clearly labeled top-level places, Material layouts sit on an 8 dp grid with 16 px phone margins.
- **Housecall Pro portal** ([help article](https://help.housecallpro.com/en/articles/8448657-using-the-customer-portal)): appointments with Upcoming and Past tabs, an Invoices tab, and an unpaid invoice raises a banner on the appointments page and a badge on the menu. Jobber's Client hub is a left menu of requests, quotes, appointments and invoices with the business logo at the top ([Jobber help](https://help.getjobber.com/en/articles/what-do-your-clients-see-in-client-hub/)).

**What we apply.** One order on Home: the next visit (its exact time is the one headline, the one primary button under it), the invoice right under the visit when one is unpaid (one filled button per screen, so Pay now is an outline), the pass or the pass sell card, recent visits. Three type sizes: the display headline, 16 px body, 14 px label. Spacing scale 4, 8, 16, 24, 32, 48 only: 8 inside a group, 16 between facts and a button, 24 between cards, 32 between sections, 48 around the page. Cards use one padding (24 on a laptop, 16 on a phone). On a laptop the page is a two-column grid on the `Container`/grid rhythm: left column the next visit and the invoice, right column the pass card; recent visits run full width under both. Nothing is a half-empty column: a customer with no visit gets the sell card beside "Nothing booked right now."

### b. Top navigation and the account menu

- **NN/g utility navigation** ([nngroup.com/articles/utility-navigation](https://www.nngroup.com/articles/utility-navigation/)): account tools belong top right, where people look for "My account"; conventional placement beats grouping everything; on a phone hiding tools behind a menu is fine but test that people find it; label the control with text, not an icon alone.
- **Shopify customer accounts** ([changelog](https://changelog.shopify.com/posts/customer-accounts-get-a-design-uplift)): the refreshed account pages moved to a single column with clearer navigation and mobile-first tweaks; menu is Orders and Profile.
- **Stripe customer portal** ([docs](https://docs.stripe.com/customer-management/activate-no-code-customer-portal)): email login link, no password; the docs say nothing about sign out. Jobber's Client hub is also passwordless and its help center documents no client sign out. Calendly and Square Appointments: the search returned nothing usable, so they are not cited.

**Decision.** The account menu (first name, Details, Sign out; Open the admin for staff) is at the far right of the header at every width, because top right is the convention and the one thing the sources agree on. Hannah then settled the tabs: the header keeps **Home, Visits, Season Pass, Details** as four labeled tabs, beside the logo on a laptop and as a row under it on a phone (44 px high, no hamburger, so nothing hides). **Details appears once, as the tab**; the menu holds Sign out (and Open the admin for staff) and repeats no tab. The current tab is navy with an orange underline on the header's rule; inactive tabs are quiet navy-light. Season Pass is shown to everyone: a customer with no pass lands on the sell card (section d). A bottom tab bar was considered and rejected: three places plus an account fit in the header, and a second fixed bar costs 56 px of a phone's height for no gain.

### c. Copy

Sources: the project's own `docs/UX_WRITING.md` (voice rules, subject patterns) and Hannah's rules. Glossary, one word for one thing:

| Thing | Customer word | Never |
|---|---|---|
| The day and time | "Wednesday, April 28 at 10:30 am" | window, between, arrives, a span, "2-hour", "half hour" |
| A visit on the calendar | Booked | Scheduled, Confirmed |
| A visit that happened | Done | Completed |
| A visit that was canceled | Canceled | Cancelled, Skipped |
| Money | Paid, Unpaid, Past due | Owed, Overdue, Bill |
| The request for money | Invoice | Bill |
| Proof of payment | Receipt | |
| The plan | Season Pass | pass membership, plan, subscription |
| The people | Ryan (first name), "we" for the company | the crew, the team |
| Where they manage it | "your Trailhead account" | portal, dashboard, hub |

**The time rule, stated once.** A booked visit reads its exact start once, as "Wednesday, April 28 at 10:30 am", and never an arrival window, a "between", or any span, on the account, in texts, in emails, in the day-before reminder ("Ryan is coming tomorrow at 10:30 am") and on the booking confirmation. A visit with a day and no time yet reads the day only, with one sentence: "We'll text you the time the day before." Nothing in the product says a time it does not have.

**One sentence pattern per message.** The fact first, then the one thing to do, then the link. Date set: "Your fall blowout is Fri, Oct 14 at 10:30 am. Ryan will be there." Moved: "Your fall blowout moved to Fri, Oct 14 at 10:30 am." Two weeks out: "Your fall blowout is still Fri, Oct 14 at 10:30 am." Day before: "Ryan is coming tomorrow at 10:30 am for your fall blowout." Texts stay ASCII and open "Trailhead:".

**No AI tells:** no "it's not X, it's Y", no lists of three, no "no X, no Y", no em dashes, no "Yes!", no stock lines. A sentence states a fact and stops.

### d. The Season Pass slot

A customer with no pass sees a card in the same frame and the same place as the pass card (right column on a laptop, under the next visit on a phone), never empty space. It sells the pass in the order the customer weighs it: the thing (the spring turn-on and the fall blowout, two visits), the benefit (you pick your days when you reserve; repair priority), the price (per zone, from the table in `src/lib/season-pass.ts`), one button, "Get a Season Pass", to `/season-pass`. Copy follows the repo rules: no "no discount" lead, no "three visits", no invented numbers.

### e. Mailchimp's record page (Hannah: "emulate them"; "everything blurs together")

**What could and could not be verified.** Mailchimp's pattern library (ux.mailchimp.com), its design-system site and its help pages returned 404 or 503 to the fetch today, and a search for a teardown of the campaign report page found only third-party reporting templates ([Coupler](https://blog.coupler.io/mailchimp-report-templates/), [AgencyAnalytics](https://agencyanalytics.com/templates/reports/mailchimp)) and the API's delivery states ([Mailchimp API](https://mailchimp.com/developer/marketing/api/reports/get.md): delivering, delivered, canceling, canceled). Those confirm that a campaign page leads with a row of summary figures (sent, opens, clicks, bounces, unsubscribes) over sections of detail, and that its status is a small named state. The structure below is the one the product is widely known for and is **not verified against screenshots**; send two screenshots (a campaign report and an audience page) and the rules get checked against them.

**The structure, as described:** a grey page with distinct white cards, each with a real section title; the page title with a status badge beside it and the one primary button at the top right; a band of key figures right under the title, label quiet and value in weight; a main column and a narrow aside on a laptop that stacks to one column on a phone; badges that are a tinted pill with a dot and one word.

## 2. Requirements (decisions applied)

1. Home order is next visit, invoice, pass or sell card, recent; one filled button per card (section a).
2. Spacing scale 4 / 8 / 16 / 24 / 32 / 48; card padding 16 phone, 24 laptop; grids from `Grid`-style two-column layout with `gap-6`, one container (section a).
3. Header: logo, four tabs (Home, Visits, Season Pass, Details), account menu far right at every width holding Sign out only (plus Open the admin for staff); Details once, as the tab (section b).
4. Season Pass is a place for everyone and a sell card for a customer with none (section d).
5. The time rule and glossary hold in every string, text and email default; `{window}` placeholder becomes `{time}`; the `arrivalWindow` helper is deleted (section c).
6. Booking confirmation is the holographic PassCard's second face: the same card artwork, sheen and size, reading the service, the day and time, and the street (Hannah).
7. Reschedule keeps the day and time picker, the same as booking, on the 8-point scale (Hannah).

## 3. Still open (defaults applied)

1. **Saved message edits that use `{window}`:** the placeholder is renamed `{time}`, so any saved text still containing `{window}` is ignored and the shipped words are used. Default: accept that; a saved text is rare and the Settings screen shows the new name. Say if you want `{window}` to keep working as an alias.
2. **A Season Pass visit with a day but no time yet** (Ryan's estimate is not shown until the customer is told): default is the day plus "We'll text you the time the day before." Say if every visit should be timed at booking instead.
3. **Season Pass tab for someone who never held one:** default is that the tab opens the sell card at `/account/pass`. Say if you would rather it link straight to `/season-pass`.

## 2b. Layout rules taken from the record page, in our tokens

Navy, orange, stone and white, Barlow Condensed headings, Source Sans body; never Mailchimp's colours or type.

1. **Two surfaces.** The page is stone (`bg-stone`); every group of content is a white card (`bg-card`, 1 px border, `shadow-sm`). Cream is not used behind account or booking content, because cream on white was the "same texture" Hannah saw.
2. **A title row.** Title in the display face, its status badge beside it, the one filled button at the top right (Reschedule on a visit). It wraps under the title on a phone.
3. **A summary band** on a record page: one card, the key facts side by side (two by two on a phone), label 12 px uppercase muted, value 16 px semibold navy. On a visit: When (day and exact time), Who, Where, Money.
4. **Badges are a system:** tinted pill, a dot, one sentence-case word (`StatusPill`): orange Booked, green Done and Paid, red Past due, grey Canceled and Unpaid. The same pill carries a visit's status and its money word, on Home, Visits, the visit page and the pay page.
5. **Real section titles** over each card in the display face (Recent visits, Coming up, Past); cards never float without one unless they are the page's single subject.
6. **Main column and narrow aside** on a laptop (Home: visit and invoice seven columns, pass five), one column on a phone with the same order.
7. **One spacing scale** (4, 8, 16, 24, 32, 48) through `Stack` and `Grid`; 16 px card padding on a phone, 24 on a laptop.
8. **The booking steps** sit in one white card on the stone page, with the step's question as the card's title; the pay page is already one white card and stays.
