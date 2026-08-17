import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { CITY_DATA } from "@/lib/city-data"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ArrowRight, Phone, AlertTriangle } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Sprinkler Blowout & Winterization in Erie, CO",
  description:
    "Sprinkler blowout $95 up to 8 zones. Compressed-air winterization in Erie, Longmont, Louisville & Lafayette. Book before the first hard freeze.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-blowout` },
}

/**
 * Dedicated blowout / winterization landing page.
 *
 * Why this page exists: GSC shows Trailhead already ranking position 1 for
 * "sprinkler blowout", "sprinkler system blowout", "irrigation winterization
 * near me", "blow out sprinkler system near me" and "sprinkler blowouts in
 * broomfield" — in August, dead off-season, with zero clicks. Those rankings
 * were the homepage matching by accident. This gives the demand a real page
 * to land on ahead of the October peak.
 *
 * Blowout is one of the three services the Jobber form takes online, so the
 * primary CTA goes straight to /book rather than a quote request.
 *
 * Pricing ($95 up to 8 zones, +$7/additional) matches the winterization
 * Service schema in seo.ts and the price card on /pricing. Keep them in sync.
 */

const BLOWOUT_FAQS = [
  {
    question: "How much does a sprinkler blowout cost?",
    answer:
      "A sprinkler blowout costs $95 for up to 8 zones, plus $7 for each additional zone. That's the whole price — we don't charge a trip fee, and there's no separate charge for shutting off and draining the backflow assembly.",
  },
  {
    question: "When should I winterize my sprinklers in Colorado?",
    answer:
      "Between mid-October and early November for the Front Range. The trigger is the first hard freeze, when overnight temperatures hit the mid-20s for several hours. A light frost won't hurt an in-ground system, but a hard freeze will. Waiting past the first week of November is gambling with the weather.",
  },
  {
    question: "What happens if I don't blow out my sprinkler system?",
    answer:
      "Water left in the lines expands about 9% when it freezes. That cracks PVC laterals, splits brass valve bodies, and ruptures the backflow assembly — which sits above ground and freezes first. Repairs typically run several hundred to well over a thousand dollars, and you don't find out until spring turn-on.",
  },
  {
    question: "Can't I just drain the system myself?",
    answer:
      "Draining helps but rarely finishes the job. Sprinkler laterals are laid flat or with slight rises, so gravity leaves water sitting in low spots, in the heads themselves, and in the valve bodies. Compressed air pushes water out of the places gravity can't reach. If your system has manual drain valves and perfect slope you can get close, but most systems in this area don't.",
  },
  {
    question: "How long does a blowout take?",
    answer:
      "Usually 20 to 40 minutes for a typical residential system. We shut off the water at the main irrigation valve, connect compressed air, and run each zone in sequence until it blows dry, then drain and insulate the backflow assembly.",
  },
  {
    question: "Do you need access to the inside of my house?",
    answer:
      "Usually not. Most irrigation shutoffs and backflow assemblies are outside or in an accessible basement utility area. If your shutoff is inside we'll need brief access, so it helps to be home. We'll tell you which applies when you book.",
  },
  {
    question: "What about my backflow preventer?",
    answer:
      "It's the most freeze-vulnerable part of the system because it sits above ground. We shut it off, open the test cocks to drain it fully, and insulate it. A cracked backflow assembly is one of the most common and most expensive freeze repairs we see in spring.",
  },
  {
    question: "Do you blow out drip irrigation zones too?",
    answer:
      "Yes. Drip zones and their filters and pressure regulators hold water and crack just like spray zones. We run air through drip zones at reduced pressure so we don't blow the emitters off the tubing.",
  },
  {
    question: "How early should I book?",
    answer:
      "October fills up. The last two weeks of October are the busiest of our year, and once a hard freeze is in the forecast the calendar goes fast. Booking in September gets you the date you want rather than whatever is left.",
  },
]

const DEFINITIONS = [
  {
    term: "Sprinkler blowout",
    definition:
      "Using compressed air to force water out of irrigation lines, heads, and valves before winter. Also called winterization. It's the only reliable way to clear water from lines that gravity can't drain.",
  },
  {
    term: "Hard freeze",
    definition:
      "Several consecutive hours at or below roughly 25°F. That's the point where standing water in shallow irrigation lines and above-ground backflow assemblies actually freezes solid and cracks the pipe.",
  },
  {
    term: "Backflow assembly",
    definition:
      "The valve unit that keeps irrigation water out of your drinking water. It sits above ground, holds water, and is the first thing to crack in a freeze — which is why draining and insulating it is part of every blowout.",
  },
  {
    term: "Test cocks",
    definition:
      "Small ports on the backflow assembly used for annual testing. Opened during winterization so the assembly drains completely instead of trapping water inside the body.",
  },
]

const PROCESS = [
  {
    step: "1",
    title: "Shut off the irrigation supply",
    body: "We close the main irrigation valve so no new water enters the system while we're clearing it.",
  },
  {
    step: "2",
    title: "Connect compressed air",
    body: "Air goes in at the blowout port downstream of the backflow. We run at a pressure the pipe and heads can take — high volume, controlled pressure, not a spike that damages fittings.",
  },
  {
    step: "3",
    title: "Blow each zone until dry",
    body: "Zone by zone, in sequence, watching each head until it's blowing air instead of mist. Skipping around leaves water behind, so this part isn't rushed.",
  },
  {
    step: "4",
    title: "Drain and insulate the backflow",
    body: "Test cocks opened, assembly drained, then insulated. This is the part homeowners most often miss and the most expensive one to get wrong.",
  },
  {
    step: "5",
    title: "Set the controller to off",
    body: "Controller switched to the off or rain position so it doesn't try to run a frozen system in March, and we note your zone count for next spring's turn-on.",
  },
]

