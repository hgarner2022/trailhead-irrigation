import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { CITY_DATA } from "@/lib/city-data"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Spring Sprinkler Turn-On & Tune-Up",
  description:
    "Spring sprinkler turn-on in Erie, CO: $145 up to 8 zones. We pressurize the system, run every zone, adjust heads, check for leaks and program the controller. Late April through May.",
  alternates: { canonical: `${siteConfig.url}/spring-turn-on` },
}

/**
 * Spring turn-on landing page. The service the Services dropdown used to
 * send to /pricing, which is a price list, not a page about the service.
 *
 * Every fact comes from Trailhead's own published content: the late-April-
 * to-early-May window, the "nights above 32 degrees for a week" rule, the
 * $500 to $1,500 freeze repair range, the 45-minute-to-an-hour visit, and
 * the common spring findings all come from
 * /blog/spring-sprinkler-startup-colorado. Pricing matches the turn-on card
 * on /pricing and the Service schema in seo.ts.
 *
 * House style: no em dashes.
 */

const STEPS = [
  {
    title: "Inspect the backflow preventer",
    body: "It sits above ground and takes the worst of winter. We look for cracks, loose fittings and blown seals before any water goes through it.",
  },
  {
    title: "Pressurize the system slowly",
    body: "The main valve opens a quarter turn at a time over five to ten minutes. Opening it all at once causes water hammer, which cracks fittings.",
  },
  {
    title: "Run every zone and walk the yard",
    body: "We look for heads that don't pop up or rotate, water bubbling out of the ground, dry spots and spray on the sidewalk, and adjust what we can on the spot.",
  },
  {
    title: "Program the controller",
    body: "A controller that lost power over winter often lost its schedule too. We set it for spring, or set the seasonal adjustment on a smart controller.",
  },
  {
    title: "Tell you what we found",
    body: "Anything we can't fix in the visit gets a price before we leave, at our standard repair rates. You decide what to do with it.",
  },
]

const TURN_ON_FAQS = [
  {
    question: "How much does a spring sprinkler turn-on cost?",
    answer:
      "A spring turn-on and system check costs $145 for up to 8 zones, plus $10 for each additional zone. The visit takes about 45 minutes to an hour. Repairs are not included and are quoted before any work starts.",
  },
  {
    question: "When should I turn on my sprinklers in Colorado?",
    answer:
      "Late April to early May, once nighttime temperatures have stayed above 32 degrees for at least a week. The Front Range gets overnight freezes through mid-April and snow some years in May. A system turned on too early can freeze and crack, and those repairs run $500 to $1,500.",
  },
  {
    question: "What does the turn-on include?",
    answer:
      "Backflow inspection, slow pressurization, a manual run of every zone with head adjustments, a leak check at every visible connection, controller programming and a water efficiency check. Small fixes such as a nozzle or a head adjustment happen during the visit.",
  },
  {
    question: "What if you find something broken?",
    answer:
      "You get a price before we leave, at our standard repair rates, with no separate trip fee. Most spring repairs are a cracked fitting, a head a snowplow clipped, or a valve that stuck over the winter, and most are done the same visit if you say yes.",
  },
  {
    question: "Is a mid-summer tune-up the same thing?",
    answer:
      "Same visit, same price. In July the system has been running for two months, so the focus shifts to coverage gaps, clogged nozzles and zones running longer than they should.",
  },
  {
    question: "How early should I book?",
    answer:
      "We start booking turn-ons in early April and the schedule fills fast. Booking in April gets you a late-April or early-May date instead of waiting until the lawn is already stressed.",
  },
  {
    question: "Which cities do you serve for spring turn-ons?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, plus surrounding Weld County and Front Range communities. We're based in Erie.",
  },
]

const DEFINITIONS = [
  {
    term: "What is a sprinkler turn-on?",
    definition:
      "A spring sprinkler turn-on is the first pressurization of an irrigation system after winter, with a check of every zone. In Northern Colorado it happens late April to early May, after the last overnight freezes, and it is when freeze damage from the winter shows up.",
  },
  {
    term: "What is water hammer?",
    definition:
      "The bang in the pipes when water hits a closed valve or a dead end at speed. Opening the main valve all at once at turn-on sends a slug of water through empty lines, which can crack fittings and blow valve seals.",
  },
  {
    term: "Why does the backflow preventer matter in spring?",
    definition:
      "It is the one part of the system that sits above ground, so it freezes first and cracks most often. Most Front Range towns also require a certified backflow test every year.",
  },
  {
    term: "What is a seasonal adjustment?",
    definition:
      "A percentage setting on the controller that scales every zone's run time up or down. Spring runs at a lower percentage than July. Smart controllers such as the Rachio 3 adjust it from the weather.",
  },
]

export default function SpringTurnOnPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(TURN_ON_FAQS)) }}
      />
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
        title="Spring Sprinkler Turn-On & Tune-Up"
        description="We run every zone, check every head and set the controller for spring. $145 up to 8 zones."
        backgroundImage="/images/sprinkler-spring.jpg"
      />

      {/* Answer first: price, window, one Book Online button */}
      <section aria-labelledby="turn-on-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1">
              <SectionHeader
                tagline="Late April through May"
                taglineAsEyebrow
                title="A 45-minute visit that finds what winter broke"
                titleId="turn-on-overview"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-4">
                A spring turn-on costs{" "}
                <strong className="text-foreground font-semibold">$145 for up to 8 zones</strong>, plus $10
                per additional zone. We pressurize the system slowly, run every zone, adjust the heads, check
                for leaks and program the controller. The visit takes about 45 minutes to an hour.
              </p>
              <p className="text-muted-foreground mb-7">
                Winter is hard on a sprinkler system. Snowplows clip heads along the driveway, controllers
                lose their schedule when the power flickers, and a line that held a little water in a low
                spot shows its crack the first time it sees pressure. A turn-on finds all of that in one
                visit instead of letting it leak until June.
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
                    <span className="text-sm text-muted-foreground">up to 8 zones</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">+$10 per additional zone.</p>
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-1.5">Wait for warm nights</p>
                    <p className="text-sm text-muted-foreground">
                      We turn systems on once nights have stayed above 32 degrees for a week, usually late
                      April. Booking opens in early April.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What happens on the visit */}
      <section aria-labelledby="turn-on-steps" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-spray-head-lawn.jpg"
                  alt="Pop-up sprinkler head spraying across a green lawn"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <SectionHeader
                tagline="What happens on the visit"
                taglineAsEyebrow
                title="Five steps, in the order that protects the pipes"
                titleId="turn-on-steps"
                align="left"
              />
              <ol className="mt-6 flex flex-col gap-4">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-display text-2xl font-bold text-primary leading-none mt-0.5 w-6 shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Definitions */}
      <section aria-labelledby="turn-on-terms" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader title="Spring startup terms, explained" titleId="turn-on-terms" align="left" className="mb-10" />
          <DefinitionList items={DEFINITIONS} columns={2} />
        </div>
      </section>

      {/* City links */}
      <section aria-labelledby="turn-on-cities" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Where we do spring turn-ons"
            titleId="turn-on-cities"
            description="Based in Erie, covering the surrounding Front Range and Weld County."
            className="mb-8"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {CITY_DATA.map((city) => (
              <Link key={city.slug} href={`/services/${city.slug}`} className={buttonVariants({ variant: "outline" })}>
                Sprinkler turn-on in {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section aria-labelledby="turn-on-faq" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Spring Turn-On FAQs" titleId="turn-on-faq" className="mb-10" />
          <FaqList faqs={TURN_ON_FAQS} itemBg="cream" />
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
