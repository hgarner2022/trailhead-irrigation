import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { SeasonalPill } from "@/components/sections/SeasonalPill"

// The tagline is display text; the H1 is still the keyword sentence. Google
// reads tags, not font sizes, so search gets its sentence and people get a
// reason to stay. Two doors: repair/seasonal people book, installation
// people want a number and a conversation first.

export function Hero() {
  return (
    <section className="relative flex items-end min-h-[560px] md:min-h-[640px] lg:min-h-[720px]" aria-labelledby="hero-heading">
      {/* The trail. This is the promise behind "Go find your trail": the
          customer is up here, not in the yard. The gradient darkens the
          left third for the text and leaves the peak clear on the right. */}
      <Image
        src="/images/trail-mountain-meadow.jpg"
        alt="Two-track trail through a mountain meadow at sunrise in the Colorado Rockies"
        fill
        priority
        className="object-cover object-[60%_center]"
        sizes="100vw"
        quality={82}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/45 to-charcoal/5"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charcoal/60 to-transparent"
        aria-hidden="true"
      />
      <div className="relative container-padding-x mx-auto max-w-7xl w-full pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="flex flex-col gap-5 max-w-2xl">
          <SeasonalPill onDark className="w-fit" />
          <p className="font-display text-6xl sm:text-7xl md:text-8xl font-bold text-white leading-[0.95]">
            Go find your trail.
          </p>
          <h1
            id="hero-heading"
            className="font-sans text-lg md:text-xl font-semibold text-white leading-snug max-w-xl"
            style={{ letterSpacing: 0 }}
          >
            Sprinkler repair, installation and fall blowouts in Erie, CO and across the Front Range.
          </h1>
          <p className="text-base text-white/85 max-w-xl">
            Our prices are on this site before you call, and most repairs are done in one visit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-1">
            <Link href="/book" className={buttonVariants({ size: "lg" })}>
              Book a service
            </Link>
            <Link
              href="/sprinkler-installation"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Get an installation quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
