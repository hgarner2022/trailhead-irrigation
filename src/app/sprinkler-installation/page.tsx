import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ArrowRight, Phone, XCircle } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Sprinkler Installation Services in Erie, CO",
  description:
    "New sprinkler system installation in Erie, Longmont, Louisville & Lafayette. Custom zone design for Colorado clay soil. What it costs, how long it takes.",
  alternates: { canonical: `${siteConfig.url}/sprinkler-installation` },
}

/**
 * Dedicated installation landing page.
 *
 * Why this page exists: GSC showed ~1,700 impressions across install-intent
 * queries ("irrigation installers near me", "irrigation system installation
 * erie co", etc.) at positions 1-5 with zero clicks, all landing on the
 * homepage — whose title leads with "Repair". Installation is also the
 * highest-ticket service on the site.
 *
 * Content strategy: the incumbent competitor pages ranking locally (Flatiron,
 * Pierce, Ward's) publish no pricing, no timeline, no permit/backflow detail,
 * and no soil specifics. Those are the gaps this page fills, since they're
 * exactly what someone comparing installers wants to know.
 *
 * Pricing figures match the range already published in seo.ts and
 * city-data.ts ($3,000-$6,000). Do not change them here in isolation.
 */

const INSTALL_FAQS = [
  {
    question: "How much does sprinkler installation cost in Erie, CO?",
    answer:
      "Most residential sprinkler installations in Erie and the surrounding area run $3,000 to $6,000. What moves the number is yard size, how many zones your layout needs, whether we're trenching through established landscaping, and the controller you choose. We quote on-site after walking the property, and the quote is the price.",
  },
  {
    question: "How long does it take to install a sprinkler system?",
    answer:
      "Most residential installs take one to two days on site. A larger property or a system over about ten zones can run into a third day. We do the design and walkthrough before install day, so once we start there's no waiting on decisions.",
  },
  {
    question: "How many zones does my yard need?",
    answer:
      "Zones are determined by water pressure and flow, not by preference. Your service line can only supply so many heads at once. A typical Erie lot lands between four and eight zones. Front and back get separated, lawn and planting beds get separated, and sun and shade areas get separated so each area can run on its own schedule.",
  },
  {
    question: "Do I need a permit or backflow device for a new sprinkler system in Colorado?",
    answer:
      "Yes to backflow. Colorado requires a backflow prevention assembly on any irrigation system connected to municipal water, and it has to be tested annually. Permit requirements vary by municipality, so check with your water provider. We install the backflow assembly as part of every new system and handle the initial test.",
  },
  {
    question: "Will you dig up my existing lawn?",
    answer:
      "We use a trenching machine that cuts a narrow slit rather than opening up the yard. Sod is folded back and replaced over the trench. It looks rough for two to three weeks, then it knits back in and you won't be able to tell where we were.",
  },
  {
    question: "When is the best time of year to install a sprinkler system in Colorado?",
    answer:
      "April through October, once the ground has thawed and before it freezes. Spring and early summer are the busiest, so booking a few weeks out is normal. Late summer and early fall are often the fastest turnaround, and installing in fall means your system is ready to go the following spring.",
  },
  {
    question: "Can you install a system that complies with local watering restrictions?",
    answer:
      "That's part of the design. Erie, Longmont, Louisville, and Lafayette each set their own watering day and time rules, and several have been under drought restrictions recently. We zone the system and program the controller so a compliant schedule still delivers enough water, which usually means a smart controller and cycle-and-soak run times for our clay soil.",
  },
  {
    question: "Do you install systems for new construction and new builds?",
    answer:
      "Yes. A lot of newer Erie neighborhoods — Erie Highlands, Collier's Hill, Flatiron Meadows, Compass — were sold without irrigation, or with a builder-grade system that under-covers the yard. We install complete systems on bare lots and we also correct or extend builder systems.",
  },
]

