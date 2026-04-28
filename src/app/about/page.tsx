import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Phone, MapPin, Droplets, Wrench, Shield, Users } from "lucide-react"
import { siteConfig, breadcrumbJsonLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "About Ryan Garner | Erie Sprinkler Contractor",
  description:
    "Meet Ryan Garner, founder of Trailhead Lawn & Irrigation in Erie, CO. Licensed sprinkler contractor serving Erie, Longmont, Louisville, Lafayette and Weld County. Local, reliable, and personally on every job.",
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
    title: "Erie Local",
    text: "Born, raised, and still living right here in Erie. This is home.",
  },
  {
    icon: Droplets,
    title: "Irrigation Specialist",
    text: "Focused 100% on sprinkler systems. Not a general handyman or landscaper who does irrigation on the side.",
  },
  {
    icon: Users,
    title: "One-Man Operation",
    text: "When you call Trailhead, you get Ryan. Not a dispatcher, not a random tech. The same person every time.",
  },
  {
    icon: Shield,
    title: "Fully Insured",
    text: "General liability coverage on every job. Your property is protected.",
  },
  {
    icon: Phone,
    title: "Same-Day Callbacks",
    text: "If I miss your call, I call back the same day. That's a promise.",
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Ryan Garner",
            jobTitle: "Founder",
            worksFor: {
              "@type": "LocalBusiness",
              name: siteConfig.name,
              url: siteConfig.url,
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Erie",
              addressRegion: "CO",
              postalCode: "80516",
              addressCountry: "US",
            },
            url: `${siteConfig.url}/about`,
          }),
        }}
      />

      <PageBanner
        title="About Trailhead Lawn & Irrigation"
        description="Erie's locally owned sprinkler company. One contractor. One phone call. Every job done right."
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
                  I started Trailhead because I got tired of watching big companies send a different
                  technician to the same house every time. The homeowner has to re-explain the problem.
                  The tech doesn't know the system. Nobody follows up.
                </p>
                <p>
                  I wanted to build something different. When you call Trailhead, you get me. I know
                  your system because I'm the one who installed it, repaired it, or winterized it last
                  year. I remember the zone that runs hot in July and the head that keeps getting clipped
                  by the mower.
                </p>
                <p>
                  I live in Erie with my wife and three boys (ages 1, 4, and 7). I've been doing
                  irrigation work on the Front Range for years, and Trailhead is how I've turned that
                  into a real local business. Your neighbors are my neighbors. I take care of their
                  yards the same way I take care of mine.
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
              No call centers. No subcontractors. Just a licensed, local sprinkler contractor who
              shows up on time and does the work himself.
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
                  If your sprinkler system needs attention, give me a call. I'll pick up, or I'll
                  call you back the same day.
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
