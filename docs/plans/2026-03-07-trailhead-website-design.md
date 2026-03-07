# Trailhead Lawn & Irrigation — Website Design

## Overview

Marketing website for Trailhead Lawn & Irrigation LLC. 5-page site focused on irrigation services serving Weld County, Erie, and Longmont, Colorado. Owner: Ryan — Erie local, dad of three boys (1, 4, 7), married 13 years.

## Stack

- Next.js 14+ (App Router), TypeScript, Tailwind CSS v4
- Static content (no CMS)
- Deploy to Vercel

## Reference Libraries (MUST USE)

- `ui/` — 72+ component primitives (Button, Card, Input, etc.). Check before building any component.
- `pro-blocks/landing-page/` — Pre-built sections (headers, heroes, features, pricing, FAQ, footers). Check before building any section.

## Contact Info

- Phone: 970-692-7270
- Email: rpgarner22@gmail.com
- Service area: Weld County, Erie & Longmont, CO

## Pages

### Shared Layout

**Header** (adapt from `pro-blocks/landing-page/header-sections/`):
- Top bar: phone number + email
- Main nav: Logo (Logo.jpg or Logo2.png) on left, links on right — Home | Services | Pricing | Blog | Contact
- Mobile: hamburger menu, tap-to-call phone button
- Sticky on scroll

**Footer** (adapt from `pro-blocks/landing-page/footers/`):
- Logo + company name
- Quick links: Home, Services, Pricing, Blog, Contact
- Contact info: phone, email
- "Proudly serving Weld County, Erie & Longmont, CO"
- Copyright

### Page 1: Homepage (`/`)

1. **Hero** (adapt from `pro-blocks/landing-page/hero-sections/`)
   - Background: `Boulder colorado.jpg` (Flatirons) with dark overlay
   - Headline: "Northern Colorado's Trusted Irrigation Experts"
   - Subline: service area callout
   - Two CTAs: "Get a Free Quote" (link to contact) + "Call Now" (tel: link)
   - Use `ui/button.tsx` for CTA buttons

2. **Services Overview** (adapt from `pro-blocks/landing-page/feature-sections/`)
   - 3 cards using `ui/card.tsx`:
     - Irrigation System Installation
     - Repair & Maintenance
     - Winterization & Spring Startup
   - Images: `Sprinkler head.jpg`, `Lawn.jpg`
   - Each card links to Services page

3. **Meet Ryan** (adapt from `pro-blocks/landing-page/feature-sections/`)
   - Split layout: image left, text right
   - `Ryan.JPG` (mountain overlook) as main image
   - `Ryan_family.jpeg` (with boys) as secondary accent
   - Bio: Erie local, dad of three (ages 1, 4, 7), married 13 years
   - "Locally Owned & Operated" badge
   - Tone: "When you call Trailhead, you get me."
   - CTA to contact page

4. **Testimonials** (adapt from `pro-blocks/landing-page/feature-sections/`)
   - 2-3 placeholder testimonial cards with star ratings
   - Use `ui/card.tsx` for cards

5. **CTA Strip**
   - "Ready to get started?" + phone number + contact form link
   - Use `ui/button.tsx`

### Page 2: Services (`/services`)

1. **Hero Banner**
   - `Sprinkler head.jpg` with overlay
   - Title: "Our Irrigation Services"

2. **Service Sections** (adapt from `pro-blocks/landing-page/feature-sections/`)
   - **Irrigation System Installation**: description, what's included, process
   - **Repair & Maintenance**: common issues, response time
   - **Winterization & Spring Startup**: seasonal protection, scheduling
   - Images: `Sprinkler head.jpg`, `Lawn.jpg`
   - Each section ends with "Get a Quote" CTA

### Page 3: Pricing (`/pricing`)

Mirrors 303 Sprinklers pricing structure with Trailhead branding.

1. **Hero Banner** — title + subtitle

2. **Repair Service Pricing**
   - Hourly rate structure (placeholder): trip charge + hourly rate + parts
   - Service area map: `Service area.png`

3. **Set Pricing** (use a clean list/table layout)
   - Wi-Fi Controller Install (by zone count) — placeholder prices
   - Manifold Rebuilds (per valve) — placeholder prices
   - Backflow Repairs (by size) — placeholder prices
   - Sprinkler Shut Off Valve Replacement — placeholder price

4. **Seasonal Pricing**
   - Winterization (base + per-zone) — placeholder prices
   - Activation (minimum charge) — placeholder price

5. **Additional Premiums / Notes**
   - Tree work disclaimers
   - PVC lateral line policy
   - Scheduling notes

### Page 4: Contact (`/contact`)

1. **Split Layout** (adapt from `pro-blocks/landing-page/feature-sections/`)
   - Left: Contact form (Name, Phone, Email, Service Needed dropdown, Message)
     - Use `ui/input.tsx`, `ui/textarea.tsx`, `ui/select.tsx`, `ui/button.tsx`
   - Right: Phone, email, hours (placeholder), service area text

2. **Service Area**
   - `erie.jpg` as accent
   - `Service area.png` map embedded
   - Text: Weld County, Erie, Longmont

### Page 5: Blog (`/blog`)

1. **Blog Index** (`/blog`)
   - Simple list/grid of blog post cards using `ui/card.tsx`
   - Each card: title, date, short excerpt, "Read More" link
   - Start with 2-3 placeholder SEO-friendly posts

2. **Blog Post** (`/blog/[slug]`)
   - Clean article layout with readable typography
   - Title, date, body content
   - CTA at bottom: "Need irrigation help? Contact us"
   - Hardcoded content for now (no CMS)

3. **Placeholder Posts**
   - "When Should You Winterize Your Sprinklers in Northern Colorado?"
   - "Signs Your Irrigation System Needs Repair"
   - "Why Hire a Local Irrigation Company?"

## Assets Map

| File | Usage |
|------|-------|
| `Logo.jpg` | Header, footer, favicon source |
| `Logo2.png` | Alternate header use |
| `Logo3.png` | Horizontal variant if needed |
| `Boulder colorado.jpg` | Homepage hero background |
| `Boulder.jpg` | Meet Ryan section background/accent |
| `Boulder-road.jpg` | Available for section dividers |
| `Sprinkler head.jpg` | Services hero, service cards |
| `Lawn.jpg` | Service sections |
| `Ryan.JPG` | Meet Ryan — profile image |
| `Ryan_family.jpeg` | Meet Ryan — family image |
| `erie.jpg` | Contact page accent |
| `Service area.png` | Pricing + Contact pages — coverage map |

## Design Tokens

Already defined in CLAUDE.md. Key values:
- Primary (orange): #D97706
- Navy: #2B3544
- Charcoal: #1E293B
- Cream: #FAFAF8
- Success (green): #16A34A

## Key Rules

- Server components by default
- Mobile-first responsive
- Use `cn()` for class merging
- Use semantic color tokens
- Check `ui/` and `pro-blocks/` before building ANY component or section
- Adapt closest pro-block variant, don't build from scratch
