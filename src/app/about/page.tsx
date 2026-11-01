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
    "Meet Ryan Garner of Trailhead Lawn & Irrigation. Licensed sprinkler contractor with a decade of Front Range experience, serving Erie and nearby.",
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
