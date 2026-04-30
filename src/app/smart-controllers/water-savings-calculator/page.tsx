import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { siteConfig, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo"
import { CalculatorClient } from "./calculator-client"

export const metadata: Metadata = {
  title: "Rachio Water Savings Calculator — Gallons & Dollars Saved Per Year",
  description:
    "Estimate how much water and money a Rachio 3 smart controller will save on your specific lawn. Based on EPA WaterSense and Rachio's published 20–30% reduction averages.",
  alternates: {
    canonical: `${siteConfig.url}/smart-controllers/water-savings-calculator`,
  },
}

const CALCULATOR_FAQS = [
  {
    question: "How does the water savings calculator work?",
    answer:
      "The calculator uses EPA WaterSense's published average outdoor water use for residential lawns (about 0.62 gallons per square foot per week during the watering season) and applies Rachio's documented 20–30% reduction range to estimate how much you'd save with a smart controller. Multiplying by an average Northern Colorado water rate gives a dollar estimate.",
  },
  {
    question: "How accurate are these savings estimates?",
    answer:
      "Estimates are based on industry averages, not your specific home. Actual savings depend on lawn size, soil type, slope, plant types, sun exposure, your current irrigation schedule, and your water utility's pricing tiers. Treat the result as a directional estimate, not a guaranteed savings amount.",
  },
  {
    question: "Where do these numbers come from?",
    answer:
      "EPA WaterSense publishes that an average American family's outdoor water use is about 30% of total water consumption — and that WaterSense-certified controllers reduce outdoor use by 15% on average, with smart controllers like the Rachio 3 typically delivering 20–30% reductions. Northern Colorado water rates average roughly $0.005–$0.010 per gallon depending on city and tier.",
  },
  {
    question: "Will I really pay back the install cost?",
    answer:
      "On a typical Front Range home with a moderate-to-large lawn, water bill savings often cover the installed cost of a Rachio 3 within 2–4 watering seasons. Adding a city utility rebate (Erie, Longmont, Lafayette) shortens the payback further. Confirm rebate eligibility directly with your city before counting on those numbers.",
  },
]

export default function WaterSavingsCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(CALCULATOR_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Smart Controllers", url: `${siteConfig.url}/smart-controllers` },
              {
                name: "Water Savings Calculator",
                url: `${siteConfig.url}/smart-controllers/water-savings-calculator`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Rachio Water Savings Calculator"
        description="Estimate the gallons and dollars a Rachio 3 saves on your specific lawn — based on EPA WaterSense and Rachio's published averages."
      />

      <CalculatorClient />

      {/* HOW IT WORKS */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            What this calculator estimates
          </h2>
          <ol className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
            <li>
              <strong className="text-foreground">1. Lawn size → baseline water use.</strong>{" "}
              EPA WaterSense uses an average of <strong>0.62 gallons / sq ft / week</strong> during the active watering season for cool-season turf in semi-arid climates like the Front Range.
            </li>
            <li>
              <strong className="text-foreground">2. Watering season → annual gallons.</strong>{" "}
              Northern Colorado&apos;s irrigation season runs roughly mid-April through mid-October — about 26 weeks.
            </li>
            <li>
              <strong className="text-foreground">3. Rachio reduction → savings.</strong>{" "}
              Rachio publishes a 20–30% reduction in outdoor water use for the Rachio 3. The calculator uses 25% as the midpoint.
            </li>
            <li>
              <strong className="text-foreground">4. Local water rate → dollars.</strong>{" "}
              We apply an estimated $0.008/gallon, which is mid-range for Front Range residential water tiers in 2026.
            </li>
          </ol>
          <p className="mt-6 text-xs text-muted-foreground italic">
            Sources: EPA WaterSense Outdoor Water Use Statistics, Rachio published efficiency data, and average 2026 Northern Colorado residential water rates.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Calculator FAQs
          </h2>
          <div className="flex flex-col gap-4">
            {CALCULATOR_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group border border-border rounded-lg bg-cream"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-foreground">
                  {faq.question}
                  <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    &#9662;
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
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
