import { Wrench } from "lucide-react"
import { EmptyState } from "@/components/blocks/EmptyState"
import { JobRow } from "@/components/blocks/JobRow"
import type { PortalJobType } from "@/api/v1/portal/schemas"
import { jobMoneyWord, visitsLineOf } from "./account-model"

// Jobs: one row per job, newest first: its name, the day it was sold, how many visits, what it came to and the money word. A Season Pass is a job
// like any other here. Each row opens the job. Pure composition.

export function JobsScreen({ jobs }: { jobs: PortalJobType[] }) {
  return (
    <main data-slot="account-jobs" className="mx-auto max-w-3xl space-y-6 container-padding-x py-8">
      <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">Jobs</h1>
      {jobs.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-background px-4">
          {jobs.map((j) => (
            <JobRow key={j.id} href={`/account/jobs/${j.id}`} name={j.name} soldOn={j.soldOn} visitsLine={visitsLineOf(j)} total={j.total} money={jobMoneyWord(j)} canceled={j.canceled} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Wrench} title="No jobs yet" line="Your Season Pass, repairs and installs will be listed here, with what each cost and what you paid." />
      )}
    </main>
  )
}
