import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { Wrench, Receipt, ClipboardCheck, Droplets, ExternalLink, Check } from "lucide-react"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { CITIES, SLOW_THE_FLOW } from "@/lib/rebate-data"

export const metadata: Metadata = {
  title: "Water Efficiency Rebates | Erie, Longmont, Louisville & Lafayette",
  description:
    "Discover water efficiency rebates available in Erie, Longmont, Louisville, and Lafayette, CO. Smart controllers, efficient nozzles, drip conversions, and more. Trailhead Lawn & Irrigation provides the work and receipts — you apply for the rebate.",
  alternates: { canonical: `${siteConfig.url}/water-rebates` },
}

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Wrench,
    title: "We Do the Work",
    description: "Trailhead installs your smart controller, efficient nozzles, drip conversion, or other qualifying irrigation upgrades.",
  },
  {
    step: 2,
    icon: Receipt,
    title: "We Provide Your Receipts",
    description: "After the job, we give you itemized receipts with the make, model, and purchase details you need for your rebate application.",
  },
  {
    step: 3,
    icon: ClipboardCheck,
    title: "You Apply for Your Rebate",
    description: "Submit your application through your city's rebate portal. We link you directly to the right forms below.",
  },
]

export default function WaterRebatesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Water Rebates", url: `${siteConfig.url}/water-rebates` },
            ])
          ),
        }}
      />
      <PageBanner
        title="Water Efficiency Rebates"
        description="Save money on irrigation upgrades — see what rebates are available in your area."
      />

      {/* Intro */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl text-center">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Many communities in Northern Colorado offer rebates on water-efficient irrigation equipment — including smart controllers, high-efficiency nozzles, drip conversions, and more. Programs are funded on a first-come, first-served basis while funds are available.
          </p>
          <p className="text-lg text-foreground font-medium mt-4">
            Trailhead does the irrigation work and provides your receipts. You apply for the rebate through your city.
          </p>
          <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto">
            <strong>Please note:</strong> All rebate programs are first come, first served and subject to available funding. Program details, amounts, and eligibility requirements are set by each city and can change at any time. We encourage you to verify current information directly with your city before making purchasing decisions.
          </p>
        </div>
      </section>

      {/* City Selector Grid */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
            Find Rebates in Your City
          </h2>
          <p className="text-muted-foreground text-lg text-center mb-10 max-w-2xl mx-auto">
            Select your city to see available rebates, eligibility requirements, and how to apply.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CITIES.map((city) => (
              <Link key={city.slug} href={`/water-rebates/${city.slug}`} className="block">
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{city.name}, {city.state}</CardTitle>
                      <Badge variant="green">{city.badgeText}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-2">
                      {city.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <span className={buttonVariants({ variant: "default", size: "sm" })}>
                      View {city.name} Rebates
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Slow the Flow Callout */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Slow the Flow — Free Sprinkler Evaluation</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">A free community resource from Resource Central</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {SLOW_THE_FLOW.description}
              </p>
              <ul className="flex flex-col gap-2 mb-4">
                {SLOW_THE_FLOW.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> {SLOW_THE_FLOW.note}
              </p>
            </CardContent>
            <CardFooter className="gap-3 flex-wrap">
              <a
                href={SLOW_THE_FLOW.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                Sign Up for 2026
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
              <a
                href={SLOW_THE_FLOW.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Learn More
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary text-white text-xl font-bold">
                  {item.step}
                </div>
                <item.icon className="h-8 w-8 text-navy" />
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
