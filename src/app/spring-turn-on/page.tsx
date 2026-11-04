import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { PageBanner } from "@/components/sections/PageBanner"
import { ServiceAreaMap } from "@/components/sections/ServiceAreaMap"
import { Testimonials } from "@/components/sections/Testimonials"
import { faqJsonLd, reviewsJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { reviewsFor } from "@/lib/reviews"

export const metadata: Metadata = {
  title: "Spring Sprinkler Turn-On in Erie, CO",
  description:
    "Spring sprinkler turn-on in Erie, CO: $145 up to 8 zones. We run every zone, adjust heads, check for leaks and program the controller. Late April through May.",
  alternates: { canonical: `${siteConfig.url}/spring-turn-on` },
}

/**
 * Spring turn-on landing page, the exemplar for the service page template
 * (docs/SERVICE_PAGE_TEMPLATE.md). Two photos (banner, beside the steps), the price, window and duration answered first with one
 * Book Online, five steps, reviews from customers who booked a turn-on,
 * terms as plain text, the service-area map, FAQs, the closing strip. No
 * cards outside the FAQ. Every fact comes from /pricing, the spring startup
 * blog post and Ryan. House style: warm, plain, sentence case, no em dashes,
 * no numbers that are not published.
 */

const STEPS = [
  {
    title: "Inspect the backflow preventer",
    body: "It sits above ground all winter, so we check it first. Fittings, seals and test cocks, before any water goes through it.",
  },
  {
    title: "Pressurize the system slowly",
    body: "The main valve opens a quarter turn at a time over five to ten minutes. Opening it all at once causes water hammer, which cracks fittings.",
  },
  {
    title: "Run every zone and walk the yard",
    body: "We look for heads that don't pop up or rotate, water bubbling out of the ground, dry spots and spray on the sidewalk, and adjust what we can during the visit.",
  },
  {
    title: "Program the controller",
    body: "A controller that lost power over winter often lost its schedule too. We set it for spring, or set the seasonal adjustment on a smart controller.",
  },
  {
    title: "Tell you what we found",
    body: "Anything we can't take care of in the visit gets a price before we leave, at our standard repair rates. You decide what to do with it.",
  },
]

const DEFINITIONS = [
  {
    term: "What is a sprinkler turn-on?",
    definition:
      "The first pressurization of an irrigation system after winter, with a check of every zone. In Northern Colorado it happens late April to early May, after the last overnight freezes, and it is the first look at how the system came through the winter.",
  },
  {
    term: "What is water hammer?",
    definition:
      "The bang in the pipes when water hits a closed valve or a dead end at speed. Opening the main valve all at once sends a slug of water through empty lines, which can crack fittings and blow valve seals. Opening it slowly avoids all of that.",
  },
  {
    term: "Why does the backflow preventer matter in spring?",
    definition:
      "It is the one part of the system that sits above ground, so it is the part that feels winter first. We inspect it before any water goes through. Most Front Range towns also require a certified backflow test every year.",
  },
  {
    term: "What is a seasonal adjustment?",
    definition:
      "A percentage setting on the controller that scales every zone's run time up or down. Spring runs at a lower percentage than July. Smart controllers such as the Rachio 3 adjust it from the weather.",
  },
]

const TURN_ON_FAQS = [
  {
    question: "How much does a spring sprinkler turn-on cost?",
    answer:
      "A spring turn-on and system check costs $145 for up to 8 zones, plus $10 for each additional zone. The visit takes about 45 minutes to an hour. Repairs are quoted before any work starts.",
  },
  {
    question: "When should I turn on my sprinklers in Colorado?",
    answer:
      "Late April to early May, once nighttime temperatures have stayed above 32 degrees for at least a week. The Front Range gets overnight freezes through mid-April and snow some years in May, so a little patience protects the pipes.",
  },
  {
    question: "What does the turn-on include?",
    answer:
      "Backflow inspection, slow pressurization, a manual run of every zone with head adjustments, a leak check at every visible connection, controller programming and a water efficiency check. Small fixes such as a nozzle or a head adjustment happen during the visit.",
  },
  {
    question: "What if something needs a repair?",
    answer:
      "You get a price before we leave, at our standard repair rates. Most spring repairs are a cracked fitting, a head a snowplow clipped, or a valve that stuck over the winter, and we take care of the small ones during the visit where we can.",
  },
  {
    question: "Is a mid-summer tune-up the same thing?",
    answer:
      "Same visit, same price. In July the system has been running for two months, so the focus shifts to coverage gaps, clogged nozzles and zones running longer than they should.",
  },
  {
    question: "How early should I book?",
    answer:
      "We start booking turn-ons in early April and the schedule fills fast. Booking in April gets you a late-April or early-May date, right when the lawn starts asking for water.",
  },
  {
    question: "Which cities do you serve for spring turn-ons?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, plus surrounding Weld County and Front Range communities.",
  },
]

const TURN_ON_REVIEWS = reviewsFor("turn-on", 3)

export default function SpringTurnOnPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(TURN_ON_FAQS)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Spring Turn-On", url: `${siteConfig.url}/spring-turn-on` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Spring sprinkler turn-on in Erie, Colorado"
        description="We bring the system up slowly, run every zone, set the heads and program the controller for spring."
        backgroundImage="/images/sprinkler-spring.jpg"
      />

      {/* Answer first: what the visit does, the price, when, how long, one Book Online */}
      <section aria-labelledby="turn-on-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="max-w-[60ch]">
            <SectionHeader
              tagline="Late April through May"
              taglineAsEyebrow
              title="Your system, ready for the season in one visit"
              titleId="turn-on-overview"
              align="left"
            />
            <p className="text-muted-foreground mt-5 mb-4">
              A spring turn-on is{" "}
              <strong className="text-foreground font-semibold">$145 for up to 8 zones</strong>, plus $10 for each
              zone after that. We pressurize the system slowly, run every zone, adjust the heads, check for leaks and
              program the controller. Plan on about 45 minutes to an hour.
            </p>
            <p className="text-muted-foreground mb-7">
              Everything runs right from the first week: heads straightened after a winter of snowplows, the
              controller set for spring, and every zone checked so the lawn gets what it needs from day one. We
              start booking in early April, once nights have stayed above freezing for about a week.
            </p>
            <Link href="/book" className={buttonVariants({ size: "lg" })}>
              Book Online
            </Link>
          </div>
        </div>
      </section>

      {/* What happens on the visit */}
      <section aria-labelledby="turn-on-steps" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="/images/sprinkler-spray-head-lawn.jpg"
                alt="Pop-up sprinkler head spraying across a green lawn"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <SectionHeader
                tagline="What happens on the visit"
                taglineAsEyebrow
                title="Five steps, in the order that protects the pipes"
                titleId="turn-on-steps"
                align="left"
              />
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

      {/* Reviews from customers who booked a turn-on */}
      {TURN_ON_REVIEWS.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(TURN_ON_REVIEWS)) }} />
          <Testimonials
            reviews={TURN_ON_REVIEWS}
            heading="What homeowners say about spring visits"
            description="Google reviews from customers who booked a turn-on."
            bg="background"
            headingId="turn-on-reviews"
          />
        </>
      )}

      {/* Terms, as plain text */}
      <section aria-labelledby="turn-on-terms" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader tagline="Good to know" taglineAsEyebrow title="Spring startup terms, explained" titleId="turn-on-terms" align="left" />
          <DefinitionList items={DEFINITIONS} variant="plain" columns={2} />
        </div>
      </section>

      {/* Service area map */}
      <ServiceAreaMap title="Where we do spring turn-ons" bg="background" />

      {/* FAQs */}
      <section aria-labelledby="turn-on-faq" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Spring turn-on questions" titleId="turn-on-faq" className="mb-10" />
          <FaqList faqs={TURN_ON_FAQS} itemBg="background" />
          <p className="text-sm text-muted-foreground text-center mt-8">
            For the full timing breakdown, read our{" "}
            <Link href="/blog/spring-sprinkler-startup-colorado" className="text-primary hover:underline font-medium">
              spring startup guide
            </Link>
            .
          </p>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
