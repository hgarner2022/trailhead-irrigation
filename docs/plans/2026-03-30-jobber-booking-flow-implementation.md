# Jobber Booking Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/book` page with Jobber's embedded booking widget and update all CTAs across the site to route bookable services to `/book` and contact-only services to `/contact`.

**Architecture:** New `/book` page loads Jobber's third-party embed script via a client component. All existing CTA buttons are re-routed based on which service they relate to. Navigation gets a "Book Online" link.

**Tech Stack:** Next.js App Router, React client component (for Script tag), Tailwind CSS

---

### Task 1: Create the `/book` page with Jobber embed

**Files:**
- Create: `src/app/book/page.tsx`

**Step 1: Create the booking page**

Create `src/app/book/page.tsx` with:
- Server component wrapper with metadata
- `PageBanner` header ("Book Your Service")
- A client component `JobberEmbed` that loads the Jobber script
- Fallback text below: "Looking for an installation, repair, or custom project? Contact us for a free quote."
- Link to `/contact` and phone number

```tsx
import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { JobberEmbed } from "@/components/sections/JobberEmbed"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowRight, Phone } from "lucide-react"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Book a Service | Trailhead Lawn & Irrigation",
  description:
    "Book sprinkler turn-on, system inspection, or winterization online. Serving Erie, Longmont, Louisville, Lafayette & Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/book` },
}

export default function BookPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Book a Service", url: `${siteConfig.url}/book` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Book Your Service"
        description="Select your service and pick a time that works for you."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <JobberEmbed />
        </div>
      </section>

      {/* Fallback for non-bookable services */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Need an Installation, Repair, or Custom Project?
          </h2>
          <p className="text-muted-foreground mb-6">
            Some services require a conversation first. Reach out and we&apos;ll get you a free quote.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className={buttonVariants({ size: "lg" })}
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:9706927270"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <Phone className="w-4 h-4" />
              (970) 692-7270
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
```

**Step 2: Create the JobberEmbed client component**

Create `src/components/sections/JobberEmbed.tsx`:

```tsx
"use client"

import Script from "next/script"

export function JobberEmbed() {
  return (
    <div>
      <div id="e23339b3-04e9-434e-b375-7b4a7a913424-2547401" />
      <link
        rel="stylesheet"
        href="https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css"
        media="screen"
      />
      <Script
        src="https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js"
        strategy="lazyOnload"
        data-clienthub_id="e23339b3-04e9-434e-b375-7b4a7a913424-2547401"
        data-form_url="https://clienthub.getjobber.com/client_hubs/e23339b3-04e9-434e-b375-7b4a7a913424/public/work_request/embedded_work_request_form?form_id=2547401"
      />
    </div>
  )
}
```

**Note:** The Jobber embed script uses `clienthub_id` and `form_url` as attributes on the `<script>` tag. Next.js `Script` component passes unknown props as data attributes. We may need to test whether Jobber's script reads `data-clienthub_id` or `clienthub_id`. If the `Script` component doesn't work, fall back to `useEffect` with manual DOM script injection:

```tsx
"use client"

import { useEffect, useRef } from "react"

export function JobberEmbed() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // Only inject once
    if (containerRef.current.querySelector("script")) return

    const script = document.createElement("script")
    script.src =
      "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js"
    script.setAttribute("clienthub_id", "e23339b3-04e9-434e-b375-7b4a7a913424-2547401")
    script.setAttribute(
      "form_url",
      "https://clienthub.getjobber.com/client_hubs/e23339b3-04e9-434e-b375-7b4a7a913424/public/work_request/embedded_work_request_form?form_id=2547401"
    )
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div ref={containerRef}>
      <div id="e23339b3-04e9-434e-b375-7b4a7a913424-2547401" />
      <link
        rel="stylesheet"
        href="https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css"
        media="screen"
      />
    </div>
  )
}
```

Use the `useEffect` approach — it's more reliable for third-party scripts that read custom attributes.

**Step 3: Verify the page renders**

Run: `npm run dev` and visit `http://localhost:3000/book`
Expected: Page loads with banner, Jobber embed loads, fallback section visible below.

**Step 4: Commit**

```bash
git add src/app/book/page.tsx src/components/sections/JobberEmbed.tsx
git commit -m "feat: add /book page with Jobber embedded booking widget"
```

---

### Task 2: Add "Book Online" to main navigation

**Files:**
- Modify: `src/components/sections/Header.tsx`

**Step 1: Add Book Online to NAV_LINKS**

In `Header.tsx`, add a "Book Online" entry to `NAV_LINKS` array. Place it before "Contact":

```typescript
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Water Rebates", href: "/water-rebates" },
  { label: "Water Efficiency", href: "/water-efficiency" },
  { label: "Blog", href: "/blog" },
  { label: "Book Online", href: "/book" },
  { label: "Contact", href: "/contact" },
]
```

**Step 2: Verify nav displays correctly**

Run dev server, check desktop and mobile nav both show "Book Online".

**Step 3: Commit**

```bash
git add src/components/sections/Header.tsx
git commit -m "feat: add Book Online to main navigation"
```

---

### Task 3: Update Hero CTA

**Files:**
- Modify: `src/components/sections/Hero.tsx`

**Step 1: Change primary CTA from "Contact Us" → "Book a Service" pointing to `/book`**

Change line 27-30 in Hero.tsx:

```tsx
<Link
  href="/book"
  className={buttonVariants({ size: "lg" })}
>
  Book a Service
</Link>
```

The phone number CTA stays as-is.

**Step 2: Verify**

Check homepage hero shows "Book a Service" button linking to `/book`.

**Step 3: Commit**

```bash
git add src/components/sections/Hero.tsx
git commit -m "feat: update Hero CTA to Book a Service → /book"
```

