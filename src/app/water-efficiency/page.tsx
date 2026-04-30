import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { WaterSavingsCalculator } from "@/components/sections/WaterSavingsCalculator"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ArrowRight } from "lucide-react"
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
      "Smart controllers like the Rachio 3 typically reduce outdoor water use by 20-30%. For a typical Northern Colorado home, that means 8,000-15,000 fewer gallons per year.",
  },
  {
    question: "What are MPR nozzles?",
    answer:
      "MPR (Matched Precipitation Rate) nozzles are rotary nozzles that apply water at about 1/4 the rate of standard spray heads. Water soaks in instead of running off, and every part of the zone gets even coverage.",
  },
  {
    question: "How long does a Rachio installation take?",
    answer:
      "About 30 minutes if your existing wiring is in good condition. We handle mounting, wiring, Wi-Fi setup, and zone programming.",
  },
  {
    question: "Can I combine multiple upgrades?",
    answer:
      "Yes. A smart controller plus MPR nozzles plus drip zones can reduce irrigation water use by 40-60%. Each upgrade targets a different source of waste.",
  },
  {
    question: "Are there rebates available for smart controllers?",
    answer:
      "Yes! Many local water utilities offer rebates for WaterSense-certified controllers like the Rachio 3. Check our Water Rebates page for programs in Erie, Longmont, Louisville, and Lafayette.",
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
        description="Save water, save money — we'll show you how."
      />

      {/* ════════════════════════════════════════════
          1. RACHIO 3 SMART CONTROLLER
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/healthy-lawn-closeup.jpg"
                  alt="Healthy green lawn maintained with smart irrigation"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="green" className="mb-3">
                Save up to 30% on water use
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Rachio 3 Smart Controller
              </h3>
              <p className="text-muted-foreground mb-5">
                Replaces your timer with a Wi-Fi controller that adjusts watering based on weather, soil, and plant needs. Control everything from your phone.
              </p>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>Skips watering before rain, wind, or freeze</FeatureItem>
                <FeatureItem>Adjusts run times automatically each season</FeatureItem>
                <FeatureItem>EPA WaterSense certified, no subscription fees</FeatureItem>
              </ul>
              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">$350</span>
                  <span className="text-muted-foreground text-sm">installed (8-zone)</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-foreground">$420</span>
                  <span className="text-muted-foreground text-sm">installed (16-zone)</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Includes controller and professional installation
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3 flex-wrap">
                <Link
                  href="/book"
                  className={buttonVariants({ size: "lg" })}
                >
                  Book Installation
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/smart-controllers/water-savings-calculator"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Estimate your water savings
                </Link>
                <Link
                  href="/smart-controllers"
                  className={buttonVariants({ variant: "link", size: "lg" })}
                >
                  Compare smart controllers &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          2. MPR NOZZLE RETROFIT
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/lawn-sprinkler-water.jpg"
                  alt="Sprinkler watering a well-maintained lawn"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="green" className="mb-3">
                30&ndash;50% less water per zone
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                MPR Nozzle Retrofit
              </h3>
              <p className="text-muted-foreground mb-5">
                Rotary nozzles that apply water at 1/4 the rate of standard spray heads. Water soaks in instead of running off — especially effective on slopes and clay soil.
              </p>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>Even coverage — no dry spots or puddles</FeatureItem>
                <FeatureItem>Swap onto existing spray bodies, no trenching</FeatureItem>
                <FeatureItem>Great for clay soil and sloped yards</FeatureItem>
              </ul>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg" })}
              >
                Request an Estimate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          3. DRIP ZONE CONVERSION
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-installation.jpg"
                  alt="Drip irrigation system installation"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="green" className="mb-3">
                Up to 70% less water than spray heads
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Drip Zone Conversion
              </h3>
              <p className="text-muted-foreground mb-5">
                Delivers water directly to each plant&apos;s root zone through low-pressure tubing. Drip systems are about 90% efficient vs. 60-75% for spray heads — no overspray, no evaporation.
              </p>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>Low-pressure tubing runs directly to each plant</FeatureItem>
                <FeatureItem>Eliminates overspray, wind drift, and runoff</FeatureItem>
                <FeatureItem>Ideal for flower beds, shrubs, and gardens</FeatureItem>
              </ul>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg" })}
              >
                Request an Estimate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          4. YARD LAYOUT EVALUATION
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-spring.jpg"
                  alt="Sprinkler system being evaluated"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Find where your system wastes water
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Yard Layout Evaluation
              </h3>
              <p className="text-muted-foreground mb-5">
                We walk your entire sprinkler system zone by zone to find wasted water — poor head spacing, overlapping zones, coverage gaps, and inefficient run times.
              </p>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>Zone-by-zone coverage analysis</FeatureItem>
                <FeatureItem>Head spacing and arc adjustments</FeatureItem>
                <FeatureItem>Written recommendations for improvements</FeatureItem>
              </ul>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg" })}
              >
                Request an Estimate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          5. CHECK FOR LEAKS
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-repair.jpg"
                  alt="Irrigation system leak inspection"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Stop wasting water you can&apos;t see
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Check for Leaks
              </h3>
              <p className="text-muted-foreground mb-5">
                Hidden leaks in your irrigation lines, valves, and connections waste water and can damage your property. We find and fix them before they become expensive problems.
              </p>
              <ul className="flex flex-col gap-2.5 mb-6">
                <FeatureItem>Full system pressure test</FeatureItem>
                <FeatureItem>Check all valves, lines, and connections</FeatureItem>
                <FeatureItem>Identify underground leaks before they cause damage</FeatureItem>
              </ul>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg" })}
              >
                Request an Estimate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WATER SAVINGS CALCULATOR
          ════════════════════════════════════════════ */}
      <WaterSavingsCalculator />

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
