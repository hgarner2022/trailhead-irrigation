import Link from "next/link"
import { Droplets, Clock, ShieldCheck, Phone, BadgeDollarSign } from "lucide-react"
import type { CityData } from "@/lib/city-data"

// The watering rules for this town: big numbers on the left, the rules on
// the right, and the date they were last checked. All from city-data.ts.

export function CityLocalSign({ data }: { data: CityData }) {
  const g = data.guide
  const rows: { icon: typeof Droplets; label: string; value: string }[] = [
    { icon: Droplets, label: "Watering days", value: data.wateringDays },
    { icon: Clock, label: "Time of day", value: data.wateringTimeRestriction },
    { icon: ShieldCheck, label: "Backflow testing", value: data.backflowDeadline },
  ]

  return (
    <section className="bg-background section-padding-y" aria-labelledby="sign-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16">
          {/* Left: what matters right now, with the big numbers */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Watering in {data.name}</p>
              <h2 id="sign-heading" className="font-display text-4xl md:text-5xl font-bold text-navy mt-2">
                {data.name}&apos;s watering rules
              </h2>
            </div>
            <dl className="grid grid-cols-2 gap-6 min-w-0">
              {g?.wateringDaysPerWeek && (
                <div className="border-l-2 border-primary pl-4 min-w-0">
                  <dd className="font-display text-4xl sm:text-5xl font-bold text-navy leading-none">{g.wateringDaysPerWeek}</dd>
                  <dt className="text-sm text-muted-foreground mt-2">{data.restrictionLevel === "mandatory" ? "watering days a week, max" : "watering days a week"}</dt>
                </div>
              )}
              <div className="border-l-2 border-primary pl-4 min-w-0">
                <dd className="font-display text-3xl sm:text-5xl font-bold text-navy leading-none capitalize break-words">{data.restrictionLevel === "none" ? "Open" : data.restrictionLevel}</dd>
                <dt className="text-sm text-muted-foreground mt-2">current watering rules</dt>
              </div>
            </dl>
            <p className="text-muted-foreground">{data.restrictionSummary}</p>
          </div>

          {/* Right: the rules, one row each */}
          <div className="rounded-lg border border-border bg-cream">
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.label} className="flex gap-4 p-5">
                  <r.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{r.label}</p>
                    <p className="text-foreground mt-1">{r.value}</p>
                  </div>
                </li>
              ))}
              <li className="flex gap-4 p-5">
                <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Water provider</p>
                  <p className="text-foreground mt-1">{data.waterProvider}</p>
                  {data.waterProviderPhone && (
                    <a href={`tel:${data.waterProviderPhone.replace(/[^0-9]/g, "")}`} className="text-primary hover:underline">
                      {data.waterProviderPhone}
                    </a>
                  )}
                </div>
              </li>
              {g?.rebate && (
                <li className="flex gap-4 p-5">
                  <BadgeDollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rebates</p>
                    <Link href={g.rebate.href} className="text-foreground mt-1 inline-block underline underline-offset-4 decoration-primary/40 hover:decoration-primary">
                      {g.rebate.label}
                    </Link>
                  </div>
                </li>
              )}
            </ul>
            {g?.rulesCheckedOn && (
              <p className="px-5 py-3 text-xs text-muted-foreground border-t border-border">
                Checked {g.rulesCheckedOn} against the {data.waterProvider}. If they change the rules, they win.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
