import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Sprinkler Installation Services",
  description:
    "New sprinkler system installation across Northern Colorado. Custom zone design for clay soil and local watering rules. Typical cost $3,000 to $6,000.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-installation` },
}

/**
 * Installation landing page.
 *
 * Follows the alternating image/text section pattern established by
 * /water-efficiency rather than inventing a new layout.
 *
 * Content is grounded in Trailhead's existing published copy: the
 * $3,000-$6,000 range comes from city-data.ts and the Service schema in
 * seo.ts, and the capability list comes from the installation block on
 * /services. It deliberately does NOT state an install duration, permit
 * fees, or a step-by-step site procedure. An earlier version invented those.
 * If they're wanted, they need to come from Ryan.
 *
 * No "free quote" or "free estimate" language anywhere, per 3cca994.
 * House style for new content: no em dashes (18c9a89).
 */

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
      "That's part of the design. Erie, Longmont, Louisville, Lafayette, Firestone, and Broomfield each set their own watering days and hours, and several have been under drought restrictions. When a city allows watering two or three days a week, the system has to deliver a full week of water inside those windows, which affects zone sizing and head selection rather than just the controller schedule.",
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

export default function SprinklerInstallationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(INSTALL_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Sprinkler Installation",
                url: `${siteConfig.url}/sprinkler-installation`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler Installation Services"
        description="New irrigation systems designed around your yard, your soil, and your city's watering rules."
        backgroundImage="/images/sprinkler-installation.jpg"
      />

      {/* Answer-first intro + single CTA */}
      <section
        aria-labelledby="install-overview"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl text-center">
          <SectionHeader
            tagline="New system installation"
            taglineAsEyebrow
            title="What a new sprinkler system costs"
            titleId="install-overview"
          />
          <p className="text-muted-foreground mt-5 mb-4">
            Most residential sprinkler installations run{" "}
            <strong className="text-foreground font-semibold">
              $3,000 to $6,000
            </strong>
            . The number moves with yard size, how many zones your water
            pressure will support, and the controller you choose.
          </p>
          <p className="text-muted-foreground mb-7">
            Ryan walks the property, designs the zone layout, and does the
            install himself. You get the layout and a price before anyone digs.
          </p>
          <Link
            href="/contact"
            className={buttonVariants({ size: "lg" })}
          >
            Get a Quote
          </Link>
        </div>
      </section>

      {/* Custom design */}
      <section
        aria-labelledby="install-design"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-head.jpg"
                  alt="Sprinkler head set at lawn level for even coverage"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Designed for your yard
              </Badge>
              <h2
                id="install-design"
                className="text-2xl md:text-3xl font-bold text-foreground mb-3"
              >
                Custom zone design, not a template
              </h2>
              <p className="text-muted-foreground mb-5">
                We design and install complete lawn sprinkler systems tailored
                to your yard, from planning zone coverage through trenching and
                wiring.
              </p>
              <ul className="flex flex-col gap-2.5">
                <FeatureItem>
                  Zone layout based on your actual water pressure and flow
                </FeatureItem>
                <FeatureItem>
                  High-efficiency sprinkler heads and rotors, matched per zone
                </FeatureItem>
                <FeatureItem>
                  Head-to-head coverage so there are no dry rings between heads
                </FeatureItem>
                <FeatureItem>Smart Wi-Fi controller options</FeatureItem>
                <FeatureItem>Full system walkthrough after install</FeatureItem>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Local conditions */}
      <section
        aria-labelledby="install-local"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/healthy-lawn-closeup.jpg"
                  alt="Healthy lawn on Colorado clay soil"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Why local design matters
              </Badge>
              <h2
                id="install-local"
                className="text-2xl md:text-3xl font-bold text-foreground mb-3"
              >
                Built for clay soil and Front Range water rules
              </h2>
              <p className="text-muted-foreground mb-5">
                A system designed for sandy soil and unlimited watering days
                will not perform here. Two local conditions shape every layout:
              </p>
              <ul className="flex flex-col gap-4 mb-6">
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Heavy clay soil
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clay-loam absorbs water slowly and moves as it wets and
                    dries. That points toward lower precipitation-rate nozzles
                    and cycle-and-soak run times, because long single runs
                    mostly become runoff.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Restricted watering windows
                  </p>
                  <p className="text-sm text-muted-foreground">
                    When a city allows watering two or three days a week, the
                    system has to deliver a full week of water inside those
                    windows without flooding. That affects zone sizing and head
                    selection, not just the controller schedule.
                  </p>
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/water-rebates"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Check local rebates
                </Link>
                <Link
                  href="/services"
                  className={buttonVariants({ variant: "link" })}
                >
                  See all services &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Definitions */}
      <section
        aria-labelledby="install-terms"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Terms you'll see on a sprinkler bid"
            titleId="install-terms"
            align="left"
            className="mb-10"
          />
          <DefinitionList items={DEFINITIONS} columns={2} itemBg="background" />
        </div>
      </section>

      {/* FAQs */}
      <section
        aria-labelledby="install-faq"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader
            title="Sprinkler Installation FAQs"
            titleId="install-faq"
            className="mb-10"
          />
          <FaqList faqs={INSTALL_FAQS} itemBg="cream" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}

/* ─── Helper Components ─── */

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  )
}
