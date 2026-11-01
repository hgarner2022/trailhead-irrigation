import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

// The tagline is display text; the H1 is still the keyword sentence. Google
// reads tags, not font sizes, so search gets its sentence and people get a
// reason to stay. Two doors: repair/seasonal people book, installation
// people want a number and a conversation first.

export function Hero() {
  return (
    <section className="relative flex items-end min-h-[520px] md:min-h-[600px]" aria-labelledby="hero-heading">
      <Image
        src="/images/boulder-foothills-fence.jpg"
        alt="Split-rail fence on a foothills meadow above Boulder, Colorado"
        fill
        priority
        className="object-cover object-[center_60%]"
        sizes="100vw"
        quality={78}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/55 to-charcoal/15"
        aria-hidden="true"
      />
      <div className="relative container-padding-x mx-auto max-w-7xl w-full pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="flex flex-col gap-5 max-w-2xl">
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
