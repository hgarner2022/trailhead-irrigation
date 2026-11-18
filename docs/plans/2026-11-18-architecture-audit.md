# Architecture audit, 18 Nov 2026

Status: current. A read-only audit; no code changed. Hannah asked: "How do we feel like our architecture is? Is it world-class? Is it pristine? Should we be deleting some of our code, deleting the design codes? Can we clean up anything along the way?"

Method: every number below comes from a command run on `main` at `c38bdf1` (git ls-files, wc, grep, `npm run check:design`) or a file read. Two things I could not do: `npx knip` was blocked by the sandbox (it downloads and runs a package), so section 3 uses a small script that does the same job (kept out of the repo); and I did not run the 2,000-test suite, because three other sessions are building. Nothing here touches a secret.

## The answer in six lines

| Question | Answer |
|---|---|
| World-class? | Parts are. The API layer, the money and event model, the pglite tests and the design gate are better than most one-person projects. Operations are not: no error reporting, no CI, and previews share the production database. |
| Pristine? | No, and it does not need to be. Real dead code is small (about 60 lines now, about 900 at the Jobber exit). The mess is in documents, not code. |
| Delete code? | A little now, more at the Jobber exit. Deleting code is not the big win. |
| Delete the design codes? | Delete `ui/` and `pro-blocks/` from your disk, not the repo: they are not in the repo (see 4). Keep the design gate; it is 298 lines and earns its keep. |
| Biggest risk | Pushing any branch migrates production (one `DATABASE_URL`), and `/admin` shows fixture data when one env var is missing (see 8). |
| Biggest cleanup | `docs/`: 26 of 40 plan files are finished history, `CLAUDE.md` is 72 KB, there is no one-page architecture. |

## What world-class means here

Sources read for this audit. A one-person company needs the small version of each, not the enterprise version.

| Source | The standard it sets | What it means for Trailhead |
|---|---|---|
| Next.js production checklist (nextjs.org, updated 6 Nov 2026) | `global-error.tsx`, check auth inside each Server Action, a server-only data access layer, `server-only` and tainting, a Content Security Policy, env files git-ignored, Lighthouse and bundle analysis before launch | Error UI, CSP and tainting are missing; the rest is present |
| Twelve-factor app (12factor.net) | One codebase, config in the environment, build/release/run separate, dev/prod parity, logs as a stream, admin tasks as one-off processes | Config and codebase are good; dev/prod parity is the failure (shared DB); release is fused with build (migrations run in `prebuild`) |
| Google engineering practices, code review standard | Approve a change when it improves code health, not when it is perfect; continuous improvement | The cleanup plan below is small steps, each an improvement |
| Martin Fowler, YAGNI | Unused capability costs build, delay, carry and repair; carry cost is paid every day | Mirror tables, aliases and unused primitives are carry cost; delete when safe |

## 1. Shape

One git repo, one Next 16 app, five route groups, one Vercel project, one Neon database. For one person that is the right call: a monorepo or separate services would add coordination cost with no one to coordinate.

| Area | Files | Lines | Test files (lines) | Stories |
|---|---|---|---|---|
| `src/app/(site)` marketing | 29 | 6,807 | 0 | 0 |
| `src/app/(admin)` | 136 | 14,741 | 29 (4,752) | 10 |
| `src/app/(checkout)` | 49 | 4,385 | 12 (1,661) | 2 |
| `src/app/(account)` | 20 | 1,429 | 5 (330) | 1 |
| `src/app/(booking)` | 1 | 22 | 0 | 0 |
| `src/app/api` (routes) | 83 | 946 | 6 (311) | 0 |
| `src/api` (open API, handlers, MCP) | 97 | 10,553 | 40 (5,053) | 0 |
| `src/lib/*` | 219 | 19,099 | 84 (6,132) | 0 |
| `src/components/blocks` | 109 | 9,494 | 29 (2,673) | 34 |
| `src/components/ui` | 49 | 4,047 | 1 (27) | 24 |
| `src/components/sections` | 33 | 2,857 | 2 (36) | 0 |
| `src/db` | 9 | 2,615 | 4 (1,456) | 0 |
| `src/emails` + `src/sms` | 16 | 1,000 | 3 (337) | 0 |
| `drizzle/` (23 migrations + journal) | 23 | 1,492 | 0 | 0 |
| `scripts/` (incl. 298-line design gate) | 20 | 2,588 | 2 (488) | 0 |
| `docs/` | 49 | 11,564 | 0 | 0 |
| `.storybook/` | 3 | 60 | 0 | 0 |
| `ui/` and `pro-blocks/` | 0 tracked (250 on disk) | 50,721 on disk | n/a | n/a |

