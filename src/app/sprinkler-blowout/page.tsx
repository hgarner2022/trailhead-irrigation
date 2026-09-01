import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { CITY_DATA } from "@/lib/city-data"
import Link from "next/link"
import Image from "next/image"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Sprinkler Blowout & Winterization",
  description:
    "Sprinkler blowout $95 up to 8 zones. Compressed-air winterization across Northern Colorado. Book for October, before the first hard freeze.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-blowout` },
}

/**
 * Blowout / winterization landing page.
 *
 * Every fact here is sourced from Trailhead's own published content, not
 * inferred: the late-September-through-October window, the "booked solid by
 * mid-October" note, the below-28-degrees hard freeze threshold, and the
 * $500-$1,500 freeze repair range all come from
 * /blog/when-to-winterize-sprinklers-colorado. Pricing matches the
 * winterization card on /pricing and the Service schema in seo.ts.
 *
 * Deliberately does NOT describe Ryan's on-site procedure step by step. An
 * earlier version invented that sequence. If a process section is wanted
 * later, it needs to come from Ryan.
 *
 * House style for new content: no em dashes (see commit 18c9a89).
 */

const BLOWOUT_FAQS = [
  {
    question: "How much does a sprinkler blowout cost?",
    answer:
      "A sprinkler blowout costs $95 for up to 8 zones, plus $10 for each additional zone. There is no trip fee.",
  },
  {
    question: "When should I winterize my sprinklers in Northern Colorado?",
    answer:
      "Late September through October. The first hard freeze, meaning below 28 degrees for several hours, can arrive any time from mid-October on. Erie's first hard freeze in 2024 landed on October 18. Some years it holds off until November, so it isn't worth waiting on the forecast.",
  },
  {
    question: "What happens if I skip winterization?",
    answer:
      "Water left in the lines expands when it freezes, which cracks pipes and splits valves. Repair bills typically run $500 to $1,500, and you usually don't find out until spring turn-on.",
  },
  {
    question: "Can I blow out the system myself with a shop compressor?",
    answer:
      "A typical shop compressor doesn't move enough air volume to clear a residential irrigation system. It builds pressure but not the sustained flow needed to push water out of every lateral and head, so water gets left behind in the places that matter.",
  },
  {
    question: "How early should I book?",
    answer:
      "We start booking winterizations in September, and October fills up fast. By mid-October we're usually booked solid. Booking early gets you the date you want instead of whatever is left once a freeze shows up in the forecast.",
  },
  {
    question: "What about my backflow preventer?",
    answer:
      "It sits above ground and holds water, so it's the first part of the system to freeze. Clearing and protecting the backflow assembly is part of winterization, and a cracked assembly is one of the more expensive freeze repairs to fix in spring.",
  },
  {
    question: "Do you winterize drip zones as well as spray zones?",
    answer:
      "Yes. Drip lines, filters, and pressure regulators hold water and crack in a freeze the same way spray zones do, so they get cleared too.",
  },
  {
    question: "Which cities do you serve for winterization?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone, and Broomfield, plus surrounding Weld County and Front Range communities. We're based in Erie.",
  },
]

const DEFINITIONS = [
  {
    term: "What is a sprinkler blowout?",
    definition:
      "A sprinkler blowout is a winterization service that uses a high-volume air compressor to push water out of an irrigation system before winter. In Northern Colorado, blowouts run from late September through October and protect pipes, valves, and backflow assemblies from freeze-thaw damage.",
  },
  {
    term: "What is a hard freeze?",
    definition:
      "Temperatures below 28 degrees sustained for several hours. That's the point where water sitting in shallow irrigation lines and above-ground backflow assemblies freezes solid enough to crack the pipe.",
  },
  {
    term: "What is a backflow preventer?",
    definition:
      "A code-required valve assembly that stops irrigation water from siphoning back into the home's drinking water supply. It sits above ground, holds water, and freezes before anything else in the system. The two common residential types are PVB and RPZ assemblies.",
  },
  {
    term: "Why does freeze-thaw matter in Colorado?",
    definition:
      "Colorado swings above and below freezing repeatedly through winter rather than staying cold. Water left in a line freezes, expands, thaws, and does it again, so a system that wasn't cleared takes that stress all season instead of once.",
  },
]

