import Image from "next/image"
import Link from "next/link"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { CITY_DATA } from "@/lib/city-data"
import { ArrowRight } from "lucide-react"

// Six homepage links with the city name as anchor text. The homepage holds
// nearly all the site's authority and the city pages have almost none; this
// is the single most useful internal-linking block on the site. Copy treats
// every city as equal: a Lafayette install is worth as much as an Erie one.

const CITY_NOTES: Record<string, string> = {
  erie: "Home base",
  longmont: "Rebates available",
  louisville: "Rebates available",
  lafayette: "Rebates available",
  firestone: "Weld County",
  broomfield: "Smart controller rebate",
}

export function ServiceAreaSection() {
  return (
    <section className="bg-background section-padding-y" aria-labelledby="areas-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative aspect-[3/2] rounded-lg overflow-hidden order-last lg:order-first">
            <Image
              src="/images/welcome-to-colorado-sign.jpg"
              alt="Welcome to Colorful Colorado roadside sign"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-8">
            <SectionHeader
              tagline="Service area"
              taglineAsEyebrow
              title="Serving six Front Range cities"
              titleId="areas-heading"
              description="Same prices in every city. Each one has its own watering rules and rebates, so each has its own page."
              align="left"
            />
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CITY_DATA.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/services/${city.slug}`}
                    className="group flex flex-col gap-0.5 rounded-lg border border-border bg-cream px-4 py-3 hover:border-primary/40 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1 font-semibold text-navy group-hover:text-primary transition-colors">
                      {city.name}, CO
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-xs text-muted-foreground">{CITY_NOTES[city.slug] ?? "Sprinkler service"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
