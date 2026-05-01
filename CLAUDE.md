# Trailhead Lawn & Irrigation LLC — Website

## Project Overview
Marketing website for Trailhead Lawn & Irrigation LLC — a professional lawn care and irrigation services company. The site should feel **professional, trustworthy, and grounded** — like hiring the most reliable team in town.

## Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Deployment**: Vercel (target)
- **Content**: Static / hardcoded for now (no CMS)

## File Structure
```
src/
  app/                          # Next.js App Router pages
    layout.tsx                  # Root layout (metadata, schema, GA4, conversion tracking)
    page.tsx                    # Homepage
    sitemap.ts                  # Dynamic sitemap (static pages + cities + blog + smart-controllers)
    globals.css                 # Tailwind base + custom properties
    services/                   # /services + /services/[city] (5 cities)
    pricing/                    # /pricing
    smart-controllers/          # Rachio funnel: hub + /[city] + /water-savings-calculator
    water-rebates/              # Per-city utility rebate pages
    water-efficiency/           # Water efficiency upgrades
    blog/                       # 15 blog posts
    about/, contact/, book/     # Standard
    api/contact/                # Contact form POST handler
  components/
    ui/                         # Small primitives — usually re-exported from /ui library
    sections/                   # Page sections (Hero, ServicesOverview, StatsStrip, …)
    ConversionTracking.tsx      # GA4 click delegation for tel: + /book + form events
  lib/
    seo.ts                      # JSON-LD helpers + siteConfig + sameAs profiles
    blog.ts                     # BLOG_POSTS data
    city-data.ts                # CITY_DATA for /services/[city]
    rachio-data.ts              # CITY_RACHIO + RACHIO_PRICING + estimateNetCost
    rebate-data.ts              # CITIES rebate program data
    reviews.ts                  # REVIEWS — real Google reviews used in schema + Testimonials
    seo.ts                      # All schema generators

# REFERENCE LIBRARIES (read-only, copy patterns from these):
ui/                             # 72+ UI primitives — shadcn/Radix based
pro-blocks/                     # Pre-built landing page sections (FROM Appy.AI — adapt, don't copy verbatim)

public/
  llms.txt                      # AI agent-parseable site overview
  pricing.md                    # AI agent-parseable pricing
  robots.txt                    # Explicit AI bot allow list
  images/                       # Site images
```

---

## ⚡ Library-First Rule (READ THIS FIRST)

**Before creating ANY new component or page section, you MUST:**

1. **Search `src/components/sections/` first** — Trailhead's own shared sections (StatsStrip, FaqList, DefinitionList, ServicePriceCard, SectionHeader, HowItWorks, CompatibleBrands, etc.). Use these directly.
2. **Search `src/components/ui/` second** — Trailhead's primitive layer. Re-exports of shadcn-style primitives that match Trailhead's tokens.
3. **For a NEW primitive that's not in `src/components/ui/`** — choose one:
   - **Preferred: `npx shadcn@latest add <name>`** — generates a fresh primitive that uses `@/lib/utils` and Tailwind tokens out of the box. Minimal adapt work.
   - **Alternative: copy from `ui/` and adapt.** See the workflow below. Use only when you need the Appy.AI-specific variants (e.g. compound loading states, card-aware buttons).
4. **For a NEW section** — search `pro-blocks/landing-page/` for a similar pattern, then build a Trailhead-native version using our tokens. **Don't import or copy `pro-blocks/` files verbatim** — they use Appy.AI's design tokens and import paths.
5. **Only build truly from scratch when nothing exists** — and follow the existing patterns (`cn()`, semantic tokens, native HTML or Radix, CVA variants when needed).

**Why:** consistency, maintainability, faster shipping, accessibility encoded by default.

### Important: `ui/` and `pro-blocks/` are NOT importable

Both directories are **excluded from TypeScript** (see `tsconfig.json`'s `exclude` array) and import from `@/app/lib/utils` (Appy.AI's path) — they will not compile if imported directly. They exist as **reference libraries**: open them, read the pattern, then either:
- Run `npx shadcn add <name>` and get the same primitive cleanly, OR
- Copy the file into `src/components/ui/`, replace `@/app/lib/utils` → `@/lib/utils`, follow the transitive deps, and adapt styling to Trailhead's tokens.

