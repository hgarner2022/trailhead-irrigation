# Water Efficiency Rebates — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a water efficiency rebates hub page and four city-specific subpages so homeowners can discover rebates available in Erie, Lafayette, Louisville, and Longmont.

**Architecture:** Next.js App Router with static server components. Hub page at `/water-rebates` with city selector cards. Four subpages at `/water-rebates/[city]`. All rebate data hardcoded as typed constants. Shared layout for the water-rebates route group. Uses existing components (PageBanner, Card, Badge, Button, CTAStrip).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v4, Lucide icons

---

## Task 1: Add "Water Rebates" to Header and Footer Navigation

**Files:**
- Modify: `src/components/sections/Header.tsx`
- Modify: `src/components/sections/Footer.tsx`

**Step 1: Update Header NAV_LINKS array**

In `src/components/sections/Header.tsx`, change the `NAV_LINKS` array to add "Water Rebates" between "Pricing" and "Blog":

```typescript
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Water Rebates", href: "/water-rebates" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]
```

**Step 2: Fix active state for nested routes**

The Header currently uses `pathname === link.href` for active state highlighting. This won't highlight "Water Rebates" when on `/water-rebates/erie`. Update the active state logic in both the desktop and mobile nav `className` props:

Replace:
```typescript
pathname === link.href
  ? "text-primary bg-primary/5"
  : "text-foreground hover:text-primary hover:bg-stone"
```

With:
```typescript
(pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)))
  ? "text-primary bg-primary/5"
  : "text-foreground hover:text-primary hover:bg-stone"
```

This must be done in both the desktop nav (line ~38-42) and mobile nav (line ~80-84). The `link.href !== "/"` guard prevents Home from being active on every page.

**Step 3: Update Footer NAV_LINKS array**

In `src/components/sections/Footer.tsx`, update the `NAV_LINKS` array identically:

```typescript
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Water Rebates", href: "/water-rebates" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]
```

**Step 4: Verify the dev server compiles**

Run: `npm run dev`
Expected: Compiles without errors. "Water Rebates" link visible in header and footer.

**Step 5: Commit**

```bash
git add src/components/sections/Header.tsx src/components/sections/Footer.tsx
git commit -m "feat: add Water Rebates to header and footer navigation"
```

---

## Task 2: Create Rebate Data Constants

**Files:**
- Create: `src/lib/rebate-data.ts`

**Step 1: Create the rebate data file**

Create `src/lib/rebate-data.ts` with typed data for all four cities. This file contains all rebate information, city metadata, FAQs, and external links. All city pages will import from here.

