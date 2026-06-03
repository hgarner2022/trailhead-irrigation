import { Star, MapPin, Award, Wrench } from "lucide-react"

// Credibility stats for the homepage. Previously these counted up from 0 with
// an IntersectionObserver-driven animation, but that left "0.0 ★" in the
// rendered HTML for crawlers, screenshots, and any user without JS hydrated
// yet — risking the AggregateRating rich result and creating misleading
// snippets for AI search. The animation didn't earn its keep against that
// downside, so the stats now render their final values directly from SSR.

type Stat = {
  icon: typeof Star
  /** Value to display. */
  value: number
  /** Decimal places (e.g. 1 for "5.0"). */
  decimals?: number
  /** Suffix after the number (e.g. " ★", "%", "+"). */
  suffix?: string
  label: string
}

const STATS: Stat[] = [
  {
    icon: Star,
    value: 5.0,
    decimals: 1,
    suffix: " ★",
    label: "Google rating",
  },
  {
    icon: Wrench,
    value: 100,
    suffix: "%",
    label: "Licensed & insured",
  },
  {
    icon: MapPin,
    value: 5,
    suffix: "+",
    label: "Northern Colorado cities served",
  },
  {
    icon: Award,
    value: 10,
    suffix: "+",
    label: "Years of experience",
  },
]

export function StatsStrip() {
  return (
    <section
      className="bg-background border-y border-border py-12 md:py-16"
      aria-label="Trailhead at a glance"
    >
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center gap-2"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-1">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-navy tracking-tight">
                {stat.value.toFixed(stat.decimals ?? 0)}
                {stat.suffix}
              </p>
              <p className="text-sm text-muted-foreground leading-snug max-w-[180px]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
