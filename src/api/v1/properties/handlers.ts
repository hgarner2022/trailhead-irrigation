import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { changedFields } from "@/lib/events/diff"
import { recordEvent, whoOf } from "@/lib/events/record"
import { notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { cleanYard, propertyOut } from "../customers/handlers"
import { PropertyOut, yardFields } from "../customers/schemas"
import { Id } from "../shared"

export const propertiesUpdate = defineHandler({
  name: "properties.update",
  method: "PATCH",
  path: "/properties/{id}",
  scope: "write",
  summary: "Change what is true about a yard: zones, controller, backflow, gate code, must be home, access note, on-site contact and notes. A field left out stays; an empty text clears it.",
  input: z.object({ id: Id, ...yardFields }),
  output: PropertyOut,
  async run(ctx, { id, ...changes }) {
    const where = and(eq(s.property.id, id), eq(s.property.organizationId, ctx.organizationId))
    const [row] = await ctx.db.select().from(s.property).where(where)
    if (!row) throw notFound("Property")
    const set = cleanYard(changes)
    if (!Object.keys(set).length) return propertyOut(ctx, row)
    const [updated] = await ctx.db.update(s.property).set({ ...set, updatedAt: ctx.now }).where(where).returning()
    const changed = changedFields(row, set)
    if (Object.keys(changed).length) await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "property", aboutId: id, customerId: row.customerId, kind: "property.edited", detail: { changed }, who: whoOf(ctx), at: ctx.now })
    return propertyOut(ctx, updated!)
  },
})
