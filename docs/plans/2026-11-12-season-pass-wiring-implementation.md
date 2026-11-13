# Season Pass Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Put real data behind the approved prototype screens and make the app Trailhead's system of record: a Postgres database, sign-in, an open `/api/v1` that every screen and every agent uses, Stripe, the Season Pass checkout with timing preferences and consent, the app's own scheduler across Ryan's trucks with a map to check the routing, every customer message sent by the app, a one-way push of scheduled visits into Jobber for the field, the admin (Home, Schedule, Passes, Revenue, Customers, Settings), the January renewal, and the booking form at `/book` in place of the Jobber iframe, with the marketing site unchanged at every step.

**Architecture:** The marketing tree moves into `src/app/(site)/` and keeps its root layout and `globals.css`; `(admin)`, `(checkout)`, `(account)` and `(booking)` get their own root layouts on one shared stylesheet entry, `src/app/app.css`. Drizzle owns the schema in `src/db/schema.ts`; every table carries `organization_id`; trucks, areas, services and consents are rows; settings live on the organization with a change log. The API is one code path: each resource's handlers are functions in `src/api/v1/<resource>/`, the route files under `src/app/api/v1/` are thin wrappers, server components and server actions call the same handler functions in process with the session's principal, and API keys call them over HTTPS; an OpenAPI document is generated from the handlers, `/developers` renders it, and `/api/mcp` exposes the same resources as tools. The app owns the pass, its visits, dates, trucks, areas, charges, consents, messages and settings. Jobber is a one-way display for the field: the app pushes each scheduled visit (pass or booked) to Jobber as a job and visit assigned to the truck's user and reads back only two signals, visit completed and visit moved; a move is accepted, logged as an exception and shown on Home. Non-pass work that Jobber still holds (repairs, installs, quotes, invoices) is mirrored read-only for the dashboard's totals and for capacity. Stripe holds the card. Everything asynchronous goes through one claimed `queue_item` table drained after the response with `after()` and again by a cron. Screens keep taking `AdminData` and callbacks as props. Design: `docs/DESIGN.md`. Map: `docs/plans/2026-11-12-trailhead-system-information-architecture.md` (nav order, entity ownership, scheduling rules, the open API rule, consent). Requirements: `docs/plans/2026-11-12-season-pass-checkout-prd.md` ("Scheduling preference" and "System of record (revised)" supersede the original split). Audit: `docs/plans/2026-11-12-jobber-audit.md` ("What the build must reproduce" and the questions, folded in below). Research: `.local-data/research/2026-11-12-pass-visit-scheduling-brief.md` and `.local-data/research/2026-11-12-booking-checklists-messages-brief.md` (git-ignored; read them from the main checkout). Prototype: `docs/plans/2026-11-12-admin-dashboard-prototype-implementation.md` (Status and Known gaps) plus the `prototype-ia` branch, which already carries the preference, consent and October changes.

**Tech Stack:** Next.js 16.1 App Router (`proxy.ts`, `after()`, server actions, route handlers), React 19, TypeScript strict, Tailwind v4, Drizzle ORM on Neon Postgres (`@neondatabase/serverless`, `drizzle-kit`, `@electric-sql/pglite` for tests), Zod for every API input and output (and the OpenAPI document through `zod-openapi`), `@modelcontextprotocol/sdk` for `/api/mcp`, Auth.js v5 with the Resend provider, Stripe (Embedded Checkout in setup mode, off-session PaymentIntents), Jobber GraphQL API with OAuth 2, Resend for email, Twilio for SMS, Nominatim for geocoding, MapLibre GL with OpenFreeMap tiles, Vercel Cron, Vitest and Storybook `nextjs-vite`. Node 24, npm 11.

**Conventions the executor must keep:** everything in the prototype plan's header (`cn()`, semantic tokens, `rounded-lg`, `data-slot`, sentence case, copy rules from `CLAUDE.md`). Plus: `import "server-only"` at the top of every file that touches the database, Stripe, Jobber, Resend, Twilio or the geocoder; no secret read outside `src/lib/env.ts`, never at module scope; every table has `organization_id`; every write a webhook, a retry, a second drain or an agent can repeat is idempotent on an id or an idempotency key; money in the database is whole dollars, cents only inside `src/lib/stripe/`; timestamps are `timestamptz`, calendar days are `date` and mean Mountain-time days; nothing under `src/app/(site)/` or `src/components/sections/` imports from `src/db`, `src/api`, `src/lib/jobber-api`, `src/lib/stripe`, `src/lib/messaging`, `src/lib/scheduling`, `src/lib/geocode` or `src/lib/pass/server` (the gate's rule, Task 1.3; the existing `src/lib/jobber.ts` with the form ids stays a marketing module, which is why the server folder is `jobber-api`). Type names follow `prototype-ia`'s `src/lib/admin/types.ts` (`TimingPreference`, `Consent`, `Truck`, `AreaGroup`, `SeasonWindow`, `MessageTemplate`, `OrganizationSettings`, `SettingsChange`, `VisitException`); nothing already named is renamed.

**Keep the marketing site green at every task.** Each task ends with `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`; `npm run test:stories` at the end of each phase. `npm run manifest:compare` (Task 1.1) proves the marketing routes and CSS unchanged after every task that touches `src/app` or a stylesheet. Where a task creates a module another fills in, the first creates the stub so the tree compiles at every commit.

**Storybook approval before wiring** (DESIGN.md): every screen or block this plan adds (Settings, Schedule with its map, SeasonSetup, the Customers consent panel, SignInCard, the card step, the booking steps) is a story first, Hannah approves it in Storybook, its row is added to the Approvals table, and only then is it wired. The Checkout and Pass page rows on `prototype-ia` read "awaiting Hannah"; Task 2.6 collects those too.

**Commit after every task.** One plain sentence, sentence case, no prefix, with the attribution line in the system reminder.

**Branch:** `season-pass-wiring`, cut from `prototype-ia` once it is merged to `main` (it contains `main` at `c99b49f`). Each phase can be its own PR; Phase 1 lands first and alone so the marketing site is seen unchanged on the live deploy.

**The risk, stated plainly:** once Phase 10 ships, a scheduling mistake is ours. A visit on the wrong day, two trucks in one town, a blowout after the freeze: the app chose it. The answers are the hard rules in `propose.ts` tested one by one, Ryan approving every batch in the first season, a map on the Schedule page so the routing can be checked by eye, exceptions from Jobber always winning, and the daily summary. Auto-apply stays off until Ryan has approved a full season. And the system must never show Ryan less than Jobber does today: every visit the app schedules is on his Jobber calendar until the day view replaces it.

---

## Questions to settle before the phases that need them

Hannah has settled the prices (2026-11-12, late): the website's numbers in `src/lib/season-pass.ts`, `/pricing` and `public/pricing.md` are right; the Jobber catalogue and form numbers were testing. So the ten mismatches in the audit need no decision; Task 3.4 seeds the services from the site and aligns Jobber to it.

For Ryan, from the scheduling brief and the audit, needed by Phase 10:

1. Which towns share a truck-day, and does the same truck keep the same towns all season. The brief's split: Erie + Firestone, Longmont, Louisville + Lafayette, Broomfield.
2. Visits per truck per day for a turn-on, an inspection, a blowout and a repair. The audit's ceiling: about 9 a day per truck in October, 2 to 5 the rest of the year, busiest day 17 across both.
3. Working days per truck, and whether Saturdays exist in October (40 Saturday visits in 2026).
4. Whether "earlier" means the first area-day in the window or any earlier week. The plan assumes the first area-day.
5. The trucks: names, which Jobber user each is, and whether the second person returns in spring or is blowout season only (person B started September 21).
6. Where the route order comes from on a 17-visit day today, and whether the second truck gets its own route (Task 0.1 checks whether the API exposes it).
7. The 55 open jobs with no visit and the 101 past visits never marked complete: cancellations, duplicates, done and forgotten, or not done. The app closes a cancelled job and nudges an unclosed one (Task 10.4), but the backlog is his call.
8. The 16 open quotes ($33k, oldest May) and the 14 past-due invoices: chase, archive, or leave; both stay in Jobber in this plan and show on Home.

For Hannah:

9. Jobber's own visit notifications for pass and booked jobs: Task 0.1 asks whether they can be turned off per job; if not, customers get Jobber's email and reminder as well as the app's until they are off account-wide.
10. SMS in the first season: on (consent at checkout and booking, day-before text) or email only. The Messages settings carry the switch.
11. The Season Pass terms block, the terms version, and the sales tax answer (the audit found tax at zero on every invoice; confirm that is intended). Needed before the first live charge.
12. The `/season-pass` page still promises a "reserved" blowout week; Hannah rewords it. This plan changes marketing copy only in the FAQ answers (Task 15.1).

---

## Decisions this plan makes

1. **Neon, not Vercel Postgres**, through the Vercel Marketplace; `drizzle-orm/neon-http`. No interactive transactions, so every multi-statement write is safe when re-run and the queue claims with one atomic `UPDATE … RETURNING`.
2. **One queue, in Postgres, with a claim step** (`queue_item`): a webhook inserts, answers within a second, drains with `after()`; `/api/cron/drain` drains again; a claim is `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`, so two drains never run the same item.
3. **API first, one code path.** Each resource is a folder under `src/api/v1/` with Zod schemas and handler functions `(ctx, input) => output`; `ctx` carries the principal (a signed-in person or an API key), its organization and scopes. The route files under `src/app/api/v1/` parse the request and call the handler; server components and server actions call the same function in process through `callApi(handler, input)` with the session's principal, so there is no self-HTTP hop and nothing a screen can do that the API cannot. Every call, in process or over HTTPS, is logged with who made it. OpenAPI is generated from the Zod schemas; `/developers` renders it; `/api/mcp` wraps the same handlers as MCP tools.
4. **Auth.js, one instance, two kinds of user**, JWT sessions, Resend magic links; `/admin/*` needs an admin principal, `/account/*` a customer or admin; the config is a function so nothing reads the database at import. API keys are a third principal kind with scopes, checked by the same `ctx`.
5. **Embedded Checkout with `redirect_on_completion: "never"`.**
6. **Preferences, not reservations.** No capacity on the customer side anywhere. Earlier, Recommended or Later for the turn-on and the blowout, worded by `preferenceLabel` in `src/lib/admin/format.ts` (from `prototype-ia`), the reason under each computed from the freeze record.
7. **Consent is append-only.** A `consent` row per acceptance or change (terms version, source, marketing opt-in, channels, recorded at); the newest row is the current state; STOP and unsubscribe append. Terms acceptance is required to pass the card step and the booking's last step; marketing is unticked by default (Hannah's rule overrides the Jobber form's pre-ticked email box). Reminders, confirmations, receipts and date messages are transactional; anything else needs the opt-in.
8. **The app schedules; Jobber displays.** `src/lib/scheduling/propose.ts` is a pure function from visits, trucks, areas, settings and the calendar to a truck and day per visit; the same slot model (`src/lib/scheduling/slots.ts`) gives the booking form its open times. Ryan approves a batch on Schedule; approval pushes to Jobber. Stop order: read back from Jobber after its Route Optimization if Task 0.1 finds the API exposes it; otherwise the app orders each truck-day by nearest neighbour plus a 2-opt pass and pushes start times in that order. Personal calendar blocks in Jobber subtract from capacity through the mirror.
9. **Two signals read back, nothing else.** `VISIT_COMPLETE` triggers the charge for a pass visit (and the receipt for a booked one); `VISIT_UPDATE` with a different day or user is an exception. Completion may never arrive (21 percent of 2026 visits were never marked complete): the day after a scheduled visit with no completion, Home shows "not closed yet" and the crew message says so; nothing charges on its own.
10. **Every customer message comes from the app**, Resend and Twilio, templates as pure functions tested on their wording, every send in `message_log`, marketing gated by consent.
11. **Geocoding with Nominatim, cached forever on the property.** Server-side only, one request per second, a `User-Agent` naming the site and a contact address, results stored as `lat`/`lng` and never re-fetched; attribution "© OpenStreetMap contributors" on the map. About 400 addresses once and a few a day after fits its usage policy (no bulk, no heavy use); if volume ever grows past that, swap the provider behind `src/lib/geocode/`. No key exists, so nothing can leak to the client.
12. **The map is MapLibre GL with OpenFreeMap tiles** (no key, no account), loaded only on the Schedule page.
13. **Services and prices come from the site.** A `service` table seeded from `src/lib/season-pass.ts`, `/pricing` and `public/pricing.md`, with slot lengths from the audit's measured medians (blowout 30, turn-on 60/90/120 by band, inspection 90, repair 120, consult 30, Rachio install 120); Jobber's catalogue is aligned to it once.
14. **Vercel Cron frequency follows the plan**; `vercel.json` is written for Pro.
15. **The season**: `currentSeason(today)` is the calendar year through October, the next year from November.
16. **Feature flags**: `SEASON_PASS_CHECKOUT=on` opens the checkout; `APP_BOOKING=on` swaps the Jobber iframe at `/book` for the app's form. Both go on in production last.
17. **Retirement path** (PRD, IA build order), each a later plan: the Requests inbox for quoted work and the Customers pre-sell first, then the tech's day view with checklists, editable message templates, quotes and invoices for non-pass work, payments for that work. Nothing here blocks them.

