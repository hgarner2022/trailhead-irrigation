import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import type { z } from "zod"
import * as s from "@/db/schema"
import { cleanText } from "@/lib/format/contact"
import { hasScope } from "@/lib/auth/principal"
import { enqueueGeocode } from "@/lib/geocode"
import { holdChosenDays } from "@/lib/pass/server/chosen-days"
import { currentSeason } from "@/lib/pass/season"
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
  const [old] = await ctx.db.select().from(s.seasonPass).where(and(eq(s.seasonPass.id, input.renewOf!), eq(s.seasonPass.organizationId, ctx.organizationId)))
  const allowed = hasScope(p, "write") || (p.kind === "public" && p.renewPassId === input.renewOf)
  if (!old || !allowed) throw new ApiError("forbidden", "That pass can't be renewed from here")
  if (old.status === "pending" || !old.stripePaymentMethodId) throw new ApiError("unprocessable", "There's no card on file for that pass. Reserve the new season with a new card instead.")
  const day = today(ctx)
  const season = Math.max(currentSeason(day), old.season + 1)
  const [held] = await ctx.db
    .select({ id: s.seasonPass.id })
    .from(s.seasonPass)
    .where(and(eq(s.seasonPass.customerId, old.customerId), eq(s.seasonPass.season, season), inArray(s.seasonPass.status, ["active", "pending"])))
  if (held) throw new ApiError("unprocessable", `Your ${season} season is already reserved.`)
  const onSale = visitsOnSale(input.inspection, day)
  if (onSale.length === 0) throw new ApiError("unprocessable", "No visits are on sale this season any more")
  if (!(p.kind !== "public" || input.consent)) throw new ApiError("invalid", "Accept the terms to reserve the season")

  const org = ctx.organizationId
  const address = cleanText(input.property.address)
  const [known] = await ctx.db.select().from(s.property).where(and(eq(s.property.customerId, old.customerId), eq(s.property.address, address), eq(s.property.town, input.property.town))).limit(1)
  const property = known ?? (await ctx.db.insert(s.property).values({ organizationId: org, customerId: old.customerId, address, town: input.property.town }).returning())[0]!
  if (!known) await enqueueGeocode(ctx.db, org, property.id, ctx.now)

  const pass = await makePassRows(ctx.db, {
    organizationId: org,
    customerId: old.customerId,
    propertyId: property.id,
    season,
    onSale,
    zones: input.zones,
    inspection: input.inspection,
    needsCustomerHome: input.needsCustomerHome,
    accessNote: input.accessNote ? cleanText(input.accessNote) : old.accessNote,
    status: "active",
    source: "checkout",
    card: { stripePaymentMethodId: old.stripePaymentMethodId, cardBrand: old.cardBrand, cardLast4: old.cardLast4, cardExpires: old.cardExpires },
    now: ctx.now,
  })
  await holdChosenDays(ctx.db, pass.id, input.days.map(chosenDay), input.property.town, season, day)
  await recordChange(ctx, { customerId: old.customerId, passId: pass.id, kind: "renewed", detail: { from: old.id, season } })
  const c = input.consent
  await finishPurchase(ctx, pass, input.property.town, c ? { marketingOptIn: c.marketingOptIn, marketingChannels: c.marketingChannels } : undefined)
  await emitEvent(ctx.db, org, "pass.bought", { passId: pass.id, number: pass.number })
  return passDetail(ctx, await loadPass(ctx, pass.id))
}