export default function SprinklerBlowoutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(BLOWOUT_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Sprinkler Blowout",
                url: `${siteConfig.url}/sprinkler-blowout`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler Blowout & Winterization"
        description="Compressed-air winterization before the first hard freeze. $95 up to 8 zones."
        backgroundImage="/images/sprinkler-spring.jpg"
      />

      {/* Answer-first intro, price, single Book Now CTA */}
      <section
        aria-labelledby="blowout-overview"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1">
              <SectionHeader
                tagline="Winterization season"
                taglineAsEyebrow
                title="Book your blowout for October"
                titleId="blowout-overview"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-4">
                A sprinkler blowout costs{" "}
                <strong className="text-foreground font-semibold">
                  $95 for up to 8 zones
                </strong>
                , plus $10 per additional zone. In Northern Colorado the window
                is{" "}
                <strong className="text-foreground font-semibold">
                  late September through October
                </strong>
                , before the first hard freeze.
              </p>
              <p className="text-muted-foreground mb-7">
                Water left in the lines expands when it freezes, which cracks
                pipes and splits valves. Those repairs typically run $500 to
                $1,500, and most homeowners don&apos;t find out until they
                pressurize the system in spring.
              </p>
              <Link
                href="/book?service=winterization"
                className={buttonVariants({ size: "lg" })}
              >
                Book Now
              </Link>
            </div>

            <div className="w-full lg:w-[360px] shrink-0">
              <Card className="bg-cream">
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      $95
                    </span>
                    <span className="text-sm text-muted-foreground">
                      up to 8 zones
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    +$10 per additional zone. No trip fee.
                  </p>
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-1.5">
                      October books out
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We start booking in September and are usually booked solid
                      by mid-October.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section
        aria-labelledby="blowout-risk"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-repair.jpg"
                  alt="Irrigation valve and pipe repair after freeze damage"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <SectionHeader
                tagline="Why it matters"
                taglineAsEyebrow
                title="What freeze damage costs"
                titleId="blowout-risk"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-5">
                Colorado&apos;s freeze-thaw cycle is harder on irrigation than a
                steady cold winter. Temperatures climb above freezing and drop
                back down repeatedly, so water left in a line takes that stress
                all season rather than once.
              </p>
              <ul className="flex flex-col gap-4">
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    The backflow assembly goes first
                  </p>
                  <p className="text-sm text-muted-foreground">
                    It sits above ground and holds water, so it freezes before
                    anything buried. It&apos;s also one of the more expensive
                    parts to replace.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Cracks stay hidden until spring
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A split lateral underground gives no warning. You find it
                    when you pressurize in April and part of the yard turns into
                    a puddle, or when a quiet leak shows up on a water bill.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Repairs run $500 to $1,500
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Against a $95 blowout. Digging a repair out of saturated
                    clay also takes longer than the original install did.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Definitions */}
      <section
        aria-labelledby="blowout-terms"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Winterization terms, explained"
            titleId="blowout-terms"
            align="left"
            className="mb-10"
          />
          <DefinitionList items={DEFINITIONS} columns={2} />
        </div>
      </section>

      {/* City links */}
      <section
        aria-labelledby="blowout-cities"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Where we winterize"
            titleId="blowout-cities"
            description="Based in Erie, covering the surrounding Front Range and Weld County."
            className="mb-8"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {CITY_DATA.map((city) => (
              <Link
                key={city.slug}
                href={`/services/${city.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Sprinkler blowout in {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section
        aria-labelledby="blowout-faq"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader
            title="Sprinkler Blowout FAQs"
            titleId="blowout-faq"
            className="mb-10"
          />
          <FaqList faqs={BLOWOUT_FAQS} itemBg="cream" />
          <p className="text-sm text-muted-foreground text-center mt-8">
            For the full timing breakdown, read our{" "}
            <Link
              href="/blog/when-to-winterize-sprinklers-colorado"
              className="text-primary hover:underline font-medium"
            >
              winterization timing guide
            </Link>
            .
          </p>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
