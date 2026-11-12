# Admin Dashboard Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up the design-system rails, the blocks and every admin, checkout and pass screen as approved stories in Storybook, fed by Jobber-shaped fixtures, with nothing wired to a database, Stripe or Jobber yet.

**Architecture:** One token source in `src/app/globals.css`, three component tiers (`src/components/ui` primitives from shadcn, `src/components/blocks` composed pieces, `src/app/(admin)/admin/_screens` screen components that only compose blocks), Storybook `nextjs-vite` as the catalog and approval surface, `getAdminData()` behind one interface with a `fixtures` implementation now and a `live` one later, and `src/lib/admin/metrics.ts` as the single place derived numbers are computed. Design: `docs/plans/2026-11-12-admin-dashboard-design-system-design.md`. Requirements: `docs/plans/2026-11-12-season-pass-checkout-prd.md`.

**Tech Stack:** Next.js 16.1 App Router, React 19, TypeScript strict, Tailwind v4 (`@theme inline`), shadcn (new-york, Radix), TanStack Table, Recharts via shadcn `chart`, Storybook 10 `@storybook/nextjs-vite`, Vitest for unit tests, `@storybook/addon-vitest` for interaction tests. Node 24, npm 11.

**Conventions the executor must keep:** `cn()` from `@/lib/utils` for every class merge; semantic tokens only, never hex in components; `rounded-lg` for cards and buttons; `data-slot` attribute on every component root; sentence case headings; `font-display` for big numbers and titles; Barlow Condensed and Source Sans 3 are already loaded by `src/app/layout.tsx` as `--font-display-src` and `--font-body-src`. Copy rules from `CLAUDE.md` apply to every string in a story (no fragments, no "Yes!", no em dashes).

**Commit after every task.** Message style from the repo: one plain sentence, sentence case, no prefix. End with the attribution line in the system reminder.

---

## Phase 0: Rails

### Task 0.1: Vitest

**Files:**
- Create: `vitest.config.mts`
- Modify: `package.json` (scripts)
- Create: `src/lib/utils.test.ts`

**Step 1: Install**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Step 2: Config**

```ts
// vitest.config.mts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
})
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest"
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

**Step 3: Smoke test**

```ts
// src/lib/utils.test.ts
import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges tailwind classes with the later one winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })
})
```

Run: `npm test`. Expected: 1 passed.

**Step 4: Commit** `Add Vitest with a smoke test`

### Task 0.2: Storybook

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview-head.html`
- Modify: `package.json`, `.gitignore` (add `storybook-static/`)

**Step 1: Init**

```bash
npx storybook@latest init --yes
```

Expected: it detects Next.js and installs `@storybook/nextjs-vite`. If it installs `@storybook/nextjs` (webpack) instead, remove it and `npm install -D @storybook/nextjs-vite`, then set `framework: { name: "@storybook/nextjs-vite", options: {} }` in `.storybook/main.ts`. Delete the generated `src/stories/` example folder; stories live beside components.

**Step 2: main.ts**

```ts
import type { StorybookConfig } from "@storybook/nextjs-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public"],
}
export default config
```

**Step 3: preview.tsx**

```tsx
import type { Preview } from "@storybook/nextjs-vite"
import "../src/app/globals.css"

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
    backgrounds: { default: "cream", values: [{ name: "cream", value: "#FAFAF8" }, { name: "white", value: "#FFFFFF" }, { name: "navy", value: "#2B3544" }] },
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" } },
        tablet: { name: "Tablet 768", styles: { width: "768px", height: "1024px" } },
        laptop: { name: "Laptop 1280", styles: { width: "1280px", height: "800px" } },
        wide: { name: "Wide 1440", styles: { width: "1440px", height: "900px" } },
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
}
export default preview
```

The hex values above are Storybook chrome configuration, not component code; the lint gate in Task 0.4 ignores `.storybook/`.

