// What kind of job this is, read from the facts and never typed (decision 2 of the step 6 plan): a job with a season is a Season
// Pass; any other job takes the service kind of its first live line, else the kind of its first visit, mapped the way `visits.create`
// maps it (repair to repair, install to install, anything else to other). Pure: the loader that reads the lines and visits is
// `kind-load.ts`; the database filter for "is it a pass" is `season is not null`.

export type JobKind = "pass" | "repair" | "install" | "other"

/** The kind a one-off job has for a service or visit kind: repair and install keep theirs, everything else is other. */
export function kindOfServiceKind(kind: string | null | undefined): Exclude<JobKind, "pass"> {
  return kind === "repair" ? "repair" : kind === "install" ? "install" : "other"
}

export interface JobKindFacts {
  /** the job's `season`: a Season Pass has one */
  season: number | null
  /** the job's lines, oldest first; `serviceKind` is the `kind` of the catalogue service the line was priced from, when one fits */
  lines: readonly { serviceKind: string | null; cancelledAt?: Date | string | null }[]
  /** the kinds of the job's visits, oldest first */
  visitKinds: readonly string[]
}

/** A Season Pass, else the kind of the first live line's service, else of the first visit, else other. */
export function jobKindOf(job: JobKindFacts): JobKind {
  if (job.season !== null) return "pass"
  const line = job.lines.find((l) => !l.cancelledAt && l.serviceKind)
  if (line) return kindOfServiceKind(line.serviceKind)
  return job.visitKinds.length ? kindOfServiceKind(job.visitKinds[0]) : "other"
}
