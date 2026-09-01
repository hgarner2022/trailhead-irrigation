# Water Efficiency Rebates Page — Design Document

**Date:** 2026-03-21
**Status:** Approved

## Goal

Create a water efficiency rebates resource hub for Trailhead's service area. Helps homeowners understand what rebates are available in their city, how to apply, and what Trailhead's role is (we do the irrigation work and provide receipts; the customer applies for rebates themselves).

## Architecture

```
/water-rebates              → Hub page (city selector + Slow the Flow overview)
/water-rebates/erie         → Erie rebate details
/water-rebates/lafayette    → Lafayette rebate details
/water-rebates/louisville   → Louisville rebate details
/water-rebates/longmont     → Longmont rebate details
```

Separate pages per city for SEO — each targets city-specific search terms like "Erie CO water rebates." Hub page captures broader queries and links to each city.

## Hub Page (`/water-rebates`)

### Sections (top to bottom)

1. **PageBanner** — "Water Efficiency Rebates" / "Save money on irrigation upgrades — see what rebates are available in your area."

2. **Intro section** (white bg) — Short explanation: your city may offer rebates on smart controllers, efficient nozzles, drip conversions, and more. Trailhead does the work and provides your receipts. You apply for the rebate. All programs are first-come, first-served while funds are available.

3. **City selector grid** (cream bg) — 4 Cards in 2x2 grid (1-col on mobile):
   - City name as CardTitle
   - Badge showing rebate highlight (e.g., "Up to $200 in rebates")
   - 2-3 bullet points of key rebates available
   - Button: "View [City] Rebates" → links to subpage

4. **Slow the Flow callout** (white bg) — Standalone Card explaining Resource Central's free sprinkler evaluation. What it is, who it's for, how to sign up. Link to resourcecentral.org. Positioned as a helpful free resource for homeowners (not a Trailhead service).

5. **How It Works** (cream bg) — 3-step visual:
   - (1) Trailhead does the irrigation work
   - (2) We provide your receipts
   - (3) You apply for your rebate
   Icons + short descriptions.

6. **CTAStrip** — existing component

### SEO
- Title: "Water Efficiency Rebates | Erie, Longmont, Louisville & Lafayette"
- Meta description targeting "Colorado water rebates" + city names
- Breadcrumb JSON-LD: Home > Water Rebates

## City Subpages (e.g., `/water-rebates/erie`)

### Sections (top to bottom)

1. **PageBanner** — "[City] Water Efficiency Rebates" / "Rebates available for [City] utility customers — while funds last."

2. **Breadcrumb** — Text-based: Home > Water Rebates > [City]

3. **Disclaimer notice** — Badge or callout: "Rebate amounts and availability are subject to change. Last updated March 2026. Visit [city website] for the latest information."

4. **Rebate cards** (alternating white/cream sections) — Each rebate type as a Card:
   - CardTitle: rebate name (e.g., "Smart Irrigation Controller")
   - Badge with green variant: rebate amount (e.g., "$100 rebate")
   - CardContent: eligibility, requirements, limits, approved brands

5. **How to Apply** — Numbered steps specific to that city. Purchase windows, required documents, link to official application form. Button linking to city application portal.

6. **Additional Resources** — Slow the Flow mention (required for Lafayette, recommended for others). Links to Resource Central signup and official city water page.

7. **FAQ section** — 3-4 city-specific questions using `<details>` accordion pattern (same as services page). FAQ JSON-LD for SEO.

8. **CTAStrip**

### SEO per city page
- Unique title: "[City] Water Efficiency Rebates | Trailhead Lawn & Irrigation"
- Unique meta description targeting "[City] CO water rebates sprinkler"
- Breadcrumb JSON-LD: Home > Water Rebates > [City]
- FAQ JSON-LD

## Navigation

Add "Water Rebates" to header nav between "Pricing" and "Blog."

## Components Used

All existing — no new components needed:
- `PageBanner` — page headers
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`, `CardFooter` — rebate cards, city cards
- `Badge` (green variant) — rebate amounts
- `Button` — CTAs, external links
- `CTAStrip` — bottom CTA
- Lucide icons: `Droplets`, `DollarSign`, `ClipboardCheck`, `Leaf`

## Visual Design

Matches existing site patterns exactly:
- Navy PageBanners with white text
- Alternating white/cream section backgrounds
- Orange primary buttons for CTAs
- Green badges for dollar amounts
- Cards with `hover:shadow-md transition-shadow`
- Same spacing: `section-padding-y`, `container-padding-x`, `max-w-7xl`

## Content Approach

- Full rebate details on-site (amounts, eligibility, steps) — keeps users on site, better SEO
- Disclaimer + "last updated" date on every city page
- Links to official city sources for latest info
- Slow the Flow mentioned as a community resource, not a Trailhead service
- Trailhead's role: we do the irrigation work and provide receipts

## City Rebate Data Summary

### Erie
- Smart controllers: $100
- Toilets: $100-200
- High-efficiency nozzles: $3/ea (up to 24)
- Rain barrels: up to $50 (up to 2)
- Drip lines: 50% up to $75
- Turf replacement: up to $2,000
- Must be Erie utility customer, purchases Jan 1-Dec 31 2026
- Apply: online form at erieco-sustainability portal

### Lafayette
- Nozzles: $3/ea (10-50 per residence, one-time per 10 years)
- Drip equipment: up to $50
- Smart controller (Rachio): free install (limited)
- **Requires Slow the Flow participation** (proof of report needed)
- Affidavit of Lawful Presence required
- Apply: online form at lafayetteco.gov

### Louisville
- Free Slow the Flow evaluations
- Free smart controller (Rachio 3) and rain sensor installs (limited)
- Lawn replacement: $750 credit via Resource Central
- Garden In A Box: $25 off per kit
- Free waterwise seminars
- Programs through Resource Central partnership
- Sign up: slowtheflow.resourcecentral.org

### Longmont
- Weather-based controllers: up to $65
- Rotary nozzles: up to $4/ea (min 3)
- Rain sensors: $20-40
- Soil moisture sensors: up to $60
- Flow sensors: up to $130
- Drip conversion: up to $130
- Spigot timers: up to $65
- Indoor: toilets ($30-90), washers ($75), showerheads ($30), dishwashers ($25)
- Lawn replacement: $750 via Resource Central
- Submit within 45 days of purchase
- Currently in drought watch
- Apply: Qualtrics form
