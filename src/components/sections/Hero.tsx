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
      {/* A finished yard in fall light: bright, and it is the thing we sell.
          The gradient darkens the left third for the text and leaves the
          house and lawn clear on the right. */}
      <Image
        src="/images/home-lawn-fall.jpg"
        alt="Home with a green lawn and paver walkway under yellow fall leaves"
        fill
        priority
        className="object-cover object-[65%_center]"
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
            Sprinkler installation, repair, and winterization in Erie, CO and the Northern Colorado Front Range.
          </h1>
          <p className="text-base text-white/85 max-w-xl">
            On time. Explained before the work starts. Fixed in one visit. Owner-operated, licensed and insured.
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
