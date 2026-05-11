const SITE_URL = "https://www.trailheadirrigation.com"

// Public profiles used as `sameAs` authority signals for SEO + AI citation.
// TODO: Add Facebook, Instagram, Angi, BBB URLs as they're created.
const SAME_AS_PROFILES = [
  // Google Business Profile (Trailhead Lawn & Irrigation LLC, Erie, CO)
  "https://share.google/TylDvEow1tcqEBYHY",
  // Yelp Business Listing
  "https://www.yelp.com/biz/trailhead-lawn-and-irrigation-erie",
  // Nextdoor Business Page
  "https://nextdoor.com/page/trailhead-irrigation-erie-co",
]

export const siteConfig = {
  url: SITE_URL,
  name: "Trailhead Lawn & Irrigation LLC",
  description:
    "Local 5★ sprinkler pros in Erie, CO. Repair, installation, winterization & spring turn-on. Owner-operated by Ryan — serving Erie, Longmont, Louisville & Lafayette.",
  phone: "(970) 692-7270",
  phoneTel: "9706927270",
  email: "ryan@trailheadirrigation.com",
  address: {
    street: "137 Morgan Circle North",
    locality: "Erie",
    region: "CO",
    postalCode: "80516",
    country: "US",
  },
  serviceArea: ["Weld County", "Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Northern Colorado"],
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: SITE_URL,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    image: `${SITE_URL}/images/logo-new.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "137 Morgan Circle North",
      addressLocality: "Erie",
      addressRegion: "CO",
      postalCode: "80516",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.0503,
      longitude: -105.0499,
    },
    areaServed: [
      {
        "@type": "County",
        name: "Weld County",
        containedInPlace: { "@type": "State", name: "Colorado" },
      },
      { "@type": "City", name: "Erie", containedInPlace: { "@type": "State", name: "Colorado" } },
      { "@type": "City", name: "Longmont", containedInPlace: { "@type": "State", name: "Colorado" } },
      { "@type": "City", name: "Louisville", containedInPlace: { "@type": "State", name: "Colorado" } },
      { "@type": "City", name: "Lafayette", containedInPlace: { "@type": "State", name: "Colorado" } },
      { "@type": "City", name: "Firestone", containedInPlace: { "@type": "State", name: "Colorado" } },
    ],
    priceRange: "$$",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      reviewCount: "8",
      bestRating: "5",
      worstRating: "1",
    },
    sameAs: SAME_AS_PROFILES,
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: siteConfig.name,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo-new.png`,
      width: 800,
      height: 600,
    },
    image: `${SITE_URL}/images/logo-new.png`,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    sameAs: SAME_AS_PROFILES,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Service schemas — split into individual Service entities so each can rank
// and be cited independently in AI overviews.
// ───────────────────────────────────────────────────────────────────────────

const SERVICE_AREAS = [
  "Erie, CO",
  "Longmont, CO",
  "Louisville, CO",
  "Lafayette, CO",
  "Firestone, CO",
  "Weld County, CO",
]

type ServiceDef = {
  id: string
  name: string
  description: string
  serviceType: string
  url?: string
  priceSpecification?: {
    price: string
    priceCurrency: string
    description: string
  }
}

const SERVICES: ServiceDef[] = [
  {
    id: "sprinkler-installation",
    name: "Lawn Sprinkler Installation",
    description:
      "Custom residential sprinkler system design and installation in Erie, Longmont, and Northern Colorado. Includes zone layout, head placement, trenching, controller setup, and final walkthrough.",
    serviceType: "Sprinkler System Installation",
    url: `${SITE_URL}/services`,
    priceSpecification: {
      price: "3000",
      priceCurrency: "USD",
      description: "Typical residential install range $3,000–$6,000 depending on lot size and zones",
    },
  },
  {
    id: "sprinkler-repair",
    name: "Sprinkler Repair",
    description:
      "Sprinkler head replacement, valve repair, leak detection, broken pipe repair, controller troubleshooting, and wiring repair. No trip fee.",
    serviceType: "Sprinkler Repair",
    url: `${SITE_URL}/services`,
  },
  {
    id: "sprinkler-winterization",
    name: "Sprinkler Winterization (Blowout)",
    description:
      "Professional compressed-air sprinkler blowout to protect your irrigation system from Colorado's freeze-thaw cycle. Recommended between mid-October and early November.",
    serviceType: "Sprinkler Winterization",
    url: `${SITE_URL}/pricing`,
    priceSpecification: {
      price: "95",
      priceCurrency: "USD",
      description: "$95 for up to 8 zones, +$7 per additional zone",
    },
  },
  {
    id: "spring-turn-on",
    name: "Spring Sprinkler Turn-On",
    description:
      "Spring sprinkler startup with full system check, leak checks, head adjustments, controller programming, and a water efficiency check. Available late April through May.",
    serviceType: "Spring Sprinkler Activation",
    url: `${SITE_URL}/pricing`,
    priceSpecification: {
      price: "135",
      priceCurrency: "USD",
      description: "$135 for up to 8 zones, +$10 per additional zone",
    },
  },
]

