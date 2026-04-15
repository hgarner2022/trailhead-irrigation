import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
          >
            Erie&apos;s Local Sprinkler Company
          </h1>
          <p className="text-lg md:text-xl text-white/90 text-pretty max-w-2xl">
            Erie&apos;s trusted sprinkler company. Lawn sprinkler installation, repair, winterization &amp; spring turn-on serving Erie, Longmont, Louisville, Lafayette &amp; Weld County.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link
              href="/book"
              className={buttonVariants({ size: "lg" })}
            >
              Book a Service
            </Link>
            <a
              href="tel:9706927270"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Call (970) 692-7270
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