---

## Environment variables

Read through `src/lib/env.ts`, lazily. `.env.example` lists them with a comment each and no values.

| Variable | Used by |
|---|---|
| `DATABASE_URL` | Drizzle |
| `ADMIN_DATA_SOURCE` (`fixtures` locally and in Storybook, `live` in Vercel) | `getAdminData` |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_RESEND_KEY` | Auth.js |
| `RESEND_API_KEY` | every email |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS |
| `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `JOBBER_API_VERSION` | OAuth, HMAC, the GraphQL header |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `CRON_SECRET` | `/api/cron/*` |
| `API_KEY_PEPPER` | hashing API keys |
| `GEOCODE_CONTACT` | the Nominatim `User-Agent` |
| `SEASON_PASS_CHECKOUT`, `APP_BOOKING` | the two flags |
| `APP_URL` | links in messages and docs |

Per-account Jobber ids (the pass-id custom field, the tag) are columns on `organization`.

---

## Phase 0: Facts

Estimate: half a day plus the tester account.

### Task 0.1: Confirm the Jobber API facts the plan depends on

**Files:**
- Create: `docs/jobber-api-facts.md`, `src/lib/jobber-api/facts.ts`, `src/lib/jobber-api/facts.test.ts`

**Step 1:** Tester account and GraphiQL in the Developer Center; record the API version date.

**Step 2:** Answer each question with the exact query and response shape under its own heading:

1. `JobCreateAttributes`: does it place a visit on a day with a start time and an assigned user, or is the job created unscheduled and a second mutation schedules it? Introspect with `{ __type(name: "JobCreateAttributes") { inputFields { name type { name kind ofType { name kind } } } } }`.
2. Moving and reassigning a scheduled visit: the mutation and its input (start, end, assigned users).
3. The webhook topics (`WebHookTopicEnum`): visit complete, visit update, job update, client update, invoice create and update, quote create and update.
4. Recording a payment on an invoice: a mutation or nothing.
5. Custom fields on jobs: creating an app-defined field and setting it on `jobCreate`. (The audit found none in use today; the app creates its own.)
6. Client notifications per job: a flag on `jobCreate` or the visit mutation to suppress Jobber's scheduling email and reminders.
7. Cancelling or archiving a job by mutation.
8. Visit order: whether a visit or a user's day exposes the order Jobber's Route Optimization produced (`routingOrder` was null on every property in the audit; look for a field on visits or a route resource). The answer decides Decision 8's stop order.
9. Calendar blocks: how a personal block (not a visit) appears on the API, so capacity can subtract it.
10. The cost extension fields and the rate limit numbers; whether webhooks are subscribed in the UI or by mutation; the `jobberWebUri` shape.

**Step 3:** Encode the answers:

```ts
// src/lib/jobber-api/facts.ts
/** What Task 0.1 confirmed (docs/jobber-api-facts.md). The adapters read these; nothing else asks the question again. Per-account ids are columns on `organization`. */
export const JOBBER_FACTS = {
  scheduleWrite: "edit" as "visit" | "edit",
  moveMutation: "visitEdit",
  invoicePayment: "manual" as "api" | "manual",
  notificationsPerJob: false,
  jobCancelByApi: false,
  /** "api" when the route order can be read back; "app" when the app orders each truck-day itself */
  stopOrder: "app" as "api" | "app",
  /** how a personal calendar block is told apart from a visit in the visits query */
  calendarBlockMarker: "noClient" as "noClient" | "kind",
  topics: { visitComplete: "VISIT_COMPLETE", visitUpdate: "VISIT_UPDATE", jobUpdate: "JOB_UPDATE", clientUpdate: "CLIENT_UPDATE", invoiceCreate: "INVOICE_CREATE", invoiceUpdate: "INVOICE_UPDATE", quoteCreate: "QUOTE_CREATE", quoteUpdate: "QUOTE_UPDATE" },
} as const
```

Replace every placeholder with what GraphiQL showed. **Step 4:** the test pins the topics, the version line and the move mutation to the doc (as in the first draft). **Step 5:** `npm run lint`, `npm test`, `npx tsc --noEmit`. Commit: `Record the Jobber API facts the wiring depends on`

---

## Phase 1: Route groups and root layouts

Estimate: one day.

### Task 1.1: A manifest of the marketing routes and CSS, recorded before anything moves

**Files:** `scripts/route-css-manifest.mjs`, `scripts/route-css-manifest.test.mjs`, `package.json` (`manifest:save`, `manifest:compare`, the test in `test:gate`).

**Step 1: Write the failing test.**

```js
// scripts/route-css-manifest.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { selectorsOf, diffManifests } from "./route-css-manifest.mjs"

test("selectorsOf lists each selector once, sorted", () => {
  const css = ".b{color:red}.a{color:blue}.b:hover{color:green}@media (min-width:768px){.c{display:none}}"
  assert.deepEqual(selectorsOf(css), [".a", ".b", ".b:hover", ".c"])
})
test("diffManifests names routes that came or went and css whose selectors changed", () => {
  const before = { routes: ["/", "/pricing"], css: { "a.css": { bytes: 10, selectors: "h1" } } }
  const after = { routes: ["/", "/about"], css: { "a.css": { bytes: 12, selectors: "h2" } } }
  assert.deepEqual(diffManifests(before, after), ["route missing: /pricing", "route added: /about", "css changed: a.css (selectors h1 -> h2, 10 -> 12 bytes)"])
})
```

**Step 2: The script.** Routes from `.next/server/app-paths-manifest.json` (keys ending `/page` or `/route`, group segments stripped, the app routes skipped by `SKIP = /^\/(admin|account|season-pass\/checkout|developers|api)(\/|$)/`; `/book` is **not** skipped: it is a marketing route that must survive Phase 13 unchanged in path and metadata). CSS from `.next/static/css`, keyed by the file name with its content hash stripped, with `bytes` and a twelve-character hash of the sorted selectors. `--save` writes `.local-data/wiring/manifest.json`; `--compare` prints the differences and exits 1. (The full script is in the first draft of this plan in git history, commit `30dd856`; copy it.)

**Step 3:** test PASS. **Step 4:** scripts. **Step 5:** `npm run build && npm run manifest:save`; confirm `/`, `/pricing`, `/season-pass`, `/book`, `/services/[city]`, the blog and one CSS file. **Step 6:** Commit: `Add the route and CSS manifest that proves the marketing site is unchanged`

### Task 1.2: Move the marketing tree into `src/app/(site)/`

**Files:** move `layout.tsx`, `page.tsx` and every page folder (`about`, `aeration`, `blog`, `book`, `christmas-lights`, `contact`, `first-freeze-dates`, `pricing`, `privacy`, `season-pass`, `services`, `smart-controllers`, `spring-turn-on`, `sprinkler-blowout`, `sprinkler-installation`, `sprinkler-repair`, `terms`, `water-efficiency`, `water-rebates`) under `src/app/(site)/` with `git mv`; create `src/app/(site)/not-found.tsx`; fix the one relative import (`"./globals.css"` → `"../globals.css"`); `scripts/new-service.mjs:205`; `CLAUDE.md` File Structure.

`ls src/app` must show exactly `(account) (admin) (checkout) (site) api apple-icon.png base.css globals.css icon.png manifest.ts sitemap.ts tokens.css`. The gate still sees marketing: `walk.mjs:28` marks a file marketing when `dirs[0] === "app"` and no segment matches `appGroupRe`. There is no `not-found.tsx` today; add one inside the group (a `PageBanner` "Page not found" and a link home) and check `curl -I localhost:3000/nope` is 404 with the chrome; if Next 16 asks for `global-not-found`, use it and say so. Verify: the four commands, `npm run manifest:compare` unchanged, the pages in the browser pane at 1440 and 375. Commit: `Move the marketing pages into the (site) route group`

### Task 1.3: Root layouts for the app groups on one shared stylesheet, and the gate's server rule

**Files:** `src/app/app.css`, `src/app/app-css.test.ts`, `src/lib/fonts.ts`, `src/components/GoogleAnalytics.tsx`, `src/app/(admin)/layout.tsx`, `(checkout)/layout.tsx`, `(account)/layout.tsx`, `(booking)/layout.tsx`; modify `(site)/layout.tsx`, `scripts/check-design.mjs`, `scripts/design-gate/imports.mjs`, `scripts/check-design.test.mjs`, `scripts/design-gate/walk.mjs` (`appGroupRe` gains `booking`), `docs/DESIGN.md`.

**Step 1: Test first.** `app.css` contains `@import "tailwindcss" source(none)`, the tokens and base imports, `@source` for the four groups, `../components/blocks`, `../components/ui`, `../lib/admin`, `../lib/pass`, and never `(site)` or `sections`.

**Step 2: The stylesheet** as in the test. **Step 3:** `src/lib/fonts.ts` (the two `next/font` calls, `fontClassName`) and `src/components/GoogleAnalytics.tsx` (the measurement id and the two `<Script>` tags), both used by the site layout. **Step 4:** the four root layouts: `import "../app.css"`, `fontClassName`, `bg-cream`; admin with `robots: { index: false, follow: false }` and `viewport: { viewportFit: "cover" }`; checkout and booking with `robots` index off and `<GoogleAnalytics />`; account plain. The `(booking)` group is empty until Phase 13 but its layout and `@source` line land now so the manifest and the gate know it.

**Step 5: The gate learns the server boundary.** The marketing flag in `walk.mjs` is `marketing`, not `zone`: pages under `app/(site)` have `zone: null`, and `check-design.mjs:40` skips them before `checkImports`. Add `checkServerImports(file, text, report)` in `imports.mjs`, called from `check-design.mjs` for every file with `marketing === true` before the `if (!zone) continue` line: an import whose path segments contain `db`, `api`, `jobber-api`, `stripe`, `messaging`, `scheduling`, `geocode`, or the pair `pass/server` under `@/lib` or `@/` is `${file}: marketing code imports a server library (${spec})`. Tests: `app/(site)/pricing/page.tsx` importing `@/db` fails; `components/sections/Leak.tsx` importing `@/lib/stripe/client` fails; `app/(admin)/admin/page.tsx` importing `@/db` passes; `app/(site)/season-pass/page.tsx` importing `@/lib/season-pass`, `@/lib/flags` and `@/lib/jobber` passes.

**Step 6:** `npm test -- app-css`, `npm run test:gate`, the four commands, `npm run manifest:compare` unchanged. `docs/DESIGN.md` Three tiers: the stylesheet sentence becomes "Admin, checkout, account and booking screens are served by their own root layouts on `src/app/app.css`, which scans only the app folders; `globals.css` keeps its `@source not` lines so the two bundles never overlap." Commit: `Give the app route groups their own root layouts on app.css`

### Task 1.4: The checkout route renders the prototype behind the flag

**Files:** `src/lib/flags.ts`, `flags.test.ts`, `src/app/(checkout)/season-pass/checkout/page.tsx`.

`checkoutEnabled()` is true only for `SEASON_PASS_CHECKOUT === "on"`; `bookingEnabled()` only for `APP_BOOKING === "on"` (tests for unset, `"true"`, `"on"`). The page: `notFound()` unless enabled, `?zones=` to `initialZones`, render `CheckoutFlow` with the prototype's props; `dynamic = "force-dynamic"`. Verify in the browser at 1440 and 375 with the flag on, 404 with it off; `npm run manifest:compare` unchanged; `.next/static/css` has two files and the marketing one matches the baseline. Commit: `Serve the checkout prototype at /season-pass/checkout behind a flag`

**Phase 1 close:** `npm run test:stories` green. PR for Phase 1 alone; after the deploy, compare five live marketing pages with Task 1.2's screenshots.

---

## Phase 2: The prototype catches up, in Storybook

Estimate: three days, ending with Hannah's approval. `prototype-ia` already did the preference fields, the consent boxes on the card step, the `Consent` type, the October removal, the nav order and the settings types (`git log main..prototype-ia`). What remains is below. Nothing here touches a database.

### Task 2.1: The freeze facts behind the preference wording

**Files:**
- Create: `src/lib/freeze-stats.ts`, `freeze-stats.test.ts`, `src/lib/pass/preferences.ts`, `preferences.test.ts`
- Modify: `src/app/(site)/first-freeze-dates/page.tsx` (use `freeze-stats.ts`), `scripts/freeze-dates.mjs` (add the last spring hard freeze), `checkout-timing.tsx` (the reason lines come from `preferenceWhy`)

