import { Hero } from "@/components/sections/Hero"
import { ServicesOverview } from "@/components/sections/ServicesOverview"
import { MeetRyan } from "@/components/sections/MeetRyan"
import { Testimonials } from "@/components/sections/Testimonials"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { serviceJsonLd, personJsonLd, reviewsJsonLd } from "@/lib/seo"
import { REVIEWS } from "@/lib/reviews"

export default function HomePage() {
  // Single JSON-LD @graph payload combining:
  //  - 4 individual Service entities (installation / repair / blowout / turn-on)
  //  - Person schema for Ryan (E-E-A-T)
  //  - Review schema for each real Google review
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...serviceJsonLd(),
      personJsonLd(),
      ...reviewsJsonLd(REVIEWS),
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
      <CTAStrip />
    </main>
  )
}
