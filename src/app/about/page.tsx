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
    "Trailhead Lawn & Irrigation is an owner-operated sprinkler company in Erie, CO. Licensed and insured, with over ten years of Front Range irrigation work.",
  alternates: { canonical: `${siteConfig.url}/about` },
}


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
        description="An owner-operated sprinkler company in Erie, CO. Over ten years on the Front Range, licensed and insured, 5.0 on Google."
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
                  person every season, and nobody really knows the property. At Trailhead the same person
                  comes back every season and already knows your yard.
                </p>
                <p>
                  When you call, you get someone who already knows your system, like which zone runs
                  hot in July and which head the mower keeps clipping. That turns an hour of diagnostics
                  on the clock into a 20-minute fix.
                </p>
                <p>
                  I live in Erie with my wife and three boys. I&apos;ve worked on hundreds of Front Range
                  yards over more than ten years, through freeze-thaw winters, drought stages and heavy clay.
                  My customers are my neighbors.
                </p>
              </div>
            </div>
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
                Based in Erie, serving six cities
              </h2>
              <div className="flex flex-col gap-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  Erie is one of the fastest-growing towns in Colorado. Thousands of new homes
                  are going in every year in neighborhoods like Baseline, Colliers Hill, and
                  Alder Creek. Most of those homes come with a sprinkler system the owner has
                  never operated before.
                </p>
                <p>
                  We know Erie&apos;s clay soil, the water pressure differences between older and
                  newer developments, and what the Town of Erie&apos;s watering restrictions mean for
                  your schedule. We also serve Longmont, Louisville, Lafayette, Firestone, Broomfield
                  and Weld County.
                </p>
                <p>
                  Repairs, turn-ons and blowouts book online. New systems start with a yard visit.
                </p>
              </div>
              <Link href="/book" className={cn(buttonVariants({ size: "lg" }), "w-fit mt-2")}>
                Book Online
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