Totals (`src/**/*.ts(x)`): 78,378 lines, of which 50,873 are product code, 22,805 tests, 4,700 stories. Tests are 45% of product code by size. 1,104 tracked files, 432 commits since 12 Nov (about 60 a day), `.git` pack 67 MB, `Assets/` 30 MB and `public/` 32 MB tracked.

| Gap against a world-class one-person setup | Evidence | Grade |
|---|---|---|
| One app, route groups with separate root layouts and CSS | `src/app/(site|admin|checkout|account|booking)/layout.tsx`; `npm run manifest:compare` guards the marketing CSS | world-class |
| Marketing prerendered and walled off | gate rule `checkServerImports` (see 2) | solid |
| Preview and production share one database | `docs/database.md`: "DATABASE_URL ... on Vercel's production builds"; the step-6 handover: "The push already applied 0021 to production (Preview and Production share DATABASE_URL)" | debt |

**Shape grade: solid. Environments grade: debt.** The one change: a Neon branch per preview and migrations only when `VERCEL_ENV` is `production` (step 1 of the plan).

## 2. Boundaries

| Rule | How I checked | Result |
|---|---|---|
| Marketing imports no server code | grep of `src/app/(site)` and `src/components/sections` for `@/api`, `@/db`, `server-only`, `next-auth`, `drizzle`, admin, blocks | Clean. Only `@/lib/jobber` (form ids), allowed by the gate |
| The gate enforces it | `scripts/design-gate/imports.mjs` | Partly. `SERVER_SEGMENTS` names `db, api, jobber-api, stripe, messaging, scheduling, geocode, pass/server`. Not named: `lib/admin`, `lib/jobs`, `lib/money`, `lib/events`, `lib/settings`, `lib/auth`, `lib/queue`, `lib/customer`. Clean today by luck, not by rule |
| Admin and marketing do not cross | gate: `marketing code imports admin code`, `imports a marketing section` | Enforced; `npm run check:design` prints "design gates: ok" |
| Blocks import no API or DB | grep `src/components/blocks` | Clean |
| Every screen mutation goes through `callApi` | `act()` in `(admin)/admin/(shell)/act.ts`; `job-actions.ts` calls `callApi(ctx, linesAdd, ...)`; 6 admin files, 1 account, 1 checkout use `callApi` | True for mutations |
| Reads go through the API too | `src/lib/admin/live.ts` reads Drizzle directly; `(checkout)/season-pass/checkout/page.tsx:43` and `pay/[invoiceId]/actions.ts:18` call `db()` | Not true. Admin reads and two checkout paths skip `callApi`. Defensible (the API is for writes and agents), but the doc says "every screen", so say which |
| Webhooks and crons use the DB directly | 8 route files import `@/db` | Correct; they are not screens |

Other boundary facts: `src/lib/*/server/` folders hold server code (19 files in `lib/pass/server`), but only `pass` uses the convention; `lib/scheduling` has `server/` and non-server mixed; the others rely on `import "server-only"`. `readEnv` (`src/lib/env.ts`, 30 call sites) reads env inside a function and fails where used; 11 names are still read with raw `process.env` (`DATABASE_URL`, `AUTH_SECRET`, `BREVO_API_KEY`, the flags).

**Grade: solid.** The one change: widen `SERVER_SEGMENTS` to the folders above and add a gate rule that `(admin)`, `(account)` and `(checkout)` pages import `@/db` only through `lib/*`, so the rule is a test and not a habit.

## 3. Dead and legacy code

Method: `scripts/unused.mjs` (kept in my scratchpad, not committed) resolves every `@/` and relative import in `src`, `scripts`, `.storybook`, then lists files with no importer and exports no other file mentions. Discounted: tests, stories, Next route files, `ui/`, `pro-blocks/`. Result: 15 files with no production importer, 532 exports with no production reference (165 of them used only by tests). Most of the 532 are `export type`, constants and helpers exported for a test; read them as a list to review, not to delete.

### Confirmed unused code

