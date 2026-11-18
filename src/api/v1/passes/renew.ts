import "server-only"
import { and, eq, isNotNull, isNull } from "drizzle-orm"
import type { z } from "zod"
import * as s from "@/db/schema"
import { customerHasCard } from "@/lib/customer/card"
import { cleanText } from "@/lib/format/contact"
import { hasScope } from "@/lib/auth/principal"
import { enqueueGeocode } from "@/lib/geocode"
import { holdChosenDays } from "@/lib/pass/server/chosen-days"
import { currentSeason } from "@/lib/pass/season"
import { resolvePassJob } from "@/lib/pass/server/resolve"
import { makePassRows } from "@/lib/pass/server/rows"
import { visitsOnSale } from "@/lib/season-pass"
import type { Ctx } from "../../core/context"
import { ApiError } from "../../core/errors"
import { today } from "../shared"
import { emitEvent } from "../webhooks/deliver"
import { finishPurchase } from "./finish"
import { chosenDay, type passCreateInput } from "./schemas"
import { loadPass, passDetail, recordChange } from "./queries"

/**
 * `passes.create` with `renewOf`: the next season's pass for a customer who holds the last one, on the card they already have on
 * file, with the days they picked. Nobody but the pass's own customer may do it, so it needs the write scope or a public visitor
 * whose `renewPassId` server code set after checking the signed link or the signed-in customer. There is no card step: the pass
 * is active when this returns, its days are scheduled, and the confirmation is queued.
 */
export async function renewPass(ctx: Ctx, input: z.infer<typeof passCreateInput>) {
  const p = ctx.principal
  // The pass being renewed is named by its job id or by the old pass id of a link sent before the move; both open the same job.
  const old = await resolvePassJob(ctx.db, ctx.organizationId, input.renewOf!)
  const allowedPass = p.kind === "public" && p.renewPassId ? await resolvePassJob(ctx.db, ctx.organizationId, p.renewPassId) : null
  const allowed = hasScope(p, "write") || (allowedPass !== null && allowedPass.id === old?.id)
  if (!old || !allowed) throw new ApiError("forbidden", "That pass can't be renewed from here")
  const [customer] = await ctx.db.select().from(s.customer).where(eq(s.customer.id, old.customerId))
  if (!old.soldOn || !customer || !customerHasCard(customer) || !customer.stripePaymentMethodId) throw new ApiError("unprocessable", "There's no card on file for that pass. Reserve the new season with a new card instead.")
  const day = today(ctx)
  const season = Math.max(currentSeason(day), (old.season ?? 0) + 1)
  const [held] = await ctx.db
    .select({ id: s.job.id })
    .from(s.job)
    .where(and(eq(s.job.organizationId, ctx.organizationId), eq(s.job.customerId, old.customerId), isNotNull(s.job.season), eq(s.job.season, season), isNull(s.job.cancelledAt)))
  if (held) throw new ApiError("unprocessable", `Your ${season} season is already reserved.`)
  const onSale = visitsOnSale(input.inspection, day)
  if (onSale.length === 0) throw new ApiError("unprocessable", "No visits are on sale this season any more")
  if (!(p.kind !== "public" || input.consent)) throw new ApiError("invalid", "Accept the terms to reserve the season")

  const org = ctx.organizationId
  const address = cleanText(input.property.address)
  const [known] = await ctx.db.select().from(s.property).where(and(eq(s.property.customerId, old.customerId), eq(s.property.address, address), eq(s.property.town, input.property.town))).limit(1)
  // The yard the customer just answered lives on the property: the zones, whether they must be home, the access note (the old pass's yard says it when they give none).
  const [oldYard] = await ctx.db.select({ accessNote: s.property.accessNote }).from(s.property).where(eq(s.property.id, old.propertyId))
  const accessNote = input.accessNote ? cleanText(input.accessNote) : (oldYard?.accessNote ?? null)
  const yard = { zones: input.zones, ...(typeof input.needsCustomerHome === "boolean" ? { mustBeHome: input.needsCustomerHome } : {}), ...(accessNote ? { accessNote } : {}) }
  const property = known
    ? (await ctx.db.update(s.property).set({ ...yard, updatedAt: ctx.now }).where(eq(s.property.id, known.id)).returning())[0]!
    : (await ctx.db.insert(s.property).values({ organizationId: org, customerId: old.customerId, address, town: input.property.town, ...yard }).returning())[0]!
  if (!known) await enqueueGeocode(ctx.db, org, property.id, ctx.now)

  const pass = await makePassRows(ctx.db, {
    organizationId: org,
    customerId: old.customerId,
    propertyId: property.id,
    season,
    onSale,
    zones: input.zones,
    inspection: input.inspection,
    turnOnPreference: input.turnOnPreference,
    blowoutPreference: input.blowoutPreference,
    // Sold today, on the card the customer already has on file.
    status: "active",
    source: "renewal",
    renewsJobId: old.id,
    now: ctx.now,
  })
  await holdChosenDays(ctx.db, pass.jobId, input.days.map(chosenDay), input.property.town, season, day)
  await recordChange(ctx, { customerId: old.customerId, jobId: pass.id, kind: "renewed", detail: { source: "renewal", name: "Season Pass", passNumber: pass.number, renewsJobId: old.id, from: old.id, season } })
  const c = input.consent
  await finishPurchase(ctx, pass, input.property.town, c ? { marketingOptIn: c.marketingOptIn, marketingChannels: c.marketingChannels } : undefined)
  await emitEvent(ctx.db, org, "pass.bought", { passId: pass.id, number: pass.number })
  return passDetail(ctx, await loadPass(ctx, pass.id))
}
