import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { HowItWorks } from "@/components/sections/HowItWorks"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { serviceJsonLd, faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { CITY_DATA } from "@/lib/city-data"

export const metadata: Metadata = {
  title: "Sprinkler Services in Erie, CO | Trailhead Irrigation",
  description:
    "Trusted sprinkler company in Erie, CO. Lawn sprinkler installation, sprinkler repair, winterization blowout & spring turn-on serving Erie, Longmont, Louisville, Lafayette & Weld County.",
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
      "Yes. We're a local sprinkler service covering Erie, Longmont, Louisville, Lafayette, and the greater Weld County area. We're locally owned and operated out of Erie, CO.",
  },
  {
    question: "How do I know if my sprinkler system needs repair?",
    answer:
      "Common signs your sprinkler is not working properly include brown spots on your lawn, puddles or soggy areas near heads, a water bill that's too high, sputtering or uneven spray, and zones that won't turn on or off. If you notice any of these, call a sprinkler contractor to take a look.",
  },
  {
    question: "When should I winterize my sprinklers in Colorado?",
    answer:
      "In Northern Colorado, you should winterize your sprinklers between mid-October and early November, before the first hard freeze. A professional sprinkler blowout clears water from all lines and prevents cracked pipes and broken valves.",
  },
  {
    question: "Do you offer free estimates for sprinkler installation?",
    answer:
      "Yes. Contact us for a free quote on residential sprinkler installation. Our sprinkler contractor will visit your property, assess your yard, and design a custom system tailored to your lawn and landscape.",
  },
]

const SERVICES = [
  {
    title: "Sprinkler System Installation",
    description:
      "Looking for a sprinkler contractor in Erie or Longmont? We design and install complete lawn sprinkler systems tailored to your yard. From planning zone coverage to trenching and wiring, we handle every step.",
    image: "/images/sprinkler-installation.jpg",
    features: [
      "Custom system design for your property",
      "High-efficiency sprinkler heads and rotors",
      "Smart Wi-Fi controller options",
      "Proper zone coverage for even watering",
      "Full system walkthrough after install",
    ],
    imagePosition: "right" as const,
    cta: { label: "Request a Quote", href: "/contact" },
  },
  {
    title: "Sprinkler Repair & Tune-Ups",
    description:
      "Sprinkler not working? Sprinkler leak? Brown spots on your lawn? We fix sprinkler problems fast. Broken sprinkler heads, valve issues, high water bills, system upgrades, and seasonal tune-ups.",
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
    cta: { label: "Request a Quote", href: "/contact" },
  },
  {
    title: "Winterization & Spring Sprinkler Turn-On",
    description:
      "Need to winterize your sprinklers before the freeze? Or turn on your sprinklers this spring? We do professional sprinkler blowouts in the fall and spring sprinkler startups, including minor repairs as needed.",
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
        description="Your local sprinkler company for installation, repair, and seasonal maintenance in Erie, Longmont & Northern Colorado."
        backgroundImage="/images/sprinkler-installation.jpg"
      />

      <HowItWorks />

      {SERVICES.map((service, index) => (
        <section
          key={service.title}
          className={cn(
            index % 2 === 0 ? "bg-background" : "bg-cream",
            "section-padding-y"
          )}
        >
          <div className="container-padding-x mx-auto max-w-7xl">
            <div
              className={cn(
                "flex flex-col items-center gap-12 lg:flex-row lg:gap-16",
                service.imagePosition === "left" && "lg:flex-row-reverse"
              )}
            >
              {/* Content */}
              <div className="flex flex-1 flex-col gap-6">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  {service.title}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {service.description}
                </p>
                <ul className="flex flex-col gap-3">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={service.cta.href}
                  className={cn(buttonVariants({ size: "lg" }), "w-fit mt-2")}
                >
                  {service.cta.label}
                </Link>
              </div>

              {/* Image */}
              <div className="w-full flex-1">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Service Areas */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Areas We Serve
          </h2>
          <p className="text-muted-foreground mb-8">
            We&apos;re based in Erie and serve the entire Northern Colorado Front Range. Click your city for local water info, restrictions, and FAQs.
          </p>
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
          <div className="text-center mb-10">
            <h2
              id="definitions-heading"
              className="text-3xl md:text-4xl font-bold text-foreground"
            >
              Sprinkler Services Explained
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Quick definitions of every service we offer in Erie and Northern Colorado.
            </p>
          </div>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-cream border border-border rounded-lg p-6">
              <dt className="font-semibold text-foreground mb-2">
                What is a sprinkler blowout?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                A sprinkler blowout is a winterization service that uses a
                high-volume air compressor to push every drop of water out of
                an irrigation system before winter. In Northern Colorado,
                blowouts run from mid-October through early November and protect
                pipes, valves, and backflow assemblies from freeze-thaw damage.
              </dd>
            </div>

            <div className="bg-cream border border-border rounded-lg p-6">
              <dt className="font-semibold text-foreground mb-2">
                What is a spring sprinkler turn-on?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                A spring turn-on is the seasonal service that activates an
                irrigation system after winter. It includes pressurizing the
                main line, checking every zone for leaks, adjusting heads,
                programming the controller for spring conditions, and verifying
                water-efficient operation before the watering season begins.
              </dd>
            </div>

            <div className="bg-cream border border-border rounded-lg p-6">
              <dt className="font-semibold text-foreground mb-2">
                What is a backflow preventer?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                A backflow preventer is a code-required valve assembly that
                stops irrigation water from siphoning back into the home&apos;s
                drinking-water supply. Most Colorado municipalities require
                annual testing by a certified backflow tester. The two common
                residential types are PVB (pressure vacuum breaker) and RPZ
                (reduced-pressure zone) assemblies.
              </dd>
            </div>

            <div className="bg-cream border border-border rounded-lg p-6">
              <dt className="font-semibold text-foreground mb-2">
                What is a smart sprinkler controller?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                A smart sprinkler controller is a Wi-Fi-enabled timer that
                adjusts watering automatically using local weather, soil-moisture
                data, and evapotranspiration rates. WaterSense-certified models
                like Rachio, Hunter Hydrawise, and Rain Bird ESP-Me3 can cut
                outdoor water use by 20–50% and qualify for utility rebates.
              </dd>
            </div>

            <div className="bg-cream border border-border rounded-lg p-6">
              <dt className="font-semibold text-foreground mb-2">
                What is drip irrigation?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                Drip irrigation delivers water slowly through low-pressure
                tubing and emitters placed at the base of each plant. It uses
                30–50% less water than spray heads, eliminates runoff and
                evaporation, and is ideal for flower beds, vegetable gardens,
                tree wells, and xeriscape areas in Colorado&apos;s dry climate.
              </dd>
            </div>

            <div className="bg-cream border border-border rounded-lg p-6">
              <dt className="font-semibold text-foreground mb-2">
                What does a sprinkler repair include?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                A sprinkler repair covers diagnosing and fixing any
                malfunctioning component of an irrigation system: broken or
                clogged heads, leaking valves, cracked pipes, faulty wiring,
                and controller programming issues. Trailhead does not service
                systems with PVC piping running directly to spray heads.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* FAQ Section for AEO */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-4">
            {SERVICES_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group border border-border rounded-lg"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-foreground">
                  {faq.question}
                  <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    &#9662;
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
