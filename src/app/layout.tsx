import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/sections/Header"
import { Footer } from "@/components/sections/Footer"
import { localBusinessJsonLd, organizationJsonLd, siteConfig } from "@/lib/seo"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Trailhead Lawn & Irrigation | Erie, CO",
    template: "%s | Trailhead Lawn & Irrigation",
  },
  description: siteConfig.description,
  keywords: [
    "irrigation services Erie CO",
    "sprinkler repair Weld County",
    "winterization Longmont Colorado",
    "sprinkler installation Northern Colorado",
    "lawn irrigation Erie",
    "spring startup sprinklers",
    "backflow repair Colorado",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "Trailhead Lawn & Irrigation | Erie, CO",
    description: siteConfig.description,
    images: [{ url: "/images/logo.jpg", width: 800, height: 600, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trailhead Lawn & Irrigation | Erie, CO",
    description: siteConfig.description,
    images: ["/images/logo.jpg"],
  },
  alternates: {
    canonical: siteConfig.url,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
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
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
