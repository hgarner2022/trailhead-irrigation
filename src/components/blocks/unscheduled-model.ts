import type { UnscheduledJob } from "./scheduler-panels-types"

export type UnscheduledSort = "oldest" | "newest" | "name"

/** Oldest: the job made first on top. Newest: the reverse. Name: A to Z. Ties go to the name, then the id, so the order never jumps. Returns a new array. */
export function sortJobs(jobs: readonly UnscheduledJob[], sort: UnscheduledSort): UnscheduledJob[] {
  const name = (a: UnscheduledJob, b: UnscheduledJob) => a.customer.localeCompare(b.customer) || a.id.localeCompare(b.id)
  const list = [...jobs]
  if (sort === "name") return list.sort(name)
  const sign = sort === "newest" ? -1 : 1
  return list.sort((a, b) => sign * a.addedOn.localeCompare(b.addedOn) || name(a, b))
}
