import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { Testimonials } from "@/components/sections/Testimonials"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { CITY_DATA } from "@/lib/city-data"
import { faqJsonLd, reviewsJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { reviewsFor } from "@/lib/reviews"

export const metadata: Metadata = {
  title: "Sprinkler Repair in Erie, CO & the Front Range",
  description:
    "Sprinkler repair for $145 a visit, small fixes included. Broken heads, stuck valves, leaks and dead zones diagnosed on the first visit. Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-repair` },
}

/**
 * Sprinkler repair landing page. "Sprinkler repair" is the biggest click
 * earner in Search Console (111 clicks / 5,289 impressions over six months,
 * "sprinkler repair erie co" alone at 14.6% CTR), and until Nov 2026 the
 * nav sent that intent to the generic /services overview.
 *
 * Facts: the $145 visit and what it covers come from Jobber's "Sprinkler
 * Repair Assessment" service. The $150/hour labor rate is Hannah's number
 * (Nov 1, 2026). The problem list and the cost ranges come from
 * /blog/signs-irrigation-system-needs-repair. The "no PVC to spray heads"
 * rule comes from the /services definition block.
 *
 * House style: no em dashes.
 */

const PROBLEMS = [
  {
    title: "Brown patches in a green lawn",
    body: "Usually a clogged nozzle, a head that sank below grade, or a head knocked off aim. Sometimes a cracked lateral losing pressure before the last heads on the zone.",
    cost: "$50 to $150 for a head or nozzle, $200 to $400 if a line is cracked underground",
  },
  {
    title: "A head that won't pop up",
    body: "Dirt in the riser or a worn spring. On older systems, a failing valve diaphragm that kills pressure to the whole zone.",
    cost: "$15 to $30 per head, $100 to $200 if the valve needs rebuilding",
  },
  {
    title: "A water bill that jumped",
    body: "The one people ignore longest. An underground leak or a stuck valve running a zone all night wastes thousands of gallons before anyone notices.",
    cost: "$100 to $200 for a stuck valve, $200 to $500 to find and fix an underground leak",
  },
  {
    title: "Puddles that never dry out",
    body: "A cracked pipe, a leaking valve, or a head that doesn't seal when the zone shuts off.",
    cost: "$100 to $300 depending on what's leaking",
  },
  {
    title: "Sputtering or uneven spray",
    body: "Debris in the nozzle or filter screen. Sometimes a partly closed valve, or rotors and sprays mixed on one zone.",
    cost: "Often under $50, $75 to $150 if a pressure regulator is needed",
  },
  {
    title: "Heads spraying the sidewalk",
    body: "Bumped by the mower, the plow, or foot traffic. Or the original install used heads that throw too far for the space.",
    cost: "$50 to $100 to dial everything in, a few dollars a head for the right nozzles",
  },
]

const REPAIR_FAQS = [
  {
    question: "How much does sprinkler repair cost?",
    answer:
      "A repair visit is $145. That covers the diagnosis and small fixes done on the spot, like a head, a nozzle or an adjustment. Anything bigger is priced before we start, at $150 an hour plus parts. Most repairs are finished in one visit.",
  },
  {
    question: "What happens on a repair visit?",
    answer:
      "We run every zone, find the problem and fix what can be fixed in the visit. If a repair needs parts we don't carry or more time, you get a price before any of that work starts. You decide.",
  },
  {
    question: "Can you find an underground leak?",
    answer:
      "Yes. A soggy spot that never dries, a zone with weak pressure at the far end, or a water bill that jumped are the usual signs. Finding and repairing an underground leak typically runs $200 to $500.",
  },
  {
    question: "Do you work on all sprinkler brands?",
    answer:
      "Yes. Hunter, Rain Bird, Toro, Orbit and the rest. Parts for the common heads and valves are on the truck. One exception: we don't service systems with PVC pipe run straight to the spray heads.",
  },
  {
    question: "Do you fix controllers and wiring?",
    answer:
      "Yes. A controller that lost its program, a zone that won't come on from the controller, and broken or chewed valve wires are all repair-visit work.",
  },
  {
    question: "Is there a trip fee or a separate diagnostic fee?",
    answer:
      "No. The $145 visit is the diagnosis, and small fixes during it are included. There is no separate trip charge.",
  },
  {
    question: "Which cities do you serve for sprinkler repair?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, plus surrounding Weld County and Front Range communities. Same price in every city.",
  },
]

const REPAIR_REVIEWS = reviewsFor("repair", 3)

export default function SprinklerRepairPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(REPAIR_FAQS)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Sprinkler Repair", url: `${siteConfig.url}/sprinkler-repair` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler Repair"
        description="$145 a visit, small fixes included. Most repairs are done the same day."
        backgroundImage="/images/sprinkler-repair.jpg"
      />

      {/* Answer first: price, what it covers, one Book Online button */}
      <section aria-labelledby="repair-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1">
              <SectionHeader
                tagline="Sprinkler repair"
                taglineAsEyebrow
                title="Tell us what the yard is doing. We'll find out why."
                titleId="repair-overview"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-4">
                A repair visit is{" "}
                <strong className="text-foreground font-semibold">$145</strong>. That covers running every
                zone, finding the problem, and the small fixes we can do on the spot, like a head, a nozzle
                or an adjustment. If it needs more than that, you get a price before we start, at $150 an
                hour plus parts.
              </p>
              <p className="text-muted-foreground mb-7">
                Most repairs are finished in that first visit. Parts for the common heads and valves are on
                the truck, and we work on every residential brand.
              </p>
              <Link href="/book" className={buttonVariants({ size: "lg" })}>
                Book Online
              </Link>
            </div>

            <div className="w-full lg:w-[360px] shrink-0">
              <Card className="bg-cream">
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">$145</span>
                    <span className="text-sm text-muted-foreground">per visit</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">Diagnosis and small fixes included.</p>
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-1.5">Bigger repairs</p>
                    <p className="text-sm text-muted-foreground">
                      Priced before we start. $150 an hour plus parts, no separate trip charge.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Common problems, with what they usually cost */}
      <section aria-labelledby="repair-problems" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader
            tagline="What we see most"
            taglineAsEyebrow
            title="The six problems we see most"
            titleId="repair-problems"
            description="If one of these sounds like your yard, book a visit. We find it on the first trip."
            align="left"
          />
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEMS.map((p) => (
              <li key={p.title} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-6">
                <h3 className="font-display text-2xl font-semibold text-navy">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                <p className="mt-auto text-sm font-semibold text-primary-dark">{p.cost}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What happens on the visit */}
      <section aria-labelledby="repair-visit" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-head.jpg"
                  alt="Pop-up sprinkler head being adjusted in a lawn"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <SectionHeader
                tagline="The visit"
                taglineAsEyebrow
                title="What happens when we come out"
                titleId="repair-visit"
                align="left"
              />
              <ol className="mt-6 flex flex-col gap-4">
                {[
                  ["We run every zone", "Not just the one you called about. A second problem on the same visit costs you nothing extra to find."],
                  ["We fix what we can on the spot", "Heads, nozzles, adjustments and small leaks at visible fittings are part of the $145."],
                  ["Anything bigger gets a price first", "A valve rebuild, a line repair or a controller swap is quoted before we start. If you say no, you've paid for the visit and nothing else."],
                  ["We show you what we did", "Which zone, which head, what to watch. If something we fixed gives you trouble, call us."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="font-display text-2xl font-bold text-primary leading-none mt-0.5 w-6 shrink-0">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                      <p className="text-sm text-muted-foreground">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* City links */}
      <section aria-labelledby="repair-cities" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Where we repair sprinklers"
            titleId="repair-cities"
            description="Based in Erie, covering the surrounding Front Range and Weld County."
            className="mb-8"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {CITY_DATA.map((city) => (
              <Link key={city.slug} href={`/services/${city.slug}`} className={buttonVariants({ variant: "outline" })}>
                Sprinkler repair in {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section aria-labelledby="repair-faq" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Sprinkler Repair FAQs" titleId="repair-faq" className="mb-10" />
          <FaqList faqs={REPAIR_FAQS} itemBg="cream" />
          <p className="text-sm text-muted-foreground text-center mt-8">
            Not sure it needs a repair yet? Read{" "}
            <Link href="/blog/signs-irrigation-system-needs-repair" className="text-primary hover:underline font-medium">
              seven signs your sprinkler system needs repair
            </Link>
            .
          </p>
        </div>
      </section>

      {REPAIR_REVIEWS.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(REPAIR_REVIEWS)) }} />
          <Testimonials
            reviews={REPAIR_REVIEWS}
            heading="What homeowners say about our repairs"
            description="Google reviews from repair visits."
            bg="cream"
            headingId="repair-reviews"
          />
        </>
      )}

      <CTAStrip />
    </>
  )
}
