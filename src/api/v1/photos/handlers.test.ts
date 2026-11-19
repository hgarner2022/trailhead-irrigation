// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq, ne } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_VISIT } from "@/lib/photos/rules"

// Nothing here reaches the real store: the one module that does is mocked, and the token is a stand-in.
const blob = vi.hoisted(() => ({ files: new Map<string, { size: number; contentType: string }>(), removed: [] as string[] }))
vi.mock("@vercel/blob", () => ({
  head: async (key: string) => {
    const f = blob.files.get(key)
    if (!f) throw new Error("not found")
    return { size: f.size, contentType: f.contentType }
  },
  del: async (key: string) => { blob.removed.push(key); blob.files.delete(key) },
  get: async () => null,
}))

import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, eventsOf, ORG, owner, readKey, tech, writeKey } from "../../test-helpers"
import { photosAdd, photosList, photosListForJob, photosRemove, photosUpdate } from "./handlers"
import { authorizeUpload, findReadablePhoto } from "./authorize"

let db: TestDb
let customerId: string
let jobId: string
const visitA = "p1-turn-on"
let visitB: string
let otherCustomerId: string
let otherVisit: string
const OTHER = "org-photo-api"
const manager = { ...owner, id: "u-manager", email: "manager@example.com", role: "admin" as const }
const otherTech = { ...tech, id: "u-tech2", email: "tech2@example.com" }
let n = 0
const put = (visit: string, over: Partial<{ size: number; contentType: string }> = {}) => {
  const key = `photos/${visit}/pic-${++n}.jpg`
  blob.files.set(key, { size: 2_000, contentType: "image/jpeg", ...over })
  return key
}
const add = (principal: Parameters<typeof ctxFor>[1], visit: string, key = put(visit), now?: string) => callApi(ctxFor(db, principal, now), photosAdd, { id: visit, blobKey: key })
const list = (principal: Parameters<typeof ctxFor>[1], visit: string) => callApi(ctxFor(db, principal), photosList, { id: visit })

beforeAll(async () => {
  db = await apiDb()
  const [v] = await db.select().from(s.visit).where(eq(s.visit.id, visitA))
  customerId = v!.customerId
  jobId = v!.jobId
  const [b] = await db.select().from(s.visit).where(and(eq(s.visit.jobId, jobId), ne(s.visit.id, visitA)))
  visitB = b!.id
  const [o] = await db.select().from(s.visit).where(ne(s.visit.customerId, customerId))
  otherVisit = o!.id
  otherCustomerId = o!.customerId
  await db.insert(s.person).values([
    { id: "person_tech_t", organizationId: ORG, name: "Tess Tech", initials: "TT", email: tech.email, role: "tech", truck: "Truck 9" },
    { id: "person_tech_u", organizationId: ORG, name: "Uma Tech", initials: "UT", email: otherTech.email, role: "tech", truck: "Truck 8" },
  ])
  await db.update(s.visit).set({ personId: "person_tech_t", status: "scheduled" }).where(eq(s.visit.id, visitA))
  await db.update(s.visit).set({ personId: "person_tech_u" }).where(eq(s.visit.id, visitB))
  await db.insert(s.organization).values({ id: OTHER, name: "Other", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
})
afterAll(() => db.close())
beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token")
  blob.removed.length = 0
})

const rowsOf = (visit: string) => db.select().from(s.photo).where(eq(s.photo.visitId, visit))

