import type { Metadata, Viewport } from "next"
import "../app.css"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { fontClassName } from "@/lib/fonts"

// The checkout has its own root layout on app.css, measured by GA4 and never indexed.
export const metadata: Metadata = {
  title: { default: "Season Pass checkout", template: "%s | Trailhead Lawn & Irrigation" },
  robots: { index: false, follow: false },
}

// `cover` lets the checkout's sticky button bar pad itself with the phone's safe-area inset (the home indicator).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="font-sans antialiased bg-cream text-foreground">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  )
}
