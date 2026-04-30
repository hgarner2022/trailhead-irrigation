import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { siteConfig, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo"
import { CalculatorClient } from "./calculator-client"

export const metadata: Metadata = {
  title: "Rachio Rebate Calculator — Net Cost by City & Zone Count",
  description:
    "Calculate your net cost for a professionally installed Rachio 3 smart controller in Erie, Longmont, Louisville, Lafayette, or Firestone. Includes every utility rebate that applies in your city.",
  alternates: {
    canonical: `${siteConfig.url}/smart-controllers/rachio-rebate-calculator`,
  },
}

const CALCULATOR_FAQS = [
  {
    question: "How accurate is the Rachio rebate calculator?",
    answer:
      "The calculator uses Trailhead's current installed pricing ($350 for 8-zone, $420 for 16-zone) and the published utility rebate amounts for each Northern Colorado city. Final rebate amounts can vary based on your utility account status, eligibility, and program funding. Treat the result as a strong estimate, not a binding quote.",
  },
  {
    question: "Why is Louisville showing as $0 net cost?",
    answer:
      "Louisville offers a free Rachio 3 install through Resource Central's Slow the Flow program. Slots are limited and fill quickly each season. If you don't want to wait for a free-install slot, Trailhead can still do a paid install at standard pricing.",
  },
  {
    question: "Can I combine multiple rebates?",
    answer:
      "Yes — and you should. The calculator already stacks the utility rebate, any bonus rebate (like Longmont's Slow the Flow bonus), and Rachio's manufacturer rebate. You'll claim them separately: Trailhead provides itemized receipts for the utility rebate, and you submit Rachio's rebate via their website.",
  },
]

export default function RachioRebateCalculatorPage() {
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
                name: "Rachio Rebate Calculator",
                url: `${siteConfig.url}/smart-controllers/rachio-rebate-calculator`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Rachio Rebate Calculator"
        description="See your real net cost for a Rachio 3 — installed and rebated — in any Northern Colorado city."
      />

      <CalculatorClient />

      {/* HOW IT WORKS */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            How the Calculator Works
          </h2>
          <ol className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
            <li>
              <strong className="text-foreground">1. Trailhead installs your Rachio.</strong>{" "}
              We bring the controller, mount it, wire it to your existing valves, and set up the app and Wi-Fi. Standard install pricing: $350 (8-zone) or $420 (16-zone).
            </li>
            <li>
              <strong className="text-foreground">2. We give you itemized receipts.</strong>{" "}
              Make, model, serial number, install date — everything your utility rebate program requires.
            </li>
            <li>
              <strong className="text-foreground">3. You apply for the rebate.</strong>{" "}
              Most cities credit the rebate to your water bill within one billing cycle. Rachio&apos;s manufacturer rebate ($50 typical) is applied for separately on rachio.com/rebates.
            </li>
            <li>
              <strong className="text-foreground">4. Net cost is what you actually pay.</strong>{" "}
              The result above is the install minus every rebate you&apos;re eligible for.
            </li>
          </ol>
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
