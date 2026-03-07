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
  app/            # Next.js App Router pages
    layout.tsx    # Root layout with fonts, metadata
    page.tsx      # Homepage
    globals.css   # Tailwind base + custom properties
  components/     # Reusable components
    ui/           # Small primitives (Button, Card, etc.)
    sections/     # Page sections (Hero, Services, Contact, etc.)
  lib/            # Utilities (cn(), etc.)
  assets/         # Static images, logo files

# REFERENCE LIBRARIES (read-only, copy patterns from these):
ui/               # 72+ UI primitives — shadcn/Radix based
pro-blocks/       # Pre-built landing page sections
```

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

## Pages (Planned)
1. **Home** — Hero, services overview, trust signals, CTA
2. **Services** — Detailed service offerings
3. **About** — Company story, team
4. **Contact** — Form + phone/email/location info
