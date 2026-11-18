import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { whoOf } from "@/lib/events/record"
import { readAppUrl } from "@/lib/env"
import { scheduleChosenDays } from "@/lib/pass/server/chosen-days"
import { recordPurchase, type PurchaseConsent, type PurchaseExtras } from "@/lib/pass/server/purchase"
import type { Ctx } from "../../core/context"
import { today } from "../shared"
import { recordChange } from "./queries"

/**
 * What every sale ends with once the pass is active, whoever sold it (the checkout's card step, a renewal, the office): the days
 * held on its visits become scheduled visits (a day that filled up since moves to the next open one and is recorded as
 * `day-filled`, which the confirmation reads), then the consent, the `pass-onboard` task and the purchase confirmation.
 */
export async function finishPurchase(ctx: Ctx, pass: { id: string; customerId: string }, town: string, consent: PurchaseConsent | undefined, extras: PurchaseExtras = {}): Promise<void> {
  // The pass is its job: `pass.id` is the job's id, and the season is the job's.
  const [job] = await ctx.db.select({ season: s.job.season }).from(s.job).where(eq(s.job.id, pass.id))
  const season = job?.season ?? 0
  for (const moved of await scheduleChosenDays(ctx.db, pass.id, town, season, today(ctx), ctx.now))
    await recordChange(ctx, { customerId: pass.customerId, jobId: pass.id, visitId: moved.visitId, kind: "day-filled", detail: { visit: moved.kind, from: moved.from, to: moved.to } })
  await recordPurchase(ctx.db, pass.id, consent, readAppUrl(), ctx.now, { who: whoOf(ctx), ...extras })
}
