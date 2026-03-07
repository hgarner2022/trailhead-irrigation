import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { serviceJsonLd, faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Irrigation Services in Erie, Longmont & Weld County",
  description:
    "Professional sprinkler installation, repair, winterization and spring startup serving Erie, Longmont & Weld County, CO. Locally owned and operated.",
  alternates: { canonical: `${siteConfig.url}/services` },
}

const SERVICES_FAQS = [
  {
    question: "What irrigation services do you offer in Erie, CO?",
    answer:
      "We offer complete irrigation services including sprinkler system installation, repair and maintenance, winterization (blowout), and spring activation. We also install Wi-Fi controllers, rebuild manifolds, and repair backflow preventers.",
  },
  {
    question: "Do you service sprinkler systems in Longmont and Weld County?",
    answer:
      "Yes. We serve Erie, Longmont, and the greater Weld County area in Northern Colorado. We are locally owned and operated out of Erie.",
  },
  {
    question: "How do I know if my sprinkler system needs repair?",
    answer:
      "Common signs include brown or dry patches in your lawn, puddles or soggy areas near sprinkler heads, unusually high water bills, sputtering or uneven spray patterns, and zones that won't turn on or off properly.",
  },
  {
    question: "When should I winterize my sprinklers in Colorado?",
    answer:
      "In Northern Colorado, you should winterize your sprinkler system between mid-October and early November, before the first hard freeze when temperatures drop below 28 degrees F for several hours.",
  },
  {
    question: "Do you offer free estimates for sprinkler installation?",
    answer:
      "Yes. Contact us for a free quote on irrigation system installation. We will assess your property and design a custom system tailored to your lawn and landscape.",
  },
]

const SERVICES = [
  {
    title: "Irrigation System Installation",
    description:
      "We design and install complete sprinkler systems tailored to your property. From planning zone coverage to trenching and wiring — we handle every step.",
    image: "/images/sprinkler-head.jpg",
    features: [
      "Custom system design for your property",
      "High-efficiency sprinkler heads and rotors",
      "Smart Wi-Fi controller options",
      "Proper zone coverage for even watering",
      "Full system walkthrough after install",
    ],
    imagePosition: "right" as const,
  },
  {
    title: "Repair & Maintenance",
    description:
      "Broken heads, leaking valves, controller malfunctions — we diagnose and fix irrigation problems fast so your lawn stays green.",
    image: "/images/lawn.jpg",
    features: [
      "Sprinkler head replacement",
      "Valve and solenoid repair",
      "Leak detection and pipe repair",
      "Controller troubleshooting and programming",
      "Backflow testing and repair",
    ],
    imagePosition: "left" as const,
  },
  {
    title: "Winterization & Spring Startup",
    description:
      "Colorado winters can destroy unprotected irrigation systems. We professionally blow out your lines in fall and activate everything in spring.",
    image: "/images/boulder.jpg",
    features: [
      "Complete system blowout with commercial compressor",
      "Zone-by-zone air purge",
      "Controller shutdown and settings backup",
      "Spring activation and leak check",
      "Head adjustment and coverage check",
    ],
    imagePosition: "right" as const,
  },
]

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceJsonLd()),
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
        description="Professional sprinkler installation, repair, and seasonal maintenance for Northern Colorado."
        backgroundImage="/images/sprinkler-head.jpg"
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
                <Button size="lg" className="w-fit mt-2">
                  <Link href="/contact">Get a Free Quote</Link>
                </Button>
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
