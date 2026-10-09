import type { Metadata } from "next"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Phone, Check } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Christmas Light Installation in Erie, CO",
  description:
    "Residential Christmas light installation in Erie, Longmont, Louisville, Lafayette, Firestone & Broomfield. We supply the lights, hang them, and take them down in January.",
  alternates: { canonical: `${siteConfig.url}/christmas-lights` },
}

/**
 * Christmas light installation landing page.
 *
 * Copy angle is the holidays with your family, not the chore of the ladder.
 * The first version led on "you have never once enjoyed the ladder part",
 * which Hannah rightly called weird: it tells the reader how they feel and
 * opens on a negative. Lead on what they get, not what they avoid.
 *
 * Design direction is "dusk": the moment the lights come on. The page opens
 * on a full-bleed photograph at blue hour, whose sky sits almost exactly on
 * the brand navy, and runs warm amber against that cold ground the whole way
 * down. It deliberately does not use the PageBanner + alternating-section
 * pattern every other interior page uses, because that pattern had nothing to
 * say here and Hannah called the first attempt crappy, correctly.
 *
 * Type stays on the site's stack rather than introducing a display face. A
 * seasonal page that reads as a different company is worse than one that
 * earns its distinction from composition, imagery and hierarchy.
 *
 * FACTS. All confirmed by Hannah 2026-10-09. Do not add to these.
 *   - Trailhead supplies the lights. Customers buy and store nothing.
 *   - January takedown is included in the price.
 *   - Scope: rooflines and peaks, trees and bushes, walkways and railings,
 *     wreaths and garland.
 *   - Residential only. No commercial work.
 *   - Phone only. Hannah removed the email CTA. There is no booking form and
 *     no Jobber form id for this service.
 *   - C9 bulbs on socket wire, cut to length for each run. Confirmed by
 *     Hannah 2026-10-09. This is the real differentiator against retail
 *     string lights, which come in fixed lengths. Lights come from Heritage
 *     Plus, a trade holiday-lighting supplier. Still NOT confirmed and still
 *     not claimed: LED vs incandescent, wattage, bulb colours available.
 *
 * Deliberately absent, because nobody has confirmed it: price, install or
 * takedown dates, timers, warranties, insurance, mid-season repair visits,
 * and off-season storage.
 *
 * "Get a Free Quote" is used at Hannah's explicit request. 3cca994 stripped
 * that phrasing sitewide as house style, so this page is a deliberate
 * exception rather than a regression.
 *
 * Photography is Unsplash (licensed for commercial use). The hero is cropped
 * above a restaurant sign that was visible on the porch of the original, so
 * the page shows only residential-looking work. Swap both for photos of
 * Ryan's own jobs as soon as there are any.
 *
 * House style: no em dashes (18c9a89).
 */

const INCLUDED = [
  {
    title: "C9 bulbs, cut to your roofline",
    body: "Individual bulbs on socket wire, measured and cut for every run of your house. Retail strings come in fixed lengths, so they either fall short and leave a dark gap or overshoot and get doubled back on themselves. Ours follow the line of the roof.",
  },
  {
    title: "We supply everything",
    body: "You buy nothing. Come February there's nothing in your garage either.",
  },
  {
    title: "Rooflines and peaks",
    body: "The high, steep, awkward parts. This is the bit people hire out, and fair enough.",
  },
  {
    title: "Trees and bushes",
    body: "Trunks wrapped, shrubs and beds lit. It's what stops a house looking like only the roof got done.",
  },
  {
    title: "Walkways and railings",
    body: "Paths, porch rails, columns. The part people actually walk through on the way to your door.",
  },
  {
    title: "Takedown in January",
    body: "Included. We come back, take it all down, and it leaves with us. No second call, no second bill in the new year.",
  },
]


