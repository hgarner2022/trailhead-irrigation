# Season Pass Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Put real data behind the approved prototype screens: a Postgres database, sign-in, the Jobber sync and webhooks, Stripe, the checkout route, the customer pass page, the admin routes and the January renewal job, with the marketing site unchanged at every step.

**Architecture:** The marketing tree moves into `src/app/(site)/` and keeps its root layout and `globals.css`; `(admin)`, `(checkout)` and `(account)` each get their own root layout on one shared stylesheet entry, `src/app/app.css`. Drizzle owns the schema in `src/db/schema.ts`; every table carries `organization_id`. Jobber stays the system of record for clients, jobs, visits, quotes and invoices, mirrored into `jobber_*` tables by a scheduled sync and kept fresh by webhooks; the app owns `season_pass`, `pass_visit`, `blowout_week` and `charge`; Stripe holds the card. Everything asynchronous (webhooks, job creation, charges, emails) goes through one `queue_item` table drained after the response with `after()` and again by a cron, so every step is idempotent and retried. Screens keep taking `AdminData` and callbacks as props; `getAdminData("live")` maps the mirror and app tables onto the screen-facing types, and route handlers and server actions are the only places that know Jobber's or Stripe's shapes. Design: `docs/DESIGN.md`. Requirements: `docs/plans/2026-11-12-season-pass-checkout-prd.md` (the loop, end to end). Prototype: `docs/plans/2026-11-12-admin-dashboard-prototype-implementation.md` (Status and Known gaps).

**Tech Stack:** Next.js 16.1 App Router (`proxy.ts`, `after()`, server actions), React 19, TypeScript strict, Tailwind v4, Drizzle ORM on Neon Postgres (`@neondatabase/serverless`, `drizzle-kit` migrations, `@electric-sql/pglite` for tests), Auth.js v5 (`next-auth@beta`) with the Resend provider and the Drizzle adapter, Stripe (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`, Embedded Checkout in setup mode, off-session PaymentIntents), Jobber GraphQL API with OAuth 2, Resend for every email, Vercel Cron, Vitest (unit, jsdom) and Storybook `nextjs-vite` (stories). Node 24, npm 11.

**Conventions the executor must keep:** everything in the prototype plan's header still applies (`cn()`, semantic tokens, `rounded-lg`, `data-slot`, sentence case, copy rules from `CLAUDE.md`). Plus: `import "server-only"` at the top of every file that touches the database, Stripe, Jobber or Resend; no secret is ever read outside `src/lib/env.ts`; every table has `organization_id`; every write that a webhook or a retry can repeat is idempotent on an id; money in the database is whole dollars (`integer`), the same as the screens, converted to cents only inside `src/lib/stripe/`; dates in the database are `timestamptz`, mapped to the screens' ISO strings; nothing under `src/app/(site)/` or `src/components/sections/` imports from `src/db`, `src/lib/jobber`, `src/lib/stripe` or `src/lib/pass` (the gate's import rule is extended in Task 1.3 to say so).

**Keep the marketing site green at every task.** Each task ends with the check list under "Verify" and the four commands `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`; `npm run test:stories` runs at the end of each phase (it needs a browser and takes minutes). `node scripts/route-css-manifest.mjs --compare` (Task 1.1) proves the marketing routes and CSS are unchanged after every task that touches `src/app` or any stylesheet.

**Commit after every task.** One plain sentence, sentence case, no prefix. End with the attribution line in the system reminder.

**Branch:** `season-pass-wiring`, cut from `admin-prototype` (`main` has the same tree since PR #1). Each phase can be its own PR to `main`; Phase 1 must land first and alone, so the marketing site is seen to be unchanged on the live deploy before any app code follows.

---

## Decisions this plan makes

Choices the PRD and the prototype left open, settled here so the executor never has to pick:

1. **Neon, not Vercel Postgres.** Vercel's Postgres is Neon under the Marketplace; creating the database through the Vercel integration gives the same `DATABASE_URL`. The driver is `@neondatabase/serverless` over HTTP (`drizzle-orm/neon-http`). HTTP has no interactive transactions, so the one place that needs atomicity (reserving a blowout week) is a single `UPDATE … WHERE taken < capacity RETURNING` statement, and every multi-statement write is written to be safe when re-run.
2. **One queue, in Postgres.** `queue_item` (kind, payload, attempts, run_after, done_at, error) replaces a queue service. A webhook route inserts the item, returns 200 within Jobber's one-second limit, and drains the queue with `after()` from `next/server`; `/api/cron/drain` drains it again every few minutes for anything that failed. No Inngest, no QStash.
3. **Auth.js, one instance, two kinds of user.** `signIn` is allowed when the email is in `admin_user` (Hannah and Ryan, with roles) or matches a `season_pass` row (a customer). The JWT carries `kind: "admin" | "customer"`, `organizationId` and `role`. `/admin/*` needs `admin`; `/account/*` needs `customer` or `admin`. Sessions are JWTs; the Drizzle adapter stores only the verification tokens. If `next-auth@beta` will not install against Next 16, Task 3.1 says what to do.
4. **Embedded Checkout with `redirect_on_completion: "never"`.** The card step mounts Stripe's embedded form in the same page (the PRD's "never looks like leaving the site"), the `onComplete` callback fires in the client, and the reducer moves to the done step. No return URL, no second page.
5. **Scheduling and invoice payment are behind two adapters.** `src/lib/jobber/scheduling.ts` creates the three jobs either scheduled (if Task 0.1 confirms `jobCreate` takes a start date) or as unscheduled jobs with the window in the title, chosen by one constant from the facts file. `src/lib/jobber/invoice-paid.ts` marks the invoice paid through the API (if Task 0.1 confirms it exists), or files a note on the job and an item in Needs attention for Ryan's thirty-second habit. Nothing else in the codebase knows which one is live.
6. **Vercel Cron frequency follows the plan Trailhead is on.** Hobby allows one run a day per cron; Pro allows minutes. `vercel.json` is written for Pro (sync every 15 minutes in season, drain every 5); Task 4.6 says what to change if the account is Hobby, and the webhooks carry freshness either way.
7. **The season.** `currentSeason(today)`: the calendar year from January to October, the next year from November and December (sales for next season open after the blowouts). Replaces the prototype's `SEASON = 2027` constant.
8. **Pass visit dates are stored as Mountain-time days.** `pass_visit.scheduled_on` and `completed_on` are `date` columns written from the Jobber visit's `startAt` converted with `TIME_ZONE`, so `visitMonth`, SeasonLine and the pass page read the right month without the known-gap conversion. `jobber_visit.start_at` keeps the full timestamp for the Home list's clock time.
9. **A feature flag gates the public checkout.** `SEASON_PASS_CHECKOUT=on` turns the `/season-pass/checkout` route on; otherwise it returns 404 and the `/season-pass` page keeps its contact-form button. The flag goes on in production only at Task 10.4, after the end-to-end test pass.

---

## Environment variables

All read through `src/lib/env.ts` (Task 2.1), which throws at startup for a missing required variable so a bad deploy fails fast rather than at the first customer.

| Variable | Set in | Used by |
|---|---|---|
| `DATABASE_URL` | Vercel (Neon integration) and `.env.local` | Drizzle |
| `ADMIN_DATA_SOURCE` | `fixtures` locally and in Storybook; `live` in Vercel | `getAdminData` |
| `AUTH_SECRET` | Vercel, `.env.local` (`npx auth secret`) | Auth.js |
| `AUTH_RESEND_KEY` | the existing `RESEND_API_KEY` value | Auth.js Resend provider |
| `AUTH_URL` | `https://www.trailheadirrigation.com` | Auth.js |
| `RESEND_API_KEY` | already set | every app email |
| `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET` | Jobber Developer Center app | OAuth, webhook HMAC |
| `JOBBER_API_VERSION` | the version date Task 0.1 records | the GraphQL client header |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard (test keys locally) | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint | `/api/webhooks/stripe` |
| `CRON_SECRET` | Vercel (it sends it as `Authorization: Bearer`) | `/api/cron/*` |
| `SEASON_PASS_CHECKOUT` | `on` or unset | the checkout route and the `/season-pass` button |
| `APP_URL` | `https://www.trailheadirrigation.com` locally `http://localhost:3000` | links in emails |

`.env.example` (Task 2.1) lists every one with a comment and no values; `.env.local` stays git-ignored.

---

## Phase 0: The two Jobber facts

Estimate: half a day, most of it waiting on the tester account.

### Task 0.1: Confirm scheduling and payment on the Jobber API

**Files:**
- Create: `docs/jobber-api-facts.md`
- Create: `src/lib/jobber/facts.ts`

**Step 1: Tester account and GraphiQL.** In the Jobber Developer Center create (or open) the Trailhead app, add a tester account, and open GraphiQL (`https://developer.getjobber.com/`, "GraphiQL") against it. Record the API version date the explorer uses; that is `JOBBER_API_VERSION`.

**Step 2: Answer the five questions and write them down.** For each, paste the exact query or mutation you ran and the response shape into `docs/jobber-api-facts.md` under a heading per question:

1. `JobCreateAttributes` scheduling: run the introspection query below and list every input field. Does it take a start date, a start and end time, or a visit input (an `oneOff`/`visits` style field) that places the first visit on a day? What is the field for the assigned user?
   ```graphql
   { __type(name: "JobCreateAttributes") { inputFields { name type { name kind ofType { name kind } } } } }
   ```
2. The visit completed webhook topic: run `{ __type(name: "WebHookTopicEnum") { enumValues { name } } }` and record the full list. Name the topics for visit complete, visit create and update, job create and update, client update, invoice create and update, quote create and update.
3. Recording a payment on an invoice: search `{ __schema { mutationType { fields { name } } } }` for anything with `payment` or `invoice` in the name (`invoicePaymentCreate`, `paymentRecord`, or nothing). If it exists, record its input type the same way as question 1.
4. Custom fields on jobs: how an app-defined custom field is created (`customFieldConfigurationCreate` or in the Developer Center UI) and how it is set on `jobCreate` (`customFields: [{ customFieldConfigurationId, valueText }]` or similar).
5. The cost extension: run any small query and paste `extensions.cost` from the response (`requestedQueryCost`, `actualQueryCost`, `throttleStatus.{maximumAvailable, currentlyAvailable, restoreRate}`), and the rate limit page's numbers.

Also record: whether an app's webhooks are subscribed in the Developer Center UI or by mutation; whether a job can be archived or cancelled by mutation (`jobDelete`, `jobEdit` with a status, or neither); the shape of a `jobberWebUri` field on client, job, visit, quote and invoice (the dashboard links use it).

**Step 3: Encode the answers as constants.**

```ts
// src/lib/jobber/facts.ts
/**
 * What Task 0.1 confirmed on the Jobber API (docs/jobber-api-facts.md). The
 * two adapters, scheduling.ts and invoice-paid.ts, read these and nothing
 * else in the codebase asks the question again.
 */
export const JOBBER_FACTS = {
  /** "scheduled" when jobCreate places the first visit on a day; "unscheduled" when the window goes in the title and Ryan places it */
  jobCreateScheduling: "unscheduled" as "scheduled" | "unscheduled",
  /** "api" when a payment can be recorded on an invoice by mutation; "manual" when Ryan marks it paid from a note */
  invoicePayment: "manual" as "api" | "manual",
  /** the WebHookTopicEnum values, copied from the facts file */
  topics: {
    visitComplete: "VISIT_COMPLETE",
    visitCreate: "VISIT_CREATE",
    visitUpdate: "VISIT_UPDATE",
    jobCreate: "JOB_CREATE",
    jobUpdate: "JOB_UPDATE",
    clientUpdate: "CLIENT_UPDATE",
    invoiceCreate: "INVOICE_CREATE",
    invoiceUpdate: "INVOICE_UPDATE",
    quoteCreate: "QUOTE_CREATE",
    quoteUpdate: "QUOTE_UPDATE",
  },
  /** whether a job can be cancelled or archived by mutation; false means cancelPassJobs leaves a note and tells Hannah */
  jobCancelByApi: false,
} as const
```

Replace every placeholder value with what GraphiQL showed. The topic names above are the expected shape (`OBJECT_ACTION`); copy the real strings.

**Step 4: Write the test that pins the file to the facts doc.**

```ts
// src/lib/jobber/facts.test.ts
import { readFileSync } from "node:fs"
import { it, expect } from "vitest"
import { JOBBER_FACTS } from "./facts"

const doc = readFileSync("docs/jobber-api-facts.md", "utf8")

it("every topic in facts.ts appears in the facts doc", () => {
  for (const topic of Object.values(JOBBER_FACTS.topics)) expect(doc).toContain(topic)
})

it("the facts doc records the API version", () => {
  expect(doc).toMatch(/JOBBER_API_VERSION:\s*\d{4}-\d{2}-\d{2}/)
})
```

Run `npm test -- facts` and see it pass only once the doc is complete.

**Step 5: Verify and commit.** `npm run lint`, `npm test`, `npx tsc --noEmit`. Commit: `Record the Jobber API facts the wiring depends on`

---

## Phase 1: Route groups and root layouts

Estimate: one day.

### Task 1.1: A manifest of the marketing routes and CSS, recorded before anything moves

The proof that nothing on the marketing site changed is a file comparison, not a glance. The script lists every route the build produced and every CSS file with its size and a hash of its sorted selectors; `--compare` fails when either differs from the saved baseline.

**Files:**
- Create: `scripts/route-css-manifest.mjs`
- Create: `scripts/route-css-manifest.test.mjs`
- Modify: `package.json` (two scripts)

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
    const saved = JSON.parse(readFileSync(OUT, "utf8"))
    const problems = diffManifests(saved, current)
    for (const p of problems) console.log(p)
    if (problems.length) process.exit(1)
    console.log("marketing routes and css unchanged")
  }
}
```

The CSS file names carry a content hash, so the key strips it: two builds with the same CSS content give the same key and the same selector hash. Note: the marketing CSS file's key is the same whether the content hash changed or not; the `bytes` and `selectors` fields are the comparison. The `SKIP` list keeps the app routes out of the manifest so later phases can add them without failing the compare.

**Step 3: Run the test.** `node --test scripts/route-css-manifest.test.mjs`. Expected: PASS.

**Step 4: Scripts.** In `package.json`: `"manifest:save": "node scripts/route-css-manifest.mjs --save"`, `"manifest:compare": "node scripts/route-css-manifest.mjs --compare"`. Add the test to `test:gate`: `"test:gate": "node --test scripts/check-design.test.mjs scripts/route-css-manifest.test.mjs"`.

**Step 5: Record the baseline.** `npm run build && npm run manifest:save`. Open `.local-data/wiring/manifest.json` and confirm it lists `/`, `/pricing`, `/season-pass`, the six `/services/[city]` entries (as `/services/[city]`), the blog, and one CSS file. Keep this file for the rest of the plan; `--compare` reads it.

**Step 6: Commit.** `Add the route and CSS manifest that proves the marketing site is unchanged`

### Task 1.2: Move the marketing tree into `src/app/(site)/`

Next.js allows several root layouts only when there is no `src/app/layout.tsx`; every page must live under a group with its own root layout. The three stylesheets, the metadata files (`icon.png`, `apple-icon.png`, `manifest.ts`, `sitemap.ts`) and `api/` stay at `src/app/`, because they apply to every group.

**Files:**
- Move: `src/app/layout.tsx` → `src/app/(site)/layout.tsx`; `src/app/page.tsx` → `src/app/(site)/page.tsx`; and every page folder: `about`, `aeration`, `blog`, `book`, `christmas-lights`, `contact`, `first-freeze-dates`, `pricing`, `privacy`, `season-pass`, `services`, `smart-controllers`, `spring-turn-on`, `sprinkler-blowout`, `sprinkler-installation`, `sprinkler-repair`, `terms`, `water-efficiency`, `water-rebates` → under `src/app/(site)/`
- Modify: `src/app/(site)/layout.tsx:4` (`"./globals.css"` → `"../globals.css"`)
- Modify: `scripts/new-service.mjs:205` (the path in the instructions)
- Modify: `CLAUDE.md` (File Structure: the pages live under `src/app/(site)/`)

**Step 1: Move with git.**

```bash
mkdir -p "src/app/(site)"
git mv src/app/layout.tsx src/app/page.tsx "src/app/(site)/"
for d in about aeration blog book christmas-lights contact first-freeze-dates pricing privacy season-pass services smart-controllers spring-turn-on sprinkler-blowout sprinkler-installation sprinkler-repair terms water-efficiency water-rebates; do git mv "src/app/$d" "src/app/(site)/$d"; done
```

Check `ls src/app` shows exactly: `(account) (admin) (checkout) (site) api apple-icon.png base.css globals.css icon.png manifest.ts sitemap.ts tokens.css`.

**Step 2: Fix the one relative import.** In `src/app/(site)/layout.tsx` change `import "./globals.css"` to `import "../globals.css"`. `grep -rn 'from "\.\./' "src/app/(site)"` should list nothing else that crosses out of the group (pages import through `@/`).

**Step 3: The gate still sees marketing.** `scripts/design-gate/walk.mjs` calls a file marketing when `dirs[0] === "app"` and no segment matches `appGroupRe` (`(admin)`, `(checkout)`, `(account)`); `(site)` does not match, so nothing changes. Run `npm run check:design` and `npm run test:gate`; both green.

**Step 4: Scripts and docs.** `scripts/new-service.mjs` line 205: `src/app/${slug}` → `src/app/(site)/${slug}` (both occurrences). In `CLAUDE.md` File Structure, under `app/`, add one line: `(site)/                     # Every marketing page and the marketing root layout; (admin), (checkout) and (account) have their own root layouts`.

**Step 5: Verify.** `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`, then `npm run manifest:compare`. Expected: `marketing routes and css unchanged`. Open `/`, `/pricing`, `/season-pass`, `/services/erie` and `/blog` in the browser pane at 1440 and 375 and confirm they render as before (the header, the sticky bar on the phone width, the footer).

**Step 6: Commit.** `Move the marketing pages into the (site) route group`

### Task 1.3: Root layouts for the app groups on one shared stylesheet

**Files:**
- Create: `src/app/app.css`
- Create: `src/lib/fonts.ts`
- Create: `src/app/(admin)/layout.tsx`, `src/app/(checkout)/layout.tsx`, `src/app/(account)/layout.tsx`
- Create: `src/app/app-css.test.ts`
- Modify: `src/app/(site)/layout.tsx` (fonts from `src/lib/fonts.ts`)
- Modify: `scripts/design-gate/imports.mjs` and `scripts/check-design.test.mjs` (marketing never imports the server libraries)
- Modify: `docs/DESIGN.md` (Three tiers: the stylesheet entry now exists)

**Step 1: Write the failing test.**

```ts
// src/app/app-css.test.ts
import { readFileSync } from "node:fs"
import { it, expect } from "vitest"

const css = readFileSync("src/app/app.css", "utf8")

it("app.css imports tailwind, the tokens and the base rules", () => {
  expect(css).toContain('@import "tailwindcss"')
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

Run: `npm test -- app-css`. Expected: FAIL, ENOENT.

**Step 2: The stylesheet.**

```css
/* src/app/app.css
   The stylesheet for the app surfaces: /admin, the Season Pass checkout and
   the customer pass page. It shares tokens.css and base.css with the
   marketing site (globals.css) and scans only the app folders, so neither
   bundle carries the other's classes. Tailwind resolves @source relative to
   this file. */
@import "tailwindcss" source(none);
@import "./tokens.css";
@import "./base.css";
@source "./(admin)";
@source "./(checkout)";
@source "./(account)";
@source "../components/blocks";
@source "../components/ui";
@source "../lib/admin";
```

`source(none)` turns off automatic detection so only the listed folders are scanned. `../lib/admin` is listed because `format.ts` and the screens' models emit no classes today, but a status label helper may; it costs nothing.

**Step 3: Fonts in one module.**

```ts
// src/lib/fonts.ts
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google"

// Both root layouts (the site's and the app's) load the same two faces, so
// the variables tokens.css reads (--font-display-src, --font-body-src) are
// set the same way everywhere. next/font must be called at module scope.
export const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display-src", display: "swap" })
export const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body-src", display: "swap" })
export const fontClassName = `${display.variable} ${body.variable}`
```

In `src/app/(site)/layout.tsx` delete the two `next/font` calls and import `{ fontClassName }` instead; `<html className={fontClassName}>`.

**Step 4: The three root layouts.** The admin one:

```tsx
// src/app/(admin)/layout.tsx
import type { Metadata, Viewport } from "next"
import "../app.css"
import { fontClassName } from "@/lib/fonts"

// The root layout for /admin: no marketing header, footer, sticky bar or
// JSON-LD, the app stylesheet, and viewportFit cover so the phone tab bar's
// safe-area padding takes effect (a known gap of the prototype).
export const metadata: Metadata = { title: { default: "Admin", template: "%s | Trailhead admin" }, robots: { index: false, follow: false } }
export const viewport: Viewport = { viewportFit: "cover" }

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="font-sans antialiased bg-cream text-foreground">{children}</body>
    </html>
  )
}
```

`(account)/layout.tsx` is the same with the title `Season Pass` and no viewport export. `(checkout)/layout.tsx` is the same with the title template `%s | Trailhead Lawn & Irrigation`, `robots: { index: false }` (the checkout is reached from `/season-pass`, never from search), and the GA4 scripts copied from the site layout (the `season_pass_purchase` event in Task 6.6 needs `gtag` on this tree). Move the `GA_MEASUREMENT_ID` constant and the two `<Script>` tags into `src/components/GoogleAnalytics.tsx` (a plain component, not a section, so the checkout layout may import it; the site layout uses it too).

**Step 5: The gate learns the server boundary.** In `scripts/design-gate/imports.mjs` add, for `zone === "marketing"`: an import whose path segments include `db`, `jobber`, `stripe` or `pass` under `@/lib` or `@/db` is a problem: `${file}: marketing code imports a server library (${spec})`. Tests in `scripts/check-design.test.mjs`: `components/sections/Leak.tsx` importing `@/db` fails; `app/(admin)/admin/page.tsx` importing `@/db` passes; `app/(site)/season-pass/page.tsx` importing `@/lib/season-pass` passes (the name `season-pass` is not `pass`). Run `npm run test:gate`.

**Step 6: Verify.** `npm test -- app-css` PASS. `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run manifest:compare`: unchanged (the new layouts have no pages yet, so the build emits no new route). In `docs/DESIGN.md` under Three tiers replace "Admin, checkout and account screens get their own stylesheet entry in the wiring phase." with "Admin, checkout and account screens are served by their own root layouts on `src/app/app.css`, which scans only the app folders; `globals.css` keeps its `@source not` lines so the two bundles never overlap."

**Step 7: Commit.** `Give the app route groups their own root layouts on app.css`

### Task 1.4: The checkout route renders the prototype behind the flag

A page under `(checkout)` proves the stylesheet entry in a real browser before any backend exists. It is off unless `SEASON_PASS_CHECKOUT=on`.

**Files:**
- Create: `src/lib/flags.ts`, `src/lib/flags.test.ts`
- Create: `src/app/(checkout)/season-pass/checkout/page.tsx`

**Step 1: Test first.**

```ts
// src/lib/flags.test.ts
import { it, expect, vi, afterEach } from "vitest"
import { checkoutEnabled } from "./flags"

