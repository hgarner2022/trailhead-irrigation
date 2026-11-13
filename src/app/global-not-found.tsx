import type { Metadata } from "next"
import "./globals.css"
import { Header } from "@/components/sections/Header"
import { Footer } from "@/components/sections/Footer"
import { StickyBar } from "@/components/sections/StickyBar"
import { fontClassName } from "@/lib/fonts"
import NotFound from "./(site)/not-found"

// An address that matches no route renders outside every route group, so it
// needs its own html shell. It is the marketing chrome around the same
// not-found page the (site) group shows for notFound().
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontClassName}>
      <body className="font-sans antialiased bg-background text-foreground">
        <Header />
        <NotFound />
        <StickyBar />
        <Footer />
      </body>
    </html>
  )
}
