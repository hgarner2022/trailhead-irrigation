import { CalendarDays } from "lucide-react"
import { EmptyState } from "@/components/blocks/EmptyState"
import { VisitRow } from "@/components/blocks/VisitRow"
import type { PortalJobType } from "@/api/v1/portal/schemas"
import type { ActionResult } from "../pass/_screens/CancelPassDialog"
import { visitLists, type VisitOfJob } from "./account-model"
import { ChangeMyDay } from "./ChangeMyDay"

// Visits: "Coming up" then "Past", one row per visit with its day, what it is, who has it and one pill in the customer's words. A visit the
// customer may move carries Change my day (or Pick a day); one inside two days carries the phone number instead. Pure composition.

export interface VisitsScreenProps {
  jobs: PortalJobType[]
  today: string
  days?: Record<string, string[]>
  onChangeDay?: (visitId: string, day: string) => ActionResult | Promise<ActionResult>
}

function Section({ id, title, list, empty, days, onChangeDay }: { id: string; title: string; list: VisitOfJob[]; empty: string } & Pick<VisitsScreenProps, "days" | "onChangeDay">) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="font-display text-2xl font-semibold leading-none text-navy">
        {title}
      </h2>
      {list.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-background px-4">
          {list.map(({ visit }) => {
            const offered = days?.[visit.id] ?? []
            return (
              <VisitRow
                key={visit.id}
                visit={visit}
                canPick={offered.length > 0}
                change={visit.change}
                action={visit.change === "yes" ? <ChangeMyDay visitId={visit.id} currentDay={visit.scheduledOn} days={offered} onPick={onChangeDay} /> : undefined}
              />
            )
          })}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}

export function VisitsScreen({ jobs, today, days, onChangeDay }: VisitsScreenProps) {
  const { comingUp, past } = visitLists(jobs, today)
  return (
    <main data-slot="account-visits" className="mx-auto max-w-3xl space-y-8 container-padding-x py-8">
      <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">Visits</h1>
      {comingUp.length + past.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No visits yet" line="When we book your work, every visit shows up here with its day and who is coming." />
      ) : (
        <>
          <Section id="visits-coming" title="Coming up" list={comingUp} empty="Nothing booked right now." days={days} onChangeDay={onChangeDay} />
          <Section id="visits-past" title="Past" list={past} empty="No past visits yet." />
        </>
      )}
    </main>
  )
}
