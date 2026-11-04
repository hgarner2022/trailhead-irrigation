import { SectionHeader } from "@/components/sections/SectionHeader"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

// Six services, no prices (prices live on /pricing). The whole card is the link: no button
// text, a corner arrow and a lift on hover make that obvious. Each card goes
// to the page that explains that service, never straight to a form.

const TILES = [
  {
    title: "Spring: Turn On and Tune Up",
    body: "We pressurize the system, run every zone, adjust the heads and program the controller. A mid-summer tune-up is the same visit.",
    href: "/spring-turn-on",
    image: { src: "/images/home-lawn-spring.jpg", alt: "Home with a green spring lawn and flower beds" },
  },
  {
    title: "Sprinkler Repair",
    body: "Heads, valves, leaks and zones that won't come on. We come out, diagnose the problem and take care of small fixes where we can.",
    href: "/sprinkler-repair",
    image: { src: "/images/sprinkler-spray-head-lawn.jpg", alt: "Pop-up spray head watering a green lawn" },
  },
  {
    title: "Fall: Blowout and Winterization",
    body: "We blow every zone clear with compressed air before the first hard freeze. Booking takes two minutes online.",
    href: "/sprinkler-blowout",
    image: { src: "/images/sprinkler-blowout-erie-co.jpg", alt: "Sprinkler head blowing out compressed air over a leaf-covered lawn in fall" },
  },
  {
    title: "New System Installation",
    body: "We design the system for your yard's clay soil and your city's watering rules, and you get the layout and the price before anyone digs.",
    href: "/sprinkler-installation",
    // Portrait photo in a wide tile: anchor the crop low so the front spray head stays in frame.
    image: { src: "/images/sprinklers-curved-lawn-edge.jpg", alt: "Spray heads watering a curved lawn edged with river rock", position: "center 78%" },
  },
  {
    title: "Smart Controllers",
    body: "We install a Rachio 3, program it and hand it off. It skips watering when rain is coming and shows you the hours it saved.",
    href: "/smart-controllers",
    image: { src: "/images/rachio-3-controller.jpg", alt: "Rachio 3 smart sprinkler controller mounted on a wall" },
  },
  {
    title: "Water Efficiency and Drip",
    body: "Rotator nozzles cut water use by about 30 percent, drip lines feed your beds and garden, and local rebates pay for part of it.",
    href: "/water-efficiency",
    image: { src: "/images/garden-lettuce-bed.jpg", alt: "Lettuce growing in a raised garden bed with log edging" },
  },
]

export function ProblemTiles({
  title = "How can we help with your system?",
  tagline = "Services",
  bg = "background",
  localNotes,
}: {
  title?: string
  tagline?: string
  bg?: "background" | "cream"
  /** One local sentence per tile, keyed by href. Shown under the body on city pages. */
  localNotes?: Record<string, string>
} = {}) {
  return (
    <section className={cn("section-padding-y", bg === "cream" ? "bg-cream" : "bg-background")} aria-labelledby="problems-heading">
      <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
        <SectionHeader
          tagline={tagline}
          taglineAsEyebrow
          title={title}
          titleId="problems-heading"
          align="left"
        />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TILES.map((tile) => (
            <li key={tile.title}>
              <Link
                href={tile.href}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <div className="relative aspect-[16/9]">
                  <Image
                    src={tile.image.src}
                    alt={tile.image.alt}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    style={{ objectPosition: tile.image.position ?? "center" }}
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
                  <p className="text-sm text-muted-foreground leading-relaxed">{tile.body}</p>
                  {localNotes?.[tile.href] && (
                    <p className="text-sm text-foreground leading-relaxed border-l-2 border-primary pl-3 mt-1">{localNotes[tile.href]}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