function buildService(s: ServiceDef) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/#service-${s.id}`,
    name: s.name,
    description: s.description,
    serviceType: s.serviceType,
    provider: { "@id": `${SITE_URL}/#business` },
    areaServed: SERVICE_AREAS,
    ...(s.url && { url: s.url }),
    ...(s.priceSpecification && {
      offers: {
        "@type": "Offer",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: s.priceSpecification.price,
          priceCurrency: s.priceSpecification.priceCurrency,
          description: s.priceSpecification.description,
        },
        availability: "https://schema.org/InStock",
        seller: { "@id": `${SITE_URL}/#business` },
      },
    }),
  }
}

/**
 * Returns an array of individual Service JSON-LD objects (one per offering).
 * Wrap each in its own <script> tag, OR pass the array as a single
 * @graph payload — both are valid for Google.
 */
export function serviceJsonLd() {
  return SERVICES.map(buildService)
}

/** Individual service lookup — useful for service-specific landing pages. */
export function singleServiceJsonLd(id: string) {
  const svc = SERVICES.find((s) => s.id === id)
  return svc ? buildService(svc) : null
}

// ───────────────────────────────────────────────────────────────────────────
// Person schema — Ryan Garner. Major E-E-A-T signal for AI citation.
// ───────────────────────────────────────────────────────────────────────────

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#ryan`,
    name: "Ryan Garner",
    givenName: "Ryan",
    familyName: "Garner",
    jobTitle: "Founder & Lead Sprinkler Contractor",
    description:
      "Ryan Garner is the founder of Trailhead Lawn & Irrigation LLC, a residential sprinkler company serving Erie, Longmont, Louisville, Lafayette, and Weld County, Colorado. Ryan personally handles installations, repairs, blowouts, and spring turn-ons across the Northern Colorado Front Range.",
    url: `${SITE_URL}/about`,
    image: `${SITE_URL}/images/ryan.jpg`,
    knowsAbout: [
      "Sprinkler system installation",
      "Irrigation repair",
      "Sprinkler winterization (blowout)",
      "Spring sprinkler turn-on",
      "Backflow preventer testing",
      "Smart irrigation controllers (Rachio, Hunter Hydrawise, Rain Bird)",
      "Drip irrigation",
      "Water efficiency and conservation",
      "Colorado water restrictions",
      "Front Range soil and climate",
    ],
    worksFor: { "@id": `${SITE_URL}/#business` },
    workLocation: {
      "@type": "Place",
      name: "Erie, Colorado",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Erie",
        addressRegion: "CO",
        addressCountry: "US",
      },
    },
    sameAs: SAME_AS_PROFILES,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Review schema scaffold — populate with REAL reviews only.
// Google penalizes fake/synthetic Review markup. Pull text from genuine
// Google Business Profile reviews into `src/lib/reviews.ts` before wiring in.
// ───────────────────────────────────────────────────────────────────────────

export type ReviewItem = {
  author: string
  rating: number
  date: string // ISO YYYY-MM-DD
  body: string
  source?: string // e.g. "Google"
}

export function reviewJsonLd(review: ReviewItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@id": `${SITE_URL}/#business` },
    author: { "@type": "Person", name: review.author },
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(review.rating),
      bestRating: "5",
      worstRating: "1",
    },
    datePublished: review.date,
    reviewBody: review.body,
    ...(review.source && {
      publisher: { "@type": "Organization", name: review.source },
    }),
  }
}

/** Build an array of Review schema entries from a list of real reviews. */
export function reviewsJsonLd(reviews: ReviewItem[]) {
  return reviews.map(reviewJsonLd)
}

export function faqJsonLd(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function blogPostJsonLd(post: {
  title: string
  excerpt: string
  date: string
  slug: string
  content?: string
  category?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    ...(post.content && { wordCount: post.content.split(/\s+/).length }),
    ...(post.category && { articleSection: post.category }),
    image: `${SITE_URL}/images/logo-new.png`,
    author: {
      "@type": "Person",
      name: "Ryan Garner",
      jobTitle: "Founder",
      worksFor: {
        "@type": "Organization",
        name: siteConfig.name,
      },
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo-new.png`,
      },
    },
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  }
}
