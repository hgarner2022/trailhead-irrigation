import { StatTile } from "@/components/blocks/StatTile"
import type { MoneyFigure } from "./home-week"

// The money line (Hannah's third job: "how is the money"): four whole-dollar figures, each a link to the rows behind
// it. Reports keeps the charts and everything else. Server component.

export function HomeMoney({ figures, className }: { figures: MoneyFigure[]; className?: string }) {
  return (
    <section data-slot="home-money" aria-labelledby="home-money" className={className}>
      <h2 id="home-money" className="sr-only">
        Money
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {figures.map((figure) => (
          <StatTile key={figure.label} label={figure.label} value={figure.value} href={figure.href} />
        ))}
      </div>
    </section>
  )
}
