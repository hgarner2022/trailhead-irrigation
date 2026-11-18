"use client"

import { RECORD_ROW, RecordList, RecordRowEnd, RecordRowText } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPills } from "@/components/blocks/StatusPill"
import { TIME_ZONE } from "@/lib/admin/format"
import { visitJob } from "@/lib/admin/jobs"
import { dayOf } from "@/lib/admin/calendar"
import { jobUrl } from "@/lib/admin/links"
import type { AdminData, Pass } from "@/lib/admin/types"
import { MoneyPill, StagePill } from "./JobPills"
import type { JobRow } from "./jobs-model"
import { OpenVisit, RecordLink } from "./RecordHost"
import { dayLabel, dayOfVisit, kindLabel } from "./visit-panel-model"

// The customer's jobs, newest sale first (a customer has jobs, a job is done in visits): each row is the job (what it is, its stage
// and money) and opens to its visits, each with its day, who has it and its pills, and a link up to the job on Jobs. A visit opens
// the visit panel in place. Client for the open-visit context; CustomerPanel hands in the rows `jobRows` reads from the same data.

export function CustomerJobs({ rows, data, today }: { rows: JobRow[]; data: Pick<AdminData, "visits" | "passes">; today: string }) {
  const day = dayOf(today, TIME_ZONE)
  if (rows.length === 0) return <p className="mt-2 text-sm text-muted-foreground">No jobs on record.</p>
  return (
    <RecordList data-slot="customer-jobs-list">
      {rows.map((row) => {
        const pass: Pass | undefined = row.passId ? data.passes.find((p) => p.id === row.passId) : undefined
        const visits = data.visits.filter((v) => v.jobId === row.id)
        return (
          <li key={row.id}>
            <details className="group py-1.5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [&::-webkit-details-marker]:hidden">
                <RecordRowText title={row.title} detail={[row.passId ? String(row.season) : "", row.soldText].filter(Boolean).join(" · ") || undefined} />
                <RecordRowEnd>
                  <span className="inline-flex flex-wrap items-center justify-end gap-1">
                    <StagePill stage={row.stage} />
                    <MoneyPill money={row.money} />
                  </span>
                </RecordRowEnd>
              </summary>
              <div className="pb-2 pl-3">
                {visits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No visits yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {visits.map((v) => {
                      const d = dayOfVisit(v)
                      return (
                        <li key={v.id}>
                          <OpenVisit id={v.id} className={RECORD_ROW}>
                            <RecordRowText title={kindLabel(v)} detail={[d ? dayLabel(d) : "", v.personName].filter(Boolean).join(", ") || undefined} />
                            <RecordRowEnd>
                              <StatusPills job={visitJob(v, day, TIME_ZONE, pass?.cardFailedAt)} />
                            </RecordRowEnd>
                          </OpenVisit>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <RecordLink kind="job" id={row.id} href={jobUrl(row.id)} className="mt-1 inline-flex min-h-11 items-center text-sm text-primary-dark underline underline-offset-2">
                  Open job
                </RecordLink>
              </div>
            </details>
          </li>
        )
      })}
    </RecordList>
  )
}

/** The Jobs heading and list of a customer's panel. */
export function CustomerJobsSection({ rows, data, today }: { rows: JobRow[]; data: Pick<AdminData, "visits" | "passes">; today: string }) {
  return (
    <section aria-labelledby="customer-jobs" data-slot="customer-jobs">
      <SectionHeading id="customer-jobs">Jobs</SectionHeading>
      <CustomerJobs rows={rows} data={data} today={today} />
    </section>
  )
}
