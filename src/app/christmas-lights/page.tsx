import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Phone, Mail, Check } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Christmas Light Installation in Erie, CO",
  description:
    "Christmas light installation in Erie, Longmont, Louisville, Lafayette, Firestone & Broomfield. We supply the lights, hang them, and take them down in January.",
  alternates: { canonical: `${siteConfig.url}/christmas-lights` },
}

/**
 * Christmas light installation landing page.
 *
 * Everything on this page came from Hannah on 2026-10-09. Do not add to it
 * without asking her first. What she confirmed:
 *
 *   - Trailhead supplies the lights. Customers are not buying or storing them.
 *   - Takedown in January is included in the price.
 *   - Scope: rooflines and peaks, trees and bushes, walkways and railings,
 *     wreaths and garland.
 *   - Contact is phone and email only. No booking form exists for this service
 *     and there is no Jobber form id for it.
 *
 * Deliberately NOT on this page, because nobody has confirmed any of it:
 *   - Any price or starting price. Hannah: "Remove price and dates."
 *   - Install or takedown dates, or a booking deadline. Same instruction.
 *   - Bulb type, commercial-grade claims, timers, warranties, insurance,
 *     mid-season repair visits, or how the lights are stored off season.
 *   - Commercial work. The confirmed scope is residential.
 *
 * The irrigation angle is the one genuinely differentiated thing here and it
 * is true: Trailhead already services these customers' sprinkler systems, so
 * they know where heads and lines sit before anyone puts a ladder or a stake
 * in the yard. That is sourced from the business doing both, not invented.
 *
 * "Get a Free Quote" is used here at Hannah's explicit request (2026-10-09).
 * Note that 3cca994 stripped "free quote" language from every other surface as
 * house style, so this page is a deliberate exception rather than a regression.
 *
 * Lights are sourced from Heritage Plus, a trade holiday-lighting supplier
 * (heritageplus.com/holiday-lighting), per Hannah 2026-10-09. That supports
 * calling the product professional rather than retail. It does NOT support
 * naming a bulb type, LED vs incandescent, or claiming custom-cut C9 socket
 * wire, none of which anyone has confirmed. Ask before adding any of that.
 *
 * House style: no em dashes (18c9a89).
 */

const INCLUDED = [
  {
    title: "We supply the lights",
    body: "Professional holiday lighting product, not big-box retail strings. You are not buying anything, measuring anything, or finding somewhere to keep it all in February. The lights are ours and they leave with us.",
  },
  {
    title: "Rooflines and peaks",
    body: "The part most people hire out, because it is the part that involves a ladder in the cold on the steepest section of the house.",
  },
  {
    title: "Trees and bushes",
    body: "Wrapping trunks and lighting the shrubs and beds, so the yard reads as finished rather than just the roof being lit.",
  },
  {
    title: "Walkways and railings",
    body: "Paths, porch rails, and columns, which is what people actually see as they walk up to the door.",
  },
  {
    title: "Wreaths and garland",
    body: "Doors, windows, and garage surrounds.",
  },
  {
    title: "Takedown in January is included",
    body: "We come back and take it all down. It is part of the price, not a second call and a second bill in the new year.",
  },
]

const FAQS = [
  {
    question: "Do I need to buy the lights?",
    answer:
      "No. We supply them, and they are professional holiday lighting product rather than the strings you would pick up at a big-box store. There is nothing for you to buy, nothing to replace when a strand fails, and nothing sitting in a box in your garage for eleven months of the year.",
  },
  {
    question: "Does taking them down cost extra?",
    answer:
      "No. Takedown in January is included in the price. We come back, take everything down, and the lights go with us.",
  },
  {
    question: "What will you put lights on?",
    answer:
      "Rooflines and peaks, trees and bushes, walkways and railings, and wreaths and garland on doors, windows, and garage surrounds. Tell us what you have in mind and we will quote it.",
  },
  {
    question: "How much does Christmas light installation cost?",
    answer:
      "It depends on the house, how much of it you want lit, and what you want included. Give us a call or send an email and we will come out, look at it, and quote it.",
  },
  {
    question: "Why hire an irrigation company to hang Christmas lights?",
    answer:
      "Because we already know your yard. If we winterized your sprinklers we know where your heads, valve boxes, and lateral lines sit, which matters the moment anyone starts putting ladder feet and light stakes into a lawn. It is the same crew you already deal with, on a ladder instead of in your valve box.",
  },
  {
    question: "What areas do you cover?",
    answer:
      "The same area we cover for irrigation work: Erie, Longmont, Louisville, Lafayette, Firestone, Broomfield, and the surrounding Weld County communities.",
  },
  {
    question: "Can you hang lights if you have never worked on my property?",
    answer:
      "Yes. You do not need to be an existing customer. Get in touch and we will come take a look.",
  },
]

export default function ChristmasLightsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Christmas Lights",
                url: `${siteConfig.url}/christmas-lights`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Christmas Light Installation"
        description="We supply the lights, hang them, and come back in January to take them down."
      />

      {/* Answer first, then the one ask. Phone and email only: there is no
          booking form for this service. */}
      <section
        aria-labelledby="christmas-intro"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2
            id="christmas-intro"
            className="text-3xl md:text-4xl font-bold text-foreground mb-5"
          >
            Nobody actually enjoys the ladder part
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            Every year the same evening gets set aside for it, and every year it
            takes longer than planned, half a strand is dead, and the steep bit
            over the garage ends up skipped. Then it all has to come down again
            in January, usually in worse weather than it went up in.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            We do the whole thing instead. We bring the lights, we put them up,
            and we come back after the holidays and take them down. You get the
            house you had in mind without spending a weekend on a ladder.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="tel:9706927270"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              <Phone className="w-4 h-4" />
              Get a Free Quote
            </a>
            <a
              href="mailto:ryan@trailheadirrigation.com?subject=Christmas%20lights%20quote"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto"
              )}
            >
              <Mail className="w-4 h-4" />
              Email Ryan
            </a>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Call (970) 692-7270 or email and we will come out, look at the
            house, and give you a number.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section
        aria-labelledby="christmas-included"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            tagline="What is included"
            taglineAsEyebrow
            title="Lights up, lights down, nothing left to you"
            titleId="christmas-included"
            align="left"
            className="mb-10"
          />
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
            {INCLUDED.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The differentiator. True because the same business does both. */}
      <section
        aria-labelledby="christmas-why"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2
            id="christmas-why"
            className="text-2xl md:text-3xl font-bold text-foreground mb-5"
          >
            We already know what is under your lawn
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            This is the part most light companies cannot offer. A sprinkler
            system is a few inches under the grass, and December is exactly when
            people start driving stakes into a lawn for light runs and yard
            displays, and setting heavy ladder feet down wherever is convenient.
            A stake through a lateral line does not announce itself in winter.
            It waits until spring turn-on, when the system is pressurized again
            and a patch of lawn turns into a puddle.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            If we winterized your system we already know where the heads, the
            valve boxes, and the lines run, because we were the ones clearing
            them in October. So we work around them. It is the same crew you
            already deal with, on a ladder instead of in your valve box.
          </p>
          <div className="rounded-lg border border-border bg-cream p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Not had your sprinklers winterized yet this year? That comes
              first, and the window is closing.{" "}
              <Link
                href="/sprinkler-blowout"
                className="text-primary hover:underline font-medium"
              >
                See sprinkler blowouts
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section
        aria-labelledby="christmas-faq"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader
            title="Christmas Light FAQs"
            titleId="christmas-faq"
            className="mb-10"
          />
          <FaqList faqs={FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