describe("photos.add", () => {
  it("records a staff photo from what the store holds, hidden from the customer, with one visit.photo_added event and nothing sent", async () => {
    const key = put(visitA, { size: 123_456, contentType: "image/png" })
    const out = await add(owner, visitA, key, "2027-04-20T15:00:00Z")
    expect(out).toMatchObject({ visitId: visitA, jobId, customerId, contentType: "image/png", bytes: 123_456, addedBy: owner.email, byCustomer: false, shownToCustomer: false, canRemove: true, url: `/api/photos/${out.id}` })
    expect(JSON.stringify(out)).not.toContain(key)
    const events = (await eventsOf(db, { visitId: visitA })).filter((e) => e.kind === "visit.photo_added")
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ about: "visit", aboutId: visitA, customerId, jobId, who: owner.email, detail: { photoId: out.id, name: "Spring turn-on" } })
    const messages = await db.select().from(s.messageLog).where(eq(s.messageLog.visitId, visitA))
    expect(messages.filter((m) => m.kind.includes("photo"))).toHaveLength(0)
    expect(await db.select().from(s.adminAlert).where(eq(s.adminAlert.organizationId, ORG))).toEqual(expect.not.arrayContaining([expect.objectContaining({ kind: "photo" })]))
  })

  it("lets a tech add to a visit they had, and refuses a visit another person had", async () => {
    expect((await add(tech, visitA)).addedBy).toBe(tech.email)
    await expect(add(tech, visitB)).rejects.toMatchObject({ code: "forbidden" })
    await expect(add(otherTech, visitA)).rejects.toMatchObject({ code: "forbidden" })
  })

  it("starts a staff photo shown when the visit is already Done", async () => {
    await db.update(s.visit).set({ status: "completed" }).where(eq(s.visit.id, visitB))
    expect((await add(writeKey, visitB)).shownToCustomer).toBe(true)
    await db.update(s.visit).set({ status: "scheduled" }).where(eq(s.visit.id, visitB))
  })

  it("lets a customer add to their own visit, always theirs to see, and writes the same event by customer", async () => {
    const out = await add(customerPerson(customerId), visitA)
    expect(out).toMatchObject({ addedBy: "customer", byCustomer: true, shownToCustomer: true, canRemove: true })
    const mine = (await eventsOf(db, { visitId: visitA })).filter((e) => e.kind === "visit.photo_added" && e.who === "customer")
    expect(mine).toHaveLength(1)
  })

  it("lets a customer who holds the visit's text link add to that one visit and nothing else", async () => {
    const link = { ...customerPerson(customerId), onlyVisitId: visitA }
    expect((await add(link, visitA)).byCustomer).toBe(true)
    await expect(add(link, visitB)).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses a read key, another customer, the anonymous visitor, a canceled visit and another organization", async () => {
    await expect(add(readKey, visitA)).rejects.toMatchObject({ code: "forbidden", message: "A read key cannot add photos" })
    await expect(add(customerPerson(otherCustomerId), visitA)).rejects.toMatchObject({ code: "forbidden" })
    await expect(add({ kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }, visitA)).rejects.toMatchObject({ code: "forbidden" })
    await db.update(s.visit).set({ status: "cancelled" }).where(eq(s.visit.id, visitB))
    await expect(add(customerPerson(customerId), visitB)).rejects.toMatchObject({ code: "unprocessable", message: "This visit was canceled" })
    await db.update(s.visit).set({ status: "scheduled" }).where(eq(s.visit.id, visitB))
    await expect(callApi(ctxFor(db, { ...owner, organizationId: OTHER }), photosAdd, { id: visitA, blobKey: put(visitA) })).rejects.toMatchObject({ code: "not_found" })
  })

  it("says photos are not set up while the store has no token", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "")
    await expect(add(owner, visitA)).rejects.toMatchObject({ code: "unprocessable", message: "Photos are not set up yet." })
  })

  it("refuses a file over 10 MB and removes it from the store", async () => {
    const key = put(visitA, { size: MAX_PHOTO_BYTES + 1 })
    await expect(add(owner, visitA, key)).rejects.toMatchObject({ code: "invalid", message: "That photo is over 10 MB." })
    expect(blob.removed).toContain(key)
    expect((await rowsOf(visitA)).some((r) => r.blobKey === key)).toBe(false)
  })

  it("keeps a file of exactly 10 MB", async () => {
    expect((await add(owner, visitA, put(visitA, { size: MAX_PHOTO_BYTES }))).bytes).toBe(MAX_PHOTO_BYTES)
  })

  it("refuses a file that is not a photo type, by what the store holds, and removes it", async () => {
    const key = put(visitA, { contentType: "application/pdf" })
    await expect(add(owner, visitA, key)).rejects.toMatchObject({ code: "invalid" })
    expect(blob.removed).toContain(key)
    for (const type of ["image/jpeg", "image/png", "image/heic", "image/webp"]) expect((await add(owner, visitA, put(visitA, { contentType: type }))).contentType).toBe(type)
  })

  it("refuses an upload that never arrived, a key outside the visit's folder, and a key another visit used", async () => {
    await expect(add(owner, visitA, `photos/${visitA}/never.jpg`)).rejects.toMatchObject({ code: "unprocessable", message: "Upload failed. Try again." })
    await expect(add(owner, visitA, put(visitB))).rejects.toMatchObject({ code: "invalid" })
    await expect(add(owner, visitA, `photos/${visitA}/../${visitB}/x.jpg`)).rejects.toMatchObject({ code: "invalid" })
    const used = await add(owner, visitA)
    const [row] = await db.select().from(s.photo).where(eq(s.photo.id, used.id))
    await db.update(s.photo).set({ visitId: visitB }).where(eq(s.photo.id, used.id))
    await expect(add(owner, visitA, row!.blobKey)).rejects.toMatchObject({ code: "conflict" })
    await db.update(s.photo).set({ visitId: visitA }).where(eq(s.photo.id, used.id))
  })

  it("answers the same photo for the same key and writes no second row or event", async () => {
    const key = put(visitA)
    const first = await add(owner, visitA, key)
    const before = (await eventsOf(db, { visitId: visitA })).length
    expect((await add(owner, visitA, key)).id).toBe(first.id)
    expect((await eventsOf(db, { visitId: visitA })).length).toBe(before)
  })

  it("holds a visit to 30 photos", async () => {
    const live = (await rowsOf(otherVisit)).length
    for (let i = live; i < MAX_PHOTOS_PER_VISIT; i++) await add(owner, otherVisit)
    const key = put(otherVisit)
    await expect(add(owner, otherVisit, key)).rejects.toMatchObject({ code: "unprocessable" })
    expect(blob.removed).toContain(key)
  })
})

