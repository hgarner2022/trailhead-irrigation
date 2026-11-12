# Design contract for the app surfaces

## What this is

These are the rules for every screen in `/admin`, the Season Pass checkout and the customer pass page. They are written for humans and for agents, so that a screen built in March looks like one built in November. The marketing site keeps its own rules in `CLAUDE.md`; this document only covers the app surfaces. A new block needs a story in Storybook and an entry here before it is used on a screen.

Status: as of 2026-11-12 the rails exist (tokens, Storybook, this document). Blocks, screens, `getAdminData()` and the gate script are described here ahead of being built; the prototype plan in `docs/plans` says what exists.

## Aesthetic direction

The feel is Stripe's dashboard: calm, light and numbers first, in Trailhead's palette. The canvas is cream, the sidebar is navy, and orange appears only on actions and highlights, never as decoration. Titles and big numbers are set in Barlow Condensed (`font-display`); everything else is Source Sans 3 (`font-sans`). Cards, buttons, panels and photos are `rounded-lg`. Circles are reserved for icon badges and chips.

Phase 1 is light mode only. Whitespace is generous; density comes from the data grid, not from the chrome around it. Every screen has one `PageHeader`, one main column of at most 1280px, and nothing competing with the numbers for attention.

### Spacing

Spacing uses Tailwind's default 4px grid and nothing outside it. The main column is `max-w-7xl` with `container-padding-x` for its side gutters, the same utilities the marketing site uses, so the app and the site share one rhythm. Stat tiles sit four across on a laptop and two across on a phone, and the two column layouts on Home stack on a phone. The sidebar collapses to icons at 1024px and becomes a bottom tab bar below 768px (767 and under, the same point where Tailwind's `md:` flips). `useIsMobile` switches the sidebar to its sheet; the bottom tab bar and the 1024px icon collapse are separate pieces built in AdminShell.

## Tokens

Every colour the app uses is a token in `src/app/globals.css`, inside the `@theme inline` block. The brand tokens came first and belong to the marketing site as well. The app tokens are mapped onto them; no new hue was invented. In Tailwind they are used as `bg-sidebar`, `text-positive`, `border-input`, `fill-chart-1` and so on. `@theme inline` inlines token values into the utilities that use them and only emits the `--color-x` custom property on `:root` when some generated CSS references it with `var()`. So `var(--color-chart-1)` in a chart config or inline style is undefined unless a class such as `fill-(--color-chart-1)` or `stroke-(--color-chart-1)` is also present; charts anchor their series that way.

### Brand tokens

| Token | Value | Meaning | Where it is used |
|---|---|---|---|
| `--color-primary` | `#D97706` | Orange, from the logo sun | Accents, chips, tints, links, text on navy |
| `--color-primary-dark` | `#B45309` | Darker orange | Resting background of the primary button (about 5.0:1 with white text); hover for other orange elements |
| `--color-primary-deep` | `#92400E` | Deepest orange | Hover state for buttons that rest on primary-dark |
| `--color-primary-light` | `#F59E0B` | Lighter orange | Accents on navy, the second line of the hero tagline |
| `--color-navy` | `#2B3544` | Dark navy, from the logo badge | Headers, the navy band on each page, the sidebar rail |
| `--color-navy-light` | `#3D4F63` | Lighter navy | Secondary text on navy, sidebar hover and border |
| `--color-charcoal` | `#1E293B` | Darkest shade | Footer, body text |
| `--color-cream` | `#FAFAF8` | Off white | Section backgrounds, the app canvas |
| `--color-stone` | `#F5F5F4` | Warm grey | Background alternation, secondary surfaces |
| `--color-border` | `#E7E5E4` | Light warm grey | Borders and dividers |
| `--color-muted` | `#78716C` | Mid grey | Secondary and muted text |
| `--color-success` | `#16A34A` | Green | Check marks, healthy lawn, good outcomes |
| `--color-background` | `#FFFFFF` | White | Page background on the marketing site, cards in the app |
| `--color-foreground` | `#1E293B` | Charcoal | Default text |
| `--color-muted-foreground` | `#756E69` | Mid grey, a shade darker than `--color-muted` | Labels, captions, helper text; 4.59:1 on stone, 4.8 on cream, 5.0 on white |
| `--color-card` | `#FFFFFF` | White | Card surface |
| `--color-card-foreground` | `#1E293B` | Charcoal | Text on a card |

### App tokens

