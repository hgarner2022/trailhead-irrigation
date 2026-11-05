import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SplitSection } from "@/components/sections/SplitSection"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

import { serviceJsonLd, faqJsonLd, breadcrumbJsonLd, siteConfig, reviewsJsonLd } from "@/lib/seo"
import { CITY_DATA } from "@/lib/city-data"
import { CheckList } from "@/components/sections/CheckList"
import { Testimonials } from "@/components/sections/Testimonials"
import { recentReviews } from "@/lib/reviews"

export const metadata: Metadata = {
  // Plain title (no brand). Root layout's title.template appends
  // "| Trailhead Lawn & Irrigation" once, so the final SERP title is
  // "Sprinkler Services in Erie, CO | Trailhead Lawn & Irrigation" (60 chars).
  title: "Sprinkler Services in Erie, CO",
  description:
    "Lawn sprinkler installation, repair, winterization & spring turn-on serving Erie, Longmont, Louisville, Lafayette & Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/services` },
}

const SERVICES_FAQS = [
  {
    question: "What does your sprinkler company do?",
    answer:
      "We're a full-service sprinkler company in Erie, CO. We handle lawn sprinkler installation, sprinkler repair, sprinkler blowout (winterization), and spring sprinkler turn-on. We also install smart controllers, fix sprinkler leaks, replace broken sprinkler heads, and do backflow testing.",
  },
  {
    question: "Do you fix sprinklers in Longmont and Weld County?",
    answer:
      "Yes. Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield, plus the rest of Weld County, at the same prices. We're based in Erie.",
  },
  {
    question: "How do I know if my sprinkler system needs repair?",
    answer:
      "Common signs your sprinkler is not working properly include brown spots on your lawn, puddles or soggy areas near heads, a water bill that's too high, sputtering or uneven spray, and zones that won't turn on or off. If you notice any of these, call a sprinkler contractor to take a look.",
  },
  {
    question: "When should I winterize my sprinklers in Colorado?",
    answer:
      "In Northern Colorado, you should winterize your sprinklers between late September and October, before the first hard freeze. A professional sprinkler blowout clears water from all lines and prevents cracked pipes and broken valves.",
  },
  {
    question: "How do I get a quote for a sprinkler installation?",
    answer:
      "Most installs run $3,000 to $6,000. Ryan walks the yard, designs the zone layout and gives you the layout and the price before anyone digs.",
    relatedLink: {
      href: "/sprinkler-installation",
      label: "See installation costs and how systems are designed",
    },
  },
]

const SERVICES = [
  {
    title: "Sprinkler System Installation",
    description:
      "We plan the zone layout from your yard's water pressure and flow, do the trenching and wiring, and walk you through the system when it's done. Most installs run $3,000 to $6,000, and you get the layout and the price before anyone digs.",
    image: "/images/sprinkler-installation.jpg",
    features: [
      "Custom system design for your property",
      "High-efficiency sprinkler heads and rotors",
      "Smart Wi-Fi controller options",
      "Proper zone coverage for even watering",
      "Full system walkthrough after install",
    ],
    imagePosition: "right" as const,
    cta: { label: "Get an installation quote", href: "/sprinkler-installation" },
  },
  {
    title: "Sprinkler Repair & Tune-Ups",
    description:
      "A repair visit is $145 and covers the diagnosis, and we take care of small fixes where we can. Bigger repairs are priced before we start.",
    image: "/images/sprinkler-repair.jpg",
    features: [
      "Sprinkler head replacement",
      "Valve and solenoid repair",
      "Leak detection and pipe repair",
      "Controller troubleshooting and programming",
      "Backflow testing and repair",
      "Manifold replacement",
      "Sprinkler layout adjustments / Zone additions",
      "Adding garden zones",
      "System upgrades (clocks, rain sensors, water-efficient heads)",
      "Root problem solutions",
      "Full system checks",
      "Seasonal adjustments and tune-ups",
    ],
    imagePosition: "left" as const,
    cta: { label: "See repair pricing and what we fix", href: "/sprinkler-repair" },
  },
  {
    title: "Winterization & Spring Sprinkler Turn-On",
    description:
      "A fall blowout is $95 for up to 6 zones and happens late September through October, before the first hard freeze. A spring turn-on is $145 for up to 8 zones, late April into May, and includes the small fixes we find while running each zone.",
    image: "/images/sprinkler-spring.jpg",
    features: [
      "Complete system blowout",
      "Zone-by-zone air purge",
      "Head adjustment and coverage check",
      "Full system check",
      "Spring activation includes minor repairs (e.g., declogging heads, nozzle replacements)",
      "Typical service time: 1/2 \u2013 1 hour",
    ],
    imagePosition: "right" as const,
    cta: { label: "Book Online", href: "/book" },
  },
]