Lift `median`, `doy`, `fromDoy` and the per-station median from the freeze page into `src/lib/freeze-stats.ts` (`hardFreezeMedians()` → `{ low, high }` as the page prints them; `lastSpringFreezeMedians()` → the same or null until the script pulls spring). Snapshot the page's two rendered strings in the test so the move cannot drift them. Then add `lastSpringFreeze` (the last day at or below 28°F through June 30) to `scripts/freeze-dates.mjs` and `FreezeYear`, run `npm run freeze-dates`. `src/lib/pass/preferences.ts`: `preferenceRange(kind, preference, season)` (turn-on earlier April 15 to 30, recommended May 1 to 14, later May 15 to 31; blowout earlier October 1 to 7, recommended October 8 to 14, later October 15 to 31), `visitWindow(kind, preference)` (the month-naming strings SeasonLine reads), and `preferenceWhy(kind)`: "We recommend the second week of October because the first hard freeze usually arrives between {low} and {high} near our six towns." and "We recommend early May because the last hard freeze of spring is usually past by {high}." (without the date until the spring pull exists). `checkout-timing.tsx` reads these. Tests for each. `npm run manifest:compare` must still pass (the freeze page's strings are unchanged). Commit: `Compute the preference reasons from the freeze record`

### Task 2.2: The fixture grows trucks' schedules, consents, services and a proposed week

**Files:**
- Modify: `src/lib/admin/types.ts`, `src/lib/admin/fixtures/snapshot.json`, `snapshot.test.ts`, `scripts/anonymise-snapshot.mjs`

Add to `types.ts`: `ScheduledVisit { id; passId?; bookingId?; number?; firstName; town; kind: VisitKind; truckId?; day?; start?; order?; status: "proposed" | "scheduled" | "completed" | "cancelled" | "not-closed"; firm: boolean; exception?: VisitException; lat?; lng?; jobberUrl? }`, `Service { id; key; name; bookable: boolean; band?: { minZones; maxZones }; price: number; extraZonePrice?: number; slotMinutes: number; taxable: false }`, `ApiKey { id; name; prefix; scopes: Scope[]; createdAt; lastUsedAt?; revokedAt? }`, `Scope = "read" | "write:passes" | "write:schedule" | "send:messages" | "admin"`; `AdminData` gains `scheduled: ScheduledVisit[]`, `services: Service[]`, `apiKeys: ApiKey[]`, `consents: Record<clientId, Consent[]>` (the history the Customers panel shows); `Attention.kind` gains `"moved-in-jobber"`, `"push-failed"`, `"not-closed"`. The fixture: the twelve passes' May turn-ons proposed across one week on the two trucks by area, one with an exception; `lat`/`lng` scattered within two kilometres of each town's centre (the fixture has no addresses, so the Schedule map story has pins); eleven bookable services from `src/lib/season-pass.ts` and `/pricing` with the audit's slot medians; two API keys; a consent history of two rows for three clients. Commit: `Grow the fixture with the schedule, services, keys and consent history`

### Task 2.3: The Settings screen in Storybook

**Files:**
- Create: `src/app/(admin)/admin/_screens/SettingsScreen.tsx`, `SettingsScreen.stories.tsx`, `settings-model.ts`, `settings-model.test.ts`
- Create: `src/components/blocks/ChangeLog.tsx` (+ stories, test), `src/components/blocks/ApiKeyList.tsx` (+ stories, test)
- Modify: `docs/DESIGN.md`

Model, test first: `settingsContext`, `truckRows`, `areaRows`, `changeLine(change)` ("Hannah set capacity.blowout from 12 to 14, Nov 12 at 3:04 pm"), `validateCapacity`, `validateWindows`, `validateService`. The screen: `PageHeader` "Settings" and the `tabs` primitive with six tabs: Trucks (grid: name, Jobber user, working days as Mon to Sun chips, visits per day by kind, "Add truck"), Areas (one card per area: towns as chips, the spring and fall town order as two orderable lists), Capacity and windows (buffers, the three season windows, lead time, fall firm days, auto-apply off with its warning line), Services (grid: name, band, price, extra zone, slot minutes, bookable; prices read-only with "Prices live in the website's pricing module"), Messages (SMS on or off, reminder hour, sender name, the template list with enabled switches), API keys (`ApiKeyList`: name, prefix, scopes, last used, Revoke; "Create key" shows the key once in a dialog). `ChangeLog` under the tabs. Props: `onSave(section, values)`, `onCreateKey`, `onRevokeKey`. Stories `Default`, `Phone`, `WithChanges`, `NoDataYet`. Commit: `Add the Settings screen as stories`

### Task 2.4: The Schedule screen with its day map, in Storybook

**Files:**
- Create: `src/app/(admin)/admin/_screens/ScheduleScreen.tsx`, `ScheduleScreen.stories.tsx`, `schedule-model.ts`, `schedule-model.test.ts`
- Create: `src/components/blocks/ScheduleGrid.tsx`, `VisitBlock.tsx`, `DayMap.tsx`, `schedule-grid-math.ts`, `day-map-math.ts`, each with stories and tests
- Modify: `package.json` (`maplibre-gl`), `scripts/design-gate/file-size.mjs` (allowlist nothing; keep each file under 300 lines), `docs/DESIGN.md` (the three blocks; under Charts: area colours are `chart-1` to `chart-4` in area order, hatching means proposed, a corner mark means moved in Jobber, pins are coloured by truck and numbered in stop order)

Grid math, test first: `weekOf`, `cellsFor(visits, trucks, week)`, `loadOf(cell, truck, kind)` ("6 of 10"), `areaTone(index)`. Map math, test first: `pinsFor(visits, day)` → `{ visitId, lat, lng, truckId, order, label }[]`, `hullOf(points)` (a convex hull, Andrew's monotone chain, for each truck's shaded area; a single town falls back to a circle of 1.5 km), `boundsOf(pins)`.

`VisitBlock`: `rounded-lg`, `bg-chart-N/15` with `border-l-4 border-chart-N`, first name, town, visit type, the stop number when ordered; proposed as a `currentColor` hatch on an inner layer (`bg-[image:repeating-linear-gradient(135deg,transparent,transparent_6px,currentColor_6px,currentColor_7px)] text-navy/30`, which passes the colour gate); an exception as an orange corner mark with the note in a tooltip and `aria-describedby`; `not-closed` as a muted outline. Draggable, and a "Move" menu for the keyboard. `ScheduleGrid`: CSS grid, one row per truck, seven day columns, load line per cell, drop targets on working days, the phone variant one day at a time.

`DayMap` (client, `"use client"`, loaded with `next/dynamic` and `ssr: false`): MapLibre GL with the OpenFreeMap style URL (`https://tiles.openfreemap.org/styles/liberty`), the OpenStreetMap attribution control, one pin per visit coloured by truck (the chart tokens read through a `getComputedStyle` lookup of `--color-chart-N` on mount, since MapLibre paints on canvas), numbered in stop order, each truck's hull as a translucent fill, the selected visit highlighted; clicking a pin selects the same visit as its block; `onMove` from a drag in the grid re-renders the pins. The story shows the fixture's scattered pins; the test (jsdom) covers `pinsFor` and `hullOf` only, and the story test asserts the canvas mounts without an axe violation.

`ScheduleScreen`: `PageHeader` "Schedule" with the context line, Previous, Today, Next, "Approve week" and "Approve all" when anything is proposed, filter chips Truck and Area, the grid, a "Day map" toggle under the grid (the map shows the selected day; on a phone the day view and the map stack), the "Moved in Jobber" and "Not closed yet" lists. Props: `data`, `week`, `onApprove`, `onMove`, `onPropose`, `onMarkClosed`. Stories `Default` (a proposed May week), `Approved`, `WithExceptions`, `WithMap`, `Phone`, `NoDataYet`. Commit: `Add the Schedule screen, its grid and its day map as stories`

### Task 2.5: SeasonSetup on Home, the Customers consent panel, the not-closed nudge

**Files:**
- Create: `src/components/blocks/SeasonSetup.tsx` (+ stories, test), `src/components/blocks/ConsentHistory.tsx` (+ stories, test)
- Modify: `HomeScreen.tsx`, `home-model.ts` (+ tests, stories), `CustomersScreen.tsx` (+ stories), `NeedsAttention.tsx`

`seasonSetupFor(settings, today)` returns the window four to six weeks out, or none; `SeasonSetup` is the checklist card (the settings that matter for that window, each with a check or a link to the Settings tab, ending in "Run the proposal"). Home shows it above the two columns, and `NeedsAttention` gets lines for `moved-in-jobber`, `push-failed` and `not-closed` ("Andrea's turn-on on May 5 is not marked done in Jobber"). `CustomersScreen` leaves its placeholder grid and gains a side panel on a row with the current consent as one line and `ConsentHistory` (newest first: "Accepted terms 2026-11 at checkout, marketing email and text, Nov 12"; "Stopped texts by reply, Nov 20"). Commit: `Add the season setup card, the consent panel and the not-closed nudge`

### Task 2.6: Hannah approves in Storybook

No code. Hannah reviews `Screens/Checkout` (timing and consent, still "awaiting" on `prototype-ia`), `Screens/PassPage`, `Screens/Settings`, `Screens/Schedule` (with the map), `Blocks/SeasonSetup`, `Blocks/ConsentHistory`, `Blocks/ChangeLog`, `Blocks/ApiKeyList`. A row per screen in the Approvals table; a change request becomes a task appended here. Nothing from Phase 7 on is wired until every row reads approved. Commit: `Hannah approved the Settings, Schedule, consent and season setup screens`

**Phase 2 close:** `npm run test:stories`, `npm run check:design`, `npm run manifest:compare`.

---

## Phase 3: Data

Estimate: two and a half days.

### Task 3.1: Install, env, the database handle and a test database

**Files:** `package.json`, `vitest.config.mts` (the alias block at line 9), `src/lib/env.ts` (+ test), `.env.example`, `drizzle.config.ts`, `src/db/index.ts`, `src/db/test-db.ts`, `src/db/types.ts`, `src/test/server-only.ts`.

`npm i drizzle-orm @neondatabase/serverless dotenv zod` and `npm i -D drizzle-kit @electric-sql/pglite tsx`. `readEnv([...])` throws `X is not set` and is called inside functions only. `db()` creates the Neon handle on first use; `testDb()` is PGlite with the migrations applied; `Database = ReturnType<typeof db> | TestDb` and every library function takes one first. The `server-only` alias in `vitest.config.mts` points at `src/test/server-only.ts` (`export {}`). Scripts `db:generate`, `db:migrate`, `db:studio`, `db:seed`. Commit: `Add Drizzle, the env reader and an in-memory test database`

### Task 3.2: The schema and the first migration

**Files:** `src/db/schema.ts`, `schema.test.ts`, `drizzle/0000_*.sql`.

Test first (PGlite): a pass for an unknown organization is refused; pass numbers unique per organization; `queue_item` unique on `(kind, key)`; `pass_visit` unique on `(pass_id, kind)`; a `consent` row cannot be updated (a trigger raises; the test asserts the rejection); `api_key` hash unique.

Enums named after the screen types: `town`, `admin_role`, `pass_status` (pending, active, cancelled, lapsed), `visit_kind` (turn-on, inspection, blowout, repair, install, consult, rachio-install, aeration, lights, other), `visit_status` (unscheduled, proposed, scheduled, completed, cancelled, not-closed), `timing_preference`, `charge_status`, `quote_status`, `invoice_status`, `queue_kind` (jobber-webhook, stripe-webhook, twilio-inbound, pass-onboard, booking-onboard, visit-push, pass-charge, pass-cancel, message, renewal-email, schedule-run, outbound-webhook, geocode), `message_channel`, `message_status`, `consent_source` (checkout, booking, admin, reply), `principal_kind` (person, api-key).

Tables, each with `organization_id` and timestamps:

