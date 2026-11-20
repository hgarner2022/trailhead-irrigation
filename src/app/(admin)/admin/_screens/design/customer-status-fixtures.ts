import { customerStatusOf, type CustomerStatusFacts } from "@/lib/customers/status"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { CustomerPageData } from "./customer-types"

/** "Today" of the fixtures. */
export const AS_OF = "2026-11-20"

/** The facts `customerStatusOf` reads, taken from the rows a page shows: each job's stage and the day it last happened, a visit ahead, a pass in force. */
export function statusFactsOf(d: Pick<CustomerPageData, "jobs" | "area" | "statusFacts">): CustomerStatusFacts {
  return {
    archivedAt: d.statusFacts.archivedAt,
    jobs: d.jobs.map((j) => ({ stage: j.quote ?? (j.status === "cancelled" ? ("canceled" as const) : j.open ? ("open" as const) : ("done" as const)), on: j.day?.iso ?? j.sortDay })),
    visitAhead: d.jobs.some((j) => j.open && !j.quote && j.status !== "cancelled"),
    passInForce: d.area.kind === "pass" && d.area.pass.status === "active",
  }
}

/** Sets the status from the facts, by the function, never by hand. */
export function withStatus<T extends Omit<CustomerPageData, "status">>(d: T, asOf: string = AS_OF): T & { status: CustomerPageData["status"] } {
  const statusFacts = statusFactsOf(d)
  return { ...d, statusFacts, status: customerStatusOf(statusFacts, asOf) }
}

/** The status pill of a customer: Active in the green tone, New and Past customer neutral, Archived grey (Hannah, Nov 20 2026). */
export const STATUS_PILL: Record<CustomerPageData["status"], { status: PillStatus; label: string }> = {
  active: { status: "active", label: "Active" },
  new: { status: "pending", label: "New" },
  past: { status: "lapsed", label: "Past customer" },
  archived: { status: "cancelled", label: "Archived" },
}