### What's available in `ui/` (the source library)

If you need a primitive that's not yet in `src/components/ui/`, look first to see if `ui/` has it (most do). High-likelihood future needs for Trailhead, mapped to whether they're already adopted:

**Already in `src/components/ui/`** — import these directly:
`badge` · `button` · `card` · `carousel` · `input` · `separator` · `textarea`

**Likely-useful future additions (in `ui/` waiting):**
- **Forms**: `select` · `checkbox` · `radio-group` · `field` · `label` · `switch` · `slider` · `combobox` · `country-select` · `native-select` · `input-group` · `input-otp` · `datePicker` · `calendar`
- **Feedback / state**: `alert` (8 variants) · `alert-dialog` · `progress` · `skeleton` · `spinner` · `toggle` · `toggle-group` · `loading` · `animated-ellipsis`
- **Layout / navigation**: `accordion` · `collapsible` · `breadcrumb` · `pagination` · `tabs` · `navigation-menu` · `sidebar` · `sheet` · `drawer` · `dialog` · `popover` · `hover-card` · `tooltip` · `dropdownMenu` · `context-menu` · `menubar` · `command` · `kbd`
- **Display / data**: `avatar` · `aspect-ratio` · `table` · `dataTable` · `chart` · `scrollArea` · `resizable` · `responsive` · `segmented-control` · `relativeTime`
- **Utility**: `icons` · `empty` · `field` · `grid` · `common` (Row / Column primitives) · `portalContainer` · `sonner` (toasts)

**App-specific — skip these (not relevant to a marketing site):**
`MicrophoneVoiceToTextInput` · `chat-ask-survey` · `browserPreview` · `documentPreviewModal` · `imageModal` · `lockedByPlanBadge` · `ace` · `textEditor` · `video-player` · `typewriterTitle`

### Workflow: adopting a new primitive

**Option A — `npx shadcn add` (preferred, 30 seconds):**
```bash
npx shadcn@latest add accordion
# auto-installs to src/components/ui/accordion.tsx with @/lib/utils import
```
Then `import { Accordion } from "@/components/ui/accordion"` and use.