**Step 4: Fonts in Storybook.** `next/font` only runs inside the Next layout, so stories set the two CSS variables themselves:

```html
<!-- .storybook/preview-head.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root { --font-display-src: "Barlow Condensed"; --font-body-src: "Source Sans 3"; }
  body { font-family: var(--font-sans); }
</style>
```

**Step 5: Verify.** `npm run storybook`. Open it in the browser pane. Expected: empty sidebar, no errors in the console. Then write one story for the existing Button to prove the pipeline:

```tsx
// src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"

const meta = { title: "UI/Button", component: Button, args: { children: "Book Online" } } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: "secondary" } }
export const Outline: Story = { args: { variant: "outline" } }
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-6">
      <Button size="sm">Small</Button><Button>Default</Button><Button size="lg">Large</Button>
    </div>
  ),
}
```

Expected: the button renders orange, `rounded-lg`, in Source Sans 3. If the font is a fallback, the preview-head is wrong.

**Step 6: Commit** `Add Storybook on nextjs-vite with brand fonts and viewports`

### Task 0.3: App tokens in the one token source

**Files:**
- Modify: `src/app/globals.css` (inside `@theme inline`)
- Create: `docs/DESIGN.md`

**Step 1: Add the tokens** shadcn components reference. Every value maps onto an existing brand colour; nothing new is invented.

```css
  /* App tokens (admin dashboard, checkout, pass page). Mapped onto the brand
     palette above; shadcn primitives reference these names. */
  --color-secondary: #F5F5F4;            /* = stone */
  --color-secondary-foreground: #1E293B;
  --color-accent: #F5F5F4;
  --color-accent-foreground: #1E293B;
  --color-popover: #FFFFFF;
  --color-popover-foreground: #1E293B;
  --color-destructive: #B91C1C;
  --color-destructive-foreground: #FFFFFF;
  --color-warning: #B45309;              /* = primary-dark */
  --color-positive: #16A34A;             /* = success */
  --color-input: #E7E5E4;                /* = border */
  --color-ring: #D97706;                 /* = primary */

  --color-sidebar: #2B3544;              /* navy rail */
  --color-sidebar-foreground: #FAFAF8;
  --color-sidebar-primary: #D97706;
  --color-sidebar-primary-foreground: #FFFFFF;
  --color-sidebar-accent: #3D4F63;       /* = navy-light */
  --color-sidebar-accent-foreground: #FFFFFF;
  --color-sidebar-border: #3D4F63;
  --color-sidebar-ring: #F59E0B;

  --color-chart-1: #D97706;              /* this year */
  --color-chart-2: #2B3544;              /* last year */
  --color-chart-3: #16A34A;
  --color-chart-4: #78716C;
  --color-chart-5: #F59E0B;

  --color-row-hover: #FAFAF8;            /* = cream */
  --color-row-selected: #FEF3C7;         /* primary at 15 percent on white */

  --radius: 0.5rem;                      /* rounded-lg everywhere */
```

**Step 2: `docs/DESIGN.md`.** Write it from the design doc's sections 1 and 4: aesthetic direction, every token with meaning and use, the three tiers, the story rule, the table rules, the chart rules, side panel versus page, phone rules for grids. Add a line to `CLAUDE.md` under Design Tokens: "App surfaces (admin, checkout, pass page) follow `docs/DESIGN.md`."

**Step 3: Verify** `npm run build` still passes (the marketing site must not change). `npm run storybook` Button story unchanged.

**Step 4: Commit** `Add app tokens to the one token source and write DESIGN.md`

### Task 0.4: Design gate script

**Files:**
- Create: `scripts/check-design.mjs`
- Modify: `package.json` (`"check:design": "node scripts/check-design.mjs"`, and `"lint": "eslint && node scripts/check-design.mjs"`)

**Step 1: Write the test first** as a fixture run: create `scripts/check-design.test.mjs` is overkill; instead the script takes `--dir` so it can be pointed at a temp folder. Create a temp folder with one `bad.tsx` containing `className="bg-[#D97706]"` and one `orphan.tsx` with no story, run the script against it, expect exit code 1 with both messages.

