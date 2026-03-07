import { Hero } from "@/components/sections/Hero"
import { ServicesOverview } from "@/components/sections/ServicesOverview"
import { MeetRyan } from "@/components/sections/MeetRyan"
import { Testimonials } from "@/components/sections/Testimonials"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { serviceJsonLd } from "@/lib/seo"

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceJsonLd()),
        }}
      />
      <Hero />
      <ServicesOverview />
      <MeetRyan />
      <Testimonials />
      <CTAStrip />
    </main>
  )
}