const DEFINITIONS = [
  {
    term: "Zone",
    definition:
      "A group of sprinkler heads that run together off one valve. Your water supply can only feed so many heads at a time, so the yard gets split into zones that run in sequence rather than all at once.",
  },
  {
    term: "Backflow preventer",
    definition:
      "A valve assembly that stops irrigation water from being siphoned back into your drinking water line. Required by Colorado law on every system tied to municipal water, and tested annually.",
  },
  {
    term: "Cycle and soak",
    definition:
      "Splitting a zone's run time into shorter bursts with breaks between them. On the heavy clay soil across Erie and Weld County, one long run mostly becomes runoff — shorter cycles let water actually absorb.",
  },
  {
    term: "Head-to-head coverage",
    definition:
      "Spacing heads so each one's spray reaches the next. It uses more heads than spacing them at the edge of their range, but it's the only way to avoid dry rings between heads as pressure fluctuates.",
  },
]

const PROCESS = [
  {
    step: "1",
    title: "On-site walkthrough",
    body: "We walk the property, measure it, check your static water pressure and service line size, and talk through what you want watered. Pressure and flow determine how many zones the yard can support, so this comes before any design.",
  },
  {
    step: "2",
    title: "Design and written quote",
    body: "You get a zone layout showing head placement and coverage, the controller options, and a fixed price. No allowances, no per-hour surprises. If you want to compare against another bid, the layout is yours to keep.",
  },
  {
    step: "3",
    title: "Locates and scheduling",
    body: "We file the utility locate request and schedule around it. This is a legal requirement before digging, it's free, and it's why install day can't be tomorrow.",
  },
  {
    step: "4",
    title: "Install",
    body: "Trenching, mainline and lateral lines, valve manifolds, heads, backflow assembly, and controller wiring. One to two days for most properties.",
  },
  {
    step: "5",
    title: "Pressure test and tuning",
    body: "Every zone runs while we watch it. We set arcs and nozzles for actual coverage, check for leaks at every connection, and correct anything spraying a fence, sidewalk, or driveway.",
  },
  {
    step: "6",
    title: "Walkthrough and handoff",
    body: "We run the system with you, show you where the valves and shutoff are, program the controller for the current season and your city's watering rules, and set up the app if you went with a smart controller.",
  },
]

const INCLUDED = [
  "Custom zone design based on your actual water pressure and flow",
  "Utility locates filed and coordinated",
  "Trenching, mainline, lateral lines, and valve manifolds",
  "Backflow prevention assembly and initial test",
  "High-efficiency heads and rotors, matched by zone",
  "Controller install and season-appropriate programming",
  "Full pressure test and zone-by-zone tuning",
  "Walkthrough so you know how to run it",
]

const NOT_INCLUDED = [
  "Municipal permit fees, where your city charges them",
  "Sod replacement beyond folding back and re-laying what we lift",
  "Landscaping, planting, or hardscape work",
  "Electrical work beyond connecting the controller to an existing outlet",
]

