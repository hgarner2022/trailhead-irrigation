import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { WaterSavingsCalculator } from "@/components/sections/WaterSavingsCalculator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  CheckCircle2,
  ArrowRight,
  Phone,
  Droplets,
  LayoutGrid,
  Wifi,
  Cpu,
} from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title:
    "Water Efficiency Upgrades | Smart Irrigation for Erie, Longmont, Louisville & Lafayette",
  description:
    "Save water and money with smart controllers, MPR nozzles, drip irrigation, and system optimization. Serving Erie, Longmont, Louisville & Lafayette, CO.",
  alternates: { canonical: `${siteConfig.url}/water-efficiency` },
}

const WATER_EFFICIENCY_FAQS = [
  {
    question: "How much water can a smart controller save?",
    answer:
      "Smart controllers like the Rachio 3 typically save 20-30% on irrigation water use. The EPA WaterSense program reports average savings of 32%. For a typical Northern Colorado home, that translates to 8,000-15,000 gallons per year.",
  },
  {
    question: "What are MPR nozzles and why are they more efficient?",
    answer:
      'MPR (Matched Precipitation Rate) nozzles are rotary multi-stream nozzles that apply water at about 1/4 the rate of standard spray nozzles \u2014 roughly 0.4 inches per hour. This slower application gives water time to soak in instead of running off, and the matched precipitation ensures every part of the zone gets the same amount of water regardless of the arc or radius.',
  },
  {
    question: "How long does a Rachio installation take?",
    answer:
      "A typical Rachio smart controller installation takes about 30 minutes if your existing wiring is in good condition. We handle everything \u2014 mounting, wiring, Wi-Fi setup, and programming your zones.",
  },
  {
    question: "Do I need a system inspection before getting upgrades?",
    answer:
      "We recommend it. A system inspection ($110, or free with your spring turn-on) lets us evaluate your entire system and recommend which upgrades will deliver the biggest savings for your specific property. Plus, every inspection earns $50 off any water efficiency install.",
  },
  {
    question: "Can I combine multiple upgrades for bigger savings?",
    answer:
      "Absolutely. A smart controller plus MPR nozzles plus drip zones on your garden beds can reduce irrigation water use by 40-60%. The savings compound because each upgrade targets a different source of waste.",
  },
  {
    question: "Are there rebates available for smart controllers?",
    answer:
      "Yes! Many local water utilities offer rebates for WaterSense-certified smart controllers like the Rachio 3. Check the Rachio rebates page to search by your zip code, and visit our Water Rebates page for additional programs in Erie, Longmont, Louisville, and Lafayette.",
  },
]

