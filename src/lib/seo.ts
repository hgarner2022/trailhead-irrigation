const SITE_URL = "https://trailheadirrigation.com"

export const siteConfig = {
  url: SITE_URL,
  name: "Trailhead Lawn & Irrigation LLC",
  description:
    "Erie's trusted sprinkler company. Sprinkler installation, repair, winterization & spring turn-on in Erie, Longmont, Louisville, Lafayette & Weld County, Colorado.",
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
    image: `${SITE_URL}/images/logo-new.png`,
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
  }
}

export function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Sprinkler Company",
    provider: { "@id": `${SITE_URL}/#business` },
    areaServed: ["Erie, CO", "Longmont, CO", "Louisville, CO", "Lafayette, CO", "Weld County, CO"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Sprinkler Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Lawn Sprinkler Installation",
            description:
              "Custom residential sprinkler system design and installation in Erie, Longmont, and Northern Colorado.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Sprinkler Repair",
            description:
              "Fix broken sprinkler heads, sprinkler leaks, valve repair, pipe repair, and controller troubleshooting.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Sprinkler Winterization (Blowout)",
            description:
              "Professional sprinkler blowout to winterize your sprinklers before Colorado's freeze season.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Spring Sprinkler Turn-On",
            description:
              "Spring sprinkler startup with leak checks, head adjustments, and controller programming.",
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
