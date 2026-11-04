import Link from "next/link"
import { CITY_DATA } from "@/lib/city-data"

// A small hand-drawn map of the six towns, the current one marked. Positions
// are relative, roughly true to the map (Longmont north, Firestone
// northeast, Erie in the middle, Lafayette and Louisville southwest,
// Broomfield south). Every dot is a link, so it is also the cross-city block.

const POS: Record<string, { x: number; y: number }> = {
  longmont: { x: 30, y: 16 },
  firestone: { x: 74, y: 22 },
  erie: { x: 52, y: 48 },
  lafayette: { x: 26, y: 62 },
  louisville: { x: 14, y: 80 },
  broomfield: { x: 60, y: 84 },
}

export function ServiceAreaMap({ current }: { current: string }) {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="map-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
          <div className="flex flex-col gap-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Service area</p>
            <h2 id="map-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              The towns next door
            </h2>
            <p className="text-lg text-muted-foreground">
              We&apos;re based in Erie and work in all six. Each town has its own watering rules, so each one has its own page.
            </p>
            <ul className="flex flex-wrap gap-2">
              {CITY_DATA.filter((c) => c.slug !== current).map((c) => (
                <li key={c.slug}>
                  <Link href={`/services/${c.slug}`} className="text-sm font-semibold text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[5/4] rounded-lg border border-border bg-background overflow-hidden">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
              {/* A loose hint of the foothills along the west edge, and I-25 up the east side. */}
              <path d="M0 100 L0 20 Q6 30 4 44 Q8 58 3 72 Q7 86 2 100 Z" fill="currentColor" className="text-stone" />
              <path d="M84 0 L86 100" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2" className="text-border" fill="none" />
              <path d="M30 16 L52 48 L74 22 M52 48 L26 62 L14 80 M52 48 L60 84" stroke="currentColor" strokeWidth="0.5" className="text-border" fill="none" />
            </svg>
            {CITY_DATA.map((c) => {
              const p = POS[c.slug]
              if (!p) return null
              const isCurrent = c.slug === current
              return (
                <Link
                  key={c.slug}
                  href={`/services/${c.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <span
                    className={
                      isCurrent
                        ? "h-5 w-5 rounded-full bg-primary ring-4 ring-primary/25"
                        : "h-3 w-3 rounded-full bg-navy group-hover:bg-primary transition-colors"
                    }
                  />
                  <span className={isCurrent ? "font-display text-xl font-bold text-navy" : "text-sm font-medium text-muted-foreground group-hover:text-primary"}>
                    {c.name}
                  </span>
                </Link>
              )
            })}
            <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-widest text-muted-foreground">Not to scale</p>
          </div>
        </div>
      </div>
    </section>
  )
}