```typescript
import { DollarSign, Droplets, Leaf, Wifi, CloudRain, Timer, Flower2, GraduationCap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type Rebate = {
  name: string
  amount: string
  icon: LucideIcon
  details: string[]
  brands?: string[]
}

export type CityRebateData = {
  slug: string
  name: string
  state: string
  tagline: string
  badgeText: string
  highlights: string[]
  officialUrl: string
  officialLabel: string
  applicationUrl: string
  applicationLabel: string
  rebates: Rebate[]
  howToApply: {
    steps: string[]
    purchaseWindow?: string
    submissionDeadline?: string
  }
  slowTheFlowRequired: boolean
  slowTheFlowNote: string
  additionalPrograms?: { name: string; description: string; url?: string }[]
  faqs: { question: string; answer: string }[]
}

export const CITIES: CityRebateData[] = [
  {
    slug: "erie",
    name: "Erie",
    state: "CO",
    tagline: "Rebates available for Town of Erie utility customers — while funds last.",
    badgeText: "Up to $200 in rebates",
    highlights: [
      "Smart controllers: $100 rebate",
      "High-efficiency nozzles: $3 each",
      "Drip line conversion: up to $75",
    ],
    officialUrl: "https://www.erieco.gov/574/Water-Efficiency-Rebates",
    officialLabel: "Town of Erie Water Efficiency Rebates",
    applicationUrl: "https://erieco-sustainability.app.transform.civicplus.com/forms/47076",
    applicationLabel: "Erie Rebate Application",
    rebates: [
      {
        name: "Smart Irrigation Controller",
        amount: "$100",
        icon: Wifi,
        details: [
          "Must be WaterSense-labeled",
          "Limit 1 per household",
          "Must be connected to permanent in-ground irrigation system",
        ],
      },
      {
        name: "High-Efficiency Nozzles",
        amount: "$3 per nozzle (up to $72)",
        icon: Droplets,
        details: [
          "Up to 24 nozzles per household",
          "Rebate will not exceed purchase price",
        ],
        brands: ["Hunter", "K Rain", "Orbit", "Rain Bird", "Toro"],
      },
      {
        name: "Drip Line Conversion",
        amount: "50% rebate up to $75",
        icon: Leaf,
        details: [
          "Covers drip equipment and conversion kits",
          "Rebate will not exceed purchase price",
        ],
      },
      {
        name: "Rain Barrels",
        amount: "Up to $50 per barrel",
        icon: CloudRain,
        details: [
          "Up to 2 barrels per household",
          "Must be 55 gallons each",
          "Rebate will not exceed purchase price",
        ],
      },
      {
        name: "High-Efficiency Toilets",
        amount: "$100 per toilet (max $200)",
        icon: DollarSign,
        details: [
          "Must be WaterSense-labeled",
          "1.28 gallons per flush or less",
          "Limit 2 per household",
          "Old toilet must be recycled with proof",
        ],
      },
      {
        name: "Turf Replacement Program",
        amount: "Up to $2,000",
        icon: Flower2,
        details: [
          "Separate program for lawn-to-xeriscape conversion",
          "Contact Erie for full details",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Research qualified fixtures and review rebate limitations on the Town of Erie website.",
        "Purchase and install qualifying items at your Erie service address.",
        "Complete the online rebate application with your utility billing account number, scanned receipts showing purchase date, make, and model, and installation date.",
      ],
      purchaseWindow: "January 1 – December 31, 2026",
      submissionDeadline: undefined,
    },
    slowTheFlowRequired: false,
    slowTheFlowNote: "Erie offers free Slow the Flow sprinkler consultations through Resource Central. While not required for rebates, it is a great way to identify where efficient upgrades will save the most water.",
    additionalPrograms: [
      {
        name: "Turf Replacement Program",
        description: "Up to $2,000 per household for replacing lawn with water-wise landscaping.",
        url: "https://www.erieco.gov/574/Water-Efficiency-Rebates",
      },
    ],
    faqs: [
      {
        question: "Who is eligible for Erie water rebates?",
        answer: "You must be a current Town of Erie utility customer with a non-delinquent account. Items must be purchased between January 1 and December 31, 2026, and installed at a Town of Erie service address.",
      },
      {
        question: "How do I receive my Erie rebate?",
        answer: "Rebates under $200 are credited to your water bill within one billing cycle. Rebates over $200 are sent as checks. Rebates are processed on a first-come, first-served basis until funding is exhausted.",
      },
      {
        question: "Can renters apply for Erie rebates?",
        answer: "Renters or HOA-billed customers should email rebates@erieco.gov for specific eligibility guidance.",
      },
    ],
  },
  {
    slug: "lafayette",
    name: "Lafayette",
    state: "CO",
    tagline: "Rebates available for City of Lafayette residents — while funds last.",
    badgeText: "Free smart controller installs",
    highlights: [
      "Free Rachio smart controller install (limited)",
      "Nozzle rebates: $3 each",
      "Drip equipment: up to $50",
    ],
    officialUrl: "https://www.lafayetteco.gov/3849/Outdoor-Water-Efficiency-Rebates",
    officialLabel: "City of Lafayette Water Efficiency Rebates",
    applicationUrl: "https://lafayetteco.gov/FormCenter/Sustainability-22/Outdoor-Water-Efficiency-Rebate-April-20-529",
    applicationLabel: "Lafayette Rebate Application",
    rebates: [
      {
        name: "Smart Controller (Rachio)",
        amount: "Free installation",
        icon: Wifi,
        details: [
          "Limited number available per season",
          "Installation begins mid-June",
          "Must book evaluation via Resource Central first",
          "Program reviews applications and schedules appointments",
        ],
      },
      {
        name: "Rotary / High-Efficiency Nozzles",
        amount: "$3 per nozzle",
        icon: Droplets,
        details: [
          "Minimum 10, maximum 50 per residence",
          "One-time rebate per residence per 10-year period",
        ],
        brands: ["Hunter MP", "Rain Bird", "Toro Precision", "K-Rain"],
      },
      {
        name: "Drip Equipment",
        amount: "Up to $50",
        icon: Leaf,
        details: [
          "Limit 1 rebate per residence",
          "Includes drip conversion kits, drip lines, emitters, pressure reducers, distribution lines, timers, and valves (15-40 psi)",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Complete a sprinkler evaluation through Resource Central's Slow the Flow program (required).",
        "Purchase qualifying equipment within the last 6 months.",
        "Submit legible purchase receipt identifying the approved product.",
        "Provide a legible copy of your Slow the Flow report.",
        "Include an Affidavit of Lawful Presence and identification copy (per Colorado HB 06S-1023).",
        "Upon approval, credit is applied to your utility bill.",
      ],
      purchaseWindow: "Items purchased within last 6 months",
      submissionDeadline: undefined,
    },
    slowTheFlowRequired: true,
    slowTheFlowNote: "Lafayette requires proof of a completed Slow the Flow sprinkler evaluation from Resource Central before you can apply for any outdoor water rebates. Sign up at resourcecentral.org/sprinklers/residential/.",
    faqs: [
      {
        question: "Do I need a Slow the Flow evaluation for Lafayette rebates?",
        answer: "Yes. Lafayette requires proof of a completed Slow the Flow sprinkler evaluation from Resource Central before you can apply for any outdoor water efficiency rebate. This is a free service for Lafayette residents.",
      },
      {
        question: "How do I get a free smart controller in Lafayette?",
        answer: "Book a Slow the Flow evaluation through Resource Central (303-999-3824 or water@resourcecentral.org). After the evaluation, you will receive a link to the smart controller eligibility application. A limited number of free Rachio controllers are available each season, installed starting mid-June.",
      },
      {
        question: "What is the Affidavit of Lawful Presence?",
        answer: "Per Colorado House Bill 06S-1023, Lafayette requires an Affidavit of Lawful Presence and a copy of your identification with your rebate application. The affidavit form is available on the City of Lafayette website.",
      },
    ],
  },
  {
    slug: "louisville",
    name: "Louisville",
    state: "CO",
    tagline: "Free programs available for City of Louisville water customers.",
    badgeText: "Free smart controllers & evaluations",
    highlights: [
      "Free Rachio 3 smart controller install",
      "Free rain sensor install",
      "Free Slow the Flow evaluation",
    ],
    officialUrl: "https://www.louisvilleco.gov/living-in-louisville/residents/sustainability/water",
    officialLabel: "City of Louisville Water Conservation",
    applicationUrl: "https://slowtheflow.resourcecentral.org",
    applicationLabel: "Sign Up via Resource Central",
    rebates: [
      {
        name: "Free Smart Controller (Rachio 3)",
        amount: "Free",
        icon: Wifi,
        details: [
          "WiFi-enabled, auto-adjusts watering based on weather",
          "Controllable via mobile app",
          "Limited controllers available per season",
          "2026 applications currently open",
        ],
      },
      {
        name: "Free Rain Sensor (Rain Bird WR2)",
        amount: "Free",
        icon: CloudRain,
        details: [
          "Wireless rain sensor",
          "Detects rainfall and pauses sprinklers automatically",
          "Limited sensors available per season",
        ],
      },
      {
        name: "Free Slow the Flow Evaluation",
        amount: "Free",
        icon: Droplets,
        details: [
          "60-90 minute on-site sprinkler evaluation",
          "Custom watering schedule for your property",
          "Efficiency testing and recommendations",
          "Available June through August",
        ],
      },
      {
        name: "Lawn Replacement Program",
        amount: "$750 credit",
        icon: Flower2,
        details: [
          "Through Resource Central partnership",
          "Professional removal or DIY with free Garden In A Box kits",
          "Minimum 200 sq ft of lawn replacement",
          "At least 50% water-wise plants required",
        ],
      },
      {
        name: "Garden In A Box",
        amount: "$25 off per kit",
        icon: Leaf,
        details: [
          "Professionally designed, water-wise garden kits",
          "Colorado-adapted perennial plants",
          "Pre-orders: March for spring, June for late summer",
          "Discount applied automatically at checkout",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Join the 2026 interest list at slowtheflow.resourcecentral.org.",
        "Receive a confirmation email with a link to the eligibility application.",
        "Complete the eligibility form for the program(s) you want.",
        "Resource Central reviews applications and schedules appointments (starting mid-June).",
        "For lawn replacement, apply at resourcecentral.org/lawn/apply.",
      ],
      purchaseWindow: undefined,
      submissionDeadline: undefined,
    },
    slowTheFlowRequired: false,
    slowTheFlowNote: "Louisville offers free Slow the Flow evaluations through Resource Central. Signing up also puts you in the queue for free smart controller and rain sensor installations.",
    additionalPrograms: [
      {
        name: "Free Waterwise Yard Seminars",
        description: "Free virtual workshops on low-water landscaping, xeric plants, and smart irrigation. Taught by local landscape professionals.",
        url: "https://resourcecentral.org/seminars/",
      },
    ],
    faqs: [
      {
        question: "How do I get a free smart controller in Louisville?",
        answer: "Sign up at slowtheflow.resourcecentral.org to join the 2026 interest list. You will receive a confirmation email with a link to the eligibility application. A limited number of Rachio 3 controllers are available each season, with installations starting mid-June.",
      },
      {
        question: "What does a Slow the Flow evaluation include in Louisville?",
        answer: "A trained technician visits your home for 60-90 minutes. They inspect all irrigation zones, run efficiency tests with catch cups, create a custom watering schedule for your property, and provide a detailed report with recommendations. The service is completely free for Louisville water customers.",
      },
      {
        question: "What is the Louisville lawn replacement program?",
        answer: "Louisville partners with Resource Central to offer a $750 credit toward professional lawn removal, or free Garden In A Box kits if you do it yourself. You must replace at least 200 square feet and use at least 50% water-wise plants. Apply at resourcecentral.org/lawn/apply.",
      },
    ],
  },
  {
    slug: "longmont",
    name: "Longmont",
    state: "CO",
    tagline: "Rebates available for City of Longmont residential water customers — while funds last.",
    badgeText: "Up to $130 per rebate",
    highlights: [
      "Drip conversion: up to $130",
      "Flow sensors: up to $130",
      "Rotary nozzles: $4 each",
    ],
    officialUrl: "https://longmontcolorado.gov/water/rates-and-fees-water-storm-sewer/assistance-rebates-water/",
    officialLabel: "City of Longmont Water Rebates",
    applicationUrl: "https://longmontcityxm.gov1.qualtrics.com/jfe/form/SV_80oznIAPDni8TPg",
    applicationLabel: "Longmont Rebate Application",
    rebates: [
      {
        name: "Weather-Based Irrigation Controller",
        amount: "Up to $65",
        icon: Wifi,
        details: [
          "Must be WaterSense certified",
          "Must be connected to permanent in-ground irrigation system",
          "Proof of purchase with model number required",
        ],
      },
      {
        name: "Rotary / High-Efficiency Nozzles",
        amount: "Up to $4 each",
        icon: Droplets,
        details: [
          "Minimum of 3 nozzles required",
          "Slowly deliver multiple rotating streams to reduce waste",
        ],
      },
      {
        name: "Rain Sensor",
        amount: "$20 (wired) / $40 (wireless)",
        icon: CloudRain,
        details: [
          "Must be connected to permanent in-ground irrigation system",
          "Pauses irrigation during rainfall",
        ],
      },
      {
        name: "Soil Moisture Sensor",
        amount: "Up to $60",
        icon: Leaf,
        details: [
          "Must be connected to permanent in-ground system",
          "Calibrates with controller to irrigate only when moisture is depleted",
        ],
      },
      {
        name: "Flow Sensor",
        amount: "Up to $130",
        icon: Timer,
        details: [
          "Must be connected to a WaterSense irrigation controller",
          "Measures water flow and sends data to controller",
          "Helps detect leaks and overwatering",
        ],
      },
      {
        name: "Drip Conversion Equipment",
        amount: "Up to $130",
        icon: Leaf,
        details: [
          "For converting turf zones to drip irrigation",
          "Eligible: drip hose, conversion heads, emitters, hooks/clamps, risers",
        ],
      },
      {
        name: "Spigot Timer",
        amount: "Up to $65",
        icon: Timer,
        details: [
          "Must have automatic shutoff",
          "Prevents overwatering from hose-end sprinklers",
        ],
      },
    ],
    howToApply: {
      steps: [
        "Purchase qualifying equipment from any retailer.",
        "Install the equipment at your Longmont residential service address.",
        "Submit the online rebate application within 45 days of purchase or installation.",
        "Include proof of purchase with model number.",
        "Rebates are processed on a first-come, first-served basis while funds are available.",
      ],
      purchaseWindow: "Year-round (submit within 45 days of purchase)",
      submissionDeadline: "45 days after purchase/installation",
    },
    slowTheFlowRequired: false,
    slowTheFlowNote: "Longmont offers free Slow the Flow evaluations through Resource Central. After completing an evaluation, you may qualify for a $50 bonus rebate on a Wi-Fi irrigation controller (in addition to the standard rebate).",
    additionalPrograms: [
      {
        name: "Lawn Replacement Program",
        description: "$750 credit via Resource Central for professional lawn removal, or free Garden In A Box kits for DIY. Minimum 200 sq ft.",
        url: "https://resourcecentral.org/lawn/apply",
      },
      {
        name: "Coloradoscape Design Templates",
        description: "Free downloadable landscape design templates from the City of Longmont. Designs save 10,000-40,000 gallons per year.",
        url: "https://longmontcolorado.gov/water/water-conservation/",
      },
    ],
    faqs: [
      {
        question: "How long do I have to submit a Longmont rebate application?",
        answer: "You must submit your rebate application within 45 days of purchase or installation. Applications are processed on a first-come, first-served basis while funds are available.",
      },
      {
        question: "Can I combine multiple Longmont rebates?",
        answer: "Yes. You can apply for rebates on multiple qualifying items. Each rebate type has its own limits. For example, you could get rebates on a smart controller, rotary nozzles, and drip conversion equipment all in the same year.",
      },
      {
        question: "Does Longmont require a Slow the Flow evaluation for rebates?",
        answer: "No, but it is recommended. A free Slow the Flow evaluation helps identify where upgrades will save the most water. After completing an evaluation, Longmont residents may also qualify for a $50 bonus rebate on a Wi-Fi irrigation controller.",
      },
      {
        question: "Is Longmont currently in a drought?",
        answer: "As of 2026, Longmont is at a Sustainable Conservation Level — Drought Watch. While no mandatory restrictions are in place, the city strongly encourages voluntary water reduction. This makes irrigation efficiency rebates especially timely.",
      },
    ],
  },
]

export const SLOW_THE_FLOW = {
  name: "Slow the Flow",
  provider: "Resource Central",
  description: "A free sprinkler evaluation program available to homeowners in participating Colorado communities. A trained technician visits your home, tests your sprinkler system efficiency, and creates a custom watering schedule for your property.",
  includes: [
    "60-90 minute on-site evaluation",
    "Visual inspection of all irrigation zones",
    "Efficiency testing with catch cups",
    "Custom watering schedule creation",
    "Detailed report with recommendations",
  ],
  url: "https://resourcecentral.org/sprinklers/residential/",
  signupUrl: "https://slowtheflow.resourcecentral.org",
  phone: "303-999-3824",
  email: "water@resourcecentral.org",
  season: "June through August (sign up for 2026 interest list now)",
  note: "This is a free community resource — not a Trailhead service. Some cities (like Lafayette) require a Slow the Flow evaluation before you can apply for rebates.",
}
```

