import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Sun, Search, Snowflake, ArrowRight } from "lucide-react"
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
  description: `Three sprinkler visits a year in Erie, CO and the Front Range: spring turn-on, mid-season inspection, fall blowout with the date reserved in July. From $${SEASON_PASS_FROM} for up to 6 zones, billed per visit, nothing up front.`,
  alternates: { canonical: `${siteConfig.url}/season-pass` },
}

const VISIT_ICONS = [Sun, Search, Snowflake]
const VISIT_DETAILS = [
  "Pressurize the system, run every zone, adjust heads, fix small leaks, program the controller for spring.",
  "We look for coverage gaps, clogged nozzles and zones running long, fix what we can and tell you the rest.",
  "Compressed-air blowout of every zone before the first hard freeze. Your date is set in July.",
]

const FAQS: FaqItem[] = [
  {
    question: "How much is the Trailhead Season Pass?",
    answer: `From $${SEASON_PASS_FROM} per season for up to 6 zones. The spring turn-on is $145, the mid-season inspection is $145 and the fall blowout is $95, each billed after the visit. Each zone beyond the included count adds $${EXTRA_ZONE_PRICE} per visit.`,
  },
  {
    question: "What do I get that I wouldn't get booking each visit on its own?",
    answer:
      "Your blowout date reserved in July, three visits booked without you having to call, and one card on file instead of three invoices.",
  },
  {
    question: "When do I pay?",
    answer:
      "After each visit. We keep a card on file and charge it once the visit is done. Nothing is paid up front.",
  },
  {
    question: "What if a repair is needed during a visit?",
    answer:
      "Small fixes such as a head adjustment or nozzle are handled on the spot. Anything larger is quoted before work starts, at the same repair rates as any other customer, and there is no separate trip fee for a repair found on a pass visit.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes, any time. Nothing is charged until a visit is done, so cancelling just means no more visits go on the calendar.",
  },
  {
    question: "Can I buy just the turn-on and the blowout?",
    answer:
      "Yes. Book either one on its own at the same price. The pass is for people who want the July check too and don't want to think about scheduling. If you'd skip July anyway, book the two visits separately.",
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

      {/* Hero: same treatment as the homepage, with the calculator card in
          the frame so the price and the action are the first thing seen. */}
      <section className="relative" aria-labelledby="pass-heading">
        <Image
          src="/images/sprinkler-golden-hour.jpg"
          alt="Sprinkler running at sunset beside a boardwalk"
          fill
          priority
          sizes="100vw"
          quality={80}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/70 to-charcoal/40" aria-hidden="true" />
        <div className="relative container-padding-x mx-auto max-w-7xl pt-20 pb-14 md:pt-28 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            <div className="flex flex-col gap-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">Season Pass</p>
              <p className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.95]">
                Less time in the yard.<br />More time on the trail.
              </p>
              <h1 className="font-sans text-lg md:text-xl font-semibold text-white/95 leading-snug max-w-xl" style={{ letterSpacing: 0 }}>
                Spring sprinkler turn-on, a July check-up and the October blowout for Erie and Front Range homes, on one schedule we keep for you.
              </h1>
              <p className="text-base text-white/80 max-w-xl">
                About 150 blowouts land in the four weeks before the first freeze. Pass customers get their October date in July, before that rush. You pay after each visit, nothing up front.
              </p>
            </div>
            <SeasonPassCalculator ctaHref="/contact" ctaLabel="Reserve my season" />
          </div>
        </div>
      </section>

      {/* The three visits */}
      <section className="bg-background section-padding-y" aria-labelledby="visits-heading">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader
            tagline="What's included"
            taglineAsEyebrow
            title="Three visits, in the order the season needs them"
            titleId="visits-heading"
            align="left"
          />
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SEASON_PASS_VISITS.map((v, i) => {
              const Icon = VISIT_ICONS[i]
              return (
                <li key={v.key} className="flex flex-col gap-4 rounded-lg border border-border bg-cream p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="font-display text-4xl font-bold text-border">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{v.when}</p>
                    <h3 className="font-display text-2xl font-semibold text-navy mt-1">{v.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{VISIT_DETAILS[i]}</p>
                  <p className="mt-auto text-sm font-semibold text-primary-dark tabular-nums">
                    ${v.base} up to {v.includedZones} zones, +${EXTRA_ZONE_PRICE} per zone beyond
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Price table */}
      <section className="bg-navy text-white section-padding-y" aria-labelledby="table-heading">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
            <div className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">Price by zone count</p>
              <h2 id="table-heading" className="font-display text-4xl md:text-5xl font-bold text-white">
                What it costs, by zone count
              </h2>
              <p className="text-white/80 max-w-md">
                Each visit is charged after it&apos;s done, at the price in this table. Pick your zone count in the card above for your exact total. Not sure how many zones you have? Count the stations on your controller, or we&apos;ll count them on the first visit.
              </p>
              <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-light hover:text-white transition-colors w-fit">
                All service pricing <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="overflow-x-auto rounded-lg bg-white text-foreground">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-stone">
                    <th scope="col" className="px-4 py-3">Zones</th>
                    <th scope="col" className="px-4 py-3">Turn-on</th>
                    <th scope="col" className="px-4 py-3">Mid-season</th>
                    <th scope="col" className="px-4 py-3">Blowout</th>
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
                      <td className="px-4 py-3 font-display text-lg font-semibold text-navy">${row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
