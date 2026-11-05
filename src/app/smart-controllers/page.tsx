import type { Metadata } from "next"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SplitSection } from "@/components/sections/SplitSection"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Wifi, Droplets, CloudRain, ArrowRight } from "lucide-react"
import { siteConfig, faqJsonLd, reviewsJsonLd, breadcrumbJsonLd } from "@/lib/seo"
import { Testimonials } from "@/components/sections/Testimonials"
import { pickReviews } from "@/lib/reviews"
import { CITY_RACHIO, RACHIO_PRICING, estimateNetCost } from "@/lib/rachio-data"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList, type DefinitionItem } from "@/components/sections/DefinitionList"

export const metadata: Metadata = {
  title: "Rachio Smart Controllers in Erie, CO",
  description:
    "Rachio 3 smart controller installation in Erie, Longmont, Louisville & Lafayette. Save 20-30% on outdoor water use. We install, you claim the rebate.",
  alternates: { canonical: `${siteConfig.url}/smart-controllers` },
}

const RACHIO_DEFINITIONS: DefinitionItem[] = [
  {
    term: "What is a Rachio?",
    definition:
      "Rachio is a Wi-Fi-enabled smart sprinkler controller that replaces a traditional irrigation timer. The Rachio 3, the current flagship, uses hyperlocal weather data and an EPA WaterSense-certified algorithm to skip watering before rain or freeze and adjust run times across the season.",
  },
  {
    term: "What is WaterSense certification?",
    definition:
      "WaterSense is the EPA's certification program for water-efficient products. WaterSense-certified controllers are the only ones eligible for utility rebates in Erie, Longmont, Louisville, and Lafayette. Rachio 3, Hunter Hydrawise, and Rain Bird ESP-Me3 all qualify.",
  },
  {
    term: "What is Slow the Flow?",
    definition:
      "Slow the Flow is a free sprinkler-evaluation program run by Resource Central for Front Range water customers. In some cities (Louisville, Lafayette) it's also the gateway to a free Rachio install. Trailhead is not affiliated with Resource Central; it's a community program.",
  },
  {
    term: "What is evapotranspiration (ET)?",
    definition:
      "ET is the rate at which water evaporates from soil and transpires from plants. Smart controllers combine ET with local weather to work out how much water each zone needs that day, instead of running the same schedule all year.",
  },
]

const SMART_CONTROLLER_FAQS = [
  {
    question: "How much does a Rachio installation cost in Erie, CO?",
    answer:
      "Trailhead's installed Rachio 3 price is $350 for an 8-zone controller and $420 for a 16-zone controller. Erie offers a $100 utility-bill rebate on any WaterSense-certified smart controller, applied for separately by the homeowner. Louisville residents may also qualify for a free Rachio install through Resource Central's Slow the Flow program (limited slots).",
  },
  {
    question: "Is the Rachio 3 worth it in Northern Colorado?",
    answer:
      "Yes. Smart controllers like the Rachio 3 cut outdoor water use by 20–30% on typical Front Range homes — about 8,000–15,000 gallons saved per year. Most homeowners recoup the install cost in 2–3 watering seasons through reduced water bills alone.",
  },
  {
    question: "What rebates are available for a Rachio in my city?",
    answer:
      "Erie offers $100, Longmont offers up to $65 plus a $50 bonus (with a free Slow the Flow evaluation), Louisville offers free installs via Resource Central, and Lafayette offers either a utility rebate or a free install path. Programs are first-come, first-served and amounts can change. Visit your city's water rebate page to confirm current amounts before booking.",
  },
  {
    question: "Do I need to buy the Rachio before you install it?",
    answer:
      "No. Trailhead's installed price includes the controller and professional installation. We bring the right model for your zone count, mount it, wire it to your existing valves, set up your Wi-Fi, build your zone schedules, and walk you through the app before we leave.",
  },
  {
    question: "How long does a Rachio installation take?",
    answer:
      "A typical Rachio install takes 60–90 minutes including app setup, Wi-Fi connection, zone naming, and scheduling. We replace the wiring from your existing controller (no rerunning sprinkler valve wires), so the disruption to your system is minimal.",
  },
  {
    question: "Will Rachio work with my existing sprinkler valves?",
    answer:
      "Yes. Rachio is compatible with virtually all standard 24V residential sprinkler valves (Hunter, Rain Bird, Toro, Irritrol, etc.). If your system uses an unusual valve type, we'll spot it when we look at your system and tell you what will work.",
  },
]

