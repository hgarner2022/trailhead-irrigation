import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CTAStrip() {
  return (
    <section className="bg-navy section-padding-y">
      <div className="container-padding-x mx-auto max-w-7xl text-center">
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg max-w-xl">
            Get a free quote on irrigation installation, repair, or seasonal service. Call today or send us a message.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
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
