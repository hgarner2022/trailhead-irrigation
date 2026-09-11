import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { JobberEmbed } from "@/components/sections/JobberEmbed"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Phone } from "lucide-react"
import { breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  // Plain title (no brand). Root layout's title.template appends
  // "| Trailhead Lawn & Irrigation" once.
  title: "Book a Service",
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
        <div className="container-padding-x mx-auto max-w-3xl flex flex-col gap-6">
          <JobberEmbed />
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            By booking, you agree to our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms &amp; Conditions
            </Link>
            , including the cancellation policy, and consent to receive
            scheduling and service-related text messages and emails about your
            appointment. Msg &amp; data rates may apply. Reply STOP to opt out.
          </p>
        </div>
      </section>


      {/* Core aeration runs on its own Jobber form (see src/lib/jobber.ts), so
          it cannot appear in the list above. Without a signpost here, anyone
          who came to /book for aeration hits a form that does not offer it.
          Facts are the ones Ryan gave: $125 up to ~5,000 sq ft, window from
          the end of August through October. No process detail, no overseeding. */}
      <section
        aria-labelledby="book-aeration-cross"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-44 sm:h-auto sm:w-2/5 shrink-0">
                <Image
                  src="/images/aeration.jpg"
                  alt="Core aerator pulling plugs of soil out of a lawn"
                  fill
                  sizes="(min-width: 640px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col items-start gap-3 p-6 sm:p-7">
                <Badge variant="green">Aeration season is open</Badge>
                <h2
                  id="book-aeration-cross"
                  className="text-xl md:text-2xl font-bold text-foreground"
                >
                  Booking core aeration? It has its own form.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Aeration reduces soil compaction so water, air, and nutrients
                  reach the roots, which on Front Range clay is most of the
                  battle. From $125, and the window runs from the end of August
                  through October. You do not have to bundle it with anything.
                </p>
                <Link
                  href="/aeration"
                  className={cn(buttonVariants(), "mt-1")}
                >
                  Book core aeration
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Need a Sprinkler Installation or Custom Project?
          </h2>
          <p className="text-muted-foreground mb-6">
            New installations need a conversation first. Reach out and we&apos;ll
            get you a quote.
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
