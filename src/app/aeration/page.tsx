import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { JobberEmbed } from "@/components/sections/JobberEmbed"
import { JOBBER_FORMS } from "@/lib/jobber"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Core Aeration in Erie, CO",
  description:
    "Core aeration for Front Range clay soil. $135 flat rate. Relieves compaction so water and nutrients reach the roots. Fall is the best window of the year.",
  alternates: { canonical: `${siteConfig.url}/aeration` },
}

/**
 * Core aeration landing page.
 *
 * Grounded in Trailhead's own published content rather than invented:
 *   - "Annual aeration can reduce watering needs by up to 25%" comes from the
 *     Erie soilType entry in city-data.ts
 *   - "the single best thing you can do for your lawn all year", the plugs
 *     guidance, the late-August window opening, and mid-September as the prime
 *     overseeding window for Kentucky bluegrass and tall fescue in Erie all
 *     come from /blog/erie-lawn-irrigation-month-by-month-guide
 *   - $135 flat rate confirmed by Ryan (not zone or size based)
 *
 * Aeration has its own Jobber form (5164288), separate from the seasonal form
 * on /book, so the booking embed lives on this page directly.
 *
 * House style for new content: no em dashes (18c9a89). No "free quote"
 * language (3cca994).
 */

const AERATION_FAQS = [
  {
    question: "How much does core aeration cost?",
    answer:
      "Core aeration is a flat $135. It is not priced by zone or lawn size, so there is nothing to measure and no surprise on the invoice.",
  },
  {
    question: "When is the best time to aerate a lawn in Colorado?",
    answer:
      "Fall is the best window of the year on the Front Range. The late-summer window opens at the end of August and runs through September. If you missed the spring window, the fall one is just as good, and the cooler soil means the lawn recovers faster.",
  },
  {
    question: "Why does aeration matter so much on Front Range clay?",
    answer:
      "Our clay-loam soil compacts hard and absorbs water slowly. Water applied to compacted clay tends to run off rather than soak in, so you can water on schedule and still have grass that never gets a drink. Pulling plugs opens paths for water, air, and fertilizer to reach the root zone. Annual aeration can reduce watering needs by up to 25 percent.",
  },
  {
    question: "What do I do with the plugs left on the lawn?",
    answer:
      "Leave them. They break down on their own within a couple of weeks and return soil and organic matter to the surface. Raking them up removes the benefit and makes extra work for no reason.",
  },
  {
    question: "Should I overseed at the same time?",
    answer:
      "It is the best time to do it. The holes give seed direct contact with soil instead of sitting on top of thatch. Mid-September is the prime overseeding window for Kentucky bluegrass and tall fescue in Erie, which lines up with aeration season.",
  },
  {
    question: "Will aeration damage my sprinkler system?",
    answer:
      "Not when whoever is aerating knows where the heads and lines are. That is the advantage of having the same person who services your irrigation do the aeration. We already know your zone layout and where everything sits.",
  },
  {
    question: "How often should a lawn be aerated?",
    answer:
      "Once a year is right for most Front Range lawns. Heavy clay, heavy foot traffic, or a lawn that has never been aerated can benefit from twice in a season, spring and fall.",
  },
  {
    question: "Can I aerate and get my sprinklers winterized in the same visit?",
    answer:
      "Yes, and the ordering works out well. Aeration happens while the system is still running so the lawn can be watered in afterward, then the blowout comes later in October once you are done watering for the year.",
  },
]

const DEFINITIONS = [
  {
    term: "What is core aeration?",
    definition:
      "Core aeration pulls small plugs of soil and thatch out of the lawn on a grid, leaving open channels behind. Unlike spike aeration, which just punches holes and pushes soil aside, coring physically removes material so the surrounding soil has somewhere to expand into.",
  },
  {
    term: "What is soil compaction?",
    definition:
      "Soil pressed tight enough that water, air, and roots struggle to move through it. Clay compacts more readily than sand, and foot traffic, mowing, and the freeze-thaw cycle all add to it over a season.",
  },
  {
    term: "What is thatch?",
    definition:
      "The layer of dead stems and roots that builds up between the grass blades and the soil. A thin layer is healthy. A thick one sheds water and keeps seed and fertilizer from ever reaching soil.",
  },
  {
    term: "Why leave the plugs on the lawn?",
    definition:
      "They break down within a couple of weeks and put soil and organic matter back on the surface, which helps topdress the lawn. Removing them throws away most of the benefit of the service.",
  },
]

