import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { SeasonalPill } from "@/components/sections/SeasonalPill"

// The city page banner. Same frame and height as every other interior page
// (PageBanner: centered, bottom-weighted charcoal scrim); only the homepage
// gets the big hero. The H1 is first in the DOM so search engines read it before
// the display line; `order-first` keeps the display line on top. The
// seasonal chip and the one Book Online show from md / lg up, the same rule
// as the homepage hero: below lg the sticky bar carries the button.

export function CityHero({
  name,
  county,
  image,
  alt,
  position = "center",
}: {
  name: string
  county: string
  image: string
  alt: string
  position?: string
}) {
  return (
    <section className="relative py-20 md:py-28 flex items-center" aria-labelledby="city-heading">
      <Image src={image} alt={alt} fill priority sizes="100vw" quality={82} className="object-cover" style={{ objectPosition: position }} />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/45 to-charcoal/25" aria-hidden="true" />
      <div className="relative container-padding-x mx-auto max-w-7xl text-center flex flex-col items-center gap-4">
        <h1 id="city-heading" className="font-sans text-lg md:text-xl font-semibold text-white/90 max-w-2xl" style={{ letterSpacing: 0 }}>
          Sprinkler repair, installation and seasonal service in {name}, CO.
        </h1>
        <p className="order-first text-xs font-semibold uppercase tracking-widest text-primary-light">
          Serving {name} &middot; {county}
        </p>
        <p className="order-first font-display text-5xl md:text-6xl font-bold text-white leading-[0.98]">
          Sprinklers in {name}, handled.
        </p>
        <SeasonalPill onDark className="hidden md:inline-flex" />
        <div className="hidden lg:block mt-2">
          <Link href="/book" className={buttonVariants({ size: "lg" })}>
            Book Online
          </Link>
        </div>
      </div>
    </section>
  )
}
