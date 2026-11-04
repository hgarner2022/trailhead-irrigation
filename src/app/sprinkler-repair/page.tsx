import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { PageBanner } from "@/components/sections/PageBanner"
import { ServiceAreaMap } from "@/components/sections/ServiceAreaMap"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { Testimonials } from "@/components/sections/Testimonials"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { faqJsonLd, reviewsJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { reviewsFor } from "@/lib/reviews"

export const metadata: Metadata = {
  title: "Sprinkler Repair in Erie, CO",
  description:
    "Sprinkler repair for $145 a visit. We come out, diagnose the problem and take care of small fixes where we can. Heads, valves, leaks and controllers. Erie and the Front Range.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-repair` },
}

/**
 * Sprinkler repair landing page, on the service page template
 * (docs/SERVICE_PAGE_TEMPLATE.md). "Sprinkler repair" is the biggest click
 * earner in Search Console, so the page answers price and what the visit
 * covers first.
 *
 * Facts: the $145 visit and what it covers come from Jobber's "Sprinkler
 * Repair Assessment" service. The $145/hour labor rate is Hannah's number
 * (Nov 2026). The problem list comes from
 * /blog/signs-irrigation-system-needs-repair, without the cost ranges
 * (parts change). The "no PVC to spray heads" rule comes from the /services
 * definition block. House style: warm, plain, no em dashes.
 */

const PROBLEMS = [
  {
    term: "Leaks at the backflow, manifold or a valve",
    definition: "The most common call we get. The backflow sits above ground and gets the most weather, so it is the first place we look.",
  },
  {
    term: "Getting a zone running again",
    definition: "Low pressure or a zone that stays quiet usually comes down to a valve, a solenoid or a line. We run it and trace it to the cause.",
  },
  {
    term: "Heads replaced, raised or moved",
    definition: "Heads the mower or plow caught, heads that sank below grade, heads a tree root nudged, and heads that need to move for the trampoline or the new garden bed. We replace, cap or relocate them.",
  },
  {
    term: "Drip line repairs and garden zones",
    definition: "Chewed or split drip line, emitters that stopped, a garden running at too much pressure. We repair the line, add a pressure reducer where it needs one, or convert a spray zone to drip.",
  },
  {
    term: "Even coverage across the whole yard",
    definition: "Dry spots and spray on the sidewalk come from heads aimed off, nozzles that throw too far, or rotors and sprays mixed on one zone. We adjust every zone, not just the one you noticed.",
  },
  {
    term: "Finding the leak behind a high water bill",
    definition: "A soggy spot or a bill that jumped usually means an underground leak or a valve running overnight. Finding it early keeps the water bill where it belongs.",
  },
]

const STEPS = [
  { title: "We run every zone", body: "Not just the one you called about, so you know the state of the whole system." },
  {
    title: "We take care of small fixes where we can",
    body: "A head, a nozzle, an adjustment or a small leak at a visible fitting is part of the $145 when it can be done in the visit.",
  },
  {
    title: "Anything bigger gets a price first",
    body: "A valve rebuild, a line repair or a controller swap is quoted before we start. If you say no, you've paid for the visit and nothing else.",
  },
  { title: "We show you what we did", body: "Which zone, which head, what to watch. If something we fixed gives you trouble, call us." },
]

const REPAIR_FAQS = [
  {
    question: "How much does sprinkler repair cost?",
    answer:
      "A repair visit is $145 and takes about 45 minutes to an hour. That covers the diagnosis, and we take care of small fixes where we can, like a head, a nozzle or an adjustment. Anything bigger is priced before we start, at $145 an hour plus parts.",
  },
  {
    question: "What happens on a repair visit?",
    answer:
      "We run every zone and find the problem. Small fixes get done in the visit where we can. If a repair needs parts we don't carry or more time, you get a price before any of that work starts. You decide.",
  },
  {
    question: "Can you find an underground leak?",
    answer:
      "Yes. A soggy spot that never dries, a zone with weak pressure at the far end, or a water bill that jumped are the usual signs. We trace it and price the repair before we start.",
  },
  {
    question: "We just moved in and don't know the system. Where do we start?",
    answer:
      "Book a repair visit. We run every zone, find the shut-off and the backflow, check the controller, and give you a list of anything that needs fixing with a price on each item. The small things we take care of during the visit where we can.",
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
    answer: "The $145 visit is the diagnosis, and small fixes we can do during it are included. That is the whole charge for the visit.",
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
        title="Sprinkler repair in Erie, Colorado"
        description="We come out, diagnose the problem and take care of small fixes where we can."
        backgroundImage="/images/sprinkler-repair.jpg"
      />

      {/* Answer first: what the visit does on the left; the at-a-glance panel with price, visit and the one Book Online on the right */}
      <section aria-labelledby="repair-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-stretch">
            <div className="max-w-[60ch] flex flex-col justify-center">
              <SectionHeader
                tagline="Sprinkler repair"
                taglineAsEyebrow
                title="Tell us what the yard is doing. We'll get it running right."
                titleId="repair-overview"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-4">
                We run every zone and find the problem, and we take care of small fixes where we can, like a head, a
                nozzle or an adjustment. Most of the visit is finding the problem. Parts for the common heads and
                valves are on the truck, and we work on every residential brand.
              </p>
              <p className="text-muted-foreground">
                If it needs more than the visit covers, you get a price before we start, at $145 an hour plus parts.
                You decide what to do with it.
              </p>
            </div>

            <Card className="bg-cream h-full">
              <CardContent className="p-8 flex flex-col h-full">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">At a glance</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-6xl font-bold text-navy leading-none">$145</span>
                  <span className="text-muted-foreground">per visit, small fixes included</span>
                </p>
                <dl className="mt-6 divide-y divide-border border-y border-border">
                  {[
                    ["Bigger repairs", "$145 an hour plus parts, priced first"],
                    ["The visit", "About 45 minutes to an hour"],
                    ["Brands", "Hunter, Rain Bird, Toro, Orbit and more"],
                    ["When", "Any time the water is on, spring through fall"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 py-3">
                      <dt className="text-sm text-muted-foreground shrink-0">{k}</dt>
                      <dd className="text-sm font-semibold text-foreground text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto pt-6 hidden lg:block">
                  <Link href="/book" className={buttonVariants({ size: "lg", className: "w-full" })}>
                    Book Online
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What we fix most, as plain text */}
      <section aria-labelledby="repair-problems" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader
            tagline="Common repairs"
            taglineAsEyebrow
            title="What we fix most"
            titleId="repair-problems"
            description="If one of these sounds like your yard, book a visit and we will come take a look."
            align="left"
          />
          <DefinitionList items={PROBLEMS} variant="plain" columns={3} />
        </div>
      </section>

      {/* What happens on the visit */}
      <section aria-labelledby="repair-visit" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="/images/sprinkler-head.jpg"
                alt="Pop-up sprinkler head being adjusted in a lawn"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <SectionHeader tagline="The visit" taglineAsEyebrow title="What happens when we come out" titleId="repair-visit" align="left" />
              <ol className="mt-8 flex flex-col gap-6 list-none">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-5">
                    <span className="font-display text-3xl font-bold text-primary leading-none w-8 shrink-0">{i + 1}</span>
                    <div className="max-w-[60ch]">
                      <p className="font-semibold text-foreground mb-1">{step.title}</p>
                      <p className="text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Service area map */}
      <ServiceAreaMap title="Where we repair sprinklers" bg="cream" />

      {/* Reviews from repair visits */}
      {REPAIR_REVIEWS.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(REPAIR_REVIEWS)) }} />
          <Testimonials
            reviews={REPAIR_REVIEWS}
            heading="What homeowners say about our repairs"
            description="Google reviews from repair visits."
            bg="background"
            headingId="repair-reviews"
          />
        </>
      )}

      {/* FAQs */}
      <section aria-labelledby="repair-faq" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Sprinkler repair questions" titleId="repair-faq" className="mb-10" />
          <FaqList faqs={REPAIR_FAQS} itemBg="background" />
          <p className="text-sm text-muted-foreground text-center mt-8">
            Not sure it needs a repair yet? Read{" "}
            <Link href="/blog/signs-irrigation-system-needs-repair" className="text-primary hover:underline font-medium">
              seven signs your sprinkler system needs repair
            </Link>
            .
          </p>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
