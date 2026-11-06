import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { ServiceAreaMap } from "@/components/sections/ServiceAreaMap"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SplitSection } from "@/components/sections/SplitSection"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { faqJsonLd, reviewsJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { Testimonials } from "@/components/sections/Testimonials"
import { pickReviews } from "@/lib/reviews"
import { StepList } from "@/components/sections/StepList"

// The page re-renders once a day so the season copy below tracks the calendar.
export const revalidate = 86400

/**
 * Which part of the blowout season it is. The page used to say "Book your
 * blowout for October" and "booked solid by mid-October" all year, which told
 * a November visitor they had missed it while Search Console showed them still
 * searching. Copy now follows the month.
 */
function blowoutPhase(date: Date): "early" | "peak" | "late" | "off" {
  const m = date.getMonth() // 0 = January
  if (m === 7 || m === 8) return "early" // Aug, Sep
  if (m === 9) return "peak" // Oct
  if (m === 10) return "late" // Nov; December is off season, nothing is booked
  return "off"
}

const SEASON_COPY = {
  early: {
    title: "Book your blowout for October",
    now: "We start booking in September and are usually booked solid by mid-October. Booking now gets you the date you want.",
    banner: "Compressed-air winterization before the first hard freeze.",
  },
  peak: {
    title: "October is here. Get on the schedule.",
    now: "The first hard freeze near Erie usually lands in the second half of October. We are clearing systems every day this month.",
    banner: "Compressed-air winterization before the first hard freeze.",
  },
  late: {
    title: "There is still time to get your sprinklers blown out this fall.",
    now: "We keep doing blowouts all through November. Book the next open day and we will take care of it.",
    banner: "Still time for a blowout. We keep going through November.",
  },
  off: {
    title: "Blowouts start in late September",
    now: "Book ahead and we put you on the calendar before the October rush. Nothing is charged until the visit is done.",
    banner: "Compressed-air winterization every fall, late September through October.",
  },
} as const

export const metadata: Metadata = {
  title: "Sprinkler Blowout & Winterization in Erie, CO",
  description:
    "Sprinkler blowout and winterization in Erie, CO and across the Northern Colorado Front Range. Every zone cleared with compressed air. Book online.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-blowout` },
}

/**
 * Blowout / winterization landing page, on the service page template
 * (docs/SERVICE_PAGE_TEMPLATE.md).
 *
 * Every fact here is sourced from Trailhead's own published content: the
 * late-September-through-October window, the "booked solid by mid-October"
 * note and the below-28-degrees hard freeze threshold come from
 * /blog/when-to-winterize-sprinklers-colorado. Pricing matches the
 * winterization card on /pricing and the Service schema in seo.ts.
 *
 * Deliberately does NOT describe Ryan's on-site procedure step by step. If a
 * process section is wanted, it needs to come from Ryan. House style: warm,
 * plain, no em dashes, no fear framing in headings.
 */

const WHY = [
  {
    title: "The backflow assembly goes first",
    body: "It sits above ground and holds water, so it freezes before anything buried. Clearing and protecting it is part of every blowout.",
  },
  {
    title: "Cracks stay hidden until spring",
    body: "A split lateral underground gives no warning. You find it when you pressurize in April and part of the yard turns into a puddle, or when a quiet leak shows up on a water bill.",
  },
  {
    title: "A blowout costs far less than a repair",
    body: "A freeze repair means digging a split line out of saturated clay in spring, which takes longer than the original install did. The blowout is $95.",
  },
]

const BLOWOUT_FAQS = [
  {
    question: "How much does a sprinkler blowout cost?",
    answer: "A sprinkler blowout costs $95 for up to 6 zones, plus $10 for each additional zone.",
  },
  {
    question: "When should I winterize my sprinklers in Northern Colorado?",
    answer:
      "Late September through October. The first hard freeze, meaning below 28 degrees for several hours, can arrive any time from mid-October on. At the NOAA stations nearest Erie, the first hard freeze has come as early as October 10 and as late as mid-November, and it usually lands in the second half of October. Some years it holds off until November, so it isn't worth waiting on the forecast. See our first freeze dates by year.",
  },
  {
    question: "What happens if I skip winterization?",
    answer:
      "Water left in the lines expands when it freezes, which can crack pipes and split valves, and you usually don't find out until spring turn-on. Clearing the lines each fall is the simplest way to keep the system healthy for years.",
  },
  {
    question: "Can I blow out the system myself with a shop compressor?",
    answer:
      "A typical shop compressor doesn't move enough air volume to clear a residential irrigation system. It builds pressure but not the sustained flow needed to push water out of every lateral and head, so water gets left behind in the places that matter.",
  },
  {
    question: "It already froze and I haven't had my blowout. Can you still come?",
    answer:
      "Yes. Most systems come through the first freeze fine, and clearing it now protects it for the rest of the winter. We keep doing blowouts through November.",
  },
  {
    question: "How late can I book?",
    answer:
      "Through the end of November. September and October fill fast, so book early then. After that, take the next open day and we will come out.",
  },
  {
    question: "What about my backflow preventer?",
    answer:
      "It sits above ground and holds water, so it's the first part of the system to freeze. Clearing and protecting the backflow assembly is part of winterization, and it is one of the parts most worth protecting.",
  },
  {
    question: "Do you winterize drip zones as well as spray zones?",
    answer:
      "Yes. Drip lines, filters, and pressure regulators hold water and crack in a freeze the same way spray zones do, so they get cleared too.",
  },
  {
    question: "Which cities do you serve for winterization?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone, and Broomfield, plus surrounding Weld County and Front Range communities.",
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

// Proof on the page that sells the service: only reviews whose own
// text is about blowout, with schema matching what is displayed.
const BLOWOUT_REVIEWS = pickReviews("Daniel Cooperider", "Jen Wilbers", "Paul Griffin")

export default function SprinklerBlowoutPage() {
  const season = SEASON_COPY[blowoutPhase(new Date())]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(BLOWOUT_FAQS)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Sprinkler Blowout", url: `${siteConfig.url}/sprinkler-blowout` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler blowout and winterization in Erie, Colorado"
        description={season.banner}
        backgroundImage="/images/fall-blowout-yard-erie.jpg"
      />

      {/* Answer first: what the visit does on the left; the at-a-glance panel with price, season and the one Book Online on the right */}
      <section aria-labelledby="blowout-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-stretch">
            <div className="max-w-[60ch] flex flex-col justify-center">
              <SectionHeader tagline="Winterization season" taglineAsEyebrow title={season.title} titleId="blowout-overview" align="left" />
              <p className="text-muted-foreground mt-5 mb-4">
                We blow every zone clear with compressed air before the first hard freeze, including the backflow
                assembly and any drip zones, so the system sits dry all winter and comes up clean in spring.
              </p>
              <p className="text-muted-foreground">
                The best time in Northern Colorado is late September through October. If that has passed, book the
                next open day. We keep going through November.
              </p>
            </div>

            <Card className="bg-cream h-full">
              <CardContent className="p-8 flex flex-col h-full">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">At a glance</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-6xl font-bold text-navy leading-none">$95</span>
                  <span className="text-muted-foreground">for up to 6 zones</span>
                </p>
                <dl className="mt-6 divide-y divide-border border-y border-border">
                  {[
                    ["Each additional zone", "$10"],
                    ["When", "Late September through October"],
                    ["How late", "Through the end of November"],
                    ["Drip and backflow", "Cleared on every visit"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 py-3">
                      <dt className="text-sm text-muted-foreground shrink-0">{k}</dt>
                      <dd className="text-sm font-semibold text-foreground text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm text-muted-foreground">{season.now}</p>
                <p className="mt-4 text-xs text-muted-foreground">Prices and details checked November 6, 2026.</p>
                <div className="mt-auto pt-6 hidden lg:block">
                  <Link href="/book?service=winterization" className={buttonVariants({ size: "lg", className: "w-full" })}>
                    Book Online
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section aria-labelledby="blowout-risk" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/sprinkler-repair.jpg", alt: "Irrigation valve and pipe being repaired" }} imageSide="left">
            <div>
              <SectionHeader tagline="Why it matters" taglineAsEyebrow title="What the $95 protects" titleId="blowout-risk" align="left" />
              <p className="text-muted-foreground mt-5 max-w-[60ch]">
                Colorado&apos;s freeze-thaw cycle is harder on irrigation than a steady cold winter. Temperatures
                climb above freezing and drop back down repeatedly, so water left in a line takes that stress all
                season rather than once.
              </p>
              <StepList steps={WHY} className="mt-8" />
            </div>
          </SplitSection>
        </div>
      </section>

      {/* Terms, as plain text */}
      <section aria-labelledby="blowout-terms" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader tagline="Good to know" taglineAsEyebrow title="Winterization terms, explained" titleId="blowout-terms" align="left" />
          <DefinitionList items={DEFINITIONS} variant="plain" columns={2} />
        </div>
      </section>

      {/* Service area map */}
      <ServiceAreaMap title="Where we winterize" bg="cream" />

      {/* Reviews from blowout visits */}
      {BLOWOUT_REVIEWS.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(BLOWOUT_REVIEWS)) }} />
          <Testimonials
            reviews={BLOWOUT_REVIEWS}
            heading="What homeowners say about their blowout"
            description="Google reviews from winterization visits."
            bg="background"
            headingId="blowout-reviews"
          />
        </>
      )}

      {/* FAQs */}
      <section aria-labelledby="blowout-faq" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Sprinkler blowout questions" titleId="blowout-faq" className="mb-10" />
          <FaqList faqs={BLOWOUT_FAQS} itemBg="background" />
          <p className="text-sm text-muted-foreground text-center mt-8">
            See{" "}
            <Link href="/first-freeze-dates" className="text-primary hover:underline font-medium">
              first freeze dates by year
            </Link>{" "}
            for the six towns, or read our{" "}
            <Link href="/blog/when-to-winterize-sprinklers-colorado" className="text-primary hover:underline font-medium">
              winterization guide
            </Link>
            .
          </p>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
