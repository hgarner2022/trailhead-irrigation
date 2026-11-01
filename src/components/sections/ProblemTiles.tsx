import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionHeader } from "@/components/sections/SectionHeader"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

// Six problems, a real price on each. "Near me" plus a service is the whole
// market, so a phone visitor should find their problem in one scroll. Prices
// are the published prices from /pricing; no competitor on page one publishes
// one, and it's the trust move.

const TILES = [
  {
    title: "Sprinkler repair",
    price: "$145 visit, small fixes included",
    body: "Broken heads, stuck valves, leaks, zones that won't run. Diagnosed and usually fixed the same visit.",
    href: "/book",
    cta: "Book a repair",
    image: { src: "/images/sprinkler-spray-head-lawn.jpg", alt: "Pop-up spray head watering a green lawn" },
  },
  {
    title: "New system installation",
    price: "$3,000 to $6,000 typical",
    body: "Designed for clay soil and local watering rules. Most yards are done in two days.",
    href: "/sprinkler-installation",
    cta: "See cost and timeline",
    image: { src: "/images/sprinkler-golden-hour.jpg", alt: "Sprinkler head spraying at sunset beside a boardwalk" },
  },
  {
    title: "Fall blowout & winterization",
    price: "$95 up to 6 zones",
    body: "Compressed-air blowout before the first hard freeze. Book online in two minutes.",
    href: "/sprinkler-blowout",
    cta: "Book a blowout",
    image: { src: "/images/sprinkler-spring.jpg", alt: "Sprinkler system running on a residential lawn" },
  },
  {
    title: "Spring turn-on & system check",
    price: "$145 up to 8 zones",
    body: "Pressurize, check every zone, adjust heads, program the controller.",
    href: "/book",
    cta: "Book a turn-on",
    image: { src: "/images/lawn-sprinkler-water.jpg", alt: "Sprinkler watering a lawn in spring" },
  },
  {
    title: "Smart controllers & efficiency",
    price: "Rachio install $350, rebates up to $150",
    body: "Rachio 3 installed, programmed, and handed off. It skips watering when rain is coming and shows you the hours saved.",
    href: "/smart-controllers",
    cta: "Check your city's rebate",
    image: { src: "/images/rachio-app-usage.png", alt: "Rachio app showing hours of watering time saved in a month", contain: true },
  },
  {
    title: "Drip & garden zones",
    price: "Quoted on site",
    body: "Convert a spray zone to drip, add a garden zone, or fix a leaking drip line.",
    href: "/water-efficiency",
    cta: "Request a quote",
    image: { src: "/images/micro-spray-garden-bed.jpg", alt: "Micro-spray irrigation watering a garden bed" },
  },
]

export function ProblemTiles() {
  return (
    <section className="bg-background section-padding-y" aria-labelledby="problems-heading">
      <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
        <SectionHeader
          tagline="Sprinkler & irrigation services"
          taglineAsEyebrow
          title="What's going on with your sprinklers?"
          titleId="problems-heading"
          description="Pick the problem. Every price below is the real price, before you call."
          align="left"
        />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TILES.map((tile) => (
            <li key={tile.title}>
              <Link href={tile.href} className="group block h-full">
                <Card className="h-full overflow-hidden rounded-lg border-border hover:border-primary/40 transition-colors flex flex-col">
                  <div className={`relative aspect-[16/9] ${tile.image.contain ? "bg-stone" : ""}`}>
                    <Image
                      src={tile.image.src}
                      alt={tile.image.alt}
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      className={tile.image.contain ? "object-contain p-2" : "object-cover"}
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-2xl font-semibold text-navy">{tile.title}</CardTitle>
                    <p className="text-sm font-semibold text-primary-dark">{tile.price}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 flex-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">{tile.body}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-primary transition-colors">
                      {tile.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
