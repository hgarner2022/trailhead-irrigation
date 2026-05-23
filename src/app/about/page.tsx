import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { MapPin, Droplets, Wrench, Shield, Users, Award } from "lucide-react"
import { siteConfig, breadcrumbJsonLd, personJsonLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "About Ryan Garner | Erie Sprinkler Contractor",
  description:
    "Meet Ryan Garner, founder of Trailhead Lawn & Irrigation in Erie, CO. Licensed sprinkler contractor with over a decade of Front Range experience, serving Erie, Longmont, Louisville, Lafayette, and Weld County.",
  alternates: { canonical: `${siteConfig.url}/about` },
}

const CREDENTIALS = [
  {
    icon: Wrench,
    title: "Licensed Contractor",
    text: "Licensed and insured sprinkler contractor in the state of Colorado.",
  },
  {
    icon: MapPin,
    title: "Based in Erie",
    text: "Working the same Front Range neighborhoods year after year. We know the soil, the water systems, and the HOA quirks.",
  },
  {
    icon: Droplets,
    title: "Irrigation Specialist",
    text: "Focused 100% on sprinkler systems. Not a general handyman or landscaper who does irrigation on the side.",
  },
  {
    icon: Users,
    title: "Trusted Locally",
    text: "Five-star reviews from homeowners across Erie, Longmont, Lafayette, and Louisville. Your neighbors trust Trailhead.",
  },
  {
    icon: Shield,
    title: "Fully Insured",
    text: "General liability coverage on every job. Your property is protected.",
  },
  {
    icon: Award,
    title: "Decade of Experience",
    text: "Over a decade of irrigation work on the Front Range. The kind of pattern recognition you only get from hundreds of yards.",
  },
]

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "About", url: `${siteConfig.url}/about` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />

      <PageBanner
        title="About Trailhead Lawn & Irrigation"
        description="Erie's locally owned sprinkler company. Licensed, insured, and trusted across the Front Range."
      />

      {/* Ryan's Story */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
            <div className="w-full flex-1">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/ryan.jpg"
                  alt="Ryan Garner, founder of Trailhead Lawn & Irrigation"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-6">
              <Badge variant="green" className="w-fit">Locally Owned &amp; Operated</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Meet Ryan Garner
              </h2>
              <div className="flex flex-col gap-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  I started Trailhead because I got tired of watching big irrigation companies churn
                  through technicians. Homeowners end up re-explaining the same system to a different
                  person every season, and nobody really knows the property. Trailhead is built on the
                  opposite: continuity, accountability, and the kind of local knowledge that comes from
                  working the same neighborhoods for years.
                </p>
                <p>
                  When you call Trailhead, you get a contractor who actually knows your system. The zone
                  that runs hot in July. The head that keeps getting clipped by the mower. That kind of
                  memory matters more than most homeowners realize. It's the difference between a 20-minute
                  fix and an hour of diagnostics on the clock.
                </p>
                <p>
                  I live in Erie with my wife and three boys. I've been doing irrigation work on the Front
                  Range for over a decade, and Trailhead is built on that experience. Hundreds of yards
                  through freeze-thaw cycles, drought stages, and the heavy clay that defines watering in
                  this part of Colorado. Your neighbors are my neighbors. I take care of their yards the
                  same way I take care of mine.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ryan */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Why Homeowners Choose Trailhead
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              No call centers. No subcontractors. A licensed Erie sprinkler contractor with the
              experience to get it right the first time, and the local roots to stand behind it.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {CREDENTIALS.map((cred) => (
              <div key={cred.title} className="flex flex-col gap-3 p-6 bg-white rounded-xl border border-border">
                <cred.icon className="h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{cred.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{cred.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Family Photo + Local Roots */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
            <div className="w-full flex-1">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/ryan-family.jpeg"
                  alt="Ryan Garner and his family"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Local Roots, Local Service
              </h2>
              <div className="flex flex-col gap-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  Erie is one of the fastest-growing towns in Colorado. Thousands of new homes
                  are going in every year in neighborhoods like Baseline, Colliers Hill, and
                  Alder Creek. Most of those homes come with a sprinkler system the owner has
                  never operated before.
                </p>
                <p>
                  That's where I come in. I know Erie's clay soil, the water pressure differences
                  between older and newer developments, and what the Town of Erie's watering
                  restrictions mean for your schedule. I also serve homeowners in Longmont,
                  Louisville, Lafayette, Firestone, and across Weld County.
                </p>
                <p>
                  If your sprinkler system needs attention, reach out. Trailhead has been serving Erie
                  and the surrounding Front Range for years, and we have the experience to set your
                  system up right.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Link
                  href="/book"
                  className={cn(buttonVariants({ size: "lg" }), "w-fit")}
                >
                  Book a Service
                </Link>
                <a
                  href="tel:9706927270"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-fit")}
                >
                  Call (970) 692-7270
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