describe("photos.list and photos.listForJob", () => {
  let staffPhoto: string
  let customerPhoto: string
  let hiddenStaff: string
  beforeAll(async () => {
    const stub = () => vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token")
    stub()
    await db.delete(s.photo).where(eq(s.photo.visitId, visitA))
    await db.update(s.visit).set({ status: "scheduled" }).where(eq(s.visit.id, visitA))
    hiddenStaff = (await add(owner, visitA)).id
    staffPhoto = (await add(owner, visitA)).id
    await callApi(ctxFor(db, owner), photosUpdate, { id: staffPhoto, shownToCustomer: true })
    customerPhoto = (await add(customerPerson(customerId), visitA)).id
  })

  it("gives staff every photo oldest first, with the name of who added it", async () => {
    const out = await list(owner, visitA)
    expect(out.data.map((p) => p.id)).toEqual([hiddenStaff, staffPhoto, customerPhoto])
    expect(out.data[0]).toMatchObject({ addedBy: owner.email, canRemove: true })
    expect((await list(readKey, visitA)).data).toHaveLength(3)
  })

  it("gives a customer their own photo at once and a staff photo only once marked and the visit is Done, never a staff email", async () => {
    const before = await list(customerPerson(customerId), visitA)
    expect(before.data.map((p) => p.id)).toEqual([customerPhoto])
    await db.update(s.visit).set({ status: "completed" }).where(eq(s.visit.id, visitA))
    const after = await list(customerPerson(customerId), visitA)
    expect(after.data.map((p) => p.id)).toEqual([staffPhoto, customerPhoto])
    expect(after.data[0]).toMatchObject({ addedBy: "staff", addedByName: null, canRemove: false })
    expect(JSON.stringify(after)).not.toContain(owner.email)
    await db.update(s.visit).set({ status: "scheduled" }).where(eq(s.visit.id, visitA))
  })

  it("gives a tech the photos of a visit they had and refuses another's", async () => {
    expect((await list(tech, visitA)).data).toHaveLength(3)
    await expect(list(tech, visitB)).rejects.toMatchObject({ code: "forbidden" })
    await expect(list(otherTech, visitA)).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses another customer, a link for another visit, the anonymous visitor and another organization", async () => {
    await expect(list(customerPerson(otherCustomerId), visitA)).rejects.toMatchObject({ code: "forbidden" })
    await expect(list({ ...customerPerson(customerId), onlyVisitId: visitB }, visitA)).rejects.toMatchObject({ code: "forbidden" })
    expect((await list({ ...customerPerson(customerId), onlyVisitId: visitA }, visitA)).data).toHaveLength(1)
    await expect(list({ kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }, visitA)).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, { ...owner, organizationId: OTHER }), photosList, { id: visitA })).rejects.toMatchObject({ code: "not_found" })
  })

  it("lists a job's photos for staff and leaves a tech only the visits they had", async () => {
    await add(owner, visitB)
    const all = await callApi(ctxFor(db, owner), photosListForJob, { id: jobId })
    expect(new Set(all.data.map((p) => p.visitId))).toEqual(new Set([visitA, visitB]))
    const mine = await callApi(ctxFor(db, tech), photosListForJob, { id: jobId })
    expect(new Set(mine.data.map((p) => p.visitId))).toEqual(new Set([visitA]))
    await expect(callApi(ctxFor(db, customerPerson(customerId)), photosListForJob, { id: jobId })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, { ...owner, organizationId: OTHER }), photosListForJob, { id: jobId })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("photos.update", () => {
  it("shows or hides a staff photo for the customer, for a caller with the write scope", async () => {
    const p = await add(owner, visitA)
    expect((await callApi(ctxFor(db, writeKey), photosUpdate, { id: p.id, shownToCustomer: true })).shownToCustomer).toBe(true)
    expect((await callApi(ctxFor(db, owner), photosUpdate, { id: p.id, shownToCustomer: false })).shownToCustomer).toBe(false)
  })
  it("refuses a tech, a read key, a customer, a customer's own photo, and an unknown or other organization's photo", async () => {
    const p = await add(owner, visitA)
    for (const who of [tech, readKey, customerPerson(customerId)]) await expect(callApi(ctxFor(db, who), photosUpdate, { id: p.id, shownToCustomer: true })).rejects.toMatchObject({ code: "forbidden" })
    const mine = await add(customerPerson(customerId), visitA)
    await expect(callApi(ctxFor(db, owner), photosUpdate, { id: mine.id, shownToCustomer: false })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, owner), photosUpdate, { id: "photo_nope", shownToCustomer: true })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, { ...owner, organizationId: OTHER }), photosUpdate, { id: p.id, shownToCustomer: true })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("photos.remove", () => {
  const remove = (principal: Parameters<typeof ctxFor>[1], id: string) => callApi(ctxFor(db, principal), photosRemove, { id })

  it("lets the person who added it remove it: a soft delete, the file leaves the store, one event, gone from lists", async () => {
    const p = await add(tech, visitA)
    const [row] = await db.select().from(s.photo).where(eq(s.photo.id, p.id))
    expect(await remove(tech, p.id)).toEqual({ id: p.id, removed: true })
    const [after] = await db.select().from(s.photo).where(eq(s.photo.id, p.id))
    expect(after!.deletedAt).toBeInstanceOf(Date)
    expect(blob.removed).toContain(row!.blobKey)
    expect((await list(owner, visitA)).data.some((x) => x.id === p.id)).toBe(false)
    expect((await eventsOf(db, { visitId: visitA })).filter((e) => e.kind === "visit.photo_removed" && (e.detail as { photoId?: string }).photoId === p.id)).toHaveLength(1)
    const events = (await eventsOf(db, { visitId: visitA })).length
    expect(await remove(owner, p.id).catch((e: { code: string }) => e.code)).toBe("not_found")
    expect((await eventsOf(db, { visitId: visitA })).length).toBe(events)
  })
  it("lets an owner remove anyone's photo, and a key with the admin scope; a manager and a write key only their own", async () => {
    const a = await add(tech, visitA)
    const b = await add(tech, visitA)
    await expect(remove(manager, a.id)).rejects.toMatchObject({ code: "forbidden" })
    await expect(remove(writeKey, a.id)).rejects.toMatchObject({ code: "forbidden" })
    await expect(remove(readKey, a.id)).rejects.toMatchObject({ code: "forbidden" })
    await expect(remove(otherTech, a.id)).rejects.toMatchObject({ code: "forbidden" })
    expect((await remove(owner, a.id)).removed).toBe(true)
    expect((await remove(adminKey, b.id)).removed).toBe(true)
    const mgr = await add(manager, visitA)
    expect((await remove(manager, mgr.id)).removed).toBe(true)
  })
  it("lets a customer remove their own photo only, and never learns of a staff photo that is not shown to them", async () => {
    const mine = await add(customerPerson(customerId), visitA)
    const staff = await add(owner, visitA)
    await expect(remove(customerPerson(customerId), staff.id)).rejects.toMatchObject({ code: "not_found" })
    await callApi(ctxFor(db, owner), photosUpdate, { id: staff.id, shownToCustomer: true })
    await db.update(s.visit).set({ status: "completed" }).where(eq(s.visit.id, visitA))
    await expect(remove(customerPerson(customerId), staff.id)).rejects.toMatchObject({ code: "forbidden" })
    await db.update(s.visit).set({ status: "scheduled" }).where(eq(s.visit.id, visitA))
    await expect(remove(customerPerson(otherCustomerId), mine.id)).rejects.toMatchObject({ code: "forbidden" })
    expect((await remove(customerPerson(customerId), mine.id)).removed).toBe(true)
  })
  it("does not know a photo of another organization", async () => {
    const p = await add(owner, visitA)
    await expect(callApi(ctxFor(db, { ...owner, organizationId: OTHER }), photosRemove, { id: p.id })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("the upload token rule (authorizeUpload)", () => {
  const ask = (visit: string, ...who: Parameters<typeof ctxFor>[1][]) => authorizeUpload(who.map((w) => ctxFor(db, w)), visit)
  it("admits the callers photos.add would accept, and refuses the rest with the same words", async () => {
    await expect(ask(visitA, owner)).resolves.toBeDefined()
    await expect(ask(visitA, tech)).resolves.toBeDefined()
    await expect(ask(visitA, customerPerson(customerId))).resolves.toBeDefined()
    await expect(ask(visitA, otherTech)).rejects.toMatchObject({ code: "forbidden" })
    await expect(ask(visitA, readKey)).rejects.toMatchObject({ code: "forbidden" })
    await expect(ask(visitA, customerPerson(otherCustomerId))).rejects.toMatchObject({ code: "forbidden" })
    await expect(ask(visitA)).rejects.toMatchObject({ code: "unauthorized" })
    await expect(ask("visit-nope", owner)).rejects.toMatchObject({ code: "not_found" })
  })
  it("takes the first way the caller can be known that works", async () => {
    await expect(ask(visitA, otherTech, customerPerson(customerId))).resolves.toBeDefined()
  })
  it("refuses once the visit holds 30 photos", async () => {
    await expect(ask(otherVisit, owner)).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("the serving rule (findReadablePhoto)", () => {
  it("admits staff, the tech who had the visit and the visit's customer for their own photo, and nobody else, with the same plain null", async () => {
    const staff = await add(owner, visitA)
    const mine = await add(customerPerson(customerId), visitA)
    const find = (id: string, ...who: Parameters<typeof ctxFor>[1][]) => findReadablePhoto(db, id, async () => who.map((w) => ctxFor(db, w)))
    expect(await find(staff.id, owner)).not.toBeNull()
    expect(await find(staff.id, tech)).not.toBeNull()
    expect(await find(staff.id, otherTech)).toBeNull()
    expect(await find(staff.id, customerPerson(customerId))).toBeNull()
    expect(await find(mine.id, customerPerson(customerId))).not.toBeNull()
    expect(await find(mine.id, customerPerson(otherCustomerId))).toBeNull()
    expect(await find(mine.id)).toBeNull()
    expect(await find(mine.id, { ...owner, organizationId: OTHER })).toBeNull()
    expect(await find("photo_nope", owner)).toBeNull()
    // the first way the caller could be known that works wins: an admin who is also the customer
    expect(await find(mine.id, otherTech, customerPerson(customerId))).not.toBeNull()
    await callApi(ctxFor(db, owner), photosRemove, { id: mine.id })
    expect(await find(mine.id, owner)).toBeNull()
  })
})
