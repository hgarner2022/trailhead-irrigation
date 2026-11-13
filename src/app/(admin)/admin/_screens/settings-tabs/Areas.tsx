"use client"

import { ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import type { Town } from "@/lib/admin/types"
import { TOWNS, addArea, moveTownInOrder, setAreaName, toggleAreaTown, type SettingsState } from "../settings-model"
import { CommitInput, type Apply } from "./fields"
import { cn } from "@/lib/utils"

// Area groups are the towns a truck works on one day; a town is in at most
// one group, so pressing it in a second group takes it out of the first.
// Below, the order the scheduler runs the towns in: fall north and high
// first, spring the other way.

function OrderList({ season, order, apply }: { season: "fall" | "spring"; order: Town[]; apply: Apply }) {
  const name = season === "fall" ? "Fall order" : "Spring order"
  return (
    <Card>
      <CardHeader>
        <CardTitleHeading>{name}</CardTitleHeading>
        <p className="text-sm text-muted-foreground">
          {season === "fall" ? "Fall runs north and high first, where the first hard freeze lands." : "Spring runs the other way, south and low first."}
        </p>
      </CardHeader>
      <CardContent>
        <ol aria-label={name} className="divide-y divide-border">
          {order.map((town, i) => (
            <li key={town} className="flex items-center gap-3 py-2">
              <span className="w-6 text-center font-display text-lg text-primary-deep">{i + 1}</span>
              <span className="flex-1 text-sm text-foreground">{town}</span>
              <Button variant="ghost" size="icon" aria-label={`Move ${town} up in the ${season} order`} disabled={i === 0} onClick={() => apply((s, a) => moveTownInOrder(s, season, town, "up", a))}>
                <ChevronUp className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Move ${town} down in the ${season} order`} disabled={i === order.length - 1} onClick={() => apply((s, a) => moveTownInOrder(s, season, town, "down", a))}>
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

export function Areas({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { areas, fallTownOrder, springTownOrder } = state.settings
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <Card key={area.id}>
            <CardHeader>
              <CommitInput label={`${area.name} area name`} value={area.name} onCommit={(v) => apply((s, a) => setAreaName(s, area.id, v, a))} />
            </CardHeader>
            <CardContent>
              <div role="group" aria-label={`Towns in ${area.name}`} className="flex flex-wrap gap-2">
                {TOWNS.map((town) => {
                  const on = area.towns.includes(town)
                  return (
                    <button
                      key={town}
                      type="button"
                      aria-pressed={on}
                      onClick={() => apply((s, a) => toggleAreaTown(s, area.id, town, a))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        on ? "border-primary-dark bg-primary-dark text-white" : "border-border bg-background text-foreground hover:bg-stone",
                      )}
                    >
                      {town}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={() => apply((s, a) => addArea(s, a))}>
        <Plus className="size-4" aria-hidden />
        Add area
      </Button>
      <div className="grid gap-4 md:grid-cols-2">
        <OrderList season="fall" order={fallTownOrder} apply={apply} />
        <OrderList season="spring" order={springTownOrder} apply={apply} />
      </div>
    </div>
  )
}