const INCLUDED = [
  "Full-lawn core aeration on a proper grid, not a quick pass",
  "Plugs left in place to break down and topdress the lawn",
  "Sprinkler heads located and worked around",
  "Flat $135 regardless of lawn size",
]

export default function AerationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(AERATION_FAQS)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Core Aeration", url: `${siteConfig.url}/aeration` },
            ])
          ),
        }}
      />

      <PageBanner
        title="Core Aeration"
        description="The single best thing you can do for a Front Range lawn all year. Flat $135."
        backgroundImage="/images/healthy-lawn-closeup.jpg"
      />

      {/* Answer-first intro + price */}
      <section
        aria-labelledby="aeration-overview"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl text-center">
          <SectionHeader
            tagline="Fall aeration season"
            taglineAsEyebrow
            title="What aeration is and why it matters here"
            titleId="aeration-overview"
          />
          <p className="text-muted-foreground mt-5 mb-4">
            Core aeration pulls small plugs of soil out of your lawn so water,
            air, and fertilizer can actually reach the roots instead of sitting
            on top of compacted ground. It is a{" "}
            <strong className="text-foreground font-semibold">
              flat $135
            </strong>
            , whatever the size of the lawn.
          </p>
          <p className="text-muted-foreground mb-7">
            On the clay-loam across Erie and Weld County this is most of the
            battle. Compacted clay sheds water rather than absorbing it, so a
            lawn can be watered on schedule and still never get a proper drink.
          </p>
          <Link
            href="#book-aeration"
            className={buttonVariants({ size: "lg" })}
          >
            Book Aeration
          </Link>
        </div>
      </section>

      {/* Why it works, alternating image/text per the /water-efficiency pattern */}
      <section
        aria-labelledby="aeration-why"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/lawn.jpg"
                  alt="Established Front Range lawn after aeration"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="green" className="mb-3">
                Up to 25% less watering needed
              </Badge>
              <h2
                id="aeration-why"
                className="text-2xl md:text-3xl font-bold text-foreground mb-4"
              >
                What opening up the soil changes
              </h2>
              <ul className="flex flex-col gap-4">
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Water goes down instead of sideways
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Channels give irrigation somewhere to go. Less runoff onto
                    the sidewalk, more water in the root zone, and annual
                    aeration can cut what the lawn needs by up to 25 percent.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Roots get room and air
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Grass roots cannot push through tight clay. Relieving the
                    compaction lets them grow deeper, which is what carries a
                    lawn through a hot, dry Front Range July.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground text-sm mb-1">
                    Fertilizer and seed reach soil
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Anything you put down lands in an open hole rather than on
                    a mat of thatch. This is why aeration and overseeding belong
                    in the same visit.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Timing + what's included */}
      <section
        aria-labelledby="aeration-timing"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="When to do it, and what you get"
            titleId="aeration-timing"
            className="mb-10"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="font-semibold text-foreground mb-3">
                Fall is the window
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                The late-summer window opens at the end of August and runs
                through September. Cooler soil means faster recovery, and it
                lines up with mid-September being the prime overseeding window
                for Kentucky bluegrass and tall fescue in Erie.
              </p>
              <p className="text-sm text-muted-foreground">
                If you missed spring, the fall pass is just as good. Aerate
                while the system is still running so the lawn can be watered in
                afterward, then book the{" "}
                <Link
                  href="/sprinkler-blowout"
                  className="text-primary hover:underline font-medium"
                >
                  blowout
                </Link>{" "}
                for later in October.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3">
                What the $135 covers
              </p>
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
            </div>
          </div>
        </div>
      </section>

      {/* Booking form. Aeration has its own Jobber form, separate from /book. */}
      <section
        id="book-aeration"
        aria-labelledby="aeration-book"
        className="bg-cream section-padding-y scroll-mt-24"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader
            title="Book your aeration"
            titleId="aeration-book"
            description="Pick a date that works and we will take it from there."
            className="mb-10"
          />
          <JobberEmbed formId={JOBBER_FORMS.aeration} />
        </div>
      </section>

      {/* Definitions */}
      <section
        aria-labelledby="aeration-terms"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-5xl">
          <SectionHeader
            title="Aeration terms, explained"
            titleId="aeration-terms"
            align="left"
            className="mb-10"
          />
          <DefinitionList items={DEFINITIONS} columns={2} />
        </div>
      </section>

      {/* FAQs */}
      <section
        aria-labelledby="aeration-faq"
        className="bg-cream section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader
            title="Aeration FAQs"
            titleId="aeration-faq"
            className="mb-10"
          />
          <FaqList faqs={AERATION_FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
