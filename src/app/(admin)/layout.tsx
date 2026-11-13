import type { Metadata, Viewport } from "next"
import "../app.css"
import { fontClassName } from "@/lib/fonts"

// The admin has its own root layout on app.css and is never indexed.
export const metadata: Metadata = {
  title: { default: "Trailhead admin", template: "%s | Trailhead admin" },
  robots: { index: false, follow: false },
}
export const viewport: Viewport = { viewportFit: "cover" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="font-sans antialiased bg-cream text-foreground">
        {children}
      </body>
    </html>
  )
}
