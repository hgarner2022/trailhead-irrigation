import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { MonthBars } from "@/components/blocks/Chart"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatTile } from "@/components/blocks/StatTile"
import type { AdminData } from "@/lib/admin/types"
import { chargedSoFar, committedRevenue, formatMoney } from "@/lib/admin/metrics"
import { SEASON } from "./home-model"
import { hasRenewals, renewalRows, seriesFor, seriesWords, upcomingRows } from "./revenue-model"

// Revenue in two parts: paid invoices by month against the year before, and
// the Season Pass commitments for the coming season. Pure composition over
// `data` and a fixed `today`; the route's page.tsx supplies both. Server
// component. The Renewals card appears only once a pass from an earlier
// season exists; with none it is left out rather than shown empty.

export interface RevenueScreenProps {
  data: AdminData
  /** ISO datetime the upcoming charges are read from */
  today: string
}

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

const passesWord = (n: number) => (n === 1 ? "1 pass" : `${n} passes`)

export function RevenueScreen({ data, today }: RevenueScreenProps) {
  const active = data.passes.filter((p) => p.status === "active").length
  const series = seriesFor(data.monthTotals)
  const thisYear = series?.[0].year ?? SEASON - 1
  const upcoming = upcomingRows(data.passes, today, 10)
  const renewals = renewalRows(data.passes, SEASON)

  return (
    <div data-slot="revenue-screen" className="space-y-6">
      <PageHeader title="Revenue" context={`${thisYear} against ${thisYear - 1}, and the ${SEASON} Season Pass commitments.`} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label={`Committed this season, ${passesWord(active)}`} value={formatMoney(committedRevenue(data.passes))} />
        <StatTile label="Charged so far" value={formatMoney(chargedSoFar(data.passes))} />
      </div>

      <Card>
        <CardHeader>
          <Title>Revenue by month</Title>
          <CardDescription>
            {!series
              ? "Paid invoices by issue month."
              : series[1]
                ? `Paid invoices by issue month, ${seriesWords(series)}.`
                : `Paid invoices by issue month. ${thisYear - 1} is not in Jobber yet, so only ${thisYear} shows.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {series ? <MonthBars series={series} /> : <p className="text-sm text-muted-foreground">No paid invoices yet. The bars fill in as invoices are paid.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Title>Upcoming charges</Title>
          <CardDescription>The next pass visits that are booked and not yet charged.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No charges scheduled yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((row) => (
                <li key={row.key} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{row.date}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {row.name}
                    <span className="text-muted-foreground"> · {row.town}</span>
                  </span>
                  <span className="hidden text-muted-foreground sm:inline">{row.visit}</span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-foreground">{formatMoney(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {hasRenewals(data.passes, SEASON) && (
        <Card>
          <CardHeader>
            <Title>Renewals</Title>
            <CardDescription>{`Passes from before ${SEASON} whose customers have not reserved the new season.`}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {renewals.map((pass) => (
                <li key={pass.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {pass.firstName}
                    <span className="text-muted-foreground"> · {pass.town}</span>
                  </span>
                  <span className="text-muted-foreground">{`Season ${pass.season}`}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
