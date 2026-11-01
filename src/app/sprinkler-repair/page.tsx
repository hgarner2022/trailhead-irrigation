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
    title: "A leak at the backflow, manifold or a valve",
    body: "The most common call we get. The backflow sits above ground and takes the worst of winter, and the valves and manifold below it are next in line.",
    cost: "Backflow poppet and bonnet $60, bleeder valve $45, shutoff valve $170, full backflow replacement about $500, manifold rebuild from $500",
  },
  {
    title: "A zone with no pressure, or one that won't come on",
    body: "A valve stuck open or shut, low voltage at the solenoid, or a broken line somewhere on that zone. We run it, trace it and fix it.",
    cost: "Valve work $100 to $200, a broken line $200 to $400",
  },
  {
    title: "Heads that are broken, buried or in the wrong place",
    body: "Mower and plow damage, heads sunk below grade, heads a tree root has pushed, heads where the trampoline or the new garden bed needs to go. We replace, cap or relocate them.",
    cost: "$50 to $150 per head replaced, more to relocate",
  },
  {
    title: "Drip line repairs and garden zones",
    body: "Chewed or split drip line, emitters that stopped, a garden running at too much pressure. We repair the line, add a pressure reducer where it needs one, or convert a spray zone to drip.",
    cost: "Most drip repairs finish inside the $145 visit, a pressure reducer adds about $40",
  },
  {
    title: "Dry spots and spray on the sidewalk",
    body: "Coverage problems. Heads aimed wrong, the wrong nozzles for the space, or rotors and sprays mixed on one zone. We adjust every zone, not just the one you noticed.",
    cost: "$50 to $100 to dial in the whole yard, a few dollars a head for the right nozzles",
  },
  {
    title: "A water bill that jumped, or a spot that never dries",
    body: "Usually an underground leak or a valve running a zone all night. We have had these flood a basement. The sooner it is found, the less it costs in water.",
    cost: "$200 to $500 to find and repair an underground leak",
  },
]

const REPAIR_FAQS = [
  {
    question: "How much does sprinkler repair cost?",
    answer:
      "A repair visit is $145 and takes about 45 minutes to an hour. That covers the diagnosis and small fixes done on the spot, like a head, a nozzle or an adjustment. Anything bigger is priced before we start, at $145 an hour plus parts. Most repairs are finished in one visit.",
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
    question: "We just moved in and don't know the system. Where do we start?",
    answer:
      "Book a repair visit. We run every zone, find the shut-off and the backflow, check the controller, and give you a list of anything that needs fixing with a price on each item. Most of the small things get fixed during the visit.",
  },
  {
    question: "Do you work on all sprinkler brands?",
    answer:
      "Yes. Hunter, Rain Bird, Toro, Orbit and the rest. Parts for the common heads and valves are on the truck. If you don't know what pipe you have, book anyway and we'll sort it out on the phone. The one setup we don't work on is PVC pipe run straight to the spray heads, and we can usually tell from a photo.",
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
        title="Sprinkler Repair in Erie, CO & the Front Range"
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
                or an adjustment. If it needs more than that, you get a price before we start, at $145 an
                hour plus parts.
              </p>
              <p className="text-muted-foreground mb-7">
                The visit takes about 45 minutes to an hour, and most of that is finding the problem. Most
                repairs are finished in that first visit. Parts for the common heads and valves are on the
                truck, and we work on every residential brand.
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
                      Priced before we start. $145 an hour plus parts, no separate trip charge.
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
            tagline="Common repairs"
            taglineAsEyebrow
            title="What we get called out for most"
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
              <ol className="mt-6 flex flex-col gap-4 list-none">
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