const SERVICE_REVIEWS = recentReviews(6)

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": serviceJsonLd(),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(SERVICES_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Services", url: `${siteConfig.url}/services` },
            ])
          ),
        }}
      />
      <PageBanner
        title="Our Irrigation Services"
        description="Installation, repair, spring turn-ons and fall blowouts across the Northern Colorado Front Range."
        backgroundImage="/images/sprinkler-installation.jpg"
      />

      {SERVICES.map((service, index) => (
        <section
          key={service.title}
          className={cn(
            index % 2 === 0 ? "bg-background" : "bg-cream",
            "section-padding-y"
          )}
        >
          <div className="container-padding-x mx-auto max-w-7xl">
            <SplitSection
              image={{ src: service.image, alt: service.title }}
              imageSide={service.imagePosition === "left" ? "left" : "right"}
            >
                <SectionHeader title={service.title} description={service.description} align="left" />
                <CheckList items={service.features} />
                <Link
                  href={service.cta.href}
                  className={cn(buttonVariants({ size: "lg" }), "w-fit mt-2")}
                >
                  {service.cta.label}
                </Link>
            </SplitSection>
          </div>
        </section>
      ))}

      {/* Service Areas. bg-cream keeps the alternation working: with three
          services the last one lands on bg-background, so this has to break
          before the definitions section, which is bg-background too. */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl text-center">
          <SectionHeader
            title="Areas we serve"
            description="We're based in Erie and serve the entire Northern Colorado Front Range. Click your city for local water info, restrictions, and FAQs."
            className="mb-8"
          />
          <div className="flex flex-wrap justify-center gap-4">
            {CITY_DATA.map((city) => (
              <Link
                key={city.slug}
                href={`/services/${city.slug}`}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {city.name}, CO
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Definition blocks — short 40–60 word answers AI engines can extract
          and cite directly. Mirrors common "what is …" search queries. */}
      <section
        className="bg-background section-padding-y"
        aria-labelledby="definitions-heading"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Sprinkler services explained"
            titleId="definitions-heading"
            description="Quick definitions of every service we offer in Erie and Northern Colorado."
            className="mb-10"
          />

          <DefinitionList
            items={[
              {
                term: "What is a sprinkler blowout?",
                definition:
                  "A sprinkler blowout is a winterization service that uses a high-volume air compressor to push every drop of water out of an irrigation system before winter. In Northern Colorado, blowouts run from late September through October and protect pipes, valves, and backflow assemblies from freeze-thaw damage.",
              },
              {
                term: "What is a spring sprinkler turn-on?",
                definition:
                  "A spring turn-on is the seasonal service that activates an irrigation system after winter. It includes pressurizing the main line, checking every zone for leaks, adjusting heads, programming the controller for spring conditions, and verifying water-efficient operation before the watering season begins.",
              },
              {
                term: "What is a backflow preventer?",
                definition:
                  "A backflow preventer is a code-required valve assembly that stops irrigation water from siphoning back into the home's drinking-water supply. Most Colorado municipalities require annual testing by a certified backflow tester. The two common residential types are PVB (pressure vacuum breaker) and RPZ (reduced-pressure zone) assemblies.",
              },
              {
                term: "What is a smart sprinkler controller?",
                definition:
                  "A smart sprinkler controller is a Wi-Fi-enabled timer that adjusts watering automatically using local weather, soil-moisture data, and evapotranspiration rates. WaterSense-certified models like Rachio, Hunter Hydrawise, and Rain Bird ESP-Me3 can cut outdoor water use by 20–50% and qualify for utility rebates.",
              },
              {
                term: "What is drip irrigation?",
                definition:
                  "Drip irrigation delivers water slowly through low-pressure tubing and emitters placed at the base of each plant. It uses 30–50% less water than spray heads, eliminates runoff and evaporation, and is ideal for flower beds, vegetable gardens, tree wells, and xeriscape areas in Colorado's dry climate.",
              },
              {
                term: "What does a sprinkler repair include?",
                definition:
                  "A sprinkler repair covers diagnosing and fixing any malfunctioning component of an irrigation system: broken or clogged heads, leaking valves, cracked pipes, faulty wiring, and controller programming issues. Trailhead does not service systems with PVC piping running directly to spray heads.",
              },
            ]}
          />
        </div>
      </section>

      {/* Reviews sit directly above the FAQ on every interior page. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(SERVICE_REVIEWS)) }} />
      <Testimonials
        reviews={SERVICE_REVIEWS}
        heading="What homeowners say"
        description="Google reviews from across the Front Range."
        bg="cream"
        headingId="services-reviews"
      />

      {/* FAQ Section for AEO */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Sprinkler service questions" titleId="services-faq" className="mb-10" />
          <FaqList faqs={SERVICES_FAQS} itemBg="cream" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
