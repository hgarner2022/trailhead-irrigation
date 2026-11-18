import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { passesGet, passesList } from "@/api/v1/passes/handlers"
import { visitsAreaDays } from "@/api/v1/visits/handlers"
import { today } from "@/api/v1/shared"
import { passFromApi } from "@/app/(account)/account/pass/pass-from-api"
import type { Pass } from "@/lib/admin/types"
import { windowTold } from "@/lib/portal/window-told"

const SEASONS_SHOWN = 6

export interface PassPageData {
  /** the newest season's pass */
  pass: Pass
  /** every pass the customer has held, newest first, the current one included */
  passes: Pass[]
  /** ISO day the season line reads its marker from */
  today: string
  /** the days on offer for each turn-on and blowout that is booked or waiting for a day: what "Change your day" shows */
  pickDays: Partial<Record<"turn-on" | "blowout", string[]>>
}

/**
 * What the customer's pass page shows, read through the API with the caller's own principal: `passes.list` (a customer sees
 * only their own), `passes.get` for each season, and `visits.areaDays` for the turn-on and blowout still open, so any customer can change a day.
 * Null when the caller holds no pass; a pass still pending (checkout unfinished) does not count. `pickDays: false` skips the area-day reads, for the
 * account's Home, which shows only the pass card and its season line.
 */
export async function loadPassPage(ctx: Ctx, options: { pickDays?: boolean } = {}): Promise<PassPageData | null> {
  const list = await callApi(ctx, passesList, { limit: 50 })
  const held = list.data.filter((p) => p.status !== "pending").sort((a, b) => b.season - a.season).slice(0, SEASONS_SHOWN)
  if (held.length === 0) return null
  const loaded = await Promise.all(held.map((p) => callApi(ctx, passesGet, { id: p.id })))
  // A window is a message, not a promise: the office's estimated start time reaches the customer only once the day-before text for that day exists.
  const told = await windowTold(ctx.db, ctx.organizationId, loaded.flatMap((p) => p.visits))
  const details = loaded.map((p) => ({ ...p, visits: p.visits.map((v) => (told.has(v.id) ? v : { ...v, startTime: null })) }))
  const passes = details.map(passFromApi)
  const current = details[0]!
  const pickDays: PassPageData["pickDays"] = {}
  if (options.pickDays !== false && current.status === "active") {
    for (const v of current.visits) {
      if ((v.kind === "turn-on" || v.kind === "blowout") && (v.status === "unscheduled" || v.status === "scheduled")) {
        // A booked day inside the two-day cut-off (or past) is refused for a customer: no days on offer, and the page says to call.
        const days = await callApi(ctx, visitsAreaDays, { id: v.id }).then((r) => r.days, () => [])
        // A booked visit keeps its entry even when empty, so its Change your day says to call; a visit with no day is offered days only when there are some.
        if (days.length > 0 || v.status === "scheduled") pickDays[v.kind] = days
      }
    }
  }
  return { pass: passes[0]!, passes, today: today(ctx), pickDays }
}