- `organization`: `id`, `name`, `jobber_account_id`, `jobber_pass_field_id`, `jobber_pass_tag`, `settings jsonb` typed `OrganizationSettings` minus trucks and areas, `terms_version`.
- `settings_change`: `by_email`, `field`, `from`, `to`, `at`.
- `admin_user`: `email` unique, `name`, `initials`, `role`.
- `truck`: `name`, `jobber_user_id`, `working_days jsonb`, `capacity_by_kind jsonb`, `active`.
- `area`: `name`, `towns jsonb`, `spring_order`, `fall_order`.
- `service`: `key` unique per organization, `name`, `kind`, `bookable`, `min_zones`, `max_zones`, `price`, `extra_zone_price`, `slot_minutes`, `quote_only` (installs and large repairs), `jobber_product_id`.
- `customer`: `first_name`, `last_name`, `email`, `phone`, `lead_source`, `jobber_client_id`, `stripe_customer_id`; index on `email` and `phone`.
- `property`: `customer_id`, `address`, `town`, `lat`, `lng`, `geocoded_at`, `jobber_property_id`; the geocode cache.
- `consent`: `customer_id`, `terms_version`, `terms_accepted_at`, `marketing_opt_in`, `marketing_channels jsonb`, `source`, `recorded_at`, `note`; append-only (a `BEFORE UPDATE` trigger raises; deletes are not granted to the app role).
- `season_pass`: `number`, `season`, `customer_id`, `property_id`, `zones`, `turn_on_preference`, `blowout_preference`, `status`, `stripe_payment_method_id`, `card_brand`, `card_last4`, `card_expires`, `renewed_from_id`, `renewal_asked_at`, `cancelled_at`; unique `(organization_id, number)`, index `(organization_id, season)`.
- `visit`: the one table for pass visits and booked visits: `pass_id` or `booking_id` (one set), `customer_id`, `property_id`, `service_id`, `kind`, `window`, `amount`, `status`, `preference`, `truck_id`, `proposed_on`, `proposed_truck_id`, `scheduled_on`, `start_time`, `duration_minutes`, `stop_order`, `firm`, `exception jsonb`, `jobber_job_id`, `jobber_visit_id`, `jobber_job_url`, `jobber_invoice_id`, `pushed_at`, `completed_on`, `charged_at`, `stripe_payment_intent_id`; unique `(pass_id, kind)` where `pass_id` is not null; index `(organization_id, scheduled_on)`, `jobber_visit_id`.
- `booking`: `customer_id`, `property_id`, `zones_band`, `access_confirmed`, `notes`, `source` (web, admin), `status` (booked, cancelled), `jobber_request_id`; the visit it made is the `visit` row with `booking_id`.
- `quote_request`: for installs and large repairs from the booking form: `customer_id`, `property_id`, `service_id`, `notes`, `status` (new, quoted, archived), `jobber_request_id`.
- `charge`: `pass_id?`, `visit_id`, `attempt`, `amount`, `status`, `stripe_payment_intent_id` unique, `failure_message`, `receipt_url`; unique `(visit_id, attempt)`.
- `schedule_run`: `season`, `window`, `proposed_at`, `approved_at`, `approved_by`, `mode`, `counts jsonb`.
- `message_log`: `customer_id`, `visit_id?`, `channel`, `kind`, `key`, `to`, `subject`, `body`, `status`, `provider_id`, `error`, `sent_at`; unique `(kind, customer_id, key)`.
- `api_key`: `name`, `prefix` (the first eight characters, shown in Settings), `hash` (SHA-256 of the key with `API_KEY_PEPPER`), `scopes jsonb`, `created_by`, `last_used_at`, `revoked_at`.
- `api_call`: `principal_kind`, `principal_id`, `method`, `path`, `status`, `duration_ms`, `idempotency_key`, `at`; index `(organization_id, at)`.
- `idempotency`: `key`, `principal_id`, `request_hash`, `response jsonb`, `at`; unique `(organization_id, key)`.
- `webhook_endpoint`: `url`, `secret`, `events jsonb`, `active`; `outbound_event`: `endpoint_id`, `event`, `payload jsonb`, `attempts`, `delivered_at`, `error`.
- `jobber_token`, `sync_run`, `queue_item` (with `claimed_at`), and the read-only mirror `jobber_client`, `jobber_job`, `jobber_visit` (with `is_block` for personal calendar blocks and `assigned_user_id`), `jobber_quote`, `jobber_invoice`.
- Auth.js: `auth_user`, `auth_account`, `auth_session`, `auth_verification_token`.

`npm run db:generate`, commit `drizzle/`, `npm test -- schema`, migrate the Neon development branch; create the `production` branch now and leave it empty. Commit: `Add the schema and the first migration`

### Task 3.3: Seed, with the fixture passes optional, and the pass number

**Files:** `src/lib/pass/number.ts` (+ test), `src/db/seed.ts` (+ test), `scripts/db-seed.ts`.

`nextPassNumber(season, existing)`. `seed(db, snapshot, { organizationId, admins, passes, mirror })` inserts the organization, admins, trucks, areas, settings and services always; the fixture passes, customers, properties, consents and visits only with `passes: true`; the mirror only with `mirror: true`; idempotent. The script builds its own handle (no `server-only`), reads `SEED_ADMINS` and `SEED_FIXTURE_PASSES=yes`. Commit: `Seed the database from the fixture and number passes per season`

### Task 3.4: Services from the site's pricing, and the Jobber catalogue aligned to it

**Files:** `src/lib/services.ts` (+ test), `src/db/seed.ts` (the services come from here), `scripts/jobber-align-catalogue.ts`, `docs/jobber-api-facts.md` (a section listing what was changed in Jobber)