| Item | Evidence | Why it is there | Delete? | Risk |
|---|---|---|---|---|
| `_screens/ScheduleSeasonButton.tsx` (34 lines) | no importer, no story | left over from a Schedule redesign | Now | None |
| `src/lib/admin/__mocks__/data.ts` (13) | no `vi.mock` of `admin/data` found | old mock | Now, after one `npm test` | Low |
| Six admin server actions in `(shell)/actions.ts`: `createArea`, `updateArea`, `deleteArea`, `updateService`, `deleteWebhook`, `testWebhook` (about 10 lines) | zero references; `settings-save.ts` calls the handlers itself | replaced when Settings saves moved | Now | None |
| `bookingEnabled()` and `APP_BOOKING` (`flags.ts`, `.env.example`) | no caller; only `checkoutEnabled` is read | waits for the in-app booking form | After booking design lands | None |
| `ui/avatar`, `command`, `popover`, `scroll-area` under `src/components/ui` (441 lines, 4 stories, `cmdk` dependency, 4 `@source not` lines in `globals.css`) | importers are stories only | adopted "in case" | After messages and portal merge (they may adopt them) | Low |
| `components/blocks/data-grid-columns.tsx` (81) | used only by tests and stories | sample columns for the grid stories | Keep; rename to a fixture | n/a |
| `_screens/jobs-fixture.ts`, `notes-fixture.ts`, `visits-fixture.ts`; `src/api/test-helpers.ts`; `lib/stripe/test-stripe.ts`; `lib/auth/test-seed.ts` | test and story support | needed | Keep | n/a |
| `SEASON_PASS_CHECKOUT` flag | the checkout is wired and live behind it | "goes on last" (wiring plan, decision 16) | Keep until Hannah turns it on, then delete the flag | Medium: it gates revenue |

### Known leftovers (already on Hannah's list)

| Leftover | Size | Why still there | Delete when |
|---|---|---|---|
| Jobber mirror: 6 tables (`jobber_client/job/visit/quote/invoice/token`), `mirror.upsert` (`src/api/v1/mirror`, 111 lines + route), nightly feed (`lib/jobber-feed`, 359 lines with tests, `cron/feed`), `lib/jobber-api/facts.ts` (123 with test), mirror readers in `lib/admin/live.ts`, `shape.ts` (`Mirror*` types), `customers/handlers.ts`, `organization/handlers.ts`, 9 `jobber_*` id columns, the routine doc (97) and API facts (110) | about 900 lines of code and 207 of docs; 72 non-test files mention "jobber" or "mirror" | The feed fills busy blocks the scheduler subtracts; the routine still reads Jobber | After the Jobber exit, one migration (0023) |
| `area` table and its four settings | `src/api/v1/areas` (110), `settings` | Used by Settings today; replaced by the Routes and Seasons design (`2026-11-18-week-planning-design.md`) | When Routes and Seasons ships |
| `bookings.*` alias handlers | `src/api/v1/bookings` (132), 2 routes, `index.ts` entries; no screen calls them | public API alias of the old model | After the booking design lands; check no outside caller first |
| `passes.*` API names | `src/api/v1/passes` 2,070 lines incl. tests; account and pass-image use them | kept one season for outside readers | After the 2027 season, if no API key still calls them |
| `legacy_pass_id` and `resolvePassJob` | 37 references, 14 files, 28 call sites (`lib/pass/server/resolve.ts`, `record.ts`) | old pass ids live in signed links, Stripe metadata, queued tasks | After the last link or session minted before Nov 2026 has expired (spring 2027 at the earliest; check Stripe metadata first) |
| `truckId` and `truckName` aliases | 28 occurrences, 8 files (`visits/schemas.ts`, `queue/handlers.ts`, `bookings/handlers.ts`) | external readers, one season | With `passes.*` |
| Three single-purpose crons (`cron/feed`, `schedule`, `drain`) | 96 lines | `cron/daily` does all three; kept "for running one part by hand" | Feed one at the exit; the others when an admin button replaces them |
| `docs/jobber-routine.md` | 97 | the bridge until exit | At the exit |
| `lib/jobber.ts` (booking form ids) and `JobberEmbed` | marketing code; `/book` and `/aeration` | the live booking iframe | When `/book` is replaced |

Other clutter found: three research files in the repo root (`competitor-pricing-research.md` 326 lines, `smart-irrigation-research.md` 250, `software-platform-research.md` 623, all from Sep 2026, unreferenced by code) and a stale `README.md` ("Next.js 14", "Marketing website").

**Grade: solid.** The code is cleaner than its documents. Two `TODO`s in 50,873 lines, 2 `eslint-disable`, 2 `@ts-expect-error`, 26 `as never` in product code (mostly handler inputs) and 5 `any`. The one change: delete the three confirmed items now (about 60 lines) and put the Jobber exit on a checklist so 900 lines leave in one PR.

## 4. The two reference libraries

**Finding: they are not in the repo.** `.gitignore` lines 14 and 15 ignore `/pro-blocks/` and `/ui/`. `git ls-files ui pro-blocks` returns 0 files and `git log --all -- ui pro-blocks` returns nothing. They exist only in the main checkout on this Mac, created 4 Mar 2026.

