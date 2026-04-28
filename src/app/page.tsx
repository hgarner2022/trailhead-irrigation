import { Hero } from "@/components/sections/Hero"
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
import { REVIEWS } from "@/lib/reviews"

export default function HomePage() {
  // Single JSON-LD @graph payload combining:
  //  - 4 individual Service entities (installation / repair / blowout / turn-on)
  //  - Person schema for Ryan (E-E-A-T)
  //  - Review schema for each real Google review
  //  - FAQ schema for the homepage FAQ
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...serviceJsonLd(),
      personJsonLd(),
      ...reviewsJsonLd(REVIEWS),
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
      <ServicesOverview />
      <MeetRyan />
      <Testimonials />
      <HomeFAQ />
      <CTAStrip />
    </main>
  )
}
