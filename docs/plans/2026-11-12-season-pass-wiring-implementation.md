# Season Pass Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Put real data behind the approved prototype screens and make the app the system of record for everything pass-related: a Postgres database, sign-in, Stripe, the checkout with timing preferences, the app's own scheduler across Ryan's trucks with Ryan approving each batch, every customer message sent by the app, a one-way push of scheduled visits into Jobber for the field, the admin pages (Home, Schedule, Passes, Revenue, Customers, Settings) and the January renewal, with the marketing site unchanged at every step.

**Architecture:** The marketing tree moves into `src/app/(site)/` and keeps its root layout and `globals.css`; `(admin)`, `(checkout)` and `(account)` get their own root layouts on one shared stylesheet entry, `src/app/app.css`. Drizzle owns the schema in `src/db/schema.ts`; every table carries `organization_id`, trucks and areas are rows, and settings live in `organization_settings` with a change log. The app owns the pass, its visits and dates, trucks, areas, charges, messages and settings. Jobber is a one-way display for the field: the app pushes each scheduled pass visit to Jobber as a job and visit assigned to the truck's user, and reads back only two signals, visit completed and visit moved (a move is accepted, logged as an exception and shown on Home, never treated as the truth). Non-pass work (repairs, installs, quotes, invoices) stays in Jobber and is mirrored read-only for the dashboard's totals. Stripe holds the card. Everything asynchronous (webhooks, Jobber pushes, charges, messages) goes through one claimed `queue_item` table drained after the response with `after()` and again by a cron, so every step is idempotent and retried. Screens keep taking `AdminData` and callbacks as props; `getAdminData("live")` maps the app tables and the mirror onto the screen-facing types, and route handlers, server actions and queue handlers are the only places that know Jobber's, Stripe's, Resend's or Twilio's shapes. Design: `docs/DESIGN.md` (the evening decision of 2026-11-12). Requirements: `docs/plans/2026-11-12-season-pass-checkout-prd.md`, in particular "Scheduling preference" and "System of record (revised by Hannah, 2026-11-12 evening)", which supersede the original split and the nine-step loop where they differ. Scheduling rules: `.local-data/research/2026-11-12-pass-visit-scheduling-brief.md` (git-ignored; read it from the main checkout's `.local-data/research/` if the worktree lacks it). Prototype: `docs/plans/2026-11-12-admin-dashboard-prototype-implementation.md` (Status and Known gaps).

**Tech Stack:** Next.js 16.1 App Router (`proxy.ts`, `after()`, server actions), React 19, TypeScript strict, Tailwind v4, Drizzle ORM on Neon Postgres (`@neondatabase/serverless`, `drizzle-kit` migrations, `@electric-sql/pglite` for tests), Auth.js v5 (`next-auth@beta`) with the Resend provider and the Drizzle adapter, Stripe (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`, Embedded Checkout in setup mode, off-session PaymentIntents), Jobber GraphQL API with OAuth 2, Resend for email, Twilio for SMS, Vercel Cron, Vitest (unit, jsdom) and Storybook `nextjs-vite` (stories). Node 24, npm 11.

**Conventions the executor must keep:** everything in the prototype plan's header still applies (`cn()`, semantic tokens, `rounded-lg`, `data-slot`, sentence case, copy rules from `CLAUDE.md`). Plus: `import "server-only"` at the top of every file that touches the database, Stripe, Jobber, Resend or Twilio; no secret is read outside `src/lib/env.ts`, and never at module scope; every table has `organization_id`; every write a webhook, a retry or a second drain can repeat is idempotent on an id; money in the database is whole dollars (`integer`), converted to cents only inside `src/lib/stripe/`; timestamps are `timestamptz`, calendar days are `date` and mean Mountain-time days; nothing under `src/app/(site)/` or `src/components/sections/` imports from `src/db`, `src/lib/jobber`, `src/lib/stripe`, `src/lib/messaging`, `src/lib/scheduling` or `src/lib/pass` (the gate's import rule is extended in Task 1.3). Nothing already named in the prototype is renamed except where a task says so (the October removals and the preference fields).

**Keep the marketing site green at every task.** Each task ends with `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`; `npm run test:stories` runs at the end of each phase. `npm run manifest:compare` (Task 1.1) proves the marketing routes and CSS are unchanged after every task that touches `src/app` or a stylesheet. Where a task creates a module another task fills in, the first task creates the stub so the tree compiles at every commit; the plan names each stub.

**Storybook approval before wiring** (DESIGN.md): every screen or block this plan changes or adds (the reshaped checkout, PassCard, SeasonLine, the Passes grid and panel, the Settings and Schedule screens, SignInCard, the card step, the lapsed pass page) is a story first, Hannah approves it in Storybook, its row is added to the Approvals table in `docs/DESIGN.md`, and only then is it wired. Phase 2 is that pass for everything the scope change touches; later phases name the approval step where they add a surface.

**Commit after every task.** One plain sentence, sentence case, no prefix. End with the attribution line in the system reminder.

**Branch:** `season-pass-wiring`, cut from `main` at `6d557be` (the PRD and DESIGN.md revisions). Each phase can be its own PR to `main`; Phase 1 lands first and alone so the marketing site is seen unchanged on the live deploy before any app code follows.

**The risk, stated plainly:** once Phase 9 ships, a scheduling mistake is ours, not Jobber's. A visit on the wrong day, two trucks in one town, a blowout after the freeze: the app chose it. The plan answers this with the hard rules in `propose.ts` (tested one by one), Ryan approving every batch in the first season, exceptions from Jobber always winning, and the daily summary. Auto-apply (Task 9.5) stays off until Ryan has approved a full season.

---

## Questions to settle before the phases that need them

For Ryan, from the scheduling brief, needed by Phase 9 (the Settings page carries the answers; nothing is in code):

1. Which towns share a truck-day, and does the same truck keep the same towns all season. The brief's natural split: Erie + Firestone, Longmont, Louisville + Lafayette, Broomfield.
2. Visits per truck per day for a turn-on, an inspection and a blowout. The trade guide's example is about 10 startups and more blowouts at 20 to 30 minutes each.
3. Working days per truck, and whether Saturdays exist in October.
4. Whether "earlier" means the first area-day in the window or any earlier week. The brief and this plan assume the first area-day.
5. The trucks: names and which Jobber user each one is.

For Hannah:

6. Jobber's own visit notifications for pass jobs. Task 0.1 asks the API whether they can be turned off per job. If not, pass customers get Jobber's scheduling email and day-before reminder as well as the app's, until Jobber's reminders are off account-wide (which also affects non-pass customers). The plan ships the app's messages either way and leaves this switch to Hannah.
7. SMS in the first season: on (consent box at checkout, day-before text) or email only. The code supports both; the Messages settings section has the switch.
8. The Season Pass terms block (cancellation, weather, card updates) and the sales tax answer from the accountant, needed before the first live charge (Task 13.2).
9. The `/season-pass` page still promises a "reserved" blowout week. With preferences instead of a picker, Hannah rewords it; this plan does not change marketing copy beyond the FAQ answers in Task 13.1 and notes the dependency.

---

## Decisions this plan makes

1. **Neon, not Vercel Postgres.** Vercel's Postgres is Neon under the Marketplace; creating the database through the Vercel integration gives the same `DATABASE_URL`. The driver is `@neondatabase/serverless` over HTTP (`drizzle-orm/neon-http`). HTTP has no interactive transactions, so every multi-statement write is written to be safe when re-run and the queue claims items with one atomic `UPDATE … RETURNING`.
2. **One queue, in Postgres, with a claim step.** `queue_item` (kind, key, payload, attempts, run_after, claimed_at, done_at, error) replaces a queue service. A webhook route inserts the item, returns 200 within Jobber's one-second limit, and drains the queue with `after()`; `/api/cron/drain` drains it again. Each drain claims one item at a time with `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`, so two drains never run the same item.
3. **Auth.js, one instance, two kinds of user.** `signIn` is allowed when the email is in `admin_user` (Hannah and Ryan, with roles) or matches a `season_pass` row. The JWT carries `kind: "admin" | "customer"`, `organizationId` and `role`. `/admin/*` needs `admin`; `/account/*` needs `customer` or `admin`. Sessions are JWTs; the adapter stores only verification tokens. The config is a function so nothing reads the database at import.
4. **Embedded Checkout with `redirect_on_completion: "never"`.** The card step mounts Stripe's embedded form in the page, `onComplete` fires in the client and the reducer moves to the done step.
5. **Preferences, not reservations.** No capacity exists anywhere in this plan. The customer picks Earlier, Recommended or Later for the turn-on and the blowout; July asks nothing. The preference is stored on the pass, worded by `src/lib/pass/preferences.ts`, carried into the Jobber job title and honoured by the scheduler. If limits are ever needed they apply to all three windows as one feature.
6. **The app schedules; Jobber displays.** `src/lib/scheduling/propose.ts` is a pure function from passes, trucks, areas and settings to a proposed day and truck per visit. Ryan approves a batch on the Schedule page; approval pushes each visit to Jobber as a scheduled visit assigned to the truck's user. The Jobber push and the "move a visit" write are behind one adapter, `src/lib/jobber/push.ts`, whose exact mutations Task 0.1 confirms. Stop order inside a day is Jobber's Route Optimization, pressed by Ryan; the app never orders stops.
7. **Two signals read back, nothing else.** `VISIT_COMPLETE` triggers the charge; `VISIT_UPDATE` on a pass visit whose day or user differs from the app's row is an exception: the app adopts the new day and truck, marks the visit, shows it on Home and tells the customer. No other pass data is read from Jobber.
8. **Every customer message comes from the app.** Resend for email, Twilio for SMS (consent captured at checkout, STOP honoured), templates in `src/emails/` and `src/sms/` as pure functions tested on their wording, every send logged in `message_log`. The invoice in Jobber is marked paid through the API if Task 0.1 finds a mutation, else by a job note and a line to Ryan.
9. **Vercel Cron frequency follows the plan Trailhead is on.** `vercel.json` is written for Pro; Task 5.4 says what to change on Hobby.
10. **The season.** `currentSeason(today)`: the calendar year from January to October, the next year from November (sales for next season open after the blowouts). Replaces the prototype's `SEASON = 2027`.
11. **A feature flag gates the public checkout.** `SEASON_PASS_CHECKOUT=on` turns `/season-pass/checkout` on; otherwise it is a 404 and `/season-pass` keeps its contact button. It goes on in production at Task 13.4 only.
12. **Jobber retirement path** (PRD, revised system of record), each a later plan in this order: the tech's day view on the phone replaces Jobber's field app; quotes and invoices for non-pass work move to the app; payments for that work move to Stripe. Nothing in this plan starts them, and nothing in this plan blocks them: the mirror tables, the queue and the push adapter are the seams.

---

## Environment variables

All read through `src/lib/env.ts` (Task 3.1), lazily, inside the function that needs them.

| Variable | Set in | Used by |
|---|---|---|
| `DATABASE_URL` | Vercel (Neon integration) and `.env.local` | Drizzle |
| `ADMIN_DATA_SOURCE` | `fixtures` locally and in Storybook; `live` in Vercel | `getAdminData` |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_RESEND_KEY` | Vercel, `.env.local` | Auth.js |
| `RESEND_API_KEY` | already set | every email |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Twilio console (a 10DLC-registered number) | SMS |
| `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `JOBBER_API_VERSION` | Jobber Developer Center app | OAuth, HMAC, the GraphQL header |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Stripe |
| `CRON_SECRET` | Vercel | `/api/cron/*` |
| `SEASON_PASS_CHECKOUT` | `on` or unset | the checkout route and the `/season-pass` button |
| `APP_URL` | the site origin | links in messages |

Per-account Jobber ids (the pass-id custom field configuration id, the `season-pass` tag) are rows on `organization`, not variables, because the tester account and the production account differ. `.env.example` (Task 3.1) lists every variable with a comment and no values.

---

## Phase 0: The two Jobber facts, plus the three this plan adds

Estimate: half a day, most of it waiting on the tester account.

### Task 0.1: Confirm scheduling, payment, notifications and job cancellation on the Jobber API

**Files:**
- Create: `docs/jobber-api-facts.md`
- Create: `src/lib/jobber/facts.ts`, `src/lib/jobber/facts.test.ts`

**Step 1: Tester account and GraphiQL.** In the Jobber Developer Center create or open the Trailhead app, add a tester account, open GraphiQL against it. Record the API version date the explorer uses; that is `JOBBER_API_VERSION`.

**Step 2: Answer the questions and write them down**, each with the exact query and response shape pasted under its own heading in `docs/jobber-api-facts.md`:

1. `JobCreateAttributes` scheduling: `{ __type(name: "JobCreateAttributes") { inputFields { name type { name kind ofType { name kind } } } } }`. Does it take a start date and time, or a visit input that places the first visit on a day, and what is the field for the assigned user (`assignedTo`, `userIds` or similar)? This is the scheduler's write.
2. Moving a scheduled visit and reassigning it: the mutation (`visitEdit`, `jobEdit` or `visitReschedule`) and its input for start, end and assigned users.
3. The webhook topics: `{ __type(name: "WebHookTopicEnum") { enumValues { name } } }`; record the full list and name the topics for visit complete, visit update, job update, client update, invoice create and update, quote create and update.
4. Recording a payment on an invoice: search the mutation list for `payment` or `invoice`; if a mutation exists, record its input.
5. Custom fields on jobs: how an app-defined field is created and how it is set on `jobCreate`.
6. Client notifications per job: whether `jobCreate` or `visitEdit` carries a flag to suppress Jobber's scheduling email and reminders for that job (the facts doc says yes or no; question 6 for Hannah follows from it).
7. Cancelling or archiving a job by mutation (`jobDelete`, `jobEdit` with a status, or neither).
8. The cost extension: `extensions.cost` from any small response and the rate limit page's numbers.
9. Whether an app's webhooks are subscribed in the Developer Center UI or by mutation, and the shape of `jobberWebUri` on client, job, visit, quote and invoice.

**Step 3: Encode the answers as constants.**

```ts
// src/lib/jobber/facts.ts
/**
 * What Task 0.1 confirmed on the Jobber API (docs/jobber-api-facts.md). The
 * adapters in push.ts, invoice-paid.ts and scheduling.ts read these and
 * nothing else in the codebase asks the question again. Per-account ids
 * (custom field configuration, tag) are rows on `organization`, not here.
 */
export const JOBBER_FACTS = {
  /** "visit" when jobCreate places a visit on a day with an assigned user; "edit" when the job is created unscheduled and a second mutation schedules it */
  scheduleWrite: "edit" as "visit" | "edit",
  /** the mutation that moves a scheduled visit and reassigns it */
  moveMutation: "visitEdit",
  /** "api" when a payment can be recorded on an invoice by mutation; "manual" when Ryan marks it paid from a note */
  invoicePayment: "manual" as "api" | "manual",
  /** true when Jobber's client notifications can be turned off per job */
  notificationsPerJob: false,
  /** true when a job can be cancelled or archived by mutation */
  jobCancelByApi: false,
  topics: {
    visitComplete: "VISIT_COMPLETE",
    visitUpdate: "VISIT_UPDATE",
    jobUpdate: "JOB_UPDATE",
    clientUpdate: "CLIENT_UPDATE",
    invoiceCreate: "INVOICE_CREATE",
    invoiceUpdate: "INVOICE_UPDATE",
    quoteCreate: "QUOTE_CREATE",
    quoteUpdate: "QUOTE_UPDATE",
  },
} as const
```

Replace every placeholder with what GraphiQL showed; the topic strings above are the expected `OBJECT_ACTION` shape, copy the real ones.

**Step 4: The test that pins the file to the doc.**

```ts
// src/lib/jobber/facts.test.ts
import { readFileSync } from "node:fs"
import { it, expect } from "vitest"
import { JOBBER_FACTS } from "./facts"

const doc = readFileSync("docs/jobber-api-facts.md", "utf8")

it("every topic in facts.ts appears in the facts doc", () => {
  for (const topic of Object.values(JOBBER_FACTS.topics)) expect(doc).toContain(topic)
})
it("the facts doc records the API version and the move mutation", () => {
  expect(doc).toMatch(/JOBBER_API_VERSION:\s*\d{4}-\d{2}-\d{2}/)
  expect(doc).toContain(JOBBER_FACTS.moveMutation)
})
```

**Step 5: Verify and commit.** `npm run lint`, `npm test`, `npx tsc --noEmit`. Commit: `Record the Jobber API facts the wiring depends on`

---

## Phase 1: Route groups and root layouts

Estimate: one day.

### Task 1.1: A manifest of the marketing routes and CSS, recorded before anything moves

The proof that nothing on the marketing site changed is a file comparison. The script lists every route the build produced and every CSS file with its size and a hash of its sorted selectors; `--compare` fails when either differs from the saved baseline.

**Files:**
- Create: `scripts/route-css-manifest.mjs`, `scripts/route-css-manifest.test.mjs`
- Modify: `package.json` (`manifest:save`, `manifest:compare`, add the test to `test:gate`)

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
  assert.deepEqual(diffManifests(before, after), [
    "route missing: /pricing",
    "route added: /about",
    "css changed: a.css (selectors h1 -> h2, 10 -> 12 bytes)",
  ])
})
```

Run: `node --test scripts/route-css-manifest.test.mjs`. Expected: FAIL, cannot find module.

**Step 2: Write the script.**

```js
#!/usr/bin/env node
// Lists the routes and CSS the last `next build` produced, so a change to the
// app tree can prove the marketing site is unchanged. Routes come from
// .next/server/app-paths-manifest.json; CSS files from .next/static/css.
//   node scripts/route-css-manifest.mjs --save      writes .local-data/wiring/manifest.json
//   node scripts/route-css-manifest.mjs --compare   exits 1 when the build differs from it
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUT = ".local-data/wiring/manifest.json"
// App routes are left out so later phases can add them without failing the compare.
const SKIP = /^\/(admin|account|season-pass\/checkout|api)(\/|$)/

export function selectorsOf(css) {
  const found = new Set()
  for (const m of css.matchAll(/(?:^|[}{;])\s*([.#][^{}@;]+?)\s*\{/g)) found.add(m[1].trim())
  return [...found].sort()
}

export function readManifest() {
  const paths = JSON.parse(readFileSync(".next/server/app-paths-manifest.json", "utf8"))
  const routes = Object.keys(paths)
    .filter((p) => p.endsWith("/page") || p.endsWith("/route"))
    .map((p) => p.replace(/\/(page|route)$/, "").replace(/\/\([^)]+\)/g, "") || "/")
    .filter((r) => !SKIP.test(r))
    .sort()
  const css = {}
  const dir = ".next/static/css"
  for (const name of existsSync(dir) ? readdirSync(dir).sort() : []) {
    const text = readFileSync(join(dir, name), "utf8")
    css[name.replace(/\.[a-f0-9]{8,}\.css$/, ".css")] = {
      bytes: text.length,
      selectors: createHash("sha256").update(selectorsOf(text).join("\n")).digest("hex").slice(0, 12),
    }
  }
  return { routes, css }
}

export function diffManifests(before, after) {
  const out = []
  for (const r of before.routes) if (!after.routes.includes(r)) out.push(`route missing: ${r}`)
  for (const r of after.routes) if (!before.routes.includes(r)) out.push(`route added: ${r}`)
  for (const [name, b] of Object.entries(before.css)) {
    const a = after.css[name]
    if (!a) out.push(`css missing: ${name}`)
    else if (a.selectors !== b.selectors || a.bytes !== b.bytes)
      out.push(`css changed: ${name} (selectors ${b.selectors} -> ${a.selectors}, ${b.bytes} -> ${a.bytes} bytes)`)
  }
  return out
}

if (process.argv[1]?.endsWith("route-css-manifest.mjs")) {
  const current = readManifest()
  if (process.argv.includes("--save")) {
    mkdirSync(".local-data/wiring", { recursive: true })
    writeFileSync(OUT, JSON.stringify(current, null, 2))
    console.log(`saved ${current.routes.length} routes and ${Object.keys(current.css).length} css files to ${OUT}`)
  } else {
    const problems = diffManifests(JSON.parse(readFileSync(OUT, "utf8")), current)
    for (const p of problems) console.log(p)
    if (problems.length) process.exit(1)
    console.log("marketing routes and css unchanged")
  }
}
```

Once `app.css` exists (Task 1.3) the build emits a second CSS file; its key is new and the compare ignores keys the baseline lacks, so only the marketing file is compared. If two CSS files ever share the stripped name, key them by the layout that imports them.

**Step 3: Run the test.** `node --test scripts/route-css-manifest.test.mjs`. Expected: PASS.

**Step 4: Scripts.** `"manifest:save": "node scripts/route-css-manifest.mjs --save"`, `"manifest:compare": "node scripts/route-css-manifest.mjs --compare"`, `"test:gate": "node --test scripts/check-design.test.mjs scripts/route-css-manifest.test.mjs"`.

**Step 5: Record the baseline.** `npm run build && npm run manifest:save`. Confirm `.local-data/wiring/manifest.json` lists `/`, `/pricing`, `/season-pass`, `/services/[city]`, the blog and one CSS file.

**Step 6: Commit.** `Add the route and CSS manifest that proves the marketing site is unchanged`

### Task 1.2: Move the marketing tree into `src/app/(site)/`

Next.js allows several root layouts only when there is no `src/app/layout.tsx`; every page must live under a group with its own root layout. The stylesheets, the metadata files (`icon.png`, `apple-icon.png`, `manifest.ts`, `sitemap.ts`) and `api/` stay at `src/app/`.

**Files:**
- Move: `src/app/layout.tsx`, `src/app/page.tsx` and every page folder (`about`, `aeration`, `blog`, `book`, `christmas-lights`, `contact`, `first-freeze-dates`, `pricing`, `privacy`, `season-pass`, `services`, `smart-controllers`, `spring-turn-on`, `sprinkler-blowout`, `sprinkler-installation`, `sprinkler-repair`, `terms`, `water-efficiency`, `water-rebates`) → under `src/app/(site)/`
- Create: `src/app/(site)/not-found.tsx`
- Modify: `src/app/(site)/layout.tsx:4` (`"./globals.css"` → `"../globals.css"`)
- Modify: `scripts/new-service.mjs:205`, `CLAUDE.md` (File Structure)

**Step 1: Move with git.**

```bash
mkdir -p "src/app/(site)"
git mv src/app/layout.tsx src/app/page.tsx "src/app/(site)/"
for d in about aeration blog book christmas-lights contact first-freeze-dates pricing privacy season-pass services smart-controllers spring-turn-on sprinkler-blowout sprinkler-installation sprinkler-repair terms water-efficiency water-rebates; do git mv "src/app/$d" "src/app/(site)/$d"; done
```

`ls src/app` shows exactly: `(account) (admin) (checkout) (site) api apple-icon.png base.css globals.css icon.png manifest.ts sitemap.ts tokens.css`.

**Step 2: The import and the 404.** In `(site)/layout.tsx` change `import "./globals.css"` to `import "../globals.css"`. There is no `not-found.tsx` today, so an unmatched URL renders Next's default 404 inside the marketing layout; with the layout inside a group, `/_not-found` has no root layout. Add `src/app/(site)/not-found.tsx` (a `PageBanner` "Page not found" and a line with a link home, inside the group so it gets the header and footer) and check `curl -I localhost:3000/nope` is 404 with the chrome after the build. If Next 16 asks for its `global-not-found` convention instead, use that and say so in the commit.

**Step 3: The gate still sees marketing.** `scripts/design-gate/walk.mjs:28` marks a file marketing when `dirs[0] === "app"` and no segment matches `appGroupRe`; `(site)` does not match, so nothing changes. `npm run check:design` and `npm run test:gate` green.

**Step 4: Scripts and docs.** `scripts/new-service.mjs` line 205: `src/app/${slug}` → `src/app/(site)/${slug}` (both occurrences). `CLAUDE.md` File Structure under `app/`: `(site)/  # every marketing page and the marketing root layout; (admin), (checkout) and (account) have their own root layouts`.

**Step 5: Verify.** The four commands, then `npm run manifest:compare`: `marketing routes and css unchanged`. Open `/`, `/pricing`, `/season-pass`, `/services/erie`, `/blog` and `/nope` in the browser pane at 1440 and 375.

**Step 6: Commit.** `Move the marketing pages into the (site) route group`

### Task 1.3: Root layouts for the app groups on one shared stylesheet

**Files:**
- Create: `src/app/app.css`, `src/app/app-css.test.ts`
- Create: `src/lib/fonts.ts`, `src/components/GoogleAnalytics.tsx`
- Create: `src/app/(admin)/layout.tsx`, `src/app/(checkout)/layout.tsx`, `src/app/(account)/layout.tsx`
- Modify: `src/app/(site)/layout.tsx` (fonts and GA from the shared modules)
- Modify: `scripts/check-design.mjs`, `scripts/design-gate/imports.mjs`, `scripts/check-design.test.mjs`
- Modify: `docs/DESIGN.md` (Three tiers)

**Step 1: Write the failing test.**

```ts
// src/app/app-css.test.ts
import { readFileSync } from "node:fs"
import { it, expect } from "vitest"

const css = readFileSync("src/app/app.css", "utf8")

it("app.css imports tailwind, the tokens and the base rules", () => {
  expect(css).toContain('@import "tailwindcss" source(none)')
  expect(css).toContain('@import "./tokens.css"')
  expect(css).toContain('@import "./base.css"')
})
it("app.css scans the app groups, blocks and ui, and nothing from marketing", () => {
  for (const s of ['@source "./(admin)"', '@source "./(checkout)"', '@source "./(account)"', '@source "../components/blocks"', '@source "../components/ui"'])
    expect(css).toContain(s)
  expect(css).not.toContain("(site)")
  expect(css).not.toContain("sections")
})
```

**Step 2: The stylesheet.**

```css
/* src/app/app.css
   The stylesheet for the app surfaces: /admin, the Season Pass checkout and
   the customer pass page. It shares tokens.css and base.css with the
   marketing site (globals.css) and scans only the app folders, so neither
   bundle carries the other's classes. */
@import "tailwindcss" source(none);
@import "./tokens.css";
@import "./base.css";
@source "./(admin)";
@source "./(checkout)";
@source "./(account)";
@source "../components/blocks";
@source "../components/ui";
@source "../lib/admin";
@source "../lib/pass";
```

**Step 3: Fonts and GA in shared modules.** `src/lib/fonts.ts` exports `display`, `body` (the two `next/font` calls from the site layout, at module scope) and `fontClassName`. `src/components/GoogleAnalytics.tsx` holds `GA_MEASUREMENT_ID` and the two `<Script>` tags. The site layout uses both; nothing else changes there.

**Step 4: The three root layouts.** `(admin)/layout.tsx`: `import "../app.css"`, `metadata` with `robots: { index: false, follow: false }`, `viewport: { viewportFit: "cover" }` (the tab bar's safe-area padding, a known gap), `<html className={fontClassName}><body className="font-sans antialiased bg-cream text-foreground">`. `(account)/layout.tsx`: the same, title `Season Pass`, no viewport export. `(checkout)/layout.tsx`: the same, `robots: { index: false }`, plus `<GoogleAnalytics />` so the purchase event in Task 8.6 has `gtag`.

**Step 5: The gate learns the server boundary.** The marketing flag in `walk.mjs` is `marketing`, not `zone`: pages under `app/(site)` have `zone: null` and `check-design.mjs:40` skips them before `checkImports`. So add a new check, `checkServerImports(file, text, report)` in `imports.mjs`, called from `check-design.mjs` for every file with `marketing === true` before the `if (!zone) continue` line: an import spec whose segments contain `db`, or `lib/jobber`, `lib/stripe`, `lib/messaging`, `lib/scheduling`, `lib/pass` (as path segments, so `lib/season-pass` passes) is `${file}: marketing code imports a server library (${spec})`. Tests in `check-design.test.mjs`: `app/(site)/pricing/page.tsx` importing `@/db` fails; `components/sections/Leak.tsx` importing `@/lib/stripe/client` fails; `app/(admin)/admin/page.tsx` importing `@/db` passes; `app/(site)/season-pass/page.tsx` importing `@/lib/season-pass` and `@/lib/flags` passes.

**Step 6: Verify.** `npm test -- app-css` PASS; `npm run test:gate`; the four commands; `npm run manifest:compare` unchanged. `docs/DESIGN.md` Three tiers: replace the "get their own stylesheet entry in the wiring phase" sentence with "Admin, checkout and account screens are served by their own root layouts on `src/app/app.css`, which scans only the app folders; `globals.css` keeps its `@source not` lines so the two bundles never overlap."

**Step 7: Commit.** `Give the app route groups their own root layouts on app.css`

### Task 1.4: The checkout route renders the prototype behind the flag

**Files:**
- Create: `src/lib/flags.ts`, `src/lib/flags.test.ts`
- Create: `src/app/(checkout)/season-pass/checkout/page.tsx`

**Step 1: Test first.** `checkoutEnabled()` is true only when `SEASON_PASS_CHECKOUT === "on"` (test unset, `"true"`, `"on"`).

**Step 2: The page.** `notFound()` unless the flag is on; `searchParams.zones` → `initialZones`; `const data = await getAdminData()`; render `<CheckoutFlow season={2027} initialZones={…} />` with the prototype's props as they are today (Phase 2 reshapes the flow; Phase 8 wires it). `export const dynamic = "force-dynamic"`.

**Step 3: Verify in the browser.** With the flag on, `/season-pass/checkout` at 1440 and 375 renders the cream canvas, the faint trail photo and the display-face question; walk the steps with the keyboard. Flag off: 404. `npm run build`, `npm run manifest:compare` unchanged; `.next/static/css` has two files and the marketing one matches the baseline.

**Step 4: Commit.** `Serve the checkout prototype at /season-pass/checkout behind a flag`

**Phase 1 close:** `npm run test:stories` green. PR for Phase 1 alone; after the deploy, open five marketing pages on the live site and compare with Task 1.2's screenshots.

---

## Phase 2: The prototype catches up with the scope change, in Storybook

Estimate: three days, ending with Hannah's approval. Nothing here touches a database; every task keeps `npm test`, `npm run test:stories` and the gate green and the marketing manifest unchanged. The order matters: the shared preference module first, then the type and fixture, then every screen that reads them, then the removals, then the two new screens.

### Task 2.1: Preferences as one shared module, with the freeze facts behind the wording

**Files:**
- Create: `src/lib/pass/preferences.ts`, `src/lib/pass/preferences.test.ts`
- Create: `src/lib/freeze-stats.ts`, `src/lib/freeze-stats.test.ts`
- Modify: `src/app/(site)/first-freeze-dates/page.tsx` (use `freeze-stats.ts` instead of its own `median`/`doy`)
- Modify: `scripts/freeze-dates.mjs` (add the last spring hard freeze per year)

**Step 1: Freeze stats, test first.** Lift `median`, `doy`, `fromDoy` and the per-station median from `first-freeze-dates/page.tsx:63-74` into `src/lib/freeze-stats.ts` exporting `hardFreezeMedians()` → `{ low: "October 14", high: "October 28" }` (the same `medianLow`/`medianHigh` the page prints) and `lastSpringFreezeMedians()` → the same shape or `null` while `FreezeYear` has no spring field. Tests: a hand-built station with five years gives the known median; the page's numbers are unchanged (snapshot the two strings the page renders today in the test so the move cannot drift them). Then add `lastSpringFreeze` (the last spring day at or below 28°F, `through` June 30) to `scripts/freeze-dates.mjs` and `FreezeYear`, run `npm run freeze-dates`, and `lastSpringFreezeMedians()` returns real dates. `src/lib/freeze-stats.ts` imports only `freeze-data.ts`, so it is importable from marketing and app code alike.

**Step 2: Preferences, test first.**

```ts
// src/lib/pass/preferences.test.ts
import { it, expect } from "vitest"
import { PREFERENCES, preferenceWindow, preferenceLabel, preferenceWhy, visitWindow, recommendedRange } from "./preferences"

it("words every choice for both visits", () => {
  expect(preferenceLabel("turn-on", "recommended")).toBe("First to second week of May")
  expect(preferenceLabel("turn-on", "earlier")).toBe("Late April")
  expect(preferenceLabel("turn-on", "later")).toBe("Late May")
  expect(preferenceLabel("blowout", "recommended")).toBe("Second week of October")
  expect(preferenceLabel("blowout", "earlier")).toBe("First week of October")
  expect(preferenceLabel("blowout", "later")).toBe("Late October")
})
it("the pass window strings name a month SeasonLine can read", () => {
  expect(visitWindow("turn-on", "earlier")).toBe("late April")
  expect(visitWindow("inspection")).toBe("July")
  expect(visitWindow("blowout", "later")).toBe("late October")
})
it("the recommended range is dated for a season", () => {
  expect(recommendedRange("turn-on", 2027)).toEqual({ start: "2027-05-01", end: "2027-05-14" })
  expect(recommendedRange("blowout", 2027)).toEqual({ start: "2027-10-08", end: "2027-10-14" })
})
it("the why lines carry the freeze facts", () => {
  expect(preferenceWhy("blowout")).toMatch(/first hard freeze usually/)
  expect(preferenceWhy("turn-on")).toMatch(/hard freeze/)
})
```

```ts
// src/lib/pass/preferences.ts
import { hardFreezeMedians, lastSpringFreezeMedians } from "@/lib/freeze-stats"

/** The customer's timing choice for the two visits that have one. July asks nothing. */
export type Preference = "earlier" | "recommended" | "later"
export type PreferenceKind = "turn-on" | "blowout"
export const PREFERENCES: readonly Preference[] = ["earlier", "recommended", "later"]

const LABELS: Record<PreferenceKind, Record<Preference, string>> = {
  "turn-on": { earlier: "Late April", recommended: "First to second week of May", later: "Late May" },
  blowout: { earlier: "First week of October", recommended: "Second week of October", later: "Late October" },
}
/** The window a visit lands in, for the pass row and SeasonLine: one month name, lowercase where it follows a word. */
const WINDOWS: Record<PreferenceKind, Record<Preference, string>> = {
  "turn-on": { earlier: "late April", recommended: "early May", later: "late May" },
  blowout: { earlier: "early October", recommended: "mid October", later: "late October" },
}
/** Day ranges inside the season windows (Settings can widen the outer windows; these sub-ranges are the recommendation). */
const RANGES: Record<PreferenceKind, Record<Preference, [string, string]>> = {
  "turn-on": { earlier: ["04-15", "04-30"], recommended: ["05-01", "05-14"], later: ["05-15", "05-31"] },
  blowout: { earlier: ["10-01", "10-07"], recommended: ["10-08", "10-14"], later: ["10-15", "10-31"] },
}

export const preferenceLabel = (kind: PreferenceKind, p: Preference) => LABELS[kind][p]
export function visitWindow(kind: "turn-on" | "inspection" | "blowout", p: Preference = "recommended"): string {
  return kind === "inspection" ? "July" : WINDOWS[kind][p]
}
export function preferenceWindow(kind: PreferenceKind, p: Preference, season: number) {
  const [s, e] = RANGES[kind][p]
  return { start: `${season}-${s}`, end: `${season}-${e}` }
}
export const recommendedRange = (kind: PreferenceKind, season: number) => preferenceWindow(kind, "recommended", season)

/** One line under each choice, true because it is computed from the NOAA record on /first-freeze-dates. */
export function preferenceWhy(kind: PreferenceKind): string {
  if (kind === "blowout") {
    const { low, high } = hardFreezeMedians()
    return `We recommend the second week of October because the first hard freeze usually arrives between ${low} and ${high} near our six towns.`
  }
  const spring = lastSpringFreezeMedians()
  return spring
    ? `We recommend early May because the last hard freeze of spring is usually past by ${spring.high}.`
    : "We recommend early May because the last hard freeze of spring is usually past by then."
}
/** "Turn-on: early May, blowout: second week of October", the pass card's and pass page's words. */
export function preferenceSentence(turnOn: Preference, blowout: Preference): string {
  return `Turn-on: ${preferenceLabel("turn-on", turnOn).toLowerCase()}, blowout: ${preferenceLabel("blowout", blowout).toLowerCase()}`
}
```

`src/lib/pass/` is listed in `app.css` and in the gate's server-library list; this file has no `server-only` and no secrets, and the marketing side never needs it (the `/season-pass` page keeps its own copy). Keep the server-only files of `src/lib/pass/` in their own subfolder from Phase 3 on (`src/lib/pass/server/`), so the gate's rule can name `lib/pass/server` and this module stays importable by stories.

**Step 3: Verify and commit.** `npm test -- preferences freeze`, the four commands, `npm run manifest:compare` (the freeze page's rendered strings are unchanged). Commit: `Add the timing preferences and the freeze statistics behind their wording`

### Task 2.2: `Pass` carries two preferences, the fixture follows, the blowout week goes

**Files:**
- Modify: `src/lib/admin/types.ts`, `src/lib/admin/fixtures/snapshot.json`, `src/lib/admin/fixtures/snapshot.test.ts`, `scripts/anonymise-snapshot.mjs`
- Modify: `src/lib/admin/metrics.ts`, `metrics.test.ts`, `metrics.snapshot.test.ts` (drop `spotsLeft`, drop every `BlowoutWeek` use)

**Step 1: Types.** On `Pass`: remove `blowoutWeek`; add `turnOnPreference: Preference`, `blowoutPreference: Preference` (import the type from `@/lib/pass/preferences`), `cardBrand?: string`, `smsConsent?: boolean`. On `PassVisit`: add `status?: VisitStatus`, `truckId?: string`, `jobberUrl?: string`, `exception?: string` (the words shown on a block that Ryan moved in Jobber), `firm?: boolean`. Remove `BlowoutWeek` and `AdminData.blowoutWeeks`. On `Attention`: replace `"week-full"` with `"moved-in-jobber"` and add `"jobs-failed"`'s sibling `"push-failed"`. Add `Truck { id; name; jobberUserId?: string; workingDays: number[]; visitsPerDay: Record<"turn-on" | "inspection" | "blowout", number> }`, `Area { id; name; towns: Town[]; springOrder: number; fallOrder: number }`, `ScheduledVisit { id; passId; number; firstName; town; kind; truckId?: string; day?: string; status: "proposed" | "scheduled" | "completed" | "cancelled"; firm: boolean; exception?: string; jobberUrl?: string }`, `OrganizationSettings` (the four Settings sections as typed objects: `capacity`, `windows`, `messages`, with trucks and areas in their own arrays) and `SettingsChange { id; at; by; path; from: string; to: string }`. `AdminData` gains `trucks`, `areas`, `scheduled: ScheduledVisit[]`, `settings: OrganizationSettings`, `settingsChanges: SettingsChange[]`.

**Step 2: The fixture.** In `scripts/anonymise-snapshot.mjs` the invented passes get `turnOnPreference` and `blowoutPreference` drawn to cover all nine combinations across the twelve, windows from `visitWindow`, no `blowoutWeek`; two trucks ("Truck 1", "Truck 2", working days Monday to Friday, visits per day 10/8/14), four areas (the brief's split, spring order Broomfield, Louisville + Lafayette, Longmont, Erie + Firestone; fall the reverse), `scheduled` with the twelve passes' thirty-six visits: the turn-ons of 2027 proposed across one May week on the two trucks by area, one of them with an `exception` ("Moved in Jobber from May 4 to May 6"), the rest unplanned; `settings` with the defaults from the brief (buffer 25 then 15 percent, first weeks 2, lead time 4, fall firm horizon 6 days, SMS off, reminder 5 pm); three `settingsChanges`. Regenerate `snapshot.json` (the script reads the git-ignored raw pull; if it is absent, edit the JSON by hand to the same shape and say so). `snapshot.test.ts` asserts the new fields and that no pass has `blowoutWeek`.

**Step 3: Metrics.** Delete `spotsLeft` and its tests; `committedByMonth` and `visitMonth` are unchanged because the window strings still name a month ("mid October" → 10). Run `npm test`: expect failures in every file the next three tasks fix; they are the to-do list.

**Step 4: Commit** once `npm test -- lib/admin` is green (the screens may still be red): `Replace the blowout week with two timing preferences on the pass`

### Task 2.3: Every screen reads the preferences; the October page, WeekCard and capacity go

**Files:**
- Delete: `src/app/(admin)/admin/_screens/OctoberScreen.tsx`, `OctoberScreen.stories.tsx`, `october-model.ts`, `october-model.test.ts`, `src/components/blocks/WeekCard.tsx`, `WeekCard.stories.tsx`, `WeekCard.test.tsx`
- Modify: `src/components/blocks/AdminShell.tsx` (+ stories, test), `PassCard.tsx` (+ test), `SeasonLine.tsx` (+ test), `data-grid-columns.tsx` (+ test, stories), `DataGrid.stories.tsx`, `SidePanel.stories.tsx`, `NeedsAttention.tsx`
- Modify: `src/app/(admin)/admin/_screens/PassesScreen.tsx`, `passes-model.ts` (+ tests, stories), `HomeScreen.stories.tsx`, `RevenueScreen.stories.tsx`, `home-model.test.ts`
- Modify: `src/app/(account)/account/pass/_screens/pass-page-model.ts`, `PassPageScreen.tsx` (+ tests, stories)
- Modify: `src/app/(checkout)/season-pass/checkout/_screens/checkout-state.ts`, `checkout-steps.tsx`, `CheckoutFlow.tsx` (+ tests, stories)
- Modify: `docs/DESIGN.md` (Approvals: October row struck through with the reason; WeekCard gone from the blocks list)

WeekCard goes with the week picker it was built for (the PRD's "Scheduling preference" withdraws the picker); nothing else uses it and the gate would otherwise carry a block without a screen.

**Step 1: AdminShell, test first.** `AdminSection` becomes `"home" | "schedule" | "passes" | "revenue" | "customers" | "settings"`; `NAV` in that order (Home `/admin`, Schedule `/admin/schedule` with `CalendarRange`, Passes, Revenue, Customers, Settings `/admin/settings` with `Settings` from lucide). Test: six items in that order, no October. Story unchanged otherwise.

**Step 2: PassCard, test first.** The band reads `preferenceSentence(pass.turnOnPreference, pass.blowoutPreference)` under the three visit windows; the `aria` description at `PassCard.tsx:45-47` says "blowout in the second week of October" instead of "reserved for the week of". Test the band text for the fixture's first pass.

**Step 3: SeasonLine customer dots, test first.** A dot sits in the month `visitMonth` gives (unchanged), and its label is the preference word when the visit has no date: "early May", "mid October" (from `visit.window`). Test: three dots at months 5, 7, 10 for a recommended pass; "late April" lands at 4.

**Step 4: Passes grid and panel, test first.** `data-grid-columns.tsx`: replace the `blowoutWeek` column with `turnOn` ("Turn-on", `preferenceLabel("turn-on", …)`) and `blowout` ("Blowout"), both sortable by the `PREFERENCES` order; CSV follows. `passes-model.ts`: drop `weekLabel`/`weekOptions`, add `preferenceOptions(kind)` for the filter chips. `PassesScreen`: filters are Town, Status, Turn-on, Blowout; `Facts` shows the two preference lines; `PassDetail` renders, under Charges, one "Open in Jobber" link per visit that has `jobberUrl` (closing the first known gap on the screen, not only in the type), the client link staying as "Open client in Jobber". Tests for the columns and the panel links.

**Step 5: Pass page, test first.** `pass-page-model.ts`: the `when` line for an undated visit is `preferenceLabel` in a sentence ("Second week of October, your preference"); `seasonCaption` for an unplanned blowout: "Your blowout is planned for the second week of October. We set the day in September and email you." `cardLine` reads `pass.cardBrand ?? "Card"`. Add the `lapsed` branch to `PassPageScreen` ("This pass was for the 2027 season. We'll email you about next season in January, or book any visit online.") and a `Lapsed` story; closes two known gaps.

**Step 6: The checkout, test first.** `STEPS` becomes seven: address, zones, `turn-on` ("When would you like your spring turn-on?"), `blowout` ("When would you like your fall blowout?"), contact ("Who should we reach?"), card, done. `CheckoutFields` gains `turnOnPreference: Preference` and `blowoutPreference: Preference`, both `"recommended"` in `initialState`, and `smsConsent: boolean` (false). `canContinue` on the two preference steps is always true (a choice is preselected). `toPass` reads the preferences and `visitWindow`. New `PreferenceStep({ kind, state, set })` in `checkout-steps.tsx`: three pressable rows (`aria-pressed`, the recommended one preselected and `data-autofocus`), each with the label and, under the recommended one, `preferenceWhy(kind)`; Enter moves on. `ContactStep` gains the SMS consent checkbox ("Text me the day before each visit. Reply STOP any time."), unchecked, with the `checkbox` primitive. The counter reads "of 7". `DoneStep`'s sentence: "Turn-on in early May, inspection in July, blowout in the second week of October. We'll email the details to …". Stories: `TurnOn`, `Blowout` replace `BlowoutWeek`; `Walkthrough` answers seven questions. Tests for the reducer and the step.

**Step 7: Remove October.** Delete the seven files, the `blowoutWeeks` reads in `HomeScreen.stories.tsx` and `RevenueScreen.stories.tsx`, and the `week-full` attention copy in `NeedsAttention` (the new kinds get their lines: "Moved in Jobber: Andrea's turn-on is now May 6" and "Could not push Andrea's blowout to Jobber; retrying"). `npm run check:design` must report no missing story and no leftover import.

**Step 8: Verify.** `npm test`, `npm run test:stories`, `npm run check:design`, `npx tsc --noEmit`, `npm run build`, `npm run manifest:compare`. Commit: `Read the timing preferences on every screen and remove the October planner`

### Task 2.4: The Settings screen in Storybook

**Files:**
- Create: `src/app/(admin)/admin/_screens/SettingsScreen.tsx`, `SettingsScreen.stories.tsx`, `settings-model.ts`, `settings-model.test.ts`
- Create: `src/components/blocks/ChangeLog.tsx`, `ChangeLog.stories.tsx`, `ChangeLog.test.tsx`
- Modify: `docs/DESIGN.md` (ChangeLog in the blocks list; a Settings paragraph under Copy: values are edited in place, saved per section, every save logged)

**Step 1: Model, test first.** `settings-model.ts`: `settingsContext(settings, trucks)` → "2 trucks, 4 areas. Spring window April 15 to May 31."; `truckRows(trucks)`, `areaRows(areas)`; `changeLine(change)` → "Hannah set capacity.blowout from 12 to 14, Nov 12 at 3:04 pm". `validateCapacity`, `validateWindows` (start before end, lead time 1 to 8 weeks, buffers 0 to 50 percent) return the problem words the screen shows.

**Step 2: The screen.** `PageHeader` "Settings" with the context line, then the `tabs` primitive with four tabs: Trucks (a small DataGrid of trucks with name, Jobber user, working days as Mon to Sun chips, visits per day by type, an "Add truck" row; trucks are unbounded), Areas (one card per area: name, the towns as chips, spring and fall order as numbers, "Add area"), Capacity and windows (a form in two columns: visits per truck-day by type, buffer first weeks and after, the three season windows as date pairs, lead time, fall firm days), Messages (SMS on or off, reminder send hour, the sender name, a read-only list of the message kinds with their subjects). Each tab has one Save button; `onSave?: (section, values) => Promise<void>` is the prop (stories `fn()`); the `ChangeLog` block under the tabs lists `settingsChanges` newest first. Stories: `Default`, `Phone`, `WithChanges` (twenty log rows), `NoDataYet` (no trucks: EmptyState "Add your first truck").

**Step 3: Verify.** `npm run test:stories`, gate green, the four commands. Commit: `Add the Settings screen as stories`

### Task 2.5: The Schedule screen in Storybook

**Files:**
- Create: `src/app/(admin)/admin/_screens/ScheduleScreen.tsx`, `ScheduleScreen.stories.tsx`, `schedule-model.ts`, `schedule-model.test.ts`
- Create: `src/components/blocks/ScheduleGrid.tsx`, `ScheduleGrid.stories.tsx`, `ScheduleGrid.test.tsx`, `schedule-grid-math.ts`, `schedule-grid-math.test.ts`, `VisitBlock.tsx`, `VisitBlock.stories.tsx`, `VisitBlock.test.tsx`
- Modify: `src/app/(admin)/admin/_screens/HomeScreen.tsx` (+ model, tests, stories): the `SeasonSetup` card
- Create: `src/components/blocks/SeasonSetup.tsx`, `SeasonSetup.stories.tsx`, `SeasonSetup.test.tsx`
- Modify: `docs/DESIGN.md` (three blocks; a Schedule paragraph under Charts: area colours are `chart-1` to `chart-4` in area order, hatching means proposed, a corner mark means moved in Jobber)

**Step 1: Grid math, test first.** `schedule-grid-math.ts`: `weekOf(day)` → the Monday to Sunday range; `cellsFor(visits, trucks, week)` → a map of `truckId:day` to the visits in it, each truck's non-working days flagged; `loadOf(cell, truck, kind)` → "6 of 10"; `areaTone(areaIndex)` → 1 to 4 (the chart token number, cycling). Tests for each.

**Step 2: The blocks.** `VisitBlock({ visit, tone, proposed, exception, onMove })`: a `rounded-lg` block, `bg-chart-N/15` with a `border-l-4 border-chart-N`, first name, town and visit type on two lines, proposed as a hatch (`bg-[image:repeating-linear-gradient(135deg,transparent,transparent_6px,currentColor_6px,currentColor_7px)] text-navy/30` on an inner layer; `currentColor` keeps the colour gate happy), an exception as a small orange corner mark with the note in a tooltip and in `aria-describedby`. Draggable (`draggable`, the HTML drag events) and, for the keyboard and screen readers, a "Move" menu (`dropdown-menu`) listing the other truck and the next seven days. `ScheduleGrid({ trucks, week, visits, areas, onMove })`: a CSS grid, one row per truck, seven day columns, a load line per cell, drop targets on every cell that is a working day, the phone variant one day at a time with Previous and Next. `SeasonSetup({ window, missing, onRun })`: the checklist card Home shows four to six weeks before a window opens: the settings that matter for that window with a check or a link to the Settings tab, ending in "Run the proposal".

**Step 3: The screen.** `PageHeader` "Schedule" with the context line ("Week of May 3. 24 proposed, 0 approved." or "Nothing proposed. The spring window opens May 1."), `actions`: Previous, Today, Next, and "Approve week" plus "Approve all" when anything is proposed; filter chips Truck and Area; the grid; under it "Moved in Jobber" as a list when any exception exists. Props: `data`, `week`, `onApprove(scope: "week" | "all")`, `onMove(visitId, truckId, day)`, `onPropose()`. Stories: `Default` (a proposed May week), `Approved`, `WithExceptions`, `Phone` (the day view), `NoDataYet`. `HomeScreen` gains the `SeasonSetup` card above the two columns when `seasonSetupFor(settings, today)` returns a window (test: six weeks before May 1 it returns spring; in July it returns nothing; five weeks before October 1 it returns fall).

**Step 4: Verify.** `npm run test:stories` (the a11y rule: every drop target and block is reachable by keyboard through the Move menu), gate green, the four commands. Commit: `Add the Schedule screen and its blocks as stories`

### Task 2.6: Hannah approves in Storybook

No code. `npm run storybook`; Hannah reviews `Screens/Checkout` (the two preference steps and the consent box), `Blocks/PassCard`, `Blocks/SeasonLine`, `Screens/Passes` (the columns and the panel links), `Screens/PassPage` (`Lapsed`), `Screens/Settings`, `Screens/Schedule`, `Blocks/SeasonSetup`, `Blocks/ChangeLog`. Add a row per screen to the Approvals table in `docs/DESIGN.md` with the date and her notes; a change request becomes a task appended to this phase. Nothing from Phase 7 on is wired until every row reads approved. Commit: `Hannah approved the preference, Settings and Schedule screens`

**Phase 2 close:** `npm run test:stories` green; `npm run manifest:compare` unchanged.

---

## Phase 3: Postgres with Drizzle

Estimate: two days.

### Task 3.1: Install, env, the database handle and a test database

**Files:**
- Modify: `package.json`, `vitest.config.mts` (the alias block at line 9)
- Create: `src/lib/env.ts`, `src/lib/env.test.ts`, `.env.example`
- Create: `drizzle.config.ts`, `src/db/index.ts`, `src/db/test-db.ts`, `src/db/types.ts`, `src/test/server-only.ts`

**Step 1: Install.** `npm i drizzle-orm @neondatabase/serverless dotenv` and `npm i -D drizzle-kit @electric-sql/pglite tsx`. Create the database through the Vercel Marketplace (Storage, Neon) so `DATABASE_URL` lands in the project; `vercel env pull .env.local`.

**Step 2: Env, test first.** `readEnv(["DATABASE_URL"])` throws `DATABASE_URL is not set` when missing and returns the values otherwise (two tests with `vi.stubEnv`). Every library calls `readEnv` inside the function that needs the value, never at import.

**Step 3: The handle and the test database.**

```ts
// src/db/index.ts
import "server-only"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { readEnv } from "@/lib/env"
import * as schema from "./schema"

let handle: ReturnType<typeof drizzle<typeof schema>> | undefined
/** The database, created on first use. Tests use testDb() and never import this file. */
export function db() {
  if (!handle) handle = drizzle(neon(readEnv(["DATABASE_URL"]).DATABASE_URL), { schema })
  return handle
}
```

```ts
// src/db/test-db.ts
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema"
/** An in-memory Postgres with the migrations applied; one per test file. */
export async function testDb() {
  const database = drizzle(new PGlite(), { schema })
  await migrate(database, { migrationsFolder: "drizzle" })
  return database
}
export type TestDb = Awaited<ReturnType<typeof testDb>>
```

`src/db/types.ts`: `export type Database = ReturnType<typeof db> | TestDb`. Every library function takes a `Database` first; routes and actions pass `db()`. `drizzle.config.ts` points at `./src/db/schema.ts`, out `./drizzle`, dialect `postgresql`. Scripts: `db:generate`, `db:migrate`, `db:studio`, `db:seed` (`tsx scripts/db-seed.ts`). In `vitest.config.mts` add `"server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url))` to the alias block; `src/test/server-only.ts` is `export {}`.

**Step 4: `.env.example`** with every variable from the table, one comment each.

**Step 5: Verify and commit.** The four commands, `npm run manifest:compare`. Commit: `Add Drizzle, the env reader and an in-memory test database`

### Task 3.2: The schema and the first migration

**Files:**
- Create: `src/db/schema.ts`, `src/db/schema.test.ts`
- Generate: `drizzle/0000_*.sql`

**Step 1: Write the failing test.** With `testDb()`: a `season_pass` for an unknown organization is refused; pass numbers are unique inside an organization; `queue_item` refuses a second row with the same `(kind, key)`; a `truck` row belongs to its organization; `pass_visit` refuses a second row with the same `(pass_id, kind)`.

**Step 2: The schema.** Enums named after the screen-facing types so the mapper never translates words: `town`, `admin_role` (owner, manager, tech), `pass_status` (pending, active, cancelled, lapsed), `pass_visit_kind` (turn-on, inspection, blowout), `pass_visit_status` (unscheduled, proposed, scheduled, completed, cancelled), `preference` (earlier, recommended, later), `charge_status` (pending, succeeded, failed), `visit_kind`, `quote_status`, `invoice_status`, `queue_kind` (jobber-webhook, stripe-webhook, pass-onboard, pass-push, pass-charge, pass-cancel, message, renewal-email, schedule-run, twilio-inbound), `message_channel` (email, sms), `message_status` (queued, sent, failed, skipped).

Tables, every one with `organization_id` referencing `organization.id` and `created_at`/`updated_at`:

- `organization`: `id`, `name`, `jobber_account_id`, `jobber_pass_field_id` (the custom field configuration id on that account), `jobber_pass_tag` (default `season-pass`), `settings jsonb` typed `OrganizationSettings` (one row of settings per organization: capacity, windows, messages; trucks and areas are their own tables).
- `settings_change`: `id`, `by_email`, `path` (`capacity.blowout`), `from`, `to`, `at`.
- `admin_user`: `id`, `email` unique, `name`, `initials`, `role`.
- `truck`: `id`, `name`, `jobber_user_id`, `working_days jsonb` (0 to 6), `visits_per_day jsonb` by kind, `active boolean`.
- `area`: `id`, `name`, `towns jsonb`, `spring_order int`, `fall_order int`.
- `season_pass`: `id`, `number`, `season`, `first_name`, `email`, `phone`, `address`, `town`, `zones`, `turn_on_preference`, `blowout_preference`, `status`, `sms_consent boolean`, `sms_consent_at`, `stripe_customer_id`, `stripe_payment_method_id`, `card_brand`, `card_last4`, `card_expires` (YYYY-MM), `jobber_client_id`, `jobber_property_id`, `renewed_from_id`, `renewal_asked_at`, `cancelled_at`; unique `(organization_id, number)`, index on `email` and `(organization_id, season)`.
- `pass_visit`: `id`, `pass_id`, `kind`, `window`, `amount int` (whole dollars, fixed at purchase), `status`, `preference` (null for the inspection), `truck_id`, `proposed_on date`, `proposed_truck_id`, `scheduled_on date`, `firm boolean`, `exception text`, `jobber_job_id`, `jobber_visit_id`, `jobber_job_url`, `jobber_invoice_id`, `pushed_at`, `completed_on date`, `charged_at`, `stripe_payment_intent_id`; unique `(pass_id, kind)`, index on `jobber_visit_id` and `(organization_id, scheduled_on)`.
- `charge`: `id`, `pass_id`, `pass_visit_id`, `attempt int`, `amount`, `status`, `stripe_payment_intent_id` unique, `failure_message`, `receipt_url`; unique `(pass_visit_id, attempt)`.
- `schedule_run`: `id`, `season`, `window` (turn-on, inspection, blowout), `proposed_at`, `approved_at`, `approved_by`, `mode` (approve, auto), `counts jsonb`.
- `message_log`: `id`, `pass_id`, `channel`, `kind` (purchase-confirmation, date-set, date-moved, day-before, receipt, card-failed, card-expiring, renewal, cancelled, sign-in), `to`, `subject`, `body`, `status`, `provider_id`, `error`, `sent_at`; unique `(kind, pass_id, key)` through a `key` column (the visit id and day for a reminder, the charge id for a receipt), so a replayed send is one row.
- `jobber_token`: `organization_id` PK, `access_token`, `refresh_token`, `expires_at`, `scopes`.
- `sync_run`: `id`, `started_at`, `finished_at`, `trigger`, `counts jsonb`, `cost_used`, `error`.
- `queue_item`: `id`, `kind`, `key`, `payload jsonb`, `attempts`, `run_after`, `claimed_at`, `done_at`, `error`; unique `(kind, key)`, index `(done_at, run_after)`.
- Jobber mirror, read-only, for non-pass totals and the Home list: `jobber_client`, `jobber_job`, `jobber_visit`, `jobber_quote`, `jobber_invoice`, each with `id`, `jobber_url`, `raw jsonb`, `synced_at` and the typed columns the mapper fills (names as in the first draft: `first_name`, `town`, `last_visit_at`; `client_id`, `title`, `pass_id`, `is_pass`; `job_id`, `kind`, `status`, `start_at`, `completed_at`; `total`, `sent_at`, `status`; `total`, `issued_at`, `due_at`, `status`, `paid_at`).
- Auth.js: `auth_user`, `auth_account`, `auth_session`, `auth_verification_token` in the adapter's shape.

Write it in `src/db/schema.ts` with Drizzle's `pgTable`, `pgEnum`, `uniqueIndex`, `index` and `primaryKey`, a shared `timestamps` object and an `org()` column helper, the way the first draft of this plan showed for `season_pass` and `queue_item`.

**Step 3: Generate and test.** `npm run db:generate`, commit `drizzle/`. `npm test -- schema` PASS. `npm run db:migrate` against Neon's development branch (create a `production` branch in Neon now and leave it empty; Task 13.2 migrates it).

**Step 4: Verify and commit.** The four commands, `npm run manifest:compare`. Commit: `Add the Season Pass schema and the first migration`

### Task 3.3: Seed, with the fixture passes optional, and the pass number

**Files:**
- Create: `src/lib/pass/number.ts`, `src/lib/pass/number.test.ts`
- Create: `src/db/seed.ts`, `src/db/seed.test.ts`, `scripts/db-seed.ts`

**Step 1: The pass number, test first.** `nextPassNumber(2027, ["TH-2027-0001", "TH-2027-0007", "TH-2026-0040"])` → `TH-2027-0008`; with none → `TH-2027-0001`.

**Step 2: The seed, test first.** `seed(db, snapshot, { organizationId, admins, passes: boolean, mirror: boolean })` inserts the organization, the admin users, the trucks, the areas and the settings from the snapshot always; the twelve passes with visits and charges only when `passes` is true; the mirror rows only when `mirror` is true. Idempotent (`onConflictDoNothing`). Tests: with `passes: true` twelve passes and thirty-six visits; with `passes: false` none and no fixture email in `season_pass`; twice changes nothing.

**Step 3: The script.** `scripts/db-seed.ts` builds its own handle (`drizzle(neon(url))`, so `server-only` is never imported by a script), reads `SEED_ADMINS` (`email:Name:role,…`) and `SEED_FIXTURE_PASSES=yes` to opt the fixture passes in. The development database gets them; the production branch never does (Task 13.2 runs the seed without the flag).

**Step 4: Verify and commit.** The four commands. Commit: `Seed the database from the fixture and number passes per season`

**Phase 3 close:** `npm run test:stories`.

---

## Phase 4: Sign-in

Estimate: one and a half days.

### Task 4.1: Auth.js with the Resend provider and the allow-list

**Files:**
- Modify: `package.json` (`next-auth@beta`, `@auth/drizzle-adapter`)
- Create: `src/auth.ts`, `src/lib/auth/allow.ts`, `src/lib/auth/allow.test.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Install.** `npm i next-auth@beta @auth/drizzle-adapter`. If npm refuses the peer range for Next 16, retry with `--legacy-peer-deps` and run the sign-in in Task 4.3; if `auth()` or the handlers fail under Next 16, replace Auth.js with a hand-rolled magic link (a `magic_link_token` table, a Resend email, a `jose`-signed cookie, about 150 lines in `src/lib/auth/`) behind the same `requireAdmin()` and `requireCustomer()` from Task 4.2, and record the choice in `docs/DESIGN.md` under Decisions.

**Step 2: The allow rule, test first.** `classify(email, admins, passHolders)` → `{ kind: "admin", role, organizationId }` for an admin (case-insensitive), `{ kind: "customer", organizationId }` for a pass holder's email, `null` otherwise. Three tests.

**Step 3: The config, as a function so nothing reads the database at import.**

```ts
// src/auth.ts
import "server-only"
import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { adminUser, authAccount, authSession, authUser, authVerificationToken, seasonPass } from "@/db/schema"
import { classify, type Principal } from "@/lib/auth/allow"
import { signInEmail } from "@/emails/sign-in"
import { sendEmailNow } from "@/lib/messaging/resend"

declare module "next-auth" {
  interface Session { principal: Principal; user: { email: string } }
}

async function principalFor(email: string) {
  const admins = await db().select().from(adminUser)
  const holders = (await db().select({ email: seasonPass.email }).from(seasonPass)).map((r) => r.email)
  return classify(email, admins, holders)
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(db(), { usersTable: authUser, accountsTable: authAccount, sessionsTable: authSession, verificationTokensTable: authVerificationToken }),
  session: { strategy: "jwt" },
  providers: [
    Resend({
      from: "Trailhead Lawn & Irrigation <no-reply@trailheadirrigation.com>",
      maxAge: 600,
      async sendVerificationRequest({ identifier, url }) {
        await sendEmailNow({ to: identifier, ...signInEmail({ url, kind: url.includes("/admin") ? "admin" : "customer" }) })
      },
    }),
  ],
  pages: { signIn: "/account/sign-in", verifyRequest: "/account/sign-in/sent", error: "/account/sign-in" },
  callbacks: {
    async signIn({ user }) {
      return !!user.email && (await principalFor(user.email)) !== null
    },
    async jwt({ token }) {
      if (token.email && !token.principal) token.principal = await principalFor(token.email)
      return token
    },
    session({ session, token }) {
      session.principal = token.principal as Principal
      return session
    },
  },
}))
```

`maxAge: 600` makes the link's "ten minutes" true. `src/emails/sign-in.ts` and `src/lib/messaging/resend.ts` arrive in Phase 6; this task creates both as stubs (`sendEmailNow` calling Resend directly with the `from`, `to`, `subject`, `text`, `html` it is given; `signInEmail` returning a plain subject and body), and Task 6.2 replaces them with the templated, logged versions. The route handler file exports `handlers`' `GET` and `POST`.

**Step 4: Verify and commit.** `npm test -- allow`; the four commands; `npm run manifest:compare`. Commit: `Add Auth.js with the Resend magic link and the email allow-list`

### Task 4.2: The proxy gate, the per-page check and `server-only` on `getAdminData`

**Files:**
- Create: `src/proxy.ts`, `src/proxy.test.ts`
- Create: `src/lib/auth/guard.ts`, `src/lib/auth/guard.test.ts`
- Modify: `src/lib/admin/data.ts`, `src/lib/admin/data.test.ts`
- Create: `src/lib/admin/live.ts` (a stub that throws "live admin data arrives in Task 5.7"), `src/lib/admin/__mocks__/data.ts`

**Step 1: The proxy, test first.** `gateFor(pathname, principal)` returns null to pass or the sign-in path with `?next=`: `/admin/*` needs `kind === "admin"` (the sign-in page itself passes); `/account/*` needs any principal; everything else passes. Five tests.

```ts
// src/proxy.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import type { Principal } from "@/lib/auth/allow"

// The first of the two gates (docs/DESIGN.md): the proxy checks the /admin and
// /account prefixes; every page and action checks the session again through
// src/lib/auth/guard.ts, because a proxy alone was bypassable in 2025
// (CVE-2025-29927). The matcher keeps it off every marketing route.
export function gateFor(pathname: string, principal: Principal | null | undefined): string | null {
  const next = `?next=${encodeURIComponent(pathname)}`
  if (pathname.startsWith("/admin")) return pathname.startsWith("/admin/sign-in") || principal?.kind === "admin" ? null : `/admin/sign-in${next}`
  if (pathname.startsWith("/account")) return pathname.startsWith("/account/sign-in") || principal ? null : `/account/sign-in${next}`
  return null
}

export default auth((request) => {
  const to = gateFor(request.nextUrl.pathname, request.auth?.principal)
  if (to) return NextResponse.redirect(new URL(to, request.nextUrl))
  const headers = new Headers(request.headers)
  headers.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
})

export const config = { matcher: ["/admin/:path*", "/account/:path*"] }
```

Next 16 names the file `proxy.ts`. The `x-pathname` header lets the admin layout know its section (Task 11.1).

**Step 2: The guard, test first.** `requireAdmin(minRole = "tech")` and `requireCustomer()` read `auth()` and `redirect()` when the principal is missing or the role too low (`tech < manager < owner`). Tests mock `@/auth` and `next/navigation`: an owner passes; a tech asking for manager redirects to `/admin?denied=1`; no session redirects to the sign-in page; a customer passes `requireCustomer` and fails `requireAdmin`.

**Step 3: `getAdminData` goes server-only.** First line `import "server-only"`; the `live` branch becomes `return (await import("./live")).getLiveAdminData(db(), "org_trailhead", new Date())`; `live.ts` is the stub above so the tree compiles. `__mocks__/data.ts` returns the snapshot for `vi.mock("@/lib/admin/data")`. In `data.test.ts` replace the two "not wired yet" tests with one that mocks `./live` and asserts `getAdminData("live")` resolves to it.

**Step 4: Verify and commit.** The four commands, `npm run manifest:compare`. Commit: `Gate /admin and /account in the proxy and on every page, and make getAdminData server-only`

### Task 4.3: Sign-in pages and the sign-in email

**Files:**
- Create: `src/components/blocks/SignInCard.tsx`, `SignInCard.stories.tsx`, `SignInCard.test.tsx`
- Create: `src/app/(admin)/admin/sign-in/page.tsx`, `src/app/(account)/account/sign-in/page.tsx`, `src/app/(account)/account/sign-in/sent/page.tsx`
- Create: `src/emails/sign-in.ts`, `src/emails/sign-in.test.ts` (replacing the Task 4.1 stub)

**Step 1: The block, test first, then approval.** `SignInCard({ title, line, action, error? })`: the badge logo, the title in the display face, one email input (`data-autofocus`, `autoComplete="email"`, required), one button "Email me a link", an optional error line, inside a `Card` centred on the cream canvas. Stories `Admin`, `Customer`, `Sent` ("Check your email for the link. It works once and for ten minutes."), `Denied` ("That email is not on the list."), `Phone`. Hannah approves the block in Storybook before step 2 (a row in the Approvals table).

**Step 2: The pages.** Each is a server component with an inline server action calling `signIn("resend", { email, redirectTo: next })`; the admin page's words are "Sign in to the dashboard" and "Hannah and Ryan only. We email you a link."; the customer page's "Open your Season Pass" and "Enter the email you used at checkout and we send you a link."; `?email=` prefills the field (the confirmation email links here). A session with the right principal redirects to `next`. `?error=AccessDenied` renders the `Denied` line.

**Step 3: The email, test first.** `signInEmail({ url, kind })` → `{ subject: "Your Trailhead sign-in link", text, html }` with the link on its own line and "It works once and for ten minutes. If you did not ask for it, ignore this email." Test the subject and that the url is in both bodies.

**Step 4: Verify in the browser.** With `.env.local` set and the seeded admin emails: `/admin` redirects to the sign-in page; the seeded address gets the email (Resend logs if the inbox is slow); the link lands on `/admin` (a 404 until Phase 11; the proxy letting it through is the proof); a stranger's email shows the Denied line. `npm run build`, `npm run manifest:compare`.

**Step 5: Commit.** `Add the sign-in pages and the sign-in email`

**Phase 4 close:** `npm run test:stories`; `npm run check:design` lists `SignInCard` with its story.

---

## Phase 5: Jobber as the field display: OAuth, client, push, signals, mirror, live data

Estimate: three days.

### Task 5.1: OAuth: connect, callback, token refresh

**Files:**
- Create: `src/lib/jobber/oauth.ts`, `src/lib/jobber/oauth.test.ts`
- Create: `src/app/api/jobber/connect/route.ts`, `src/app/api/jobber/callback/route.ts`

**Step 1: Test first.** `authorizeUrl({ clientId, redirectUri, state })` builds `https://api.getjobber.com/api/oauth/authorize?client_id=…&redirect_uri=…&state=…&response_type=code`; `tokenFromResponse(json, now)` maps `access_token`, `refresh_token`, `expires_in` to the row; `needsRefresh(token, now)` is true inside two minutes of expiry.

**Step 2: Implement.** `exchangeCode` and `refresh` POST form-encoded to `https://api.getjobber.com/api/oauth/token` and upsert `jobber_token`; always store the refresh token that comes back (Jobber may rotate it). `connect/route.ts` requires an owner, signs `state` (HMAC of organization id and timestamp with `AUTH_SECRET`) and redirects; `callback/route.ts` verifies `state`, exchanges the code, stores the token, reads `{ account { id } }` into `organization.jobber_account_id` and redirects to `/admin?connected=jobber`.

**Step 3: Verify and commit.** Callback URLs set in the Developer Center for production and `localhost:3000`; connect as owner, land on `/admin?connected=jobber`, see the token row. Commit: `Connect Jobber by OAuth and keep the token fresh`

### Task 5.2: The GraphQL client with the cost budget, and ids

**Files:**
- Create: `src/lib/jobber/client.ts`, `client.test.ts`, `src/lib/jobber/ids.ts`, `ids.test.ts`

**Step 1: Ids, test first.** Jobber ids are base64 of `gid://Jobber/Client/156368396`; `decodeGid` returns `{ type, number }`; `webUrl(id)` builds the `secure.getjobber.com` link per type (the fallback when a query lacks `jobberWebUri`).

**Step 2: The client, test first.** `jobberQuery(db, organizationId, document, variables)`: reads and refreshes the token, POSTs to `https://api.getjobber.com/api/graphql` with the bearer and `X-JOBBER-GRAPHQL-VERSION`, returns `data`, reads `extensions.cost.throttleStatus` and waits `(requestedQueryCost - currentlyAvailable) / restoreRate` seconds when short, throws `JobberError` on `errors`, retries once on `THROTTLED`. Tests with a stubbed `fetch` and fake timers.

**Step 3: Verify and commit.** `Add the Jobber GraphQL client with the cost budget`

### Task 5.3: The push adapter: client, property, job, scheduled visit, move, cancel

This is the one-way write the revised system of record describes. Every mutation's exact input comes from the facts doc; nothing outside this file knows them.

**Files:**
- Create: `src/lib/jobber/push.ts`, `src/lib/jobber/push.test.ts`

**Step 1: Test first**, with a fake `query` that records the mutations it is asked for:

- `findOrCreateClient(query, org, { firstName, email, phone, address, town })`: searches clients by email, else `clientCreate` with the email and phone as the client's own contact (so, if Jobber's reminders stay on, they reach the same address and number the app uses) and `propertyCreate` with `"<address>, <Town>, CO"`; returns `{ clientId, propertyId, clientUrl }`. Test: existing reused; new created with the address.
- `createPassJob(query, org, { pass, visit })`: one `jobCreate`, unscheduled, title `Season Pass turn-on, early May preference, 8 zones, TH-2027-0001` (the preference words from `preferenceLabel`; the inspection says "July"), `customFields` with `org.jobber_pass_field_id` and the pass id, the `org.jobber_pass_tag` tag, instructions "Season Pass visit. Do not collect payment; the card on file is charged after completion.", and, when `JOBBER_FACTS.notificationsPerJob`, the notification flag off; returns `{ jobId, jobUrl }`.
- `scheduleVisit(query, org, { jobId, visitId?, day, truck, kind })`: with `scheduleWrite: "visit"` it is part of `createPassJob` (the test asserts the day and user on the create); with `"edit"` it is the `moveMutation` with start `day` at the kind's default start (8:00 Mountain) and duration (turn-on 45, inspection 45, blowout 30 minutes; the settings may override), assigned to `truck.jobberUserId`; returns `{ visitId }`.
- `moveVisit(query, org, { visitId, day, truck })`: the same mutation; used by the Schedule page's drag.
- `cancelPassJobs(query, org, jobIds)`: with `jobCancelByApi` the cancel mutation per job; else a note on each ("Season Pass cancelled on <date>; please remove this job") and a `message` to Ryan with the links.

**Step 2: Verify and commit.** `Add the Jobber push adapter for pass jobs and visits`

### Task 5.4: The read side: the mirror sync for non-pass totals

**Files:**
- Create: `src/lib/jobber/queries.ts`, `src/lib/jobber/map.ts`, `map.test.ts`, `src/lib/jobber/sync.ts`, `sync.test.ts`
- Create: `src/app/api/cron/jobber-sync/route.ts`, `vercel.json`
- Modify: `scripts/anonymise-snapshot.mjs` (import the pure mappers)

**Step 1: Mappers, test first.** Move `town`, `kindOf`, the visit and quote status folds from `scripts/anonymise-snapshot.mjs` into `map.ts` with the same behaviour and tests per rule; `toClientRow`, `toJobRow`, `toVisitRow`, `toQuoteRow`, `toInvoiceRow` from sample nodes pasted from GraphiQL (anonymised); `isPass` from the tag or the custom field; dollars rounded whole.

**Step 2: Queries.** One document per object with cursor pagination and an `updatedAt` filter, written in GraphiQL first and pasted into the facts doc with a sample response; page sizes inside the cost budget.

**Step 3: Sync, test first.** `runSync(db, org, { query, now, trigger })` opens a `sync_run`, pulls each object since the last finished run, upserts the mirror (`onConflictDoUpdate`), records counts and cost, closes the run; an error lands in `error` and earlier rows stay. For a pass job the mirror row is written too (`is_pass`, `pass_id`) but **no pass_visit field is ever written by the sync**; the two signals in Task 5.5 are the only path from Jobber into a pass. Tests with a fake query.

**Step 4: The route and the cron.** `GET /api/cron/jobber-sync` checks `Authorization: Bearer <CRON_SECRET>`, runs the sync, returns the counts; `maxDuration = 300`. `vercel.json` for Pro: sync `*/15 * * * *`, drain `*/5 * * * *` (Task 5.5), schedule `0 13 * * *` (Task 9.4), renewals `0 15 1 1 *` and lapse `0 15 1 4 *` (Task 12.2; add those lines then). On Hobby: sync and drain once a day and say so under Decisions in `docs/DESIGN.md`; the webhooks carry freshness.

**Step 5: Verify and commit.** `curl` the route locally with the secret; rows in Studio. Commit: `Pull non-pass clients, jobs, visits, quotes and invoices from Jobber on a schedule`

### Task 5.5: The queue with a claim step, the Jobber webhook and the two signals

**Files:**
- Create: `src/lib/queue/index.ts`, `index.test.ts`, `src/lib/queue/handlers.ts`, `handlers.test.ts`
- Create: `src/lib/jobber/webhook.ts`, `webhook.test.ts`, `src/lib/jobber/signals.ts`, `signals.test.ts`
- Create: `src/app/api/webhooks/jobber/route.ts`, `src/app/api/cron/drain/route.ts`

**Step 1: The queue, test first.** `enqueue(db, { organizationId, kind, key, payload, runAfter? })` inserts with `onConflictDoNothing` and returns whether it inserted. `claimNext(db, now)` is one statement: `UPDATE queue_item SET claimed_at = now(), attempts = attempts + 1 WHERE id = (SELECT id FROM queue_item WHERE done_at IS NULL AND run_after <= now() AND (claimed_at IS NULL OR claimed_at < now() - interval '10 minutes') ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`. `drain(db, handlers, { now, limit })` claims and runs items until none is due or the limit is hit; success sets `done_at`; failure stores the error and `run_after = now + 2^attempts minutes`, and after eight attempts leaves the item for the attention list. Tests: a duplicate key inserts nothing; two concurrent drains on PGlite (two `drain` calls started without awaiting the first) run each item once; a failing handler is retried later; order.

**Step 2: Webhook verification, test first.** `verifyJobberSignature(body, header, secret)` is the base64 HMAC-SHA256 of the raw body with the client secret, compared with `timingSafeEqual`; `parseWebhook(body)` reads `data.webHookEvent.{topic, itemId, accountId, occurredAt}`. Tests with a computed signature, a wrong one and a body with one extra byte.

**Step 3: The route.** `POST /api/webhooks/jobber`: `request.text()`, verify (401 on failure), `enqueue` as `jobber-webhook` with key `${topic}:${itemId}:${occurredAt}` for the organization whose `jobber_account_id` matches `accountId`, `after(() => drainAll(db()))`, return `{ ok: true }`. `drainAll` in `handlers.ts` calls `drain` with the handler table; every handler not yet written is `notYet` (throws "handler arrives in a later task"), replaced task by task. `GET /api/cron/drain` is the cron shape and calls `drainAll` after `expirePendingPasses` (Task 8.2).

**Step 4: The two signals, test first.** `handleJobberSignal(db, org, query, event)` in `signals.ts`, the `jobber-webhook` handler: re-reads the item from Jobber by topic. For `visitComplete` on a visit whose job is a pass job (the custom field or the mirror's `pass_id`): set `pass_visit.jobber_visit_id` if empty, `completed_on` (Mountain day), `status = completed`, and enqueue `pass-charge` with key `visit:<pass_visit.id>`. For `visitUpdate` on a pass visit: compare Jobber's start day and assigned user with `scheduled_on` and `truck_id`; when they differ, adopt them (`scheduled_on`, `truck_id` by `jobber_user_id`), set `exception` to "Moved in Jobber from May 4 to May 6" (or "Reassigned in Jobber to Truck 2"), and enqueue `message` kind `date-moved` with key `visit:<id>:<new day>`; when they match (the app's own push echoing back) do nothing. For the non-pass topics: refresh the mirror row. Any other topic: done, no effect. Tests with a fake query: the completed signal sets the fields and enqueues one charge, twice enqueues one; a moved visit records the exception and one message; the echo of the app's own push is silent; a non-pass visit touches only the mirror.

**Step 5: Verify and commit.** Subscribe the topics in the Developer Center to the live URL; locally, `curl` with a signature from `node -e`; a replayed curl inserts nothing. Commit: `Receive Jobber webhooks into a claimed queue and read back the two pass signals`

### Task 5.6: `getAdminData("live")`

**Files:**
- Modify: `src/lib/admin/live.ts` (replace the stub), `src/lib/admin/live.test.ts`
- Create: `src/lib/pass/server/screen.ts` (`toScreenPass(row, visits)` shared with the checkout and the pass page)
- Modify: `src/lib/admin/fixtures/snapshot.test.ts` (export the shape assertions as `assertAdminDataShape` from `src/lib/admin/shape.ts`)

**Step 1: Test first**, with `testDb()` seeded (`passes: true, mirror: true`): the result passes `assertAdminDataShape`; `clients` from the mirror with `hasPass` from active passes by `jobber_client_id`; `visits` for Home from two sources, the app's pass visits (scheduled or completed, with `isPass: true`, the truck, the pass's name and town) and the mirror's non-pass visits, in a window of seven days back and thirty ahead; `quotes` and `invoices` from the mirror (`overdue` computed); `passes` with visits in kind order, `scheduledAt` as the `date` column's `YYYY-MM-DD`, per-visit `jobberUrl`, `cardBrand`; `pending` passes left out; `trucks`, `areas`, `settings`, `settingsChanges`, `scheduled` from `pass_visit` for the season; `monthTotals` from paid mirror invoices by Mountain month this year and last; `attention` from failed charges (30 days), queue items at eight attempts (`jobs-failed` for `pass-onboard`, `push-failed` for `pass-push`), visits with an `exception` in the last 14 days (`moved-in-jobber`), cards expiring before the season's October (`card-expiring`); `syncedAt` the later of the last sync and the newest done queue item.

**Step 2: Verify.** `ADMIN_DATA_SOURCE=live`; `npm run dev`; a temporary log in the checkout page shows the live payload loads (remove it). The four commands, `npm run manifest:compare`. Commit: `Read admin data from the database`

**Phase 5 close:** `npm run test:stories`. On the tester account: complete a visit on a pass job created by hand with the tag and see `pass_visit.completed_on` land through the webhook.

---

## Phase 6: Messaging: every customer message from the app

Estimate: two days. Separate from the scheduler so each can ship and be judged on its own.

### Task 6.1: Senders, the log and the `message` handler

**Files:**
- Modify: `package.json` (`twilio`)
- Create: `src/lib/messaging/resend.ts` (replacing the Task 4.1 stub), `src/lib/messaging/twilio.ts`, `src/lib/messaging/send.ts`, `send.test.ts`, `src/lib/messaging/log.ts`
- Create: `src/app/api/webhooks/twilio/route.ts`, `src/lib/messaging/inbound.ts`, `inbound.test.ts`

**Step 1: Test first.** `queueMessage(db, { organizationId, passId, kind, key, channels: ("email" | "sms")[], to: { email, phone }, content })` writes one `message_log` row per channel with status `queued` (unique on kind, pass and key, so a replay adds nothing) and enqueues one `message` item per row. The `message` handler loads the row, skips (`status = skipped`, reason) when the channel is SMS and the pass has no consent or the Messages setting is off, sends through Resend or Twilio, stores the provider id and `sent_at`, or the error. Tests with fake senders: email sent and logged; SMS skipped without consent; the same `queueMessage` twice makes one row.

**Step 2: Inbound SMS.** `POST /api/webhooks/twilio` validates Twilio's signature (`twilio.validateRequest` with the auth token and the full URL), enqueues `twilio-inbound` with key the `MessageSid`; the handler reads `Body`: STOP, UNSUBSCRIBE, CANCEL, END, QUIT set `sms_consent = false` on every pass with that phone and log a `skipped` row; START re-enables; anything else is logged as an inbound row for Hannah (the admin Messages view is a later plan). Twilio's own Advanced Opt-Out also blocks sends after STOP; the app's flag is the record. Tests for the parse and the flag.

**Step 3: Verify and commit.** `npm test -- messaging`; Twilio test credentials send to a verified number. Commit: `Send and log customer messages through Resend and Twilio with STOP handling`

### Task 6.2: The templates, in Trailhead's voice, tested on their wording

**Files:**
- Create: `src/emails/purchase-confirmation.ts`, `date-set.ts`, `date-moved.ts`, `day-before.ts`, `receipt.ts`, `card-failed.ts`, `card-expiring.ts`, `renewal.ts`, `cancelled.ts`, `admin-alert.ts`, `sign-in.ts` (moved from Task 4.3), each with a `.test.ts`
- Create: `src/sms/purchase-confirmation.ts`, `date-set.ts`, `date-moved.ts`, `day-before.ts`, `receipt.ts`, each with a `.test.ts`
- Create: `src/emails/layout.ts` (one HTML frame: the badge logo, cream background, Barlow Condensed falls back to Arial Narrow in mail clients), `src/emails/layout.test.ts`
- Modify: `scripts/check-design.mjs` (the colour rule runs on `src/emails` too; the frame uses the token hex values by name in one constants block, allowed by a comment the gate recognises, since email cannot read CSS variables)

Every template is a pure function `(args) => { subject, text, html }` or `(args) => string` for SMS, under 160 characters where it can be. The words, each tested:

- **Purchase confirmation** (email, SMS short): "Your Season Pass is reserved." Three lines: "Spring turn-on: early May (your preference)." "Mid-season inspection: July." "Fall blowout: second week of October (your preference)." Then "We set each day a few weeks ahead and email you the date. Your card is charged after each visit." The pass number, the pass page link (`/account/sign-in?email=`), and the holographic pass card artwork as a static image (DESIGN.md: the holographic art is for the email, where nothing moves) with the details as text under it.
- **Date set**: "Your spring turn-on is on Tuesday, May 5." with "Your street is on our Erie day." when the area has more than one town ("Erie and Firestone day"), the truck's name, and "Reply to this email or call if that day does not work."
- **Date moved**: the old and the new day in one sentence, no reason.
- **Day before**: "Ryan's truck is in Erie tomorrow, Tuesday. No need to be home; please leave the side gate unlocked." The gate line is a per-pass note in a later plan; for now the fixed line.
- **Receipt**: "$145 for the spring turn-on on May 5, charged to the Visa ending 4242." then "Next up: your mid-season inspection in July." (or the blowout with its preference words, or "That was the last visit of the season. We'll email you in January about 2028.").
- **Card failed**: what to do first: "Update your card here and we try again the same day." with the link; then the amount and the visit.
- **Card expiring**: "The card ending 4242 expires before your October blowout. Update it here so the visit stays on the schedule."
- **Renewal**: "Your 2028 Season Pass: confirm your preferences" with one link, the zones and the card.
- **Cancelled**: "Your pass is cancelled. Nothing further is charged."
- **Admin alert**: to Ryan and Hannah: "New Season Pass: Andrea, Erie, 8 zones" with the Jobber links; "Charge failed: Andrea, Erie, spring turn-on"; "Jobber jobs for pass TH-2027-0007 were not created" (sent on the **first** failure, not the eighth); "Moved in Jobber: Andrea's turn-on is now May 6".

Tests assert the subject, that every number and day comes from the arguments, and that no template contains an exclamation mark or an em dash.

**Step 2: Verify and commit.** `npm test -- emails sms`. Commit: `Write every customer and admin message as a tested template`

### Task 6.3: The automatic card-expiry message

**Files:**
- Create: `src/lib/pass/server/card-expiry.ts`, `card-expiry.test.ts`
- Modify: `src/app/api/cron/drain/route.ts` (one daily step)

`cardExpiryMessages(db, org, now)`: for every active pass whose `card_expires` is before the season's October and more than 60 days have not passed since the last `card-expiring` row for it, queue the message with the card-update link (Task 7.3) and key `<card_expires>`. The drain route runs it once a day (it checks `sync_run`-style whether it ran today). Also called from the Stripe `payment_method.detached` handler (Task 7.5). Tests: an expiring card gets one message; a fresh card none; a second run the same month none.

Commit: `Email a customer before the card on file expires`

**Phase 6 close:** `npm run test:stories` (nothing visual changed; the gate's colour rule over `src/emails` is the new check).

---

## Phase 7: Stripe

Estimate: two days.

### Task 7.1: The Stripe client, customers and the setup-mode Checkout Session

**Files:**
- Modify: `package.json` (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`)
- Create: `src/lib/stripe/client.ts`, `src/lib/stripe/checkout.ts`, `checkout.test.ts`

**Step 1: Test first.** `createSetupSession(stripe, { passId, customerId?, email, name, origin, expiresAt })` creates the customer when none (`email`, `name`, `metadata.passId`) and a Checkout Session with `mode: "setup"`, `ui_mode: "embedded"`, `customer`, `currency: "usd"`, `redirect_on_completion: "never"`, `payment_method_types: ["card"]`, `expires_at` (Stripe's minimum is 30 minutes ahead; the pending pass expires after 60, Task 8.2), `metadata.passId`; returns `{ customerId, sessionId, clientSecret }`. `paymentMethodFromSession(stripe, sessionId)` expands `setup_intent.payment_method` and returns `{ paymentMethodId, brand, last4, expires: "YYYY-MM" }`. Tests with a fake `stripe` object.

```ts
// src/lib/stripe/client.ts
import "server-only"
import Stripe from "stripe"
import { readEnv } from "@/lib/env"
let instance: Stripe | undefined
export function stripe() {
  if (!instance) instance = new Stripe(readEnv(["STRIPE_SECRET_KEY"]).STRIPE_SECRET_KEY)
  return instance
}
```

(The installed package pins its own API version; do not pass one.)

**Step 2: Verify and commit.** `Add the Stripe client and the setup-mode Checkout Session`

### Task 7.2: Marking the Jobber invoice paid, behind the adapter

Written before the charge so Task 7.3 compiles against it.

**Files:**
- Create: `src/lib/jobber/invoice-paid.ts`, `invoice-paid.test.ts`
- Modify: `src/lib/jobber/signals.ts` (the `invoiceCreate` branch)

`markInvoicePaid(db, query, org, { passVisit, charge })`: with `invoicePayment: "api"`, find the invoice for the visit's job (mirror or a query) and run the recorded mutation with the amount and the note "Paid by card through the Season Pass, Stripe <intent id>"; with `"manual"`, add the note to the job ("Season Pass: paid by card, Stripe receipt <url>. Mark the invoice paid.") and queue an `admin-alert` to Ryan with the same line. When no invoice exists yet (Jobber creates it after completion), do nothing; the `invoiceCreate` signal on a pass job whose visit is charged calls `markInvoicePaid` then. Tests under each setting with `vi.mock("./facts")`.

Commit: `Mark the Jobber invoice paid after a Season Pass charge`

### Task 7.3: Charging a visit off-session, the receipt, the failure, and the card-update link

**Files:**
- Create: `src/lib/stripe/charge.ts`, `charge.test.ts`, `src/lib/stripe/card-update.ts`, `card-update.test.ts`
- Create: `src/lib/pass/server/charge-visit.ts`, `charge-visit.test.ts`
- Create: `src/app/(account)/account/pass/card-updated/page.tsx`
- Modify: `src/lib/queue/handlers.ts` (`pass-charge`)

**Step 1: The Stripe call, test first.** `chargeOffSession(stripe, { customerId, paymentMethodId, amount, description, passVisitId, attempt })` creates a PaymentIntent (`amount * 100`, `usd`, `customer`, `payment_method`, `off_session: true`, `confirm: true`, `metadata.passVisitId`) with the idempotency key `pass-visit-${passVisitId}-${attempt}`: a new attempt after a card update is a new key, so Stripe does not replay the decline. Returns `{ ok: true, paymentIntentId, receiptUrl }` or `{ ok: false, paymentIntentId?, message }` from a `StripeCardError`.

**Step 2: The orchestration, test first.** `chargeVisit(db, deps, { passVisitId })`:
1. load the visit and its pass; done when the visit has `charged_at` or a `succeeded` charge (the once-per-visit rule);
2. if the pass is not `active`, done, and an admin alert ("completed a visit on a cancelled pass");
3. `attempt = (max attempt so far) + 1`; insert the `charge` row `pending` for `(visit, attempt)`; call `chargeOffSession` with the visit's stored `amount` and the pass's current payment method;
4. success: charge `succeeded` with intent and receipt, `pass_visit.charged_at`, `status = completed`, queue the `receipt` message (with the next visit's words from `preferences.ts`), call `markInvoicePaid`;
5. failure: charge `failed` with the message, queue `card-failed` to the customer with the card-update link and the admin alert; no further attempt until the customer updates the card.
Tests with `testDb()`: success writes everything once and a second call does nothing; failure writes `failed`, two messages, no retry; a cancelled pass charges nothing; an update then a retry uses attempt 2.

**Step 3: The card-update link, test first.** `createCardUpdateSession(stripe, { passId, customerId, origin })`: a hosted setup session with `success_url …/account/pass/card-updated?session_id={CHECKOUT_SESSION_ID}`, `cancel_url …/account/pass`, `metadata.purpose = "card-update"`. `applyCardUpdate(db, stripe, sessionId)`: store the new method and card fields, set it as the customer's default, detach the old method, and when the pass has a `failed` charge with no later success, enqueue `pass-charge` for that visit with key `visit:<id>:attempt:<n+1>`; idempotent on the session id. `card-updated/page.tsx` requires a customer, calls `applyCardUpdate`, redirects to `/account/pass?card=updated`. Tests: the stored fields; one retry; a second apply does nothing.

**Step 4: Handler, verify, commit.** `pass-charge` calls `chargeVisit`. `npm test -- charge card-update`; the four commands. Commit: `Charge the saved card after a completed pass visit, with the receipt, the failure email and the card update`

### Task 7.4: The Stripe webhook

**Files:**
- Create: `src/lib/stripe/webhook.ts`, `webhook.test.ts`, `src/app/api/webhooks/stripe/route.ts`

`handleStripeEvent(db, stripe, event)`: `checkout.session.completed` with `purpose === "card-update"` → `applyCardUpdate`, otherwise → `completeCheckout` (Task 8.3; until then the `notYet` stub, so the item retries); `payment_intent.succeeded` / `payment_failed` → reconcile the `charge` row by intent id; `payment_method.detached` → clear the pass's method, queue `card-expiring` through Task 6.3's function. The route: `request.text()`, `constructEvent` with `STRIPE_WEBHOOK_SECRET` (400 on failure), enqueue `stripe-webhook` keyed on `event.id`, `after(drainAll)`. Register the endpoint in the dashboard (test mode first); `stripe listen --forward-to localhost:3000/api/webhooks/stripe` locally. Tests with event fixtures.

Commit: `Receive Stripe webhooks into the queue`

**Phase 7 close:** `npm run test:stories`.

---

## Phase 8: The checkout route, wired

Estimate: two days.

### Task 8.1: The season

**Files:**
- Create: `src/lib/pass/season.ts`, `season.test.ts`

`currentSeason("2027-03-01")` → 2027; `"2027-11-15"` → 2028; `"2027-10-31"` → 2027. Commit: `Derive the season from the date`

### Task 8.2: The pending pass

**Files:**
- Create: `src/lib/pass/server/create.ts`, `create.test.ts`
- Modify: `src/app/api/cron/drain/route.ts` (`expirePendingPasses` first)

**Step 1: Test first.** `createOrUpdatePendingPass(db, fields, { organizationId, season, now, passId? })` validates with the reducer's `canContinue` for the first five steps (imported from `checkout-state.ts`, so server and client share one rule); with a `passId` whose row is still `pending` for the same email it updates that row instead of inserting (a customer who goes back and continues again holds one pending pass, not two); otherwise inserts `season_pass` as `pending` with the number from `nextPassNumber`, the two preferences, `sms_consent` and `sms_consent_at`, and the three `pass_visit` rows with `amount` from `visitPrice`, `window` from `visitWindow`, `preference` (null for the inspection), status `unscheduled`. `pendingCountFor(db, email, now)` counts pending passes for that email in the last hour; `beginCheckout` refuses at three. `expirePendingPasses(db, now)` deletes `pending` passes older than 60 minutes and their visits (the Stripe session from Task 7.1 expires at 30 minutes, so an expired session can never complete against a deleted pass). Tests: insert, update in place, three visits with the right amounts for 8 zones (145, 145, 115), an invalid town refused, expiry removes the visits.

**Step 2: Verify and commit.** `Create and expire the pending pass`

### Task 8.3: Server actions: begin and complete

**Files:**
- Create: `src/app/(checkout)/season-pass/checkout/actions.ts`, `actions.test.ts`
- Create: `src/lib/pass/server/complete.ts`, `complete.test.ts`
- Modify: `src/lib/queue/handlers.ts` (`stripe-webhook` now reaches `completeCheckout`)

`completeCheckout(db, stripe, { passId, sessionId })`: if already `active`, return it; read the payment method from the session; require `metadata.passId === passId` and a method; set the pass `active` with the Stripe ids and card fields; enqueue `pass-onboard` (key: the pass id) and `queueMessage` for the purchase confirmation (email, and SMS when consented); return the screen `Pass` through `toScreenPass`. Idempotent: the client and the webhook both call it. `beginCheckout(fields, passId?)` (flag on; the per-email cap; `createOrUpdatePendingPass`; `createSetupSession` reusing the pass's customer when it has one) → `{ ok: true, passId, sessionId, clientSecret } | { ok: false, reason: "invalid" | "too-many" }`; `finishCheckout(passId, sessionId)` → `completeCheckout` then `after(() => drainAll(db()))`. Tests mock the libraries and cover each branch.

Commit: `Add the checkout server actions`

### Task 8.4: The card step mounts Embedded Checkout; the reducer learns the pass id; save as image works

**Files:**
- Modify: `checkout-state.ts`, `checkout-steps.tsx`, `CheckoutFlow.tsx`, `CheckoutFlow.stories.tsx`, `CheckoutFlow.test.tsx`, `src/app/(checkout)/season-pass/checkout/page.tsx`
- Create: `src/app/(checkout)/season-pass/checkout/_screens/StripeCard.tsx`, `src/lib/pass-card-image.ts`
- Modify: `package.json` (`html-to-image` to `dependencies`)

**Step 1: Reducer, test first.** `CheckoutFields` gains `passId`, `sessionId`, `clientSecret` (all `string | null`) and `pass: Pass | null`; `canContinue` on the card step is false until `cardSaved`; `{ type: "failed", reason }` keeps the step and sets `problem` for the inline line ("Something did not save. Check your answers and try again." or "Too many tries. Call us and we reserve it by phone.").

**Step 2: The card step.** `CardStep({ clientSecret, onComplete, stripeComponent = StripeCard })`: `StripeCard` wraps `EmbeddedCheckoutProvider` with `loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)` and `options={{ clientSecret, onComplete }}` and renders `<EmbeddedCheckout />` in the dashed frame; without a secret, a `Skeleton`. Stories and tests inject a placeholder component. Hannah approves the `Card` story once (a row in Approvals).

**Step 3: The flow.** Props `onBegin(fields, passId)`, `onFinish(passId, sessionId)`, `onReserved(pass)` (renamed from `onComplete`). Entering the card step calls `onBegin` with the current `passId` (null the first time); the result fills the three fields or dispatches `failed`. Stripe's `onComplete` calls `onFinish`; the returned pass goes into `state.pass`, `next` is dispatched, `DoneStep` shows the real pass (`toPass` stays as the stories' fallback). `onSaveImage` is wired: move `savePassImage` from `CheckoutFlow.stories.tsx` into `src/lib/pass-card-image.ts` (`html-to-image` becomes a runtime dependency) and the page passes it, so the button on the done step saves the card as `TH-2027-00NN.png` (a known gap, closed).

**Step 4: The page.** `page.tsx` passes `season={currentSeason(...)}`, `onBegin={beginCheckout}`, `onFinish={finishCheckout}`, `onSaveImage={savePassImage}`, `initialZones` from the query. The `?renew=` branch arrives in Task 12.1.

**Step 5: Verify in the browser.** Flag on, Stripe test keys, `stripe listen`: walk the seven steps with `4242 4242 4242 4242`; the done step shows `TH-2027-00NN`; Studio shows the pass `active` with the card fields and the queue rows; Save as image downloads the PNG. Go back from the card step, change the zones, continue: one pending pass in Studio, updated. The four commands, `npm run test:stories`, `npm run manifest:compare`.

**Step 6: Commit.** `Wire the checkout to Stripe's embedded card form and the pass`

### Task 8.5: Onboarding into Jobber: client, property, three unscheduled jobs, and the alert on first failure

**Files:**
- Create: `src/lib/pass/server/onboard.ts`, `onboard.test.ts`
- Modify: `src/lib/queue/handlers.ts` (`pass-onboard`)

`onboardPass(db, query, org, { passId })`: when `jobber_client_id` is empty, `findOrCreateClient` and store the ids; for each `pass_visit` without `jobber_job_id`, `createPassJob` (unscheduled, the preference in the title; the scheduler places it later) and store `jobber_job_id`, `jobber_job_url`; at the end queue the admin alert "New Season Pass: Andrea, Erie, 8 zones" with the three links. On any thrown error: leave what was stored, queue the admin alert "Jobber jobs for pass TH-2027-0007 were not created; retrying" **once** (key: the pass id), and rethrow so the queue retries; the attention row appears from the first failure (Task 5.6 reads queue items with `attempts >= 1 and error` for `pass-onboard`, not only at eight). Tests: a fresh pass gets a client and three jobs; a pass with one job gets two more; a failure after the first job stores one id, queues one alert, throws; a second failure queues no second alert.

Verify on the tester account: a test purchase shows the client and three jobs with the tag; both emails arrive. Commit: `Create the Jobber client, property and three jobs for a new pass`

### Task 8.6: The GA4 event and the calculator's button

**Files:**
- Create: `src/lib/analytics.ts`, `analytics.test.ts`
- Modify: `src/components/ConversionTracking.tsx` (import `fireEvent`), `checkout-steps.tsx` (`DoneStep` fires once), `src/components/sections/SeasonPassCalculator.tsx`, `src/app/(site)/season-pass/page.tsx`, `CLAUDE.md` (the fourth event)

`fireEvent` moves to `src/lib/analytics.ts` (test: no `gtag`, no throw; a stub receives `("event", "season_pass_purchase", { value, zones, town, pass_number })`); `DoneStep` fires it in an effect keyed on `pass.number`. `SeasonPassCalculator` appends `?zones=N` when `ctaHref` is the checkout; `page.tsx` picks the href from `checkoutEnabled()` (it imports `@/lib/flags`, which the gate allows). `npm run manifest:compare` must still pass.

Commit: `Fire season_pass_purchase and send the calculator to the checkout when the flag is on`

**Phase 8 close:** `npm run test:stories`; a full test purchase from `/season-pass` to the Jobber jobs and both emails, screenshotted into `.local-data/wiring/checkout/`.

---

## Phase 9: The scheduler

Estimate: four days for the proposal and approval (Tasks 9.1 to 9.4), one more for auto-apply (9.5). The risk paragraph in the header applies to every task here.

### Task 9.1: Settings on the organization, with the change log

**Files:**
- Create: `src/lib/settings/defaults.ts`, `defaults.test.ts`, `src/lib/settings/server/store.ts`, `store.test.ts`

`DEFAULT_SETTINGS: OrganizationSettings` from the brief: capacity per truck-day turn-on 10, inspection 10, blowout 14 (placeholders until Ryan answers question 2; the Settings page shows them as "not confirmed" until saved once), buffer 25 percent for the first 2 weeks and 15 after, windows turn-on April 15 to May 31, inspection July 1 to 31, blowout October 1 to November 15, lead time 4 weeks, fall firm horizon 6 days, messages SMS off, reminder hour 17, sender "Trailhead Lawn & Irrigation". `readSettings(db, org)` merges the row over the defaults; `saveSettings(db, org, byEmail, section, values)` validates (Task 2.4's validators), writes the row and one `settings_change` per changed leaf path with `from` and `to` as strings; `saveTrucks`, `saveAreas` the same for their tables. Tests: a change logs exactly the leaves that changed; an invalid window is refused with the words; defaults fill a missing section.

Commit: `Store the organization settings with a change log`

### Task 9.2: The proposal, a pure function with the hard rules tested one by one

**Files:**
- Create: `src/lib/scheduling/propose.ts`, `propose.test.ts`, `src/lib/scheduling/calendar.ts`, `calendar.test.ts`

**Step 1: Calendar helpers, test first.** `workingDays(truck, from, to)` → the days in the range on the truck's working days; `isInWindow(day, window)`; `capacityFor(truck, kind, day, settings, windowStart)` → `visitsPerDay * (1 - buffer)` rounded down, with the first-weeks buffer when `day` is inside `firstWeeks` of `windowStart`; `townOrder(areas, season: "spring" | "fall")` → the areas sorted by `springOrder` or `fallOrder`; `preferenceRange(kind, preference, season)` from `preferences.ts`.

**Step 2: The proposal, test first.** Signature:

```ts
export interface ProposalInput {
  season: number
  window: "turn-on" | "inspection" | "blowout"
  visits: { id: string; passId: string; town: Town; preference: Preference | null; scheduledOn?: string; truckId?: string; firm?: boolean }[]
  trucks: Truck[]
  areas: Area[]
  settings: OrganizationSettings
  /** the first day the proposal may use, usually today plus one */
  from: string
  /** visits already on the calendar (any kind), so capacity counts them */
  taken: { truckId: string; day: string; kind: VisitKind3 }[]
}
export interface Assignment { visitId: string; truckId: string; day: string; areaId: string; firm: boolean }
export function propose(input: ProposalInput): { assignments: Assignment[]; unplaced: { visitId: string; reason: string }[] }
```

The algorithm, from the brief: take every unscheduled visit of the window (a visit with a `scheduledOn` that is `firm` is never moved; a non-firm one may be re-proposed); sort by preference order (earlier, recommended, later) then by the season's town order (fall by `fallOrder`, spring and July by `springOrder`); walk the days from `from` to the window's end, truck by truck in truck order; each truck-day gets the next area in the season's order that still has visits, and takes visits from that area's towns, in sorted order, up to `capacityFor` minus what `taken` already holds; a visit whose preference range has days left in the calendar is placed only inside that range (earlier means the first area-day in its range, question 4); when its range is exhausted it falls into the next range of the same window with `reason` recorded in `unplaced` only when the whole window is full; the fall window marks assignments within `fallFirmDays` of `from` as `firm` and the rest as planned; spring and July are firm. Hard rules, each its own test: never a non-working day; never over capacity (counting `taken`); never outside the window; never outside the preference range while it has room; a firm visit is untouched; two trucks on the same day get different areas while there are areas left; the output is deterministic for the same input (sort is stable); an empty truck list places nothing and says why.

**Step 3: Verify and commit.** `npm test -- scheduling`. Commit: `Propose a day and a truck for every pass visit in a window`

### Task 9.3: Running a proposal, approving it, pushing it to Jobber, moving a visit

**Files:**
- Create: `src/lib/scheduling/server/run.ts`, `run.test.ts`, `src/lib/scheduling/server/approve.ts`, `approve.test.ts`, `src/lib/scheduling/server/move.ts`, `move.test.ts`
- Modify: `src/lib/queue/handlers.ts` (`pass-push`, `schedule-run`)

`runProposal(db, org, { window, now })`: loads the inputs (`readSettings`, trucks, areas, the season's visits, `taken` from scheduled pass visits and the mirror's non-pass visits by assigned user), calls `propose`, writes `proposed_on`, `proposed_truck_id`, `status = proposed`, `firm` on each assigned visit, inserts a `schedule_run` with the counts and the `unplaced` list, and queues an admin alert "Spring proposal ready: 24 visits across 2 trucks, 0 unplaced" with the Schedule link. Re-running replaces the proposals of visits still `proposed`.

`approve(db, org, byEmail, { scope: "week" | "all", week? })`: every `proposed` visit in scope becomes `scheduled` with `scheduled_on = proposed_on`, `truck_id = proposed_truck_id`, the run's `approved_at` and `approved_by` set, and one `pass-push` item per visit (key: `visit:<id>:<day>:<truck>`); firm visits also queue the `date-set` message (key the same); planned ones queue nothing yet. The `pass-push` handler calls `scheduleVisit` from the push adapter (creating the job first when `jobber_job_id` is empty, which only happens if onboarding failed), stores `jobber_visit_id` and `pushed_at`; a failure retries and, on the first failure, queues the admin alert "Could not push Andrea's blowout to Jobber; retrying".

`moveVisit(db, org, byEmail, { visitId, truckId, day })` (the Schedule page's drag): validates with the hard rules (working day, capacity, window) and returns the problem words when it breaks one; otherwise writes the new day and truck, clears `exception`, queues `pass-push` (which calls `moveVisit` on the adapter when `jobber_visit_id` exists) and `date-moved` when the visit was firm.

`firmUp(db, org, now)`: daily; fall visits within `fallFirmDays` of `now` that are `scheduled` and not `firm` become firm and queue `date-set`. The `schedule-run` queue kind carries a `window` and calls `runProposal` (the Home checklist's "Run the proposal" button and the daily cron use it).

Tests with `testDb()` and a fake query: a run writes proposals and one alert; approval of a week pushes only that week and messages only the firm ones; the push stores the visit id and is idempotent on its key; a move inside the rules pushes and messages; a move over capacity is refused; firm-up promotes the next six days once.

Commit: `Run, approve, push and move the schedule`

### Task 9.4: The cron, the day-before reminder and the daily summary

**Files:**
- Create: `src/app/api/cron/schedule/route.ts`, `src/lib/scheduling/server/daily.ts`, `daily.test.ts`
- Modify: `vercel.json` (`0 13 * * *`, 7 am Mountain)

`daily(db, org, now)`: `firmUp`; queue the `day-before` message for every firm scheduled visit tomorrow (key `visit:<id>:<day>`, email and SMS when consented, at the Messages setting's hour, by setting `run_after`); when a window opens within the lead time and no run exists for it this season, queue `schedule-run` (in `approve` mode this only proposes; Ryan approves on the page); send the summary to Ryan and Hannah: "Tomorrow: 12 visits, Truck 1 in Erie and Firestone, Truck 2 in Longmont. 3 moved in Jobber this week. Spring proposal waiting for approval: 24 visits." Tests: reminders for tomorrow only, once; the summary's counts; a window inside lead time queues one run.

Commit: `Run the schedule daily: firm up, remind, summarise`

### Task 9.5: Auto-apply, off by default

**Files:**
- Modify: `src/lib/scheduling/server/run.ts`, `daily.ts` (+ tests), `src/lib/settings/defaults.ts` (`scheduler.mode: "approve" | "auto"`)

With `mode: "auto"`, `runProposal` calls `approve({ scope: "all" })` itself and the summary says what it placed. The Settings page's Capacity and windows tab carries the switch with the line "Auto-apply places visits without your approval. Turn it on after a full season of approving batches." Tests: in `auto` a run ends scheduled and pushed; in `approve` it ends proposed.

Commit: `Let the scheduler apply its own proposals when the setting says so`

**Phase 9 close:** `npm run test:stories`; on the tester account, approve a proposed week and see the visits on the Jobber calendar assigned to the right user; move one in Jobber and see the exception on Home within a minute.

---

## Phase 10: The customer pass page

Estimate: one day.

### Task 10.1: The route, the actions and the dates from the scheduler

**Files:**
- Create: `src/app/(account)/account/pass/page.tsx`, `actions.ts`, `src/lib/pass/server/for-email.ts`, `for-email.test.ts`, `src/lib/pass/server/cancel.ts`, `cancel.test.ts`
- Modify: `PassPageScreen.tsx` (`onUpdateCard` on the "Update card" button as a form action), `CancelPassDialog.tsx` (calls the bound action)
- Modify: `src/lib/queue/handlers.ts` (`pass-cancel`)

`passForEmail(db, org, email)` → the newest pass for that email as a screen `Pass` or null; the visit rows carry `scheduledAt` from `scheduled_on` (what the scheduler set or Jobber moved), so the page shows "Booked, Tuesday, May 5" as soon as the approval or the exception lands. The page: `requireCustomer()`, `notFound()` without a pass, render with `onCancel={cancelPass.bind(null, pass.id)}` and `onUpdateCard={startCardUpdate.bind(null, pass.id)}`. `cancelPass` (the core in `cancel.ts`, shared with the admin action): the email must own the pass unless the principal is an admin; `status = cancelled`, `cancelled_at`; unstarted visits `cancelled`; queue `pass-cancel` (key: the pass id) and the `cancelled` message, and the admin alert. The `pass-cancel` handler calls `cancelPassJobs` on the unstarted jobs. `startCardUpdate` creates the hosted session and redirects. Tests: ownership; the cancelled visits; a completed visit's job untouched; a second cancel is a no-op.

Verify in the browser from the confirmation email's link: the real card brand, the three visits with the proposed or booked dates, Update card to Stripe and back, Cancel ends the pass. The four commands, `npm run test:stories`, `npm run manifest:compare`. Commit: `Serve the customer pass page with cancel and card update`

---

## Phase 11: The admin routes

Estimate: two days.

### Task 11.1: The shell layout and the six pages

**Files:**
- Create: `src/app/(admin)/admin/(shell)/layout.tsx`, `section.ts`, `section.test.ts`, `loading.tsx`
- Create: `src/app/(admin)/admin/(shell)/page.tsx`, `schedule/page.tsx`, `passes/page.tsx`, `revenue/page.tsx`, `customers/page.tsx`, `settings/page.tsx`, `page.test.tsx`
- Modify: `src/components/blocks/AdminShell.tsx` (+ story, test): `onSignOut?: () => void`, links through `next/link`
- Modify: `src/components/blocks/NeedsAttention.tsx` (links to `/admin/passes?pass=<id>` and `/admin/schedule?visit=<id>`)

The `(shell)` group holds the layout so `/admin/sign-in` stays outside it. The layout: `requireAdmin()`, the admin's name and initials from `admin_user`, `current` from `sectionFor(headers().get("x-pathname"))`, `onSignOut` as an inline server action calling `signOut({ redirectTo: "/admin/sign-in" })`. Each page: `requireAdmin()`, `const data = await getAdminData()`, `today`, the screen with its action props (Task 11.2). `schedule/page.tsx` reads `?week=` (default this week) and `?visit=`. `page.test.tsx` mocks `@/lib/admin/data` and `@/lib/auth/guard` and renders each awaited page once: the greeting, the grid's twelve rows, the Settings tabs, the Schedule grid's two truck rows.

Verify at 1440 and 375 signed in as owner with `ADMIN_DATA_SOURCE=live`; the tab bar's safe-area padding on a phone. Commit: `Serve the admin pages behind the shell with live data`

### Task 11.2: The actions: passes, schedule, settings, the season setup

**Files:**
- Create: `src/app/(admin)/admin/(shell)/actions.ts`, `actions.test.ts`, `src/lib/pass/server/admin-actions.ts`, `admin-actions.test.ts`
- Modify: `PassesScreen.tsx`, `ScheduleScreen.tsx`, `SettingsScreen.tsx`, `HomeScreen.tsx` (+ stories, tests): the action props replace the `console.info` calls

`resendConfirmation(passId)` re-queues the purchase confirmation (key: the pass id and the minute); `sendCardUpdateLink(passId)` creates the hosted session and queues `card-expiring`'s sibling message with the link; `adminCancelPass(passId)` calls `cancel.ts`; `approveSchedule(scope, week)`, `moveScheduledVisit(visitId, truckId, day)`, `runProposal(window)` call Phase 9; `saveSettingsSection(section, values)`, `saveTrucks`, `saveAreas` call Task 9.1. Every action calls `requireAdmin("manager")` first (`tech` reads only; the layout passes `readOnly` to the screens so the buttons are absent, not disabled) and `revalidatePath` for its page. `PassesScreen` takes `actions?: { resend; cardLink; cancel }` with `useTransition` pending states; the bulk bar calls `resend`/`cardLink` per selected row; `ScheduleScreen` takes `onApprove`, `onMove` (a refused move shows the words inline and snaps the block back), `onPropose`; `SettingsScreen` takes `onSave` per section and shows the validator's words; `HomeScreen`'s `SeasonSetup` card takes `onRun`. Stories pass `fn()`s; tests assert the calls.

Verify: resend sends; the card link arrives; cancel asks and cancels; a saved capacity shows in the change log and in the next proposal; approving a week pushes it to the tester account; dragging a block moves it there. `npm run test:stories`, `npm run check:design`. Commit: `Wire the pass, schedule and settings actions`

**Phase 11 close:** Hannah walks every admin page on the live preview deployment with the seeded development database; her notes become tasks appended here.

---

## Phase 12: Renewal

Estimate: one day. Ships after the first sales; the model already carries `season`, `renewed_from_id` and `renewal_asked_at`.

### Task 12.1: The renewal link and the prefilled checkout

**Files:**
- Create: `src/lib/pass/server/renewal.ts`, `renewal.test.ts`
- Modify: `checkout-state.ts`, `CheckoutFlow.tsx`, `page.tsx`, `actions.ts` (+ tests, a `Renewing` story)

`renewalToken(passId, secret)` and `readRenewalToken(token, secret, now)`: an HMAC-signed `passId.expiry` (90 days), base64url; tampered or expired reads null. `renewalPrefill(db, passId, season)` → the previous pass's address, town, zones, name, email, phone, both preferences and `smsConsent`, plus `reuseCard: true` when the Stripe method is still attached. The reducer gets `skipCard`; with it, `next` from contact calls `onBegin` with `renewFrom` and `onFinish` at once: the action creates the pass `active` with the old customer and method, no Stripe session, and the flow lands on done. `page.tsx` reads `?renew=`, verifies, and opens on the turn-on preference step (the PRD's one question for a returning customer becomes two confirmations, both preselected with last year's choice). The `renewal` template from Task 6.2 carries the link.

Commit: `Let a pass holder renew from one email link`

### Task 12.2: The January job and the April lapse

**Files:**
- Create: `src/app/api/cron/renewals/route.ts`, `src/app/api/cron/lapse/route.ts`, `src/lib/pass/server/renewal-run.ts`, `renewal-run.test.ts`
- Modify: `vercel.json` (the two yearly lines)

`sendRenewals(db, org, { season, now })`: for every `active` pass of `season - 1` whose email holds no pass for `season` and whose `renewal_asked_at` is null, queue the `renewal` message (key: the pass id) and set `renewal_asked_at`. `lapseUnrenewed`: on April 1 every such pass becomes `lapsed`, so `renewals()` in `revenue-model.ts` reads renewed, lapsed and not yet asked. Tests: one message per unrenewed pass, none for a renewed one, none twice; the lapse leaves renewed passes alone.

Commit: `Send renewal links in January and lapse unrenewed passes in April`

---

## Phase 13: Copy, terms, launch and IndexNow

Estimate: one day plus the end-to-end pass.

### Task 13.1: The Season Pass page's FAQ answers, `pricing.md` and `llms.txt`

**Files:**
- Modify: `src/app/(site)/season-pass/page.tsx` (FAQ answers only), `public/pricing.md`, `public/llms.txt`, `src/app/sitemap.ts` (`SEASON_PASS_UPDATED`)

When the flag is on, "Which cities can get the Season Pass?" ends "Reserve online in a few minutes: pick your zones, tell us when you'd like the turn-on and the blowout, and save a card." and "Can I cancel?" adds "from your pass page, any time". `pricing.md`'s Season Pass paragraph and `llms.txt` line 15 get the same sentence. The hero, the "reserved in July" lines and the metadata stay as they are until Hannah rewords them (question 9); the plan records that dependency here and in Known gaps. Copy rules from `CLAUDE.md`. `npm run manifest:compare` passes (text, not classes).

Commit: `Describe the online checkout in the Season Pass FAQ, pricing.md and llms.txt`

### Task 13.2: Terms, the production database and the launch checklist

**Files:**
- Modify: `src/app/(site)/terms/page.tsx` (a Season Pass section with Hannah's wording, placeholders in brackets until she answers question 8)
- Create: `docs/plans/2026-11-12-season-pass-launch-checklist.md`

The checklist, each line a box: Stripe live keys, the live webhook endpoint and secret, Checkout branding, the sales tax answer; the Jobber app in production with the scopes the facts doc names, OAuth connected on the live site, webhooks at the live URL, the `season-pass` tag and the pass-id field created on the production account and their ids written to `organization`; Neon's `production` branch migrated (`npm run db:migrate`) and seeded without fixture passes (`SEED_FIXTURE_PASSES` unset), the two admin users, the trucks and areas from Ryan's answers entered on the Settings page; Twilio's 10DLC registration done (it takes days; start it in Phase 6) and `TWILIO_FROM` set; `AUTH_*`, `CRON_SECRET`, `APP_URL` set; the Vercel plan checked against `vercel.json`; a Vercel WAF rate-limit rule on `/season-pass/checkout` and `/api/webhooks/*`; Hannah's decision on Jobber's reminders (question 6); the e2e pass (Task 13.3) done; `SEASON_PASS_CHECKOUT=on` set last, redeploy, buy the first real pass yourself and refund it from Stripe; IndexNow (Task 13.4).

Commit: `Add the Season Pass terms block and the launch checklist`

### Task 13.3: End to end in test mode

No code. On the preview deployment with Stripe test keys, the Jobber tester account, Twilio test credentials and a seeded development database: buy a pass with `4242…` (SMS consent on); see the client and three unscheduled jobs in Jobber and the confirmation email and text; set the trucks and areas on Settings; run the spring proposal from Home's setup card; approve the week on Schedule and see the visits on Jobber's calendar assigned to the right users; move one in Jobber and see the exception on Home and the date-moved email; complete the turn-on in Jobber and see the charge in Stripe, the receipt naming July, the invoice note; cancel from the pass page and see Ryan's email. Then the failure path with `4000 0000 0000 0341`: the card-failed email, update to `4242…`, attempt 2 succeeds. Screenshots and the queue and message_log rows into `.local-data/wiring/e2e/`. Any bug found becomes a task appended under Status before it is fixed.

### Task 13.4: Ship, then IndexNow

After the Phase 13 PR merges and Vercel finishes:

```bash
npm run indexnow -- https://www.trailheadirrigation.com/season-pass
```

Then request indexing for `/season-pass` in Search Console by hand. Write the Status section at the top of this plan the way the prototype plan has one: commits per task, what is live, what waits on Hannah or Ryan, the open points from the e2e pass.

---

## Estimates

| Phase | What | Estimate |
|---|---|---|
| 0 | The Jobber facts on a tester account | 0.5 day |
| 1 | Route groups, root layouts, app.css, the manifest proof | 1 day |
| 2 | Preferences, October removal, Settings and Schedule screens in Storybook, approval | 3 days |
| 3 | Neon, Drizzle schema, migration, seed, PGlite tests | 2 days |
| 4 | Auth.js, proxy, guard, sign-in pages | 1.5 days |
| 5 | Jobber OAuth, client, push adapter, mirror sync, queue, the two signals, live data | 3 days |
| 6 | Messaging: Resend, Twilio, STOP, the log, every template, card expiry | 2 days |
| 7 | Stripe: setup session, invoice paid, off-session charge, card update, webhook | 2 days |
| 8 | Checkout wired: pending pass, actions, embedded card, onboarding, GA4 | 2 days |
| 9 | Scheduler: settings, the proposal, approve and push, cron and summary | 4 days |
| 9.5 | Auto-apply | 1 day |
| 10 | Pass page route, cancel, card update | 1 day |
| 11 | Admin routes and actions, Schedule and Settings wired, season setup | 2 days |
| 12 | Renewal link, prefilled checkout, January and April jobs | 1 day |
| 13 | Copy, terms, checklist, e2e, IndexNow | 1 day + the e2e pass |
| | Total | about 27 working days |

The scheduler (5 days with auto-apply) and messaging (2 days) are the two phases the scope change added, estimated apart so each can be judged on its own. The estimates assume one person with the Jobber tester account, Stripe test keys and Twilio test credentials in hand on day one, and Ryan's five answers before Phase 9 starts. Phase 5 and Phase 9 are the ones most likely to grow: every Jobber mutation is checked in GraphiQL as it is written, and the hard rules in `propose.ts` are the place to add a test the moment a proposal looks wrong.

## Known gaps and dependencies

- If limits are ever needed they apply to all three season windows (spring, summer, fall) as one feature, never to October alone. Nothing in this plan has a capacity limit on the customer side; the per-truck-day capacity is Ryan's planning number, not a sales limit.
- The `/season-pass` page, its hero and its metadata still promise a "reserved" blowout week and a date "reserved in July". Hannah rewords them; this plan changes only the FAQ answers (Task 13.1). The checkout's blowout step says "preference" from Task 2.3 on; the two will disagree until she does.
- The spring "why" line under the turn-on preference quotes a date only once `scripts/freeze-dates.mjs` pulls the last spring hard freeze (Task 2.1); until then it states the fact without a number.
- Jobber's own scheduling notification and day-before reminder reach pass customers as well as the app's messages unless Task 0.1 finds per-job control or Hannah turns them off account-wide (question 6). The pass jobs carry the same client email and phone the app uses, so whichever reminders go out reach the same person.
- The day-before text's "leave the side gate unlocked" line is fixed wording; per-pass access notes are a later plan.
- The admin Messages view (every row of `message_log` per pass, inbound replies) is a later plan; the Passes panel shows nothing of it yet.
- From the prototype's list, two gaps stay as they are: the shadcn sidebar's own `useIsMobile` sheet (never rendered) and the `env(safe-area-inset-bottom)` padding, now live from Task 1.3 but still to be seen on a real phone.
- Stop order inside a truck-day is Jobber's Route Optimization, pressed by Ryan in the app; the plan assumes it is not reachable from the API (the brief found nothing saying it is).

## Jobber retirement path

Not in this plan, in this order after the pass checkout and admin, each its own later plan with its own tasks (PRD, revised system of record; the first three added by Hannah):

1. **The booking form at `/book`, in the app.** The Jobber iframe is replaced at the same URL by a Typeform-paced form like the checkout, with per-service questions, that writes a `request` row, pushes a Jobber request through the API during the transition, sends an instant confirmation, and feeds a Requests inbox page in the admin where one click turns a request into a scheduled visit or a quote. Rough size: five to six days (the form, the request table and push, the inbox screen in Storybook, the two actions).
2. **The tech's day view on the phone.** From the app's schedule, the day's stops for a truck, each with a per-visit-type checklist edited in Settings (turn-on, inspection, blowout, repair; an optional photo per step), where a completed checklist is what triggers the pass charge and the receipt, so the "visit completed" signal comes from the app's own button instead of Jobber's webhook. Rough size: six to eight days (the checklist settings, the day screen in Storybook, photo upload, the completion path replacing the signal).
3. **Message templates in Settings.** Every email and text the app sends becomes editable in the Messages section with fillable fields and a preview, and a new message is a template plus a trigger, replacing the fixed functions in `src/emails/` and `src/sms/`. Rough size: four to five days (a template table and renderer, the editor and preview, the trigger list).
4. **Quotes and invoices for non-pass work** move to the app; the mirror tables become the migration source and the sync is turned off. Rough size: two weeks.
5. **Payments for that work** move to Stripe and the Jobber OAuth connection is retired. Rough size: one week.

What this plan leaves in place so none of the five has to undo it: every pass fact lives in the app's tables, never only in Jobber; the push adapter is the single seam to Jobber's write side and the signals handler the single seam to its read side; the queue, the message log, the settings and the checklist-free `pass_visit` completion path are the pieces each later plan extends.