const COMPETITORS = [
  {
    name: "Rachio 3",
    isHighlight: true,
    setup: "10–15 min app-driven setup",
    zones: "8 / 16 zone models",
    weatherIntel: "Hyperlocal weather + EPA WaterSense",
    rebates: "Erie, Longmont, Louisville, Lafayette rebates",
    installPrice: "$350 / $420 installed",
    bestFor: "Most homeowners. Best app, simplest install, broadest rebate eligibility.",
  },
  {
    name: "Hunter Hydrawise",
    isHighlight: false,
    setup: "Web + app, deeper menus",
    zones: "6 / 12 / 24 zone models",
    weatherIntel: "Predictive Watering™ algorithm",
    rebates: "Eligible (WaterSense)",
    installPrice: "Comparable",
    bestFor: "Pros and large lots that need fine-grained scheduling.",
  },
  {
    name: "Rain Bird ESP-Me3",
    isHighlight: false,
    setup: "Hardwired wifi module",
    zones: "Up to 22 zones modular",
    weatherIntel: "ET-based via Rain Bird app",
    rebates: "Eligible (WaterSense)",
    installPrice: "Comparable",
    bestFor: "Existing Rain Bird systems where compatibility matters.",
  },
]

const SERVICE_AREA_CITIES = [
  "Erie, CO",
  "Longmont, CO",
  "Louisville, CO",
  "Lafayette, CO",
  "Firestone, CO",
  "Broomfield, CO",
]

// Proof on the page that sells the service: only reviews whose own
// text is about smart-controller, with schema matching what is displayed.
const CONTROLLER_REVIEWS = pickReviews("Brian Taylor", "Jeremy Hampton")

