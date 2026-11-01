import { Hero } from "@/components/sections/Hero"
import { TrustStrip } from "@/components/sections/TrustStrip"
import { ProblemTiles } from "@/components/sections/ProblemTiles"
import { InstallationBand } from "@/components/sections/InstallationBand"
import { SeasonPassSection } from "@/components/sections/SeasonPassSection"
import { OwnerSection } from "@/components/sections/OwnerSection"
import { Testimonials } from "@/components/sections/Testimonials"
import { ServiceAreaSection } from "@/components/sections/ServiceAreaSection"
import { HomeFAQ, HOME_FAQS } from "@/components/sections/HomeFAQ"
import { CTAStrip } from "@/components/sections/CTAStrip"
import {
  serviceJsonLd,
  personJsonLd,
  reviewsJsonLd,
  faqJsonLd,
} from "@/lib/seo"
import { pickReviews } from "@/lib/reviews"

// Three reviews, one per core service, similar length. Schema is emitted for
// exactly these three because Google expects review markup to match what a
// visitor can actually see.
const HOME_REVIEWS = pickReviews(
  "Daniel Cooperider", // blowout, names the first freeze
  "Reesa Rennecker", // repair: responsive, on time, explained every step
  "Joanna Toy", // new system installed, fairly priced
)

export default function HomePage() {
  // Single JSON-LD @graph payload combining:
  //  - 4 individual Service entities (installation / repair / blowout / turn-on)
  //  - Person schema for Ryan (E-E-A-T)
  //  - Review schema for the reviews actually shown on this page
  //  - FAQ schema for the homepage FAQ
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...serviceJsonLd(),
      personJsonLd(),
      ...reviewsJsonLd(HOME_REVIEWS),
      faqJsonLd(HOME_FAQS),
    ],
  }

  // Every section has one job the others don't:
  //   Hero          the promise, and two doors (book / installation quote)
  //   TrustStrip    the four things a stranger checks before calling
  //   ProblemTiles  find your service, with its price; the site's map
  //   Installation  the highest-ticket service and the biggest search gap
  //   SeasonPass    the recurring product
  //   Owner         who is accountable
  //   Testimonials  proof, one review per core service
  //   ServiceArea   the six city pages, linked from the page with authority
  //   FAQ           the questions Google already shows under our result
  //   CTAStrip      book
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <Hero />
      <TrustStrip />
      <ProblemTiles />
      <InstallationBand />
      <SeasonPassSection />
      <OwnerSection />
      <Testimonials
        reviews={HOME_REVIEWS}
        heading="What Erie homeowners say"
        description="5.0 on Google. Every review is public on our Google Business Profile."
        bg="background"
      />
      <ServiceAreaSection />
      <HomeFAQ />
      <CTAStrip />
    </main>
  )
}