`SERVICES` in `src/lib/services.ts` (a marketing-importable module, no secrets): the eleven bookable services and the quote-only ones, prices from `SEASON_PASS_VISITS`, `visitPrice` and the `/pricing` constants (one import, never a copied number; the test asserts `SERVICES.blowout.price === visitPrice(SEASON_PASS_VISITS[2], 6)`), bands with the site's +$10 per zone everywhere, slot minutes from the audit (blowout 30, turn-on 60 up to 8 zones, 90 to 12, 120 above, inspection 90, repair 120, consult 30, Rachio install 120, aeration 60, lights 120), `quoteOnly` for installation and large repair. The alignment script, run once by Hannah with the OAuth token: sets each Jobber catalogue item's price and text to the site's, deletes nothing, renames "Complete Plan" to "Season Pass (sold online)" and marks it not bookable, and prints what it changed; the facts doc records the run. Commit: `Seed services from the site's pricing and align the Jobber catalogue to it`

**Phase 3 close:** `npm run test:stories`.

---

## Phase 4: Sign-in and API keys

Estimate: two days.

### Task 4.1: Auth.js with the Resend provider and the allow-list

**Files:** `package.json` (`next-auth@beta`, `@auth/drizzle-adapter`), `src/auth.ts`, `src/lib/auth/allow.ts` (+ test), `src/app/api/auth/[...nextauth]/route.ts`, stubs `src/emails/sign-in.ts` and `src/lib/messaging/resend.ts` (replaced in Phase 12).

`classify(email, admins, customers)` → admin with role, customer, or null. `NextAuth(() => ({ … }))` as a function so the adapter is built per request; `session.strategy = "jwt"`; the Resend provider with `maxAge: 600` and `sendVerificationRequest` through `sendEmailNow`; `signIn`, `jwt` and `session` callbacks carrying `principal`. If `next-auth@beta` will not install against Next 16, the hand-rolled fallback from the earlier draft applies behind the same guard functions. Commit: `Add Auth.js with the Resend magic link and the email allow-list`

### Task 4.2: The proxy gate, the per-page guard, `server-only` on `getAdminData`

**Files:** `src/proxy.ts` (+ test), `src/lib/auth/guard.ts` (+ test), `src/lib/admin/data.ts` (+ test), `src/lib/admin/live.ts` (a stub that throws until Task 6.7), `src/lib/admin/__mocks__/data.ts`.

`gateFor(pathname, principal)`: `/admin/*` needs an admin (the sign-in page passes), `/account/*` any principal, everything else passes; the proxy wraps `auth()`, redirects, and sets `x-pathname` on the request; matcher `["/admin/:path*", "/account/:path*"]`. `requireAdmin(minRole)` and `requireCustomer()` read `auth()` and `redirect()`. `getAdminData` gets `import "server-only"` and the `live` branch imports `./live`. Commit: `Gate /admin and /account in the proxy and on every page, and make getAdminData server-only`

### Task 4.3: API keys: create, hash, check, scope, log

**Files:** `src/lib/auth/api-key.ts` (+ test), `src/lib/auth/principal.ts` (+ test)

`createApiKey(db, org, byEmail, { name, scopes })` → the key once (`th_live_` plus 32 random base62 characters), stores `prefix` and the peppered hash; `checkApiKey(db, raw)` → the principal `{ kind: "api-key", id, organizationId, scopes }` or null (revoked or unknown), touching `last_used_at`; `revokeApiKey`. `principalFromRequest(db, request)` → a person from the session cookie, a key from `Authorization: Bearer th_live_…`, or null. `hasScope(principal, scope)`: a person's role maps to scopes (owner and manager: all; tech: `read`); a key has what it was given; `admin` is never grantable to a key except by an owner, and the Settings UI says so. Tests: a created key checks; a revoked one does not; the hash never stores the key; a tech has `read` only. Commit: `Add API keys with scopes`

### Task 4.4: Sign-in pages and the sign-in email

**Files:** `src/components/blocks/SignInCard.tsx` (+ stories, test), `src/app/(admin)/admin/sign-in/page.tsx`, `src/app/(account)/account/sign-in/page.tsx`, `sent/page.tsx`, `src/emails/sign-in.ts` (+ test, replacing the stub).

The block (badge logo, the title in the display face, one email input, one button, an error line) with `Admin`, `Customer`, `Sent`, `Denied`, `Phone` stories, approved by Hannah before the pages; the pages with inline server actions calling `signIn("resend", …)`, `?email=` prefill, the Denied line on `?error=AccessDenied`; the email with "It works once and for ten minutes." Verify: `/admin` redirects, the seeded address gets the email, a stranger sees Denied. Commit: `Add the sign-in pages and the sign-in email`

**Phase 4 close:** `npm run test:stories`; the gate lists `SignInCard` with its story.

---

## Phase 5: The API, before any screen is wired to data

Estimate: three days. Every later phase adds its handlers here and nowhere else.

### Task 5.1: The handler shape, the context, the in-process caller and the call log

**Files:**
- Create: `src/api/core/context.ts` (+ test), `src/api/core/handler.ts` (+ test), `src/api/core/errors.ts`, `src/api/core/call.ts` (+ test), `src/api/core/route.ts` (+ test), `src/api/core/pagination.ts` (+ test), `src/api/core/idempotency.ts` (+ test)

```ts
// src/api/core/handler.ts
import type { z } from "zod"
import type { Ctx } from "./context"

export interface Handler<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  /** "passes.list", the name the OpenAPI operation, the MCP tool and the call log share */
  name: string
  method: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  scope: Scope
  input: I
  output: O
  summary: string
  run: (ctx: Ctx, input: z.infer<I>) => Promise<z.infer<O>>
}
export const defineHandler = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(h: Handler<I, O>) => h
```

`Ctx` is `{ db, organizationId, principal, now, requestId }`. `callApi(ctx, handler, input)` (test first): checks `hasScope`, parses `input` with the Zod schema (an `ApiError("invalid", issues)` on failure), runs, parses the output (so a handler can never leak a field the schema does not name), writes one `api_call` row, and returns the output. `route(handler)` (test first) builds a Next route function: reads the principal with `principalFromRequest`, merges path params, query and JSON body into `input`, applies `Idempotency-Key` for `POST` and `PATCH` (`idempotency.ts`: the same key with the same request hash returns the stored response; a different hash is a 409), calls `callApi`, maps `ApiError` to the one error shape `{ error: { code, message, issues? } }` with 400, 401, 403, 404, 409 or 422, and sets `X-Request-Id`. `pagination.ts`: `cursorPage(rows, limit, cursorOf)` and the `{ data, next_cursor }` envelope (test: a page of two, the cursor, the last page with `next_cursor: null`). Rate limit: a per-principal token bucket in `api_call` counts (120 requests a minute for a key, stated in the docs; the test covers the count). Commit: `Add the API handler shape, context, caller and route wrapper`

### Task 5.2: The resources

**Files:** one folder per resource under `src/api/v1/`, each with `schemas.ts`, `handlers.ts`, `handlers.test.ts`, and the thin route files under `src/app/api/v1/…/route.ts`.

Resources and operations (the names are the OpenAPI operation ids and the MCP tools):

- `customers`: `customers.list` (search by name, email, phone; cursor), `customers.get`, `customers.create`, `customers.update`; sub-resource `customers.consents.list`, `customers.consents.record` (append).
- `passes`: `passes.list` (filters: season, status, town, preference), `passes.get` (with visits, charges, consent), `passes.create` (the checkout's pending pass), `passes.activate` (after the card), `passes.cancel`, `passes.resendConfirmation`, `passes.sendCardUpdateLink`.
- `visits`: `visits.list` (by day range, truck, status, kind), `visits.get`, `visits.move` (truck and day, with the hard rules), `visits.markClosed` (the explicit done when Jobber's signal never came, admin only), `visits.stretch` (change the duration after booking, the audit's "stretch a visit").
- `schedule`: `schedule.propose` (window), `schedule.approve` (scope), `schedule.week` (the grid's data for a week), `schedule.day` (the map's pins and order for a day), `schedule.slots` (open slots for a service, zones band and town, the booking form's read).
- `bookings`: `bookings.create` (service, slot, customer, property, consent; the booking form's write), `bookings.cancel`; `quoteRequests.create`, `quoteRequests.list`.
- `trucks`, `areas`, `services`: list, create, update, deactivate.
- `settings`: `settings.get`, `settings.update` (one section at a time; writes the change log), `settings.changes.list`.
- `messages`: `messages.list` (by customer or visit), `messages.send` (a kind and a customer; respects consent).
- `apiKeys`: list, create (returns the key once), revoke; `webhooks`: `webhooks.list`, `webhooks.create` (url, events; returns the secret once), `webhooks.delete`, `webhooks.test`.
- `organization`: `organization.get` (name, settings summary, Jobber connection state).

Each handler's test runs through `callApi` on `testDb()`: the scope is enforced (a `read` key cannot call `passes.cancel`), the input schema rejects a bad town, the output never carries `stripe_payment_method_id` or an email on a list a `read` key can see (customers' emails are visible only with `write:passes` or a person), and the behaviour the later phase will lean on (`passes.create` makes three visits with the right amounts). Handlers whose behaviour depends on a later phase (`schedule.propose`, `messages.send`, `bookings.create`) land now with their schemas and a `not implemented` run that the later task replaces, so the OpenAPI document is complete from this phase. Commit: `Add the v1 resources`

### Task 5.3: Outbound webhooks

**Files:** `src/api/v1/webhooks/deliver.ts` (+ test), the `outbound-webhook` queue handler.

`emitEvent(db, org, event, payload)` (events: `pass.bought`, `visit.scheduled`, `visit.moved`, `visit.done`, `charge.succeeded`, `charge.failed`, `booking.created`, `request.received`) inserts one `outbound_event` per active endpoint subscribed to it and queues delivery; the handler POSTs JSON with `X-Trailhead-Signature` (base64 HMAC-SHA256 of the body with the endpoint's secret, the same scheme Jobber uses) and `X-Trailhead-Event`, retries with the queue's backoff, records `delivered_at` or the error. Tests: the signature verifies with the secret; an endpoint not subscribed gets nothing; a 500 is retried. Later phases call `emitEvent` at the named moments. Commit: `Deliver signed outbound webhooks`

### Task 5.4: OpenAPI, `/developers` and `/api/mcp`

**Files:** `src/api/openapi.ts` (+ test), `src/app/api/v1/openapi.json/route.ts`, `src/app/(admin)/developers/page.tsx` (public, outside the shell and the proxy matcher), `src/components/blocks/ApiDocs.tsx` (+ stories, test), `src/app/api/mcp/route.ts`, `src/api/mcp.ts` (+ test), `public/llms.txt`

`npm i zod-openapi @modelcontextprotocol/sdk`. `openapiDocument()` walks every registered handler (a registry array in `src/api/v1/index.ts`) and emits OpenAPI 3.1 with the Zod schemas, the operation ids, the scope as a security requirement, the error shape, the pagination envelope, the idempotency header, the rate limit and the versioning note ("v1 is stable; breaking changes get v2"); the test asserts every handler has a path and a summary and that the document validates. `/developers` renders `ApiDocs` (the document grouped by resource, each operation with its method, path, scope, input and output as a readable list, a `curl` example, and the MCP connection line), no marketing chrome, indexable. `/api/mcp`: the SDK's streamable HTTP transport; each handler becomes a tool named by its operation id with its input schema, authenticated by the same bearer key and the same scopes, running through `callApi` so every tool call is logged like any other. The test lists the tools and calls `passes.list` through the transport in process. `public/llms.txt` gets two lines: the docs URL and the MCP endpoint, with "connect with an API key from Settings". Commit: `Describe the API with OpenAPI, serve the docs and expose it as MCP tools`

### Task 5.5: Screens and actions call the API in process

**Files:** `src/lib/admin/api-ctx.ts` (+ test)

`ctxFromSession()` builds a `Ctx` from `auth()` (the person principal, the organization) for server components and actions; `ctxForJob(org)` for queue handlers and crons (a system principal with every scope, logged as such). From here on every page reads through `callApi(ctx, handler, input)` and every action writes through it; `getAdminData("live")` (Task 6.7) is itself composed from the list handlers so the dashboard and the API can never disagree. Commit: `Give pages and actions an in-process API context`

**Phase 5 close:** `npm run test:stories`; `curl` with a created key against the preview deployment: `GET /api/v1/passes` returns the envelope, `POST /api/v1/passes/x/cancel` with a `read` key is 403, the OpenAPI document opens in `/developers`, and Claude connected to `/api/mcp` with the key lists the tools.

---

## Phase 6: Jobber as the field display, geocoding, live data

Estimate: three and a half days.

### Task 6.1: OAuth: connect, callback, token refresh

**Files:** `src/lib/jobber-api/oauth.ts` (+ test), `src/app/api/jobber/connect/route.ts`, `callback/route.ts`.

As in the earlier draft: `authorizeUrl`, `exchangeCode`, `refresh`, the signed `state`, the token upsert (always store the refresh token that comes back), `organization.jobber_account_id` from `{ account { id } }`. Connect requires an owner. Commit: `Connect Jobber by OAuth and keep the token fresh`

### Task 6.2: The GraphQL client with the cost budget, and ids

**Files:** `src/lib/jobber-api/client.ts` (+ test), `ids.ts` (+ test).

`jobberQuery(db, org, document, variables)` with the bearer, the version header, the throttle wait from `extensions.cost`, one retry on `THROTTLED`; `decodeGid`, `webUrl`. Commit: `Add the Jobber GraphQL client with the cost budget`

### Task 6.3: The push adapter: client, property, job, scheduled visit, move, cancel, order

**Files:** `src/lib/jobber-api/push.ts` (+ test)

With a fake `query`: `findOrCreateClient` (search by email, else `clientCreate` with the customer's own email and phone so Jobber's reminders, if on, reach the same person, and `propertyCreate` with `"<address>, <Town>, CO"`); `createJob({ visit, service, pass? })` (unscheduled, title `Season Pass turn-on, early May preference, 8 zones, TH-2027-0001` or `Fall blowout, 8 zones, booked online`, the custom field with the pass id when there is one, the tag, instructions "Season Pass visit. Do not collect payment; the card on file is charged after completion." for pass visits, the notification flag off when `notificationsPerJob`); `scheduleVisit({ jobId, day, startTime, durationMinutes, truck })` and `moveVisit` through `moveMutation`, assigned to `truck.jobberUserId`; `cancelJob` (the mutation or a note plus a line to Ryan); `readDayOrder(userId, day)` when `stopOrder === "api"`. Commit: `Add the Jobber push adapter`

### Task 6.4: The mirror sync for non-pass work and calendar blocks

**Files:** `src/lib/jobber-api/queries.ts`, `map.ts` (+ test), `sync.ts` (+ test), `src/app/api/cron/jobber-sync/route.ts`, `vercel.json`, `scripts/anonymise-snapshot.mjs` (imports the pure mappers)

The mappers move out of the anonymiser; `is_block` is set by `calendarBlockMarker`; `assigned_user_id` is kept so capacity can subtract a block from the right truck. `runSync` pulls since the last finished run and never writes a `visit` row. The cron route and `vercel.json` (Pro schedules; the Hobby note). Commit: `Mirror non-pass work and calendar blocks from Jobber on a schedule`

### Task 6.5: The queue with a claim step, the Jobber webhook, the two signals, the not-closed check

**Files:** `src/lib/queue/index.ts` (+ test), `handlers.ts` (+ test), `src/lib/jobber-api/webhook.ts` (+ test), `signals.ts` (+ test), `src/app/api/webhooks/jobber/route.ts`, `src/app/api/cron/drain/route.ts`, `src/lib/scheduling/server/not-closed.ts` (+ test)

The queue as in the earlier draft (claim with `FOR UPDATE SKIP LOCKED`; concurrent-drain test). The webhook route verifies the HMAC, enqueues on `${topic}:${itemId}:${occurredAt}` for the organization matching `accountId`, `after(drainAll)`. `handleJobberSignal`: `visitComplete` on a `visit` row → `completed_on`, `status = completed`, `pass-charge` for a pass visit, `emitEvent("visit.done")`, the booked visit's receipt message; `visitUpdate` with a different day or user → adopt, `exception`, `date-moved` message, `emitEvent("visit.moved")`; the app's own echo is silent; non-pass topics refresh the mirror. `notClosedCheck(db, org, now)` (run by the drain cron once a day): every `scheduled` visit whose day is before today with no completion becomes `not-closed`, an attention row and a line in the crew summary; never a charge. Commit: `Receive Jobber webhooks into a claimed queue, read back the two signals and flag unclosed visits`

### Task 6.6: Geocoding

**Files:** `src/lib/geocode/index.ts` (+ test), `src/lib/geocode/nominatim.ts` (+ test), the `geocode` queue handler

`geocodeProperty(db, propertyId)`: if `lat` is set, done; else one GET to `https://nominatim.openstreetmap.org/search?format=jsonv2&q=<address, town, CO, USA>&limit=1` with `User-Agent: trailheadirrigation.com (<GEOCODE_CONTACT>)`, store `lat`, `lng`, `geocoded_at`; no result stores `geocoded_at` and a null pair (the map draws such a visit at the town centre with a hollow pin). The queue handler enforces one request per second across the drain (`run_after` spaced by the enqueue). Called when a property is created by the checkout, the booking form or the mirror sync (the mirror's non-pass visits get pins too, so the map shows the whole day). Tests with a stubbed fetch: the query string, the header, the cache hit. Commit: `Geocode each property once with Nominatim`

### Task 6.7: `getAdminData("live")`, composed from the list handlers

**Files:** `src/lib/admin/live.ts` (replace the stub, + test), `src/lib/pass/server/screen.ts`, `src/lib/admin/shape.ts`

`getLiveAdminData(ctx, now)` calls `customers.list`, `visits.list` (seven days back, thirty ahead, pass and booked visits from `visit` plus non-pass from the mirror), `passes.list`, `schedule.week`, `trucks.list`, `areas.list`, `services.list`, `settings.get`, `settings.changes.list`, `apiKeys.list`, the mirror's quotes and invoices, and builds `monthTotals` and `attention` (failed charges, queue items with an error, exceptions in the last 14 days, not-closed visits, cards expiring before October) and `consents`. The test seeds `testDb()` and runs the shape assertions from `shape.ts`. `data.ts`'s live branch calls it with `ctxFromSession()`. Commit: `Read admin data through the API`

**Phase 6 close:** `npm run test:stories`; on the tester account, a hand-made pass job completed in Jobber lands as `completed_on`; a property geocodes within a minute.

---

## Phase 7: Stripe

Estimate: two days.

### Task 7.1: The Stripe client, customers and the setup-mode session

