import type { Metadata } from "next"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SeasonPassCalculator } from "@/components/sections/SeasonPassCalculator"
import { FaqList, type FaqItem } from "@/components/sections/FaqList"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { breadcrumbJsonLd, faqJsonLd, siteConfig } from "@/lib/seo"
import {
  EXTRA_ZONE_PRICE,
  SEASON_PASS_FROM,
  SEASON_PASS_TABLE,
  SEASON_PASS_VISITS,
} from "@/lib/season-pass"

export const metadata: Metadata = {
  title: "Season Pass: Sprinkler Turn-On, Mid-Season Check & Blowout",
  description: `Three sprinkler visits a year in Erie, CO and the Front Range: spring turn-on, mid-season inspection, fall blowout with the date reserved. From $${SEASON_PASS_FROM} for up to 6 zones, no discount, no up-front payment.`,
  alternates: { canonical: `${siteConfig.url}/season-pass` },
}

const FAQS: FaqItem[] = [
  {
    question: "How much is the Trailhead Season Pass?",
    answer: `From $${SEASON_PASS_FROM} per season for up to 6 zones, which is the published price of the three visits added together: spring turn-on ($145), mid-season inspection ($145) and fall blowout ($95). Each zone beyond the included count adds $${EXTRA_ZONE_PRICE} per visit.`,
  },
  {
    question: "Is there a discount for buying all three visits?",
    answer:
      "No. The pass costs the same as booking the three visits separately. What it adds is a reserved October blowout date, a schedule we keep for you, and one card on file instead of three invoices.",
  },
  {
    question: "When do I pay?",
    answer:
      "After each visit. A card is kept on file through our scheduling system and charged when the visit is complete, so nothing is paid up front and nothing is paid for a visit that has not happened.",
  },
  {
    question: "What if a repair is needed during a visit?",
    answer:
      "Small fixes such as a head adjustment or nozzle are handled on the spot. Anything larger is quoted before work starts, at the same repair rates as any other customer, and there is no separate trip fee for a repair found on a pass visit.",
  },
  {
    question: "Which cities can get the Season Pass?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, at the same price. Reserve by contacting us; we confirm your zone count on the first visit and set the three dates from there.",
  },
]

export default function SeasonPassPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", url: siteConfig.url },
        { name: "Season Pass", url: `${siteConfig.url}/season-pass` },
      ]),
      {
        "@type": "Service",
        "@id": `${siteConfig.url}/season-pass#service`,
        name: "Sprinkler Season Pass",
        serviceType: "Seasonal sprinkler maintenance plan",
        description:
          "Three sprinkler visits a year: spring turn-on and system check, mid-season inspection and tune-up, fall blowout and winterization with a reserved date.",
        provider: { "@id": `${siteConfig.url}/#business` },
        areaServed: siteConfig.serviceArea.map((name) => ({ "@type": "Place", name })),
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: SEASON_PASS_FROM,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: SEASON_PASS_FROM,
            priceCurrency: "USD",
            description: `Up to 6 zones; $${EXTRA_ZONE_PRICE} per additional zone per visit`,
          },
          url: `${siteConfig.url}/season-pass`,
          availability: "https://schema.org/InStock",
        },
      },
      faqJsonLd(FAQS),
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PageBanner
        title="Season Pass"
        description="Spring turn-on, mid-season check and fall blowout, on a schedule we keep for you. Same published price as booking each visit, with your October date reserved."
        backgroundImage="/images/sprinkler-golden-hour.jpg"
      />

      <section className="bg-background section-padding-y" aria-labelledby="pass-heading">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="flex flex-col gap-8">
              <SectionHeader
                tagline="Three visits, one schedule"
                taglineAsEyebrow
                title="Less time in the yard. More time on the trail."
                titleId="pass-heading"
                description="About 150 blowouts happen in the four weeks before the first freeze. Pass customers are scheduled first, in July, and never have to remember to call."
                align="left"
              />
              <ol className="flex flex-col gap-4">
                {SEASON_PASS_VISITS.map((v, i) => (
                  <li key={v.key} className="flex items-start gap-4 rounded-lg border border-border bg-cream p-5">
                    <span className="font-display text-3xl font-bold text-primary leading-none">{i + 1}</span>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-navy">{v.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {v.when} &middot; ${v.base} for up to {v.includedZones} zones, +${EXTRA_ZONE_PRICE} per additional zone
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <SeasonPassCalculator />
          </div>
        </div>
      </section>

      <section className="bg-cream section-padding-y" aria-labelledby="table-heading">
        <div className="container-padding-x mx-auto max-w-4xl flex flex-col gap-8">
          <SectionHeader
            title="Season Pass price by zone count"
            titleId="table-heading"
            description="No discount and no markup: the pass is the three published visit prices added up."
          />
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3">Zones</th>
                  <th scope="col" className="px-4 py-3">Spring turn-on</th>
                  <th scope="col" className="px-4 py-3">Mid-season</th>
                  <th scope="col" className="px-4 py-3">Fall blowout</th>
                  <th scope="col" className="px-4 py-3">Season Pass</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {SEASON_PASS_TABLE.map((row) => (
                  <tr key={row.zones} className="border-t border-border">
                    <th scope="row" className="px-4 py-3 font-medium text-foreground text-left">
                      {row.zones === 6 ? "Up to 6" : row.zones}
                    </th>
                    <td className="px-4 py-3">${row.turnOn}</td>
                    <td className="px-4 py-3">${row.inspection}</td>
                    <td className="px-4 py-3">${row.blowout}</td>
                    <td className="px-4 py-3 font-semibold text-navy">${row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Add at the regular price: Rachio 3 smart controller install ($350 for 8 zones, $425 for 16), water-efficient nozzle upgrade ($400), drip conversions (quoted). See{" "}
            <Link href="/pricing" className="text-primary hover:underline">all pricing</Link>.
          </p>
        </div>
      </section>

      <section className="bg-background section-padding-y" aria-labelledby="pass-faq-heading">
        <div className="container-padding-x mx-auto max-w-3xl flex flex-col gap-10">
          <SectionHeader title="Season Pass questions" titleId="pass-faq-heading" />
          <FaqList faqs={FAQS} itemBg="cream" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