export default function SprinklerInstallationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(INSTALL_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              {
                name: "Sprinkler Installation",
                url: `${siteConfig.url}/sprinkler-installation`,
              },
            ])
          ),
        }}
      />

      <PageBanner
        title="Sprinkler Installation Services"
        description="New irrigation systems designed for Colorado clay soil, local water rules, and the yard you actually have."
        backgroundImage="/images/sprinkler-installation.jpg"
      />

      {/* ════════════════════════════════════════════
          ANSWER-FIRST INTRO + PRICE
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="install-overview"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Erie &middot; Longmont &middot; Louisville &middot; Lafayette &middot; Firestone
              </Badge>
              <h2
                id="install-overview"
                className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              >
                What a new sprinkler system costs and how long it takes
              </h2>
              <p className="text-muted-foreground mb-4">
                Most residential sprinkler installations in the Erie area run{" "}
                <strong className="text-foreground font-semibold">
                  $3,000 to $6,000
                </strong>{" "}
                and take{" "}
                <strong className="text-foreground font-semibold">
                  one to two days
                </strong>{" "}
                on site. The number moves with yard size, how many zones your
                water pressure will support, and whether we&apos;re trenching
                through bare dirt or established landscaping.
              </p>
              <p className="text-muted-foreground mb-6">
                Ryan does the walkthrough, the design, and the install himself.
                You get a zone layout and a fixed price before anyone digs, and
                the quote is the price you pay.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link
                  href="/contact?service=installation"
                  className={buttonVariants({ size: "lg" })}
                >
                  Request an Installation Quote
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
              <Card className="bg-cream">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-foreground mb-4">
                    What drives the price
                  </p>
                  <dl className="flex flex-col gap-3">
                    <PriceDriver
                      label="Zone count"
                      detail="Each zone adds a valve, wiring, and its own set of heads. Most Erie lots need 4-8."
                    />
                    <PriceDriver
                      label="Yard size and shape"
                      detail="More square footage and more odd corners mean more heads to get even coverage."
                    />
                    <PriceDriver
                      label="Existing landscaping"
                      detail="Trenching around mature trees, beds, and hardscape takes longer than an open lot."
                    />
                    <PriceDriver
                      label="Controller choice"
                      detail="A standard timer costs less up front. A smart controller often pays back through a utility rebate and lower water bills."
                    />
                  </dl>
                  <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
                    Ranges are typical for the Erie / Longmont area. Your quote
                    comes from an on-site walkthrough, not a calculator.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          PROCESS
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="install-process"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">
              Start to finish
            </Badge>
            <h2
              id="install-process"
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
            >
              How an installation actually goes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Six steps from first visit to running system. Nothing here is a
              surprise on install day.
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
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHAT'S INCLUDED / NOT INCLUDED
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="install-scope"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2
              id="install-scope"
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
            >
              What&apos;s included in the price
            </h2>
            <p className="text-muted-foreground">
              And what isn&apos;t, so you can compare bids honestly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <p className="font-semibold text-foreground mb-4">Included</p>
                <ul className="flex flex-col gap-2.5">
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

            <Card className="bg-cream">
              <CardContent className="p-6">
                <p className="font-semibold text-foreground mb-4">
                  Not included
                </p>
                <ul className="flex flex-col gap-2.5">
                  {NOT_INCLUDED.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          COLORADO-SPECIFIC DESIGN
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="install-colorado"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/sprinkler-head.jpg"
                  alt="Sprinkler head installed at lawn level for head-to-head coverage"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-3">
                Why local design matters
              </Badge>
              <h2
                id="install-colorado"
                className="text-2xl md:text-3xl font-bold text-foreground mb-4"
              >
                Built for clay soil and Front Range water rules
              </h2>
              <p className="text-muted-foreground mb-5">
                A system designed for sandy soil and unlimited watering days
                will fail here. Two things shape every layout we build:
              </p>
              <ul className="flex flex-col gap-4 mb-6">
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Heavy clay soil
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Erie and Weld County sit on clay-loam that swells wet and
                    cracks dry. It absorbs water slowly, so we spec lower
                    precipitation-rate nozzles and program cycle-and-soak run
                    times. Long single runs just send your water down the
                    gutter.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Restricted watering windows
                  </p>
                  <p className="text-sm text-muted-foreground">
                    When your city allows watering two days a week, the system
                    has to deliver a full week of water in those windows without
                    flooding. That changes zone sizing and head selection, not
                    just the controller schedule.
                  </p>
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/water-rebates"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Check local rebates
                </Link>
                <Link
                  href="/smart-controllers"
                  className={buttonVariants({ variant: "link" })}
                >
                  Compare smart controllers &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TERMS GLOSSARY
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="install-terms"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <div className="mb-10">
            <h2
              id="install-terms"
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
            >
              Terms you&apos;ll see on a sprinkler bid
            </h2>
            <p className="text-muted-foreground">
              Worth knowing before you compare quotes.
            </p>
          </div>
          <DefinitionList items={DEFINITIONS} columns={2} />
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FAQs
          ════════════════════════════════════════════ */}
      <section
        aria-labelledby="install-faq"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2
              id="install-faq"
              className="text-3xl font-bold text-foreground"
            >
              Sprinkler Installation FAQs
            </h2>
          </div>
          <FaqList faqs={INSTALL_FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}

/* ─── Helper Components ─── */

function PriceDriver({ label, detail }: { label: string; detail: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <dd className="text-sm text-muted-foreground">{detail}</dd>
    </div>
  )
}
