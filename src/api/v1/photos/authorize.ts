import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import { MAX_PHOTOS_PER_VISIT, PHOTO_WORDS } from "@/lib/photos/rules"
import type { Ctx } from "../../core/context"
import { ApiError } from "../../core/errors"
import { assertCanAdd, loadVisitRow } from "./access"
import { loadForCaller } from "./handlers"

/**
 * The photo a request may read, or null (the route answers a plain 404, never saying whether it exists). Tries each context the request could be
 * (`getContexts` gets the photo's visit, since a text's link opens one visit only) and takes the first the photo rules admit: staff in their own
 * organization, a tech for a visit they had, the visit's customer for their own upload or a staff photo marked shown once the visit is Done.
 */
export async function findReadablePhoto(db: Ctx["db"], id: string, getContexts: (visitId: string) => Promise<Ctx[]>): Promise<typeof s.photo.$inferSelect | null> {
  const [photo] = await db.select().from(s.photo).where(and(eq(s.photo.id, id), isNull(s.photo.deletedAt)))
  if (!photo) return null
  for (const ctx of await getContexts(photo.visitId)) {
    if (ctx.organizationId !== photo.organizationId) continue
    try {
      await loadForCaller(ctx, photo.id)
      return photo
    } catch {
      // try the next way this caller could be known
    }
  }
  return null
}

/**
 * May one of these callers add a photo to this visit? The first context the photo rules admit wins; with none, the refusal of the last (or
 * "unauthorized" when there is no one). The upload-token route asks this before it issues a token, so a token exists only for a caller who
 * `photos.add` would then accept.
 */
export async function authorizeUpload(contexts: Ctx[], visitId: string): Promise<Ctx> {
  if (contexts.length === 0) throw new ApiError("unauthorized", "Sign in to add a photo")
  let refusal: unknown = null
  for (const ctx of contexts) {
    try {
      const visit = await loadVisitRow(ctx, visitId)
      await assertCanAdd(ctx, visit)
      const [{ n } = { n: 0 }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(s.photo).where(and(eq(s.photo.visitId, visit.id), isNull(s.photo.deletedAt)))
      if (n >= MAX_PHOTOS_PER_VISIT) throw new ApiError("unprocessable", PHOTO_WORDS.tooMany)
      return ctx
    } catch (error) {
      refusal = error
    }
  }
  throw refusal
}
