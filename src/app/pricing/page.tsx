import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { MaintenancePlans } from "@/components/sections/MaintenancePlans"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Sun,
  Search,
  Snowflake,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Phone,
  Clock,
  Droplets,
} from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Sprinkler Service Pricing | Erie's Local Sprinkler Company",
  description:
    "How much does a sprinkler company charge? See transparent pricing for spring turn-on, sprinkler blowout, sprinkler repair, and maintenance plans in Erie, Longmont & Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/pricing` },
}

const PRICING_FAQS = [
  {
    question: "How much does a spring sprinkler turn-on cost?",
    answer:
      "Spring turn-on and system check starts at $130 for up to 8 zones, plus $10 per additional zone. This includes turn-on, full system check, adjustments, leak check, controller programming, and a water efficiency check.",
  },
  {
    question: "How much does sprinkler winterization cost in Northern Colorado?",
    answer:
      "Winterization (sprinkler blowout) costs $95 for up to 8 zones, plus $7 for each additional zone. We recommend scheduling between mid-October and early November.",
  },
  {
    question: "How do I get a repair quote?",
    answer:
      "Contact us to describe the issue and we will provide a quote. Repair pricing depends on the scope of work and materials needed. No hidden fees.",
  },
  {
    question: "What's included in the maintenance plans?",
    answer:
      "The Essential Plan (5% off) includes spring turn-on, winterization, priority scheduling, and 5% off all services — starting at $215 for up to 8 zones. The Complete Plan (10% off) adds a sprinkler inspection & tune-up and upgrades the discount to 10% off all services — starting at $310 for up to 8 zones. Plans cover only the services listed — materials and any additional repair work are invoiced separately.",
  },
  {
    question: "Do you install new irrigation systems?",
    answer:
      "Yes! New irrigation installations are quoted on a per-project basis since every property is different. Contact us for a free consultation and custom quote.",
  },
  {
    question: "Do you charge a trip fee or service call fee?",
    answer:
      "No hidden fees. Contact us for a repair quote — the trip to your property is included.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "We serve Erie, Longmont, Louisville, Lafayette, and surrounding communities in Northern Colorado and Weld County.",
  },
  {
    question: "Are there rebates available for irrigation upgrades?",
    answer:
      "Yes! Many local water utilities offer rebates for WaterSense-certified smart controllers. Check the Rachio rebates page at rachio.com/rebates to search by your zip code. Visit our Water Rebates page for additional programs in Erie, Longmont, Louisville, and Lafayette.",
    hasLink: true,
  },
]

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(PRICING_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Pricing", url: `${siteConfig.url}/pricing` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Pricing"
        description="Transparent, upfront pricing — no hidden fees, no surprises."
      />

      {/* ════════════════════════════════════════════
          SEASONAL SERVICES
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              Seasonal Services
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Individual Services
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Book any service on its own, or save with a maintenance plan below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Spring Turn-On */}
            <Card className="relative overflow-hidden border-border hover:border-primary/30 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Sun className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Spring Turn-On + System Check</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">$130</span>
                    <span className="text-muted-foreground text-sm">up to 8 zones</span>
                  </div>
                  <p className="text-sm text-primary font-medium mt-1">
                    +$10 per additional zone
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <ServiceItem>Turn-on &amp; full system check</ServiceItem>
                  <ServiceItem>Head adjustments &amp; leak check</ServiceItem>
                  <ServiceItem>Controller programming</ServiceItem>
                  <ServiceItem>Water efficiency check</ServiceItem>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">Materials not included if repairs are needed.</p>
                <Link href="/book" className={cn(buttonVariants({ size: "sm" }), "w-full mt-auto")}>
                  Book Online
                </Link>
              </CardContent>
            </Card>

            {/* Sprinkler Inspection & Tune-Up */}
            <Card className="relative overflow-hidden border-border hover:border-primary/30 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Sprinkler Inspection & Tune-Up</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-muted-foreground text-sm">Starting at</span>
                    <span className="text-3xl font-bold text-foreground">$130</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <ServiceItem>Full system check &amp; adjustments</ServiceItem>
                  <ServiceItem>Issue detection &amp; diagnostics</ServiceItem>
                  <ServiceItem>Water efficiency check</ServiceItem>
                  <ServiceItem>Recommendations report</ServiceItem>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">Materials not included if repairs are needed.</p>
                <Link href="/book" className={cn(buttonVariants({ size: "sm" }), "w-full mt-auto")}>
                  Book Online
                </Link>
              </CardContent>
            </Card>

            {/* Winterization */}
            <Card className="relative overflow-hidden border-border hover:border-primary/30 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                    <Snowflake className="w-5 h-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">Winterization (Blowout)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">$95</span>
                    <span className="text-muted-foreground text-sm">up to 8 zones</span>
                  </div>
                  <p className="text-sm text-primary font-medium mt-1">
                    +$7 per additional zone
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <ServiceItem>Complete system blowout</ServiceItem>
                  <ServiceItem>All zones cleared</ServiceItem>
                  <ServiceItem>Backflow protection</ServiceItem>
                  <ServiceItem>Winter-ready verification</ServiceItem>
                </ul>
                <Link href="/book" className={cn(buttonVariants({ size: "sm" }), "w-full mt-auto")}>
                  Book Online
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          REPAIRS & SERVICE
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1">
              <Badge variant="outline" className="mb-4">
                Repairs &amp; Service
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Expert Repairs
              </h2>
              <p className="text-muted-foreground mb-6">
                Troubleshooting, repairs, and system adjustments. Contact us for a quote tailored to your situation.
              </p>
              <ul className="flex flex-col gap-3 mb-8">
                <RepairFeature icon={<Wrench className="w-4 h-4" />}>
                  Troubleshooting &amp; diagnostics
                </RepairFeature>
                <RepairFeature icon={<CheckCircle2 className="w-4 h-4" />}>
                  Heads, valves, lines, controllers &amp; wiring
                </RepairFeature>
                <RepairFeature icon={<Clock className="w-4 h-4" />}>
                  No hidden fees
                </RepairFeature>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/contact"
                  className={buttonVariants({ size: "lg" })}
                >
                  Request a Quote
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="tel:9706927270"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <Phone className="w-4 h-4" />
                  (970) 692-7270
                </a>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="bg-cream rounded-xl border border-border p-6 md:p-8">
                <h3 className="font-semibold text-foreground mb-4">Common Repairs</h3>
                <div className="flex flex-col gap-3">
                  <RepairLine label="Sprinkler head replacement" />
                  <RepairLine label="Valve repair or replacement" />
                  <RepairLine label="Line break / pipe repair" />
                  <RepairLine label="Controller troubleshooting" />
                  <RepairLine label="Wiring repair" />
                </div>
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> We do not service sprinkler systems with PVC pipes going to the spray heads. Please verify your piping type before requesting service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          MAINTENANCE PLANS — INTERACTIVE
          ════════════════════════════════════════════ */}
      <MaintenancePlans />

      {/* ════════════════════════════════════════════
          PLAN COMPARISON TABLE — for AI / SEO extraction
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4">
              At a glance
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Maintenance Plan Comparison
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Side-by-side comparison of every Trailhead plan and individual service.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm md:text-base">
              <thead className="bg-cream">
                <tr>
                  <th scope="col" className="p-4 font-semibold text-foreground">
                    Feature
                  </th>
                  <th scope="col" className="p-4 font-semibold text-foreground">
                    À la carte
                  </th>
                  <th scope="col" className="p-4 font-semibold text-foreground">
                    Essential Plan
                  </th>
                  <th scope="col" className="p-4 font-semibold text-primary">
                    Complete Plan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Starting price (up to 8 zones)
                  </th>
                  <td className="p-4 text-muted-foreground">Pay per service</td>
                  <td className="p-4 text-muted-foreground">$215</td>
                  <td className="p-4 text-foreground font-semibold">$310</td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Spring turn-on + system check
                  </th>
                  <td className="p-4 text-muted-foreground">$130</td>
                  <td className="p-4 text-foreground">Included</td>
                  <td className="p-4 text-foreground">Included</td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Sprinkler winterization (blowout)
                  </th>
                  <td className="p-4 text-muted-foreground">$95</td>
                  <td className="p-4 text-foreground">Included</td>
                  <td className="p-4 text-foreground">Included</td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Mid-season inspection &amp; tune-up
                  </th>
                  <td className="p-4 text-muted-foreground">From $130</td>
                  <td className="p-4 text-muted-foreground">—</td>
                  <td className="p-4 text-foreground">Included</td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Discount on all repairs &amp; services
                  </th>
                  <td className="p-4 text-muted-foreground">—</td>
                  <td className="p-4 text-foreground">5% off</td>
                  <td className="p-4 text-foreground font-semibold">10% off</td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Priority scheduling
                  </th>
                  <td className="p-4 text-muted-foreground">—</td>
                  <td className="p-4 text-foreground">Yes</td>
                  <td className="p-4 text-foreground">Yes</td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-medium text-foreground">
                    Per additional zone (above 8)
                  </th>
                  <td className="p-4 text-muted-foreground">+$7–$10 / zone</td>
                  <td className="p-4 text-muted-foreground">+$17 / zone</td>
                  <td className="p-4 text-muted-foreground">+$27 / zone</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            Materials and any additional repair work are invoiced separately on every plan.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          IRRIGATION INSTALLS
          ════════════════════════════════════════════ */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl text-center">
          <div className="bg-background rounded-2xl border border-border p-8 md:p-12">
            <Badge variant="outline" className="mb-4">
              New Installations
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Irrigation System Installation
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              Every property is different. New irrigation installs are custom-quoted based on your lot size, soil conditions, zones needed, and water source. Contact us for a free consultation.
            </p>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
              Looking to improve your system&apos;s efficiency?{" "}
              <Link href="/water-efficiency" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                Check out our Water Efficiency Upgrades
              </Link>{" "}
              for smart controllers, MPR nozzles, and more.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg" })}
              >
                Request a Free Quote
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="tel:9706927270"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Phone className="w-4 h-4" />
                (970) 692-7270
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FAQs
          ════════════════════════════════════════════ */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {PRICING_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group border border-border rounded-lg hover:border-primary/20 transition-colors"
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
                  {"hasLink" in faq && faq.hasLink && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-3">
                      <a
                        href="https://www.rachio.com/rebates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
                      >
                        Rachio Rebates
                        <ArrowRight className="w-3 h-3" />
                      </a>
                      <Link
                        href="/water-rebates"
                        className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
                      >
                        Water Rebates
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
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

/* ─── Helper Components ─── */

function ServiceItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  )
}

function RepairFeature({
  children,
  icon,
}: {
  children: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-3 text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

function RepairLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
      <span className="text-foreground font-medium text-sm">{label}</span>
    </div>
  )
}
