import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { WaterSavingsCalculator } from "@/components/sections/WaterSavingsCalculator"
import { FaqList } from "@/components/sections/FaqList"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig, reviewsJsonLd } from "@/lib/seo"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SplitSection } from "@/components/sections/SplitSection"
import { CheckList } from "@/components/sections/CheckList"
import { Testimonials } from "@/components/sections/Testimonials"
import { reviewsFor } from "@/lib/reviews"

export const metadata: Metadata = {
  title: "Water Efficiency Upgrades in Erie, CO",
  description:
    "Save water with smart controllers, MPR nozzles, drip irrigation, and system optimization. Serving Erie, Longmont, Louisville & Lafayette, CO.",
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
      "Yes. Erie, Longmont and Lafayette pay rebates on WaterSense controllers like the Rachio 3. Our Water Rebates page has the amounts and the forms for each city.",
  },
]

const EFFICIENCY_REVIEWS = reviewsFor("smart-controller", 3)

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
        description="Smart controllers, rotary nozzles and drip conversions that cut outdoor water use on Front Range clay."
        backgroundImage="/images/raised-bed-garden.jpg"
      />

      {/* ════════════════════════════════════════════
          1. RACHIO 3 SMART CONTROLLER
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/healthy-lawn-closeup.jpg", alt: "Healthy green lawn maintained with smart irrigation" }} imageSide="left">
            <div>
              <SectionHeader tagline="Save up to 30% on water use" taglineAsEyebrow title="Rachio 3 Smart Controller" description="Replaces your timer with a Wi-Fi controller that adjusts watering based on weather, soil, and plant needs. Control everything from your phone." align="left" className="mb-5" />
              <CheckList size="sm" className="mb-6" items={["Skips watering before rain, wind, or freeze", "Adjusts run times automatically each season", "EPA WaterSense certified, no subscription fees"]} />
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
                  Book Online
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
          </SplitSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          2. MPR NOZZLE RETROFIT
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/lawn-sprinkler-water.jpg", alt: "Sprinkler watering a well-maintained lawn" }} imageSide="right">
            <div>
              <SectionHeader tagline="30 to 50% less water per zone" taglineAsEyebrow title="MPR Nozzle Retrofit" description="Rotary nozzles that apply water at 1/4 the rate of standard spray heads. Water soaks in instead of running off, which matters most on slopes and clay." align="left" className="mb-5" />
              <CheckList size="sm" className="mb-6" items={["Even coverage across the whole zone", "Swap onto existing spray bodies, no trenching", "Great for clay soil and sloped yards"]} />
              <Link
                href="/book"
                className={buttonVariants({ size: "lg" })}
              >
                Book Online
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SplitSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          3. DRIP ZONE CONVERSION
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/sprinkler-installation.jpg", alt: "Drip irrigation system installation" }} imageSide="left">
            <div>
              <SectionHeader tagline="Up to 70% less water than spray heads" taglineAsEyebrow title="Drip Zone Conversion" description="Delivers water directly to each plant's root zone through low-pressure tubing. Drip runs about 90% efficient against 60 to 75% for spray heads, because nothing is thrown into the air to drift or evaporate." align="left" className="mb-5" />
              <CheckList size="sm" className="mb-6" items={["Low-pressure tubing runs directly to each plant", "Eliminates overspray, wind drift, and runoff", "Ideal for flower beds, shrubs, and gardens"]} />
              <Link
                href="/book"
                className={buttonVariants({ size: "lg" })}
              >
                Book Online
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SplitSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          4. YARD LAYOUT EVALUATION
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/sprinkler-spring.jpg", alt: "Sprinkler system being evaluated" }} imageSide="right">
            <div>
              <SectionHeader tagline="Find where your system wastes water" taglineAsEyebrow title="Yard Layout Evaluation" description="We walk your entire sprinkler system zone by zone to find wasted water — poor head spacing, overlapping zones, coverage gaps, and inefficient run times." align="left" className="mb-5" />
              <CheckList size="sm" className="mb-6" items={["Zone-by-zone coverage analysis", "Head spacing and arc adjustments", "Written recommendations for improvements"]} />
              <Link
                href="/book"
                className={buttonVariants({ size: "lg" })}
              >
                Book Online
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SplitSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          5. CHECK FOR LEAKS
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/sprinkler-repair.jpg", alt: "Irrigation system leak inspection" }} imageSide="left">
            <div>
              <SectionHeader tagline="Stop wasting water you can&apos;t see" taglineAsEyebrow title="Check for Leaks" description="Hidden leaks in your irrigation lines, valves, and connections waste water and can damage your property. We find and fix them before they become expensive problems." align="left" className="mb-5" />
              <CheckList size="sm" className="mb-6" items={["Full system pressure test", "Check all valves, lines, and connections", "Identify underground leaks before they cause damage"]} />
              <Link
                href="/book"
                className={buttonVariants({ size: "lg" })}
              >
                Book Online
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SplitSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WATER SAVINGS CALCULATOR
          ════════════════════════════════════════════ */}
      <WaterSavingsCalculator />

      {/* Reviews sit directly above the FAQ on every interior page. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(EFFICIENCY_REVIEWS)) }} />
      <Testimonials
        reviews={EFFICIENCY_REVIEWS}
        heading="What homeowners say about their upgrades"
        description="Google reviews from smart controller and efficiency customers."
        bg="cream"
        headingId="efficiency-reviews"
      />

      {/* ════════════════════════════════════════════
          FAQs
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Water efficiency questions" titleId="water-efficiency-faq" className="mb-10" />
          <FaqList faqs={WATER_EFFICIENCY_FAQS} itemBg="cream" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}