export default function SmartControllersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(SMART_CONTROLLER_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Smart Controllers", url: `${siteConfig.url}/smart-controllers` },
            ])
          ),
        }}
      />
      {/* Service schema for the Rachio install.
          Deliberately Service rather than Product: Trailhead sells the
          installation, not a boxed retail item. Product markup put this page
          into Google's Merchant listings pipeline, which reported a "Missing
          field image" issue on 2026-08-20 and would keep demanding
          retail-only fields (shipping, returns) that don't apply to a local
          contractor. Both priced offers are preserved. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": `${siteConfig.url}/#service-rachio-install`,
            name: "Rachio 3 Smart Sprinkler Controller Installation",
            description:
              "Professional installation of the WaterSense-certified Rachio 3 Wi-Fi smart sprinkler controller by a licensed Erie sprinkler contractor. Includes the controller, mounting, wiring, Wi-Fi setup, zone programming, and an app walkthrough. Cuts outdoor water use by 20-30% on a typical Northern Colorado home.",
            serviceType: "Smart Sprinkler Controller Installation",
            brand: { "@type": "Brand", name: "Rachio" },
            provider: { "@id": `${siteConfig.url}/#business` },
            areaServed: SERVICE_AREA_CITIES,
            url: `${siteConfig.url}/smart-controllers`,
            offers: [
              {
                "@type": "Offer",
                name: "Rachio 3, 8 Zone, Installed",
                price: String(RACHIO_PRICING.controller8Zone),
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                seller: { "@id": `${siteConfig.url}/#business` },
                areaServed: SERVICE_AREA_CITIES,
              },
              {
                "@type": "Offer",
                name: "Rachio 3, 16 Zone, Installed",
                price: String(RACHIO_PRICING.controller16Zone),
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                seller: { "@id": `${siteConfig.url}/#business` },
                areaServed: SERVICE_AREA_CITIES,
              },
            ],
          }),
        }}
      />

      <PageBanner
        title="Rachio Smart Sprinkler Controller Installation"
        description="Professional Rachio 3 install in Erie, Longmont, Louisville, Lafayette & Weld County. Net cost as low as $170 after rebates."
        backgroundImage="/images/lawn-sprinkler-water.jpg"
      />

      {/* HERO VALUE PROP */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <SplitSection
            image={{ src: "/images/rachio-3-studio.jpg", alt: "Rachio 3 smart sprinkler controller" }}
            className="mb-14"
          >
              <SectionHeader
                tagline="Save 20 to 30% on outdoor water use"
                taglineAsEyebrow
                title="Rachio 3 installed for $350. Your city pays part of it back."
                description="Since Erie's March 2026 water emergency a lot of homeowners here are looking hard at their watering. A Rachio 3 skips watering before rain or a freeze and adjusts run times by season, and Erie, Longmont, Louisville and Lafayette each offer a rebate on it."
                align="left"
              />
          </SplitSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Wifi className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Wi-Fi + Weather-Smart</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Skips watering before rain, wind, or freeze. Adjusts run times each season automatically based on hyperlocal weather.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Droplets className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">EPA WaterSense Certified</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Qualifies for the Erie, Longmont, Louisville and Lafayette rebates. No subscription fee.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CloudRain className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Erie Drought-Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Set your city&apos;s watering days once and it keeps to them, including emergency restrictions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* WATER SAVINGS CALCULATOR CTA */}
      <section className="bg-navy section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl text-center">
          <SectionHeader
            tagline="Water savings calculator"
            taglineAsEyebrow
            title="How much water will you save?"
            description="Enter your lawn size and get the gallons and dollars a Rachio 3 saves, using EPA WaterSense averages."
            tone="dark"
            className="mb-6"
          />
          <Link
            href="/smart-controllers/water-savings-calculator"
            className={buttonVariants({ size: "lg" })}
          >
            Open the Water Savings Calculator
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* PRICING TABLE */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            tagline="Transparent pricing"
            taglineAsEyebrow
            title="Rachio 3, installed"
            description="Includes the controller, professional installation, Wi-Fi setup, zone naming, and a walkthrough of the app."
            className="mb-10"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="flex flex-col">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2">8-Zone</Badge>
                <CardTitle className="text-2xl">Rachio 3, 8 zone</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">$350</span>
                  <span className="text-muted-foreground text-sm">installed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Best for most residential systems with 8 or fewer zones.
                </p>
                <Link href="/book" className={cn(buttonVariants({ size: "lg" }), "w-full mt-auto")}>
                  Book Online
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col border-primary/30">
              <CardHeader>
                <Badge variant="green" className="w-fit mb-2">16-Zone</Badge>
                <CardTitle className="text-2xl">Rachio 3, 16 zone</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">$420</span>
                  <span className="text-muted-foreground text-sm">installed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  For larger lots or homes with separate front/back/drip zone systems.
                </p>
                <Link href="/book" className={cn(buttonVariants({ size: "lg" }), "w-full mt-auto")}>
                  Book Online
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* PER-CITY REBATE SNAPSHOT */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Rachio rebates by city"
            description="Every Northern Colorado city runs its own program. Click your city for full details on rebate amounts, eligibility, and your expected net cost."
            className="mb-10"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CITY_RACHIO.map((city) => {
              const est = estimateNetCost(city, 8)
              return (
                <Card key={city.slug} className="flex flex-col hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-xl">{city.name}, CO</CardTitle>
                    <Badge variant={city.rebateType === "none" ? "outline" : "green"} className="w-fit">
                      {city.rebateType === "free-install"
                        ? "Free install available"
                        : city.rebateType === "cash-or-free"
                        ? "Cash rebate or free install"
                        : city.rebateType === "cash"
                        ? `Up to $${(city.cashRebate ?? 0) + (city.bonusRebate ?? 0)} rebate`
                        : "No utility rebate"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="text-sm text-muted-foreground">
                      {est.isFree ? (
                        <span className="text-success font-semibold">Net cost: free (Resource Central program)</span>
                      ) : (
                        <span>
                          Net 8-zone cost:{" "}
                          <span className="font-bold text-foreground">${est.net}</span>
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/smart-controllers/${city.slug}`}
                      className={cn(buttonVariants({ variant: "outline" }), "w-full mt-auto")}
                    >
                      See {city.name} details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            tagline="Comparison"
            taglineAsEyebrow
            title="Rachio 3 vs Hunter Hydrawise vs Rain Bird ESP-Me3"
            description="All three are WaterSense certified and qualify for Northern Colorado rebates. The differences are the app, the setup and the price."
            className="mb-10"
          />

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm md:text-base">
              <thead className="bg-cream">
                <tr>
                  <th scope="col" className="p-4 font-semibold text-foreground">Feature</th>
                  {COMPETITORS.map((c) => (
                    <th
                      key={c.name}
                      scope="col"
                      className={cn(
                        "p-4 font-semibold",
                        c.isHighlight ? "text-primary" : "text-foreground"
                      )}
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Setup experience", key: "setup" as const },
                  { label: "Available models", key: "zones" as const },
                  { label: "Weather intelligence", key: "weatherIntel" as const },
                  { label: "Rebate eligibility", key: "rebates" as const },
                  { label: "Installed price", key: "installPrice" as const },
                  { label: "Best for", key: "bestFor" as const },
                ].map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="p-4 font-medium text-foreground">{row.label}</th>
                    {COMPETITORS.map((c) => (
                      <td
                        key={c.name + row.key}
                        className={cn(
                          "p-4 text-muted-foreground",
                          c.isHighlight && "text-foreground"
                        )}
                      >
                        {c[row.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-sm text-muted-foreground text-center max-w-2xl mx-auto">
            We install Hunter and Rain Bird too. We recommend the Rachio 3 to most Erie homeowners for the simplest app, the broadest rebate eligibility and the most reliable Wi-Fi pairing.
          </p>
        </div>
      </section>

      {/* DEFINITIONS */}
      <section className="bg-cream section-padding-y" aria-labelledby="rachio-definitions">
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader title="Smart controller terms, explained" titleId="rachio-definitions" className="mb-10" />

          <DefinitionList items={RACHIO_DEFINITIONS} variant="card" itemBg="background" columns={2} />
        </div>
      </section>

      {CONTROLLER_REVIEWS.length > 0 && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(reviewsJsonLd(CONTROLLER_REVIEWS)),
            }}
          />
          <Testimonials
            reviews={CONTROLLER_REVIEWS}
            heading="What Smart Controller Customers Say"
            description="Google reviews from homeowners running a controller we installed."
            bg="background"
            headingId="controller-reviews"
          />
        </>
      )}

      {/* FAQ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="Smart controller questions" titleId="rachio-faq" className="mb-10" />
          <FaqList faqs={SMART_CONTROLLER_FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
