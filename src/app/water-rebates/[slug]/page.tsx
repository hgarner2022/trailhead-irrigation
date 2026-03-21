import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink, AlertTriangle, Check } from "lucide-react"
import { breadcrumbJsonLd, faqJsonLd, siteConfig } from "@/lib/seo"
import { CITIES, SLOW_THE_FLOW } from "@/lib/rebate-data"

export function generateStaticParams() {
  return CITIES.map((city) => ({ slug: city.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const city = CITIES.find((c) => c.slug === params.slug)
  if (!city) return {}
  return {
    title: `${city.name} Water Efficiency Rebates`,
    description: `Water efficiency rebates available for ${city.name}, ${city.state} residents. Smart controllers, efficient nozzles, drip conversions, and more. See amounts, eligibility, and how to apply.`,
    alternates: { canonical: `${siteConfig.url}/water-rebates/${city.slug}` },
  }
}

export default function CityRebatePage({ params }: { params: { slug: string } }) {
  const city = CITIES.find((c) => c.slug === params.slug)
  if (!city) notFound()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Water Rebates", url: `${siteConfig.url}/water-rebates` },
              { name: city.name, url: `${siteConfig.url}/water-rebates/${city.slug}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(city.faqs)),
        }}
      />

      <PageBanner
        title={`${city.name} Water Efficiency Rebates`}
        description={city.tagline}
      />

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <nav className="container-padding-x mx-auto max-w-7xl py-3 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/water-rebates" className="hover:text-primary transition-colors">Water Rebates</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{city.name}</span>
        </nav>
      </div>

      {/* Disclaimer */}
      <section className="bg-background">
        <div className="container-padding-x mx-auto max-w-7xl pt-8">
          <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Rebate amounts and availability are subject to change. Information last updated March 2026. Programs are first-come, first-served while funds are available.{" "}
              <a href={city.officialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                Visit {city.officialLabel} for the latest information
                <ExternalLink className="h-3 w-3 inline ml-1" />
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Rebate Cards */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Available Rebates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {city.rebates.map((rebate) => (
              <Card key={rebate.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-navy/10">
                        <rebate.icon className="h-5 w-5 text-navy" />
                      </div>
                      <CardTitle>{rebate.name}</CardTitle>
                    </div>
                    <Badge variant="green" className="shrink-0">{rebate.amount}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    {rebate.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {rebate.brands && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Approved brands:</span>
                      {rebate.brands.map((brand) => (
                        <Badge key={brand} variant="secondary" className="text-xs">{brand}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            How to Apply
          </h2>
          {city.howToApply.purchaseWindow && (
            <p className="text-center text-muted-foreground mb-6">
              <strong>Purchase window:</strong> {city.howToApply.purchaseWindow}
              {city.howToApply.submissionDeadline && (
                <> &middot; <strong>Deadline:</strong> {city.howToApply.submissionDeadline}</>
              )}
            </p>
          )}
          <ol className="flex flex-col gap-4">
            {city.howToApply.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <p className="text-foreground leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
          <div className="flex justify-center mt-8">
            <a href={city.applicationUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg">
                {city.applicationLabel}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Additional Resources
          </h2>

          {/* Slow the Flow */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Slow the Flow — Free Sprinkler Evaluation</CardTitle>
              {city.slowTheFlowRequired && (
                <Badge variant="default" className="w-fit">Required for {city.name} rebates</Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-3">
                {city.slowTheFlowNote}
              </p>
              <a href={SLOW_THE_FLOW.signupUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Sign Up at Resource Central
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* City-specific additional programs */}
          {city.additionalPrograms?.map((program) => (
            <Card key={program.name} className="mb-6">
              <CardHeader>
                <CardTitle>{program.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {program.description}
                </p>
                {program.url && (
                  <a href={program.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      Learn More
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Official city link */}
          <div className="text-center mt-8">
            <a href={city.officialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              Visit {city.officialLabel}
              <ExternalLink className="h-3 w-3 inline ml-1" />
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-4">
            {city.faqs.map((faq) => (
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
