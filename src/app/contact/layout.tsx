import type { Metadata } from "next"
import { siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Contact Us for a Free Quote",
  description:
    "Contact Trailhead Lawn & Irrigation for a free quote on sprinkler installation, repair, winterization, or spring activation. Serving Erie, Longmont & Weld County, CO.",
  alternates: { canonical: `${siteConfig.url}/contact` },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
