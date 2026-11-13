import type { Metadata } from "next"
import "../globals.css"
import { Header } from "@/components/sections/Header"
import { Footer } from "@/components/sections/Footer"
import { StickyBar } from "@/components/sections/StickyBar"
import { ConversionTracking } from "@/components/ConversionTracking"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { localBusinessJsonLd, organizationJsonLd, siteConfig } from "@/lib/seo"
import { Analytics } from "@vercel/analytics/react"
import { fontClassName } from "@/lib/fonts"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Sprinkler Repair & Irrigation Installation in Erie, CO",
    template: "%s | Trailhead Lawn & Irrigation",
  },
  description: siteConfig.description,
  keywords: [
    "sprinkler company Erie CO",
    "sprinkler service Erie CO",
    "sprinkler repair near me",
    "sprinkler repair Erie CO",
    "lawn sprinkler service Northern Colorado",
    "sprinkler installation Erie CO",
    "sprinkler blowout Longmont",
    "winterize sprinklers Colorado",
    "spring sprinkler turn on",
    "irrigation company Erie CO",
    "irrigation contractor Northern Colorado",
    "sprinkler contractor Weld County",
    "fix sprinklers Erie",
    "sprinkler leak repair",
    "backflow testing Erie CO",
    "smart sprinkler controller",
    "drip irrigation Colorado",
    "sprinkler system cost Colorado",
    "best sprinkler company Erie",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "Sprinkler Repair & Irrigation Installation in Erie, CO",
    description: siteConfig.description,
    images: [{ url: "/images/logo-new.png", width: 800, height: 600, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sprinkler Repair & Irrigation Installation in Erie, CO",
    description: siteConfig.description,
    images: ["/images/logo-new.png"],
  },
  alternates: {
    canonical: siteConfig.url,
  },
  verification: {
    // Google Search Console site verification.
    google: "N79GYrgm19hbQonfYMUtsmIqWkwpAP1xZ3eQzUUrJK4",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontClassName}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Header />
        {children}
        <StickyBar />
        <Footer />
        <Analytics />
        <ConversionTracking />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
