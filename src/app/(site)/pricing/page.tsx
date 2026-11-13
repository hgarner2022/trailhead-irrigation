import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { ServicePriceCard } from "@/components/sections/ServicePriceCard"
import { FaqList } from "@/components/sections/FaqList"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Sun, Search, Snowflake, Wrench, CheckCircle2, Clock } from "lucide-react"
import { faqJsonLd, reviewsJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { SEASON_PASS_FROM } from "@/lib/season-pass"
import { Testimonials } from "@/components/sections/Testimonials"
import { pickReviews } from "@/lib/reviews"

export const metadata: Metadata = {
  title: "Sprinkler Pricing in Erie, CO",
  description:
    "Sprinkler pricing for repairs, spring turn-ons, fall blowouts and new systems in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, CO.",
  alternates: { canonical: `${siteConfig.url}/pricing` },
}

const PRICING_FAQS = [
  {
    question: "How much does a spring sprinkler turn-on cost?",
    answer:
      "Spring turn-on and system check is $145 for up to 8 zones, plus $10 per additional zone. This includes turn-on, full system check, adjustments, leak check, controller programming, and a water efficiency check.",
  },
  {
    question: "How much does sprinkler winterization cost in Northern Colorado?",
    answer:
      "Winterization (sprinkler blowout) costs $95 for up to 6 zones, plus $10 for each additional zone. We recommend scheduling between late September and October, before the first hard freeze.",
    relatedLink: {
      href: "/blog/when-to-winterize-sprinklers-colorado",
      label: "Read the full winterization timing guide",
    },
  },
  {
    question: "How do I get a repair quote?",
    answer:
      "Book a $145 repair visit. It covers the diagnosis, and we take care of small fixes where we can. Anything bigger is priced before we start, at $145 an hour plus parts.",
  },
  {
    question: "Do you install new irrigation systems?",
    answer:
      "Yes. Most installs run $3,000 to $6,000. We walk the yard, then give you a layout and a price before anyone digs.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, at the same prices, plus the rest of Weld County.",
  },
  {
    question: "Are there rebates available for irrigation upgrades?",
    answer:
      "Yes. Erie, Longmont, Louisville and Lafayette offer rebates on WaterSense smart controllers such as the Rachio 3. Search your zip code at rachio.com/rebates, or see our Water Rebates page for each city's program.",
    relatedLink: { href: "/water-rebates", label: "Water rebates by city" },
  },
]

// Proof on the page that sells the service: only reviews whose own
// text is about value, with schema matching what is displayed.
const VALUE_REVIEWS = pickReviews("Lori Ginn", "Lauren Shields", "Nicole Duke")

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(PRICING_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Pricing", url: `${siteConfig.url}/pricing` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Pricing"
        description="What we charge for turn-ons, blowouts, repairs and installs. Same prices in all six cities."
      />

      {/* ════════════════════════════════════════════
          SEASONAL SERVICES
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SectionHeader
            tagline="Seasonal services"
            taglineAsEyebrow
            title="Individual services"
            description="Book one visit at a time. The price on the card is what you pay, and there is no trip charge."
            className="mb-12"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ServicePriceCard
              title="Spring Turn-On + System Check"
              icon={Sun}
              price="$145"
              priceUnit="up to 8 zones"
              perZoneNote="+$10 per additional zone"
              features={[
                "Turn-on & full system check",
                "Head adjustments & leak check",
                "Controller programming",
                "Water efficiency check",
              ]}
              footnote="Repairs not included."
              learnMoreLink={{
                href: "/spring-turn-on",
                label: "What a turn-on covers & when to book",
              }}
            />
            <ServicePriceCard
              title="Mid-Season Sprinkler Inspection & Tune-Up"
              icon={Search}
              price="$145"
              priceUnit="up to 8 zones"
              perZoneNote="+$10 per additional zone"
              features={[
                "Full system check & adjustments",
                "Coverage gaps, clogged nozzles, zones running long",
                "Water efficiency check",
                "A list of anything that needs fixing, priced",
              ]}
              footnote="Repairs not included."
            />
            <ServicePriceCard
              title="Winterization (Blowout)"
              icon={Snowflake}
              iconBgClass="bg-blue-500/10"
              iconColorClass="text-blue-500"
              price="$95"
              priceUnit="up to 6 zones"
              perZoneNote="+$10 per additional zone"
              features={[
                "Every zone blown clear with compressed air",
                "Drip zones and filters included",
                "Backflow assembly cleared and protected",
              ]}
              learnMoreLink={{
                href: "/sprinkler-blowout",
                label: "How a blowout works & when to book",
              }}
            />
          </div>

          {/* All three seasonal visits on one schedule. Same per-zone prices
              as the cards above, added up; the page has the table by zone. */}
          <Link
            href="/season-pass"
            className="group mt-6 flex flex-col gap-4 rounded-lg border-2 border-primary bg-cream p-6 md:flex-row md:items-center md:justify-between transition-colors hover:bg-primary/5"
          >
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Season Pass</p>
              <p className="font-display text-2xl md:text-3xl font-semibold text-navy">
                All three visits, one schedule, blowout date reserved in July
              </p>
              <p className="text-sm text-muted-foreground">
                From ${SEASON_PASS_FROM} for up to 6 zones, charged per visit at the prices above. Nothing up front.
              </p>
            </div>
            <span className={cn(buttonVariants({ size: "lg" }), "shrink-0 w-fit")}>
              See zone prices and reserve
            </span>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          REPAIRS & SERVICE
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1">
              <SectionHeader
                tagline="Repairs and service"
                taglineAsEyebrow
                title="Sprinkler repair, $145 a visit"
                description="The visit covers the diagnosis, and we take care of small fixes where we can. Bigger repairs are quoted before we start, at $145 an hour plus parts."
                align="left"
                className="mb-6"
              />
              <ul className="flex flex-col gap-3 mb-8">
                <RepairFeature icon={<Wrench className="w-4 h-4" />}>
                  Troubleshooting &amp; diagnostics
                </RepairFeature>
                <RepairFeature icon={<CheckCircle2 className="w-4 h-4" />}>
                  Heads, valves, lines, controllers &amp; wiring
                </RepairFeature>
                <RepairFeature icon={<Clock className="w-4 h-4" />}>
                  A price before any bigger work starts
                </RepairFeature>
              </ul>
              <Link href="/book" className={cn(buttonVariants({ size: "lg" }), "w-fit")}>
                Book Online
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="bg-background rounded-lg border border-border p-6 md:p-8">
                <h3 className="font-semibold text-foreground mb-4">Common repairs</h3>
                <div className="flex flex-col gap-3">
                  <RepairLine label="Sprinkler head replacement" />
                  <RepairLine label="Valve repair or replacement" />
                  <RepairLine label="Line break / pipe repair" />
                  <RepairLine label="Controller troubleshooting" />
                  <RepairLine label="Wiring repair" />
                </div>
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> The one setup we don&apos;t work on is PVC pipe run straight to the spray heads. If you don&apos;t know what pipe you have, book anyway and we&apos;ll sort it out on the phone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          IRRIGATION INSTALLS
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl text-center">
          <div className="bg-cream rounded-lg border border-border p-8 md:p-12">
            <SectionHeader
              tagline="New installations"
              taglineAsEyebrow
              title="Irrigation system installation"
              description="Most installs run $3,000 to $6,000, depending on lot size, soil, zones and water source. We walk the yard and give you a layout and a price before anyone digs."
              className="mb-6"
            />
            <Link href="/contact" className={buttonVariants({ size: "lg" })}>
              Get an installation quote
            </Link>
          </div>
        </div>
      </section>

      {VALUE_REVIEWS.length > 0 && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(reviewsJsonLd(VALUE_REVIEWS)),
            }}
          />
          <Testimonials
            reviews={VALUE_REVIEWS}
            heading="What Customers Say About Our Pricing"
            description="Google reviews from homeowners on what the work actually cost them."
            bg="background"
            headingId="pricing-reviews"
          />
        </>
      )}

      {/* ════════════════════════════════════════════
          FAQs
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Pricing questions" titleId="pricing-faq" className="mb-10" />
          <FaqList faqs={PRICING_FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}

/* ─── Helper Components ─── */

function RepairFeature({
  children,
  icon,
}: {
  children: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-3 text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

function RepairLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
      <span className="text-foreground font-medium text-sm">{label}</span>
    </div>
  )
}