afterEach(() => vi.unstubAllEnvs())

it("the checkout is off unless the flag is exactly on", () => {
  vi.stubEnv("SEASON_PASS_CHECKOUT", undefined)
  expect(checkoutEnabled()).toBe(false)
  vi.stubEnv("SEASON_PASS_CHECKOUT", "true")
  expect(checkoutEnabled()).toBe(false)
  vi.stubEnv("SEASON_PASS_CHECKOUT", "on")
  expect(checkoutEnabled()).toBe(true)
})
```

```ts
// src/lib/flags.ts
/** `SEASON_PASS_CHECKOUT=on` opens /season-pass/checkout; anything else keeps it a 404 and the contact button on /season-pass. */
export const checkoutEnabled = () => process.env.SEASON_PASS_CHECKOUT === "on"
```

**Step 2: The page.**

```tsx
// src/app/(checkout)/season-pass/checkout/page.tsx
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { checkoutEnabled } from "@/lib/flags"
import { getAdminData } from "@/lib/admin/data"
import { CheckoutFlow } from "./_screens/CheckoutFlow"

export const metadata: Metadata = { title: "Reserve your season" }
export const dynamic = "force-dynamic"

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ zones?: string }> }) {
  if (!checkoutEnabled()) notFound()
  const { zones } = await searchParams
  const data = await getAdminData()
  const season = Math.max(...data.blowoutWeeks.map((w) => w.season))
  return <CheckoutFlow weeks={data.blowoutWeeks} season={season} initialZones={zones ? Number(zones) : undefined} />
}
```

Phase 6 replaces the fixture weeks with the database and `season` with `currentSeason()`; this is the smallest page that renders.

**Step 3: Verify in the browser.** `SEASON_PASS_CHECKOUT=on npm run dev` (or add the flag to `.env.local`), open `http://localhost:3000/season-pass/checkout` in the browser pane at 1440 and 375: the cream canvas, the faint trail photo, the display-face question, the orange progress line. Walk the six steps with the keyboard. Then unset the flag and confirm the route is a 404. `npm run build` and `npm run manifest:compare`: unchanged (the route is in `SKIP`). Check `.next/static/css` now has two files and the marketing one is the same size as the baseline.

**Step 4: Commit.** `Serve the checkout prototype at /season-pass/checkout behind a flag`

**Phase 1 close:** `npm run test:stories` green (Storybook still scans all of `src` through `.storybook/storybook.css`, which is untouched). Open a PR for Phase 1 alone and merge it before Phase 2; after the Vercel deploy, open five marketing pages on the live site and compare with the screenshots from Task 1.2.

---

## Phase 2: Postgres with Drizzle

Estimate: one and a half days.

### Task 2.1: Install, env, the database handle and a test database

**Files:**
- Modify: `package.json`
- Create: `src/lib/env.ts`, `src/lib/env.test.ts`
- Create: `.env.example`
- Create: `drizzle.config.ts`
- Create: `src/db/index.ts`, `src/db/test-db.ts`

**Step 1: Install.** `npm i drizzle-orm @neondatabase/serverless` and `npm i -D drizzle-kit @electric-sql/pglite tsx`. Neon: create the database through the Vercel Marketplace (Storage → Neon) so `DATABASE_URL` lands in the Vercel project; pull it locally with `vercel env pull .env.local`, or paste it.

**Step 2: Env, test first.**

```ts
// src/lib/env.test.ts
import { it, expect, vi, afterEach } from "vitest"
import { readEnv } from "./env"

afterEach(() => vi.unstubAllEnvs())

it("names the missing variable", () => {
  vi.stubEnv("DATABASE_URL", undefined)
  expect(() => readEnv(["DATABASE_URL"])).toThrow("DATABASE_URL is not set")
})

it("returns the values it finds", () => {
  vi.stubEnv("DATABASE_URL", "postgres://x")
  expect(readEnv(["DATABASE_URL"])).toEqual({ DATABASE_URL: "postgres://x" })
})
```

```ts
// src/lib/env.ts
/** The one place secrets are read. A missing variable throws with its name, so a bad deploy fails at the first request, not at the first customer. */
export function readEnv<K extends string>(keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>
  for (const key of keys) {
    const value = process.env[key]
    if (!value) throw new Error(`${key} is not set`)
    out[key] = value
  }
  return out
}
```

Each library (`src/db`, `src/lib/stripe`, `src/lib/jobber`, `src/lib/email`) calls `readEnv([...])` lazily inside a function, never at import, so tests and Storybook can import the modules without the variables.

**Step 3: The handle and the test database.**

```ts
// src/db/index.ts
import "server-only"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { readEnv } from "@/lib/env"
import * as schema from "./schema"

let handle: ReturnType<typeof drizzle<typeof schema>> | undefined

/** The database, created on first use. Tests use `testDb()` from ./test-db instead and never import this file. */
export function db() {
  if (!handle) handle = drizzle(neon(readEnv(["DATABASE_URL"]).DATABASE_URL), { schema })
  return handle
}
export type Db = ReturnType<typeof db>
```

```ts
// src/db/test-db.ts
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema"

/** An in-memory Postgres with the migrations applied; one per test file. */
export async function testDb() {
  const client = new PGlite()
  const database = drizzle(client, { schema })
  await migrate(database, { migrationsFolder: "drizzle" })
  return database
}
export type TestDb = Awaited<ReturnType<typeof testDb>>
```

Every function that writes or reads takes a `Db | TestDb` as its first argument (a `Database` type alias in `src/db/types.ts`: `export type Database = Db | TestDb`), so the same code runs against Neon in production and PGlite in tests. Route handlers and server actions pass `db()`.

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit"
export default defineConfig({ schema: "./src/db/schema.ts", out: "./drizzle", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL! } })
```

Scripts in `package.json`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:studio": "drizzle-kit studio"`, `"db:seed": "tsx scripts/db-seed.ts"`.

**Step 4: `.env.example`** with every variable from the table and a one-line comment each.