**Step 2: Script**

```js
// scripts/check-design.mjs
// Three gates from docs/DESIGN.md:
//  1. no raw colours in components (hex, rgb(), or Tailwind arbitrary colour)
//  2. every file in ui/ and blocks/ has a sibling *.stories.tsx
//  3. no imports across the admin / marketing boundary
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs"
import { join, relative } from "node:path"

const root = process.argv.includes("--dir") ? process.argv[process.argv.indexOf("--dir") + 1] : "src"
const problems = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name)) check(p)
  }
}

const RAW_COLOUR = /(#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(bg|text|border|ring|fill|stroke)-\[#)/
const ADMIN = /src\/app\/\(admin\)|src\/components\/blocks/
const MARKETING = /src\/components\/sections/

function check(file) {
  const src = readFileSync(file, "utf8")
  const rel = relative(process.cwd(), file)
  if (/src\/components\/(ui|blocks)|src\/app\/\(admin\)/.test(rel) && RAW_COLOUR.test(src)) {
    problems.push(`${rel}: raw colour; use a token from src/app/globals.css`)
  }
  if (/src\/components\/(ui|blocks)\/[^/]+\.tsx$/.test(rel) && !existsSync(file.replace(/\.tsx$/, ".stories.tsx"))) {
    problems.push(`${rel}: no story; every ui/ and blocks/ component needs one`)
  }
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1])
  if (ADMIN.test(rel) && imports.some((i) => i.includes("components/sections"))) {
    problems.push(`${rel}: admin code imports a marketing section`)
  }
  if (MARKETING.test(rel) && imports.some((i) => i.includes("(admin)") || i.includes("components/blocks"))) {
    problems.push(`${rel}: marketing code imports admin code`)
  }
}

walk(root)
if (problems.length) { console.error(problems.join("\n")); process.exit(1) }
console.log("design gates: ok")
```

Exempt the existing `src/components/ui/*.tsx` that have no story yet by writing their stories in this task (badge, card, carousel, input, separator, textarea: one Default story each, ten lines each). The gate must pass on `main` before the task is committed.

**Step 3: Run** `npm run check:design`. Expected: `design gates: ok`.

**Step 4: Commit** `Add the design gate: tokens only, a story per component, no admin and marketing cross-imports`

### Task 0.5: shadcn primitives

**Files:**
- Create: `components.json`
- Create: `src/components/ui/{sidebar,sheet,table,tabs,select,label,dialog,checkbox,dropdown-menu,skeleton,tooltip,popover,command,chart,scroll-area,avatar}.tsx` and a `.stories.tsx` beside each

**Step 1: `components.json`** by hand (no `init`, which would rewrite `globals.css`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide"
}
```

**Step 2: Add**

```bash
npx shadcn@latest add sidebar sheet table tabs select label dialog checkbox dropdown-menu skeleton tooltip popover command chart scroll-area avatar
```

If it asks to overwrite `button.tsx` or `card.tsx`, answer no; ours are the adapted versions. Check `git diff --stat` afterwards: only new files plus `package.json` and the lock file.

**Step 3: Adapt each file.** Replace `rounded-md`/`rounded-xl` on cards, popovers, sheets and dialogs with `rounded-lg`; confirm every colour class resolves to a token in `globals.css` (`grep -o "bg-[a-z-]*" | sort -u` per file against the `@theme` list). Add `data-slot` where missing. Run `npx tsc --noEmit`.

**Step 4: One story each** (Default plus the variants a screen will use). The `sidebar` story is the admin rail: navy, badge logo, five items, collapsible to icons; name it `Sidebar/AdminRail`.

**Step 5: Verify** `npm run check:design` ok, `npm test` ok, Storybook shows every primitive in brand.

**Step 6: Commit** `Adopt the shadcn primitives the admin screens need, adapted to Trailhead tokens`

---

## Phase 1: Data

### Task 1.1: Screen-facing types

**Files:**
- Create: `src/lib/admin/types.ts`

```ts
export type Town = "Erie" | "Longmont" | "Louisville" | "Lafayette" | "Firestone" | "Broomfield"
export type VisitKind = "turn-on" | "inspection" | "blowout" | "repair" | "install" | "other"
export type VisitStatus = "unscheduled" | "scheduled" | "completed" | "cancelled"
export type PassStatus = "active" | "cancelled" | "lapsed"

