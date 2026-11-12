# Admin dashboard, design system and Storybook: design

Approved 2026-11-12 after a brainstorming pass with Hannah. Companion to
`2026-11-12-season-pass-checkout-prd.md`, which says what to build. This
says how the screens, tables and dashboards are built so they stay
consistent for the long term.

## Decisions from the conversation

- Laptop first, phone friendly. Hannah on a laptop is the main user; Ryan
  on a phone is the second.
- Storybook is the catalog and the approval surface. Only our own
  components are used on any screen.
- Prototype data is a real-shaped, anonymised snapshot from Jobber.
- The dashboard lives in the website repo at `/admin` as a route group,
  not a separate app. Research: one Next.js app with route groups is the
  default until several teams deploy independently; auth must be layered
  (proxy plus server-side check on every page and read) because of the
  2025 middleware bypass; admin code must never reach the marketing bundle.
- Tables are full data grids (sort, filter, hide and reorder columns,
  selection with bulk actions, export).
- Feel: Stripe. Light, calm, numbers first. Light mode only in phase 1.
- Long term: franchise or branch managers are possible, so every table is
  organization-scoped and users have roles from day one, with no branch UI
  until a second branch exists.
- Approach: screen first with the rails laid first. Governance makes the
  consistent path the easy one; the system grows from real screens.

## 1. Design system foundation (the rails)

- **One token source.** `src/app/globals.css` holds the brand tokens
  already. Add the app tokens there: surface levels, chart series,
  positive / negative / warning, table row and border, focus ring. Every
  token is documented in `docs/DESIGN.md` with its meaning and use. A lint
  rule fails on raw hex or arbitrary Tailwind colours in `src/components`.
- **Three tiers, three folders.**
  - `src/components/ui/` primitives: shadcn-generated, adapted to our
    tokens, never edited ad hoc.
  - `src/components/blocks/` composed pieces used by more than one screen.
  - `src/app/(admin)/…` screens that only compose blocks.
  - Marketing sections stay in `src/components/sections/`.
- **Storybook.** `@storybook/nextjs-vite`, global CSS imported in
  `.storybook/preview.tsx` so stories render in brand, `nextjs.appDirectory`
  on globally, viewports 375 / 768 / 1280 / 1440, fixtures from the Jobber
  snapshot. Every file in `ui/` and `blocks/` has a story; a script checks
  this in CI. Screen stories are what Hannah approves before wiring.
- **`docs/DESIGN.md` is the contract for humans and agents.** Aesthetic
  direction (Stripe calm, Trailhead palette, Barlow Condensed numbers),
  spacing scale, the table and chart rules below, when to use a side panel
  versus a page, and the rule that a new block needs a story and an entry
  here. `CLAUDE.md` points to it.

## 2. Shell, navigation and auth

- **Route group `(admin)`** with its own root layout: no marketing header,
  footer, sticky bar or JSON-LD. The layout checks the session server-side
  and redirects to `/admin/sign-in`. The proxy checks the `/admin` prefix
  earlier. Two gates.
- **Sidebar shell** from the `sidebar` primitive (shadcn `sidebar-07`
  pattern): navy rail, compact badge logo, Home · Revenue · Passes ·
  October · Customers, the signed-in person at the bottom. Collapses to
  icons at 1024px; becomes a bottom tab bar at 768px and below. Cream
  canvas, content max width 1280px, `PageHeader` on every screen.
- **Sign-in** is magic link by email (Auth.js + Resend) with an allow-list.
  No passwords, no OAuth, no sign-up page.
- **Organizations and roles from day one.** Every table carries
  `organization_id`; Trailhead is organization one. The Jobber connection,
  Stripe account and blowout capacity hang off the organization. Users
  have a role: owner, manager, tech. Pages and actions check the role. A
  switcher slot at the top of the sidebar stays hidden while there is one
  organization. Not built now: the switcher, invitations, per-branch
  billing, a franchisor roll-up.
- **Import boundary.** Nothing in `(admin)` imports from marketing
  sections and nothing in marketing imports from `(admin)`; lint enforces
  both directions.

## 3. Data layer

- **Screen-facing types** in `src/lib/admin/types.ts`: `Visit`, `Quote`,
  `Invoice`, `Client`, `Pass`, `PassVisit`, `BlowoutWeek`, `MonthTotal`.
  Screens and blocks never see Jobber's or Stripe's shapes.
- **Fixtures first.** A snapshot through the Jobber connector (2026 visits,
  quotes, invoices, clients, month totals), anonymised to first name and
  town, saved as `src/lib/admin/fixtures/*.json`. `getAdminData()` has two
  implementations behind one interface, `fixtures` and `live`, chosen by an
  environment variable. The prototype becomes the product without touching
  a screen.
