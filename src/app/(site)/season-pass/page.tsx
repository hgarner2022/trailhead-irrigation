import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Sun, Search, Snowflake, ArrowRight } from "lucide-react"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { PassReservedNotice } from "@/components/sections/PassReservedNotice"
import { SeasonPassCalculator } from "@/components/sections/SeasonPassCalculator"
import { FaqList, type FaqItem } from "@/components/sections/FaqList"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { breadcrumbJsonLd, faqJsonLd, siteConfig, reviewsJsonLd } from "@/lib/seo"
import { Testimonials } from "@/components/sections/Testimonials"
import { reviewsFor } from "@/lib/reviews"
import { checkoutEnabled } from "@/lib/flags"
import {
  EXTRA_ZONE_PRICE,
  INSPECTION_FROM,
  SEASON_PASS_ADD_ON,
  SEASON_PASS_FROM,
  SEASON_PASS_TABLE,
  SEASON_PASS_VISITS,
} from "@/lib/season-pass"

export const metadata: Metadata = {
  title: "Sprinkler Season Pass: Turn-On and Blowout, Erie CO",
  description: `Spring turn-on and fall blowout on one schedule, from $${SEASON_PASS_FROM} for up to 6 zones, with a July inspection if you want it. You pick your days when you reserve. You pay after each visit.`,
  alternates: { canonical: `${siteConfig.url}/season-pass` },
}

const VISIT_ICONS = [Sun, Search, Snowflake]
const VISIT_DETAILS = [
  "Pressurize the system, run every zone, adjust heads, fix small leaks, program the controller for spring.",
  "We look for coverage gaps, clogged nozzles and zones running long, fix what we can and tell you the rest.",
  "Compressed-air blowout of every zone before the first hard freeze. You pick your date when you reserve.",
]

const FAQS: FaqItem[] = [
  {
    question: "How much is the Trailhead Season Pass?",
    answer: `From $${SEASON_PASS_FROM} per season for up to 6 zones: the spring turn-on is $145 and the fall blowout is $95, each billed after the visit. A mid-season inspection in July can be added for $${INSPECTION_FROM}. Each zone beyond the included count adds $${EXTRA_ZONE_PRICE} per visit.`,
  },
  {
    question: "What do I get that I wouldn't get booking each visit on its own?",
    answer:
      "You pick both days when you reserve, so you never have to call, and one card covers every visit.",
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
    question: "What is the mid-season inspection, and do I need it?",
    answer:
      "In July we run every zone and look for coverage gaps, clogged nozzles and zones that run long. We adjust what we find. The July inspection is an add-on. Add it at checkout, or later by replying to any of our emails. You pay after the visit, like the others.",
  },
  {
    question: "Which cities can get the Season Pass?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, at the same price. Reserve by contacting us; we confirm your zone count on the first visit and set the dates from there.",
  },
]

const PASS_REVIEWS = reviewsFor("value", 3)

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
          "Two sprinkler visits a year on one schedule, the spring turn-on and system check and the fall blowout and winterization with a reserved date, with a mid-season inspection and tune-up as an optional add-on.",
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
      <PassReservedNotice />

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
              <p className="order-first text-xs font-semibold uppercase tracking-widest text-primary-light">Season Pass</p>
              <h1 className="font-sans text-lg md:text-xl font-semibold text-white/95 leading-snug max-w-xl" style={{ letterSpacing: 0 }}>
                Sprinkler Season Pass in Erie, CO: spring turn-on and fall blowout on one schedule we keep for you, with a July check if you want it.
              </h1>
              <p className="order-first font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.95]">
                Less time in the yard.<br />More time on the trail.
              </p>
              <p className="text-base text-white/80 max-w-xl">
                Blowouts bunch up in the weeks before the first freeze. Pass customers pick their October date when they reserve, ahead of that rush. You pay after each visit.
              </p>
            </div>
            <SeasonPassCalculator ctaHref={checkoutEnabled() ? "/season-pass/checkout" : "/contact"} carryZones={checkoutEnabled()} ctaLabel="Reserve my season" />
          </div>
        </div>
      </section>

      {/* The two visits and the add-on */}
      <section className="bg-background section-padding-y" aria-labelledby="visits-heading">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader
            tagline="What's included"
            taglineAsEyebrow
            title="Two visits, and a July check if you want it"
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
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{v.key === SEASON_PASS_ADD_ON.key ? `${v.when} · Optional add-on` : v.when}</p>
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
              <SectionHeader
                tagline="Price by zone count"
                taglineAsEyebrow
                title="What it costs, by zone count"
                titleId="table-heading"
                description="Each visit is charged after it's done, at the price in this table. Pick your zone count in the card above for your exact total. Not sure how many zones you have? Count the stations on your controller, or we'll count them on the first visit."
                align="left"
                tone="dark"
              />
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
                    <th scope="col" className="px-4 py-3">Blowout</th>
                    <th scope="col" className="px-4 py-3">Season Pass</th>
                    <th scope="col" className="px-4 py-3">With July inspection</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {SEASON_PASS_TABLE.map((row) => (
                    <tr key={row.zones} className="border-t border-border">
                      <th scope="row" className="px-4 py-3 font-medium text-foreground text-left">
                        {row.zones === 6 ? "Up to 6" : row.zones}
                      </th>
                      <td className="px-4 py-3">${row.turnOn}</td>
                      <td className="px-4 py-3">${row.blowout}</td>
                      <td className="px-4 py-3 font-display text-lg font-semibold text-navy">${row.total}</td>
                      <td className="px-4 py-3">${row.totalWithInspection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews sit directly above the FAQ on every interior page. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(PASS_REVIEWS)) }} />
      <Testimonials
        reviews={PASS_REVIEWS}
        heading="What homeowners say about our seasonal visits"
        description="Google reviews from turn-on and blowout customers."
        bg="cream"
        headingId="pass-reviews"
      />

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
