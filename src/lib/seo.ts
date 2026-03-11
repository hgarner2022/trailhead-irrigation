const SITE_URL = "https://trailheadirrigation.com"

export const siteConfig = {
  url: SITE_URL,
  name: "Trailhead Lawn & Irrigation LLC",
  description:
    "Professional irrigation services in Weld County, Erie, Longmont, Louisville & Lafayette, Colorado. Installation, repair, maintenance, winterization & spring startup.",
  phone: "(970) 692-7270",
  phoneTel: "9706927270",
  email: "ryan@trailheadirrigation.com",
  address: {
    locality: "Erie",
    region: "CO",
    country: "US",
  },
  serviceArea: ["Weld County", "Erie", "Longmont", "Louisville", "Lafayette", "Northern Colorado"],
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
    image: `${SITE_URL}/images/logo.jpg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Erie",
      addressRegion: "CO",
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
    ],
    priceRange: "$$",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    sameAs: [],
  }
}

export function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Irrigation Services",
    provider: { "@id": `${SITE_URL}/#business` },
    areaServed: ["Erie, CO", "Longmont, CO", "Louisville, CO", "Lafayette, CO", "Weld County, CO"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Irrigation Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Sprinkler System Installation",
            description:
              "Custom irrigation system design and installation for residential properties in Northern Colorado.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Irrigation Repair",
            description:
              "Sprinkler head replacement, valve repair, leak detection, and controller troubleshooting.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Winterization",
            description:
              "Professional sprinkler blowout to protect your system from Colorado's freeze-thaw cycles.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Spring Activation",
            description:
              "System startup, leak checks, and head adjustments to get your irrigation running for the season.",
          },
        },
      ],
    },
  }
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
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "Ryan Garner",
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo.jpg`,
      },
    },
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  }
}