**Step 5: `server-only` in vitest.** `src/db/index.ts` imports `server-only`, which throws outside a server component tree. Add to `vitest.config.ts` under `resolve.alias`: `"server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url))` with `src/test/server-only.ts` containing one line, `export {}`. Storybook never imports `src/db`, so it needs nothing.

**Step 6: Verify.** `npm test` green, `npx tsc --noEmit`, `npm run build`, `npm run manifest:compare`. Commit: `Add Drizzle, the env reader and an in-memory test database`

### Task 2.2: The schema and the first migration

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/schema.test.ts`
- Generate: `drizzle/0000_*.sql`

**Step 1: Write the failing test.**

```ts
// src/db/schema.test.ts
import { it, expect, beforeAll } from "vitest"
import { eq } from "drizzle-orm"
import { testDb, type TestDb } from "./test-db"
import { blowoutWeek, organization, seasonPass } from "./schema"

let db: TestDb
beforeAll(async () => {
  db = await testDb()
  await db.insert(organization).values({ id: "org_trailhead", name: "Trailhead Lawn & Irrigation" })
})

it("a pass belongs to an organization and a week is unique per season", async () => {
  await db.insert(blowoutWeek).values({ organizationId: "org_trailhead", season: 2027, weekStart: "2027-10-04", capacity: 20 })
  await expect(
    db.insert(blowoutWeek).values({ organizationId: "org_trailhead", season: 2027, weekStart: "2027-10-04", capacity: 5 }),
  ).rejects.toThrow()
  await expect(
    db.insert(seasonPass).values({ id: "p1", number: "TH-2027-0001", organizationId: "org_other", season: 2027, firstName: "A", email: "a@example.com", phone: "9705550100", address: "1 Way", town: "Erie", zones: 6, blowoutWeek: "2027-10-04", status: "active" }),
  ).rejects.toThrow()
})

it("pass numbers are unique inside an organization", async () => {
  const row = { id: "p2", number: "TH-2027-0002", organizationId: "org_trailhead", season: 2027, firstName: "B", email: "b@example.com", phone: "9705550101", address: "2 Way", town: "Erie" as const, zones: 6, blowoutWeek: "2027-10-04", status: "active" as const }
  await db.insert(seasonPass).values(row)
  await expect(db.insert(seasonPass).values({ ...row, id: "p3" })).rejects.toThrow()
  expect((await db.select().from(seasonPass).where(eq(seasonPass.id, "p2")))[0].zones).toBe(6)
})
```

Run: `npm test -- schema`. Expected: FAIL, no schema module.

**Step 2: The schema.** Every table carries `organizationId` referencing `organization.id`; `createdAt`/`updatedAt` default to `now()`. Enums are Postgres enums named after the screen-facing types in `src/lib/admin/types.ts` so the mapper never translates status words.

```ts
// src/db/schema.ts
import { sql } from "drizzle-orm"
import { boolean, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

export const townEnum = pgEnum("town", ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"])
export const roleEnum = pgEnum("admin_role", ["owner", "manager", "tech"])
export const passStatusEnum = pgEnum("pass_status", ["pending", "active", "cancelled", "lapsed"])
export const passVisitKindEnum = pgEnum("pass_visit_kind", ["turn-on", "inspection", "blowout"])
export const passVisitStatusEnum = pgEnum("pass_visit_status", ["unscheduled", "scheduled", "completed", "cancelled"])
export const chargeStatusEnum = pgEnum("charge_status", ["succeeded", "failed", "pending"])
export const visitKindEnum = pgEnum("visit_kind", ["turn-on", "inspection", "blowout", "repair", "install", "other"])
export const quoteStatusEnum = pgEnum("quote_status", ["awaiting", "approved", "declined"])
export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "unpaid", "overdue"])
export const queueKindEnum = pgEnum("queue_kind", ["jobber-webhook", "stripe-webhook", "pass-onboard", "pass-charge", "pass-cancel", "renewal-email", "email"])

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}
const org = () => text("organization_id").notNull().references(() => organization.id)

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Jobber's account id, set when the OAuth connection lands */
  jobberAccountId: text("jobber_account_id"),
  ...timestamps,
})

export const adminUser = pgTable("admin_user", {
  id: text("id").primaryKey(),
  organizationId: org(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: roleEnum("role").notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("admin_user_email").on(t.email)])

export const seasonPass = pgTable("season_pass", {
  id: text("id").primaryKey(),
  organizationId: org(),
  /** TH-2027-0001 */
  number: text("number").notNull(),
  season: integer("season").notNull(),
  firstName: text("first_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  town: townEnum("town").notNull(),
  zones: integer("zones").notNull(),
  /** the Monday, as YYYY-MM-DD */
  blowoutWeek: date("blowout_week").notNull(),
  status: passStatusEnum("status").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  cardBrand: text("card_brand"),
  cardLast4: text("card_last4"),
  /** YYYY-MM */
  cardExpires: text("card_expires"),
  jobberClientId: text("jobber_client_id"),
  jobberPropertyId: text("jobber_property_id"),
  /** the pass this one renewed, when it did */
  renewedFromId: text("renewed_from_id"),
  renewalAskedAt: timestamp("renewal_asked_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("season_pass_number").on(t.organizationId, t.number), index("season_pass_email").on(t.email), index("season_pass_season").on(t.organizationId, t.season)])

export const passVisit = pgTable("pass_visit", {
  id: text("id").primaryKey(),
  organizationId: org(),
  passId: text("pass_id").notNull().references(() => seasonPass.id),
  kind: passVisitKindEnum("kind").notNull(),
  /** "April to May", "July", "October, week of the 4th" */
  window: text("window").notNull(),
  /** whole dollars, fixed at purchase */
  amount: integer("amount").notNull(),
  status: passVisitStatusEnum("status").notNull().default("unscheduled"),
  jobberJobId: text("jobber_job_id"),
  jobberVisitId: text("jobber_visit_id"),
  jobberJobUrl: text("jobber_job_url"),
  jobberInvoiceId: text("jobber_invoice_id"),
  /** Mountain-time calendar days */
  scheduledOn: date("scheduled_on"),
  completedOn: date("completed_on"),
  chargedAt: timestamp("charged_at", { withTimezone: true }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  ...timestamps,
}, (t) => [uniqueIndex("pass_visit_pass_kind").on(t.passId, t.kind), index("pass_visit_jobber_visit").on(t.jobberVisitId)])

export const blowoutWeek = pgTable("blowout_week", {
  organizationId: org(),
  season: integer("season").notNull(),
  weekStart: date("week_start").notNull(),
  capacity: integer("capacity").notNull(),
  taken: integer("taken").notNull().default(0),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.organizationId, t.season, t.weekStart] })])

export const charge = pgTable("charge", {
  id: text("id").primaryKey(),
  organizationId: org(),
  passId: text("pass_id").notNull().references(() => seasonPass.id),
  passVisitId: text("pass_visit_id").notNull().references(() => passVisit.id),
  amount: integer("amount").notNull(),
  status: chargeStatusEnum("status").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  failureMessage: text("failure_message"),
  receiptUrl: text("receipt_url"),
  ...timestamps,
}, (t) => [uniqueIndex("charge_payment_intent").on(t.stripePaymentIntentId)])

export const jobberToken = pgTable("jobber_token", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scopes: text("scopes"),
  ...timestamps,
})

export const syncRun = pgTable("sync_run", {
  id: text("id").primaryKey(),
  organizationId: org(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  /** "scheduled" or "webhook" */
  trigger: text("trigger").notNull(),
  counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
  costUsed: integer("cost_used").notNull().default(0),
  error: text("error"),
})

export const queueItem = pgTable("queue_item", {
  id: text("id").primaryKey(),
  organizationId: org(),
  kind: queueKindEnum("kind").notNull(),
  /** the id the item is idempotent on: a webhook's item id and topic, a pass id, a visit id */
  key: text("key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  attempts: integer("attempts").notNull().default(0),
  runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  doneAt: timestamp("done_at", { withTimezone: true }),
  error: text("error"),
  ...timestamps,
}, (t) => [uniqueIndex("queue_item_key").on(t.kind, t.key), index("queue_item_due").on(t.doneAt, t.runAfter)])

// Jobber mirror. Rows are replaced wholesale by the sync; `raw` keeps the
// fields the mapper did not need, so a new column never needs a re-pull.
const mirror = {
  id: text("id").primaryKey(),
  organizationId: org(),
  jobberUrl: text("jobber_url").notNull(),
  raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}
export const jobberClient = pgTable("jobber_client", { ...mirror, firstName: text("first_name").notNull(), lastName: text("last_name"), email: text("email"), phone: text("phone"), town: townEnum("town"), lastVisitAt: timestamp("last_visit_at", { withTimezone: true }) })
export const jobberJob = pgTable("jobber_job", { ...mirror, clientId: text("client_id").notNull(), title: text("title"), passId: text("pass_id"), isPass: boolean("is_pass").notNull().default(false) })
export const jobberVisit = pgTable("jobber_visit", { ...mirror, jobId: text("job_id").notNull(), clientId: text("client_id").notNull(), kind: visitKindEnum("kind").notNull(), status: passVisitStatusEnum("status").notNull(), startAt: timestamp("start_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), title: text("title") }, (t) => [index("jobber_visit_start").on(t.organizationId, t.startAt)])
export const jobberQuote = pgTable("jobber_quote", { ...mirror, clientId: text("client_id").notNull(), total: integer("total").notNull(), sentAt: timestamp("sent_at", { withTimezone: true }), status: quoteStatusEnum("status").notNull() })
export const jobberInvoice = pgTable("jobber_invoice", { ...mirror, clientId: text("client_id").notNull(), jobId: text("job_id"), total: integer("total").notNull(), issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(), dueAt: timestamp("due_at", { withTimezone: true }).notNull(), status: invoiceStatusEnum("status").notNull(), paidAt: timestamp("paid_at", { withTimezone: true }) }, (t) => [index("jobber_invoice_issued").on(t.organizationId, t.issuedAt)])

// Auth.js tables (the Drizzle adapter's shape; only verification tokens are used with JWT sessions, the rest exist so the adapter installs cleanly).
export const authUser = pgTable("auth_user", { id: text("id").primaryKey(), name: text("name"), email: text("email").notNull().unique(), emailVerified: timestamp("email_verified", { mode: "date" }), image: text("image") })
export const authVerificationToken = pgTable("auth_verification_token", { identifier: text("identifier").notNull(), token: text("token").notNull(), expires: timestamp("expires", { mode: "date" }).notNull() }, (t) => [primaryKey({ columns: [t.identifier, t.token] })])
export const authAccount = pgTable("auth_account", { userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }), type: text("type").notNull(), provider: text("provider").notNull(), providerAccountId: text("provider_account_id").notNull() }, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })])
export const authSession = pgTable("auth_session", { sessionToken: text("session_token").primaryKey(), userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }), expires: timestamp("expires", { mode: "date" }).notNull() })

export const sqlNow = sql`now()`
```

`queue_item.key` is unique per kind, so a replayed webhook (same topic and item id) or a double-clicked action inserts nothing the second time (`onConflictDoNothing`).

**Step 3: Generate and test.** `npm run db:generate` writes `drizzle/0000_<name>.sql` and `drizzle/meta/`. Commit the folder. `npm test -- schema` PASS. Against the real database: `npm run db:migrate` (reads `DATABASE_URL` from `.env.local`; `drizzle-kit` loads it with `dotenv`-style resolution, else prefix the command with the variable).

**Step 4: Verify and commit.** `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run manifest:compare`. Commit: `Add the Season Pass schema and the first migration`

### Task 2.3: Seed from the fixture, and the pass number

**Files:**
- Create: `src/lib/pass/number.ts`, `src/lib/pass/number.test.ts`
- Create: `src/db/seed.ts`, `src/db/seed.test.ts`
- Create: `scripts/db-seed.ts`

**Step 1: The pass number, test first.**

```ts
// src/lib/pass/number.test.ts
import { it, expect } from "vitest"
import { nextPassNumber } from "./number"

it("counts up inside the season, four digits", () => {
  expect(nextPassNumber(2027, [])).toBe("TH-2027-0001")
  expect(nextPassNumber(2027, ["TH-2027-0001", "TH-2027-0007", "TH-2026-0040"])).toBe("TH-2027-0008")
})
```

```ts
// src/lib/pass/number.ts
/** The next TH-<season>-NNNN after the numbers already issued for that season. */
export function nextPassNumber(season: number, existing: string[]): string {
  const prefix = `TH-${season}-`
  const max = existing.filter((n) => n.startsWith(prefix)).reduce((m, n) => Math.max(m, Number(n.slice(prefix.length)) || 0), 0)
  return `${prefix}${String(max + 1).padStart(4, "0")}`
}
```

**Step 2: The seed, test first.** `seed(db, snapshot, { organizationId, admins })` inserts the organization, the admin users, the four blowout weeks, and the snapshot's twelve passes with their visits (status from the fixture, `scheduledOn` from the fixture's `scheduledAt` prefix, `chargedAt` as is) and a `charge` row per charged visit, and the mirror rows from the snapshot's clients, visits, quotes and invoices (`raw: {}`, `jobberUrl` from the fixture). It is idempotent: every insert is `onConflictDoNothing`. Test with `testDb()`: after `seed`, twelve passes, thirty-six visits, four weeks, two admins; running it twice changes nothing.

```ts
// scripts/db-seed.ts
import "dotenv/config"
import snapshot from "../src/lib/admin/fixtures/snapshot.json"
import { db } from "../src/db"
import { seed } from "../src/db/seed"
import type { AdminData } from "../src/lib/admin/types"

