import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { hasScope } from "@/lib/auth/principal"
import { recordEvent, whoOf } from "@/lib/events/record"
import { visitName } from "@/lib/events/names"
import { isPhotoType, MAX_PHOTO_BYTES, MAX_PHOTOS_PER_VISIT, photoFolder, PHOTO_WORDS } from "@/lib/photos/rules"
import { photosConfigured, removeStoredFile, storedFile } from "@/lib/photos/store"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id } from "../shared"
import { assertCanAdd, assertCanRead, customerSees, isOwnCustomer, loadVisitRow, mayRemove, photoRowsOf, shapePhotos, type PhotoRow, type VisitRow } from "./access"
import { PhotoList, PhotoOut } from "./schemas"

const visitInput = z.object({ id: Id.describe("The visit's id.") })

/** The one photo of the caller's organization, not deleted; another organization's id is not found. */
async function loadPhoto(ctx: Parameters<typeof loadVisitRow>[0], id: string): Promise<{ photo: PhotoRow; visit: VisitRow }> {
  const [photo] = await ctx.db.select().from(s.photo).where(and(eq(s.photo.id, id), eq(s.photo.organizationId, ctx.organizationId), isNull(s.photo.deletedAt)))
  if (!photo) throw notFound("Photo")
  const visit = await loadVisitRow(ctx, photo.visitId)
  return { photo, visit }
}

/** The caller may use the visit's photos at all, and (for a customer) may know this one exists. */
export async function loadForCaller(ctx: Parameters<typeof loadVisitRow>[0], id: string) {
  const found = await loadPhoto(ctx, id)
  await assertCanRead(ctx, found.visit)
  const customer = ctx.principal.kind === "person" && ctx.principal.type === "customer"
  if (customer && !customerSees(found.photo, found.visit)) throw notFound("Photo")
  return found
}

export const photosAdd = defineHandler({
  name: "photos.add", method: "POST", path: "/visits/{id}/photos", scope: "read", customerSelf: true, visitLink: true, status: 201,
  summary: "Record a photo on a visit once the browser has sent the file straight to the private store (a client upload: the server first issues a token for this one visit's folder at `POST /api/photos/upload`, so a 10 MB photo never passes through a function). Give the visit's id and the `blobKey` the upload answered. The server asks the store what it holds, refuses a file over 10 MB or not a JPEG, PNG, HEIC or WebP (and removes it), and writes the photo and one `visit.photo_added` event; nothing is sent to anyone. Staff with the write scope may add to any visit, a tech to a visit they have had, a customer to their own visit that is not canceled (their photo is always theirs to see; a staff photo is shown to the customer only when marked and the visit is Done, and starts shown when added to a Done visit). A read key may not.",
  input: visitInput.extend({ blobKey: z.string().min(1).max(300).describe("The pathname the upload answered, `photos/<visit id>/<name>`.") }),
  output: PhotoOut,
  async run(ctx, input) {
    if (!photosConfigured()) throw new ApiError("unprocessable", PHOTO_WORDS.notSetUp)
    const visit = await loadVisitRow(ctx, input.id)
    await assertCanAdd(ctx, visit)
    if (!input.blobKey.startsWith(photoFolder(visit.id)) || input.blobKey.includes("..")) throw new ApiError("invalid", "That file is not in this visit's folder", [{ path: "blobKey", message: "Not this visit's folder" }])

    const [already] = await ctx.db.select().from(s.photo).where(eq(s.photo.blobKey, input.blobKey))
    if (already) {
      if (already.visitId !== visit.id || already.organizationId !== ctx.organizationId) throw new ApiError("conflict", "That file is already used")
      return (await shapePhotos(ctx, [already], new Map([[visit.id, visit]])))[0]!
    }

    const file = await storedFile(input.blobKey)
    if (!file) throw new ApiError("unprocessable", PHOTO_WORDS.uploadFailed)
    // The size and type the store reports are the truth; what the browser claimed is never trusted.
    if (file.size > MAX_PHOTO_BYTES) {
      await removeStoredFile(input.blobKey)
      throw new ApiError("invalid", PHOTO_WORDS.tooBig, [{ path: "blobKey", message: "too-big" }])
    }
    if (!isPhotoType(file.contentType)) {
      await removeStoredFile(input.blobKey)
      throw new ApiError("invalid", PHOTO_WORDS.wrongType, [{ path: "blobKey", message: "wrong-type" }])
    }
    const [{ n } = { n: 0 }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(s.photo).where(and(eq(s.photo.visitId, visit.id), isNull(s.photo.deletedAt)))
    if (n >= MAX_PHOTOS_PER_VISIT) {
      await removeStoredFile(input.blobKey)
      throw new ApiError("unprocessable", PHOTO_WORDS.tooMany)
    }

    const who = whoOf(ctx)
    const byCustomer = who === "customer"
    const [row] = await ctx.db
      .insert(s.photo)
      .values({
        organizationId: ctx.organizationId, visitId: visit.id, jobId: visit.jobId, customerId: visit.customerId,
        blobKey: input.blobKey, contentType: file.contentType.toLowerCase(), bytes: file.size, addedBy: who,
        shownToCustomer: byCustomer || visit.status === "completed", createdAt: ctx.now,
      })
      .returning()
    await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "visit.photo_added", detail: { photoId: row!.id, name: visitName(visit.kind) }, who, at: ctx.now })
    return (await shapePhotos(ctx, [row!], new Map([[visit.id, visit]])))[0]!
  },
})

