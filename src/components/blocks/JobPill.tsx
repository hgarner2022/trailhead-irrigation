import { Badge } from "@/components/ui/badge"
import { NOT_CLOSED_WORD, type Job } from "@/lib/admin/jobs"
import { cn } from "@/lib/utils"
import { StatusPill } from "./StatusPill"

// A job's state as one chip (docs/UX_WRITING.md: one name per state), with
// "Not closed" as a second chip beside it when the day has passed and nobody
// marked the job done. The flag is never a state of its own. Pure render,
// server component.

export interface JobPillProps {
  job: Job
  className?: string
}

export function JobPill({ job, className }: JobPillProps) {
  return (
    <span data-slot="job-pill" className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <StatusPill status={job.state} />
      {job.notClosed && (
        <Badge data-slot="not-closed-badge" variant="outline" className="whitespace-nowrap border-warning/40 bg-warning/10 text-foreground">
          {NOT_CLOSED_WORD}
        </Badge>
      )}
    </span>
  )
}