// npm run db:seed  — fills a fresh database with the anonymised snapshot so
// the live source has rows to show before the first Jobber sync and the
// first sale. Admin emails come from the environment so none are committed.
const admins = (process.env.SEED_ADMINS ?? "").split(",").filter(Boolean).map((entry) => {
  const [email, name, role] = entry.split(":")
  return { email, name, role: (role ?? "owner") as "owner" | "manager" | "tech" }
})
await seed(db(), snapshot as AdminData, { organizationId: "org_trailhead", admins })
console.log("seeded")
```

`npm i dotenv`. `scripts/db-seed.ts` imports `src/db/index.ts`, which imports `server-only`; run it with `tsx` after `npm i -D server-only`? No: `server-only` is already a dependency of Next and throws when imported outside React server; for `tsx` scripts set `NODE_OPTIONS=--import ./scripts/server-only-shim.mjs`, where the shim registers an empty module for `server-only` with `module.register`. Simpler: `scripts/db-seed.ts` creates its own handle (`drizzle(neon(url))`) without importing `src/db/index.ts`; do that and say so in the file's comment.

**Step 3: Seed the real database.** `SEED_ADMINS="hannah@example.com:Hannah:owner,ryan@example.com:Ryan:owner" npm run db:seed` with the real addresses (never commit them). Then `npm run db:studio` to look at the rows.

**Step 4: Verify and commit.** The four commands plus `npm run manifest:compare`. Commit: `Seed the database from the fixture and number passes per season`

**Phase 2 close:** `npm run test:stories` green.

---

## Phase 3: Sign-in

Estimate: one and a half days.

### Task 3.1: Auth.js with the Resend provider and the allow-list

**Files:**
- Modify: `package.json` (`next-auth@beta`, `@auth/drizzle-adapter`)
- Create: `src/auth.ts`, `src/lib/auth/allow.ts`, `src/lib/auth/allow.test.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Install.** `npm i next-auth@beta @auth/drizzle-adapter`. If npm refuses the peer range for Next 16, retry with `--legacy-peer-deps`, run the sign-in flow in Task 3.3, and if `auth()` or the route handler fails under Next 16, stop and replace Auth.js with a hand-rolled magic link (a `magic_link_token` table, a Resend email, a `jose`-signed cookie, about 150 lines in `src/lib/auth/`); keep the same `requireAdmin()` and `requireCustomer()` surface from Task 3.2 so nothing else changes. Record which path was taken in `docs/DESIGN.md` under Decisions.

**Step 2: The allow rule, test first.**

```ts
// src/lib/auth/allow.test.ts
import { it, expect } from "vitest"
import { classify } from "./allow"

const admins = [{ email: "hannah@example.com", role: "owner" as const, organizationId: "org_trailhead" }]
const passHolders = ["andrea@example.com"]

it("an admin email signs in as admin with its role", () => {
  expect(classify("Hannah@Example.com", admins, passHolders)).toEqual({ kind: "admin", role: "owner", organizationId: "org_trailhead" })
})
it("a pass holder signs in as a customer", () => {
  expect(classify("andrea@example.com", admins, passHolders)).toEqual({ kind: "customer", organizationId: "org_trailhead" })
})
it("anyone else cannot sign in", () => {
  expect(classify("stranger@example.com", admins, passHolders)).toBeNull()
})
```

```ts
// src/lib/auth/allow.ts
export type Principal = { kind: "admin"; role: "owner" | "manager" | "tech"; organizationId: string } | { kind: "customer"; organizationId: string }

/** Who an email is: an admin with a role, a customer with a pass, or nobody. Case does not matter. */
export function classify(email: string, admins: { email: string; role: Principal extends { role: infer R } ? R : never; organizationId: string }[], passHolders: string[], organizationId = "org_trailhead"): Principal | null {
  const e = email.trim().toLowerCase()
  const admin = admins.find((a) => a.email.toLowerCase() === e)
  if (admin) return { kind: "admin", role: admin.role, organizationId: admin.organizationId }
  if (passHolders.some((p) => p.toLowerCase() === e)) return { kind: "customer", organizationId }
  return null
}
```

(Write the `admins` parameter type as a named `AdminRow` interface; the conditional above is only to show the shape.)

**Step 3: The Auth.js config.**

```ts
// src/auth.ts
import "server-only"
import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { adminUser, authAccount, authSession, authUser, authVerificationToken, seasonPass } from "@/db/schema"
import { classify, type Principal } from "@/lib/auth/allow"

declare module "next-auth" {
  interface Session { principal: Principal; user: { email: string } }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db(), { usersTable: authUser, accountsTable: authAccount, sessionsTable: authSession, verificationTokensTable: authVerificationToken }),
  session: { strategy: "jwt" },
  providers: [Resend({ from: "Trailhead Lawn & Irrigation <no-reply@trailheadirrigation.com>" })],
  pages: { signIn: "/account/sign-in", verifyRequest: "/account/sign-in/sent", error: "/account/sign-in" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const admins = await db().select().from(adminUser)
      const holders = (await db().select({ email: seasonPass.email }).from(seasonPass)).map((r) => r.email)
      return classify(user.email, admins, holders) !== null
    },
    async jwt({ token }) {
      if (token.email && !token.principal) {
        const admins = await db().select().from(adminUser)
        const holders = (await db().select({ email: seasonPass.email }).from(seasonPass).where(eq(seasonPass.email, token.email))).map((r) => r.email)
        token.principal = classify(token.email, admins, holders)
      }
      return token
    },
    session({ session, token }) {
      session.principal = token.principal as Principal
      return session
    },
  },
})
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

The sign-in email text comes from the provider's default; Task 3.3 replaces it with Trailhead's words through `sendVerificationRequest`.

**Step 4: Verify.** `npm test -- allow` PASS; `npx tsc --noEmit`; `npm run build`; `npm run manifest:compare` (`/api/auth/[...nextauth]` is under `/api`, skipped). Commit: `Add Auth.js with the Resend magic link and the email allow-list`

### Task 3.2: The proxy gate, the per-page check and `server-only` on `getAdminData`

**Files:**
- Create: `src/proxy.ts`, `src/proxy.test.ts`
- Create: `src/lib/auth/guard.ts`, `src/lib/auth/guard.test.ts`
- Modify: `src/lib/admin/data.ts`, `src/lib/admin/data.test.ts`
- Create: `src/lib/admin/__mocks__/data.ts`

**Step 1: The proxy, test first.** The rule is pure so it can be tested without a request: `gateFor(pathname, principal)` returns `null` to pass, or the path to redirect to.

```ts
// src/proxy.test.ts
import { it, expect } from "vitest"
import { gateFor } from "./proxy"

const admin = { kind: "admin", role: "owner", organizationId: "org_trailhead" } as const
const customer = { kind: "customer", organizationId: "org_trailhead" } as const

it("admin paths need an admin", () => {
  expect(gateFor("/admin/passes", null)).toBe("/admin/sign-in?next=%2Fadmin%2Fpasses")
  expect(gateFor("/admin/passes", customer)).toBe("/admin/sign-in?next=%2Fadmin%2Fpasses")
  expect(gateFor("/admin/passes", admin)).toBeNull()
  expect(gateFor("/admin/sign-in", null)).toBeNull()
})
it("account paths need a customer or an admin", () => {
  expect(gateFor("/account/pass", null)).toBe("/account/sign-in?next=%2Faccount%2Fpass")
  expect(gateFor("/account/pass", customer)).toBeNull()
  expect(gateFor("/account/pass", admin)).toBeNull()
})
it("everything else passes", () => {
  expect(gateFor("/pricing", null)).toBeNull()
})
```

```ts
// src/proxy.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import type { Principal } from "@/lib/auth/allow"

// The first of the two gates (docs/DESIGN.md, Decisions): the proxy checks
// the /admin and /account prefixes; every page and action checks the
// session again through src/lib/auth/guard.ts, because a proxy alone was
// bypassable in 2025 (CVE-2025-29927).
const SIGN_IN = { admin: "/admin/sign-in", account: "/account/sign-in" }

export function gateFor(pathname: string, principal: Principal | null | undefined): string | null {
  const next = `?next=${encodeURIComponent(pathname)}`
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith(SIGN_IN.admin)) return null
    return principal?.kind === "admin" ? null : `${SIGN_IN.admin}${next}`
  }
  if (pathname.startsWith("/account")) {
    if (pathname.startsWith(SIGN_IN.account)) return null
    return principal ? null : `${SIGN_IN.account}${next}`
  }
  return null
}

export default auth((request) => {
  const to = gateFor(request.nextUrl.pathname, request.auth?.principal)
  return to ? NextResponse.redirect(new URL(to, request.nextUrl)) : NextResponse.next()
})

export const config = { matcher: ["/admin/:path*", "/account/:path*"] }
```

Next 16 names the file `proxy.ts` (the old `middleware.ts` still works with a warning). The matcher keeps the proxy off every marketing route, so nothing there pays for the session read.

**Step 2: The guard, test first.** `requireAdmin(minRole?)` and `requireCustomer()` read `auth()` and `redirect()` when the principal is missing; `requireAdmin("manager")` also redirects a `tech`. Test with `vi.mock("@/auth", () => ({ auth: vi.fn() }))` and `vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("redirect") }) }))`: an owner passes, a tech asking for manager throws, no session throws, and the redirect target is the sign-in page.

```ts
// src/lib/auth/guard.ts
import "server-only"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import type { Principal } from "./allow"

const RANK = { tech: 0, manager: 1, owner: 2 } as const
export type Role = keyof typeof RANK

/** The second gate: every admin page and action calls this first. Returns the principal and the signed-in email. */
export async function requireAdmin(minRole: Role = "tech"): Promise<{ principal: Extract<Principal, { kind: "admin" }>; email: string }> {
  const session = await auth()
  const p = session?.principal
  if (!session?.user?.email || p?.kind !== "admin") redirect("/admin/sign-in")
  if (RANK[p.role] < RANK[minRole]) redirect("/admin?denied=1")
  return { principal: p, email: session.user.email }
}

export async function requireCustomer(): Promise<{ principal: Principal; email: string }> {
  const session = await auth()
  if (!session?.user?.email || !session.principal) redirect("/account/sign-in")
  return { principal: session.principal, email: session.user.email }
}
```

**Step 3: `getAdminData` goes server-only, with a mock.** In `src/lib/admin/data.ts` add `import "server-only"` as the first line and change the `live` branch to `return (await import("./live")).getLiveAdminData()` (Task 4.7 writes `live.ts`; until then it is a one-line module that throws the old message, so `data.test.ts` keeps passing). Create `src/lib/admin/__mocks__/data.ts`:

```ts
import type { AdminData } from "../types"
import snapshot from "../fixtures/snapshot.json"
/** vi.mock("@/lib/admin/data") gives the snapshot to any page test without touching the database. */
export async function getAdminData(): Promise<AdminData> {
  return snapshot as AdminData
}
```

In `data.test.ts` nothing changes (the vitest alias from Task 2.1 makes `server-only` a no-op). Stories never import `data.ts`.

**Step 4: Verify.** `npm test` green; `npx tsc --noEmit`; `npm run build`; `npm run manifest:compare`. Commit: `Gate /admin and /account in the proxy and on every page, and make getAdminData server-only`

### Task 3.3: Sign-in pages and the email

**Files:**
- Create: `src/app/(admin)/admin/sign-in/page.tsx`, `src/app/(account)/account/sign-in/page.tsx`, `src/app/(account)/account/sign-in/sent/page.tsx`
- Create: `src/components/blocks/SignInCard.tsx`, `SignInCard.stories.tsx`, `SignInCard.test.tsx`
- Create: `src/lib/email/sign-in.ts`, `src/lib/email/sign-in.test.ts`
- Modify: `src/auth.ts` (`sendVerificationRequest`)

**Step 1: The block, test first.** `SignInCard({ title, line, action })` renders a form with one email input (`data-autofocus`, `autoComplete="email"`) and one button, inside a `Card`, centred on the cream canvas with the badge logo above. The `action` is a server action (`(formData) => void`); in the story it is `fn()`. Test: renders the title, the input is required and of type email, the button says the action word. Stories: `Admin` ("Sign in to the dashboard"), `Customer` ("Open your Season Pass"), `Sent` (the line "Check your email for the link. It works once and for ten minutes."), `Phone`.

**Step 2: The pages.** Each page is a server component that calls `signIn("resend", { email, redirectTo: next })` in an inline server action and renders `SignInCard`. The admin page title is "Sign in to the dashboard", the line "Hannah and Ryan only. We email you a link." The customer page: "Open your Season Pass", "Enter the email you used at checkout and we send you a link." `sent/page.tsx` renders the Sent variant. If the session already has the right principal, `redirect(next)`.

**Step 3: The email, test first.** `signInEmail({ url, kind })` returns `{ subject, text, html }`: subject "Your Trailhead sign-in link"; text with the link on its own line and "It works once and for ten minutes. If you did not ask for it, ignore this email."; no exclamation marks. Test the subject and that the url appears in both bodies. Wire it: in `src/auth.ts` give the Resend provider `sendVerificationRequest({ identifier, url, provider })` that calls `new Resend(provider.apiKey).emails.send({ from: provider.from, to: identifier, ...signInEmail({ url, kind: url.includes("/admin") ? "admin" : "customer" }) })`.

**Step 4: Verify in the browser.** With `.env.local` set (`AUTH_SECRET`, `AUTH_RESEND_KEY`, `AUTH_URL=http://localhost:3000`, `DATABASE_URL`) and the seeded admin emails: open `/admin` → redirected to `/admin/sign-in`; enter the seeded address; the email arrives (Resend dashboard, Logs, if the inbox is slow); the link lands on `/admin` (a 404 for now, the Home page comes in Phase 8; the proxy no longer redirects, which is the proof). Try a stranger's email: the page says "That email is not on the list." (the `error=AccessDenied` query from Auth.js, rendered by the page as one line). `npm run build`, `npm run manifest:compare`.

**Step 5: Commit.** `Add the sign-in pages and the sign-in email`

**Phase 3 close:** `npm run test:stories`, and `npm run check:design` must list `SignInCard` with its story.

---

## Phase 4: Live data: the Jobber client, sync, webhooks and `getAdminData("live")`

Estimate: three days. This is the phase with the most unknowns; the cost extension and pagination fields are confirmed against GraphiQL as each query is written.

### Task 4.1: OAuth: connect, callback, token refresh

**Files:**
- Create: `src/lib/jobber/oauth.ts`, `src/lib/jobber/oauth.test.ts`
- Create: `src/app/api/jobber/connect/route.ts`, `src/app/api/jobber/callback/route.ts`

**Step 1: Test first.** `authorizeUrl({ clientId, redirectUri, state })` builds `https://api.getjobber.com/api/oauth/authorize?client_id=…&redirect_uri=…&state=…&response_type=code`; `tokenFromResponse(json, now)` turns `{ access_token, refresh_token, expires_in }` into `{ accessToken, refreshToken, expiresAt }`; `needsRefresh(token, now)` is true inside two minutes of `expiresAt`. Three tests.

**Step 2: Implement.** `exchangeCode(code)` and `refresh(token)` POST to `https://api.getjobber.com/api/oauth/token` (form-encoded: `client_id`, `client_secret`, `grant_type` of `authorization_code` or `refresh_token`, and `code` or `refresh_token`) and upsert `jobber_token` for the organization. Jobber may rotate the refresh token on every refresh, so always store the one that comes back. `connect/route.ts` requires an owner (`requireAdmin("owner")`), signs `state` with `AUTH_SECRET` (an HMAC of the organization id and a timestamp), and redirects to `authorizeUrl`. `callback/route.ts` verifies `state`, exchanges the code, stores the token, reads the account id with `{ account { id name } }` into `organization.jobber_account_id`, and redirects to `/admin?connected=jobber`.