**Step 2: Verify the file compiles**

Run: `npm run dev`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/lib/rebate-data.ts
git commit -m "feat: add water efficiency rebate data for all 4 cities"
```

---

## Task 3: Create the Hub Page (`/water-rebates`)

**Files:**
- Create: `src/app/water-rebates/page.tsx`

**Step 1: Create the hub page**

Create `src/app/water-rebates/page.tsx`. This page has five sections:

1. PageBanner
2. Intro section (white bg)
3. City selector grid (cream bg)
4. Slow the Flow callout (white bg)
5. How It Works (cream bg)
6. CTAStrip

Use the following patterns from existing pages:
- `services/page.tsx` for Metadata export, JSON-LD scripts, section alternation
- `ServicesOverview.tsx` for Card grid layout
- `MeetRyan.tsx` for Badge usage

```typescript
import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Wrench, Receipt, ClipboardCheck, Droplets, Leaf, ExternalLink } from "lucide-react"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { CITIES, SLOW_THE_FLOW } from "@/lib/rebate-data"
import { Check } from "lucide-react"

export const metadata: Metadata = {
  title: "Water Efficiency Rebates | Erie, Longmont, Louisville & Lafayette",
  description:
    "Discover water efficiency rebates available in Erie, Longmont, Louisville, and Lafayette, CO. Smart controllers, efficient nozzles, drip conversions, and more. Trailhead Lawn & Irrigation provides the work and receipts — you apply for the rebate.",
  alternates: { canonical: `${siteConfig.url}/water-rebates` },
}

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Wrench,
    title: "We Do the Work",
    description: "Trailhead installs your smart controller, efficient nozzles, drip conversion, or other qualifying irrigation upgrades.",
  },
  {
    step: 2,
    icon: Receipt,
    title: "We Provide Your Receipts",
    description: "After the job, we give you itemized receipts with the make, model, and purchase details you need for your rebate application.",
  },
  {
    step: 3,
    icon: ClipboardCheck,
    title: "You Apply for Your Rebate",
    description: "Submit your application through your city's rebate portal. We link you directly to the right forms below.",
  },
]

