import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { JobberEmbed } from "@/components/sections/JobberEmbed"
import { JOBBER_FORMS } from "@/lib/jobber"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { faqJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Core Aeration in Erie, CO",
  description:
    "Core aeration for Front Range clay soil. $125 up to 5,000 sq ft, $160 up to 10,000. Reduces compaction so water, air, and nutrients reach the roots.",
  alternates: { canonical: `${siteConfig.url}/aeration` },
}

/**
 * Core aeration landing page.
 *
 * Grounded in Trailhead's own published content rather than invented:
 *   - "Annual aeration can reduce watering needs by up to 25%" comes from the
 *     Erie soilType entry in city-data.ts
 *   - "the single best thing you can do for your lawn all year", the plugs
 *     guidance and the late-August window opening come from
 *     /blog/erie-lawn-irrigation-month-by-month-guide
 *   - Trailhead does NOT offer overseeding. Do not reintroduce it here even
 *     though the blog post discusses it as lawn-care advice.
 *   - There is deliberately no "what's included" list. An earlier version
 *     invented one (grid pattern, heads located and avoided, plugs left in
 *     place). None of that came from Ryan. If a list is wanted it has to come
 *     from him.
 *   - Pricing per Ryan: $125 up to ~5,000 sq ft, $160 for ~5,001-10,000
 *     sq ft. Online booking is capped at 1/4 acre (~10,890 sq ft); anything
 *     larger routes to /contact for a quote. Keep the Jobber form's own
 *     limits in step with this if they change.
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
      "Core aeration is $125 for lawns up to approximately 5,000 square feet, and $160 for lawns of roughly 5,001 to 10,000 square feet. Online booking is available for properties up to a quarter acre. If your property is larger than that, get in touch and we will quote it.",
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
    question: "Should I get aeration and a blowout together?",
    answer:
      "You do not have to. Plenty of people book one or the other and that is completely fine. The way it tends to work best is the blowout first: while I am clearing every zone I am walking the whole lawn anyway, so I can flag the spots that are compacted or thin, then come back and aerate those. That way the aeration is aimed at something rather than guessed at.",
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

const TIERS = [
  { price: "$125", size: "Lawns up to approximately 5,000 sq. ft." },
  { price: "$160", size: "Lawns approximately 5,001 to 10,000 sq. ft." },
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
        description="Reduce compaction so water, air, and nutrients reach the roots. From $125."
        backgroundImage="/images/healthy-lawn-closeup.jpg"
      />

      {/* Answer-first intro + price */}
      {/* Intro and pricing side by side. Centering multi-line body copy left
          an orphaned word in the heading and ragged paragraphs, so this uses
          the two-column pattern from /sprinkler-blowout instead, with pricing
          pulled up out of the old lopsided lower section. */}
      <section
        aria-labelledby="aeration-overview"
        className="bg-background section-padding-y"
      >
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1">
              <SectionHeader
                tagline="Fall aeration season"
                taglineAsEyebrow
                title="Why aeration matters on Front Range clay"
                titleId="aeration-overview"
                align="left"
              />
              <p className="text-muted-foreground mt-5 mb-4">
                Core aeration helps reduce soil compaction and allows water,
                air, and nutrients to better reach your lawn&apos;s roots,
                promoting healthier and stronger grass.
              </p>
              <p className="text-muted-foreground mb-4">
                Compacted clay sheds water rather than absorbing it, so a lawn
                can be watered right on schedule and still never get a proper
                drink. Opening the soil up is most of the battle here.
              </p>
              <p className="text-muted-foreground mb-7">
                The window runs from the end of August through September.
                Cooler soil means the lawn recovers faster than it would from a
                mid-summer pass.
              </p>
              <Link
                href="#book-aeration"
                className={buttonVariants({ size: "lg" })}
              >
                Book Aeration
              </Link>
            </div>

            <div className="w-full lg:w-[360px] shrink-0">
              <Card className="bg-cream">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-foreground mb-4">
                    Pricing
                  </p>
                  <dl className="flex flex-col gap-3">
                    {TIERS.map((tier) => (
                      <div key={tier.price}>
                        <dt className="text-2xl font-bold text-primary leading-tight">
                          {tier.price}
                        </dt>
                        <dd className="text-sm text-muted-foreground mt-0.5">
                          {tier.size}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm text-muted-foreground mt-5 pt-5 border-t border-border">
                    Online booking covers properties up to a quarter acre,
                    roughly 10,890 sq. ft. For anything larger,{" "}
                    <Link
                      href="/contact"
                      className="text-primary hover:underline font-medium"
                    >
                      get in touch
                    </Link>{" "}
                    and we will quote it.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What opening the soil changes */}
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
                  alt="Established Front Range lawn"
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
                    Fertilizer actually gets down there
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Feed lands in an open hole rather than sitting on a mat of
                    thatch where it does very little. Fall fertilizer is the
                    one that matters most, so it is worth it reaching the roots.
                  </p>
                </li>
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
