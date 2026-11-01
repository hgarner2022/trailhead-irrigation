import { SectionHeader } from "@/components/sections/SectionHeader"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

// Six problems, a real price on each. The whole card is the link: no button
// text, a corner arrow and a lift on hover make that obvious. Each card goes
// to the page that explains that service, never straight to a form.

const TILES = [
  {
    title: "Sprinkler repair",
    price: "$145 visit, small fixes included",
    body: "Broken heads, stuck valves, leaks, zones that won't run. Diagnosed and usually fixed the same visit.",
    href: "/services",
    image: { src: "/images/sprinkler-spray-head-lawn.jpg", alt: "Pop-up spray head watering a green lawn" },
  },
  {
    title: "New system installation",
    price: "$3,000 to $6,000 typical",
    body: "Designed for clay soil and local watering rules. Most yards are done in two days.",
    href: "/sprinkler-installation",
    image: { src: "/images/sprinkler-golden-hour.jpg", alt: "Sprinkler head spraying at sunset beside a boardwalk" },
  },
  {
    title: "Spring turn-on & tune-up",
    price: "$145 up to 8 zones",
    body: "Pressurize, check every zone, adjust heads, program the controller. A mid-summer tune-up is the same price.",
    href: "/pricing",
    image: { src: "/images/home-lawn-spring.jpg", alt: "Home with a green spring lawn and flower beds" },
  },
  {
    title: "Fall blowout & winterization",
    price: "$95 up to 6 zones",
    body: "Compressed-air blowout before the first hard freeze. Book online in two minutes.",
    href: "/sprinkler-blowout",
    image: { src: "/images/lawn-sprinkler-water.jpg", alt: "Fine mist over a lawn and stepping stones" },
  },
  {
    title: "Smart controllers",
    price: "Rachio install $350, rebates up to $150",
    body: "Rachio 3 installed, programmed, and handed off. It skips watering when rain is coming and shows you the hours saved.",
    href: "/smart-controllers",
    image: { src: "/images/rachio-app-usage.png", alt: "Rachio app showing hours of watering time saved in a month", contain: true },
  },
  {
    title: "Water efficiency & drip",
    price: "Nozzle upgrade $400, drip quoted",
    body: "Rotator nozzles that cut water use about 30%, drip for beds and gardens, and the rebates that pay for part of it.",
    href: "/water-efficiency",
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
              <Link
                href={tile.href}
                aria-label={`${tile.title}: ${tile.price}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <div className={`relative aspect-[16/9] ${tile.image.contain ? "bg-stone" : ""}`}>
                  <Image
                    src={tile.image.src}
                    alt={tile.image.alt}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className={
                      tile.image.contain
                        ? "object-contain p-2"
                        : "object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-2xl font-semibold text-navy group-hover:text-primary transition-colors">
                      {tile.title}
                    </h3>
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-primary-dark">{tile.price}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tile.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
