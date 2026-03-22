# Water Efficiency Upgrades Page + Pricing Page Updates — Design

**Date**: 2026-03-22
**URL**: `/water-efficiency`
**Scope**: New page + updates to existing `/pricing` page

---

## Overview

A single-page resource at `/water-efficiency` that educates homeowners on four irrigation efficiency upgrades Trailhead offers, includes an interactive water savings calculator with real local water rates, and funnels users toward booking a system inspection. Separately, the existing pricing page gets updated plan discounts and materials notes.

---

## New Page: `/water-efficiency`

### Section 1: Page Banner + Intro

**PageBanner**: "Water Efficiency Upgrades" / "Save water, save money — upgrade your irrigation system with proven technology."

**Intro block**: Short paragraph explaining Colorado's tiered water rates and why efficiency matters. Callout box for system inspection: $110 standalone, free with spring turn-on, earns $50 off any install.

### Section 2: The Four Upgrade Options

**Row 1 — Rachio 3 Smart Controller** (feature-section-3 pattern: image left, content right)
- Badge (green): "Save up to 30%"
- Features: Weather Intelligence (rain/wind/freeze skip), seasonal auto-adjust, app control, EPA WaterSense certified, Alexa/Google Home, no monthly fees
- Price: $350 installed (8-zone) / $400 installed (16-zone)
- Note: "Includes controller and professional installation"
- Buttons: "Book Installation" (default) → /contact | "Check Rachio Rebates" (link) → https://www.rachio.com/rebates/

**Row 2 — MPR Nozzle Retrofit** (feature row: image right, content left)
- Badge (green): "30–50% More Efficient"
- Features: Matched precipitation across all arcs, slower application prevents runoff, works with existing spray bodies, ideal for slopes and clay soil
- Price: $80–120 per zone (typical 8–12 nozzles + labor)
- Note: "Materials not included. Final price based on system inspection."
- Button: "Request Estimate" → /contact

**Row 3 — 2-Up Card Grid**

Card A: **Drip Zone Conversion**
- Badge (green): "Up to 70% Savings"
- Features: Pressure reducer for precise delivery, 1/4" drip tubing direct to each plant, eliminates overspray/evaporation, ~90% efficiency vs 60–75% for spray
- Price: $250–500 per zone (depends on bed size and plant count)
- Note: "Materials not included. Final price based on system inspection."

Card B: **Yard Layout Evaluation**
- Badge (outline): "Optimize Your System"
- Features: Zone coverage analysis, head spacing and arc adjustments, identify dead zones and overlap, efficiency recommendations
- Price: Requires system inspection — $110 (free with spring turn-on)
- Note: "Inspection earns $50 off any water efficiency install"

### Section 3: Water Savings Calculator (Interactive)

Dark navy background section (matches MaintenancePlans aesthetic with dot pattern). Two-column on desktop — inputs left, results right.

**Inputs:**
- City (select): Erie, Longmont, Louisville, Lafayette — maps to real tiered water rates
- Number of zones (select): 3–16
- Current controller (select): Traditional timer / Already smart
- Current nozzle type (select): Standard spray / Already MPR
- Has drip zones? (toggle): Yes / No

**Results Card (white, updates in real-time):**
- Estimated annual water savings (gallons)
- Estimated annual cost savings (dollars, based on city rates)
- Upgrade cost (one-time investment)
- Payback period (months)
- Per-upgrade breakdown

**Calculation Logic:**
- Smart controller: 25–30% reduction on total irrigation water
- MPR nozzles: 35% reduction per zone retrofitted
- Drip zones: 50% reduction per zone converted
- City water rates:
  - Erie: $6.48 (0–5K), $8.10 (5–15K), $12.12 (15–25K), $18.14 (25K+)
  - Longmont: $7.82 flat per 1,000 gal
  - Lafayette: $6.55 to $22.99 tiered
  - Louisville: ~$12 per 1,000 gal estimated
- Baseline: ~2,000 gal/zone/month over 5-month irrigation season

**Bottom CTA**: "Get a System Inspection" → /contact

### Section 4: System Inspection CTA

Cream background, centered white Card (same pattern as pricing page "Irrigation System Installation" section).
- Badge (outline): "Where to Start"
- h2: "System Inspection & Efficiency Evaluation"
- Price: $110 standalone | Free with spring turn-on
- Highlight: "$50 off any water efficiency install"
- Buttons: "Schedule an Inspection" (default) | "Call (970) 692-7270" (outline)

### Section 5: FAQ Accordion

Same `<details>` pattern as other pages:
- "How much water can a smart controller save?"
- "What are MPR nozzles and why are they more efficient?"
- "How long does a Rachio installation take?"
- "Do I need a system inspection before getting upgrades?"
- "Can I combine multiple upgrades for bigger savings?"
- "Are there rebates available for smart controllers?"

### Section 6: CTAStrip

Existing CTAStrip component.

---

## Navigation

Add "Water Efficiency" nav link between "Water Rebates" and "Blog" in both Header and Footer. Apply same `startsWith()` active state logic as Water Rebates.

---

## Pricing Page Updates (`/pricing`)

1. **Basic Plan discount**: 10% → **7% off all services** + **10% off system inspections**
2. **Pro Plan discount**: 15% → **12% off all services** + **15% off system inspections**
3. **Materials note**: Add "Materials not included" to Spring Turn-On, Mid-Season Inspection, and Repairs
4. **System Inspection**: Add $110 price point, note "Free with spring turn-on"
5. **$50 off installs**: Note that system inspection earns $50 off any water efficiency install
6. **Rachio rebates link**: Add in FAQ or near maintenance plans
7. **FAQ update**: Reflect new 7%/12% discount percentages

---

## Components Used

- **PageBanner** — existing, navy background
- **Card** (compound: Card, CardHeader, CardTitle, CardContent, CardFooter) — existing
- **Badge** (variants: default, green, outline) — existing CVA component
- **Button** (variants: default, secondary, outline, link; sizes: default, lg) — existing CVA component
- **CTAStrip** — existing
- **CheckCircle2** list pattern — same as pricing page ServiceItem
- **Feature rows** — adapted from pro-blocks feature-section-3 (alternating image/content)
- **Dark section** — adapted from MaintenancePlans (navy bg + dot pattern)
- **FAQ accordion** — same `<details>` pattern as pricing/services pages
- **WaterSavingsCalculator** — new `"use client"` component

---

## SEO

- Page title: "Water Efficiency Upgrades | Smart Irrigation for Erie, Longmont, Louisville & Lafayette"
- Meta description targeting water savings, smart controllers, MPR nozzles, drip irrigation
- Breadcrumb JSON-LD: Home → Water Efficiency
- FAQ JSON-LD for all FAQ items
- Internal links to /water-rebates, /contact, /pricing

---

## Data Sources for Calculator

- Erie water rates: erieco.gov/1021/Water-Service-Monthly-Volume-Charges
- Longmont rates: longmontcolorado.gov/water/rates-and-fees-water-storm-sewer/
- Lafayette rates: lafayetteco.gov/4256/2026-Residential-Water-Rates
- Louisville rates: coloradohometownweekly.com (2025 increase data)
- EPA WaterSense: 32% average savings for smart controllers
- Rachio: rachio.com/products/rachio-3 — 20%+ savings claim
- MPR efficiency: Hunter/Rain Bird specs — 30-50% improvement
- Drip efficiency: ~90% vs 60-75% for spray (HomeAdvisor/CSU Extension)
