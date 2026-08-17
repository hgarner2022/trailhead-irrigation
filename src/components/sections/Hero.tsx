import { buttonVariants } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative min-h-[600px] flex items-center" aria-labelledby="hero-heading">
      <Image
        src="/images/boulder-colorado.jpg"
        alt="Colorado Front Range landscape"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        quality={75}
      />
      <div className="absolute inset-0 bg-navy/70" />
      <div className="relative container-padding-x mx-auto max-w-7xl py-24 md:py-32">
        <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <p className="text-sm md:text-base font-semibold uppercase tracking-widest text-primary-light">
            Local Sprinkler Company
          </p>
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
          >
            Sprinkler Repairs and Installations
          </h1>
          <p className="text-lg md:text-xl text-white/90 text-pretty max-w-2xl">
            Locally owned and operated. Installation, repair, winterization, and
            spring turn-on across the Northern Colorado Front Range.
          </p>
          <div className="mt-2">
            <Link href="/book" className={buttonVariants({ size: "lg" })}>
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
