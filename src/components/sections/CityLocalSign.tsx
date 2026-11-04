import Link from "next/link"
import { Droplets, Clock, ShieldCheck, BadgeDollarSign } from "lucide-react"
import type { CityData } from "@/lib/city-data"
import { DefinitionList, type DefinitionItem } from "@/components/sections/DefinitionList"

// The town's watering rules. Heading, summary, provider and the checked-on
// date on the left (so the heading column carries real information); the
// rules as a plain icon definition list on the right. No card chrome: the
// section background does the grouping. Everything comes from city-data.ts.

export function CityLocalSign({ data }: { data: CityData }) {
  const g = data.guide
  const items: DefinitionItem[] = [
    { term: "Watering days", definition: data.wateringDays, icon: Droplets },
    { term: "Time of day", definition: data.wateringTimeRestriction, icon: Clock },
    { term: "Backflow testing", definition: data.backflowDeadline, icon: ShieldCheck },
  ]
  if (g?.rebate) {
    items.push({
      term: "Rebates",
      icon: BadgeDollarSign,
      definition: (
        <Link href={g.rebate.href} className="underline underline-offset-4 decoration-primary/40 hover:decoration-primary text-foreground">
          {g.rebate.label}
        </Link>
      ),
    })
  }

  return (
    <section className="bg-background section-padding-y" aria-labelledby="sign-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div className="flex flex-col gap-4 max-w-[60ch]">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Watering in {data.name}</p>
            <h2 id="sign-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              {data.name}&apos;s watering rules
            </h2>
            <p className="text-lg text-muted-foreground">{data.restrictionSummary}</p>
            <p className="text-muted-foreground">
              Water provider: {data.waterProvider}
              {data.waterProviderPhone && (
                <>
                  {" "}&middot;{" "}
                  <a href={`tel:${data.waterProviderPhone.replace(/[^0-9]/g, "")}`} className="text-primary hover:underline">
                    {data.waterProviderPhone}
                  </a>
                </>
              )}
            </p>
            {g?.rulesCheckedOn && (
              <p className="text-sm text-muted-foreground">
                Checked {g.rulesCheckedOn}. Their current rules always apply.
              </p>
            )}
          </div>
          <DefinitionList items={items} variant="plain" columns={2} />
        </div>
      </div>
    </section>
  )
}
