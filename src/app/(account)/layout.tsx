import type { Metadata } from "next"
import "../app.css"
import { fontClassName } from "@/lib/fonts"

// The customer pass page has its own root layout on app.css and is never indexed.
export const metadata: Metadata = {
  title: { default: "Your Season Pass", template: "%s | Trailhead Lawn & Irrigation" },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="font-sans antialiased bg-cream text-foreground">
        {children}
      </body>
    </html>
  )
}
