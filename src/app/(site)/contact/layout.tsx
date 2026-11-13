import type { Metadata } from "next"
import { siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Contact Us for a Quote",
  description:
    "Call, email or send a note to Trailhead Lawn & Irrigation in Erie, CO. Installation quotes start here; repairs, turn-ons and blowouts book online.",
  alternates: { canonical: `${siteConfig.url}/contact` },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
