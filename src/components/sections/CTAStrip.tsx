import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { RidgeEdge } from "@/components/sections/RidgeEdge"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { siteConfig } from "@/lib/seo"

// One primary action, one quiet secondary. The phone number is a text link
// rather than a second button so the block never reads as a choice. The
// brand line is the heading; the sentence under it stays short and plain.

export function CTAStrip() {
  return (
    <>
      {/* The page ends at the Front Range skyline. The edge overlaps only
          the previous section's bottom padding, so it never covers copy. It is a sibling of the section, not its first
          child: inside, its negative margin would collapse through the
          section's top and the navy would paint over the ridge. */}
      <RidgeEdge to="navy" />
      <section className="bg-navy pt-14 md:pt-20 pb-16 md:pb-24" aria-labelledby="cta-heading">
        <div className="container-padding-x mx-auto max-w-7xl text-center">
          <div className="flex flex-col items-center gap-6">
            {/* Page-title size (same as PageBanner's h1), not bigger: Hannah picked this over the larger display size, Nov 5 2026. */}
            <h2 id="cta-heading" className="font-display text-4xl md:text-5xl font-bold text-white">
              Go find your trail.
            </h2>
            <p className="text-white/80 text-lg max-w-xl">
              Pick a time online and we&apos;ll take it from there. Repairs, turn-ons, blowouts and new systems, in Erie and across the Front Range.
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
    </>
  )
}