export default function WaterEfficiencyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(WATER_EFFICIENCY_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Water Efficiency",
                url: `${siteConfig.url}/water-efficiency`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Water Efficiency Upgrades"
        description="Save water, save money \u2014 upgrade your irrigation system with proven technology."
      />

      {/* ════════════════════════════════════════════
          INTRO + INSPECTION CALLOUT
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Northern Colorado&apos;s tiered water rates mean every wasted gallon
              costs more than the last. The right upgrades pay for themselves
              through lower water bills &mdash; and a healthier lawn that uses
              only what it needs.
            </p>
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl px-6 py-4">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-foreground">
                  Start with a System Inspection &mdash;{" "}
                  <span className="text-primary">$110</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Free with spring turn-on &bull; Earns{" "}
                  <strong className="text-foreground">$50 off</strong> any water
                  efficiency install
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          UPGRADE 1: RACHIO 3 SMART CONTROLLER
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            {/* Image placeholder */}
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-navy/10 to-primary/10 flex items-center justify-center">
                <Wifi className="w-16 h-16 text-primary/30" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <Badge variant="green" className="mb-3">
                Save up to 30%
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Rachio 3 Smart Controller
              </h3>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>
                  Weather Intelligence (rain/wind/freeze skip)
                </FeatureItem>
                <FeatureItem>Seasonal auto-adjust</FeatureItem>
                <FeatureItem>App control from anywhere</FeatureItem>
                <FeatureItem>EPA WaterSense certified</FeatureItem>
                <FeatureItem>Works with Alexa &amp; Google Home</FeatureItem>
                <FeatureItem>No monthly fees</FeatureItem>
              </ul>
              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    $350
                  </span>
                  <span className="text-muted-foreground text-sm">
                    installed (8-zone)
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-foreground">
                    $400
                  </span>
                  <span className="text-muted-foreground text-sm">
                    installed (16-zone)
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Includes controller and professional installation
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link href="/contact">
                  <Button size="lg">
                    Book Installation
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="link" size="lg" asChild>
                  <a
                    href="https://www.rachio.com/rebates/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Check Rachio Rebates &rarr;
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          UPGRADE 2: MPR NOZZLE RETROFIT
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            {/* Image placeholder */}
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-navy/10 to-primary/10 flex items-center justify-center">
                <Droplets className="w-16 h-16 text-primary/30" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <Badge variant="green" className="mb-3">
                30&ndash;50% More Efficient
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                MPR Nozzle Retrofit
              </h3>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>
                  Matched precipitation across all arcs
                </FeatureItem>
                <FeatureItem>
                  Slower application prevents runoff
                </FeatureItem>
                <FeatureItem>Works with existing spray bodies</FeatureItem>
                <FeatureItem>Ideal for slopes and clay soil</FeatureItem>
              </ul>
              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    $80&ndash;120
                  </span>
                  <span className="text-muted-foreground text-sm">
                    per zone (typical 8&ndash;12 nozzles + labor)
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Materials not included. Final price based on system inspection.
              </p>
              <Link href="/contact">
                <Button size="lg">
                  Request Estimate
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          UPGRADE 3 & 4: 2-UP CARD GRID
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drip Zone Conversion */}
            <Card className="relative overflow-hidden border-border hover:border-primary/30 transition-colors">
              <CardContent className="flex flex-col gap-4 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                    <Droplets className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Drip Zone Conversion
                  </h3>
                </div>
                <Badge variant="green" className="w-fit">
                  Up to 70% Savings
                </Badge>
                <ul className="flex flex-col gap-2.5">
                  <FeatureItem>
                    Pressure reducer for precise delivery
                  </FeatureItem>
                  <FeatureItem>
                    1/4&quot; drip tubing direct to each plant
                  </FeatureItem>
                  <FeatureItem>
                    Eliminates overspray and evaporation
                  </FeatureItem>
                  <FeatureItem>
                    ~90% efficiency vs 60&ndash;75% for spray
                  </FeatureItem>
                </ul>
                <div className="mt-auto pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      $250&ndash;500
                    </span>
                    <span className="text-muted-foreground text-sm">
                      per zone
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Materials not included. Final price based on system
                    inspection.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Yard Layout Evaluation */}
            <Card className="relative overflow-hidden border-border hover:border-primary/30 transition-colors">
              <CardContent className="flex flex-col gap-4 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Yard Layout Evaluation
                  </h3>
                </div>
                <Badge variant="outline" className="w-fit">
                  Optimize Your System
                </Badge>
                <ul className="flex flex-col gap-2.5">
                  <FeatureItem>Zone coverage analysis</FeatureItem>
                  <FeatureItem>
                    Head spacing and arc adjustments
                  </FeatureItem>
                  <FeatureItem>
                    Identify dead zones and overlap
                  </FeatureItem>
                  <FeatureItem>
                    Efficiency improvement recommendations
                  </FeatureItem>
                </ul>
                <div className="mt-auto pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      $110
                    </span>
                    <span className="text-muted-foreground text-sm">
                      (free with spring turn-on)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Inspection earns $50 off any water efficiency install
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WATER SAVINGS CALCULATOR
          ════════════════════════════════════════════ */}
      <WaterSavingsCalculator />

      {/* ════════════════════════════════════════════
          SYSTEM INSPECTION CTA
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl text-center">
          <div className="bg-background rounded-2xl border border-border p-8 md:p-12">
            <Badge variant="outline" className="mb-4">
              Where to Start
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              System Inspection &amp; Efficiency Evaluation
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-foreground">$110</span>
                <p className="text-sm text-muted-foreground">standalone</p>
              </div>
              <span className="hidden sm:block text-2xl text-muted-foreground">
                |
              </span>
              <div className="text-center">
                <span className="text-4xl font-bold text-success">Free</span>
                <p className="text-sm text-muted-foreground">
                  with spring turn-on
                </p>
              </div>
            </div>
            <p className="text-primary font-semibold mb-6">
              $50 off any water efficiency install
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <Button size="lg">
                  Schedule an Inspection
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" asChild>
                <a href="tel:9706927270">
                  <Phone className="w-4 h-4" />
                  Call (970) 692-7270
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FAQs
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {WATER_EFFICIENCY_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group border border-border rounded-lg hover:border-primary/20 transition-colors"
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

/* ─── Helper Components ─── */

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  )
}
