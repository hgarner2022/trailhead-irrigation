import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { SeasonalPill } from "@/components/sections/SeasonalPill"

// The tagline is display text; the H1 is still the keyword sentence. Google
// reads tags, not font sizes, so search gets its sentence and people get a
// reason to stay. Two doors: repair/seasonal people book, installation
// people want a number and a conversation first.

/**
 * The hero follows the season. Only the H1 and the photo change; the title
 * tag and meta description stay fixed year-round (search sees a stable page
 * with a seasonal headline). Every H1 keeps "sprinkler", "Erie, CO" and the
 * Front Range. The homepage revalidates daily (see src/app/page.tsx) so the
 * month is read from the calendar, not from the last deploy.
 */
/** One sentence on what is booking now, for the city pages' local sign. */
export function seasonNote(date: Date) {
  const m = date.getMonth()
  if (m === 2 || m === 3 || m === 4) return "Spring turn-ons and tune-ups are booking now for April and May."
  if (m === 8 || m === 9) return "Fall blowouts are booking now for October."
  if (m === 10) return "Fall blowouts are booking through November."
  return "Repairs and new system quotes are booking now."
}

export function heroSeason(date: Date) {
  const m = date.getMonth() // 0 = January
  if (m === 2 || m === 3 || m === 4) {
    return {
      h1: "Spring sprinkler turn-ons and tune-ups in Erie, CO, serving the Northern Colorado Front Range. Booking now for April and May.",
      src: "/images/trail-mountain-meadow.jpg",
      alt: "Two-track trail through a mountain meadow at sunrise in the Colorado Rockies",
      position: "object-[60%_center]",
    }
  }
  if (m === 8 || m === 9) {
    return {
      h1: "Fall sprinkler blowouts in Erie, CO, serving the Northern Colorado Front Range. Booking now for October.",
      src: "/images/fall-blowout-yard-erie.jpg",
      alt: "Sprinkler head blowing out mist on a leaf-covered lawn in front of an Erie home, Front Range peaks behind",
      position: "object-[70%_center]",
    }
  }
  if (m === 10) {
    return {
      h1: "Fall sprinkler blowouts in Erie, CO, serving the Northern Colorado Front Range. Booking through November.",
      src: "/images/fall-blowout-yard-erie.jpg",
      alt: "Sprinkler head blowing out mist on a leaf-covered lawn in front of an Erie home, Front Range peaks behind",
      position: "object-[70%_center]",
    }
  }
  return {
    h1: "Sprinkler repair and irrigation system installation in Erie, CO, serving the Northern Colorado Front Range.",
    src: "/images/trail-mountain-meadow.jpg",
    alt: "Two-track trail through a mountain meadow at sunrise in the Colorado Rockies",
    position: "object-[60%_center]",
  }
}

export function Hero() {
  const season = heroSeason(new Date())
  return (
    <section className="relative flex items-end min-h-[560px] md:min-h-[640px] lg:min-h-[720px]" aria-labelledby="hero-heading">
      {/* The trail. This is the promise behind "Go find your trail": the
          customer is up here, not in the yard. The gradient darkens the
          left third for the text and leaves the peak clear on the right. */}
      <Image
        src={season.src}
        alt={season.alt}
        fill
        priority
        className={cn("object-cover", season.position)}
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
          {/* The chip is desktop-only; on a phone it is the first line of the
              mobile menu, and the hero has to stay short. */}
          <SeasonalPill onDark className="order-first hidden md:flex w-fit" />
          {/* The H1 comes first in the DOM so search engines read it before the
              tagline; `order-first` on the tagline keeps it visually on top. */}
          <h1
            id="hero-heading"
            className="font-sans text-lg md:text-xl font-semibold text-white leading-snug max-w-xl"
            style={{ letterSpacing: 0 }}
          >
            {season.h1}
          </h1>
          <p className="order-first font-display text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[0.98] max-w-3xl">
            Less time in the yard. More time on the trail.
          </p>
          {/* Below lg the StickyBar carries Call + Book Online on every page,
              so the hero carries no buttons there: one Book Online on screen,
              not two. Desktop has no sticky bar, so it gets both buttons. */}
          <div className="hidden lg:flex flex-row gap-3 mt-1">
            <Link href="/book" className={buttonVariants({ size: "lg" })}>
              Book Online
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
