import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { NeedsAttention, type NeedsAttentionProps } from "@/components/blocks/NeedsAttention"
import { PageHeader } from "@/components/blocks/PageHeader"
import { TodayMoney } from "@/components/blocks/TodayMoney"
import { formatMoney } from "@/lib/admin/metrics"
import type { AdminData } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import type { CustomersActions } from "./CustomersScreen"
import type { JobActions } from "./job-actions-types"
import { NewJobButton } from "./NewJob"
import { RecordHost } from "./RecordHost"
import { initialRecord } from "@/lib/admin/record-url"
import { greeting, pageContext, todayMoney } from "./home-model"
import { weekView } from "./home-week"
import { todayView } from "./today-model"
import { visitPrice } from "./visit-panel-model"
import { HomeMap } from "./HomeMap"
import { TodayVisits } from "./TodayVisits"
import { routePeople } from "@/lib/admin/people"
import { jobIdOfPass } from "@/lib/admin/links"

// What Hannah opens to, as Today (17 Nov 2026, after Jobber's "Today's appointments": "a variation of this, today's visits in our
// language, a little bit more useful"): the header, then the Today money strip (what is on today, what is done, what is ahead,
// what the done visits owe, and View schedule), then today's visits in three groups or by person beside the map, then Needs action
// ("what needs me"), grouped by cause, every row with its button and Dismiss. Reports keeps everything else. Pure composition over
// `data` and a fixed `today`; the route's page.tsx supplies both. Server component; the rows, the toggle and the map are client
// code. The map folds under the groups on a phone.

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
  /** the visit panel a stop opens, and New job; server actions in the app */
  visitActions?: VisitActions
  /** the job panel a record opens; server actions in the app */
  jobActions?: JobActions
  /** the customer panel's marketing opt-out */
  customerActions?: CustomersActions
  /** the record open on first render, from `?customer=`, `?job=` or `?visit=` in the address */
  defaultCustomerId?: string
  defaultJobId?: string
  defaultVisitId?: string
}

export function HomeScreen({ data, today, readOnly = false, onAttentionAction, onDismiss, visitActions, jobActions, customerActions, defaultCustomerId, defaultJobId, defaultVisitId }: HomeScreenProps) {
  const view = todayView(data, today)
  const money = todayMoney(data.visits, (v) => visitPrice(data, v), today)
  // With nothing today the screen says when the next visits are, once, as a link to that day.
  const week = view.rows.length === 0 ? weekView(data, today) : null
  // A row that names only a pass opens that pass's job on Visits, so it carries the job.
  const attention = data.attention.map((a) => (a.passId && !a.jobId ? { ...a, jobId: jobIdOfPass(data, a.passId) } : a))
  return (
    <div data-slot="home-screen" className="space-y-6">
      <RecordHost data={data} today={today} readOnly={readOnly} visitActions={visitActions} jobActions={jobActions} customerActions={customerActions} initial={initialRecord({ customerId: defaultCustomerId, jobId: defaultJobId, visitId: defaultVisitId })}>
        <PageHeader title={greeting(today)} context={pageContext(data, today)} actions={!readOnly && <NewJobButton data={data} today={today} actions={visitActions} />} />

        <TodayMoney
          figures={[
            { label: "Today", value: formatMoney(money.today) },
            { label: "Done", value: formatMoney(money.done) },
            { label: "Ahead", value: formatMoney(money.ahead) },
            { label: "Unpaid", value: formatMoney(money.owed) },
          ]}
          scheduleHref={`/admin/schedule?day=${view.day}`}
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
            <CardHeader>
              <SectionHeading level={2}>Today&rsquo;s visits</SectionHeading>
            </CardHeader>
            <CardContent>
              <TodayVisits view={view} areas={data.settings.areas} next={week?.day ? { day: week.day, heading: week.heading } : undefined} />
            </CardContent>
          </Card>
          <HomeMap visits={view.stops} people={routePeople(data.settings.people)} className="lg:col-span-2 lg:col-start-4 lg:row-start-1" />
          <Card className="lg:col-span-5 lg:row-start-2">
            <CardHeader>
              <SectionHeading level={2}>Needs action</SectionHeading>
            </CardHeader>
            <CardContent>
              <NeedsAttention items={attention} now={today} onAction={readOnly ? undefined : onAttentionAction} onDismiss={readOnly ? undefined : onDismiss} readOnly={readOnly} />
            </CardContent>
          </Card>
        </div>
      </RecordHost>
    </div>
  )
}
