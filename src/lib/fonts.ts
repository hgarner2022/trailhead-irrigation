import { Barlow_Condensed, Source_Sans_3 } from "next/font/google"

// Type pairing: a condensed display face for headings (trail-signage feel)
// over a plain humanist sans for everything else. Both self-hosted by
// next/font, so no third-party request and no layout shift. Every root layout
// uses fontClassName so the two CSS variables exist wherever tokens.css reads them.
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-src",
  display: "swap",
})
const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body-src",
  display: "swap",
})

export const fontClassName = `${display.variable} ${body.variable}`
