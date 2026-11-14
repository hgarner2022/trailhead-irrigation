import type { Job } from "@/lib/admin/jobs"
import { cn } from "@/lib/utils"
import { StatusPill } from "./StatusPill"

// A visit's two pills (owner, 14 Nov): WORK says what happened to the stop (Needs a day, Scheduled, Done, Not done
// with its reason, Cancelled) and MONEY says whether it was paid (Not yet, Paid with how, Bill sent, Failed), so
// it is obvious at a glance that money was collected. A Scheduled visit whose day has passed keeps its state and
// gains a small "day passed" note. Named JobPill from step zero and kept so no import churns; it renders a
// visit's states. Pure render, server component.

export interface JobPillProps {
  job: Job
  className?: string
}

export function JobPill({ job, className }: JobPillProps) {
  return (
    <span data-slot="job-pill" className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <StatusPill status={job.work} label={job.workLabel} data-pill="work" />
      {job.dayPassed && (
        <span data-slot="day-passed" className="text-xs text-muted-foreground">
          day passed
        </span>
      )}
      <StatusPill status={job.money} label={job.moneyLabel} data-pill="money" />
    </span>
  )
}