**Files:** `package.json` (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`), `src/lib/stripe/client.ts`, `checkout.ts` (+ test)

`createSetupSession(stripe, { passId, customerId?, email, name, origin, expiresAt })` (`mode: "setup"`, `ui_mode: "embedded"`, `redirect_on_completion: "never"`, `expires_at` 30 minutes); `paymentMethodFromSession`. Commit: `Add the Stripe client and the setup-mode Checkout Session`

### Task 7.2: Marking the Jobber invoice paid, behind the adapter

**Files:** `src/lib/jobber-api/invoice-paid.ts` (+ test), `signals.ts` (the `invoiceCreate` branch)

`markInvoicePaid` with the `api` or `manual` path from the facts; the `invoiceCreate` signal on a charged visit calls it. Commit: `Mark the Jobber invoice paid after a charge`

### Task 7.3: Charging a visit off-session, the receipt, the failure, the card update

**Files:** `src/lib/stripe/charge.ts` (+ test), `card-update.ts` (+ test), `src/lib/pass/server/charge-visit.ts` (+ test), `src/app/(account)/account/pass/card-updated/page.tsx`, the `pass-charge` handler

The idempotency key is `visit-${visitId}-${attempt}`, so a retry after a card update is a new attempt. `chargeVisit`: done when charged; a cancelled pass charges nothing and alerts; attempt n+1; success writes the charge, `charged_at`, queues the `receipt` message (naming the next visit and its preference words), calls `markInvoicePaid`, `emitEvent("charge.succeeded")`; failure writes `failed`, queues `card-failed` and the admin alert, `emitEvent("charge.failed")`, no retry until the card changes. `createCardUpdateSession` (hosted, `purpose: "card-update"`) and `applyCardUpdate` (store, set default, detach old, one retry for a failed visit, idempotent on the session). Commit: `Charge the saved card after a completed pass visit, with the receipt, the failure message and the card update`

### Task 7.4: The Stripe webhook

**Files:** `src/lib/stripe/webhook.ts` (+ test), `src/app/api/webhooks/stripe/route.ts`

`checkout.session.completed` → `applyCardUpdate` or `passes.activate`; `payment_intent.*` reconcile; `payment_method.detached` → clear and queue `card-expiring`. The route verifies, enqueues on `event.id`, `after(drainAll)`. Commit: `Receive Stripe webhooks into the queue`

**Phase 7 close:** `npm run test:stories`.

---

## Phase 8: The checkout, wired

Estimate: two days.

### Task 8.1: The season, the pending pass and consent

**Files:** `src/lib/pass/season.ts` (+ test), `src/api/v1/passes/handlers.ts` (`passes.create` and `passes.activate` replace their stubs, + tests), `src/lib/pass/server/create.ts` (+ test), `src/app/api/cron/drain/route.ts` (`expirePendingPasses` first)

`currentSeason`. `passes.create(ctx, fields)`: validates with the reducer's `canContinue` for every step before the card (one rule for client and server); reuses a `pending` pass for the same email when `passId` is given (a customer who goes back holds one pending pass); otherwise creates or matches the `customer` by email and phone, the `property` by address, inserts `season_pass` `pending` with the number and both preferences, the three `visit` rows (`amount` from `visitPrice`, `window` from `visitWindow`, `preference`), queues `geocode`, and refuses at three pending passes per email per hour (`too-many`). `passes.activate(ctx, { passId, sessionId })`: idempotent; reads the payment method from the session; appends the `consent` row (terms version from `organization.terms_version`, `source: checkout`, `marketing_opt_in` from the card step's box with `channels: ["email", "sms"]` when ticked, `sms` only with a phone); sets `active`; queues `pass-onboard` and the purchase confirmation (email, and SMS when the marketing box or the phone's transactional consent allows the transactional text); `emitEvent("pass.bought")`. `expirePendingPasses` after 60 minutes (the Stripe session expires at 30). Tests on `testDb()` through `callApi`. Commit: `Create, activate and expire the pass through the API, recording consent`

### Task 8.2: Server actions, the embedded card step, the real pass on the done step, save as image

**Files:** `src/app/(checkout)/season-pass/checkout/actions.ts` (+ test), `checkout-state.ts`, `checkout-steps.tsx`, `CheckoutFlow.tsx` (+ tests, stories), `StripeCard.tsx`, `src/lib/pass-card-image.ts`, `page.tsx`, `package.json` (`html-to-image` to dependencies)

`beginCheckout(fields, passId?)` → `passes.create` through `callApi` with an anonymous customer principal (a principal kind `public` with the `checkout` scope, allowed only on `passes.create`, `passes.activate` for its own pass id, `schedule.slots` and `bookings.create`), then `createSetupSession`; `finishCheckout(passId, sessionId)` → `passes.activate` and `after(drainAll)`. The reducer gains `passId`, `sessionId`, `clientSecret`, `pass`, a `failed` action; `CardStep` mounts `StripeCard` (`EmbeddedCheckoutProvider`, `onComplete`) with a placeholder injected in stories; the done step shows the real pass; `onSaveImage` saves the PNG (closing the known gap). Hannah approves the `Card` story once. Verify in the browser with `4242…` and `stripe listen`. Commit: `Wire the checkout to Stripe's embedded card form and the pass`

### Task 8.3: Onboarding into Jobber, and the alert on first failure

**Files:** `src/lib/pass/server/onboard.ts` (+ test), the `pass-onboard` handler

`findOrCreateClient`, then one unscheduled job per visit with the preference in the title, storing the job ids as it goes; the admin alert "New Season Pass: Andrea, Erie, 8 zones" with the links at the end; on a thrown error, the alert "Jobber jobs for pass TH-2027-0007 were not created; retrying" once (key: the pass id), then rethrow. Commit: `Create the Jobber client, property and three jobs for a new pass`

### Task 8.4: The GA4 event and the calculator's button

**Files:** `src/lib/analytics.ts` (+ test), `src/components/ConversionTracking.tsx`, `checkout-steps.tsx`, `src/components/sections/SeasonPassCalculator.tsx`, `src/app/(site)/season-pass/page.tsx`, `CLAUDE.md`

`fireEvent` shared; `season_pass_purchase` once from the done step; the calculator appends `?zones=`; the page picks the href from `checkoutEnabled()`. `npm run manifest:compare` passes. Commit: `Fire season_pass_purchase and send the calculator to the checkout when the flag is on`

**Phase 8 close:** `npm run test:stories`; a full test purchase to the three Jobber jobs, screenshotted into `.local-data/wiring/checkout/`.

---

## Phase 9: The customer pass page

Estimate: one day.

### Task 9.1: The route, cancel, card update, the dates from the scheduler

**Files:** `src/app/(account)/account/pass/page.tsx`, `actions.ts`, `src/api/v1/passes/handlers.ts` (`passes.cancel` replaces its stub), `src/lib/pass/server/cancel.ts` (+ test), `PassPageScreen.tsx`, `CancelPassDialog.tsx`, the `pass-cancel` handler

`passForEmail` through `passes.list` with the customer principal; the visit rows carry `scheduledAt` from `scheduled_on` and the truck's name, so the page reads "Booked, Tuesday, May 5" the moment the approval or an exception lands. `passes.cancel`: the email must own the pass unless the principal is an admin; `cancelled`, unstarted visits `cancelled`, `pass-cancel` (cancel the Jobber jobs), the `cancelled` message, the admin alert. `startCardUpdate` redirects to the hosted session. The lapsed branch is already on `prototype-ia`. Commit: `Serve the customer pass page with cancel and card update`

---

## Phase 10: The scheduler

Estimate: five days for the proposal, approval, push, order and nudges (10.1 to 10.5); one more for auto-apply (10.6). The risk paragraph in the header applies to every task.

### Task 10.1: Settings on the organization, with the change log

**Files:** `src/lib/settings/defaults.ts` (+ test), `src/api/v1/settings/handlers.ts` (replace the stubs, + tests), `src/api/v1/trucks`, `areas`, `services` (the writes)

`DEFAULT_SETTINGS` from the brief and the audit (capacity per truck-day turn-on 8, inspection 6, blowout 14, repair 4, marked "not confirmed" until saved once; buffers 25 and 15 percent, first weeks 2; windows turn-on April 15 to May 31, inspection July 1 to 31, blowout October 1 to November 15; lead time 4 weeks; fall firm days 6; the fall town order Firestone, Erie, Longmont, Broomfield, Louisville, Lafayette and spring the reverse; messages SMS off, reminder hour 17; scheduler mode `approve`). `settings.update` validates (the Task 2.3 validators) and writes one `settings_change` per changed leaf. Commit: `Store the organization settings with a change log`

### Task 10.2: Slots and the proposal, pure functions with the hard rules tested one by one

**Files:** `src/lib/scheduling/calendar.ts` (+ test), `slots.ts` (+ test), `propose.ts` (+ test)

`calendar.ts`: `workingDays(truck, from, to)`, `isInWindow`, `capacityFor(truck, kind, day, settings, windowStart)` (visits per day minus the buffer, in visits and in minutes), `townOrder(areas, season)`, `blocksOn(mirrorVisits, truck, day)` (personal calendar blocks subtract their minutes).

`slots.ts` (what the booking form reads and what the proposal walks): `openSlots({ service, zones, town, trucks, areas, settings, from, to, taken, blocks })` → `{ day, start, truckId }[]` on a 30-minute grid from 7:00 to 17:00 Mountain, inside the truck's working days, inside the truck-day's area when the day already has one (a town outside the day's area group is offered only on a day with no area yet or an area that includes it), under the capacity in visits and minutes, with the service's `slotMinutes` and the lead-time floor from settings (a booking cannot be sooner than tomorrow unless the setting allows same-day; the audit saw 10 percent same or next day). Tests: a full day offers nothing; a block shortens the day; a town outside the area is kept off that day; durations by band.

`propose.ts`: the signature from the earlier draft (visits with preference and window, trucks, areas, settings, `from`, `taken`, `blocks`) → `{ assignments, unplaced }`. Sort by preference then by the season's town order; walk days then trucks; each truck-day takes the next area with visits left and fills it under `capacityFor` minus `taken` and `blocks`; a visit stays inside its preference range while that range has room, then the window; fall marks `firm` within `firmDaysAhead`; firm visits are never moved; deterministic. One test per hard rule plus the determinism test. Commit: `Compute open slots and propose a day and a truck for every pass visit`

### Task 10.3: Stop order

**Files:** `src/lib/scheduling/order.ts` (+ test), `src/lib/scheduling/server/order-day.ts` (+ test)

`orderStops(points)` (pure): nearest neighbour from the day's first stop (the one nearest the truck's first area town centre), then a 2-opt pass until no swap shortens the tour (haversine distances); returns the visit ids in order. `orderDay(db, org, query, { truckId, day })`: with `stopOrder === "api"`, read the order Jobber's Route Optimization produced and store `stop_order`; with `"app"`, `orderStops` on the day's geocoded visits (a visit without coordinates goes last), store `stop_order` and `start_time` from 8:00 in that order with each visit's duration, and push the start times to Jobber through `moveVisit`. Tests: a square of four points comes back as a loop; a missing coordinate goes last; the API path stores what Jobber said. Commit: `Order each truck-day's stops`

### Task 10.4: Running, approving, pushing, moving, firming up, and the not-closed nudge

**Files:** `src/api/v1/schedule/handlers.ts` and `visits/handlers.ts` (replace the stubs, + tests), `src/lib/scheduling/server/run.ts`, `approve.ts`, `move.ts`, `firm-up.ts` (+ tests), the `visit-push` and `schedule-run` handlers

`schedule.propose`: loads inputs (settings, trucks, areas, the window's visits, `taken` from scheduled visits, `blocks` from the mirror), runs `propose`, writes `proposed_on`, `proposed_truck_id`, `status = proposed`, `firm`, inserts `schedule_run`, queues the admin alert with the Schedule link. `schedule.approve`: proposed → scheduled, the run's approval, one `visit-push` per visit (key `visit:<id>:<day>:<truck>`), `orderDay` for each touched truck-day, `date-set` for firm visits, `emitEvent("visit.scheduled")`. The `visit-push` handler calls `scheduleVisit` (creating the job first if onboarding failed), stores `jobber_visit_id`, `pushed_at`; the first failure queues "Could not push Andrea's blowout to Jobber; retrying". `visits.move`: the hard rules, then the write, the push, `orderDay`, `date-moved` when firm. `visits.markClosed`: the explicit done for a `not-closed` visit, admin only, which then charges a pass visit the same way a completion signal would (Ryan marking it done in the app is the one human path to a charge without Jobber). `firmUp`: daily, fall visits inside `firmDaysAhead` become firm and get `date-set`. Tests with `testDb()` and a fake query, as listed in the earlier draft, plus: `markClosed` charges once; `move` over capacity is refused with the words. Commit: `Run, approve, push, order and move the schedule, and close unclosed visits by hand`

### Task 10.5: The daily cron, the day-before reminder, the crew summary

**Files:** `src/app/api/cron/schedule/route.ts`, `src/lib/scheduling/server/daily.ts` (+ test), `vercel.json`

`daily`: `firmUp`; `notClosedCheck`; the `day-before` message for every firm visit tomorrow (email, SMS when allowed, at the Messages hour); a `schedule-run` when a window opens inside the lead time with no run yet; the crew summary to Ryan and Hannah ("Tomorrow: 12 visits, Truck 1 in Erie and Firestone (7), Truck 2 in Longmont (5). 3 moved in Jobber this week. 2 visits from yesterday not marked done. Spring proposal waiting for approval: 24 visits."). Commit: `Run the schedule daily: firm up, remind, summarise`

### Task 10.6: Auto-apply, off by default

`scheduler.mode: "auto"` makes `schedule.propose` approve its own output; the Settings switch carries the warning line; tests for both modes. Commit: `Let the scheduler apply its own proposals when the setting says so`

**Phase 10 close:** `npm run test:stories`; on the tester account, approve a week and see the visits on Jobber's calendar assigned to the right users in stop order; move one in Jobber and see the exception on Home within a minute.

---

## Phase 11: The admin routes

Estimate: two and a half days.

### Task 11.1: The shell layout and the six pages

**Files:** `src/app/(admin)/admin/(shell)/layout.tsx`, `section.ts` (+ test), `loading.tsx`, `page.tsx`, `schedule/page.tsx`, `passes/page.tsx`, `revenue/page.tsx`, `customers/page.tsx`, `settings/page.tsx`, `page.test.tsx`; `AdminShell.tsx` (`onSignOut`, `next/link`); `NeedsAttention.tsx` (links to `/admin/passes?pass=` and `/admin/schedule?visit=`)

The `(shell)` group keeps `/admin/sign-in` outside the layout; the layout reads `x-pathname` for the section and signs out through `signOut`. Each page: `requireAdmin()`, `const data = await getAdminData()`, `today`, the screen with its action props. `schedule/page.tsx` reads `?week=` and `?day=` and loads `DayMap` dynamically. `customers/page.tsx` passes `consents`. Verify at 1440 and 375, the tab bar's safe area on a phone. Commit: `Serve the admin pages behind the shell with live data`

### Task 11.2: The actions

**Files:** `src/app/(admin)/admin/(shell)/actions.ts` (+ test); `PassesScreen.tsx`, `ScheduleScreen.tsx`, `SettingsScreen.tsx`, `HomeScreen.tsx`, `CustomersScreen.tsx` (+ stories, tests)

Every action is `requireAdmin("manager")` then `callApi(ctxFromSession(), handler, input)` then `revalidatePath`: `passes.resendConfirmation`, `passes.sendCardUpdateLink`, `passes.cancel`, `schedule.approve`, `visits.move`, `visits.markClosed`, `schedule.propose`, `settings.update`, `trucks.*`, `areas.*`, `services.update`, `apiKeys.create`, `apiKeys.revoke`, `webhooks.*`, `customers.consents.record` (an admin recording a phone opt-out). A `tech` gets `readOnly` and sees no buttons. The screens take the action props with `useTransition`; a refused move shows the words and snaps the block back; the map follows the grid. Verify each against the tester account and Stripe test mode. Commit: `Wire the pass, schedule, settings, key and consent actions`

**Phase 11 close:** `npm run test:stories`, `npm run check:design`; Hannah walks every admin page on the preview deployment; her notes become tasks appended here.

---

## Phase 12: Messaging: every customer message from the app

Estimate: two and a half days, apart from the scheduler so each is judged on its own.

### Task 12.1: Senders, the log, the consent gate and the `message` handler

**Files:** `package.json` (`twilio`), `src/lib/messaging/resend.ts` (replacing the stub), `twilio.ts`, `send.ts` (+ test), `log.ts`, `consent.ts` (+ test), `src/api/v1/messages/handlers.ts` (replace the stub, + tests), `src/app/api/webhooks/twilio/route.ts`, `src/lib/messaging/inbound.ts` (+ test)

`consent.ts`: `currentConsent(db, customerId)` is the newest `consent` row; `mayMessage(consent, kind, channel, hasPhone)`: transactional kinds (purchase-confirmation, date-set, date-moved, day-before, receipt, card-failed, card-expiring, cancelled, sign-in, booking-confirmation) go by email always and by SMS when the customer gave a phone and has not stopped texts; marketing kinds (renewal, pre-sell, anything else) need `marketing_opt_in` with that channel. `queueMessage(db, { customerId, visitId?, kind, key, channels, content })` writes one `message_log` row per channel (`queued` or `skipped` with the reason) and one queue item per queued row. The handler sends through Resend or Twilio and stores the provider id or the error. `messages.send` is the API's door (a kind, a customer; the same gate). Inbound: `POST /api/webhooks/twilio` validates Twilio's signature, enqueues on `MessageSid`; STOP, UNSUBSCRIBE, CANCEL, END, QUIT append a `consent` row (`source: reply`, texts off) for every customer with that phone; START appends one with texts on; anything else is logged as inbound for the later Messages view. Tests: the gate's table, one row per channel, a replay adds nothing, STOP appends. Commit: `Send and log customer messages through Resend and Twilio behind the consent gate`

### Task 12.2: The templates, in Trailhead's voice, tested on their wording

**Files:** `src/emails/*.ts` and `src/sms/*.ts`, one per kind with a test each: `purchase-confirmation`, `booking-confirmation`, `date-set`, `date-moved`, `day-before`, `on-my-way` (sent from the admin's Schedule for now; the day view later), `receipt`, `card-failed`, `card-expiring`, `renewal`, `cancelled`, `not-closed-crew`, `admin-alert`, `sign-in`; `src/emails/layout.ts` (+ test); `scripts/check-design.mjs` (the colour rule runs on `src/emails`, with one allowed constants block for the token hex values, since email cannot read CSS variables)

The words, from the booking brief and the IA: every text carries the business name, the date and time, who is coming, a way to reschedule and the opt-out line, under 160 characters where it can; confirmation within a minute; "your street is on our Erie day" when the area has two towns; the receipt names the next visit and its preference; the purchase confirmation carries the holographic pass card artwork as a static image; the booking confirmation says exactly what happens next ("Ryan's truck comes Tuesday, May 5, between 8 and 10. We text the day before."). No exclamation marks, no em dashes; every number from the arguments. Commit: `Write every customer and admin message as a tested template`

### Task 12.3: The automatic card-expiry message

**Files:** `src/lib/pass/server/card-expiry.ts` (+ test), the daily step in the drain cron

Sixty days before a card on file expires ahead of the season's October, one `card-expiring` message with the update link; also on `payment_method.detached`. Commit: `Email a customer before the card on file expires`

**Phase 12 close:** `npm run test:stories`; every kind sent once to a test inbox and a verified number, screenshots into `.local-data/wiring/messages/`.

---

## Phase 13: Booking at `/book`, in the app

Estimate: four days. The page stays at `/book` with its metadata, its breadcrumb schema and the sticky-bar rule (`StickyBar` is hidden on `/book`); the Jobber iframe is swapped for the app's form only when `APP_BOOKING=on`.

### Task 13.1: The booking steps in Storybook, approved

**Files:** `src/app/(booking)/book/_screens/BookingFlow.tsx`, `booking-state.ts` (+ test), `booking-steps.tsx`, `BookingFlow.stories.tsx`, `BookingFlow.test.tsx`

The same pacing as the checkout (one question per screen, the orange line, Enter and the arrows). Steps: service (big buttons from `services` with the price and the slot length: turn-on, inspection, blowout, repair, aeration when `AERATION_BOOKING_OPEN`, lights, and "New system or a large repair" which turns the flow into a quote request); zones band (for the three irrigation services; it sets the price and the slot length); the per-service question (repair: "What have you noticed?" free text; aeration: lawn size; lights: roofline and ground; the others skip); address and town (the zip gate becomes the town list, the same six); access ("Will the shut-off valve and the controller be reachable at the time of the visit?"); slot (the open slots from `schedule.slots` as day cards with times, phone first, the chosen one centred); contact (name, email, phone with the reason "so we can text you when we're on the way"); consent (the required terms line with the same words the `/book` page carries today, the marketing box unticked, "stop any time"); done ("Booked: Tuesday, May 5, between 8 and 10. We text the day before." with the confirmation line and a link to add it to a calendar). A quote request ends with "We reply the same day with a time for a free yard visit." Stories per step, `Walkthrough`, `QuoteRequest`, `NoSlots` ("Nothing open in the next three weeks; call us and we find a day."), `Phone`. Hannah approves. Commit: `Add the booking flow as stories`

### Task 13.2: `bookings.create`, `quoteRequests.create` and the duplicate check

**Files:** `src/api/v1/bookings/handlers.ts` (replace the stubs, + tests), `src/lib/pass/server/book.ts` (+ test), the `booking-onboard` handler

`bookings.create(ctx, input)` with the `public` principal: re-checks the slot against `openSlots` at that instant (`slot-taken` when it closed); refuses a second booking from the same address within three days for the same service unless `force` (the audit's duplicates); creates or matches the customer and property, queues `geocode`; appends the `consent` row (`source: booking`); writes `booking` and the `visit` row (`scheduled`, `firm`, the truck, the day, the start, the duration from the service and band, the price from the site); queues `booking-onboard` (the Jobber client, property, job and scheduled visit through the push adapter, assigned to the truck's user) and `booking-confirmation`; `orderDay`; `emitEvent("booking.created")`. `bookings.cancel` cancels the visit and the Jobber job (never an open job with a deleted visit). `quoteRequests.create` writes the row, queues a Jobber request through `requestCreate` during the transition, the admin alert and the customer's "we reply the same day" message, `emitEvent("request.received")`. Tests through `callApi`. Commit: `Book a visit on an open slot through the API and push it to Jobber`

### Task 13.3: The route, the swap at `/book`, the GA4 event

**Files:** `src/app/(booking)/book/page.tsx`, `actions.ts` (+ test), `src/app/(site)/book/page.tsx`, `src/components/sections/JobberEmbed.tsx` (unchanged), `src/lib/analytics.ts`, `CLAUDE.md`

Two pages cannot share `/book`, so the marketing page keeps the route: `src/app/(site)/book/page.tsx` renders the Jobber embed when `bookingEnabled()` is false and, when true, renders the app's `BookingFlow` through a client boundary with the same metadata, the same breadcrumb schema and the same `PageBanner` (the `(booking)` group then holds only the layout for the flow's stylesheet; the page itself stays under `(site)` so the manifest, the route and the sticky-bar rule are untouched). The flow's actions `loadSlots` and `book` call `schedule.slots` and `bookings.create` with the `public` principal. A `booking_complete` GA4 event on the done step, named in `ConversionTracking.tsx` and `CLAUDE.md`. `npm run manifest:compare` passes (same route, same classes when the flag is off; with it on, the new classes come from `app.css`, not the marketing file). Commit: `Serve the app's booking form at /book behind a flag`

### Task 13.4: Reminders, on-my-way and the receipt for booked visits

**Files:** `daily.ts` (+ test), the Schedule screen's "On my way" action (`messages.send` with kind `on-my-way` for the selected visit), `charge-visit.ts` (a booked visit is not charged by the app in this plan; its receipt comes from Jobber's invoice until the fourth retirement step, so `visitComplete` on a booked visit queues only `emitEvent("visit.done")` and the "thanks, here is what we did" message)

Commit: `Remind, announce and thank booked customers from the app`

**Phase 13 close:** `npm run test:stories`; a test booking on the preview deployment lands on the tester Jobber calendar at the chosen slot, assigned to the truck; the day map shows it in order; the confirmation arrives within a minute. After the flag goes on in production (Task 15.4): `npm run indexnow -- https://www.trailheadirrigation.com/book`.

---

## Phase 14: Renewal

Estimate: one day. Ships after the first sales.

### Task 14.1: The renewal link and the prefilled checkout

**Files:** `src/lib/pass/server/renewal.ts` (+ test), `checkout-state.ts`, `CheckoutFlow.tsx`, `page.tsx`, `actions.ts` (+ tests, a `Renewing` story)

An HMAC-signed `passId.expiry` token (90 days); `renewalPrefill` with last year's answers and preferences and `reuseCard` when the method is attached; `skipCard` in the reducer; `?renew=` opens on the timing step; `passes.create` with `renewFrom` makes the pass active at once with the old customer and method. Commit: `Let a pass holder renew from one email link`

### Task 14.2: The January job and the April lapse

**Files:** `src/app/api/cron/renewals/route.ts`, `lapse/route.ts`, `src/lib/pass/server/renewal-run.ts` (+ test), `vercel.json`

`sendRenewals` (the `renewal` message is marketing, so only to customers with the opt-in; the others get the renewal line inside their last transactional receipt of the season, which the receipt template already carries) and `lapseUnrenewed`. Commit: `Send renewal links in January and lapse unrenewed passes in April`

---

## Phase 15: Copy, terms, launch and IndexNow

Estimate: one day plus the end-to-end pass.

### Task 15.1: The Season Pass FAQ answers, `pricing.md` and `llms.txt`

The two FAQ answers when the flag is on ("Reserve online in a few minutes: pick your zones, tell us when you'd like the turn-on and the blowout, and save a card." and "from your pass page, any time"); the `pricing.md` paragraph and `llms.txt` line 15; the developer docs and MCP lines in `llms.txt` (Task 5.4); `SEASON_PASS_UPDATED` in `sitemap.ts`. The hero's "reserved" wording waits for Hannah (question 12). Commit: `Describe the online checkout and the API in the Season Pass FAQ, pricing.md and llms.txt`

### Task 15.2: Terms, the production database and the launch checklist

**Files:** `src/app/(site)/terms/page.tsx` (the Season Pass section, placeholders until question 11), `docs/plans/2026-11-12-season-pass-launch-checklist.md`

The checklist, each line a box: Stripe live keys, webhook endpoint and secret, Checkout branding, the tax answer; the Jobber app in production with the scopes from the facts doc, OAuth connected live, webhooks at the live URL, the custom field and tag created on the production account with their ids on `organization`, the catalogue alignment script run; Neon `production` migrated and seeded without fixture passes, the admins, the trucks, areas and capacities from Ryan's answers entered on Settings, the services checked against `/pricing`; Twilio 10DLC registered (started in Phase 12; it takes days) and `TWILIO_FROM` set; `AUTH_*`, `CRON_SECRET`, `API_KEY_PEPPER`, `GEOCODE_CONTACT`, `APP_URL` set; the Vercel plan checked against `vercel.json`; a WAF rate-limit rule on `/season-pass/checkout`, `/book` and `/api/*`; Hannah's decisions on Jobber's reminders and SMS; the e2e pass done; `SEASON_PASS_CHECKOUT=on` first, buy and refund one real pass; `APP_BOOKING=on` a week later, book and cancel one real visit; IndexNow for both. Commit: `Add the Season Pass terms block and the launch checklist`

### Task 15.3: End to end in test mode

No code. On the preview deployment: buy a pass with consent on; see the client and the three jobs in Jobber and the confirmation; enter the trucks and areas; run the spring proposal from Home; approve the week on Schedule and check the day map's order; see the visits on Jobber's calendar in that order; move one in Jobber and see the exception and the date-moved message; complete the turn-on in Jobber and see the charge, the receipt naming July and the invoice note; leave another uncompleted and see "not closed yet" the next morning, then mark it closed from Schedule and see the charge; cancel from the pass page. Then the failure path with `4000 0000 0000 0341`, the update, attempt 2. Then a booking: a blowout slot, the Jobber visit at that time, the confirmation, a duplicate refused, a quote request for an install. Then the API: a `read` key lists passes and is refused a cancel; an outbound webhook endpoint receives `pass.bought` with a valid signature; Claude on `/api/mcp` lists the tools and reads the schedule. Screenshots and rows into `.local-data/wiring/e2e/`; any bug becomes a task appended under Status.

### Task 15.4: Ship, then IndexNow

```bash
npm run indexnow -- https://www.trailheadirrigation.com/season-pass
```

and, after the booking flag goes on:

```bash
npm run indexnow -- https://www.trailheadirrigation.com/book
```

Then request indexing by hand in Search Console. Write the Status section at the top of this plan: commits per task, what is live, what waits on Hannah or Ryan, the open points from the e2e pass.

---

## Estimates

| Phase | What | Estimate |
|---|---|---|
| 0 | The Jobber facts on a tester account | 0.5 day |
| 1 | Route groups, root layouts, app.css, the manifest proof | 1 day |
| 2 | Storybook: freeze reasons, fixture, Settings, Schedule with the map, season setup, consent panel, approval | 3 days |
| 3 | Neon, schema, seed, services from the site, Jobber catalogue aligned | 2.5 days |
| 4 | Auth.js, proxy, guard, API keys, sign-in pages | 2 days |
| 5 | The API: handler shape, resources, outbound webhooks, OpenAPI, `/developers`, MCP | 3 days |
| 6 | Jobber OAuth, client, push adapter, mirror, queue, signals, not-closed, geocoding, live data | 3.5 days |
| 7 | Stripe | 2 days |
| 8 | Checkout wired, consent recorded, onboarding, GA4 | 2 days |
| 9 | Pass page | 1 day |
| 10 | Scheduler: settings, slots, proposal, stop order, approve and push, daily cron | 5 days |
| 10.6 | Auto-apply | 1 day |
| 11 | Admin routes and actions, Schedule with the map, Settings, Customers consent | 2.5 days |
| 12 | Messaging: Resend, Twilio, consent gate, every template, card expiry | 2.5 days |
| 13 | Booking at `/book`: stories, `bookings.create`, the swap, reminders | 4 days |
| 14 | Renewal | 1 day |
| 15 | Copy, terms, checklist, e2e, IndexNow | 1 day + the e2e pass |
| | Total | about 37 working days |

The API (3 days), the scheduler with the map (6 days with auto-apply), messaging (2.5 days) and booking (4 days) are the four phases the scope changes added, estimated apart so each can be judged on its own. The estimates assume one person with the Jobber tester account, Stripe test keys and Twilio test credentials in hand on day one and Ryan's answers before Phase 10. Phases 6 and 10 are the ones most likely to grow; every Jobber mutation is checked in GraphiQL as it is written, and the hard rules in `propose.ts` and `slots.ts` are where a test is added the moment a proposal or a slot looks wrong.

## Known gaps and dependencies

- If limits are ever needed they apply to all three season windows (spring, summer, fall) as one feature, never to October alone. The per-truck-day capacity is Ryan's planning number, not a sales limit; the booking form's open slots are the one place a customer meets it, and only as "nothing open that day".
- The `/season-pass` page's hero and metadata still promise a "reserved" blowout week; Hannah rewords them (question 12). This plan changes only the FAQ answers.
- The spring "why" line quotes a date only once `scripts/freeze-dates.mjs` pulls the last spring hard freeze (Task 2.1).
- Jobber's own scheduling notification and reminders reach customers as well as the app's messages unless Task 0.1 finds per-job control or Hannah turns them off account-wide (question 9). Pass and booked jobs carry the same email and phone the app uses.
- Stop order reads back from Jobber only if Task 0.1 finds the API exposes it; otherwise the app's nearest-neighbour order is what Ryan sees, and Jobber's Route Optimization, if he presses it, moves visits the app then logs as exceptions. Decide once the fact is known; the plan assumes the app orders.
- Booked (non-pass) visits are invoiced and paid in Jobber in this plan; the app sends their confirmation, reminder and thanks but not their receipt or charge. That is the fourth and fifth retirement steps.
- Manual payment recording (cash, check, Zelle), tips and the past-due list stay in Jobber; Home shows the past-due count from the mirror.
- The Requests inbox page is not in this plan; quote requests from the booking form land as rows, an admin alert and a Jobber request, and are read through `quoteRequests.list` on the API until the inbox lands.
- The admin Messages view (every `message_log` row per customer, inbound replies) is a later plan.
- From the prototype's list, two gaps stay: the shadcn sidebar's own `useIsMobile` sheet (never rendered) and the safe-area padding, live from Task 1.3 but still to be seen on a real phone.
- The map's pins for the fixture are scattered near town centres; real pins arrive with geocoding.

## Jobber retirement path

Not in this plan, in this order, each its own later plan (PRD, revised system of record; the IA's build order):

1. **The Requests inbox and the Customers pre-sell.** A Requests page (nav slot four) for quote requests from the booking form and the admin: one click to a scheduled visit through `schedule.slots` or to a quote; and on Customers, the January list of people who booked a spring visit and a blowout at full price with a one-click pass offer (marketing, so consent-gated). Rough size: four days.
2. **The tech's day view on the phone**, from the app's schedule: the day's stops in order for a truck, each with a per-visit-type checklist edited in Settings (turn-on, inspection, blowout, repair; an optional photo per step), where a completed checklist is the explicit done that charges a pass visit and sends the receipt, so the completion signal comes from the app's own button instead of Jobber's webhook; offline-first, since Jobber is the bar. Rough size: eight to ten days.
3. **Message templates in Settings.** Every email and text editable with fillable fields and a preview; a new message is a template plus a trigger; replaces the fixed functions in `src/emails/` and `src/sms/`. Rough size: four to five days.
4. **Quotes and invoices for non-pass work** move to the app (the audit's lump-line install quotes with add-on lines, client-viewable approval, no deposit; invoices on completion, due on receipt, no tax, manual payment recording for cash and check, tips allowed, the past-due list); the mirror becomes the migration source and the sync is turned off. Rough size: two weeks.
5. **Payments for that work** through Stripe with the saved card; the Jobber OAuth connection is retired. Rough size: one week.

What this plan leaves in place so none of the five has to undo it: every pass and booking fact lives in the app's tables, never only in Jobber; the push adapter is the single seam to Jobber's write side and the signals handler the single seam to its read side; the API, the queue, the message log, the consent rows and the settings are Jobber-free already; and the `visit` table already holds booked visits beside pass visits, which is what the day view and the invoices will read.


## Changes from Hannah's evening review of the checkout (2026-11-12, after Phase 1 merged)

Hannah opened the checkout at its URL and asked for the normal things. Built in the prototype on branch `prototype-round-2` the same night; the wiring tasks below absorb them.

1. **Address type-ahead, no town field (Phase 8, new Task 8.0).** `AddressSearch` (block) takes a `PlaceProvider`; the prototype uses `src/lib/places/fixture.ts`. Wire: `src/app/api/v1/places/suggest/route.ts` calling Google Places Autocomplete (New) server-side with `GOOGLE_PLACES_KEY` (never on the client), a session token per checkout, `includedRegionCodes: ["us"]`, a `locationBias` rectangle around the six towns (bias, not restriction, so an out-of-area address is still found and refused with the message), and Place Details for the postal address components; the provider on the client is `fetch` to that route. `serviceability()` in `src/lib/places/index.ts` decides by town name then zip (`SERVICE_ZIPS`, which Ryan confirms before launch); `passes.create` runs the same check server-side and refuses with `out-of-area`. The property stores the place id with the address so geocoding (Task 6.6) can read the point from the Details call instead of Nominatim when one exists. Cost: Google's monthly free allowance covers Trailhead's volume; the route rate-limits by IP. The booking form (Phase 13) uses the same block in place of the zip gate.
2. **Email checks (Phase 8, Task 8.1).** The client checks the shape and offers the common domain on a slip (`src/lib/email-check.ts`). `passes.create` adds an MX lookup on the domain (`node:dns/promises`, 2-second timeout, a miss returns `email-unreachable` and the step says "We can't find that email's mail server. Check the spelling."). The confirmation email's sign-in link (Auth.js magic link, Phase 4) is the proof the mailbox is read; a bounce from Resend's webhook raises an attention row "Confirmation bounced for TH-2027-0007" so Ryan can call.
3. **The pass is two visits; the inspection is an add-on (Phases 5, 8, 9, 11).** `season_pass.inspection boolean`; `passes.create` inserts two or three `visit` rows from `passVisits(fields.inspection)`; `passes.addInspection` (new, customer or admin) adds the July visit to an active pass before July 1 and emails the receipt-to-come; the Passes grid gains an "Inspection" column and filter; the renewal email (Phase 14) carries the customer's last choice. Prices in `src/lib/season-pass.ts` are the one source; `SEASON_PASS_TABLE` carries both totals for the marketing page.
4. **Change a preference from the pass page (Phases 5, 9).** `passes.updatePreference(ctx, { passId, kind, preference })`, allowed for the customer principal on their own pass while the visit has no day and the window has not opened; writes a `pass_change` row and, when the visit is already proposed, flags the proposal for re-run. The page's `ChangePreferenceDialog` calls it through a server action.
5. **Customers: scheduled or to schedule (Phases 6, 11).** `customers.list` returns `next` (the first booked visit on or after today from the mirror, else the first pass visit with no day, else nothing) and `nextState`; the admin page is `customers-model.ts` over live data. The Jobber mirror's unscheduled jobs (the audit's 55 open jobs with deleted visits) count as "to schedule" with the job's title.
6. **The confirmation email carries the pass card (Phase 12).** At `passes.activate`, render the pass card with the holographic art to a PNG server-side (`@vercel/og` / satori over the same markup as `PassCard`, 1280 by 800) and store it under `pass_asset`; the confirmation email embeds it inline and links to the pass page; the same image is what "Save as image" offers.
7. **Cancellation reaches Jobber (Phases 6, 9, 11; Hannah, 2026-11-12 night: "we need to know if somebody cancelled, because then we would need to remove it from Jobber too").** `passes.cancel` (the customer on the pass page, or Hannah in the admin) marks the pass and its unstarted visits cancelled, charges nothing further, sends the customer the `cancelled` message, and queues `pass-cancel`, whose handler calls the push adapter's `cancelJob` for every open Jobber job on the pass. Phase 0 answers whether Jobber's API can cancel a job (`jobCancelByApi`); if it can, the jobs are cancelled and the attention row reads "Jobber jobs removed"; if it cannot, the adapter writes a note on each job and the attention row `pass-cancelled` ("Andrea cancelled TH-2027-0004; the two Jobber jobs still open, remove them") stays on Home until Ryan removes them and the mirror sees them gone. Either way the row appears the moment the cancel lands, the Passes grid and Customers read Cancelled, and the scheduler never proposes a cancelled visit. The prototype carries the attention kind and a fixture row.
8. **Stripe alignment, checked 2026-11-12 night.** Card capture is a Checkout Session in `mode: "setup"` (Embedded), which creates a SetupIntent and attaches the payment method to the Stripe Customer; each visit's charge is a PaymentIntent with `customer`, `payment_method`, `off_session: true`, `confirm: true` and an idempotency key of the visit id; `payment_intent.payment_failed` with `authentication_required` or a declined card queues the "update your card" email, whose link is a new setup-mode Checkout Session for the same Customer (`checkout.session.completed` → `applyCardUpdate`); receipts are Trailhead's own (Stripe's are off), tax is not collected (the audit: $0), and refunds go through `refunds.create` on the charge from the admin. This is Stripe's documented "save now, charge later" flow; nothing in the plan departs from it.
