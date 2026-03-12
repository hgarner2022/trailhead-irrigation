import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative min-h-[600px] flex items-center" aria-labelledby="hero-heading">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/boulder-colorado.jpg')" }}
      >
        <div className="absolute inset-0 bg-navy/70" />
      </div>
      <div className="relative container-padding-x mx-auto max-w-7xl py-24 md:py-32">
        <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
          >
            Trailhead Lawn &amp; Irrigation LLC
          </h1>
          <p className="text-lg md:text-xl text-white/90 text-pretty max-w-2xl">
            Professional sprinkler installation, repair, and seasonal maintenance serving Weld County, Erie, Longmont, Louisville &amp; Lafayette.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Button size="lg">
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-white bg-transparent text-white hover:bg-white/10 hover:text-white">
              <a href="tel:9706927270">Call (970) 692-7270</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
