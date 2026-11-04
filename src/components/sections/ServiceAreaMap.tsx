import Link from "next/link"
import { CITY_DATA } from "@/lib/city-data"

// A drawn map of the six towns, every dot a link to that town's page.
// Positions come from real coordinates projected onto the panel (see
// project() below), so the shape is true even though it is a sketch:
// Longmont north, Firestone over by I-25, Erie in the middle, Lafayette
// and Louisville southwest toward Boulder, Broomfield south. I-25 and
// US 287 run through as faint lines, the foothills sit on the west edge,
// and a soft outline wraps the service area. `current` marks the town you
// are on when it is used on a city page.

const BOUNDS = { west: -105.32, east: -104.86, north: 40.21, south: 39.87 }

function project(lat: number, lon: number) {
  const x = ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 100
  const y = ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * 100
  return { x, y }
}

const TOWNS: Record<string, { lat: number; lon: number; label?: "left" | "right" | "below" }> = {
  longmont: { lat: 40.1672, lon: -105.1019 },
  firestone: { lat: 40.1125, lon: -104.9367 },
  erie: { lat: 40.0503, lon: -105.05 },
  lafayette: { lat: 39.9936, lon: -105.0897, label: "right" },
  louisville: { lat: 39.9778, lon: -105.1319 },
  broomfield: { lat: 39.9205, lon: -105.0867 },
}

const BOULDER = project(40.015, -105.2705)
const I25_X = project(40.05, -104.985).x
const US287_X = project(40.05, -105.102).x

export function ServiceAreaMap({
  current,
  title = "Where we work",
  description = "Erie and the five towns around it. Each one has its own watering rules, so each one has its own page.",
  bg = "cream",
}: {
  current?: string
  title?: string
  description?: string
  bg?: "cream" | "background"
}) {
  const panelBg = bg === "cream" ? "bg-background" : "bg-cream"
  return (
    <section className={bg === "cream" ? "bg-cream section-padding-y" : "bg-background section-padding-y"} aria-labelledby="map-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
          <div className="flex flex-col gap-5 max-w-[60ch]">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Service area</p>
            <h2 id="map-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground">{description}</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {CITY_DATA.filter((c) => c.slug !== current).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/services/${c.slug}`}
                    className="text-sm font-semibold text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={`relative aspect-[5/4] rounded-lg border border-border overflow-hidden ${panelBg}`}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
              {/* Map paper: a faint grid */}
              <g stroke="currentColor" strokeWidth="0.15" className="text-border">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((n) => (
                  <g key={n}>
                    <path d={`M${n} 0 L${n} 100`} />
                    <path d={`M0 ${n} L100 ${n}`} />
                  </g>
                ))}
              </g>
              {/* The foothills along the west edge */}
              <path
                d="M0 100 L0 0 L9 0 Q13 10 10 20 Q15 32 11 44 Q16 56 12 68 Q17 82 13 100 Z"
                fill="currentColor"
                className="text-stone"
              />
              <path
                d="M0 0 L5 0 Q8 12 6 24 Q10 38 7 52 Q11 66 8 80 Q11 92 9 100 L0 100 Z"
                fill="currentColor"
                className="text-border/60"
              />
              {/* Service area outline */}
              <ellipse cx="60" cy="50" rx="36" ry="46" fill="currentColor" className="text-primary/5" />
              <ellipse cx="60" cy="50" rx="36" ry="46" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1.5 1.5" className="text-primary/40" />
              {/* Highways */}
              <path d={`M${I25_X} 0 L${I25_X} 100`} stroke="currentColor" strokeWidth="0.9" className="text-border" fill="none" />
              <path d={`M${US287_X} 0 L${US287_X} 100`} stroke="currentColor" strokeWidth="0.6" className="text-border" fill="none" />
            </svg>

            {/* Road labels and landmarks, in HTML so the type stays crisp */}
            <span className="absolute text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ left: `${I25_X}%`, top: "3%", transform: "translateX(6px)" }}>
              I-25
            </span>
            <span className="absolute text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ left: `${US287_X}%`, bottom: "3%", transform: "translateX(-100%) translateX(-6px)" }}>
              US 287
            </span>
            <span className="absolute flex items-center gap-1.5 text-xs text-muted-foreground" style={{ left: `${BOULDER.x}%`, top: `${BOULDER.y}%`, transform: "translate(-30%, -50%)" }}>
              <span className="h-2 w-2 rounded-full bg-border" />
              Boulder
            </span>
            <span className="absolute top-3 right-4 flex flex-col items-center text-[10px] font-semibold text-muted-foreground" aria-hidden="true">
              <span className="font-display text-base leading-none text-navy">N</span>
              <span className="h-3 w-px bg-muted-foreground/60" />
            </span>

            {/* The six towns */}
            {CITY_DATA.map((c) => {
              const t = TOWNS[c.slug]
              if (!t) return null
              const p = project(t.lat, t.lon)
              const isCurrent = c.slug === current
              const labelClass =
                t.label === "left"
                  ? "flex-row-reverse"
                  : t.label === "right"
                    ? "flex-row"
                    : "flex-col"
              return (
                <Link
                  key={c.slug}
                  href={`/services/${c.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 group ${labelClass}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <span
                    className={
                      isCurrent
                        ? "h-5 w-5 rounded-full bg-primary ring-4 ring-primary/25 shrink-0"
                        : "h-3.5 w-3.5 rounded-full bg-navy ring-4 ring-navy/10 group-hover:bg-primary group-hover:ring-primary/20 transition-colors shrink-0"
                    }
                  />
                  <span
                    className={
                      isCurrent
                        ? "font-display text-xl font-bold text-navy whitespace-nowrap"
                        : "text-sm font-semibold text-foreground group-hover:text-primary transition-colors whitespace-nowrap"
                    }
                  >
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
