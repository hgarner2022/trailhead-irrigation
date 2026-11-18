import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { NeedsAttention, type NeedsAttentionProps } from "@/components/blocks/NeedsAttention"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanelHost } from "./VisitPanelHost"
import { greeting, pageContext } from "./home-model"
import { moneyFigures, weekView } from "./home-week"
import { HomeMap } from "./HomeMap"
import { HomeMoney } from "./HomeMoney"
import { HomeWeek } from "./HomeWeek"
import { routePeople } from "@/lib/admin/people"
import { jobIdOfPass } from "@/lib/admin/links"

// What Hannah opens to, her four jobs on one screen (docs/plans/2026-11-14-jobs-to-be-done.md): the money line
// ("how is the money"), then Today or Next up ("is the week sane"), the map of that day, and Needs action
// ("what needs me"), grouped by cause, every row with its button and Dismiss. Reports keeps everything else. Pure
// composition over `data` and a fixed `today`; the route's page.tsx supplies both. Server component; the row
// buttons and the map are client code. On a laptop the map sits beside the money line and the day (the money first, Hannah, Nov 17 2026).

export interface HomeScreenProps {
  data: AdminData
  /** ISO datetime the greeting, the date, "updated" and the day shown are read from */
  today: string
  /** a tech sees the day and changes nothing: no row actions */
  readOnly?: boolean
  /** a Needs action row's button; a server action in the app */
  onAttentionAction?: NeedsAttentionProps["onAction"]
  /** Dismiss on a Needs action row, and its Undo; a server action in the app */
  onDismiss?: NeedsAttentionProps["onDismiss"]
  /** the visit panel a stop opens; server actions in the app */
  visitActions?: VisitActions
}

export function HomeScreen({ data, today, readOnly = false, onAttentionAction, onDismiss, visitActions }: HomeScreenProps) {
  const week = weekView(data, today)
  // A row that names only a pass opens that pass's job on Visits, so it carries the job.
  const attention = data.attention.map((a) => (a.passId && !a.jobId ? { ...a, jobId: jobIdOfPass(data, a.passId) } : a))
  return (
    <div data-slot="home-screen" className="space-y-6">
      <VisitPanelHost data={data} today={today} readOnly={readOnly} actions={visitActions}>
        <PageHeader title={greeting(today)} context={pageContext(data, today)} />

        <div className="grid gap-6 lg:grid-cols-5">
          <HomeMoney figures={moneyFigures(data, today)} className="lg:col-span-3 lg:col-start-1 lg:row-start-1" />
          <HomeWeek week={week} today={today} className="lg:col-span-3 lg:col-start-1 lg:row-start-2" />
          <HomeMap visits={week.visits} people={routePeople(data.settings.people)} className="lg:col-span-2 lg:col-start-4 lg:row-span-2 lg:row-start-1" />
          <Card className="lg:col-span-5 lg:row-start-3">
            <CardHeader>
              <CardTitleHeading>Needs action</CardTitleHeading>
            </CardHeader>
            <CardContent>
              <NeedsAttention items={attention} now={today} onAction={readOnly ? undefined : onAttentionAction} onDismiss={readOnly ? undefined : onDismiss} readOnly={readOnly} />
            </CardContent>
          </Card>
        </div>
      </VisitPanelHost>
    </div>
  )
}
