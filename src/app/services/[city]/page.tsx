import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Check, Droplets, Wrench, Snowflake, MapPin, Phone, AlertTriangle } from "lucide-react"
import { breadcrumbJsonLd, faqJsonLd, siteConfig } from "@/lib/seo"
import { CITY_DATA, getCityData } from "@/lib/city-data"

export function generateStaticParams() {
  return CITY_DATA.map((city) => ({ city: city.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city } = await params
  const data = getCityData(city)
  if (!data) return { title: "Not Found" }
  return {
    title: `Sprinkler Company in ${data.name}, CO | Installation, Repair & Maintenance`,
    description: `${data.name}'s trusted local sprinkler company. Lawn sprinkler installation, sprinkler repair, winterization blowout & spring turn-on in ${data.name}, Colorado. Serving ${data.county}.`,
    alternates: { canonical: `${siteConfig.url}/services/${data.slug}` },
  }
}

const SERVICES = [
  {
    title: "Sprinkler Installation",
    description: "Custom residential sprinkler system design and installation. Zone layout, efficient heads, smart controllers, and a full walkthrough when we're done.",
    icon: Droplets,
    href: "/services",
  },
  {
    title: "Sprinkler Repair",
    description: "Broken heads, sprinkler leaks, valve problems, pipe breaks, and controller issues. We diagnose and fix sprinkler problems fast.",
    icon: Wrench,
    href: "/services",
  },
  {
    title: "Winterization & Spring Turn-On",
    description: "Professional sprinkler blowout in the fall to prevent freeze damage. Spring startup with leak checks, head adjustments, and controller programming.",
    icon: Snowflake,
    href: "/book",
  },
]

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  const data = getCityData(city)
  if (!data) notFound()

  const otherCities = CITY_DATA.filter((c) => c.slug !== data.slug)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Services", url: `${siteConfig.url}/services` },
              { name: data.name, url: `${siteConfig.url}/services/${data.slug}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(data.faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Sprinkler Company",
            provider: { "@id": `${siteConfig.url}/#business` },
            areaServed: {
              "@type": "City",
              name: data.name,
              containedInPlace: { "@type": "State", name: "Colorado" },
            },
            description: `Sprinkler installation, repair, winterization and spring turn-on in ${data.name}, CO.`,
          }),
        }}
      />

      <PageBanner
        title={`Sprinkler Services in ${data.name}, Colorado`}
        description={`Your local sprinkler company serving ${data.name} and ${data.county}.`}
      />

      {/* Intro */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            {data.introText}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              {data.name}, {data.county}
            </span>
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-primary" />
              Pop. {data.population}
            </span>
            <span className="flex items-center gap-1.5">
              <Snowflake className="h-4 w-4 text-primary" />
              Elevation: {data.elevation}
            </span>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            What We Do in {data.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <Card key={service.title} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <service.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Local Water Info */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            {data.name} Water & Irrigation Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Watering Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  Watering Restrictions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {data.restrictionLevel === "mandatory" && (
                  <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">Mandatory year-round restrictions</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{data.restrictionSummary}</p>
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Watering schedule:</p>
                  <p className="text-muted-foreground">{data.wateringDays}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Time restrictions:</p>
                  <p className="text-muted-foreground">{data.wateringTimeRestriction}</p>
                </div>
              </CardContent>
            </Card>

            {/* Backflow Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Backflow Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Deadline:</p>
                  <p className="text-muted-foreground">{data.backflowDeadline}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Required device:</p>
                  <p className="text-muted-foreground">{data.backflowDevice}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  We offer certified backflow testing as a standalone service or bundled with your spring turn-on.
                </p>
              </CardContent>
            </Card>

            {/* Soil & Terrain */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Soil & Terrain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{data.soilType}</p>
              </CardContent>
            </Card>

            {/* Water Provider */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Water Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{data.waterProvider}</p>
                {data.waterProviderPhone && (
                  <a href={`tel:${data.waterProviderPhone.replace(/[^0-9]/g, "")}`} className="text-sm text-primary hover:underline">
                    {data.waterProviderPhone}
                  </a>
                )}
                {data.waterProviderEmail && (
                  <a href={`mailto:${data.waterProviderEmail}`} className="text-sm text-primary hover:underline">
                    {data.waterProviderEmail}
                  </a>
                )}
              </CardContent>
            </Card>
          </div>

          {/* City-specific note */}
          {data.cityNote && (
            <div className="mt-8 p-5 bg-stone rounded-lg border border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Good to know:</strong> {data.cityNote}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why Local */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Why Choose a Local Sprinkler Company for {data.name}?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{data.whyLocal}</p>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-foreground">We know {data.name}&apos;s soil, water restrictions, and local rules</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-foreground">Based in Erie — fast response times to {data.name}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-foreground">Licensed, insured, and certified for backflow testing</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <span className="text-foreground">Transparent pricing — no hidden fees or surprise charges</span>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Frequently Asked Questions — {data.name}
          </h2>
          <div className="flex flex-col gap-4">
            {data.faqs.map((faq) => (
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

      {/* Other cities */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            We Also Serve
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {otherCities.map((c) => (
              <Link
                key={c.slug}
                href={`/services/${c.slug}`}
                className={cn(buttonVariants({ variant: "outline" }), "justify-center")}
              >
                {c.name}, CO
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
