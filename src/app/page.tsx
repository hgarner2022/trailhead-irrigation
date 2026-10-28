import { Hero } from "@/components/sections/Hero"
import { StatsStrip } from "@/components/sections/StatsStrip"
import { ServicesOverview } from "@/components/sections/ServicesOverview"
import { MeetRyan } from "@/components/sections/MeetRyan"
import { Testimonials } from "@/components/sections/Testimonials"
import { HomeFAQ, HOME_FAQS } from "@/components/sections/HomeFAQ"
import { CTAStrip } from "@/components/sections/CTAStrip"
import {
  serviceJsonLd,
  personJsonLd,
  reviewsJsonLd,
  faqJsonLd,
} from "@/lib/seo"
import { pickReviews } from "@/lib/reviews"

// Chosen by hand, not by date. Sorting by recency put three one-line
// reviews on the homepage next to detailed ones, which read badly and
// left the cards uneven. These nine all say something specific, cover
// different services, and sit in a similar length range so the row is
// even. Schema is emitted for exactly these nine, because Google expects
// review markup to match what a visitor can actually see.
const HOME_REVIEWS = pickReviews(
  "Daniel Cooperider", // blowout, names the first freeze
  "Kirby Moughon", // booked online, new homeowner
  "Aaron Connors", // detailed repair + coverage + efficiency advice
  "Lori Ginn", // repairs, new trees, and the price
  "Joanna Toy", // new system installed, fairly priced
  "Brian Taylor", // Rachio handoff
  "Josh Drake", // efficiency and coverage
  "Reesa Rennecker", // responsive, on time, thorough
  "Nangchen", // took the time to teach them the system
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

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <Hero />
      <StatsStrip />
      <ServicesOverview />
      <MeetRyan />
      <Testimonials
        reviews={HOME_REVIEWS}
        heading="What Erie Homeowners Say"
      />
      <HomeFAQ />
      <CTAStrip />
    </main>
  )
}
