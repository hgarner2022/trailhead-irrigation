import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatTile } from "@/components/blocks/StatTile"
import { committedByMonth } from "@/lib/admin/metrics"
import type { AdminData } from "@/lib/admin/types"
import { SEASON, jobTiles, pageContext, seasonDescription, tileModels } from "./home-model"
import { RevenueScreen } from "./RevenueScreen"

// Reports: out of the daily path (docs/plans build-1). Everything Home used to open with, the revenue this month,
// passes sold, quotes and invoices, the counts of visits that need a person and the season line, then everything
// Revenue showed: revenue by month, upcoming charges and renewals. Pure composition over `data` and a fixed
// `today`; the route's page.tsx supplies both. Server component.

export interface ReportsScreenProps {
  data: AdminData
  today: string
}

export function ReportsScreen({ data, today }: ReportsScreenProps) {
  const bars = committedByMonth(data.passes, SEASON)
  return (
    <div data-slot="reports-screen" className="space-y-6">
      <PageHeader title="Reports" context={pageContext(data, today)} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tileModels(data, today).map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <div data-slot="job-counts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {jobTiles(data, today).map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitleHeading>{`Season ${SEASON}`}</CardTitleHeading>
          <CardDescription>{seasonDescription(data)}</CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonLine
            mode="business"
            season={SEASON}
            bars={bars}
            today={today}
            caption={bars.length === 0 ? "No passes sold yet. The line fills in as customers reserve their season." : undefined}
          />
        </CardContent>
      </Card>

      <RevenueScreen data={data} today={today} embedded />
    </div>
  )
}