const FAQS = [
  {
    question: "What kind of lights do you use?",
    answer:
      "C9 bulbs on socket wire, cut to length for each run of your house. That is the difference between a professional install and a retail string. Store-bought lights come in fixed lengths, so a run either falls short and leaves a dark gap or overshoots and gets doubled back on itself. Cut-to-length wire follows the line of the roof exactly.",
  },
  {
    question: "Do I need to buy the lights?",
    answer:
      "No. We supply them. Nothing for you to buy, nothing to replace when a bulb fails, and nothing sitting in a box in your garage for eleven months of the year.",
  },
  {
    question: "Does taking them down cost extra?",
    answer:
      "No. Takedown in January is included in the price. We come back, take everything down, and the lights go with us.",
  },
  {
    question: "What will you put lights on?",
    answer:
      "Rooflines and peaks, trees and bushes, walkways and railings, and wreaths and garland on doors, windows and garage surrounds. Tell us what you have in mind and we will quote it.",
  },
  {
    question: "How much does Christmas light installation cost?",
    answer:
      "It depends on the house, how much of it you want lit, and what you want included. Call and we will come out, look at it, and give you a number.",
  },
  {
    question: "Do you do commercial buildings?",
    answer:
      "No. This is residential only, for houses in our service area.",
  },
  {
    question: "Why hire an irrigation company to hang Christmas lights?",
    answer:
      "Because we already know your yard. If we winterized your sprinklers we know where your heads, valve boxes and lateral lines sit, which matters the moment anyone starts putting ladder feet and light stakes into a lawn. It is the same crew you already deal with, on a ladder instead of in your valve box.",
  },
  {
    question: "What areas do you cover?",
    answer:
      "The same area we cover for irrigation work: Erie, Longmont, Louisville, Lafayette, Firestone, Broomfield and the surrounding Weld County communities.",
  },
  {
    question: "Do I have to be an existing customer?",
    answer:
      "No. Give us a call and we will come take a look at the house.",
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

      {/* Hero. Full bleed photograph at blue hour. The gradient is weighted to
          the bottom left so the type sits on the darkest part of the frame
          rather than over the lit gables. */}
      <section
        aria-labelledby="xmas-hero"
        className="relative isolate min-h-[560px] md:min-h-[680px] flex items-end overflow-hidden"
      >
        <Image
          src="/images/christmas-lights-hero.jpg"
          alt="Warm white bulbs outlining the rooflines, gables and bay windows of a house at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Two layered washes: a vertical lift for legibility, then a warm
            pool bottom-left so the frame feels lit rather than dimmed. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/55 to-charcoal/5"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/25 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(60% 55% at 12% 100%, rgba(217,119,6,0.45) 0%, rgba(217,119,6,0) 70%)",
          }}
        />

        <div className="relative container-padding-x mx-auto max-w-7xl w-full pb-14 md:pb-20 pt-32">
          <div className="max-w-3xl">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-primary-light mb-4">
              Residential Christmas lights
            </p>
            <h1
              id="xmas-hero"
              className="text-4xl md:text-6xl font-bold text-white leading-[1.05] mb-5"
            >
              Spend the holidays with your family, not on a ladder
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-8 max-w-xl">
              We bring the lights, put them up, and come back in January to
              take them down. All you have to do is look at them.
            </p>
            <a
              href="tel:9706927270"
              className={cn(
                buttonVariants({ size: "lg" }),
                "text-base shadow-lg shadow-primary/30"
              )}
            >
              <Phone className="w-4 h-4" />
              Get a Free Quote
            </a>
            <p className="text-sm text-white/60 mt-4">
              Call (970) 692-7270 and we will come look at the house.
            </p>
          </div>
        </div>
      </section>

      {/* The pitch. Deliberately short and wide-measure, sitting on cream so
          it reads as a breath after the dark hero. */}
      <section
        aria-labelledby="xmas-pitch"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2
            id="xmas-pitch"
            className="text-2xl md:text-3xl font-bold text-foreground leading-snug mb-5"
          >
            Pull into the driveway in December and it&apos;s already glowing.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            That&apos;s the whole point of them. It&apos;s also the part that
            tends to get lost somewhere around the second trip up the ladder,
            when it&apos;s getting dark and you&apos;ve found the dead strand.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            So let us do it. We measure the house, cut the wire to fit it, and
            put it up. In January we come back and all of it disappears, lights
            and clips and everything else, and your garage stays empty. You get
            the house you had in mind and you don&apos;t lose a weekend to it.
          </p>
        </div>
      </section>

      {/* What is included. Numbered rather than bulleted: it reads as a list
          of things being handled for you, which is the actual proposition. */}
      <section
        aria-labelledby="xmas-included"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                What is included
              </p>
              <h2
                id="xmas-included"
                className="text-3xl md:text-4xl font-bold text-foreground leading-tight"
              >
                Lights up, lights down,
                <br className="hidden md:block" /> nothing left to you
              </h2>
            </div>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
            {INCLUDED.map((item) => (
              <li
                key={item.title}
                className="bg-background p-7 flex flex-col gap-2"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 mb-1">
                  <Check className="h-4 w-4 text-primary" />
                </span>
                <p className="font-bold text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The differentiator, on navy with the roofline photograph bled to the
          edge. This is the one claim no lighting company can make, so it gets
          the heaviest treatment on the page. */}
      <section
        aria-labelledby="xmas-why"
        className="bg-navy relative overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[320px] lg:min-h-[560px] order-1 lg:order-none">
            <Image
              src="/images/christmas-lights-roofline.jpg"
              alt="Coloured bulbs clipped along the fascia of a house roofline against a dusk sky"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-navy/20 lg:bg-gradient-to-r lg:from-navy/60 lg:to-transparent"
            />
          </div>

          <div className="flex items-center">
            <div className="container-padding-x mx-auto max-w-xl py-16 md:py-24 lg:py-28">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-light mb-4">
                The part nobody else thinks about
              </p>
              <h2
                id="xmas-why"
                className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6"
              >
                We already know what is under your lawn
              </h2>
              <p className="text-white/75 leading-relaxed mb-4">
                Your sprinkler system sits a few inches under the grass, and
                December is exactly when people start driving stakes into a lawn
                for light runs and setting heavy ladder feet down wherever is
                convenient. A stake through a lateral line does not announce
                itself in winter. It waits until spring turn-on, when the system
                is pressurized again and a patch of lawn turns into a puddle.
              </p>
              <p className="text-white/75 leading-relaxed mb-8">
                If we winterized your system we already know where the heads,
                the valve boxes and the lines run, because we were the ones
                clearing them in October. So we work around them. Same crew you
                already deal with, on a ladder instead of in your valve box.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <Link
                  href="/blog/christmas-lights-without-damaging-sprinklers"
                  className="text-primary-light hover:text-white transition-colors font-semibold"
                >
                  How to hang lights without hitting a line
                </Link>
                <Link
                  href="/sprinkler-blowout"
                  className="text-white/60 hover:text-white transition-colors font-semibold"
                >
                  Sprinkler blowouts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section
        aria-labelledby="xmas-faq"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <h2
            id="xmas-faq"
            className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center"
          >
            Christmas Light FAQs
          </h2>
          <FaqList faqs={FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