**Step 3: Verify.** In the Developer Center set the app's callback URL to `https://www.trailheadirrigation.com/api/jobber/callback` and, for local work, `http://localhost:3000/api/jobber/callback`. Sign in as owner, open `/api/jobber/connect`, approve on Jobber, land on `/admin?connected=jobber`; `npm run db:studio` shows the token row. Commit: `Connect Jobber by OAuth and keep the token fresh`

### Task 4.2: The GraphQL client with the cost budget

**Files:**
- Create: `src/lib/jobber/client.ts`, `src/lib/jobber/client.test.ts`
- Create: `src/lib/jobber/ids.ts`, `src/lib/jobber/ids.test.ts`

**Step 1: Ids, test first.** Jobber ids are base64 of `gid://Jobber/Client/156368396`; the dashboard links in the snapshot use the number. `decodeGid(id)` returns `{ type: "Client", number: "156368396" }`; `webUrl(id)` returns `https://secure.getjobber.com/clients/156368396` for clients, `/work_orders/` for jobs, `/invoices/`, `/quotes/`, and the job URL for a visit. Prefer the API's own `jobberWebUri` field when a query returns it; `webUrl` is the fallback the test covers.

**Step 2: The client, test first.** `jobberQuery(db, organizationId, document, variables)`: reads the token, refreshes if needed, POSTs to `https://api.getjobber.com/api/graphql` with `Authorization: Bearer`, `X-JOBBER-GRAPHQL-VERSION: <JOBBER_API_VERSION>`, returns `data`, and reads `extensions.cost.throttleStatus`: when `currentlyAvailable` is below `requestedQueryCost` plus a margin, waits `(requestedQueryCost - currentlyAvailable) / restoreRate` seconds before the next call. On a GraphQL `errors` array it throws `JobberError` with the messages; on `THROTTLED` it waits and retries once. Tests with `vi.stubGlobal("fetch", …)`: the headers; a throttled first response then success; the wait computed from a throttle status (`vi.useFakeTimers`). The field names come from the facts file; if Task 0.1 found different names, this is the one file to change.

**Step 3: Verify and commit.** `npm test -- jobber`; the four commands. Commit: `Add the Jobber GraphQL client with the cost budget`

### Task 4.3: The queries and the mapper from Jobber shapes to mirror rows

**Files:**
- Create: `src/lib/jobber/queries.ts` (the GraphQL documents as strings)
- Create: `src/lib/jobber/map.ts`, `src/lib/jobber/map.test.ts`

