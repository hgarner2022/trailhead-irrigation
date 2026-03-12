import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Sprinkler Repair & Irrigation Pricing",
  description:
    "Transparent pricing for sprinkler repair, Wi-Fi controller install, manifold rebuilds, backflow repair, winterization, and spring activation in Erie, Longmont & Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/pricing` },
}

const PRICING_FAQS = [
  {
    question: "How much does sprinkler repair cost in Erie, CO?",
    answer:
      "Sprinkler repair starts at $110 for the first half hour, then $130/hour after that, plus parts. We have a half hour minimum for all repair visits.",
  },
  {
    question: "How much does sprinkler winterization cost in Northern Colorado?",
    answer:
      "Winterization (sprinkler blowout) costs $95 for the first six zones, plus $7 for each additional zone. We recommend scheduling between mid-October and early November.",
  },
  {
    question: "How much does a Wi-Fi sprinkler controller cost to install?",
    answer:
      "Wi-Fi controller installation ranges from $450 for a 6-zone controller to $550 for a 16-zone controller. This includes the controller and professional installation.",
  },
  {
    question: "Do you charge a trip fee or service call fee?",
    answer:
      "No hidden fees. Our repair pricing starts at $110 for the first half hour, which includes the trip to your property. You only pay for the time and parts needed.",
  },
  {
    question: "How much does spring sprinkler activation cost?",
    answer:
      "Spring activation starts at $110 with a minimum half hour charge, then $130/hour after. This includes turning on your system, checking for leaks, adjusting sprinkler heads, and minor repairs as needed.",
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
        description="Transparent, upfront pricing. No hidden fees."
      />

      {/* Repair Service Pricing */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
            <div className="flex flex-1 flex-col gap-6">
              <h2 className="text-3xl font-bold text-foreground">
                Repair Service Pricing
              </h2>
              <div className="flex flex-col gap-3">
                <PriceLine label="First 1/2 hour" price="$110" />
                <PriceLine label="Per hour after" price="$130/hour" />
                <p className="text-muted-foreground">
                  Half hour minimum. Plus parts.
                </p>
              </div>
            </div>
            <div className="w-full flex-1">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <Image
                  src="/images/service-area.png"
                  alt="Trailhead service area map"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Set Pricing */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Set Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PricingCard
              title="Wi-Fi Controller Install"
              items={[
                { label: "6-zone controller", price: "$450" },
                { label: "8-zone controller", price: "$475" },
                { label: "12-zone controller", price: "$525" },
                { label: "16-zone controller", price: "$550" },
              ]}
            />
            <PricingCard
              title="Manifold Rebuilds"
              items={[
                { label: "1st valve", price: "$375" },
                { label: "Each additional valve", price: "$90" },
              ]}
            />
            <PricingCard
              title="Backflow Repairs"
              items={[
                { label: '1" backflow', price: "$525" },
                { label: '3/4" backflow', price: "$500" },
              ]}
            />
            <PricingCard
              title="Sprinkler Shut Off Valve"
              items={[{ label: "Valve replacement", price: "$500" }]}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Seasonal Pricing */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Seasonal Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <PricingCard
              title="Winterization"
              items={[
                { label: "First six zones", price: "$95" },
                { label: "Each additional zone", price: "$7" },
              ]}
              note="Typical service: 1/2 – 1 hour"
            />
            <PricingCard
              title="Spring Activation"
              items={[
                { label: "Minimum half hour charge", price: "$110" },
                { label: "Per hour after", price: "$130/hour" },
              ]}
              note="Plus parts. Includes minor repairs as needed (declogging heads, nozzle replacements). Typical service: 1/2 – 1 hour."
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Additional Notes */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Additional Notes
          </h2>
          <div className="flex flex-col gap-6">
            <NoteCard
              title="Roots / Heavy Root Areas"
              text="Work in areas with heavy roots may incur an increased rate of $150/hour. We provide solutions for rerouting lines and preventative sprinkler care in heavy-rooted areas."
            />
            <NoteCard
              title="PVC Lateral Lines"
              text="We will not service sprinkler systems with PVC pipes going to the spray heads. Please verify your piping type before requesting service."
            />
            <NoteCard
              title="Scheduling"
              text="We assign service dates at the beginning of each week and notify clients of a general time the day prior to their appointment."
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* FAQ Section for AEO */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-4">
            {PRICING_FAQS.map((faq) => (
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

function PriceLine({ label, price }: { label: string; price: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border">
      <span className="text-foreground font-medium">{label}</span>
      <span className="text-primary text-xl font-bold">{price}</span>
    </div>
  )
}

function PricingCard({
  title,
  items,
  note,
}: {
  title: string
  items: { label: string; price: string }[]
  note?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex justify-between items-center py-1.5 border-b border-border last:border-0"
          >
            <span className="text-foreground">{item.label}</span>
            <span className="text-primary font-bold">{item.price}</span>
          </div>
        ))}
        {note && (
          <p className="text-sm text-muted-foreground mt-2">{note}</p>
        )}
      </CardContent>
    </Card>
  )
}

function NoteCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}
