import { Star, MapPin, Phone, Wrench } from "lucide-react"

// Quick credibility numbers for the homepage. Lives between the Hero and
// ServicesOverview to give skim-readers fast trust signals before they
// commit to scrolling further.
const STATS = [
  {
    icon: Star,
    headline: "5.0 ★",
    label: "Google reviews",
  },
  {
    icon: Wrench,
    headline: "100%",
    label: "Jobs done by Ryan personally",
  },
  {
    icon: MapPin,
    headline: "5+",
    label: "Northern Colorado cities served",
  },
  {
    icon: Phone,
    headline: "Same-day",
    label: "Callbacks, every time",
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
                {stat.headline}
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