**Option B — Adapt from `ui/`** (use only when shadcn's version is missing the variant you need):
1. Copy the file: `cp ui/<name>.tsx src/components/ui/<name>.tsx`
2. Replace `from "@/app/lib/utils"` → `from "@/lib/utils"` (and any other `@/app/...` paths)
3. Check internal imports — many ui/ files depend on `./skeleton`, `./tooltip`, `./icons`, etc. Copy each transitive dep with the same fix.
4. Verify it uses Trailhead's semantic tokens (`bg-primary`, `text-foreground`, `border-border`). The `ui/` library uses similar tokens but occasionally references Appy.AI-specific ones — replace those with Trailhead equivalents (see Design Tokens section).
5. `npx tsc --noEmit` to confirm it compiles.

### Workflow: adopting a section pattern from `pro-blocks/`

**Always Option B** (pro-blocks isn't on shadcn). 70+ landing-page section variants exist:

| Variants | Path | Count |
|---|---|---|
| Hero sections | `pro-blocks/landing-page/hero-sections/` | 22 |
| Feature sections | `pro-blocks/landing-page/feature-sections/` | 20 |
| Header sections | `pro-blocks/landing-page/header-sections/` | 20 |
| FAQ sections | `pro-blocks/landing-page/faq-sections/` | 5 |
| Pricing sections | `pro-blocks/landing-page/pricing-sections/` | 5 |
| Footers | `pro-blocks/landing-page/footers/` | 9 |

When you need a new section pattern:
1. Browse the relevant directory; pick the variant that's closest visually
2. Open that variant + `*.stories.tsx` for context
3. Build the Trailhead-native version in `src/components/sections/<NewSection>.tsx`:
   - Use Trailhead semantic tokens (navy / primary orange / cream)
   - Import primitives from `@/components/ui/...`
   - Match the Trailhead section pattern (`bg-cream section-padding-y` wrapper, etc.)
   - Use `SectionHeader` for the tagline → title → description block

---

## Reference Libraries — ALWAYS CONSULT BEFORE BUILDING

### `ui/` — Component Library (72+ components)

**RULE: Before building ANY UI component, check `ui/` first.** Read the existing component to match its patterns. If a primitive exists here, use its approach — don't reinvent it.

#### What's in there
- **Layout**: `common.tsx` (Row, Column), `card.tsx`, `grid.tsx`, `sidebar.tsx`, `container.tsx`
- **Forms**: `input.tsx`, `textarea.tsx`, `button.tsx`, `checkbox.tsx`, `select.tsx`, `switch.tsx`, `slider.tsx`, `field.tsx`, `label.tsx`
- **Dialogs**: `dialog.tsx`, `alert-dialog.tsx`, `drawer.tsx`, `sheet.tsx`
- **Feedback**: `alert.tsx` (8 variants), `badge.tsx`, `skeleton.tsx`, `spinner.tsx`, `progress.tsx`
- **Navigation**: `breadcrumb.tsx`, `tabs.tsx`, `navigation-menu.tsx`, `pagination.tsx`
- **Data**: `table.tsx`, `dataTable.tsx`, `accordion.tsx`, `chart.tsx`
- **Display**: `avatar.tsx`, `tooltip.tsx`, `popover.tsx`, `hover-card.tsx`, `carousel.tsx`
- **Utilities**: `separator.tsx`, `scrollArea.tsx`, `aspect-ratio.tsx`, `icons.tsx`

#### Patterns to follow
1. **Radix UI + Tailwind + CVA**: Components wrap Radix primitives, style with Tailwind, manage variants with `class-variance-authority`
2. **`cn()` utility**: Always use `cn()` from `lib/utils` for conditional class merging
3. **CVA variants**: Define variants like this:
   ```typescript
   const buttonVariants = cva("base-classes", {
     variants: { variant: { default: "...", destructive: "..." }, size: { default: "...", sm: "..." } },
     defaultVariants: { variant: "default", size: "default" }
   })
   ```
4. **Compound components**: Card = Card + CardHeader + CardTitle + CardContent + CardFooter
5. **React Context**: Parent components cascade state (loading, disabled) to children via context
6. **Props pattern**: Extend native HTML props + CVA VariantProps, support `asChild` via Radix Slot
7. **`data-slot` attributes**: All components use `data-slot="component-name"` for identification
8. **Semantic color tokens**: Use `bg-card`, `text-foreground`, `border-border` — never hardcoded hex
9. **Loading states**: Components support `isLoading` prop with Skeleton placeholders
10. **Accessibility**: ARIA attributes, keyboard nav, focus rings via Radix

### `pro-blocks/` — Pre-built Page Sections

**RULE: Before building ANY page section, check `pro-blocks/landing-page/` first.** Pick the closest variant, read it, adapt it for Trailhead's content.

#### What's in there
| Section Type | Count | Path |
|-------------|-------|------|
| **Header Sections** | 20 variants | `pro-blocks/landing-page/header-sections/` |
| **Hero Sections** | 22 variants | `pro-blocks/landing-page/hero-sections/` |
| **Feature Sections** | 20 variants | `pro-blocks/landing-page/feature-sections/` |
| **Pricing Sections** | 5 variants | `pro-blocks/landing-page/pricing-sections/` |
| **FAQ Sections** | 5 variants | `pro-blocks/landing-page/faq-sections/` |
| **Footers** | 9 variants | `pro-blocks/landing-page/footers/` |
| **Utilities** | `blockSpacing.tsx`, `tagline.tsx` | `pro-blocks/landing-page/` |

#### How blocks are structured
- Each block type has a **registry file** (e.g., `HeroSectionBlock.tsx`) defining all variants with a discriminated union type system
- Each variant is a **separate file** (e.g., `hero-section-1.tsx`) with its own layout
- Blocks import from `ui/` for primitives (Button, AspectRatio, Breadcrumb, etc.)
- All blocks wrap in `<BlockSpacingWrapper spacing={props.spacing}>` for consistent vertical rhythm
- Spacing options: `"none" | "xs" | "sm" | "md" | "lg" | "xl" | "full"`
- Blocks use the **Tagline** component (CVA: "default", "outline", "link" variants)

#### Block patterns to follow
1. **Slot system**: Each variant declares required/optional content slots (title, description, buttons, images, etc.)
2. **Type-safe variants**: Discriminated unions ensure correct props per variant
3. **MaxItems constraints**: Arrays (features, links) are tuple-constrained per variant
4. **Props pattern**: Blocks accept typed props for each slot — title text, button labels, image sources, etc.

---

## Coding Rules
- Prefer server components by default; add `"use client"` only when needed
- Keep components small and flat — no deep nesting
- Use semantic HTML (`<section>`, `<nav>`, `<main>`, `<footer>`)
- Images: use `next/image` with proper `alt` text
- No unnecessary abstractions — this is a simple marketing site
- Mobile-first responsive design
- **Always use `cn()` for class merging** — never string concatenation
- **Always use semantic color tokens** — never hardcode hex in components
- **Check `ui/` and `pro-blocks/` before building** — adapt existing patterns, don't start from scratch

## Design Tokens

### Brand Colors (from logo)
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#D97706` | Orange — CTAs, accents, highlights (from logo sun/subtext) |
| `--primary-dark` | `#B45309` | Hover states for primary |
| `--primary-light` | `#F59E0B` | Light accent variant |
| `--navy` | `#2B3544` | Dark navy — headers, hero backgrounds (from logo badge) |
| `--navy-light` | `#3D4F63` | Lighter navy for secondary text |
| `--charcoal` | `#1E293B` | Darkest shade — footer, dark sections |
| `--white` | `#FFFFFF` | Backgrounds, text on dark |
| `--cream` | `#FAFAF8` | Off-white section backgrounds |
| `--stone` | `#F5F5F4` | Subtle background alternation |
| `--border` | `#E7E5E4` | Borders, dividers |
| `--muted` | `#78716C` | Secondary/muted text |
| `--success` | `#16A34A` | Green accents (lawn health, check marks) |

### Typography
- **Headings**: System sans-serif stack or Inter — bold, clean
- **Body**: Same family, regular weight
- **Sizes**: Use Tailwind defaults (`text-sm` through `text-5xl`)
- Keep it simple — no more than 2 font weights on a page

### Spacing & Layout
- Base spacing: Tailwind defaults (4px grid)
- Max content width: `max-w-7xl` (1280px)
- Section padding: `py-16 md:py-24` (consistent vertical rhythm)
- Border radius: `rounded-lg` (8px) for cards, `rounded-full` for pills/buttons

### Logo Files
- `Assets/Logo.jpg` — Full badge logo on white (primary use)
- `Assets/Logo2.png` — Compact badge version
- `Assets/Logo3.png` — Horizontal layout variant

## Tone & Content Guidelines
- Professional but not corporate — approachable expert
- Short, clear sentences. No jargon.
- Focus on trust signals: experience, reliability, local
- CTAs: "Get a Free Quote", "Schedule Service", "Call Now"

## Skills & Plugins

### `/frontend-design` — Distinctive UI Generation (installed)

Invoke with `/frontend-design` when building any page, component, or interface. This skill enforces high design quality and avoids generic AI aesthetics.

**When to use**: Building new pages, components, sections, or any visual interface work.

**What it does**:
- Forces a bold aesthetic direction before coding (not generic templates)
- Prioritizes distinctive typography, strong color use, meaningful motion, and spatial composition
- Produces production-grade, working code — not mockups
- Avoids AI slop: no Inter/Roboto defaults, no purple-gradient-on-white, no cookie-cutter layouts

**Design rules it enforces**:
1. Pick a clear aesthetic tone before writing code (for this project: professional, grounded, trustworthy — earthy outdoor feel matching the Trailhead brand)
2. Use distinctive font pairings, not system defaults
3. Dominant brand colors (navy + orange) with sharp accents — not timid even palettes
4. Meaningful animations at key moments (page load staggered reveals, hover states)
5. Atmospheric backgrounds and textures — not flat solid colors everywhere
6. Asymmetric layouts, generous negative space, grid-breaking where appropriate

**RULE**: When building any new page or section, invoke `/frontend-design` to get the design thinking phase right before jumping into code.

### Superpowers — Structured Development Workflow (needs install)

**Install with**:
```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Provides 14 composable skills for structured software development:

| Skill | What it does |
|-------|-------------|
| `brainstorming` | Socratic design refinement before coding |
| `writing-plans` | Detailed task-based implementation plans |
| `executing-plans` | Step-by-step plan execution |
| `test-driven-development` | RED-GREEN-REFACTOR TDD workflow |
| `systematic-debugging` | 4-phase debugging methodology |
| `subagent-driven-development` | Parallel agent execution for larger tasks |
| `dispatching-parallel-agents` | Coordinating multiple subagents |
| `requesting-code-review` | Automated code review process |
| `receiving-code-review` | Acting on review feedback |
| `finishing-a-development-branch` | Clean branch completion workflow |
| `using-git-worktrees` | Isolated branch development |
| `verification-before-completion` | Verify before claiming done |
| `using-superpowers` | Meta: how to use the framework |
| `writing-skills` | Author new custom skills |

**When to use**: Any non-trivial development task. Superpowers enforces a "think before you code" workflow — brainstorm, plan, then execute with TDD and code review.

**RULE**: For features that touch multiple files or involve new page builds, use the superpowers planning + execution flow rather than ad-hoc coding.

---

## Pages (Live)

| Route | Purpose |
|---|---|
| `/` | Homepage — Hero → StatsStrip → ServicesOverview → MeetRyan → Testimonials → HomeFAQ → CTAStrip |
| `/services` | Service overview + HowItWorks process + service detail blocks + city links + FAQ |
| `/services/[city]` | 5 city pages (erie, longmont, louisville, lafayette, firestone) — local water info + restrictions + FAQ |
| `/pricing` | Service pricing cards + comparison table + maintenance plans + FAQ |
| `/smart-controllers` | Rachio sales funnel hub — value prop → comparison vs Hunter/Rain Bird → per-city rebate snapshot → CompatibleBrands → definitions → FAQ |
| `/smart-controllers/[city]` | 5 Rachio city pages with city-specific rebate context + price card variants (none / cash / unknown / free-install) |
| `/smart-controllers/water-savings-calculator` | Interactive lawn-size → gallons-saved + dollars-saved calculator (EPA WaterSense averages) |
| `/water-rebates` + `/water-rebates/[slug]` | Per-city utility rebate landing pages (drives the rebate funnel) |
| `/water-efficiency` | Water-efficient upgrade services |
| `/blog` + `/blog/[slug]` | 15 long-form blog posts |
| `/about`, `/contact`, `/book` | Standard pages |

## SEO + Analytics Infrastructure

**Schema (`src/lib/seo.ts`):**
- `LocalBusiness` (with `aggregateRating` + `sameAs` to GBP / Yelp / Nextdoor)
- `Organization` (with full PostalAddress + `sameAs`)
- 4 individual `Service` entities (installation / repair / blowout / spring turn-on) with offers
- `Person` (Ryan) with `knowsAbout`, `workLocation`, credentials
- `Review` (real Google reviews from `src/lib/reviews.ts`)
- `FAQPage`, `BreadcrumbList`, `BlogPosting`

**Conversion tracking (`src/components/ConversionTracking.tsx`):**
- `phone_click` — any `tel:` link, anywhere
- `book_click` — any link to `/book` or `/book/...`
- `contact_form_submit` — fired from contact form's onSubmit (captures requested service)
- Mark these as conversions in GA4 → Admin → Events

**AI / agent visibility:**
- `public/llms.txt` — full site overview, services, per-city rebate summary
- `public/pricing.md` — AI agent-parseable pricing
- `public/robots.txt` — explicit allow list for 17 AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)

**Verification:**
- Google Search Console verified via `verification.google` in `src/app/layout.tsx`
- GA4 measurement ID `G-QZJP9M6LNQ` loaded via `next/script` afterInteractive
- Vercel handles www → apex redirect at the edge — DO NOT add a `next.config.ts` redirect (caused a loop on first try)

## Adding a new section — checklist

1. **Library check (REQUIRED)**:
   - Search `src/components/sections/` — does FaqList / DefinitionList / ServicePriceCard / SectionHeader / StatsStrip / HowItWorks / CompatibleBrands cover this?
   - Search `src/components/ui/` for the primitive (Card / Badge / Button / Input / Separator / etc.)
   - For new primitives: `npx shadcn@latest add <name>` first; copy from `ui/` only as a fallback
   - For new section patterns: browse `pro-blocks/landing-page/` for the closest variant and adapt
2. **Tokens**: All colors via semantic tokens (`bg-cream`, `text-navy`, `bg-primary/10`, `text-foreground`). NEVER hardcode hex.
3. **Spacing**: Use `section-padding-y` and `container-padding-x` for consistent rhythm.
4. **Background rhythm**: Alternate `bg-background` ↔ `bg-cream` between sections; `bg-navy` for high-impact breaks. Never two same-bg sections back-to-back.
5. **Accessibility**: `aria-labelledby` linking to the heading id; semantic HTML.
6. **Conversion**: If adding CTAs, use `/book` or `tel:9706927270` — they get auto-tracked by ConversionTracking.

## Trailhead's own shared sections (`src/components/sections/`)

Always use these instead of building from scratch:

| Component | Use for |
|---|---|
| `<SectionHeader tagline title description />` | Tagline → title → description block at the top of any section |
| `<FaqList faqs={...} itemBg="cream" />` | Any FAQ accordion. Native `<details>`, zero JS. |
| `<DefinitionList items={...} columns={2} />` | Semantic `<dl>`/`<dt>`/`<dd>` "What is X?" blocks (highly extractable by AI Overviews) |
| `<ServicePriceCard title icon price priceUnit perZoneNote features footnote />` | Service tier card with price, features, CTA |
| `<StatsStrip />` | The credibility-stats row (homepage only) |
| `<HowItWorks />` | "What to expect" 4-step process (services page) |
| `<CompatibleBrands />` | "Compatible with: brand · brand · brand" strip |
| `<PageBanner title description backgroundImage />` | Top banner on every interior page |
| `<CTAStrip />` | Bottom CTA on every page |
| `<MeetRyan />` · `<Testimonials />` · `<HomeFAQ />` · `<Hero />` · `<ServicesOverview />` | Homepage-specific sections |

## Known cleanup opportunities (audit findings)

These don't break anything but should be addressed in a future refactor pass:

- **9 pages use native `<details>` for FAQs** instead of the `ui/accordion.tsx` primitive. Native `<details>` is zero-JS and accessible by default, so this is partially intentional, but the markup is duplicated 9 times — could be extracted into a shared `<FaqList faqs={...}/>` section component for consistency.
- **`<dl>` / `<dt>` / `<dd>` pattern** in `/services` "Sprinkler Services Explained" is hand-rolled. If we add more definition lists, lift it into a `<DefinitionList>` section component.
- **Three near-identical price card patterns** in `/pricing` (Spring Turn-On / Inspection / Winterization) — already use `Card`, but the inner structure could be a `<ServicePriceCard>` to make adding a 4th service trivial.
- **No shared `<SectionHeader>` component** — the "tagline → title → description" stacked block appears in 6+ places with copy-pasted markup. Lift into `pro-blocks/landing-page/header-sections/HeaderSectionBlock` style.

## Adding a new city to the Rachio funnel

Edit `src/lib/rachio-data.ts` → `CITY_RACHIO` array → add a new entry. The city page generates statically; sitemap auto-includes it. Verify the rebate amount is sourced from the city's published page before shipping (no fabrication — see `/smart-controllers/[city]` disclaimer).
