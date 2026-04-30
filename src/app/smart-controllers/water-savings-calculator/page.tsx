import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { siteConfig, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo"
import { CalculatorClient } from "./calculator-client"

export const metadata: Metadata = {
  title: "Rachio Water Savings Calculator — Gallons & Dollars Saved Per Year",
  description:
    "Estimate how much water and money a Rachio 3 smart controller could save on your specific lawn. Uses EPA WaterSense averages and conservative smart-controller efficiency assumptions — directional estimate, not a guarantee.",
  alternates: {
    canonical: `${siteConfig.url}/smart-controllers/water-savings-calculator`,
  },
}

const CALCULATOR_FAQS = [
  {
    question: "How does the water savings calculator work?",
    answer:
      "It multiplies your lawn size by an industry-average gallons-per-square-foot-per-week figure (about 0.62 gal/sq ft/week for cool-season turf in semi-arid climates per EPA WaterSense) by a typical 26-week Northern Colorado watering season, then applies a conservative 20% efficiency reduction (the lower end of EPA WaterSense's published range for smart controllers). The dollar estimate uses a mid-tier Front Range municipal water rate.",
  },
  {
    question: "Are these Rachio's published numbers?",
    answer:
      "No. The percentages and gallon figures used here are general industry averages from EPA WaterSense and Cooperative Extension data — they're not pulled from Rachio's own marketing materials. The Rachio 3 is WaterSense-certified, so it falls within this efficiency range, but Trailhead is not citing Rachio-specific savings claims.",
  },
  {
    question: "How accurate is this for my specific home?",
    answer:
      "Treat it as a directional estimate, not a quote. Actual savings depend on your lawn size, soil type, slope, sun exposure, plant mix, current irrigation schedule, your utility's specific pricing tiers, and how aggressively your previous controller was watering. Two homes with identical lawns can see very different savings.",
  },
  {
    question: "Where do the water rate numbers come from?",
    answer:
      "The calculator uses approximately $0.008 per gallon, which is a rough mid-tier residential rate observed across Northern Colorado municipalities in 2026. Actual rates vary by city, tier, season, and whether you're inside an HOA-billed boundary. Check your last summer water bill for your real per-gallon rate to refine the estimate.",
  },
  {
    question: "Will I really pay back the install cost?",
    answer:
      "On a typical Front Range home with a moderate-to-large lawn, water-bill savings can often cover the installed cost of a Rachio 3 within a few watering seasons. Adding a city utility rebate (Erie, Longmont, Lafayette) shortens the payback. Confirm rebate eligibility directly with your city — Trailhead does not administer rebates.",
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
        description="Estimate gallons and dollars a smart controller could save on your lawn. Uses EPA WaterSense industry averages — directional estimate, not a guarantee."
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
              <strong className="text-foreground">3. Smart-controller reduction → savings.</strong>{" "}
              EPA WaterSense&apos;s published range for smart/weather-based controllers is roughly 15–30%. The calculator applies <strong>20%</strong> — the conservative end of that range — to keep the estimate defensible. Note: this is a general WaterSense figure, not a number Rachio publishes specifically.
            </li>
            <li>
              <strong className="text-foreground">4. Local water rate → dollars.</strong>{" "}
              We apply ~$0.008 per gallon, which is a rough mid-tier residential rate observed across Front Range municipalities in 2026. Your actual rate may differ.
            </li>
          </ol>
          <p className="mt-6 text-xs text-muted-foreground italic">
            Sources: EPA WaterSense Outdoor Water Use Statistics &amp; smart-controller efficiency range, average 2026 Northern Colorado residential water rates. Not pulled from Rachio&apos;s own marketing data.
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
