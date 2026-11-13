import { ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { Pass } from "@/lib/admin/types"
import { writtenDate } from "@/lib/admin/format"
import { seasonSummary, visitRow } from "./pass-page-model"

// A returning customer's earlier seasons under the current one (Hannah,
// 2026-11-12: "if a customer has multiple years, you are only showing one
// year"). One line per season, newest first, that opens to its visits and
// what each cost. Native details, so it works with no script. Server
// component.

export interface EarlierSeasonsProps {
  passes: Pass[]
}

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

export function EarlierSeasons({ passes }: EarlierSeasonsProps) {
  if (passes.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <Title>Earlier seasons</Title>
      </CardHeader>
      <CardContent>
        <ul data-slot="earlier-seasons" className="divide-y divide-border">
          {passes.map((pass) => (
            <li key={pass.id}>
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">{`${pass.season} season`}</span>
                    <span className="block text-sm text-muted-foreground">{seasonSummary(pass)}</span>
                  </span>
                  <StatusPill status={pass.status} label={pass.status === "active" ? "Done" : undefined} />
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="mt-2 divide-y divide-border pl-1">
                  {pass.visits.map((visit) => {
                    const row = visitRow(visit, pass)
                    return (
                      <li key={visit.kind} className="flex items-center gap-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-foreground">{row.name}</span>
                          <span className="block text-muted-foreground">{visit.completedAt ? writtenDate(visit.completedAt) : row.when}</span>
                        </span>
                        <span className="text-right tabular-nums">
                          <span className="block">{`$${visit.amount}`}</span>
                          <span className="block text-muted-foreground">{visit.chargedAt ? "Paid" : "Not charged"}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