export const photosList = defineHandler({
  name: "photos.list", method: "GET", path: "/visits/{id}/photos", scope: "read", customerSelf: true, visitLink: true,
  summary: "The photos on one visit, oldest first. Staff see all of them; a tech only for a visit they have had; a customer sees their own and the staff photos marked shown-to-customer once the visit is Done. `url` is `/api/photos/<id>`, which checks the caller again.",
  input: visitInput,
  output: PhotoList,
  async run(ctx, input) {
    const visit = await loadVisitRow(ctx, input.id)
    await assertCanRead(ctx, visit)
    return { data: await shapePhotos(ctx, await photoRowsOf(ctx, { visitIds: [visit.id] }), new Map([[visit.id, visit]])) }
  },
})

export const photosListForJob = defineHandler({
  name: "photos.listForJob", method: "GET", path: "/jobs/{id}/photos", scope: "read",
  summary: "Every photo on a job's visits, oldest first, each with its `visitId` (the job panel groups them by visit). Staff only: a tech gets the photos of the visits they have had, never the rest.",
  input: z.object({ id: Id.describe("The job's id.") }),
  output: PhotoList,
  async run(ctx, input) {
    const [job] = await ctx.db.select({ id: s.job.id }).from(s.job).where(and(eq(s.job.id, input.id), eq(s.job.organizationId, ctx.organizationId)))
    if (!job) throw notFound("Job")
    const visits = await ctx.db
      .select({ id: s.visit.id, organizationId: s.visit.organizationId, jobId: s.visit.jobId, customerId: s.visit.customerId, personId: s.visit.personId, status: s.visit.status, kind: s.visit.kind })
      .from(s.visit)
      .where(and(eq(s.visit.jobId, job.id), eq(s.visit.organizationId, ctx.organizationId)))
    const allowed: VisitRow[] = []
    for (const v of visits) {
      try {
        await assertCanRead(ctx, v)
        allowed.push(v)
      } catch (error) {
        // A tech sees only their own visits' photos; the rest are left out, not refused. A caller who may read none gets the refusal.
        if (!(error instanceof ApiError)) throw error
      }
    }
    if (allowed.length === 0 && visits.length > 0 && !hasScope(ctx.principal, "write")) await assertCanRead(ctx, visits[0]!)
    return { data: await shapePhotos(ctx, await photoRowsOf(ctx, { visitIds: allowed.map((v) => v.id) }), new Map(allowed.map((v) => [v.id, v]))) }
  },
})

export const photosUpdate = defineHandler({
  name: "photos.update", method: "PATCH", path: "/photos/{id}", scope: "write",
  summary: "Show a staff photo to the customer or stop showing it. The customer sees it only while this is on and the visit is Done. A customer's own photo is theirs and cannot be turned off here.",
  input: z.object({ id: Id.describe("The photo's id."), shownToCustomer: z.boolean() }),
  output: PhotoOut,
  async run(ctx, input) {
    const { photo, visit } = await loadForCaller(ctx, input.id)
    if (photo.addedBy === "customer") throw new ApiError("unprocessable", "That is the customer's own photo")
    const [row] = await ctx.db.update(s.photo).set({ shownToCustomer: input.shownToCustomer }).where(and(eq(s.photo.id, photo.id), eq(s.photo.organizationId, ctx.organizationId))).returning()
    return (await shapePhotos(ctx, [row!], new Map([[visit.id, visit]])))[0]!
  },
})

export const photosRemove = defineHandler({
  name: "photos.remove", method: "DELETE", path: "/photos/{id}", scope: "read", customerSelf: true,
  summary: "Remove a photo (a soft delete: the row keeps `deleted_at`, the file leaves the store, one `visit.photo_removed` event is written). Only the person who added it, an owner (or a key with the admin scope), or the customer for their own photo.",
  input: z.object({ id: Id.describe("The photo's id.") }),
  output: z.object({ id: Id, removed: z.literal(true) }),
  async run(ctx, input) {
    const { photo, visit } = await loadForCaller(ctx, input.id)
    if (!mayRemove(ctx, photo)) throw new ApiError("forbidden", isOwnCustomer(ctx, visit) ? "That photo is not yours to remove" : "Only the person who added it or an owner removes a photo")
    const won = await ctx.db.update(s.photo).set({ deletedAt: ctx.now }).where(and(eq(s.photo.id, photo.id), isNull(s.photo.deletedAt))).returning({ id: s.photo.id })
    if (won.length > 0) {
      await removeStoredFile(photo.blobKey)
      await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "visit.photo_removed", detail: { photoId: photo.id, name: visitName(visit.kind) }, who: whoOf(ctx), at: ctx.now })
    }
    return { id: photo.id, removed: true as const }
  },
})
