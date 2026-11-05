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
import { CheckList } from "@/components/sections/CheckList"

export const metadata: Metadata = {
  title: "Irrigation System Installation in Erie, CO",
  description:
    "New sprinkler systems in Erie, CO for $3,000 to $6,000, designed for clay soil and local watering rules. Layout and price before anyone digs. Owner-installed.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-installation` },
}

/**
 * Installation landing page, on the service page template
 * (docs/SERVICE_PAGE_TEMPLATE.md). Installation is quoted, not booked
 * online, so the panel's action is "Get an installation quote" to /contact.
 *
 * Content is grounded in Trailhead's existing published copy: the
 * $3,000-$6,000 range comes from city-data.ts and the Service schema in
 * seo.ts, and the capability list comes from the installation block on
 * /services. It deliberately does NOT state an install duration, permit
 * fees, or a step-by-step site procedure. If they're wanted, they need to
 * come from Ryan. No "free quote" language anywhere. House style: warm,
 * plain, no em dashes.
 */

const INCLUDED = [
  "Zone layout based on your actual water pressure and flow",
  "High-efficiency sprinkler heads and rotors, matched per zone",
  "Head-to-head coverage so there are no dry rings between heads",
  "Smart Wi-Fi controller options",
  "Full system walkthrough after install",
]

const LOCAL = [
  {
    term: "Heavy clay soil",
    definition:
      "Clay-loam absorbs water slowly and moves as it wets and dries. That points toward lower precipitation-rate nozzles and cycle-and-soak run times, because long single runs mostly become runoff.",
  },
  {
    term: "Restricted watering windows",
    definition:
      "When a city allows watering two or three days a week, the system has to deliver a full week of water inside those windows without flooding. That changes zone sizing and head selection as well as the controller schedule.",
  },
]

const INSTALL_FAQS = [
  {
    question: "How much does sprinkler installation cost?",
    answer:
      "Most residential sprinkler installations run $3,000 to $6,000, depending on yard size, number of zones, and controller type. We quote on-site after walking the property.",
  },
  {
    question: "How many zones does my yard need?",
    answer:
      "Zone count is set by water pressure and flow rather than preference. Your service line can only supply so many heads at once, so the yard gets divided into zones that run in sequence. Front and back are separated, lawn and planting beds are separated, and sun and shade areas are separated so each can run on its own schedule.",
  },
  {
    question: "Do I need a backflow preventer on a new system?",
    answer:
      "Yes. Colorado requires a backflow prevention assembly on any irrigation system connected to municipal water, and it has to be tested annually by a certified tester. The two common residential types are PVB and RPZ assemblies.",
  },
  {
    question: "Can you design a system that works with my city's watering restrictions?",
    answer:
      "That's part of the design. Erie, Longmont, Louisville, Lafayette, Firestone, and Broomfield each set their own watering days and hours, and several have been under drought restrictions. When a city allows watering two or three days a week, the system has to deliver a full week of water inside those windows, which changes zone sizing and head selection as well as the controller schedule.",
  },
  {
    question: "Why does clay soil change how a system is designed?",
    answer:
      "The clay-loam across Erie and Weld County absorbs water slowly, swelling when wet and shrinking when dry. Water applied faster than the soil can take it runs off instead of soaking in. That points toward lower precipitation-rate nozzles and cycle-and-soak run times rather than long single runs.",
  },
  {
    question: "Do you install systems for new construction?",
    answer:
      "Yes. Many newer Erie neighborhoods including Erie Highlands, Collier's Hill, Flatiron Meadows, and Compass were sold without irrigation, or with a builder system that under-covers the yard. We install complete systems on bare lots and we also correct or extend builder systems.",
  },
  {
    question: "What time of year can a sprinkler system be installed?",
    answer:
      "Once the ground has thawed and before it freezes, so roughly April through October on the Front Range. Spring and early summer are the busiest stretch. Installing later in the season means the system is ready to go the following spring.",
  },
]

const DEFINITIONS = [
  {
    term: "What is a zone?",
    definition:
      "A group of sprinkler heads that run together off one valve. A home's water supply can only feed so many heads at a time, so the yard is split into zones that run in sequence rather than all at once.",
  },
  {
    term: "What is head-to-head coverage?",
    definition:
      "Spacing heads so each one's spray reaches the next head. It uses more heads than spacing them at the edge of their range, but it prevents the dry rings between heads that appear when water pressure fluctuates.",
  },
  {
    term: "What is cycle and soak?",
    definition:
      "Splitting a zone's run time into shorter bursts with breaks between them. On the heavy clay soil across Erie and Weld County, one long run largely becomes runoff, while shorter cycles give water time to absorb.",
  },
  {
    term: "What is a precipitation rate?",
    definition:
      "How fast a sprinkler applies water, measured in inches per hour. Matching the precipitation rate to what your soil can absorb is what keeps water in the root zone instead of running down the gutter.",
  },
]

