import type { z } from "zod"
import type { PassDetail } from "@/api/v1/passes/schemas"
import { instantOf } from "@/lib/admin/shape"
import type { Pass, PassVisit } from "@/lib/admin/types"

const ORDER = ["turn-on", "inspection", "blowout"]
const WINDOWS: Record<string, string> = { "turn-on": "May", inspection: "July", blowout: "October" }

/**
 * The `Pass` the customer page takes, from one `passes.get` answer. A cancelled or skipped visit is left out, as in the admin's
 * shaping; a pending pass (checkout not finished) is not a pass the customer holds and is left to the caller to drop.
 */
export function passFromApi(d: z.infer<typeof PassDetail>): Pass {
  const visits: PassVisit[] = d.visits
    .filter((v) => ORDER.includes(v.kind) && v.status !== "cancelled" && v.status !== "skipped")
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
    .map((v) => ({
      kind: v.kind as PassVisit["kind"],
      window: v.window ?? WINDOWS[v.kind]!,
      amount: v.amount,
      id: v.id,
      ...(v.scheduledOn ? { scheduledAt: instantOf(v.scheduledOn, v.startTime), scheduledOn: v.scheduledOn } : {}),
      ...(v.startTime ? { startTime: v.startTime } : {}),
      ...(v.durationMinutes ? { windowMinutes: v.durationMinutes } : {}),
      ...(v.calendarUrl ? { calendarUrl: v.calendarUrl } : {}),
      ...(v.truckName ? { truckName: v.truckName } : {}),
      ...(v.completedOn ? { completedAt: instantOf(v.completedOn, "12:00") } : {}),
      ...(v.chargedAt ? { chargedAt: v.chargedAt } : {}),
    }))
  return {
    id: d.id,
    number: d.number,
    season: d.season,
    clientId: d.customerId,
    firstName: d.firstName,
    town: d.town,
    zones: d.zones,
    turnOnPreference: d.turnOnPreference,
    blowoutPreference: d.blowoutPreference,
    status: d.status === "cancelled" ? "cancelled" : d.status === "lapsed" ? "lapsed" : d.status === "pending" ? "pending" : "active",
    visits,
    stripeUrl: "",
    jobberUrl: "",
    ...(d.cardLast4 ? { cardLast4: d.cardLast4 } : {}),
    ...(d.cardExpires ? { cardExpires: d.cardExpires } : {}),
    ...(d.cardFailedAt ? { cardFailedAt: d.cardFailedAt } : {}),
    ...(d.needsCustomerHome ? { needsCustomerHome: true } : {}),
  }
}
