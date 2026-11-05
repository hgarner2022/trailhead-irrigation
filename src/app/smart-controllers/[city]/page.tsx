import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, MapPin, Calculator } from "lucide-react"
import { siteConfig, breadcrumbJsonLd, faqJsonLd, reviewsJsonLd } from "@/lib/seo"
import {
  CITY_RACHIO,
  RACHIO_PRICING,
  estimateNetCost,
  getCityRachio,
} from "@/lib/rachio-data"
import { getCityData } from "@/lib/city-data"
import { FaqList } from "@/components/sections/FaqList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { Testimonials } from "@/components/sections/Testimonials"
import { reviewsFor } from "@/lib/reviews"

export function generateStaticParams() {
  return CITY_RACHIO.map((c) => ({ city: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city } = await params
  const data = getCityRachio(city)
  if (!data) return { title: "Not Found" }

  const eight = estimateNetCost(data, 8)
  const isNone = data.rebateType === "none"
  const desc = isNone
    ? `Rachio 3 installation in ${data.name}, CO. Installed price $${eight.gross}. Saves 8,000-15,000 gallons a year and pays back in a few seasons.`
    : eight.isFree
    ? `Rachio 3 installation in ${data.name}, CO with a free-install path via Resource Central. We install, you claim the rebate.`
    : eight.isUnknown
    ? `Rachio 3 installation in ${data.name}, CO. Installed price $${eight.gross}; the city runs a rebate program. Confirm the amount before booking.`
    : `Rachio 3 installation in ${data.name}, CO. Net cost about $${eight.net} after the city utility rebate. We install, you claim the rebate.`

  return {
    title: `Rachio Smart Controllers in ${data.name}, CO`,
    description: desc,
    alternates: {
      canonical: `${siteConfig.url}/smart-controllers/${data.slug}`,
    },
  }
}

const CONTROLLER_REVIEWS = reviewsFor("smart-controller", 3)

export default async function SmartControllerCityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: slug } = await params
  const program = getCityRachio(slug)
  if (!program) notFound()

  const cityMeta = getCityData(slug) // optional — provides soil, restrictions, etc.

  const est8 = estimateNetCost(program, 8)
  const est16 = estimateNetCost(program, 16)

  const lastUpdatedISO = new Date().toISOString()
  const lastUpdatedLabel = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const cityFaqs = program.rebateType === "none" ? [
    {
      question: `How much does a Rachio installation cost in ${program.name}, CO?`,
      answer: `Trailhead's installed Rachio 3 price is $${RACHIO_PRICING.controller8Zone} for 8 zones or fewer and $${RACHIO_PRICING.controller16Zone} for 9–16 zones. The install includes the controller, professional installation, Wi-Fi setup, zone naming, and a walkthrough of the Rachio app.`,
    },
    {
      question: `Does ${program.name} offer a smart-controller rebate?`,
      answer: `${program.name} doesn't currently run a city-administered smart-controller rebate program. The financial benefit of a Rachio comes from reduced outdoor water use — 20–30% savings on a typical Front Range home, or 8,000–15,000 gallons per year. Most homeowners recoup the install cost through reduced water bills within 2–4 watering seasons.`,
    },
    {
      question: `Why is a smart controller worth it without a rebate?`,
      answer: `Smart controllers like the Rachio 3 prevent the most common waste pattern in irrigation: running the same fixed schedule from May through September. The Rachio uses live local weather to skip watering before rain and freezes, and adjusts run times each season automatically. That is thousands of gallons a year on a typical lawn, and the grass does better because it gets water when the weather says it needs it.`,
    },
    {
      question: `Can Trailhead install a Rachio at my ${program.name} address?`,
      answer: `Yes. Trailhead is based in Erie and serves ${program.name} regularly. We'll bring the right Rachio 3 model for your zone count, mount it, wire it to your existing valves, and walk you through the app and watering schedule. Standard install takes 60–90 minutes.`,
    },
  ] : [
    {
      question: `How much does a Rachio cost in ${program.name}, CO after rebates?`,
      answer: est8.isFree
        ? `${program.name} water customers may qualify for a free Rachio 3 install through Resource Central's Slow the Flow program. ${program.freeInstallNote ?? ""} If a paid install fits your timeline better, Trailhead's price is $${RACHIO_PRICING.controller8Zone} for 8-zone or $${RACHIO_PRICING.controller16Zone} for 16-zone, including the controller and professional installation.`
        : est8.isUnknown
        ? `Trailhead's installed price is $${RACHIO_PRICING.controller8Zone} for an 8-zone Rachio 3 or $${RACHIO_PRICING.controller16Zone} for 16-zone. ${program.name} runs a smart-controller rebate program, but the city does not publish a current dollar amount. Contact ${program.name} to confirm the active rebate amount before booking — your net cost is the install price minus whatever rebate the city is currently offering.`
        : `Trailhead's installed price is $${RACHIO_PRICING.controller8Zone} for an 8-zone Rachio 3. With ${program.name}'s utility rebate ${program.cashRebate ? `of $${program.cashRebate}` : ""}${program.bonusRebate ? ` plus a $${program.bonusRebate} Slow the Flow bonus` : ""}, your estimated net is approximately $${est8.net}. For 16-zone, net is approximately $${est16.net}. The homeowner applies for the rebate directly with the city — Trailhead provides the itemized receipts.`,
    },
    {
      question: `What rebate does ${program.name} offer for a smart sprinkler controller?`,
      answer: program.shortNote,
    },
    {
      question: `Do I have to do anything special to qualify in ${program.name}?`,
      answer:
        program.rebateType === "free-install"
          ? `Yes. ${program.name}'s free Rachio install is run through Resource Central's Slow the Flow program. You'll need to sign up for the 2026 interest list at slowtheflow.resourcecentral.org and complete the eligibility application. Slots fill quickly each season.`
          : program.rebateType === "cash-or-free"
          ? `${program.name} offers two paths. The cash rebate path: buy and install a WaterSense controller, then submit receipts for credit. The free-install path: complete a Slow the Flow evaluation and join the queue for Resource Central's free Rachio install. Take whichever opens up first.`
          : `Yes. Buy and install a WaterSense-certified controller (Rachio 3 qualifies), then submit your application to ${program.name} with the receipt and model number. Trailhead provides itemized receipts at every install. Most rebates are credited to your water bill within one billing cycle.`,
    },
    {
      question: `Can Trailhead install a Rachio at my ${program.name} address?`,
      answer: `Yes. Trailhead is based in Erie and serves ${program.name} regularly. We'll bring the right Rachio 3 model for your zone count, mount it, wire it to your existing valves, and walk you through the app and watering schedule. Standard install takes 60–90 minutes.`,
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(cityFaqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Smart Controllers",
                url: `${siteConfig.url}/smart-controllers`,
              },
              {
                name: program.name,
                url: `${siteConfig.url}/smart-controllers/${program.slug}`,
              },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Rachio Smart Controller Installation",
            provider: { "@id": `${siteConfig.url}/#business` },
            areaServed: {
              "@type": "City",
              name: program.name,
              containedInPlace: { "@type": "State", name: "Colorado" },
            },
            description: `Professional Rachio 3 smart sprinkler controller installation in ${program.name}, CO.`,
            dateModified: lastUpdatedISO,
            offers: {
              "@type": "Offer",
              price: String(est8.net),
              priceCurrency: "USD",
              description: est8.isFree
                ? `Free install path available via Resource Central in ${program.name}`
                : est8.isUnknown
                ? `Trailhead installed price $${RACHIO_PRICING.controller8Zone} (8-zone). ${program.name} rebate amount varies — contact city to confirm.`
                : `Estimated net ~$${est8.net} after ${program.name} utility rebate. Rebate processed by the city, not Trailhead.`,
            },
          }),
        }}
      />

      <PageBanner
        title={`Rachio Smart Controllers in ${program.name}, CO`}
        description={`Rachio 3 installed for ${program.name} water customers. ${
          program.rebateType === "none"
            ? `$${est8.gross} for 8 zones, with your watering schedule set up before we leave. A typical home saves thousands of gallons a year.`
            : est8.isFree
            ? "Free install path available."
            : est8.isUnknown
            ? `$${est8.gross} for 8 zones. ${program.name} publishes its own rebate amount; confirm it with the city.`
            : `Estimated net cost as low as $${est8.net} after the city utility rebate.`
        }`}
        backgroundImage="/images/rachio-3-controller.jpg"
      />

      {/* HERO COST SUMMARY */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <SectionHeader
              taglineAsEyebrow
              tagline={program.rebateType === "free-install"
                ? "Free install available"
                : program.rebateType === "cash-or-free"
                ? "Cash rebate or free install"
                : program.rebateType === "cash"
                ? `Up to $${(program.cashRebate ?? 0) + (program.bonusRebate ?? 0)} in rebates`
                : "Long-term water savings"}
              title={`Rachio 3, installed in ${program.name}`}
              titleId="rachio-city-heading"
              description={program.shortNote}
            />
            <p className="mt-4 text-xs text-muted-foreground">
              <time dateTime={lastUpdatedISO}>Last updated {lastUpdatedLabel}</time>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="flex flex-col">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2">
                  8 zones or fewer
                </Badge>
                <CardTitle className="text-2xl">Rachio 3, 8 zones</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  {est8.isFree ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">Free path</span>
                      <p className="text-sm text-success font-medium mt-1">
                        via Resource Central program (limited slots)
                      </p>
                    </>
                  ) : est8.isUnknown ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${est8.gross}</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trailhead installed price · {program.name} rebate amount varies
                      </p>
                    </>
                  ) : program.rebateType === "none" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">${est8.gross}</span>
                        <span className="text-muted-foreground text-sm">installed</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Includes controller, install, Wi-Fi setup &amp; walkthrough
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground text-sm line-through">
                          ${est8.gross}
                        </span>
                        <span className="text-4xl font-bold text-foreground">
                          ${est8.net}
                        </span>
                      </div>
                      <p className="text-sm text-success font-medium mt-1">
                        Estimated after ${est8.rebates} {program.name} rebate
                      </p>
                    </>
                  )}
                </div>
                <Link
                  href="/book"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full mt-auto"
                  )}
                >
                  Book Online
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col border-primary/30">
              <CardHeader>
                <Badge variant="green" className="w-fit mb-2">
                  9–16 zones
                </Badge>
                <CardTitle className="text-2xl">Rachio 3, 16 zones</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  {est16.isFree ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">Free path</span>
                      <p className="text-sm text-success font-medium mt-1">
                        via Resource Central program (limited slots)
                      </p>
                    </>
                  ) : est16.isUnknown ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${est16.gross}</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trailhead installed price · {program.name} rebate amount varies
                      </p>
                    </>
                  ) : program.rebateType === "none" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">${est16.gross}</span>
                        <span className="text-muted-foreground text-sm">installed</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Includes controller, install, Wi-Fi setup &amp; walkthrough
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground text-sm line-through">
                          ${est16.gross}
                        </span>
                        <span className="text-4xl font-bold text-foreground">
                          ${est16.net}
                        </span>
                      </div>
                      <p className="text-sm text-success font-medium mt-1">
                        Estimated after ${est16.rebates} {program.name} rebate
                      </p>
                    </>
                  )}
                </div>
                <Link
                  href="/book"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full mt-auto"
                  )}
                >
                  Book Online
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/smart-controllers/water-savings-calculator"
              className={buttonVariants({ variant: "outline" })}
            >
              <Calculator className="w-4 h-4" />
              Estimate your water savings
            </Link>
          </div>

          {/* Bulletproof rebate disclaimer — only shown for cities that
              actually offer a rebate. */}
          {program.rebateType !== "none" && (
            <div className="mt-8 max-w-3xl mx-auto rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
              <strong>Estimate only.</strong> Trailhead does not administer, approve, submit, or guarantee any rebate.
              All rebate programs are run by your city or utility and are{" "}
              <strong>first-come, first-served while funds last</strong>.
              Eligibility requirements, dollar amounts, and program availability can change at any time without notice.
              Always confirm current details with{" "}
              {program.utilityRebateUrl ? (
                <a
                  href={program.utilityRebateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-950"
                >
                  the {program.name} water rebate program
                </a>
              ) : (
                `the ${program.name} water department`
              )}{" "}
              before booking an install.
            </div>
          )}
        </div>
      </section>

      {/* WHY RACHIO IN YOUR CITY */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <SectionHeader title={`Why a Rachio makes sense in ${program.name}`} align="left" className="mb-6" />
          <div className="max-w-none text-muted-foreground leading-relaxed flex flex-col gap-4">
            <p>
              <strong className="text-foreground">{program.name} water context.</strong>{" "}
              {cityMeta?.cityNote ??
                `${program.name} is part of the Northern Colorado Front Range, where dry summers and clay-heavy soils make irrigation efficiency the single biggest lever a homeowner can pull on outdoor water use.`}
            </p>
            <p>
              <strong className="text-foreground">What a smart controller actually does.</strong>{" "}
              A Rachio 3 replaces your existing sprinkler timer with a Wi-Fi-connected controller that pulls live local weather and skips watering before rain, freeze, or high winds. It also adjusts run times across the season — so you&apos;re not watering a July schedule in May. On a typical home, that&apos;s 8,000–15,000 gallons saved every year.
            </p>
            {cityMeta?.soilType && (
              <p>
                <strong className="text-foreground">{program.name} soil note.</strong>{" "}
                {cityMeta.soilType}
              </p>
            )}
            <p>
              <strong className="text-foreground">How Trailhead handles it.</strong>{" "}
              We bring the right Rachio 3 model for your zone count, mount it, swap the wiring from your old controller (no rerunning sprinkler valve wires), set up the app on your phone, and program your zones together with you before we leave. Most installs take 60–90 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* REBATE OR WATER-SAVINGS PITCH */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          {program.rebateType === "none" ? (
            <>
              <SectionHeader title={`Why a Rachio is worth it in ${program.name}`} align="left" className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-3xl font-bold text-foreground">20–30%</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reduction in outdoor water use vs. a standard timer (EPA WaterSense)
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-3xl font-bold text-foreground">8,000–15,000</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gallons saved per year on a typical Front Range home
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-3xl font-bold text-foreground">2–4 seasons</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Typical payback through reduced water bills alone
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-6 flex flex-col gap-3 text-muted-foreground leading-relaxed">
                  <p>
                    {program.name} doesn&apos;t run a smart-controller rebate. A Rachio still earns its price back on summer water bills, and it ends the fixed-timer habit of running July&apos;s schedule in May.
                  </p>
                  <p>
                    A Rachio that cuts outdoor use by 20 to 30% saves more every year water rates go up.
                  </p>
                  <p className="pt-2">
                    <Link
                      href="/smart-controllers/water-savings-calculator"
                      className="text-primary font-semibold hover:underline"
                    >
                      Estimate your savings
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <SectionHeader title={`How to claim your ${program.name} rebate`} align="left" className="mb-6" />
              <ol className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
                <li>
                  <strong className="text-foreground">1. Book your install.</strong>{" "}
                  Trailhead schedules and performs the Rachio installation at your {program.name} address.
                </li>
                <li>
                  <strong className="text-foreground">2. We provide itemized receipts.</strong>{" "}
                  Make, model, serial number, install date and total, which is what {program.name}&apos;s rebate program asks for.
                </li>
                <li>
                  <strong className="text-foreground">3. You apply for the rebate directly with the city.</strong>{" "}
                  {program.utilityRebateUrl ? (
                    <>
                      Submit your application and receipts through{" "}
                      <a
                        href={program.utilityRebateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        the {program.name} water rebate program
                      </a>
                      .
                    </>
                  ) : (
                    `Submit your application and receipts to the ${program.name} water rebate program.`
                  )}{" "}
                  The city approves and pays the rebate. Trailhead doesn&apos;t submit or guarantee it.
                </li>
              </ol>

              {program.bonusCondition && (
                <Card className="mt-6 border-primary/30 bg-primary/5">
                  <CardContent className="p-6">
                    <p className="text-foreground font-medium mb-2">
                      Bonus rebate available
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {program.bonusCondition}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </section>

      {/* Reviews sit directly above the FAQ on every interior page. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(CONTROLLER_REVIEWS)) }} />
      <Testimonials
        reviews={CONTROLLER_REVIEWS}
        heading="What smart controller customers say"
        description="Google reviews from homeowners running a controller we installed."
        bg="cream"
        headingId="controller-reviews"
      />

      {/* OTHER CITIES */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <SectionHeader title="Rachio install in another city?" className="mb-6" />
          <div className="flex flex-wrap justify-center gap-3">
            {CITY_RACHIO.filter((c) => c.slug !== program.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/smart-controllers/${c.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <MapPin className="w-4 h-4" />
                {c.name}, CO
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title={`Rachio questions for ${program.name}`} titleId="rachio-city-faq" className="mb-10" />
          <FaqList faqs={cityFaqs} itemBg="background" />
        </div>
      </section>


      <CTAStrip />
    </>
  )
}
