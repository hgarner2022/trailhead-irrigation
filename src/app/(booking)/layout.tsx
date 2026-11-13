import type { Metadata } from "next"
import "../app.css"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { fontClassName } from "@/lib/fonts"

// The booking group is empty until the app form replaces the Jobber iframe at
// /book. Its layout exists now so the manifest and the gate already know it.
export const metadata: Metadata = {
  title: { default: "Book online", template: "%s | Trailhead Lawn & Irrigation" },
  robots: { index: false, follow: false },
}

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
