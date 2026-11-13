import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { passesGet, passesList } from "@/api/v1/passes/handlers"
import { visitsAreaDays } from "@/api/v1/visits/handlers"
import { today } from "@/api/v1/shared"
import { passFromApi } from "@/app/(account)/account/pass/pass-from-api"
import type { Pass } from "@/lib/admin/types"

const SEASONS_SHOWN = 6

export interface PassPageData {
  /** the newest season's pass */
  pass: Pass
  /** every pass the customer has held, newest first, the current one included */
  passes: Pass[]
  /** ISO day the season line reads its marker from */
  today: string
  /** the area days on offer, for a customer who must be home and has a visit to place */
  pickDays: Partial<Record<"turn-on" | "blowout", string[]>>
}

/**
 * What the customer's pass page shows, read through the API with the caller's own principal: `passes.list` (a customer sees
 * only their own), `passes.get` for each season, and `visits.areaDays` for the next visit of a customer who must be home.
 * Null when the caller holds no pass; a pass still pending (checkout unfinished) does not count.
 */
export async function loadPassPage(ctx: Ctx): Promise<PassPageData | null> {
  const list = await callApi(ctx, passesList, { limit: 50 })
  const held = list.data.filter((p) => p.status !== "pending").sort((a, b) => b.season - a.season).slice(0, SEASONS_SHOWN)
  if (held.length === 0) return null
  const details = await Promise.all(held.map((p) => callApi(ctx, passesGet, { id: p.id })))
  const passes = details.map(passFromApi)
  const current = details[0]!
  const pickDays: PassPageData["pickDays"] = {}
  if (current.status === "active" && current.needsCustomerHome) {
    for (const v of current.visits) {
      if ((v.kind === "turn-on" || v.kind === "blowout") && (v.status === "unscheduled" || v.status === "scheduled")) {
        const { days } = await callApi(ctx, visitsAreaDays, { id: v.id })
        if (days.length > 0) pickDays[v.kind] = days
      }
    }
  }
  return { pass: passes[0]!, passes, today: today(ctx), pickDays }
}
