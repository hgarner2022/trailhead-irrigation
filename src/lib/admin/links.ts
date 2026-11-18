import type { AdminData } from "./types"

// Where the admin's links go. Every record opens on a page that is in the left column, with the record found there:
// a visit on Visits, a customer on Customers, a job's visits on Visits filtered to that job, a day on Schedule.
// /admin/passes is not in the left column and nothing links to it (the page stays for the Jobs screen to retire).

/** The visits of one job, on Visits with the Job filter applied. */
export const visitsOfJob = (jobId: string): string => `/admin/visits?job=${encodeURIComponent(jobId)}`

/** The job a pass is: its sold job's id, else the job its visits belong to. */
export function jobIdOfPass(data: Pick<AdminData, "jobs" | "visits">, passId: string): string | undefined {
  return data.jobs?.find((j) => j.passId === passId)?.id ?? data.visits.find((v) => v.passId === passId && v.jobId)?.jobId
}

/** The routes a link inside the admin may go to: the left column, and nowhere else. */
export const ADMIN_ROUTES = ["/admin", "/admin/schedule", "/admin/visits", "/admin/customers", "/admin/reports", "/admin/settings"] as const
