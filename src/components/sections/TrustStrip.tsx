import { Star, MapPin, ShieldCheck, Map } from "lucide-react"

// The four things a stranger checks before calling a contractor. Static,
// server-rendered, no counters. The review count is deliberately not here:
// it changes constantly and a stale number is a trust negative.

const ITEMS = [
  { icon: Star, value: "5.0 on Google", label: "Read them on Google" },
  { icon: MapPin, value: "Erie, CO", label: "Owner-operated" },
  { icon: ShieldCheck, value: "Licensed & insured", label: "Colorado sprinkler contractor" },
  { icon: Map, value: "Six cities", label: "Erie to Broomfield, within 20 minutes" },
]

export function TrustStrip() {
  return (
    <section className="bg-cream border-b border-border" aria-label="Why homeowners choose Trailhead">
      <div className="container-padding-x mx-auto max-w-7xl">
        <ul className="grid grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <li
              key={item.value}
              className={`flex items-start gap-3 py-5 pr-4 ${i % 2 === 1 ? "pl-4 border-l border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0 lg:border-l lg:pl-4" : ""}`}
            >
              <item.icon className="h-5 w-5 text-primary shrink-0 mt-1" aria-hidden="true" />
              <div>
                <p className="font-display text-xl md:text-2xl font-semibold text-navy leading-none">{item.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
