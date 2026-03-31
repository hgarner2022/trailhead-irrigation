# Jobber Booking Flow Integration — Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add a dedicated booking page with Jobber's embedded booking widget for services that can be scheduled online. Update all CTAs across the site to route to the correct destination based on whether the service is bookable or requires a conversation.

## Two-Path Service Routing

### Bookable Services → `/book` (Jobber embed)
- Sprinkler Turn-on & System Check (all zone tiers)
- System Inspection & Tune-up
- Sprinkler Winterization

### Contact-Only Services → `/contact` (existing email form)
- Irrigation System Installation
- Sprinkler Repair
- Water Efficiency Upgrades
- Maintenance Plans

## New `/book` Page

- Headline: "Book Your Service"
- Subtext: "Select your service and pick a time that works for you."
- Jobber embedded booking widget (full-width, clean presentation)
- Below embed: fallback note — "Looking for an installation, repair, or custom project? Contact us for a free quote." linking to `/contact`
- Phone number visible in header/footer as always

### Jobber Embed Code
```html
<div id="e23339b3-04e9-434e-b375-7b4a7a913424-2547401"></div>
<link rel="stylesheet" href="https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css" media="screen" />
<script src="https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js" clienthub_id="e23339b3-04e9-434e-b375-7b4a7a913424-2547401" form_url="https://clienthub.getjobber.com/client_hubs/e23339b3-04e9-434e-b375-7b4a7a913424/public/work_request/embedded_work_request_form?form_id=2547401"></script>
```

Jobber work request form URL (fallback): https://clienthub.getjobber.com/hubs/e23339b3-04e9-434e-b375-7b4a7a913424/public/requests/2547401/new

## CTA Button Updates

| Page | Current CTA | New CTA | Destination |
|------|-------------|---------|-------------|
| Homepage Hero | "Contact Us" | "Book a Service" | `/book` |
| Homepage Hero | "Call (970) 692-7270" | Keep as-is | `tel:` |
| Services page (bookable) | "Contact Us" | "Book Online" | `/book` |
| Services page (installs/repair) | "Contact Us" | "Request a Quote" | `/contact` |
| Pricing page (bookable) | "Contact Us" / "Call" | "Book Online" | `/book` |
| Pricing page (installs/custom) | "Request an Estimate" | Keep as-is | `/contact` |
| Water Efficiency page | "Book Installation" / "Contact Us" | Keep → `/contact` | `/contact` |
| Maintenance Plans | "Get Started" | Keep → `/contact` | `/contact` |
| CTA Strip (site-wide) | "Contact Us" | "Book a Service" | `/book` |
| Header nav | "Call Now" | Keep as-is | `tel:` |

## Navigation Update

Add "Book Online" link to main navigation (header), making booking always one click away.

## What Stays the Same

- `/contact` page — untouched
- Phone number CTAs — always available everywhere
- Service descriptions and pricing content — no changes
- Sprinkler repair section — stays exactly as-is