// Proof on the page that sells the service: only reviews whose own
// text is about installation, with schema matching what is displayed.
const INSTALL_REVIEWS = pickReviews("Jeremy Hampton", "Joanna Toy")

export default function SprinklerInstallationPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(INSTALL_FAQS)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Sprinkler Installation", url: `${siteConfig.url}/sprinkler-installation` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler and irrigation installation in Erie, Colorado"
        description="Zone layout and price before anyone digs, designed for clay soil and Front Range watering rules."
        backgroundImage="/images/home-lawn-spring.jpg"
      />

      {/* Answer first: what you get on the left; the at-a-glance panel with the price range, season and the quote action on the right */}
      <section aria-labelledby="install-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-stretch">
            <div className="max-w-[60ch] flex flex-col justify-center">
              <SectionHeader
                tagline="New system installation"
                taglineAsEyebrow
                title="How much does sprinkler installation cost in Erie, CO?"
                titleId="install-overview"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-4">
                Most residential sprinkler installations run{" "}
                <strong className="text-foreground font-semibold">$3,000 to $6,000</strong>. The number moves with
                yard size, how many zones your water pressure will support, and the controller you choose.
              </p>
              <p className="text-muted-foreground">
                Ryan walks the property, designs the zone layout, and does the install himself. You get the layout
                and a price before anyone digs.
              </p>
            </div>

            <Card className="bg-cream h-full">
              <CardContent className="p-8 flex flex-col h-full">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">At a glance</p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-5xl font-bold text-navy leading-none">$3,000 to $6,000</span>
                  <span className="text-muted-foreground">for most yards</span>
                </p>
                <dl className="mt-6 divide-y divide-border border-y border-border">
                  {[
                    ["What moves the price", "Yard size, zone count, controller"],
                    ["Season", "April through October"],
                    ["Who does the work", "Ryan designs and installs it"],
                    ["Before anyone digs", "Layout and price in writing"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 py-3">
                      <dt className="text-sm text-muted-foreground shrink-0">{k}</dt>
                      <dd className="text-sm font-semibold text-foreground text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto pt-6">
                  <Link href="/contact" className={buttonVariants({ size: "lg", className: "w-full" })}>
                    Get an installation quote
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Designed for your yard */}
      <section aria-labelledby="install-design" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection image={{ src: "/images/new-lawn-home.jpg", alt: "Home with a freshly installed lawn and paver walkway" }} imageSide="left">
            <div>
              <SectionHeader
                tagline="Designed for your yard"
                taglineAsEyebrow
                title="Zones laid out from your yard's water pressure and flow"
                titleId="install-design"
                align="left"
              />
              <p className="text-muted-foreground mt-5 max-w-[60ch]">
                We plan the zone coverage, do the trenching and wiring, and walk you through the system when
                it&apos;s done.
              </p>
              <CheckList items={INCLUDED} className="mt-6" />
            </div>
          </SplitSection>
        </div>
      </section>

      {/* Local conditions, as plain text */}
      <section aria-labelledby="install-local" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader
            tagline="Why local design matters"
            taglineAsEyebrow
            title="Built for clay soil and Front Range water rules"
            titleId="install-local"
            description="A system designed for sandy soil and unlimited watering days will not perform here. Two local conditions shape every layout."
            align="left"
          />
          <DefinitionList items={LOCAL} variant="plain" columns={2} />
          <div>
            <Link href="/water-rebates" className={buttonVariants({ variant: "outline" })}>
              Check local rebates
            </Link>
          </div>
        </div>
      </section>

      {/* Terms, as plain text */}
      <section aria-labelledby="install-terms" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader tagline="Good to know" taglineAsEyebrow title="Terms you'll see on a sprinkler bid" titleId="install-terms" align="left" />
          <DefinitionList items={DEFINITIONS} variant="plain" columns={2} />
        </div>
      </section>

      {/* Service area map */}
      <ServiceAreaMap title="Where we install systems" bg="background" />

      {/* Reviews from installations */}
      {INSTALL_REVIEWS.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(INSTALL_REVIEWS)) }} />
          <Testimonials
            reviews={INSTALL_REVIEWS}
            heading="What homeowners say about their new system"
            description="Google reviews from installations."
            bg="cream"
            headingId="install-reviews"
          />
        </>
      )}

      {/* FAQs */}
      <section aria-labelledby="install-faq" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Sprinkler installation questions" titleId="install-faq" className="mb-10" />
          <FaqList faqs={INSTALL_FAQS} itemBg="cream" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
