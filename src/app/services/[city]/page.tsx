import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CityHero } from "@/components/sections/CityHero"
import { CityLocalSign } from "@/components/sections/CityLocalSign"
import { CityNeighborhoods } from "@/components/sections/CityNeighborhoods"
import { ServiceAreaMap } from "@/components/sections/ServiceAreaMap"
import { CityServiceNotes } from "@/components/sections/CityServiceNotes"
import { Testimonials } from "@/components/sections/Testimonials"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { pickReviews } from "@/lib/reviews"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { breadcrumbJsonLd, faqJsonLd, reviewsJsonLd, siteConfig } from "@/lib/seo"
import { FaqList } from "@/components/sections/FaqList"
import { CITY_DATA, getCityData } from "@/lib/city-data"

export function generateStaticParams() {
  return CITY_DATA.map((city) => ({ city: city.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city } = await params
  const data = getCityData(city)
  if (!data) return { title: "Not Found" }
  return {
    title: `${data.name}, CO Sprinkler Company`,
    description: data.slug === "erie" ? `Owner-run sprinkler company based right here in Erie, with ten years of Front Range experience. Repairs, turn-ons, blowouts and new systems, plus Erie watering rules, backflow deadlines and rebates.` : `Owner-run sprinkler company based in Erie, serving ${data.name}, with ten years of Front Range experience. Repairs, turn-ons, blowouts and new systems, plus ${data.name} watering rules and rebates.`,
    alternates: { canonical: `${siteConfig.url}/services/${data.slug}` },
  }
}


export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  const data = getCityData(city)
  if (!data) notFound()
  const g = data.guide
  const cityReviews = g?.reviewAuthors?.length ? pickReviews(...g.reviewAuthors) : []


  // Build a stable "last updated" timestamp at build time. Surfaced visibly
  // and in the JSON-LD `dateModified` so AI engines treat the page as fresh.
  const lastUpdatedISO = new Date().toISOString()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Services", url: `${siteConfig.url}/services` },
              { name: data.name, url: `${siteConfig.url}/services/${data.slug}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(data.faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Sprinkler Company",
            provider: { "@id": `${siteConfig.url}/#business` },
            areaServed: {
              "@type": "City",
              name: data.name,
              containedInPlace: { "@type": "State", name: "Colorado" },
            },
            description: `Sprinkler installation, repair, winterization and spring turn-on in ${data.name}, CO.`,
            dateModified: lastUpdatedISO,
          }),
        }}
      />

      {g?.heroImage ? (
        <CityHero
          name={data.name}
          county={data.county}
          distance={g.distance}
          image={g.heroImage}
          alt={g.heroAlt ?? `${data.name}, Colorado`}
          position={g.heroPosition}
        />
      ) : (
        <CityHero
          name={data.name}
          county={data.county}
          distance={g?.distance ?? "A short drive from our shop in Erie"}
          image="/images/trail-mountain-meadow.jpg"
          alt="Two-track trail through a mountain meadow at sunrise in the Colorado Rockies"
          position="60% center"
        />
      )}
      {/* The local sign: watering rules, backflow, provider, rebate, and what is booking now */}
      <CityLocalSign data={data} />

      {/* One local line per service, linking to the service page */}
      <CityServiceNotes
        name={data.name}
        notes={{
          ...(data.winterNote ? { "/sprinkler-blowout": data.winterNote } : {}),
          ...(g?.serviceNotes ?? {}),
        }}
      />

      {/* Where we work here: Ryan, the neighborhoods, a photo from the town */}
      {g?.ryanNote && g.neighborhoods && g.placeImage && (
        <CityNeighborhoods
          name={data.name}
          note={g.ryanNote}
          neighborhoods={g.neighborhoods}
          image={g.placeImage}
          alt={g.placeAlt ?? `${data.name}, Colorado`}
        />
      )}

      {/* Reviews from customers in this town */}
      {cityReviews.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(cityReviews)) }} />
          <Testimonials
            reviews={cityReviews}
            heading={`What ${data.name} homeowners say`}
            description="Google reviews from customers in this town."
            bg="cream"
            headingId="city-reviews"
          />
        </>
      )}

      {/* FAQ, worded the way people here search */}
      <section className="bg-background section-padding-y" aria-labelledby={`faq-${data.slug}`}>
        <div className="container-padding-x mx-auto max-w-3xl flex flex-col gap-10">
          <SectionHeader title={`${data.name} sprinkler questions`} titleId={`faq-${data.slug}`} />
          <FaqList faqs={data.faqs} itemBg="cream" />
        </div>
      </section>

      {/* The map of the six towns, this one marked */}
      <ServiceAreaMap current={data.slug} />

      <CTAStrip />
    </>
  )
}
