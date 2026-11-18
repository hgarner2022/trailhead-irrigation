import type { AdminData } from "./types"

// Where the admin's links go. Every record opens on a page that is in the left column, with the record found there:
// a visit on Visits, a customer on Customers, a job's visits on Visits filtered to that job, a day on Schedule.
// A job opens on Jobs (`?job=`), the screen that replaced the Passes page: /admin/passes redirects there.

/** One job, open in its panel on the Jobs screen. */
export const jobUrl = (jobId: string): string => `/admin/jobs?job=${encodeURIComponent(jobId)}`

/** One customer, open in their panel on Customers. */
export const customerUrl = (customerId: string): string => `/admin/customers?customer=${encodeURIComponent(customerId)}`

/** The visits of one job, on Visits with the Job filter applied. */
export const visitsOfJob = (jobId: string): string => `/admin/visits?job=${encodeURIComponent(jobId)}`

/** The job a pass is: the pass id is the job's id, and an old pass id (from a link or alert made before the move) is the job's `legacyPassId`. */
export function jobIdOfPass(data: Pick<AdminData, "jobs" | "visits">, passId: string): string | undefined {
  return data.jobs?.find((j) => j.passId === passId || j.legacyPassId === passId)?.id ?? data.visits.find((v) => v.passId === passId && v.jobId)?.jobId
}

/** The routes a link inside the admin may go to: the left column, and nowhere else. */
export const ADMIN_ROUTES = ["/admin", "/admin/schedule", "/admin/jobs", "/admin/visits", "/admin/customers", "/admin/reports", "/admin/settings"] as const
