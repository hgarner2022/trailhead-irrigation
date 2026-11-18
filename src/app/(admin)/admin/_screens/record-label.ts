import type { RecordRef } from "@/lib/admin/record-url"
import type { AdminData } from "@/lib/admin/types"
import { jobTitle } from "./jobs-model"
import { kindLabel } from "./visit-panel-model"

/**
 * What a record is called in the crumb above a panel that was opened from it ("‹ Andrea Reyes", "‹ Andrea Reyes, Repair"): the customer by name, a job
 * and a visit by the customer and what the work is. Empty when the record is not in `data` (the crumb is then left off).
 */
export function recordLabel(data: Pick<AdminData, "clients" | "jobs" | "visits">, ref: RecordRef | undefined): string {
  if (!ref) return ""
  const name = (id: string) => {
    const c = data.clients.find((x) => x.id === id)
    // a customer the fixtures never listed is still named on their visits
    return c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : (data.visits.find((v) => v.clientId === id)?.clientName ?? "")
  }
  if (ref.key === "customer") return name(ref.id)
  if (ref.key === "job") {
    const job = data.jobs?.find((j) => j.id === ref.id)
    return job ? [name(job.customerId), jobTitle(job)].filter(Boolean).join(", ") : ""
  }
  const visit = data.visits.find((v) => v.id === ref.id)
  return visit ? `${visit.clientName}, ${kindLabel(visit)}` : ""
}