- **Live later.** Postgres tables filled by a scheduled Jobber sync (every
  fifteen minutes in season, hourly otherwise, inside Jobber's cost budget)
  and updated between syncs by Stripe and Jobber webhooks. Every row has
  `organization_id`, `source` (jobber / stripe / app) and `synced_at`, so
  the dashboard can say "updated 4 minutes ago".
- **Derived numbers in one place.** `src/lib/admin/metrics.ts` computes
  committed revenue, charged so far, this month versus last year, spots
  left per week. Unit tested against the fixtures so a tile and a chart can
  never disagree.

## 4. Blocks

Each has a story with the fixtures at all four widths, plus empty, loading
and error stories, and an entry in `DESIGN.md`.

- **StatTile.** Label, big number in Barlow Condensed, a delta with its
  baseline named in words ("vs October 2025"), optional sparkline with the
  previous period as a dashed line. Colour means good or bad, never up or
  down. Four across on a laptop, two on a phone.
- **SeasonLine.** The April-to-November arc as a horizontal timeline:
  months as ticks, today marked, committed pass revenue as bars above the
  months ahead. The same component draws one customer's season (three dots)
  on the pass page and in the side panel. No precedent exists for this, so
  it is built and shown first, with a twelve-month bar chart as the
  fallback if it does not land.
- **PassCard.** A wallet-style card at the end of checkout, on the
  customer's pass page, and as a thumbnail in the admin side panel.
  Trailhead badge, first name, "Season Pass 2027", three visit windows,
  reserved blowout week, pass number. Holographic sheen in CSS that follows
  the mouse on a laptop and the tilt on a phone; static sheen under reduced
  motion; a flat version in the confirmation email; one tap saves it as an
  image. The only place the holographic effect appears. Ikon Pass is the
  reference for the feel; the type and colours are Trailhead's.
- **Chart.** Thin wrapper on the shadcn `chart` primitive (Recharts) locked
  to grouped bars by month (this year against last, last year dashed) and a
  single line. Series colours from the chart tokens. No pies, gauges or 3D
  (NN/g). Tooltip carries exact numbers.
- **DataGrid.** Built from shadcn's documented TanStack data-table recipe
  (sorting, filtering, column visibility, selection, pagination), extended
  with column reorder and CSV export. The reference `ui/dataTable.tsx` is a
  stub and is not the base. Rules: the record name is the first column and
  is the link that opens the side panel, so row click never fights with the
  checkbox; the side panel is a resizable sheet that pushes the grid
  narrower on a laptop rather than covering it; the bulk action bar appears
  above the grid only when rows are selected; active filters are visibly
  marked; sticky header. On a phone the table stays a table: sticky header,
  frozen first column, horizontal scroll with a cut-off edge as the cue,
  column hiding; never card stacks (NN/g small-screen tables).
- **PageHeader, EmptyState, StatusPill, NeedsAttention, WeekCard.** Small,
  all in the catalog so no screen invents its own.

## 5. Screens

Every screen is a story at 1440 / 1280 / 768 / 375 with fixtures, plus a
"no data yet" story. Hannah approves in Storybook; nothing is wired until
a screen is approved.

- **Home.** PageHeader (greeting, date, "updated N min ago"), four
  StatTiles (this month vs last year, passes sold and committed, quotes
  awaiting response with total, invoices past due), SeasonLine, then two
  columns: today and tomorrow's visits left, NeedsAttention right. Columns
  stack on a phone.
- **Revenue.** Two StatTiles (committed this season, charged so far), bar
  chart by month with last year dashed, upcoming charges list, renewal
  pipeline hidden until a second season exists.
- **Passes.** DataGrid: name, town, zones, blowout week, status, charged,
  next visit. Filter chips for town, status, week. Side panel: PassCard
  thumbnail, SeasonLine for that customer, charge history, Jobber and
  Stripe links, actions (resend confirmation, send card-update link,
  cancel).
- **October.** A row of WeekCards for the October weeks (capacity, taken,
  spots left, towns), editable in place. Under it, the selected week's
  pass blowouts as a small DataGrid.
- **Customers.** Deferred; its story is an empty state so the nav is
  complete.
- **Checkout.** Six screens as in the PRD, one question each, ending on the
  PassCard reveal. **Customer pass page:** PassCard, SeasonLine, card on
  file, cancel.
- **Build order.** Rails and tokens → SeasonLine and PassCard → StatTile,
  Chart, DataGrid → Home → Passes → October → Revenue → checkout screens →
  pass page.

## 6. States, errors and testing

- Every block has empty, loading (skeleton) and error (one line, what to
  do) stories. Screens have a "no data yet" story so the first live day is
  not blank.
- `metrics.ts` is unit tested against the fixtures. Blocks get Storybook
  interaction tests for sorting, filtering, selection and the side panel.
  A visual check at the four widths before a screen is marked approved.
- Lint gates: no raw colours, no admin / marketing cross-imports, every
  component has a story.

## Research consulted

- NN/g: data tables (four user tasks), tables on small screens, dashboards
  and preattentive attributes.
- shadcn blocks (`dashboard-01`, `sidebar-07`) and the data-table recipe.
- SaaS KPI card patterns (delta with named baseline, sparkline with dashed
  prior period), bulk action placement (Eleken), data grid row-link rule
  (Cognite).
- Next.js route groups versus multi-zones; App Router auth patterns after
  CVE-2025-29927; Storybook `nextjs-vite` setup for the App Router.
- Ryan Duffy, "Ten days: Dalton Mills just merged a shiny new design
  system": governance for humans and agents, pick one real feature first.