export default function WaterRebatesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Water Rebates", url: `${siteConfig.url}/water-rebates` },
            ])
          ),
        }}
      />
      <PageBanner
        title="Water Efficiency Rebates"
        description="Save money on irrigation upgrades — see what rebates are available in your area."
      />

      {/* Intro */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl text-center">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Many communities in Northern Colorado offer rebates on water-efficient irrigation equipment — including smart controllers, high-efficiency nozzles, drip conversions, and more. Programs are funded on a first-come, first-served basis while funds are available.
          </p>
          <p className="text-lg text-foreground font-medium mt-4">
            Trailhead does the irrigation work and provides your receipts. You apply for the rebate through your city.
          </p>
        </div>
      </section>

      {/* City Selector Grid */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
            Find Rebates in Your City
          </h2>
          <p className="text-muted-foreground text-lg text-center mb-10 max-w-2xl mx-auto">
            Select your city to see available rebates, eligibility requirements, and how to apply.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CITIES.map((city) => (
              <Link key={city.slug} href={`/water-rebates/${city.slug}`} className="block">
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{city.name}, {city.state}</CardTitle>
                      <Badge variant="green">{city.badgeText}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-2">
                      {city.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="default" size="sm">
                      View {city.name} Rebates
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Slow the Flow Callout */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Slow the Flow — Free Sprinkler Evaluation</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">A free community resource from Resource Central</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {SLOW_THE_FLOW.description}
              </p>
              <ul className="flex flex-col gap-2 mb-4">
                {SLOW_THE_FLOW.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> {SLOW_THE_FLOW.note}
              </p>
            </CardContent>
            <CardFooter className="gap-3 flex-wrap">
              <a href={SLOW_THE_FLOW.signupUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  Sign Up for 2026
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
              <a href={SLOW_THE_FLOW.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Learn More
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary text-white text-xl font-bold">
                  {item.step}
                </div>
                <item.icon className="h-8 w-8 text-navy" />
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
```

**Step 2: Verify the page renders**

Run: `npm run dev` and navigate to `http://localhost:3000/water-rebates`
Expected: Page renders with banner, intro, 4 city cards, Slow the Flow callout, How It Works, and CTA strip.

**Step 3: Commit**

```bash
git add src/app/water-rebates/page.tsx
git commit -m "feat: add water rebates hub page with city selector"
```

---

## Task 4: Create the City Subpage Template (`/water-rebates/[slug]`)

**Files:**
- Create: `src/app/water-rebates/[slug]/page.tsx`

**Step 1: Create the dynamic city page**

Create `src/app/water-rebates/[slug]/page.tsx`. This page uses `generateStaticParams` to statically generate all four city pages at build time. It renders:

1. JSON-LD (breadcrumb + FAQ)
2. PageBanner with city name
3. Breadcrumb nav
4. Disclaimer notice
5. Rebate cards grid
6. How to Apply section
7. Additional Resources (Slow the Flow + city-specific)
8. FAQ accordion
9. CTAStrip

```typescript
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink, AlertTriangle, Check } from "lucide-react"
import { breadcrumbJsonLd, faqJsonLd, siteConfig } from "@/lib/seo"
import { CITIES, SLOW_THE_FLOW } from "@/lib/rebate-data"

export function generateStaticParams() {
  return CITIES.map((city) => ({ slug: city.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const city = CITIES.find((c) => c.slug === params.slug)
  if (!city) return {}
  return {
    title: `${city.name} Water Efficiency Rebates`,
    description: `Water efficiency rebates available for ${city.name}, ${city.state} residents. Smart controllers, efficient nozzles, drip conversions, and more. See amounts, eligibility, and how to apply.`,
    alternates: { canonical: `${siteConfig.url}/water-rebates/${city.slug}` },
  }
}

export default function CityRebatePage({ params }: { params: { slug: string } }) {
  const city = CITIES.find((c) => c.slug === params.slug)
  if (!city) notFound()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Water Rebates", url: `${siteConfig.url}/water-rebates` },
              { name: city.name, url: `${siteConfig.url}/water-rebates/${city.slug}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(city.faqs)),
        }}
      />

      <PageBanner
        title={`${city.name} Water Efficiency Rebates`}
        description={city.tagline}
      />

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <nav className="container-padding-x mx-auto max-w-7xl py-3 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/water-rebates" className="hover:text-primary transition-colors">Water Rebates</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{city.name}</span>
        </nav>
      </div>

      {/* Disclaimer */}
      <section className="bg-background">
        <div className="container-padding-x mx-auto max-w-7xl pt-8">
          <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Rebate amounts and availability are subject to change. Information last updated March 2026. Programs are first-come, first-served while funds are available.{" "}
              <a href={city.officialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                Visit {city.officialLabel} for the latest information
                <ExternalLink className="h-3 w-3 inline ml-1" />
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Rebate Cards */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Available Rebates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {city.rebates.map((rebate) => (
              <Card key={rebate.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-navy/10">
                        <rebate.icon className="h-5 w-5 text-navy" />
                      </div>
                      <CardTitle>{rebate.name}</CardTitle>
                    </div>
                    <Badge variant="green" className="shrink-0">{rebate.amount}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    {rebate.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {rebate.brands && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Approved brands:</span>
                      {rebate.brands.map((brand) => (
                        <Badge key={brand} variant="secondary" className="text-xs">{brand}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            How to Apply
          </h2>
          {city.howToApply.purchaseWindow && (
            <p className="text-center text-muted-foreground mb-6">
              <strong>Purchase window:</strong> {city.howToApply.purchaseWindow}
              {city.howToApply.submissionDeadline && (
                <> &middot; <strong>Deadline:</strong> {city.howToApply.submissionDeadline}</>
              )}
            </p>
          )}
          <ol className="flex flex-col gap-4">
            {city.howToApply.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <p className="text-foreground leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
          <div className="flex justify-center mt-8">
            <a href={city.applicationUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg">
                {city.applicationLabel}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Additional Resources
          </h2>

          {/* Slow the Flow */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Slow the Flow — Free Sprinkler Evaluation</CardTitle>
              {city.slowTheFlowRequired && (
                <Badge variant="default" className="w-fit">Required for {city.name} rebates</Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-3">
                {city.slowTheFlowNote}
              </p>
              <a href={SLOW_THE_FLOW.signupUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Sign Up at Resource Central
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* City-specific additional programs */}
          {city.additionalPrograms?.map((program) => (
            <Card key={program.name} className="mb-6">
              <CardHeader>
                <CardTitle>{program.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {program.description}
                </p>
                {program.url && (
                  <a href={program.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      Learn More
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Official city link */}
          <div className="text-center mt-8">
            <a href={city.officialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              Visit {city.officialLabel}
              <ExternalLink className="h-3 w-3 inline ml-1" />
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-4">
            {city.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group border border-border rounded-lg"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-foreground">
                  {faq.question}
                  <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    &#9662;
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
```

**Step 2: Verify all city pages render**

Run: `npm run dev` and check:
- `http://localhost:3000/water-rebates/erie`
- `http://localhost:3000/water-rebates/lafayette`
- `http://localhost:3000/water-rebates/louisville`
- `http://localhost:3000/water-rebates/longmont`

Expected: All four pages render with correct city-specific data.

**Step 3: Verify navigation active state**

Navigate to `/water-rebates/erie` and confirm "Water Rebates" in the header is highlighted with the active style.

**Step 4: Commit**

```bash
git add src/app/water-rebates/[slug]/page.tsx
git commit -m "feat: add city-specific water rebate pages for Erie, Lafayette, Louisville, Longmont"
```

---

## Task 5: Build and Final Verification

**Files:** None (verification only)

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors. All 5 water-rebates pages are statically generated.

**Step 2: Verify all pages in production mode**

Run: `npm run start` and check all pages:
- `/water-rebates` — hub with 4 city cards
- `/water-rebates/erie` — Erie rebates
- `/water-rebates/lafayette` — Lafayette rebates
- `/water-rebates/louisville` — Louisville rebates
- `/water-rebates/longmont` — Longmont rebates

Expected: All pages render correctly, nav links work, external links open in new tabs, FAQ accordions work.

**Step 3: Commit any fixes if needed, then final commit**

```bash
git add .
git commit -m "feat: complete water efficiency rebates pages"
```