export interface Client { id: string; firstName: string; town: Town; jobberUrl: string; hasPass: boolean; lastVisitAt?: string }
export interface Visit { id: string; clientId: string; clientName: string; town: Town; kind: VisitKind; status: VisitStatus; startAt?: string; isPass: boolean; jobberUrl: string }
export interface Quote { id: string; clientName: string; town: Town; total: number; sentAt: string; status: "awaiting" | "approved" | "declined"; jobberUrl: string }
export interface Invoice { id: string; clientName: string; total: number; issuedAt: string; dueAt: string; status: "paid" | "unpaid" | "overdue"; jobberUrl: string }
export interface PassVisit { kind: Exclude<VisitKind, "repair" | "install" | "other">; window: string; scheduledAt?: string; completedAt?: string; amount: number; chargedAt?: string }
export interface Pass { id: string; number: string; season: number; clientId: string; firstName: string; town: Town; zones: number; blowoutWeek: string; status: PassStatus; visits: PassVisit[]; stripeUrl: string; jobberUrl: string; cardLast4?: string; cardExpires?: string }
export interface BlowoutWeek { season: number; weekStart: string; capacity: number; taken: number; towns: Town[] }
export interface MonthTotal { year: number; month: number; revenue: number; visits: number }
export interface Attention { kind: "charge-failed" | "jobs-failed" | "week-full" | "card-expiring"; passId?: string; message: string; since: string }

export interface AdminData {
  organizationId: string
  syncedAt: string
  clients: Client[]; visits: Visit[]; quotes: Quote[]; invoices: Invoice[]
  passes: Pass[]; blowoutWeeks: BlowoutWeek[]; monthTotals: MonthTotal[]; attention: Attention[]
}
```

Commit: `Add the screen-facing admin types`

### Task 1.2: Jobber snapshot into fixtures

This task is done by Claude with the Jobber connector in this app (tools `search_visits`, `search_jobs`, `search_quotes`, `search_invoices`, `search_clients`), not by a shell command. Hannah must be in the session for the connector.

**Files:**
- Create: `src/lib/admin/fixtures/snapshot.json` (anonymised, committed)
- Create: `scripts/anonymise-snapshot.mjs`
- Create: `.local-data/admin/jobber-raw-2026-11.json` (raw, git-ignored already)

**Steps:**
1. Pull 2026-01-01 to today: visits, quotes, invoices, clients. Save raw to `.local-data/admin/`.
2. `scripts/anonymise-snapshot.mjs` maps each client to `{ id: "c" + index, firstName: <first name only>, town }`, drops addresses, emails, phones and last names, keeps amounts, dates, statuses and service kinds, and classifies `kind` from the Jobber service name (turn-on, inspection, blowout, repair, install, other). Jobber URLs are kept as `https://secure.getjobber.com/...` ids (they are useless without a login).
3. Compute `monthTotals` from paid invoices by month, 2025 and 2026 (2025 may be partial; keep whatever Jobber has).
4. Invent `passes` (none exist yet): take 12 clients who had both a spring visit and a blowout in 2026, give them a 2027 pass with realistic zones (6 to 12), four different blowout weeks in October 2027, status active, visits with amounts from `src/lib/season-pass.ts` (`visitPrice`). Two of them have a charged turn-on so the Revenue screen has a "charged so far" number. Invent `blowoutWeeks` for the four October 2027 weeks with capacity 20 each and `taken` from the passes. Invent three `attention` rows, one of each kind except week-full.
5. Set `syncedAt` to the pull time.
6. Validate the JSON against `AdminData` with a test:

