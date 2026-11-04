import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The city page hero, built on the homepage hero's shape: a photo of the
// place itself, a one-line eyebrow saying how far we are, the display line,
// and the search-phrase H1 under it (first in the DOM, `order-first` keeps
// the display line visually on top). Below `lg` the sticky bar carries Call
// and Book Online, so the hero shows no buttons there.

export function CityHero({
  name,
  county,
  distance,
  image,
  alt,
  position = "center",
}: {
  name: string
  county: string
  distance: string
  image: string
  alt: string
  position?: string
}) {
  return (
    <section className="relative min-h-[520px] md:min-h-[600px] flex items-end" aria-labelledby="city-heading">
      <Image src={image} alt={alt} fill priority sizes="100vw" quality={82} className="object-cover" style={{ objectPosition: position }} />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/45 to-charcoal/5" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charcoal/60 to-transparent" aria-hidden="true" />
      <div className="relative container-padding-x mx-auto max-w-7xl w-full pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="flex flex-col gap-5 max-w-2xl">
          <h1
            id="city-heading"
            className="font-sans text-lg md:text-xl font-semibold text-white leading-snug max-w-xl"
            style={{ letterSpacing: 0 }}
          >
            Sprinkler repair, installation and seasonal service in {name}, CO.
          </h1>
          <p className="order-first text-sm font-semibold uppercase tracking-widest text-primary-light">
            Service area &middot; {county} &middot; {distance}
          </p>
          <p className="order-first font-display text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[0.98] max-w-3xl">
            Sprinklers in {name}, handled.
          </p>
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