| Fact | Number |
|---|---|
| `ui/` on disk | 155 files, 33,984 lines, 1.3 MB (148 components) |
| `pro-blocks/` on disk | 95 files, 16,737 lines, 752 KB |
| Files in `src/components/ui` | 24 primitives, adapted by hand in 2 commits (`18d7b5e` 12 Nov, `20fe394` 17 Nov) |
| Sections copied from `pro-blocks/` | None found. No commit, file or comment says "adapted from"; the only trace is a comment in `base.css` line 3. The 33 sections are Trailhead-native |
| Imports from either | 0. Excluded from `tsconfig.json` (line 33) and `eslint.config.mjs` |
| Visible to a worktree session | No. Worktrees contain tracked files only, so every session in `.claude/worktrees/*` (including this one) cannot open them, yet `CLAUDE.md` says "you MUST search `ui/`" and "ALWAYS CONSULT BEFORE BUILDING" |

Two different things share the name `ui/` in the gate: `scripts/design-gate/*` and `check-design.mjs` use "ui/" to mean `src/components/ui` (the 300-line cap, the story rule, the marketing CSS rule), not the root folder. Nothing in the gate reads the root `ui/` or `pro-blocks/`. The two `FILE_CAP_ALLOWLIST` entries (`ui/sidebar.tsx`, `ui/chart.tsx`) are `src/components/ui` too.

**Recommendation: delete both from the project; keep nothing in git.** shadcn's own registry is the source for primitives (`npx shadcn@latest add <name>`, `components.json` already exists); `ui/` is a copy of someone else's 148-component library that nothing reads, and `pro-blocks/` has produced no code in eight months. Move the two folders out of the project folder (to `~/Documents/reference/`) so nothing is lost, and:

| File | Change |
|---|---|
| `CLAUDE.md` | Delete "Library-First Rule", "Reference Libraries" and the "What's available in `ui/`" lists (about 130 lines); replace with 6 lines: search `src/components/sections` and `src/components/ui` first, then `npx shadcn@latest add`, then build |
| `docs/DESIGN.md` line 110 | Delete the sentence about root `ui/` and `pro-blocks/` |
| `tsconfig.json` line 33, `eslint.config.mjs` lines 16 and 17, `.gitignore` lines 14 and 15 | Remove `ui` and `pro-blocks` entries |
| `scripts/design-gate/*` | No change. Rename comments from "ui/" to "components/ui" for clarity |
| `src/app/base.css` line 3 | Reword the comment |

Risk: none to the build. An agent loses a local reference it already could not see from a worktree.

**Grade: needs work.** The change: the step above.

## 5. Docs

49 files, 11,564 lines under `docs/`, plus 1,755 lines in five root `.md` files. `CLAUDE.md` is 506 lines, 72,730 bytes, with a longest line of 2,633 characters (10 lines over 1,500). It carries per-page tables, the full admin changelog and the SEO checklist in one file that every session loads. Only 2 of 40 plan files carry a status line; `docs/DESIGN.md` line 7 still says "Nothing is wired" (12 Nov).

Statuses are my judgment from each file's first lines and the linked-session list; Hannah should veto any.

| File | Date | What it is | Status |
|---|---|---|---|
| `docs/DATA_MODEL.md` | 13 Nov | every field, one table | current |
| `docs/DESIGN.md` | 12 Nov | app design contract | current, header stale |
| `docs/UX_PATTERNS.md`, `UX_WRITING.md` | 13 Nov | patterns and words | current |
| `docs/CITY_PAGE_TEMPLATE.md`, `SERVICE_PAGE_TEMPLATE.md` | 4 Nov | marketing page templates | current |
| `docs/database.md` | 12 Nov | Neon, Drizzle, Stripe, Jobber notes | current, Jobber half goes at the exit |
| `docs/jobber-api-facts.md`, `jobber-routine.md` | 12 and 13 Nov | Jobber bridge | current until the exit |
| `docs/screens/jobs`, `docs/screenshots/2026-11-17-home-today` | 17 Nov | 10 images, 1.1 MB | history |

