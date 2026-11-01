import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { siteConfig } from "@/lib/seo"

// One primary action, one quiet secondary. The phone number is a text link
// rather than a second button so the block never reads as a choice.

export function CTAStrip() {
  return (
    <section className="bg-navy section-padding-y" aria-labelledby="cta-heading">
      <div className="container-padding-x mx-auto max-w-7xl text-center">
        <div className="flex flex-col items-center gap-6">
          <h2 id="cta-heading" className="font-display text-5xl md:text-6xl font-bold text-white">
            Go find your trail.
          </h2>
          <p className="text-white/80 text-lg max-w-xl">
            Repairs, turn-ons and blowouts book online in two minutes. New systems start with a quick yard visit.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link href="/book" className={buttonVariants({ size: "lg" })}>
              Book Online
            </Link>
            <a
              href={PHONE_TEL}
              className="text-sm font-semibold text-white underline underline-offset-4 decoration-white/50 hover:decoration-white"
            >
              or call {PHONE_DISPLAY}
            </a>
          </div>
          <p className="text-xs text-white/60">
            Licensed and insured &middot; {siteConfig.address.street}, {siteConfig.address.locality}, CO {siteConfig.address.postalCode}
          </p>
        </div>
      </div>
    </section>
  )
}