**Step 1: Move the pure parts of `scripts/anonymise-snapshot.mjs` into TypeScript.** `town(city)` (the `TOWN_MAP` fold), `kindOf(text)` (the `KIND_RULES`), `visitStatus(v)` and `quoteStatus(q)` go into `src/lib/jobber/map.ts` with the same behaviour; the script imports them from there (`tsx` can import TS; change the script's shebang line to `#!/usr/bin/env -S npx tsx` and its name to `.ts`, or keep the duplicates and a test that the two agree; choose the import). Tests, test first: each table in `KIND_RULES` has a case ("Fall Blowout" → blowout, "Spring Start Up" → turn-on, "Sprinkler Repair" → repair, "New System" → install, "" → other); `town("Niwot")` → Longmont; an unknown city → null.

**Step 2: The queries.** One document per object with cursor pagination (`first: 50, after: $cursor`) and a `filter` on `updatedAt` so the scheduled sync pulls only what changed since the last successful run: `clients`, `jobs` (with `customFields` so the pass id comes back), `visits` (with `startAt`, `endAt`, `completedAt`, `title`, `job { id jobberWebUri }`, `client { id }`, `visitStatus`), `quotes` (`amounts { total }`, `quoteStatus`, `sentAt`), `invoices` (`amounts { total }`, `issuedDate`, `dueDate`, `invoiceStatus`, `job { id }`). Write each in GraphiQL first, paste the exact field names (the facts doc gets a "Queries" section with each document and a sample response), and keep the page size inside the cost budget Task 0.1 recorded.

**Step 3: The row mappers, test first.** `toClientRow`, `toJobRow`, `toVisitRow`, `toQuoteRow`, `toInvoiceRow` take one node from the query and the organization id and return the insert shape for the mirror table. Tests use a sample node pasted from GraphiQL per object (anonymised: a first name, a town, no address). Assert: the Jobber URL, the town fold, the kind, the status, dollars as whole numbers (`Math.round(Number(total))`), `isPass` true when the job carries the `season-pass` tag or the pass-id custom field, and `passId` read from it.

**Step 4: Verify and commit.** Commit: `Add the Jobber queries and the mappers to the mirror tables`

### Task 4.4: The scheduled sync

**Files:**
- Create: `src/lib/jobber/sync.ts`, `src/lib/jobber/sync.test.ts`
- Create: `src/app/api/cron/jobber-sync/route.ts`
- Create: `vercel.json`

**Step 1: Test first.** `runSync(db, organizationId, { query, now, trigger })` where `query` is the client function (injected so the test passes a fake that returns two pages of clients and one of each other object): it opens a `sync_run`, pulls each object since the last finished run's `startedAt` (or everything on the first run), upserts the rows (`onConflictDoUpdate` on `id`, replacing every column), writes `counts` and `costUsed`, and closes the run; a thrown error lands in `sync_run.error` and the run still closes. Tests with `testDb()`: first run pulls everything and counts match; second run passes `updatedAt` filter from the first run's start; an error is recorded and the earlier rows stay.

**Step 2: The route.**

```ts
// src/app/api/cron/jobber-sync/route.ts
import { NextResponse } from "next/server"
import { db } from "@/db"
import { readEnv } from "@/lib/env"
import { jobberQuery } from "@/lib/jobber/client"
import { runSync } from "@/lib/jobber/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`; nothing else may. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${readEnv(["CRON_SECRET"]).CRON_SECRET}`) return new NextResponse("forbidden", { status: 403 })
  const run = await runSync(db(), "org_trailhead", { query: jobberQuery, now: new Date(), trigger: "scheduled" })
  return NextResponse.json({ id: run.id, counts: run.counts, error: run.error })
}
```

```json
{ "crons": [
  { "path": "/api/cron/jobber-sync", "schedule": "*/15 * * * *" },
  { "path": "/api/cron/drain", "schedule": "*/5 * * * *" },
  { "path": "/api/cron/renewals", "schedule": "0 15 1 1 *" },
  { "path": "/api/cron/lapse", "schedule": "0 15 1 4 *" }
] }
```

If the Vercel project is on Hobby, change the first two to `0 12 * * *` and `0 13 * * *` and say so in `docs/DESIGN.md` under Decisions; the webhooks (Task 4.5) keep the mirror current between runs either way. The two yearly entries are written in Phase 9 (the routes do not exist yet, so leave those two lines out until Task 9.2 and add them then).

**Step 3: Verify.** Locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/jobber-sync` with the token connected; the response counts match what Jobber shows; `npm run db:studio` lists the rows. Commit: `Pull clients, jobs, visits, quotes and invoices from Jobber on a schedule`

### Task 4.5: The Jobber webhook endpoint and the queue

**Files:**
- Create: `src/lib/queue/index.ts`, `src/lib/queue/index.test.ts`
- Create: `src/lib/jobber/webhook.ts`, `src/lib/jobber/webhook.test.ts`
- Create: `src/app/api/webhooks/jobber/route.ts`
- Create: `src/app/api/cron/drain/route.ts`

**Step 1: The queue, test first.** `enqueue(db, { organizationId, kind, key, payload, runAfter? })` inserts with `onConflictDoNothing` and returns whether it inserted; `drain(db, handlers, { now, limit })` takes due, undone items oldest first, runs `handlers[kind](payload, item)`, marks `doneAt` on success, and on failure increments `attempts`, stores the error and sets `runAfter` to now plus `2^attempts` minutes (an item that failed eight times stops being retried and becomes an `attention` row in Task 4.7). Tests: a duplicate key inserts nothing; a handler that throws is retried later and the error is stored; a handler that succeeds is done; order.

**Step 2: The webhook verification, test first.**

```ts
// src/lib/jobber/webhook.test.ts
import { createHmac } from "node:crypto"
import { it, expect } from "vitest"
import { verifyJobberSignature, parseWebhook } from "./webhook"

const secret = "s3cret"
const body = JSON.stringify({ data: { webHookEvent: { topic: "VISIT_COMPLETE", appId: "a", accountId: "acc", itemId: "Z2lk", occurredAt: "2027-04-20T17:10:00Z" } } })
const sig = createHmac("sha256", secret).update(body).digest("base64")

it("accepts the right signature and rejects a wrong one", () => {
  expect(verifyJobberSignature(body, sig, secret)).toBe(true)
  expect(verifyJobberSignature(body, "nope", secret)).toBe(false)
  expect(verifyJobberSignature(body + " ", sig, secret)).toBe(false)
})
it("reads the topic and item id", () => {
  expect(parseWebhook(body)).toEqual({ topic: "VISIT_COMPLETE", itemId: "Z2lk", accountId: "acc", occurredAt: "2027-04-20T17:10:00Z" })
})
```

`verifyJobberSignature` computes the HMAC-SHA256 of the raw body with the client secret, base64, and compares with `timingSafeEqual` (same length first). The header is `X-Jobber-Hmac-SHA256`; confirm the exact name in the facts doc.

**Step 3: The route.**

```ts
// src/app/api/webhooks/jobber/route.ts
import { NextResponse, after } from "next/server"
import { db } from "@/db"
import { readEnv } from "@/lib/env"
import { parseWebhook, verifyJobberSignature } from "@/lib/jobber/webhook"
import { enqueue } from "@/lib/queue"
import { drainAll } from "@/lib/queue/handlers"

export const dynamic = "force-dynamic"

// Jobber delivers at least once, carries only an item id, and wants a 2xx
// within a second. So: verify, insert the item (a repeat is a no-op on its
// key), answer, and do the work after the response.
export async function POST(request: Request) {
  const body = await request.text()
  const { JOBBER_CLIENT_SECRET } = readEnv(["JOBBER_CLIENT_SECRET"])
  if (!verifyJobberSignature(body, request.headers.get("x-jobber-hmac-sha256") ?? "", JOBBER_CLIENT_SECRET)) return new NextResponse("bad signature", { status: 401 })
  const event = parseWebhook(body)
  await enqueue(db(), { organizationId: "org_trailhead", kind: "jobber-webhook", key: `${event.topic}:${event.itemId}:${event.occurredAt}`, payload: event })
  after(() => drainAll(db()))
  return NextResponse.json({ ok: true })
}
```

`src/lib/queue/handlers.ts` holds `drainAll(db)` and the handler table; the `jobber-webhook` handler (Task 4.6) re-reads the item from the API and updates the mirror. `api/cron/drain/route.ts` is the same shape as the sync route and calls `drainAll`. The organization comes from `event.accountId` matched to `organization.jobber_account_id`; with one organization the constant is fine, but write the lookup (`organizationForAccount(db, accountId)`) so a second account does not land in Trailhead's rows.

**Step 4: Verify.** Subscribe the topics in the Developer Center (the facts doc says where) pointing at `https://www.trailheadirrigation.com/api/webhooks/jobber`; for local work use `vercel dev` with a tunnel or test by `curl` with a signature computed by `node -e`. A replayed curl inserts nothing the second time (`queue_item` count unchanged). Commit: `Receive Jobber webhooks into the queue and drain it after the response`

### Task 4.6: Webhook handlers: re-read the item and update the mirror

**Files:**
- Create: `src/lib/queue/handlers.ts`, `src/lib/queue/handlers.test.ts`
- Create: `src/lib/jobber/refresh-item.ts`, `src/lib/jobber/refresh-item.test.ts`

**Step 1: Test first.** `refreshItem(db, organizationId, { topic, itemId }, query)` picks the query by topic (`VISIT_*` → the single-visit query, `JOB_*`, `CLIENT_*`, `INVOICE_*`, `QUOTE_*`), maps the node with Task 4.3's mapper, upserts the mirror row, and for `visitComplete` on a visit whose job `isPass` enqueues `pass-charge` with key `visit:<id>` (Phase 5 writes the handler). Tests with a fake `query`: a visit update replaces the mirror row; a visit complete on a pass job enqueues one `pass-charge`; the same event twice enqueues one; an unknown topic is done with no effect.

**Step 2: The handler table.**

```ts
export const handlers: Record<QueueKind, Handler> = {
  "jobber-webhook": (db, payload) => refreshItem(db, "org_trailhead", payload as WebhookEvent, jobberQuery),
  "stripe-webhook": notYet, "pass-onboard": notYet, "pass-charge": notYet, "pass-cancel": notYet, "renewal-email": notYet, "email": notYet,
}
```

`notYet` throws "handler arrives in a later phase" so an early item is retried, not lost. Phases 5 to 9 replace the entries.

**Step 3: Verify and commit.** `Update the Jobber mirror from webhooks`

### Task 4.7: `getAdminData("live")`

**Files:**
- Create: `src/lib/admin/live.ts`, `src/lib/admin/live.test.ts`
- Modify: `src/lib/admin/types.ts` (`PassVisit.jobberUrl?`, `Pass.cardBrand?`, `Pass.email?`)
- Modify: `src/lib/admin/data.ts`, `src/lib/admin/data.test.ts`

**Step 1: Types.** Add to `PassVisit`: `jobberUrl?: string` (the visit's own job; closes the first known gap) and `status?: VisitStatus`; to `Pass`: `cardBrand?: string` (closes the Visa gap) and `email: string` is not added (the screens never show it; the panel's actions take the pass id). Stories and fixtures compile unchanged because the fields are optional.

**Step 2: Test first.** `getLiveAdminData(db, organizationId, now)` returns `AdminData`:
- `clients` from `jobber_client` with `hasPass` from an active `season_pass` with that `jobber_client_id`;
- `visits` from `jobber_visit` for the last 7 and next 30 days (Home shows two days; the window keeps the payload small), `isPass` from the job;
- `quotes`, `invoices` from the mirror (`overdue` computed: unpaid and `dueAt` before `now`);
- `passes` from `season_pass` with `visits` from `pass_visit` in kind order (turn-on, inspection, blowout), `scheduledAt`/`completedAt` from the date columns as `YYYY-MM-DD`, `chargedAt` as ISO, `stripeUrl` as `https://dashboard.stripe.com/customers/<id>`, `jobberUrl` as the client's URL, per-visit `jobberUrl` from `jobber_job_url`; `pending` passes are left out;
- `blowoutWeeks` for `currentSeason(now)` with `towns` from the active passes in each;
- `monthTotals` from `jobber_invoice` (paid, by `issuedAt` month in `TIME_ZONE`) for this year and last, `visits` counted from completed `jobber_visit`;
- `attention` from: `charge` rows failed in the last 30 days; `queue_item` rows with eight attempts (`jobs-failed` when kind is `pass-onboard`); weeks where `taken >= capacity`; passes whose `card_expires` is before October of the season;
- `syncedAt` from the last finished `sync_run` or the newest `queue_item.doneAt`, whichever is later.

Tests with `testDb()` seeded through Task 2.3's `seed`: the result passes `snapshot.test.ts`'s shape checks (reuse its assertions by exporting them as `assertAdminDataShape(data)` from `src/lib/admin/fixtures/snapshot.test.ts` into `src/lib/admin/shape.ts`); the twelve passes come back with thirty-six visits in order; `monthComparison` on the result gives the same numbers as on the fixture for a month the seed carries; a `pending` pass is absent; an attention row appears for a failed charge inserted by the test.

**Step 3: Wire it.** `data.ts`: `if (source === "live") return (await import("./live")).getLiveAdminData(db(), "org_trailhead", new Date())`. `data.test.ts`: replace the two "not wired yet" tests with one that mocks `./live` (`vi.mock("./live", () => ({ getLiveAdminData: vi.fn(async () => snapshot) }))`) and asserts `getAdminData("live")` resolves to it.

**Step 4: Verify.** `ADMIN_DATA_SOURCE=live` in `.env.local`, `npm run dev`, and a temporary `console.log(JSON.stringify(await getAdminData()).length)` in the checkout page confirms the live data loads from Neon (remove it). The four commands and `npm run manifest:compare`. Commit: `Read admin data from the database`

**Phase 4 close:** `npm run test:stories`. Hand-check in Drizzle Studio that a visit completed in Jobber on the tester account reaches `jobber_visit` within a minute through the webhook.

---

## Phase 5: Stripe

Estimate: two days.

### Task 5.1: The Stripe client, customers and the setup-mode Checkout Session

**Files:**
- Modify: `package.json` (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`)
- Create: `src/lib/stripe/client.ts`, `src/lib/stripe/checkout.ts`, `src/lib/stripe/checkout.test.ts`

**Step 1: Install.** `npm i stripe @stripe/stripe-js @stripe/react-stripe-js`. Stripe dashboard: test mode keys into `.env.local`; in the Checkout settings turn on "Embedded" (it is on by default for new accounts).

**Step 2: Test first.** `createSetupSession(stripe, { passId, email, name, origin })` creates (or finds by `metadata.passId`) a customer with `email`, `name`, `metadata: { passId }` and a Checkout Session with `mode: "setup"`, `ui_mode: "embedded"`, `customer`, `currency: "usd"`, `redirect_on_completion: "never"`, `payment_method_types: ["card"]`, `metadata: { passId }`, and returns `{ customerId, sessionId, clientSecret }`. Test with a fake `stripe` object whose `customers.create` and `checkout.sessions.create` are `vi.fn()` returning ids; assert the arguments. `paymentMethodFromSession(stripe, sessionId)` retrieves the session with `expand: ["setup_intent.payment_method"]` and returns `{ paymentMethodId, brand, last4, expires: "YYYY-MM" }` from `card.exp_year` and `exp_month`; test the expiry formatting.

```ts
// src/lib/stripe/client.ts
import "server-only"
import Stripe from "stripe"
import { readEnv } from "@/lib/env"
let instance: Stripe | undefined
export function stripe() {
  if (!instance) instance = new Stripe(readEnv(["STRIPE_SECRET_KEY"]).STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
  return instance
}
```

Use the API version the installed `stripe` package pins (its `README`); the string above is an example.

**Step 3: Verify and commit.** `Add the Stripe client and the setup-mode Checkout Session`

### Task 5.2: Charging a visit off-session, and the receipt

**Files:**
- Create: `src/lib/stripe/charge.ts`, `src/lib/stripe/charge.test.ts`
- Create: `src/lib/pass/charge-visit.ts`, `src/lib/pass/charge-visit.test.ts`
- Create: `src/lib/email/receipt.ts`, `src/lib/email/charge-failed.ts`, `src/lib/email/admin-alert.ts`, `src/lib/email/send.ts`, with one test file per email

**Step 1: The Stripe call, test first.** `chargeOffSession(stripe, { customerId, paymentMethodId, amount, description, passVisitId })` creates a PaymentIntent with `amount: amount * 100`, `currency: "usd"`, `customer`, `payment_method`, `off_session: true`, `confirm: true`, `description`, `metadata: { passVisitId }`, and the idempotency key `pass-visit-${passVisitId}` in the request options; it returns `{ ok: true, paymentIntentId, receiptUrl }` or `{ ok: false, paymentIntentId?, message }` when Stripe throws a `StripeCardError` (`err.raw.payment_intent.id`, `err.message`). Tests: the arguments including the idempotency key; a card error becomes `ok: false` with the message.

**Step 2: The orchestration, test first.** `chargeVisit(db, deps, { jobberVisitId })`:
1. find the `pass_visit` by `jobber_visit_id` (or by `jobber_job_id` when Jobber's visit id was not known at creation), and its pass; if none, done (not a pass visit);
2. if `charged_at` is set or a `charge` row with `succeeded` exists, done (the idempotent return the PRD asks for);
3. if the pass is not `active`, done, and tell Hannah (a cancelled pass's visit was completed anyway);
4. insert a `charge` row with `pending` (key: the visit id), call `chargeOffSession` with the visit's stored `amount`;
5. on success: update the charge to `succeeded` with the intent and receipt URL, set `pass_visit.charged_at`, `completed_on` and `status = "completed"`, enqueue `email` for the receipt, and call `markInvoicePaid` (Task 5.4);
6. on failure: update the charge to `failed` with the message, enqueue `email` for the customer's card-update link (Task 5.3) and an admin alert; no retry (the PRD: nothing retries silently more than once; the customer's card update triggers the one retry in Task 5.3).

`deps` is `{ stripe, markInvoicePaid, now }` so the test injects fakes. Tests with `testDb()` and a seeded pass: a success writes the charge, the dates and two queue items; a second call does nothing; a failure writes `failed` and the two emails; a cancelled pass charges nothing.

**Step 3: Emails.** `send.ts`: `sendEmail(db, { to, subject, text, html, key })` enqueues an `email` item (so a Resend outage retries) and the `email` handler calls `new Resend(RESEND_API_KEY).emails.send({ from: "Trailhead Lawn & Irrigation <hello@trailheadirrigation.com>", … })`. The sender address must be verified in Resend (the contact form already sends from the domain). Each email module exports a pure `{ subject, text, html }` builder, tested for its subject and that every number comes from the arguments (the receipt says "$145 for the spring turn-on on April 20"; the failed-charge email says what to do: "Update your card here and we try again the same day."; the admin alert's subject is "Charge failed: Andrea, Erie, spring turn-on"). The copy rules apply: short sentences, no exclamation marks, no em dashes.

**Step 4: The handler.** `pass-charge` in `handlers.ts` calls `chargeVisit`. **Verify** with `npm test -- charge`, the four commands. Commit: `Charge the saved card after a completed pass visit, with the receipt and the failure email`

### Task 5.3: The card-update link and the retry after an update

**Files:**
- Create: `src/lib/stripe/card-update.ts`, `src/lib/stripe/card-update.test.ts`
- Create: `src/app/(account)/account/pass/card-updated/page.tsx`

**Step 1: Test first.** `createCardUpdateSession(stripe, { passId, customerId, origin })` creates a hosted Checkout Session in setup mode (`ui_mode: "hosted"`, `success_url: ${origin}/account/pass/card-updated?session_id={CHECKOUT_SESSION_ID}`, `cancel_url: ${origin}/account/pass`, `metadata: { passId, purpose: "card-update" }`) and returns its URL. `applyCardUpdate(db, stripe, sessionId)` reads the payment method from the session (Task 5.1's helper), stores it on the pass (`stripe_payment_method_id`, brand, last4, expiry), sets it as the customer's default (`customers.update(customerId, { invoice_settings: { default_payment_method } })`), detaches the old method, and, when the pass has a `failed` charge with no later success, re-enqueues `pass-charge` for that visit once (key `visit:<id>:retry`). Tests: the stored fields; the one retry; a second `applyCardUpdate` with the same session does nothing.

**Step 2: The page.** `card-updated/page.tsx` requires a customer, calls `applyCardUpdate` (idempotent, so a refresh is safe), and redirects to `/account/pass?card=updated`. The `checkout.session.completed` webhook (Task 5.5) calls the same function for the case where the customer closes the tab before the redirect.

**Step 3: Verify and commit.** `Let a customer update the card on file and retry the failed charge once`

### Task 5.4: Marking the Jobber invoice paid, behind the adapter

**Files:**
- Create: `src/lib/jobber/invoice-paid.ts`, `src/lib/jobber/invoice-paid.test.ts`

**Step 1: Test first.** `markInvoicePaid(db, query, { passVisit, charge })`: with `JOBBER_FACTS.invoicePayment === "api"`, find the invoice for the visit's job in `jobber_invoice` (or query Jobber for it) and run the mutation the facts doc recorded, with the amount and a note "Paid by card through the Season Pass, Stripe <intent id>"; with `"manual"`, run `jobEdit` (or the note mutation the facts doc found) to add "Season Pass: paid by card, Stripe receipt <url>. Mark the invoice paid." to the job, and insert an `attention`-producing row: a `queue_item` of kind `email` to Ryan with the same line. Tests with a fake `query` under each setting (override the constant with `vi.mock("./facts")`): the mutation name and variables; nothing thrown when no invoice exists yet (Jobber creates the invoice after completion; the handler is re-run from the `INVOICE_CREATE` webhook for pass jobs, so add that branch to `refreshItem`: an invoice created on a pass job whose visit is charged calls `markInvoicePaid`).

**Step 2: Verify and commit.** `Mark the Jobber invoice paid after a Season Pass charge`

### Task 5.5: The Stripe webhook

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/lib/stripe/webhook.ts`, `src/lib/stripe/webhook.test.ts`

**Step 1: Test first.** `handleStripeEvent(db, stripe, event)` for: `checkout.session.completed` with `metadata.purpose === "card-update"` → `applyCardUpdate`; otherwise → `completeCheckout` (Task 6.3; a no-op until then, the item is retried); `payment_intent.succeeded` / `payment_intent.payment_failed` → update the matching `charge` row by intent id (the state the orchestration already wrote, so this is reconciliation, not the source of truth); `payment_method.detached` → clear the pass's payment method and add an attention item (`card-expiring` kind with "Card removed"). Tests with `testDb()` and event fixtures from Stripe's docs (anonymised).

**Step 2: The route.** `request.text()`, `stripe().webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", STRIPE_WEBHOOK_SECRET)`; on a bad signature 400; then `enqueue` as `stripe-webhook` with key `event.id` and `after(drainAll)`; the handler calls `handleStripeEvent`. Register the endpoint in the Stripe dashboard (test mode first) for the four event types; locally `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

**Step 3: Verify.** `stripe trigger payment_intent.succeeded` reaches the route and the item is done. Commit: `Receive Stripe webhooks into the queue`

**Phase 5 close:** `npm run test:stories`.

---

## Phase 6: The checkout route, wired

Estimate: two days.

### Task 6.1: Open weeks and the season from the database

**Files:**
- Create: `src/lib/pass/season.ts`, `src/lib/pass/season.test.ts`
- Create: `src/lib/pass/weeks.ts`, `src/lib/pass/weeks.test.ts`

**Step 1: Test first.** `currentSeason("2027-03-01")` → 2027; `currentSeason("2027-11-15")` → 2028; `currentSeason("2027-10-31")` → 2027. `openWeeks(db, organizationId, season)` returns `BlowoutWeek[]` (the screen type) for the season with `taken` and `towns`, every week, including full ones (the week step shows a full week as unavailable). Tests with `testDb()`.

**Step 2: Verify and commit.** `Read the season and the blowout weeks from the database`

### Task 6.2: Reserve a week and create the pending pass

**Files:**
- Create: `src/lib/pass/create.ts`, `src/lib/pass/create.test.ts`

**Step 1: Test first.** `reserveWeek(db, { organizationId, season, weekStart })` runs one statement: `UPDATE blowout_week SET taken = taken + 1, updated_at = now() WHERE organization_id = $1 AND season = $2 AND week_start = $3 AND taken < capacity RETURNING taken` and returns true when a row came back. `createPendingPass(db, fields, { organizationId, season, now })` validates with the reducer's rules (`canContinue` for each of the first four steps, imported from `checkout-state.ts`, so the server and the client agree on one rule), reserves the week (false → throws `WeekFullError`), inserts the `season_pass` row with status `pending`, the number from `nextPassNumber`, and the three `pass_visit` rows with `amount` from `visitPrice` and the `window` strings `toPass` uses (lift the `windows` array in `checkout-state.ts` into an exported `visitWindows(weekStart)` so both use it), and returns the pass id. `releaseWeek` is the mirror (`taken - 1`, never below zero). `expirePendingPasses(db, now)` releases the week of every `pending` pass older than 30 minutes and deletes it (the cron drain calls it first).

Tests with `testDb()`: a week with capacity 1 takes one reservation and refuses the second; the pass and three visits with the right amounts for 8 zones (145, 145, 115); an invalid town throws before anything is written; expiry releases the week.

**Step 2: Verify and commit.** `Reserve the blowout week and create the pending pass`

### Task 6.3: Server actions: begin and complete checkout

**Files:**
- Create: `src/app/(checkout)/season-pass/checkout/actions.ts`, `actions.test.ts`
- Create: `src/lib/pass/complete.ts`, `src/lib/pass/complete.test.ts`

**Step 1: `completeCheckout`, test first.** `completeCheckout(db, stripe, { passId, sessionId })`: if the pass is already `active`, return it (idempotent: the webhook and the client both call this); read the payment method from the session; require `session.metadata.passId === passId` and a payment method; update the pass to `active` with the Stripe ids and the card fields; enqueue `pass-onboard` (key: the pass id) and the two `email` items (customer confirmation, Ryan and Hannah heads-up, Task 6.5); return the `Pass` in screen shape (`toScreenPass(row, visits)` in `src/lib/pass/screen.ts`, shared with `live.ts`). Tests: the state after; a second call changes nothing and enqueues nothing more; a session for another pass throws.

**Step 2: The actions.**

```ts
// src/app/(checkout)/season-pass/checkout/actions.ts
"use server"
import { db } from "@/db"
import { stripe } from "@/lib/stripe/client"
import { createSetupSession } from "@/lib/stripe/checkout"
import { createPendingPass, WeekFullError } from "@/lib/pass/create"
import { completeCheckout } from "@/lib/pass/complete"
import { currentSeason } from "@/lib/pass/season"
import { checkoutEnabled } from "@/lib/flags"
import { readEnv } from "@/lib/env"
import type { CheckoutFields } from "./_screens/checkout-state"

export type BeginResult = { ok: true; passId: string; clientSecret: string } | { ok: false; reason: "week-full" | "invalid" }

/** Step 5 opens with this: the answers become a pending pass with the week held, and Stripe's embedded form gets its secret. */
export async function beginCheckout(fields: CheckoutFields): Promise<BeginResult> {
  if (!checkoutEnabled()) return { ok: false, reason: "invalid" }
  const now = new Date()
  try {
    const passId = await createPendingPass(db(), fields, { organizationId: "org_trailhead", season: currentSeason(now.toISOString()), now })
    const { clientSecret } = await createSetupSession(stripe(), { passId, email: fields.email, name: fields.firstName, origin: readEnv(["APP_URL"]).APP_URL })
    return { ok: true, passId, clientSecret }
  } catch (error) {
    if (error instanceof WeekFullError) return { ok: false, reason: "week-full" }
    return { ok: false, reason: "invalid" }
  }
}

/** Stripe's onComplete calls this; the pass goes active and the jobs and emails are queued. */
export async function finishCheckout(passId: string, sessionId: string) {
  return completeCheckout(db(), stripe(), { passId, sessionId })
}
```

The `fields` are re-validated on the server by `createPendingPass`; the client's `canContinue` is a convenience, not the gate. Tests for the actions mock `@/db`, `@/lib/stripe/client` and the two libraries and check the branches.

**Step 3: Verify and commit.** `Add the checkout server actions`

### Task 6.4: The card step mounts Embedded Checkout; the reducer learns the pass id

**Files:**
- Modify: `src/app/(checkout)/season-pass/checkout/_screens/checkout-state.ts` (+ test)
- Modify: `checkout-steps.tsx` (`CardStep`), `CheckoutFlow.tsx`, `CheckoutFlow.stories.tsx`, `CheckoutFlow.test.tsx`
- Create: `src/app/(checkout)/season-pass/checkout/_screens/StripeCard.tsx`

**Step 1: Reducer, test first.** Add to `CheckoutFields`: `passId: string | null`, `clientSecret: string | null`, and a `weekFull: boolean` flag. New tests: `set` of `passId` keeps the step; `canContinue` on the card step is false until `cardSaved` is true (the flow calls `next` itself from `onComplete`); a `{ type: "weekFull" }` action goes back to the week step and sets the flag so `WeekStep` shows "That week filled while you were typing. Pick another."

**Step 2: The card step.** `CardStep` takes `{ clientSecret, onComplete, onError }`. `StripeCard.tsx` (client) wraps `EmbeddedCheckoutProvider` from `@stripe/react-stripe-js` with `stripe = loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)` and `options={{ clientSecret, onComplete }}` and renders `<EmbeddedCheckout />` inside the same dashed `rounded-lg` frame the placeholder used (the frame's border goes once Stripe mounts). Without a `clientSecret` the step shows a `Skeleton` and the helper line. Stories cannot load Stripe, so the story's `CardStep` receives `stripeComponent` as a prop (`StripeCard` by default, a placeholder `div` in the story), the same injection the test uses.

**Step 3: The flow.** `CheckoutFlow` gets `onBegin?: (fields) => Promise<BeginResult>` and `onFinish?: (passId, sessionId) => Promise<Pass>`. Entering the card step (the `next` from contact) calls `onBegin`; `ok` → `set("passId")`, `set("clientSecret")`; `week-full` → `dispatch({ type: "weekFull" })`; `invalid` → an inline line "Something did not save. Check your answers and try again." When Stripe's `onComplete` fires, the flow calls `onFinish(passId, sessionId)` (the session id comes back from `beginCheckout` too; add it to the result and the fields) and on the returned pass dispatches `next` and shows the real pass (number, ids) instead of `toPass`'s placeholders: `DoneStep` takes `pass` from state (`set("pass", …)`, a new field typed `Pass | null`) with `toPass` as the fallback for stories. `onComplete` is renamed `onReserved` and receives the real pass. In the stories, `onBegin` is `fn(async () => ({ ok: true, passId: "p-new", clientSecret: "cs_test", sessionId: "cs_test" }))` and `onFinish` resolves `toPass(...)`, so the Walkthrough story still lands on the card.

**Step 4: The page.** `page.tsx` reads `openWeeks` and `currentSeason`, passes `onBegin={beginCheckout}` and `onFinish={finishCheckout}` (server actions are serialisable props to a client component), and `initialZones` from the query. The `?renew=<token>` branch arrives in Phase 9.

**Step 5: Verify in the browser.** `SEASON_PASS_CHECKOUT=on`, Stripe test keys, `stripe listen` running: walk the flow with the test card `4242 4242 4242 4242`; the done step shows `TH-2027-00NN`; Drizzle Studio shows the pass `active` with the card fields and three `queue_item` rows (`pass-onboard`, two `email`). Walk it again with a week set to capacity 1 in Studio and confirm the "filled" line. `npm run test:stories` for the checkout stories; the four commands; `npm run manifest:compare`.

**Step 6: Commit.** `Wire the checkout to Stripe's embedded card form and the pass`

### Task 6.5: Onboarding into Jobber: client, property, three jobs, and the emails

**Files:**
- Create: `src/lib/jobber/scheduling.ts`, `src/lib/jobber/scheduling.test.ts`
- Create: `src/lib/pass/onboard.ts`, `src/lib/pass/onboard.test.ts`
- Create: `src/lib/email/confirmation.ts`, `src/lib/email/new-pass.ts`, with tests

**Step 1: The scheduling adapter, test first.** `createPassJobs(query, { pass, visits, clientId, propertyId })` returns `{ kind: "turn-on" | "inspection" | "blowout"; jobId; jobUrl; visitId? }[]`. With `JOBBER_FACTS.jobCreateScheduling === "scheduled"`: three `jobCreate` calls with the start date (the Monday of the blowout week for the blowout; April 15 and July 8 as the first day of the window for the other two, so Ryan sees them on his calendar and drags them) using the exact input the facts doc recorded. With `"unscheduled"`: three `jobCreate` calls with no date and the title `Season Pass turn-on (April to May), 8 zones` and so on. Both: `title` includes the window, `customFields` carries the pass id (the configuration id from the facts doc, in `JOBBER_FACTS.passIdFieldId`), the `season-pass` tag, and `instructions` "Season Pass visit. Do not collect payment; the card on file is charged after completion." Tests with a fake `query` under each setting: three mutations, the titles, the custom field, the tag.

`cancelPassJobs(query, jobIds)` (Phase 7) and `findOrCreateClient(query, { firstName, email, phone, address, town })` live here too: search clients by email (`clients(searchTerm:)`), else `clientCreate` with the contact and `propertyCreate` for the address; return `{ clientId, propertyId, clientUrl }`. Test: an existing client is reused; a new one is created with the address in the six-town form `"<address>, <Town>, CO"`.

**Step 2: Onboarding, test first.** `onboardPass(db, query, { passId })`: read the pass; if `jobber_client_id` is empty, `findOrCreateClient` and store the ids; for each `pass_visit` without `jobber_job_id`, create the job (the loop makes a retry after a partial failure create only the missing jobs) and store `jobber_job_id`, `jobber_job_url`, `jobber_visit_id`; on any thrown error, leave what was stored and rethrow (the queue retries, up to eight times, then the attention row says "Jobber jobs for pass TH-2027-0007 were not created; retrying" as the fixture already words it). Tests: a fresh pass gets a client and three jobs; a pass with one job already gets only two more; a Jobber error after the first job leaves one job id stored and throws.

**Step 3: The emails.** `confirmation.ts`: subject "Your Season Pass is reserved", the three windows, the reserved week ("Your blowout is reserved for the week of October 11."), the link to `/account/sign-in?email=…` ("Open your pass"), and the flat pass card image as an attachment? No: the image is the customer's "Save as image" on the done step; the email carries the link only (keep it light). `new-pass.ts`: to Ryan and Hannah, subject "New Season Pass: Andrea, Erie, 8 zones", with the three Jobber job links once they exist (so this email is sent by `onboardPass` at the end, not by `completeCheckout`; move the enqueue there, and keep the customer confirmation at completion). Tests for the subjects and the lines.

**Step 4: Handler and verify.** `pass-onboard` in `handlers.ts` calls `onboardPass`; `drainAll` runs after `finishCheckout` too (`after(() => drainAll(db()))` inside the action). On the tester Jobber account: buy a test pass, see the client and the three jobs appear in Jobber with the tag, open one job and read the instructions; both emails arrive. Commit: `Create the Jobber client, property and three jobs for a new pass, and send the confirmations`

### Task 6.6: The GA4 event and the calculator's button

**Files:**
- Create: `src/lib/analytics.ts`, `src/lib/analytics.test.ts`
- Modify: `src/components/ConversionTracking.tsx` (use `fireEvent` from the new module)
- Modify: `src/app/(checkout)/season-pass/checkout/_screens/checkout-steps.tsx` (`DoneStep` fires once)
- Modify: `src/components/sections/SeasonPassCalculator.tsx`, `src/app/(site)/season-pass/page.tsx`

**Step 1: Test first.** `fireEvent(name, params)` from `src/lib/analytics.ts` is the function `ConversionTracking.tsx` has at line 63, exported; test: no `gtag` → no throw; a stubbed `window.gtag` receives `("event", "season_pass_purchase", { value: 405, zones: 8, town: "Erie", pass_number })`. `DoneStep` calls it in a `useEffect` keyed on `pass.number`, once. Add to the comment block in `ConversionTracking.tsx` the fourth event, and to `CLAUDE.md`'s conversion tracking list: `season_pass_purchase`.

**Step 2: The calculator.** `SeasonPassCalculator` keeps `ctaHref` and `ctaLabel`; it becomes a function of zones: when `ctaHref` is `/season-pass/checkout`, the link is `/season-pass/checkout?zones=${zones}`. In `page.tsx` the props come from the flag: `checkoutEnabled() ? { ctaHref: "/season-pass/checkout", ctaLabel: "Reserve my season" } : { ctaHref: "/contact", ctaLabel: "Reserve my season" }`. `page.tsx` is a server component so it may read the flag; it imports nothing from the server libraries (the gate's new rule would fail it otherwise). The marketing CSS and routes do not change: `npm run manifest:compare` must still pass (the page's classes are unchanged; a query string is not a class).

**Step 3: Verify and commit.** `Fire season_pass_purchase and send the calculator to the checkout when the flag is on`

**Phase 6 close:** `npm run test:stories`; a full test purchase from `/season-pass` to the Jobber jobs and both emails, in Stripe test mode, on the tester Jobber account, screenshotted into `.local-data/wiring/checkout/`.

---

## Phase 7: The customer pass page

Estimate: one day.

### Task 7.1: The route, the magic link and the lapsed state

**Files:**
- Create: `src/app/(account)/account/pass/page.tsx`, `src/app/(account)/account/pass/actions.ts`
- Create: `src/lib/pass/for-email.ts`, `src/lib/pass/for-email.test.ts`
- Modify: `src/app/(account)/account/pass/_screens/PassPageScreen.tsx`, `pass-page-model.ts` (+ tests, + stories)
- Modify: `src/app/(account)/account/sign-in/page.tsx` (prefill `email` from the query)

**Step 1: Test first.** `passForEmail(db, organizationId, email)` returns the newest pass (by season, then created) for that email as a screen `Pass` (through `toScreenPass`), or null. `cardLine` in the model reads `pass.cardBrand ?? "Card"` instead of "Visa" (test: "Mastercard ending 4444, expires 08/28"). The screen gets a `lapsed` branch: the grey card and "This pass was for the 2027 season. We'll email you about next season in January, or book any visit online." (test and a `Lapsed` story; closes the known gap).

**Step 2: The page.**

```tsx
// src/app/(account)/account/pass/page.tsx
import { notFound } from "next/navigation"
import { db } from "@/db"
import { requireCustomer } from "@/lib/auth/guard"
import { passForEmail } from "@/lib/pass/for-email"
import { PassPageScreen } from "./_screens/PassPageScreen"
import { cancelPass, startCardUpdate } from "./actions"

export const dynamic = "force-dynamic"

export default async function PassPage() {
  const { email } = await requireCustomer()
  const pass = await passForEmail(db(), "org_trailhead", email)
  if (!pass) notFound()
  return <PassPageScreen pass={pass} today={new Date().toISOString()} onCancel={cancelPass.bind(null, pass.id)} onUpdateCard={startCardUpdate.bind(null, pass.id)} />
}
```

`PassPageScreen` gets `onUpdateCard?: () => void` wired to the "Update card" button (it was inert in the prototype); the button becomes a `<form action={onUpdateCard}>` with a submit button so the server action redirects to Stripe's hosted page. `CancelPassDialog`'s `onConfirm` calls the bound `cancelPass` (a client component may call a server action passed as a prop).

**Step 3: Actions.** `cancelPass(passId)`: `requireCustomer()`, check the pass belongs to that email (or the principal is an admin), set `status = cancelled`, `cancelled_at`, release the week, enqueue `pass-cancel` (key: the pass id) and an `email` to Hannah ("Season Pass cancelled: Andrea, Erie"). `startCardUpdate(passId)`: same check, `createCardUpdateSession`, `redirect(url)`. The `pass-cancel` handler calls `cancelPassJobs(query, jobIds)` from `scheduling.ts`: with `JOBBER_FACTS.jobCancelByApi`, cancel or archive each unstarted job (status from `jobber_visit`); otherwise add the note "Season Pass cancelled on <date>; please remove this job" to each and email Ryan the three links. Tests in `pass-cancel` handler test: the week's `taken` goes down by one; a completed visit's job is left alone; a second cancel does nothing.

**Step 4: Verify in the browser.** Sign in with the test pass's email from the confirmation email's link; the pass page shows the real card brand and the three visits; "Update card" goes to Stripe test checkout and back; "Cancel my pass" ends the pass and the week count in Studio drops. `npm run test:stories`; the four commands; `npm run manifest:compare`. Commit: `Serve the customer pass page with cancel and card update`

---

## Phase 8: The admin routes

Estimate: one and a half days.

### Task 8.1: The shell layout and the five pages

**Files:**
- Create: `src/app/(admin)/admin/layout.tsx` (nested, inside the root layout from Task 1.3)
- Create: `src/app/(admin)/admin/page.tsx`, `revenue/page.tsx`, `passes/page.tsx`, `october/page.tsx`, `customers/page.tsx`, `loading.tsx`
- Modify: `src/components/blocks/AdminShell.tsx` (+ story, + test): `onSignOut?: () => void`, links through `next/link`
- Create: `src/app/(admin)/admin/page.test.tsx`

**Step 1: Test first.** `page.test.tsx` mocks `@/lib/admin/data` (the `__mocks__` module from Task 3.2), `@/lib/auth/guard` (`requireAdmin` resolves an owner) and renders the awaited `HomePage()` with Testing Library: the greeting and "Updated" line are present, and `requireAdmin` was called. One such test per page; the Passes page test checks the grid renders the fixture's twelve rows.

**Step 2: The layout.**

```tsx
// src/app/(admin)/admin/layout.tsx
import { AdminShell } from "@/components/blocks/AdminShell"
import { requireAdmin } from "@/lib/auth/guard"
import { signOut } from "@/auth"
import { db } from "@/db"
import { adminUser } from "@/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { sectionFor } from "./section"

// Every admin page sits in the shell. requireAdmin here is the second gate for
// the whole tree; each page calls it again for its role.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin()
  const [user] = await db().select().from(adminUser).where(eq(adminUser.email, email))
  const pathname = (await headers()).get("x-pathname") ?? "/admin"
  return (
    <AdminShell current={sectionFor(pathname)} user={{ initials: user.initials, name: user.name }} onSignOut={async () => { "use server"; await signOut({ redirectTo: "/admin/sign-in" }) }}>
      {children}
    </AdminShell>
  )
}
```

The proxy sets `x-pathname` on the request (`requestHeaders.set("x-pathname", pathname)` and `NextResponse.next({ request: { headers } })`) so a server layout knows the section; `sectionFor("/admin/passes")` → `"passes"` (a tested two-line function in `section.ts`). The sign-in page is under `/admin/sign-in` and must not be inside this layout: put the five pages under `src/app/(admin)/admin/(shell)/` with the layout there, and leave `sign-in` beside it.

**Step 3: The pages.** Each: `requireAdmin()`, `const data = await getAdminData()`, `const today = new Date().toISOString()`, render the screen. `passes/page.tsx` passes the action props (Task 8.2) and `defaultSelectedId` from `?pass=` so NeedsAttention's `#pass-<id>` links become `/admin/passes?pass=<id>` (change the block's `href`). `loading.tsx` renders `PageHeader` with a `Skeleton` under it. `customers/page.tsx` renders the placeholder screen as approved.

**Step 4: Verify in the browser.** Signed in as owner, `ADMIN_DATA_SOURCE=live`: the five pages render the seeded data in the shell at 1440 and 375; the tab bar's safe-area padding is now live (check on a phone or Safari's responsive mode with a notch device). `npm run manifest:compare` (admin routes are skipped). Commit: `Serve the admin pages behind the shell with live data`