---

### Task 4: Update CTAStrip

**Files:**
- Modify: `src/components/sections/CTAStrip.tsx`

**Step 1: Change primary CTA from "Contact Us" → "Book a Service" pointing to `/book`**

Change lines 17-20:

```tsx
<Link
  href="/book"
  className={buttonVariants({ size: "lg" })}
>
  Book a Service
</Link>
```

Phone number CTA stays as-is.

**Step 2: Verify**

CTAStrip appears on multiple pages (homepage, services, pricing, etc.). Check any one.

**Step 3: Commit**

```bash
git add src/components/sections/CTAStrip.tsx
git commit -m "feat: update CTAStrip CTA to Book a Service → /book"
```

---

### Task 5: Update Services page CTAs (per-service routing)

**Files:**
- Modify: `src/app/services/page.tsx`

**Step 1: Add per-service CTA routing**

The SERVICES array has 3 items. Each currently has a generic "Contact Us" → `/contact` link. Update to route based on service type:

Add a `cta` field to each service in the SERVICES array:

```typescript
const SERVICES = [
  {
    title: "Irrigation System Installation",
    // ... existing fields ...
    cta: { label: "Request a Quote", href: "/contact" },
  },
  {
    title: "Repair & Optimizations",
    // ... existing fields ...
    cta: { label: "Request a Quote", href: "/contact" },
  },
  {
    title: "Winterization & Spring Startup",
    // ... existing fields ...
    cta: { label: "Book Online", href: "/book" },
  },
]
```

Then update the render to use `service.cta`:

```tsx
<Link
  href={service.cta.href}
  className={cn(buttonVariants({ size: "lg" }), "w-fit mt-2")}
>
  {service.cta.label}
</Link>
```

**Step 2: Verify**

- Installation section → "Request a Quote" → `/contact`
- Repair section → "Request a Quote" → `/contact`
- Winterization section → "Book Online" → `/book`

**Step 3: Commit**

```bash
git add src/app/services/page.tsx
git commit -m "feat: route services page CTAs to /book or /contact per service"
```

---

### Task 6: Update Pricing page — add "Book Online" buttons to seasonal service cards

**Files:**
- Modify: `src/app/pricing/page.tsx`

**Step 1: Add Book Online buttons to the three seasonal service cards**

Each of the three seasonal service cards (Spring Turn-On, Inspection, Winterization) currently has no CTA button. Add a "Book Online" link at the bottom of each card's `<CardContent>`:

```tsx
<Link
  href="/book"
  className={cn(buttonVariants({ size: "sm" }), "w-full mt-4")}
>
  Book Online
</Link>
```

The Repairs section already has "Request a Quote" → `/contact` — keep that as-is.
The Installs section already has "Request a Free Quote" → `/contact` — keep that as-is.
MaintenancePlans already links to `/contact` — keep that as-is.

**Step 2: Verify**

Three seasonal cards should each show a "Book Online" button linking to `/book`.

**Step 3: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "feat: add Book Online buttons to seasonal service pricing cards"
```

---

### Task 7: Update MeetRyan CTA

**Files:**
- Modify: `src/components/sections/MeetRyan.tsx`

**Step 1: Keep the MeetRyan CTA pointing to `/contact`**

The MeetRyan section says "Let's Talk About Your Irrigation System" — this is a general/conversational CTA, so it should stay pointing to `/contact`. **No changes needed here.**

This task is a verification-only step: confirm the CTA reads "Let's Talk About Your Irrigation System" and links to `/contact`.

**Step 2: Commit**

No commit needed — no changes.

---

### Task 8: Verify water-efficiency and blog CTAs stay on `/contact`

**Files (read-only verification):**
- `src/app/water-efficiency/page.tsx` — all CTAs should stay `/contact`
- `src/components/sections/WaterSavingsCalculator.tsx` — all CTAs should stay `/contact`
- `src/app/blog/[slug]/page.tsx` — CTA should stay `/contact`
- `src/components/sections/MaintenancePlans.tsx` — all CTAs should stay `/contact`

**Step 1: Verify no changes needed**

All these pages deal with contact-only services (installs, water efficiency, maintenance plans). Their CTAs should remain pointing to `/contact`. Confirm by reading each file.

**Step 2: Commit**

No commit needed — no changes.

---

### Task 9: Full site walkthrough and visual verification

**Step 1: Run dev server and test all pages**

Visit each page and verify CTA routing:

| Page | Expected primary CTA | Destination |
|------|---------------------|-------------|
| `/` (Homepage Hero) | "Book a Service" | `/book` |
| `/` (CTAStrip) | "Book a Service" | `/book` |
| `/` (MeetRyan) | "Let's Talk..." | `/contact` |
| `/services` (Installation) | "Request a Quote" | `/contact` |
| `/services` (Repair) | "Request a Quote" | `/contact` |
| `/services` (Winterization) | "Book Online" | `/book` |
| `/pricing` (3 seasonal cards) | "Book Online" | `/book` |
| `/pricing` (Repairs section) | "Request a Quote" | `/contact` |
| `/pricing` (Installs section) | "Request a Free Quote" | `/contact` |
| `/pricing` (Maintenance Plans) | "Get Started" | `/contact` |
| `/book` | Jobber embed loads | n/a |
| `/book` (fallback) | "Contact Us" | `/contact` |
| `/water-efficiency` | all CTAs | `/contact` |
| `/contact` | existing form | n/a |
| Header nav | "Book Online" visible | `/book` |

**Step 2: Test mobile nav**

Open mobile menu, verify "Book Online" appears.

**Step 3: Test Jobber embed loads**

On `/book`, confirm the Jobber booking widget renders with service selection.