```ts
// src/lib/admin/fixtures/snapshot.test.ts
import { it, expect } from "vitest"
import snapshot from "./snapshot.json"
import type { AdminData } from "../types"

it("snapshot matches the AdminData shape and has data in every collection", () => {
  const d = snapshot as AdminData
  for (const key of ["clients", "visits", "quotes", "invoices", "passes", "blowoutWeeks", "monthTotals", "attention"] as const) {
    expect(d[key].length, key).toBeGreaterThan(0)
  }
  expect(d.visits.every((v) => d.clients.some((c) => c.id === v.clientId))).toBe(true)
  expect(JSON.stringify(d)).not.toMatch(/@|\d{3}-\d{3}-\d{4}/)   // no emails, no phones
})
```

Commit: `Add the anonymised Jobber snapshot as admin fixtures`

### Task 1.3: `getAdminData()` with the fixtures implementation

**Files:**
- Create: `src/lib/admin/data.ts`, `src/lib/admin/data.test.ts`

```ts
// src/lib/admin/data.ts
import type { AdminData } from "./types"
import snapshot from "./fixtures/snapshot.json"

export type AdminDataSource = "fixtures" | "live"

export async function getAdminData(source: AdminDataSource = (process.env.ADMIN_DATA_SOURCE as AdminDataSource) ?? "fixtures"): Promise<AdminData> {
  if (source === "live") throw new Error("live admin data is not wired yet; set ADMIN_DATA_SOURCE=fixtures")
  return snapshot as AdminData
}
```

Test: fixtures returns the snapshot; `live` throws with that message. Commit: `Add getAdminData with the fixtures source`

### Task 1.4: Metrics, test first

**Files:**
- Create: `src/lib/admin/metrics.test.ts`, then `src/lib/admin/metrics.ts`

Functions and the tests to write before each (use small inline fixtures in the test, not the snapshot, so each test says what it expects):

- `committedRevenue(passes)`: sum of every active pass's visit amounts. Test: two passes, one cancelled, equals only the active one's three amounts.
- `chargedSoFar(passes)`: sum of amounts where `chargedAt` is set.
- `committedByMonth(passes, season)`: `{ month, committed, charged }[]` for April, May, July, October from visit windows. Test: a turn-on "April to May" counts in April; blowout in October.
- `monthComparison(monthTotals, year, month)`: `{ current, previous, deltaPct }`; previous missing → `deltaPct: null`. Test both cases.
- `spotsLeft(week)`: `capacity - taken`, never below zero.
- `upcomingCharges(passes, from, limit)`: next scheduled, uncharged visits sorted by `scheduledAt`.
- `quotesAwaiting(quotes)`: count and total of `status === "awaiting"`.
- `invoicesOverdue(invoices, today)`: count and total of unpaid past `dueAt`.
- `formatMoney(n)`: `$1,234`, no cents, since every price on the site is whole dollars. Test negative and zero.

Run `npm test` red, implement, green, commit: `Add admin metrics with tests`

---

## Phase 2: The two blocks with no precedent

Build and show these first. Each gets a Default, Empty, Phone and (where it applies) Loading story. After each, open Storybook in the browser pane at 1440 and 375 and take a screenshot for Hannah. **Stop and get her reaction before continuing past Task 2.2.**

### Task 2.1: SeasonLine

**Files:**
- Create: `src/components/blocks/SeasonLine.tsx`, `SeasonLine.stories.tsx`, `SeasonLine.test.tsx`

**Props:**

```ts
interface SeasonLineProps {
  season: number
  today?: string                       // ISO date; defaults to now
  mode: "business" | "customer"
  bars?: { month: number; committed: number; charged: number }[]   // business
  visits?: PassVisit[]                                             // customer
  className?: string
}
```

