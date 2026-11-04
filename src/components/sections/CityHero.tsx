import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { SeasonalPill } from "@/components/sections/SeasonalPill"

// The city page banner: the same navy frame as the pricing page banner
// (PageBanner with no photo), so service-area pages feel like the rest of
// the interior pages; the big photo hero is homepage-only. The H1 is first
// in the DOM so search engines read it before the display line;
// `order-first` keeps the display line on top. The seasonal chip shows from
// md and the one Book Online from lg, the same rule as the homepage hero:
// below lg the sticky bar carries the button.

export function CityHero({ name, county }: { name: string; county: string }) {
  return (
    <section className="relative bg-navy py-20 md:py-28 flex items-center" aria-labelledby="city-heading">
      <div className="container-padding-x mx-auto max-w-7xl text-center flex flex-col items-center gap-4">
        <h1 id="city-heading" className="font-sans text-lg md:text-xl font-semibold text-white/85 max-w-2xl" style={{ letterSpacing: 0 }}>
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
