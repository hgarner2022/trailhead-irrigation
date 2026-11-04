import type { Metadata } from "next"
import Image from "next/image"
import { TreelineEdge } from "@/components/sections/TreelineEdge"
import { CTAStrip } from "@/components/sections/CTAStrip"

// Internal preview of the TreelineEdge divider in its likely settings.
// Not linked from anywhere, not in the sitemap, noindex. Delete once the
// edge has found its homes.

export const metadata: Metadata = {
  title: "Treeline edge preview",
  robots: { index: false, follow: false },
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="container-padding-x mx-auto max-w-7xl py-6 text-xs font-semibold uppercase tracking-widest text-muted">
      {children}
    </p>
  )
}

export default function TreelinePreviewPage() {
  return (
    <main>
      <Label>1. Photo into navy, sun on the right (hero or city banner)</Label>
      <section className="relative h-[360px] md:h-[460px]">
        <Image src="/images/erie-aerial-fall-front-range.jpg" alt="" fill sizes="100vw" className="object-cover" />
      </section>
      <TreelineEdge to="navy" sun="right" />
      <section className="bg-navy text-white py-16 md:py-20">
        <div className="container-padding-x mx-auto max-w-7xl text-center flex flex-col items-center gap-4">
          <h2 className="font-display text-4xl md:text-5xl font-bold">Sprinkler pricing, by the visit</h2>
          <p className="text-white/80 max-w-xl">Every price on this page is the price Ryan quotes at the door.</p>
        </div>
      </section>

      <Label>2. Cream into navy, no sun (a plain section break)</Label>
      <section className="bg-cream py-20" />
      <TreelineEdge to="navy" />
      <section className="bg-navy py-16" />

      <Label>3. Navy into cream: light trees rising into a dark band</Label>
      <section className="bg-navy py-20" />
      <TreelineEdge to="cream" sun="left" />
      <section className="bg-cream py-16" />

      <Label>4. Stacked (no overlap), orange band with a cream sun, large</Label>
      <section className="bg-background py-10" />
      <TreelineEdge from="background" to="primary" sun="right" size="lg" />
      <section className="bg-primary py-16" />

      <Label>5. Small, stacked, cream into charcoal</Label>
      <TreelineEdge from="cream" to="charcoal" size="sm" />
      <section className="bg-charcoal py-10" />

      <Label>6. On the closing strip, where every page ends (edge sized to the section padding)</Label>
      <section className="bg-cream section-padding-y">
        <p className="container-padding-x mx-auto max-w-7xl text-center text-muted">Last line of the section above. The trees stay in the padding below this line.</p>
      </section>
      <TreelineEdge to="navy" sun="right" />
      <CTAStrip />
    </main>
  )
}