| Token | Value | Meaning | Where it is used |
|---|---|---|---|
| `--color-secondary` | `#F5F5F4` | Stone | Secondary buttons, quiet surfaces |
| `--color-secondary-foreground` | `#1E293B` | Charcoal | Text on a secondary surface |
| `--color-accent` | `#F5F5F4` | Stone | Hover and focus backgrounds on menu items and list rows |
| `--color-accent-foreground` | `#1E293B` | Charcoal | Text on an accent background |
| `--color-popover` | `#FFFFFF` | White | Dropdowns, menus, tooltips, date pickers |
| `--color-popover-foreground` | `#1E293B` | Charcoal | Text in a popover |
| `--color-destructive` | `#B91C1C` | Red | Cancel and delete actions, error text, the failed status |
| `--color-destructive-foreground` | `#FFFFFF` | White | Text on a destructive button |
| `--color-warning` | `#B45309` | Primary dark | Past due, needs attention, a delta that is bad for the business |
| `--color-positive` | `#15803D` | Readable green, about 5:1 on white | Paid, confirmed, a delta that is good for the business; it is used as text, which is why it is darker than `--color-success`. 4.8:1 on cream, so it is for text on white or cream only. |
| `--color-input` | `#E7E5E4` | Border | Input and select borders |
| `--color-ring` | `#D97706` | Primary | Focus ring on new primitives (`ring-ring`); the existing primitives use `ring-primary/50` and may stay that way until touched |
| `--color-sidebar` | `#2B3544` | Navy | The sidebar rail background |
| `--color-sidebar-foreground` | `#FAFAF8` | Cream | Text and icons in the rail |
| `--color-sidebar-primary` | `#B45309` | Primary dark | The active nav item background; white text on it passes AA |
| `--color-sidebar-primary-foreground` | `#FFFFFF` | White | Text on the active nav item |
| `--color-sidebar-accent` | `#3D4F63` | Navy light | Hover background on a nav item |
| `--color-sidebar-accent-foreground` | `#FFFFFF` | White | Text on a hovered nav item |
| `--color-sidebar-border` | `#3D4F63` | Navy light | Dividers inside the rail |
| `--color-sidebar-ring` | `#F59E0B` | Primary light | Focus ring inside the rail, where orange on navy needs the lighter shade |
| `--color-chart-1` | `#D97706` | Primary | The first series, always this year |
| `--color-chart-2` | `#2B3544` | Navy | The second series, always last year, drawn dashed |
| `--color-chart-3` | `#16A34A` | Success | A third series when one is unavoidable |
| `--color-chart-4` | `#78716C` | Muted | Reference lines and targets |
| `--color-chart-5` | `#F59E0B` | Primary light | A highlighted bar or point |
| `--color-row-hover` | `#FAFAF8` | Cream | Hovered row in a data grid |
| `--color-row-selected` | `#FEF3C7` | Pale amber tint | Selected row in a data grid |

### Type and radius

| Token | Value | Meaning |
|---|---|---|
| `--font-sans` | Source Sans 3, then Segoe UI, Helvetica, Arial | Body, labels, table cells, buttons |
| `--font-display` | Barlow Condensed, then Arial Narrow, Impact | Page titles, section titles, big numbers in stat tiles and the pass card |
| `--radius` | `0.5rem` | The one corner radius, the same as Tailwind's `rounded-lg` |

Both faces are self hosted through `next/font` in `src/app/layout.tsx`, which sets `--font-body-src` and `--font-display-src`. Storybook imports `globals.css` so stories render in the brand faces. There is no radius scale; `rounded-lg` is the radius for everything except circles. `--radius` is informational; `rounded-lg` resolves to Tailwind's own `--radius-lg`, which is the same 0.5rem. Never paste shadcn's base layer (`* { @apply border-border outline-ring/50 }`) into globals.css; it would change every bare border on the marketing site. Add primitives with `npx shadcn@latest add` only.

### The rule

In `src/components/blocks/` and `src/app/(admin)/`: only semantic tokens; no hex, no `rgb()`, no arbitrary-value colours, and no Tailwind palette colours (`red-500`, `amber-100`, and so on). `white` and `black` are allowed. In `src/components/ui/`: the same, except that files that predate this document may keep their palette colours until they are next touched. Marketing sections in `src/components/sections/` follow `CLAUDE.md`, not this rule.

If a colour is missing, add a token to `globals.css` and a row to the table above. `scripts/check-design.mjs` will fail the build once it lands (Task 0.4 of the prototype plan) when it finds a raw colour, a component without a story, or an import across the admin and marketing boundary.

## Three tiers

Components live in one of three folders, and each folder has one job.

`src/components/ui/` holds primitives generated by shadcn and adapted to our tokens. They are never edited ad hoc. A new primitive comes in with `npx shadcn@latest add <name>`, is checked against the tokens above, and gets a story. Button, badge, card, input, textarea, separator and carousel are already here.

`src/components/blocks/` holds composed pieces used by more than one screen: StatTile, SeasonLine, PassCard, Chart, DataGrid, PageHeader, EmptyState, StatusPill, NeedsAttention, WeekCard and the admin shell. A block takes data as props and knows nothing about where the data came from.

`src/app/(admin)/admin/_screens/`, and the `_screens/` folders under the checkout and account route groups, hold screens. A screen only composes blocks, takes its data as props and contains no fetching. Fetching happens in the route's `page.tsx` through `getAdminData()`, which is wired after the screen's story is approved.

Marketing sections stay in `src/components/sections/`. Nothing in the admin tree imports from marketing sections, and nothing in marketing imports from blocks or the admin tree. Admin code must never reach the marketing bundle.

