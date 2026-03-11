# Website Content Updates — Design Doc

Date: 2026-03-11

## Summary

Batch of content, pricing, and structural updates across all pages. No architectural changes — all edits are to existing files.

## Changes by File

### `src/components/sections/Header.tsx`
- Increase logo from `h-12` to `h-16`

### `src/components/sections/Hero.tsx`
- Add Louisville & Lafayette to hero subtitle serving areas

### `src/components/sections/ServicesOverview.tsx`
- Rename "Repair & Maintenance" to "Repair & Optimizations"
- Wrap each service card in `<Link>` to `/services`
- Ensure "View All Services" button links to `/services`

### `src/app/page.tsx`
- Remove `<Testimonials />` import and usage

### `src/components/sections/Footer.tsx`
- Update email to `ryan@trailheadirrigation.com`
- Add Louisville & Lafayette to "Proudly serving" text

### `src/app/services/page.tsx`
- Rename "Repair & Maintenance" to "Repair & Optimizations"
- Update description and features list per spec
- Update Winterization description and features, add typical service times

### `src/app/pricing/page.tsx`
- Repair pricing: $100/$125 -> $120/$130
- Manifold additional valve: $275 -> $90, remove compression fittings note
- Winterization: $130 -> $95
- Spring Activation: update to $120/$130 with minor repairs note
- Update tree work / roots section to $150/hour with rerouting note
- Update FAQ answers to reflect new prices

### `src/app/contact/page.tsx`
- Update service dropdown options
- Add Address field
- Update service area text to include Louisville & Lafayette
- Update email to `ryan@trailheadirrigation.com`

### `src/lib/seo.ts`
- Update email
- Add Louisville & Lafayette to serviceArea and areaServed arrays