### Task 8.2: The three panel actions, the capacity write and roles

**Files:**
- Create: `src/app/(admin)/admin/(shell)/actions.ts`, `actions.test.ts`
- Modify: `PassesScreen.tsx`, `OctoberScreen.tsx` (+ stories, + tests): action props instead of `console.info`
- Create: `src/lib/pass/admin-actions.ts`, `admin-actions.test.ts`

**Step 1: Test first.** In `admin-actions.ts`: `resendConfirmation(db, passId)` enqueues the confirmation email with key `confirmation:<passId>:<now minute>` (so a double click sends one); `sendCardUpdateLink(db, stripe, passId)` creates the hosted session and enqueues the email with the link; `adminCancelPass(db, passId)` is `cancelPass`'s core shared with Phase 7 (move the core into `src/lib/pass/cancel.ts`, both actions call it); `setWeekCapacity(db, { organizationId, season, weekStart, capacity })` updates the row (capacity below `taken` is allowed and the screen already says "over capacity"). Tests with `testDb()`.

**Step 2: The actions file.** Each action calls `requireAdmin("manager")` first (`tech` reads only), then the library, then `revalidatePath("/admin/passes")` or `/admin/october`. The screens: `PassesScreen` gets `actions?: { resend(passId): Promise<void>; cardLink(passId): Promise<void>; cancel(passId): Promise<void> }`; the footer buttons call them and show a `Skeleton`-free `pending` state through `useTransition`; the bulk actions call `resend`/`cardLink` per selected row. `OctoberScreen` gets `onCapacityChange?: (weekStart, capacity) => Promise<void>`; `setCapacity` calls it. Stories pass `fn()`s; the tests assert the calls with the pass number.