const INCLUDED = [
  "Irrigation supply shut off at the main valve",
  "Compressed-air blowout of every zone, run until dry",
  "Drip zones cleared at reduced pressure",
  "Backflow assembly drained and insulated",
  "Controller set to off for winter",
  "Zone count recorded for next spring's turn-on",
  "No trip fee",
]

export default function SprinklerBlowoutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(BLOWOUT_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Sprinkler Blowout",
                url: `${siteConfig.url}/sprinkler-blowout`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler Blowout & Winterization"
        description="Compressed-air winterization before the first hard freeze. $95 up to 8 zones."
        backgroundImage="/images/sprinkler-spring.jpg"
      />

      {/* ════════════════════════════════════════════
          ANSWER-FIRST INTRO + PRICE + BOOK CTA
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="blowout-overview"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Erie &middot; Longmont &middot; Louisville &middot; Lafayette &middot; Firestone
              </Badge>
              <h2
                id="blowout-overview"
                className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              >
                Book your blowout before the first hard freeze
              </h2>
              <p className="text-muted-foreground mb-4">
                A sprinkler blowout costs{" "}
                <strong className="text-foreground font-semibold">
                  $95 for up to 8 zones
                </strong>{" "}
                (+$7 per additional zone) and takes{" "}
                <strong className="text-foreground font-semibold">
                  20 to 40 minutes
                </strong>
                . For the Front Range, the window is{" "}
                <strong className="text-foreground font-semibold">
                  mid-October through early November
                </strong>
                .
              </p>
              <p className="text-muted-foreground mb-6">
                Water expands when it freezes. Left in the lines it cracks PVC,
                splits valve bodies, and ruptures the backflow assembly — and
                you won&apos;t know until spring, when the repair costs several
                times what the blowout would have.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link
                  href="/book?service=winterization"
                  className={buttonVariants({ size: "lg" })}
                >
                  Book Your Blowout
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

            <div className="w-full lg:w-[380px] shrink-0">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-foreground">
                      October books out
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    The last two weeks of October are the busiest of our year.
                    Once a hard freeze shows up in the forecast, the calendar
                    fills within days. Booking in September gets you the date
                    you want.
                  </p>
                  <div className="border-t border-border pt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        $95
                      </span>
                      <span className="text-sm text-muted-foreground">
                        up to 8 zones
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      +$7 per additional zone &middot; no trip fee
                    </p>
                  </div>
                  <Link
                    href="/book?service=winterization"
                    className={buttonVariants({ className: "mt-5 w-full" })}
                  >
                    Book Online
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHAT HAPPENS IF YOU SKIP IT
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="blowout-risk"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-repair.jpg"
                  alt="Irrigation valve and pipe repair after freeze damage"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Why it matters here
              </Badge>
              <h2
                id="blowout-risk"
                className="text-2xl md:text-3xl font-bold text-foreground mb-4"
              >
                What freeze damage actually costs
              </h2>
              <p className="text-muted-foreground mb-5">
                Colorado&apos;s freeze-thaw cycle is harder on irrigation than a
                steady cold winter. We swing above freezing and back down
                repeatedly, so water in the lines freezes, expands, thaws, and
                does it again all winter.
              </p>
              <ul className="flex flex-col gap-4">
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    The backflow assembly goes first
                  </p>
                  <p className="text-sm text-muted-foreground">
                    It&apos;s above ground and full of water. A cracked assembly
                    is the single most common freeze repair we see at spring
                    turn-on, and it&apos;s the most expensive common one.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Cracks hide until spring
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A split lateral underground doesn&apos;t announce itself. You
                    find it when you pressurize in April and a section of yard
                    turns into a puddle — or worse, when it&apos;s quietly running
                    up a water bill.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Clay soil makes repairs worse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Digging a repair out of saturated clay is slower and messier
                    than the original install. A $95 blowout is cheap insurance
                    against it.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          PROCESS
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="blowout-process"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">
              What we do on site
            </Badge>
            <h2
              id="blowout-process"
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
            >
              How a proper blowout works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Five steps, 20 to 40 minutes. The order matters — skipping around
              between zones leaves water behind.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROCESS.map((p) => (
              <li key={p.step}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                        {p.step}
                      </span>
                      <h3 className="font-semibold text-foreground">
                        {p.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {p.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>

          <Card className="mt-8 bg-cream">
            <CardContent className="p-6">
              <p className="font-semibold text-foreground mb-4">
                What&apos;s included for $95
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CITY LINKS
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="blowout-cities"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2
              id="blowout-cities"
              className="text-2xl md:text-3xl font-bold text-foreground mb-3"
            >
              Where we winterize
            </h2>
            <p className="text-muted-foreground">
              Based in Erie, covering the surrounding Front Range and Weld
              County.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {CITY_DATA.map((city) => (
              <Link
                key={city.slug}
                href={`/services/${city.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Sprinkler blowout in {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TERMS
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="blowout-terms"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <div className="mb-10">
            <h2
              id="blowout-terms"
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
            >
              Winterization terms, explained
            </h2>
          </div>
          <DefinitionList items={DEFINITIONS} columns={2} />
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FAQs
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="blowout-faq"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 id="blowout-faq" className="text-3xl font-bold text-foreground">
              Sprinkler Blowout FAQs
            </h2>
          </div>
          <FaqList faqs={BLOWOUT_FAQS} itemBg="background" />
          <p className="text-sm text-muted-foreground text-center mt-8">
            Want the full timing breakdown?{" "}
            <Link
              href="/blog/when-to-winterize-sprinklers-colorado"
              className="text-primary hover:underline font-medium"
            >
              Read our winterization timing guide
            </Link>
            .
          </p>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