| Plan files (`docs/plans/`) | Status | Superseded by |
|---|---|---|
| `2026-03-07` implementation-plan (1,940 lines), website-design; `2026-03-11` content-updates; `2026-03-21` water-rebates implementation and page-design; `2026-03-22` water-efficiency; `2026-03-30` jobber-booking-flow design and implementation (8 files, 4,117 lines) | history | the shipped marketing site |
| `2026-11-12` admin-dashboard-design-system-design, admin-dashboard-prototype-implementation, hannah-todo, scheduling-flow, season-pass-wiring-implementation (817), status-sync-schedule-review, trailhead-system-information-architecture (7 files, 2,396 lines) | history | `DESIGN.md`, `DATA_MODEL.md`, `2026-11-13-scheduling-design.md` |
| `2026-11-13` copy-audit, live-readiness-audit; `2026-11-14` build-1-office-acts-on-a-job | history (done) | the code |
| `2026-11-16` full-audit, data-model-steps-1-2, office-sells-a-pass; `2026-11-17` step-3, step-4; `2026-11-18` step-5, step-6, status-words-audit (PR #59) | history (built) | `DATA_MODEL.md`, `CLAUDE.md` |
| `2026-11-12` season-pass-checkout-prd | current requirements, partly revised in its own "System of record" section | n/a |
| `2026-11-13` scheduling-design; `2026-11-14` jobs-to-be-done, scheduling-research; `2026-11-13` checkout-scheduling-research | current reference | n/a |
| `2026-11-12` jobber-audit; `2026-11-14` jobber-season-data | reference for the exit | n/a |
| `2026-11-16` data-model-design | current (locked design) | n/a |
| `2026-11-18` admin-hierarchy-design, admin-ux-audit, customer-portal-design (PR #63 merged), done-and-paid-design, messages-design (building), week-planning-design | open designs; move on merge | n/a |

26 files and about 8,125 lines are finished history (the March site build, the 12 Nov prototype and wiring plans, and the built data-model steps); 14 files and 2,418 lines are alive.

**Recommendation.** Move the 26 to `docs/plans/archive/` with `git mv` (history stays). Add one `docs/ARCHITECTURE.md` of about 120 lines, a page and not a history. Add a status header to every plan, a single first line the archive step can grep:

`Status: draft | approved | building (PR #n) | built (PR #n, date) | superseded by <file> | history`

Outline of `ARCHITECTURE.md` (ten sections, one screen each):

| # | Section | Holds |
|---|---|---|
| 1 | The map | route groups, what each is for, which is prerendered |
| 2 | Layers | screen, server action, `callApi`, handler, `lib/*`, db; the one rule per arrow |
| 3 | The model | jobs, visits, lines, payments, events; link to `DATA_MODEL.md` |
| 4 | The API | `src/api`, scopes, principals, OpenAPI, MCP, idempotency |
| 5 | Money | whole dollars, payment rows, Stripe in `lib/stripe` only |
| 6 | Messages and the queue | `message_log`, queue, drain, crons, webhooks |
| 7 | Design system | tokens, three tiers, the gate and what it enforces |
| 8 | Environments | local, preview, production; where each secret lives; how a migration ships |
| 9 | Tests | unit, pglite, stories, the gate; what is not covered |
| 10 | Exit list | everything waiting on the Jobber exit and the season-after cleanups |

Also: shrink `CLAUDE.md` to about 150 lines (rules and pointers), move its page tables into a `docs/SITE.md`, delete the 12 Nov "Nothing is wired" line in `DESIGN.md`, rewrite `README.md` in 15 lines, and move the three root research files into `docs/research/`.

**Grade: needs work.** The change: the archive move (it deletes no information and takes one PR).

## 6. Consistency and size

| Measure | Number |
|---|---|
| Files over the 300-line cap in gated folders | 2 (shadcn `sidebar.tsx` 727, `chart.tsx` 380, both allowlisted) |
| Files at 271 to 300 lines | 3: `checkout-state.ts` 300, `settings-model.ts` 285, `CheckoutFlow.tsx` 281 |
| `(admin)/admin/_screens/` | 99 entries, 64 product files, 24 test files, 10 stories |
| `components/blocks/` | 109 entries, 46 product files, 34 stories, 29 tests |
| Widest folders | `_screens` 64, `blocks` 46, `sections` 31, `ui` 24, checkout `_screens` 23, `lib/pass/server` 19 |
| Naming in `_screens` | `*-model.ts` 13, `*Screen.tsx` 8, `*Panel.tsx` 4, `*-columns.tsx` 3, `*-fixture.ts` 3; the rest are unprefixed parts (`JobMoneySection`, `NewJobPass`, `ScheduleParts`, `PanelNotes`) |

The cap works: no gated file is over it except two vendor files, and the split pieces are small. The cost is flat folders: 64 siblings in `_screens` with no subfolder per screen, so a reader cannot tell which parts belong to Jobs and which to Schedule except by prefix. The naming drifts (`Panel`, `Parts`, `Section`, `-model`, `-state`), but the model-beside-screen pattern is consistent.

Duplicated helpers (grep for definitions, product code only):

| Helper | Definitions | Where |
|---|---|---|
| dollar formatting | 8 | `pay-model.ts`, `JobMoneySection.tsx`, `jobs-model.ts`, `JobLinesSection.tsx`, `emails/format.ts`, `lib/pass/server/messages.ts`, `lib/events/words.ts`, `lib/admin/metrics.ts` (`formatMoney`) |
| month and day words (`monthDay`, `shortDay`, `longDay`, `dayWords`, `dayLabel`) | 12 | `bill-model.ts`, `jobs-model.ts`, `emails/format.ts` (3), `pass/server/messages.ts`, `checkout-days.ts`, `lib/admin/jobs.ts`, `calendar.ts`, `format.ts`, `visit-panel-model.ts`, `events/words.ts` |
| `mountainDay` | 3 | `api/v1/shared.ts`, `lib/admin/shape.ts`, `db/seed.ts` |
| `weekdayOf` | 3 | `PickDayButtons.tsx`, `api/v1/shared.ts`, `lib/admin/calendar.ts` |
| `clock` (minutes to HH:MM) | 4 | `slots.ts`, `order-day.ts`, `today-model.ts`, `ChangeLog.tsx` |

`src/lib/format/` exists but holds only contact formatting. This is the single place where the repo's own rule ("one reusable component per pattern", Hannah, 17 Nov) is not kept for helpers. Customer-facing words differing by surface is a real risk: a date or price written two ways in the same email.

Test layout: tests sit beside the file (`x.test.ts`), stories beside the component, and `src/api/test-helpers.ts` plus `src/db/test-db.ts` are the shared fixtures. Good and consistent.

**Grade: solid.** The change: one `src/lib/format/{money,day,clock}.ts` and replace the 20 duplicates (net about 80 lines fewer).

## 7. Tests and gates

| Measure | Number |
|---|---|
| Unit test files / cases (`it` and `test` lines) | 218 / about 1,945 (build sessions report 1,996 passing) |
| Stories (Storybook, run in Chromium with axe as errors) | 71 files / 350 stories |
| Database tests | 12 files on in-memory PGlite with every migration applied (`src/db/test-db.ts`) |
| Migration tests | `legacy-drop.test.ts` and `jobs-backfill.test.ts` exercise 0014 to 0022 on PGlite |
| Gate tests | `npm run test:gate`, 2 files |
| Design gate | 5 rules: tokens only (no palette colours), story per component, no admin/marketing cross imports plus no server libraries in marketing, marketing CSS scan, 300-line cap. `check:design` runs inside `npm run lint`. Today: "design gates: ok" with 2 legacy notes (`input.tsx`, `textarea.tsx` use `red-500`) |
| Marketing CSS manifest | `npm run manifest:compare` guards the marketing CSS from app CSS |

| Not covered | Evidence | Grade of the gap |
|---|---|---|
| A real flow in a real browser (checkout through Stripe test mode, sign in, mark Done) | no `e2e/`, no Playwright config; Playwright is used only as the Storybook test runner | gap |
| Migrations against real Postgres (Neon) | PGlite is real Postgres in WASM but lacks extensions and Neon's behaviour; the first real run of a migration is production's build | gap, high |
| CI other than Vercel's build | no `.github/` directory; `lint`, `test`, `test:stories`, `test:gate` and `manifest:compare` run only when a person remembers | gap, high |
| Pre-commit or pre-push check | no `.husky`, no `lint-staged` | gap |
| Flaky tests | the build sessions mention a `CheckoutFlow` focus test and a card-step test; I found no retry config, no `flaky` note and no failing run in the repo, so I cannot reproduce them here. With no CI and no retry, a flake blocks a merge or gets ignored | unverified |

**Grade: solid** (unit and story testing is better than most small teams; the missing layers are the two that would catch a production incident). The one change: a 40-line GitHub Actions workflow running lint, unit tests, gate tests and story tests on every PR, which also gives the Vercel check a sibling.

## 8. Operations

| Area | What exists | Gap | Grade |
|---|---|---|---|
| Deploys | Vercel from `main`; Preview per branch | no CI gate before a merge | needs work |
| Migrations | `prebuild` runs `scripts/db-migrate-on-build.mjs`, which runs `drizzle-kit migrate` whenever `DATABASE_URL` is set, then the seed if `SEED_ADMINS` is set | runs on previews too, against production. The 0021 and 0022 two-push dance (expand, then drop) was a manual workaround. If a migration fails, the build fails (good), but a migration that succeeds is irreversible | debt |
| Admin data source | `src/lib/admin/data.ts` defaults to `fixtures` when `ADMIN_DATA_SOURCE` is unset, serving a 447 KB snapshot (`fixtures/snapshot.json`) bundled into the server code | fails open: a missing variable on any environment shows made-up customers to staff, with no error. Should default to `live` and require an explicit `fixtures` in Storybook and tests | debt |
| Cron | one `vercel.json` cron (`/api/cron/daily`, 11:00 UTC) doing feed, schedule, purge, card-expiry and drain; guarded by `CRON_SECRET`, timing-safe compare | Hobby plan limit; the queue drains once a day plus `drainAfter()` after each action, so a failure after a human's action waits for tomorrow | needs work |
| Queue | Postgres table, `claimNext` with `for update skip locked`, `MAX_ATTEMPTS` 5, idempotent on kind and key | no dead-letter view or alert beyond the Home alert row | solid |
| Webhooks | Stripe (signature on raw body, queued on event id), Twilio (signature, 403 on bad), outbound webhooks signed | none seen | solid |
| Error reporting | none: no Sentry or equivalent in `package.json`; no `error.tsx` or `global-error.tsx` anywhere in `src/` (the Next checklist asks for `global-error.tsx`); `@vercel/analytics` on the marketing layout only | an exception in a webhook, cron or server action reaches only Vercel's function log; nobody is told | debt |
| Logging | 16 `console.*` calls in product code, 13 are `console.error`, constant strings ("no customer data in the log") | privacy-safe, but unstructured and unalerted | needs work |
| Backups | Neon's own (point-in-time window depends on plan); nothing in the repo documents it or a restore drill | unknown to the repo | needs work |
| Secrets | `.env*` git-ignored; `.env.example` lists 19 names; `readEnv` trims and fails where used; Vercel marks `DATABASE_URL` sensitive | no startup check that required names exist per environment | solid |
| Security headers | HSTS, nosniff, X-Frame, Referrer, Permissions in `next.config.ts` | no Content Security Policy; no tainting | needs work |

**Grade: debt.** The one change: preview isolation (step 1), then error reporting (step 3). Those two fix what would hurt most on the first bad day.

## 9. Scorecard

| Area | Grade | The one change |
|---|---|---|
| 1a Shape | solid | none needed; keep one app |
| 1b Environments | debt | Neon branch per preview; migrate only in production |
| 2 Boundaries | solid | widen the gate's server list; gate `@/db` in screens |
| 3 Dead and legacy code | solid | delete the 3 confirmed items; exit checklist for Jobber |
| 4 Reference libraries | needs work | take them out of `CLAUDE.md`; move them off the project folder |
| 5 Docs | needs work | archive 26 plans; write `ARCHITECTURE.md`; shrink `CLAUDE.md` |
| 6 Consistency and size | solid | one shared money and day formatter |
| 7 Tests and gates | solid | CI workflow on every PR |
| 8 Operations | debt | error reporting plus a fail-closed admin data default |

Overall: **solid code on a thin operations floor.** The product core (API, money, events, tests) is strong. The risks are ones a world-class setup removes cheaply, in a week of small PRs.

## 10. Cleanup plan

Each step is its own PR. "Touches" lists files so the parent can sequence them against the three sessions now building (messages, customer portal, booking design). A step marked "any time" touches nothing those sessions are likely to edit. Lines are net.

| # | Step | Touches | Sequence | Lines |
|---|---|---|---|---|
| 1 | **Preview isolation.** Skip migrations and seed unless `VERCEL_ENV=production`; Hannah sets a Neon branch URL for Preview in Vercel. Write the rule in `docs/database.md` | `scripts/db-migrate-on-build.mjs`, `docs/database.md`; Vercel settings (Hannah) | any time, first | +8 |
| 2 | **Fail-closed admin data.** Default `ADMIN_DATA_SOURCE` to `live`; Storybook and tests pass `fixtures` explicitly; throw in production if unset | `src/lib/admin/data.ts` and its test; `.storybook` preview if it relies on the default | any time | +6 |
| 3 | **Error reporting and error pages.** `global-error.tsx`, one `error.tsx` per group, Sentry (or Vercel's error tracking) wired into the cron, webhooks and `act()` failure path. Needs Hannah to choose and add the key | new `src/app/global-error.tsx`, `(admin)/error.tsx`, `(checkout)/error.tsx`, `(account)/error.tsx`, `instrumentation.ts`, `package.json` | any time; `package.json` merge conflict possible | +120 |
| 4 | **CI.** GitHub Actions: `npm ci`, `lint`, `test`, `test:gate`, `test:stories`, `manifest:compare`, `tsc --noEmit`; required check on `main` | new `.github/workflows/ci.yml` | any time | +45 |
| 5 | **Docs archive.** `git mv` 26 plan files to `docs/plans/archive/`; add the status line to the 14 live plans; move 3 root research files to `docs/research/` | `docs/plans/*`, root `*.md` | after the messages and booking design PRs merge (they add plan files) | 0 (8,125 moved) |
| 6 | **`ARCHITECTURE.md`.** Write the ten sections; rewrite `README.md`; fix `DESIGN.md` line 7 | `docs/ARCHITECTURE.md`, `README.md`, `docs/DESIGN.md` | after 5 | +135, README -35 |
| 7 | **Shrink `CLAUDE.md`.** Move page tables to `docs/SITE.md` and the admin changelog to `ARCHITECTURE.md` and `DATA_MODEL.md`; remove the reference-library rules (step 8) | `CLAUDE.md`, new `docs/SITE.md` | last of the docs steps; every build session edits `CLAUDE.md`, so do it between merges | -350 in `CLAUDE.md` |
| 8 | **Retire the reference libraries.** Move `ui/` and `pro-blocks/` out of the folder; edit the 5 files in section 4 | `CLAUDE.md`, `docs/DESIGN.md`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `src/app/base.css` | with step 7 | -130 |
| 9 | **Delete confirmed dead code.** `ScheduleSeasonButton.tsx`, `__mocks__/data.ts`, six unused actions | `_screens/ScheduleSeasonButton.tsx`, `lib/admin/__mocks__/data.ts`, `(shell)/actions.ts` | any time | -57 |
| 10 | **Shared formatters.** `src/lib/format/money.ts` and `day.ts`; replace 8 money and about 12 day definitions; tests in the same files | `src/lib/format/*`, 14 files listed in section 6 | one PR per layer (emails, admin, API) so each is small; avoid while messages build touches `emails/` and `pass/server/messages.ts` | -80 |
| 11 | **Widen the gate.** Add `admin, jobs, money, events, settings, auth, queue, customer` to `SERVER_SEGMENTS`; add the `@/db` rule for pages; tests in `check-design.test.mjs` | `scripts/design-gate/imports.mjs`, `scripts/check-design.test.mjs` | any time | +40 |
| 12 | **Flatten `_screens`.** One subfolder per screen (`jobs/`, `schedule/`, `settings/`...), mechanical `git mv` | `src/app/(admin)/admin/_screens/*` and every importer | only when no admin build session is open | 0 |
| 13 | **Remove unused primitives.** `avatar`, `command`, `popover`, `scroll-area`, `cmdk` | `src/components/ui/*`, `globals.css`, `package.json` | after messages and portal merge | -441 |

Waiting for the Jobber exit, in one PR plus one migration:

| # | Step | Touches | Lines |
|---|---|---|---|
| E1 | Drop the mirror: tables, `mirror.upsert`, `jobber-feed`, `jobber-api`, `cron/feed`, `live.ts` mirror reads, `jobber_*` id columns, migration 0023 with a guard like 0022's | `src/db/schema.ts`, `drizzle/0023`, `src/api/v1/mirror`, `src/lib/jobber-feed`, `src/lib/jobber-api`, `src/app/api/cron/*`, `src/lib/admin/live.ts`, `shape.ts`, `docs/jobber-*.md` | about -900 code, -207 docs |
| E2 | Replace the Jobber iframe at `/book` with the booking form; delete `bookingEnabled`, `lib/jobber.ts`, `JobberEmbed`, `bookings.*` | `src/app/(site)/book`, `(booking)`, `src/api/v1/bookings`, `lib/flags.ts` | about -300 |
| E3 | Retire `area` and its settings once Routes and Seasons ships | `src/api/v1/areas`, `settings-*` | about -250 |

Waiting for a season to pass (spring 2027): `passes.*` names, `truckId` aliases and `legacy_pass_id` with `resolvePassJob` (about 150 lines, 14 files), only after Stripe metadata and signed links minted before Nov 2026 are gone.

Order I would run: 1, 2, 4, 9, 11 this week (small, independent, no conflicts), 3 when Hannah picks the error tool, then 5 to 8 together between merges, then 10 and 13.

## What I did not check

| Item | Why |
|---|---|
| Real unused-export list from knip | blocked; my script is stricter on files, looser on exports |
| Bundle size, Lighthouse, Core Web Vitals | needs a build; the marketing manifest already guards CSS |
| Production data, Vercel env, Neon settings (including backup window) | no secrets read, by rule |
| Flaky tests | not reproduced; reported by build sessions |
| Full 2,000-test run | other sessions are building; counts are from `grep` |
