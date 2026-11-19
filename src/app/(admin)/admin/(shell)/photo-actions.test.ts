// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, customerPerson, ORG, owner, tech } from "@/api/test-helpers"

// The photo actions of the admin (visit and job panels) and of the customer's account run the real handlers against a seeded database; the only
// thing mocked is the private store's SDK, the session and the guard.
const state = vi.hoisted(() => ({ db: null as unknown, principal: null as unknown, files: new Map<string, { size: number; contentType: string }>(), link: null as unknown }))
vi.mock("@vercel/blob", () => ({
  head: async (key: string) => { const f = state.files.get(key); if (!f) throw new Error("none"); return f },
  del: async (key: string) => void state.files.delete(key),
  get: async () => null,
}))
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }))
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`) } }))
vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: async (min = "tech") => {
    const p = state.principal as { role?: string }
    if (min !== "tech" && p.role === "tech") throw new Error("redirect:/admin/sign-in")
    return p
  },
}))
vi.mock("@/lib/admin/api-ctx", async () => {
  const { ctxFor } = await import("@/api/test-helpers")
  return {
    ctxFromSession: async () => ctxFor(state.db as never, state.principal as never),
    ctxFromAccount: async () => ctxFor(state.db as never, state.principal as never),
  }
})
vi.mock("@/auth", () => ({ signOut: async () => undefined, auth: async () => null }))
vi.mock("@/lib/queue/drain-after", () => ({ drainAfter: () => undefined }))
vi.mock("@/app/(account)/account/account-data", () => ({ visitLinkCtx: async () => state.link }))

import { addPhoto, removePhoto, showPhoto } from "./photo-actions"
import { addMyPhoto, addMyPhotoByLink, removeMyPhoto } from "@/app/(account)/account/actions"

let db: TestDb
let customerId: string
const visitA = "p1-turn-on"
let n = 0
const put = (visit = visitA) => {
  const key = `photos/${visit}/a-${++n}.jpg`
  state.files.set(key, { size: 5000, contentType: "image/jpeg" })
  return key
}

beforeAll(async () => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token")
  db = await apiDb()
  state.db = db
  const [v] = await db.select().from(s.visit).where(eq(s.visit.id, visitA))
  customerId = v!.customerId
  await db.insert(s.person).values({ id: "person_tech_a", organizationId: ORG, name: "Tess Tech", initials: "TT", email: tech.email, role: "tech", truck: "Truck 9" })
  await db.update(s.visit).set({ personId: "person_tech_a", status: "scheduled" }).where(eq(s.visit.id, visitA))
})
afterAll(() => db.close())
beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token")
  state.principal = owner
  state.link = null
})

const eventsOfKind = async (kind: string) => db.select().from(s.event).where(and(eq(s.event.visitId, visitA), eq(s.event.kind, kind)))

describe("the admin's photo actions", () => {
  it("adds a photo as the signed-in person, shows it to the customer, and removes it", async () => {
    const added = await addPhoto(visitA, put())
    expect(added).toMatchObject({ ok: true, data: { visitId: visitA, addedBy: owner.email, shownToCustomer: false } })
    const id = (added as { data: { id: string } }).data.id
    expect(await showPhoto(id, true)).toMatchObject({ ok: true, data: { shownToCustomer: true } })
    expect(await removePhoto(id)).toEqual({ ok: true, data: undefined })
    expect((await eventsOfKind("visit.photo_removed")).length).toBeGreaterThan(0)
  })

  it("lets a tech add one on a visit they had and remove it, but not show it to the customer", async () => {
    state.principal = tech
    const added = await addPhoto(visitA, put())
    expect(added.ok).toBe(true)
    const id = (added as { data: { id: string } }).data.id
    await expect(showPhoto(id, true)).rejects.toThrow("redirect:/admin/sign-in")
    expect(await removePhoto(id)).toEqual({ ok: true, data: undefined })
  })

  it("answers the API's own words when the file is not a photo, and when the store is not set up", async () => {
    const key = `photos/${visitA}/doc-${++n}.pdf`
    state.files.set(key, { size: 100, contentType: "application/pdf" })
    expect(await addPhoto(visitA, key)).toMatchObject({ ok: false, message: "That file is not a photo we can keep. Use a JPEG, PNG, HEIC or WebP." })
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "")
    expect(await addPhoto(visitA, put())).toEqual({ ok: false, message: "Photos are not set up yet." })
  })
})

describe("the customer's photo actions", () => {
  it("adds their own photo, always shown to them, with the same event by the customer and nothing queued", async () => {
    state.principal = customerPerson(customerId)
    const before = (await db.select().from(s.messageLog)).length
    const added = await addMyPhoto(visitA, put())
    expect(added).toMatchObject({ ok: true, photo: { byCustomer: true, shownToCustomer: true, addedBy: "customer" } })
    expect((await db.select().from(s.messageLog)).length).toBe(before)
    expect((await db.select().from(s.adminAlert)).filter((a) => a.kind.includes("photo"))).toHaveLength(0)
    expect((await eventsOfKind("visit.photo_added")).some((e) => e.who === "customer")).toBe(true)
    expect(await removeMyPhoto((added as { photo: { id: string } }).photo.id)).toEqual({ ok: true })
  })

  it("says 'That photo is over 10 MB.' when the store holds a file that big", async () => {
    state.principal = customerPerson(customerId)
    const key = `photos/${visitA}/big-${++n}.jpg`
    state.files.set(key, { size: 10 * 1024 * 1024 + 1, contentType: "image/jpeg" })
    expect(await addMyPhoto(visitA, key)).toEqual({ ok: false, message: "That photo is over 10 MB." })
  })

  it("answers 'Upload failed. Try again.' when the file never reached the store", async () => {
    state.principal = customerPerson(customerId)
    expect(await addMyPhoto(visitA, `photos/${visitA}/never.jpg`)).toEqual({ ok: false, message: "Upload failed. Try again." })
  })

  it("refuses another customer's visit and a staff photo's removal", async () => {
    state.principal = customerPerson("someone-else")
    expect(await addMyPhoto(visitA, put())).toMatchObject({ ok: false })
    state.principal = owner
    const staff = (await addPhoto(visitA, put())) as { data: { id: string } }
    state.principal = customerPerson(customerId)
    expect(await removeMyPhoto(staff.data.id)).toMatchObject({ ok: false })
  })

  it("adds by a text's link as the link's customer, with the token on the picture's address, and refuses a link that does not check out", async () => {
    state.link = null
    expect(await addMyPhotoByLink("bad", visitA, put())).toEqual({ ok: false, message: "This link didn't work. Use the link in your text." })
    const { ctxFor } = await import("@/api/test-helpers")
    state.link = ctxFor(db, { ...customerPerson(customerId), onlyVisitId: visitA })
    const out = await addMyPhotoByLink("tok.en", visitA, put())
    expect(out).toMatchObject({ ok: true })
    expect((out as { photo: { url: string } }).photo.url).toMatch(/^\/api\/photos\/photo_[^?]+\?t=tok\.en$/)
  })
})