**Step 3: Verify in the browser.** Resend on the test pass sends the email; the card link email arrives with a Stripe test URL; cancel asks and cancels; capacity edits persist across a reload and the checkout's week step shows the new count. Commit: `Wire the pass actions and the October capacity write`

**Phase 8 close:** `npm run test:stories`; `npm run check:design` (every modified block still has its story; no raw colours slipped into the pages).

---

## Phase 9: Renewal

Estimate: one day. Ships after the first sales, but the data model already carries `season`, `renewed_from_id` and `renewal_asked_at`.

### Task 9.1: The renewal link and the prefilled checkout

**Files:**
- Create: `src/lib/pass/renewal.ts`, `src/lib/pass/renewal.test.ts`
- Create: `src/lib/email/renewal.ts`, `renewal.test.ts`
- Modify: `src/app/(checkout)/season-pass/checkout/page.tsx`, `actions.ts`, `checkout-state.ts`, `CheckoutFlow.tsx` (+ tests, + a `Renewing` story)

**Step 1: Test first.** `renewalToken(passId, secret)` and `readRenewalToken(token, secret, now)`: an HMAC-signed `passId.expiry` (90 days) in base64url; a tampered or expired token reads null. `renewalPrefill(db, passId, season)`: the previous pass's address, town, zones, name, email, phone as `Partial<CheckoutFields>`, plus `reusePaymentMethod: true` when the card is still attached (verified with Stripe's `paymentMethods.retrieve` in the action, not here). The reducer gets a `skipCard` field: when true, `next` from the week step goes to contact, and `next` from contact goes straight to done after `onBegin` and `onFinish` (the action, with `renewFrom`, creates the pass `active` at once with the old customer and payment method, no Stripe session). `page.tsx` reads `?renew=`, verifies, and passes `prefill`, `initialStep: 3` (the week question: the PRD's "a returning pass holder answers one question") and `skipCard`. The emails: `renewal.ts` subject "Your 2028 Season Pass: pick your blowout week", one link, one line about same zones and same card.

**Step 2: Verify and commit.** `Let a pass holder renew from one email link`

### Task 9.2: The January job and the April lapse

**Files:**
- Create: `src/app/api/cron/renewals/route.ts`, `src/app/api/cron/lapse/route.ts`
- Modify: `vercel.json` (the two yearly lines from Task 4.4)
- Create: `src/lib/pass/renewal-run.ts`, `renewal-run.test.ts`

**Step 1: Test first.** `sendRenewals(db, { organizationId, season, now })`: for every `active` pass of `season - 1` whose email holds no pass for `season` and whose `renewal_asked_at` is null, enqueue `renewal-email` (key: the pass id) and set `renewal_asked_at`; returns the count. `lapseUnrenewed(db, { organizationId, season, now })`: on April 1 every `active` pass of `season - 1` with no pass for `season` becomes `lapsed` (the renewal pipeline on the Revenue screen then reads renewed, lapsed and not yet asked exactly as `renewals()` in `revenue-model.ts` expects). Tests with `testDb()`: one email per unrenewed pass, none for a renewed one, none twice; the lapse leaves renewed passes alone.

**Step 2: The routes** are the cron shape from Task 4.4; `renewals` runs `sendRenewals` for `currentSeason(now)` on January 1 at 15:00 UTC (8 am Mountain), `lapse` on April 1. Add the two `vercel.json` lines. **Verify**: `curl` each locally with the secret against a seeded database; the Revenue screen's Renewals card appears once a 2027 pass and a 2028 pass exist. Commit: `Send renewal links in January and lapse unrenewed passes in April`

---

## Phase 10: Copy, pricing.md, launch and IndexNow

Estimate: one day plus the end-to-end test pass.

### Task 10.1: The Season Pass page and the FAQ describe the checkout

**Files:**
- Modify: `src/app/(site)/season-pass/page.tsx` (the FAQ answers, the hero line)
- Modify: `public/pricing.md`, `public/llms.txt`
- Modify: `src/app/sitemap.ts` (`SEASON_PASS_UPDATED`)

**Step 1: Copy.** When the flag is on, the FAQ "Which cities can get the Season Pass?" answer ends "Reserve online in a few minutes: pick your zones, pick your October week, save a card." instead of "Reserve by contacting us…"; "Can I cancel?" adds "from your pass page, any time". The metadata description and the hero line do not change (they already say "billed per visit, nothing up front"). The page reads `checkoutEnabled()` for both the button and the answers so the flag flips the whole page at once. Copy rules from `CLAUDE.md`: no "no X, no Y", no fragments, no exclamation marks; run the `copywriting` skill's checklist over the new sentences.

**Step 2: `pricing.md` and `llms.txt`.** The Season Pass paragraph in `pricing.md` ends: "Reserve online at https://www.trailheadirrigation.com/season-pass: choose the zone count, reserve an October blowout week from the weeks with room, and save a card that is charged after each visit." `llms.txt` line 15 gets the same sentence. Bump `SEASON_PASS_UPDATED` in `sitemap.ts` to the ship date.

**Step 3: Verify.** `npm run manifest:compare` fails here on purpose (the page's text changed, not its classes; routes and selectors are the same, so it passes; if the CSS selectors changed, something imported a new primitive: find it). The four commands. Commit: `Describe the online checkout on the Season Pass page, pricing.md and llms.txt`

### Task 10.2: Terms and the launch checklist

**Files:**
- Modify: `src/app/(site)/terms/page.tsx` (a Season Pass section, with Hannah's wording)
- Create: `docs/plans/2026-11-12-season-pass-launch-checklist.md`

The terms block needs Hannah's and the accountant's answers (PRD open questions 6 and 7); write the section with placeholders in brackets and a `TODO` so the build is green, and the checklist carries the question. The checklist, every line a box:

- Stripe: live keys in Vercel; the webhook endpoint in live mode with the four events; the `STRIPE_WEBHOOK_SECRET` from the live endpoint; Checkout branding (logo, cream background) set in the dashboard; sales tax decision recorded.
- Jobber: the app in production with the scopes `clients:read clients:write properties:write jobs:read jobs:write visits:read invoices:read invoices:write quotes:read` (the facts doc has the exact names); OAuth connected from `/api/jobber/connect` on the live site; webhooks pointing at the live URL; the `season-pass` tag and the pass-id custom field exist on the production account; the "Complete Plan" product renamed to "Season Pass (sold online)" or retired.
- Database: Neon production branch; `npm run db:migrate` run against it; the organization, the two admin users and the October weeks seeded (capacity from Ryan, PRD open question 3); no fixture passes in production (`seed` takes `{ passes: false }`).
- Auth: `AUTH_SECRET`, `AUTH_URL`, `AUTH_RESEND_KEY` set; a sign-in tested by Hannah and by Ryan on a phone.
- Cron: `CRON_SECRET` set; the Vercel plan checked against the schedules in `vercel.json`.
- The end-to-end pass (Task 10.3) done and screenshotted.
- Flag: `SEASON_PASS_CHECKOUT=on` set in Vercel last, redeploy, buy the first real pass yourself with a real card and refund it from Stripe.
- IndexNow (Task 10.4).

Commit: `Add the Season Pass terms block and the launch checklist`

### Task 10.3: End to end in test mode

No code. On the preview deployment with Stripe test keys and the Jobber tester account: buy a pass with `4242…`; see the three jobs in Jobber; complete the turn-on visit in Jobber; see the `pass-charge` item run, the charge in Stripe, the receipt email, the invoice note; cancel the pass from the pass page and see the week count drop and Ryan's email. Then the failure path with Stripe's `4000 0000 0000 0341` (attaches, then fails off-session): the failed-charge email with the update link, update to `4242…`, the retry succeeds. Screenshots and the queue table's rows into `.local-data/wiring/e2e/`; a line per step in the checklist. Any bug found becomes a task appended to this plan under "Status" before it is fixed.

### Task 10.4: Ship, then IndexNow

After the Phase 10 PR merges and Vercel finishes:

```bash
npm run indexnow -- https://www.trailheadirrigation.com/season-pass
```

Then request indexing for `/season-pass` in Search Console by hand (Google does not take IndexNow). Write the Status section at the top of this plan, the way the prototype plan has one: the commits per task, what is live, what waits on Hannah (terms, tax, capacity numbers) and the first open points from the e2e pass.

---

## Estimates

| Phase | What | Estimate |
|---|---|---|
| 0 | The two Jobber facts on a tester account | 0.5 day |
| 1 | Route groups, root layouts, app.css, the manifest proof | 1 day |
| 2 | Neon, Drizzle schema, migration, seed, PGlite tests | 1.5 days |
| 3 | Auth.js, proxy, guard, sign-in pages, server-only data | 1.5 days |
| 4 | Jobber OAuth, client, queries, sync, webhooks, queue, live data | 3 days |
| 5 | Stripe setup session, off-session charge, card update, invoice paid, webhook | 2 days |
| 6 | Checkout wired: weeks, pending pass, actions, embedded card, onboarding, GA4 | 2 days |
| 7 | Pass page route, magic link, cancel, card update, lapsed | 1 day |
| 8 | Admin routes, shell layout, actions, capacity, roles | 1.5 days |
| 9 | Renewal link, prefilled checkout, January and April jobs | 1 day |
| 10 | Copy, pricing.md, terms, checklist, e2e, IndexNow | 1 day + the e2e pass |
| | Total | about 16 working days |

The estimates assume one person who has read `docs/DESIGN.md` and the PRD, with the Jobber tester account and the Stripe test keys in hand on day one. Phase 4 is the one most likely to grow: every query is checked against GraphiQL as it is written, and the facts doc catches the surprises before they reach the code.

## What this plan leaves out, on purpose

From the PRD's rabbit holes: no Jobber calendar replacement, no discounts, no deposit, no QuickBooks work, no multi-property passes. From the prototype's known gaps, two stay as they are: the shadcn sidebar's own `useIsMobile` sheet (never rendered) and SeasonLine's month reading, which Decision 8 sidesteps by storing Mountain-time days. The Customers page keeps its placeholder until the first passes exist (PRD: "Customers follows once the first passes exist"); the "send pass offer" email for last year's à-la-carte customers is the first task of the next plan.