**Behaviour:** a horizontal track from April to November, month ticks labelled with three-letter names in `font-display` uppercase, `text-muted-foreground`. A vertical "today" marker in `text-primary` with a small label. Business mode: above each month that has a bar, a column whose height is proportional to `committed` (max 72px), filled `bg-chart-2` for committed and `bg-chart-1` overlay for charged, with the dollar figure above it in `font-display`. Customer mode: three dots on the track at the visit windows, filled `bg-positive` when completed, `bg-primary` when scheduled, `border-2 border-navy bg-background` when still a window; the blowout dot gets a ring and a "reserved" label. Phone: the track stays one line; labels drop to first letters below 400px (use a container query, `@container`, on the root). Reduced motion: no transitions. `aria-label` describes the season in a sentence.

**Test (RTL):** renders eight month labels; customer mode renders three dots with the right status classes; business mode renders a bar for every entry in `bars` and none for months without.

**Stories:** `Business` (from `committedByMonth` over the snapshot), `Customer` (one active pass), `CustomerAllDone`, `Phone` (viewport phone), `Empty` (no bars, with a one-line caption "No passes sold yet").

Commit: `Add SeasonLine, the season arc for the business and for one customer`

### Task 2.2: PassCard

**Files:**
- Create: `src/components/blocks/PassCard.tsx`, `PassCard.stories.tsx`, `PassCard.test.tsx`
- Use: `public/images/pass-card-art.webp` (Hannah's chosen flat artwork, 2000 by 1250, committed 2026-11-12; `pass-card-art-alt.webp` is the alternate)
- Use: `public/images/pass-card-art-holo.webp` (the baked-in holographic version Hannah liked; `pass-card-art-holo-alt.webp` is the alternate). Add an `art?: "flat" | "holo"` prop, default `flat`. `InEmail` and the reduced-motion static state use `holo`. Add a story `Compare` that shows flat + moving sheen beside holo + a lighter sheen (sheen opacity halved) so Hannah picks the interactive treatment in Storybook.

**Props:** `{ pass: Pass; size?: "full" | "thumb"; interactive?: boolean; className?: string }`

**Behaviour:** aspect 8/5, `rounded-lg`, overflow hidden, artwork as `next/image` fill with `object-cover`. Text layer: top left "Trailhead Lawn & Irrigation" small caps, then the first name in `font-display text-3xl`, "Season Pass {season}" under it; bottom row: three visit windows in small text with their state; bottom right the pass number in `tabular-nums`. The reserved blowout week in `text-primary`. Sheen: an absolutely positioned layer with a conic gradient of translucent cream, amber and navy at low opacity, `mix-blend-mode: overlay`, whose `--sheen-x` and `--sheen-y` CSS variables follow `pointermove` on a laptop and `deviceorientation` on a phone (client component, listeners only attached when `interactive`). `prefers-reduced-motion` or `interactive={false}`: a static sheen. `size="thumb"` renders at 160px wide with the first name only. A `Download` button under the full card (story only, not in the component) calls `html-to-image` on the card; add that dependency in this task.

**Test:** renders first name, season, pass number and three windows; thumb renders only the first name; with `interactive={false}` there are no pointer listeners (spy on `addEventListener`).

**Stories:** `Full`, `Thumb`, `Static`, `Phone`, `InEmail` (flat, 600px wide, no sheen, white background). Take the screenshots.

Commit: `Add PassCard with a holographic sheen that follows the pointer or the phone's tilt`

**Checkpoint:** show Hannah both blocks at 1440 and 375. Record her notes in `docs/DESIGN.md` under a "Decisions" heading before continuing.

---

## Phase 3: The remaining blocks

Each: component, story (Default, Empty, Loading, Error where it applies, Phone), test where there is logic, `DESIGN.md` entry, commit.

### Task 3.1: StatTile

Props `{ label; value: string; delta?: { value: number; baseline: string; goodWhen: "up" | "down" }; sparkline?: { current: number[]; previous?: number[] }; href?: string }`. Value in `font-display text-4xl`. Delta line reads "+12% vs October 2025" with `text-positive` when the movement is good for the business under `goodWhen`, `text-destructive` when bad, `text-muted-foreground` at zero. Sparkline is a 24-point `<svg>` polyline, previous period dashed. Test the colour rule: `goodWhen: "down"` with a negative delta is positive. Story `Row` shows four across at 1440 and two across at 375.

Commit: `Add StatTile with a named baseline and a good-or-bad delta`

### Task 3.2: Chart

Wrap shadcn `chart`. Two exports: `MonthBars({ series: { year; data: MonthTotal[] }[] })` grouped bars by month, this year `chart-1`, last year `chart-2` with `strokeDasharray` on its bars' outline; `TrendLine({ data: { label; value }[] })`. Tooltip uses `formatMoney`. No other chart types exported; the file's header comment says why (NN/g: bars and lines only). Story `MonthBarsTwoYears` from the snapshot, `TrendLine`, `Phone`.

Commit: `Add the two chart shapes the dashboard is allowed to use`

### Task 3.3: DataGrid

Build from the shadcn data-table recipe (TanStack: `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, column visibility, row selection). Add: a `search` text input filtering on a named column; `filters: { column; label; options }[]` rendered as chips with active state; column reorder via the dropdown (up and down, no drag); CSV export of the visible rows; a bulk bar that mounts above the table only when `table.getSelectedRowModel().rows.length > 0`; sticky header (`sticky top-0 bg-background`); first column `sticky left-0` on phone with a right shadow; horizontal scroll container with `overflow-x-auto` and a cut-off fade on the right edge; `onOpen(row)` fired from a link in the first column, never from row click. Empty state via `EmptyState`.

Tests (RTL + user-event): clicking a header sorts; typing in search filters; selecting two rows shows the bulk bar with "2 selected"; the export builds a CSV string with the visible columns (export the helper `rowsToCsv` and test it directly).

Stories: `Passes` (columns from the Passes screen spec), `WithSelection`, `Empty`, `Loading`, `Phone`.

Commit: `Add DataGrid with sort, filter chips, column control, selection and export`

### Task 3.4: SidePanel

Wrap `sheet` from the right. On `lg` and up it is `SheetResizableContent`-style: the panel takes 480px and the page content gets `pr-[480px]` via a context so the grid narrows rather than being covered. Below `lg` it is a full-height sheet. Header with title and close. Story mounts a DataGrid and opens the panel from a row.

Commit: `Add SidePanel that pushes the page on a laptop and covers it on a phone`

### Task 3.5: PageHeader, StatusPill, EmptyState, NeedsAttention, WeekCard

- `PageHeader { title; context?: string; actions?: ReactNode }` title in `font-display text-3xl`.
- `StatusPill { status: PassStatus | VisitStatus | Invoice["status"] }` colours from tokens by meaning (active/paid/completed positive, overdue destructive, cancelled muted).
- `EmptyState { title; line; action? }`.
- `NeedsAttention { items: Attention[] }` list with the kind as an icon from lucide, message, "since" as relative time; empty state "Nothing needs you right now".
- `WeekCard { week: BlowoutWeek; editable?: boolean; onCapacityChange? }` shows week label, capacity, taken, spots left as the big number, town chips; editable renders a number input for capacity.

One commit per block.

---

## Phase 4: Screens as stories

Screen components live in `src/app/(admin)/admin/_screens/` and take `data: AdminData` (plus a `today` for deterministic stories). No `page.tsx`, no auth and no route yet; that is the wiring phase. Each screen gets stories `Default`, `NoDataYet` (an `AdminData` with empty arrays), `Phone`, `Tablet`. The admin shell story wraps every screen.

### Task 4.1: AdminShell

`src/components/blocks/AdminShell.tsx`: `SidebarProvider` + the `Sidebar/AdminRail` from Task 0.5 + a main area with `max-w-7xl` and `container-padding-x`. Items: Home, Revenue, Passes, October, Customers, with lucide icons. Below `md`: hide the rail, render a bottom tab bar with the same five. A hidden slot above the items for the organization switcher (`{switcher}` prop, undefined for now). A user block at the bottom with initials and "Sign out". Story at all four widths.

Commit: `Add AdminShell with the navy rail and a phone tab bar`

### Task 4.2: HomeScreen

PageHeader (greeting by hour, long date, "Updated N minutes ago" from `syncedAt`), four StatTiles from the metrics, `SeasonLine mode="business"`, then a two-column grid: visits today and tomorrow grouped by day (a small list, not a grid), `NeedsAttention`. Stories plus a screenshot at 1440 and 375 for Hannah.

### Task 4.3: PassesScreen

DataGrid of passes with the columns from the design, filter chips for town, status and blowout week, and a SidePanel showing `PassCard size="thumb"`, `SeasonLine mode="customer"`, charge history list, Jobber and Stripe links as outline buttons, and three actions as buttons that only `console.info` in the prototype.

### Task 4.4: OctoberScreen

WeekCards for the season's October weeks in a row (scroll on phone), the selected week highlighted, a small DataGrid of that week's pass blowouts.

### Task 4.5: RevenueScreen

Two StatTiles, `MonthBars` two years, upcoming charges list, renewal pipeline hidden when `season` has no predecessor passes.

### Task 4.6: CustomersScreen

`EmptyState` only: "Customers arrives after the first passes are sold".

### Task 4.7: Checkout screens

`src/app/(checkout)/season-pass/checkout/_screens/`: `CheckoutFlow` client component with six steps and a thin orange progress line, each step a full-viewport section with one question in `font-display`, one input, one button, Enter to continue, Up and Down arrows to move. Steps: address (text input plus a town select limited to the six), zones (the select from `SeasonPassCalculator` with the live price from `seasonPassPrice`), blowout week (WeekCards, selectable, disabled when `spotsLeft` is zero), contact (name, email, phone), card (a placeholder panel reading "Stripe card form mounts here" in the prototype), done (`PassCard` full with the sheen, then the three windows in a sentence). A `useCheckoutState` reducer with a unit test for step order and validation. Stories per step and a `Walkthrough` interaction test that fills every step with `user-event` and reaches the PassCard.

Commit: `Add the six-screen Season Pass checkout as a prototype`

### Task 4.8: PassPageScreen

`src/app/(account)/account/pass/_screens/PassPageScreen.tsx`: `PassCard` full, `SeasonLine mode="customer"`, the card on file line with an "Update card" outline button, a cancel link that opens a `dialog` with the plain-language consequence. Stories: `Active`, `AllDone`, `Cancelled`, `Phone`.

---

## Phase 5: Approval and handoff

### Task 5.1: Review pass

Run through `docs/DESIGN.md`'s checklist against every story: sentence case, `rounded-lg`, tokens only, one action per section, copy rules. `npm run lint`, `npm test`, `npm run build` (marketing site unchanged), `npm run build-storybook`. Open Storybook in the browser pane and screenshot Home, Passes, October, Revenue, the checkout's zones and done steps, and the pass page, each at 1440 and 375. Put the screenshots in `.local-data/admin/screens/` and list them for Hannah.

### Task 5.2: Hannah approves in Storybook

Record approvals and change requests per screen in `docs/DESIGN.md` under "Decisions". Change requests become new tasks appended to this plan. Nothing is wired until each screen has an approval line.

### Task 5.3: Next plan

When the screens are approved, write `docs/plans/<date>-season-pass-wiring-implementation.md` for Postgres, Auth.js, Stripe, the Jobber sync and webhooks, `(admin)` routes with the two auth gates, and the `live` data source. Not part of this plan.
