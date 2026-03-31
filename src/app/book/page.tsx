import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { JobberEmbed } from "@/components/sections/JobberEmbed"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowRight, Phone } from "lucide-react"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Book a Service | Trailhead Lawn & Irrigation",
  description:
    "Book sprinkler turn-on, system inspection, or winterization online. Serving Erie, Longmont, Louisville, Lafayette & Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/book` },
}

export default function BookPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Book a Service", url: `${siteConfig.url}/book` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Book Your Service"
        description="Select your service and pick a time that works for you."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <JobberEmbed />
        </div>
      </section>

      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Need an Installation, Repair, or Custom Project?
          </h2>
          <p className="text-muted-foreground mb-6">
            Some services require a conversation first. Reach out and we&apos;ll
            get you a free quote.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className={buttonVariants({ size: "lg" })}
            >
              Contact Us
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
      </section>
    </>
  )
}