Marketing CSS scans only the marketing folders and the seven primitives marketing uses (badge, button, card, carousel, input, separator, textarea). Tailwind cannot re-include one file under an excluded folder, so `globals.css` lists the admin-only primitives one by one as `@source not` lines instead; a primitive with no such line is in the marketing scan. A marketing file that imports one of the excluded primitives must remove its `@source not` line, and the gate fails the build until it does. Admin, checkout and account screens get their own stylesheet entry in the wiring phase.

Files in blocks, ui and the app route groups stay under 300 lines; the gate fails above that. shadcn's sidebar and chart are allowlisted.

The reference libraries `ui/` and `pro-blocks/` at the repo root are read only and excluded from TypeScript. They are patterns to read and copy from, never imported.

## Storybook

Storybook is the catalog and the approval surface. Hannah approves a screen in Storybook, and only then is it wired to data.

Every file in `src/components/ui/` and `src/components/blocks/` has a sibling `*.stories.tsx`. Every block has `Default`, `Empty`, `Loading` (a skeleton) and `Error` (one line that says what to do) stories, plus `Phone` where the block changes shape on a phone. Every screen has `Default`, `NoDataYet`, `Phone` and `Tablet`. Fixtures come from the anonymised Jobber snapshot so every story shows real shaped data.

`npm run storybook` opens the catalog on port 6006. `npm test` runs the unit project only; the story project needs a browser and runs separately through `npm run test:stories`.

The viewports are 375, 768, 1280 and 1440. The backgrounds are cream, white and navy. `npm run test:stories` renders every story in headless Chromium and fails on an accessibility violation, because `a11y.test` is set to `"error"` in `.storybook/preview.tsx`. An exception is scoped to one story, carries a comment that says why, and comes out when the cause is fixed.

## Tables

The DataGrid is built from shadcn's TanStack data table recipe and extended with column reorder and CSV export. These rules apply to every table in the app.

The first column is a human readable name, and it is the link that opens the record. Row click never fights with the selection checkbox: the name opens the record, the checkbox selects, and nothing else on the row is a target. Every column sorts. Filters are visible chips with an active state, so what is filtering the table is never hidden in a menu. Columns can be hidden and reordered from a menu. The header is sticky. The bulk action bar appears above the grid only when rows are selected, and goes away when the selection is cleared. CSV export writes the visible rows with the visible columns. An empty result goes through `EmptyState`, with a line that says what to do next.

On a phone the table stays a table. The header is sticky, the first column is frozen, and the rest scrolls sideways with a cut off edge as the cue that there is more. Columns can be hidden to make room. Tables are never turned into stacks of cards.

Record detail opens in a side panel. On a laptop the panel pushes the grid narrower rather than covering it, so the row stays visible beside its detail. On a phone the panel covers the grid. A record gets a full page only when it has its own URL that someone needs to share.

## Charts

There are two chart shapes and no others: grouped bars by month, with this year in `chart-1` and last year in `chart-2` drawn dashed, and a single line. No pies, donuts, gauges, treemaps or 3D.

Colour highlights; it never encodes magnitude. A bar is orange because it is this year, not because it is big. Tooltips carry the exact numbers, formatted the same way as the tiles.

Stat tiles always name their comparison baseline in words, for example "vs October 2025", never with a bare arrow. The delta is coloured by whether the movement is good for the business, `positive` or `warning`, not by whether the number went up or down. More past due invoices is up and bad; fewer is down and good.

## Copy

The app follows the same copy rules as the site. Headings are sentence case. Sentences are short and complete; no fragments, no "Yes!", no em dashes. Booking buttons say "Book Online". Money is whole dollars with a comma, as in `$1,234`. Dates are written out where there is room ("October 14") and as a short form in table cells ("Oct 14"). Status words are plain: paid, past due, confirmed, cancelled.

## Decisions

2026-11-12. Laptop first and phone friendly. Hannah on a laptop is the main user and Ryan on a phone is the second.

2026-11-12. The feel is Stripe: light, calm, numbers first. Light mode only in phase 1.

2026-11-12. Tables are full data grids with sort, filter, hide and reorder columns, selection with bulk actions and export.

2026-11-12. The dashboard lives at `/admin` inside the website repo as a route group, not a separate app. Auth is layered: the proxy checks the `/admin` prefix and every page and read checks the session again.

2026-11-12. Organization scoping and user roles from day one. Every table carries `organization_id`, users are owner, manager or tech, and there is no branch UI until a second branch exists.

2026-11-12. Storybook is the catalog and the approval surface. Nothing is wired to data until its screen story is approved.

2026-11-12. SeasonLine and PassCard are built first, because nothing like them exists to copy and they decide whether the direction lands.

2026-11-12. The primary button rests on primary-dark (#B45309, about 5.0:1 with white text) and hovers to primary-deep (#92400E), chosen by Hannah over navy text on orange. The logo orange (--primary) stays for accents, chips, tints and text on navy. The Button story's contrast exception is gone.
