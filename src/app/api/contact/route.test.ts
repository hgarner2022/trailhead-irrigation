// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"

// The email goes through Resend, the database through "@/db": both are replaced so the route runs on its own.
const held = vi.hoisted(() => ({ send: vi.fn(), database: undefined as unknown, fail: false }))
vi.mock("resend", () => ({ Resend: class { emails = { send: held.send } } }))
vi.mock("@/db", () => ({
  db: () => {
    if (held.fail) throw new Error("the database is down")
    return held.database
  },
}))

import { POST } from "./route"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  held.database = db
})
afterAll(() => db.close())
beforeEach(() => {
  held.send.mockReset()
  held.send.mockResolvedValue({ error: null })
  held.fail = false
  vi.stubEnv("DATABASE_URL", "postgres://test")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(fields)) data.set(k, v)
  return new Request("https://x.test/api/contact", { method: "POST", body: data })
}
const inquiry = { name: "Maya Rowan", email: "Maya.Rowan@Example.com", phone: "970-555-0119", address: "88 Briggs Street, Erie, CO 80516", service: "Full Irrigation Installs", message: "Four zones, new build" }

describe("POST /api/contact", () => {
  it("sends the email first, then makes the inquiry a job that needs a quote", async () => {
    const res = await POST(form(inquiry))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(held.send).toHaveBeenCalledTimes(1)
    expect(held.send.mock.calls[0]![0]).toMatchObject({ replyTo: inquiry.email, subject: "New Contact: Full Irrigation Installs — Maya Rowan" })
    const [customer] = await db.select().from(s.customer).where(eq(s.customer.email, "maya.rowan@example.com"))
    expect(customer).toMatchObject({ firstName: "Maya", lastName: "Rowan", organizationId: ORG })
    const [job] = await db.select().from(s.job).where(eq(s.job.customerId, customer!.id))
    expect(job).toMatchObject({ source: "site", soldOn: null, quoteSentOn: null })
    const [line] = await db.select().from(s.lineItem).where(eq(s.lineItem.jobId, job!.id))
    expect(line).toMatchObject({ name: "New sprinkler system installation", description: "Four zones, new build", unitPrice: 0 })
    const [property] = await db.select().from(s.property).where(eq(s.property.id, job!.propertyId))
    expect(property).toMatchObject({ address: "88 Briggs Street, Erie, CO 80516", town: "Erie" })
    expect((await db.select().from(s.event).where(eq(s.event.jobId, job!.id))).map((e) => e.kind)).toEqual(["job.requested"])
  })

  it("still sends its email and answers success when the database throws", async () => {
    held.fail = true
    const res = await POST(form({ ...inquiry, email: "nobody@example.com" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(held.send).toHaveBeenCalledTimes(1)
    held.fail = false
    expect(await db.select().from(s.customer).where(eq(s.customer.email, "nobody@example.com"))).toEqual([])
  })

  it("does nothing with the database when there is none, and the email goes", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const res = await POST(form({ ...inquiry, email: "nodb@example.com" }))
    expect(res.status).toBe(200)
    expect(held.send).toHaveBeenCalledTimes(1)
    expect(await db.select().from(s.customer).where(eq(s.customer.email, "nodb@example.com"))).toEqual([])
  })

  it("answers success when the quote job is refused (a bad email shape)", async () => {
    const res = await POST(form({ ...inquiry, email: "not-an-email" }))
    expect(res.status).toBe(200)
    expect(held.send).toHaveBeenCalledTimes(1)
  })

  it("keeps the old answers: a missing field is a 400, a failed email a 500, and neither touches the database", async () => {
    expect((await POST(form({ name: "Maya", email: "m@example.com" }))).status).toBe(400)
    held.send.mockResolvedValue({ error: { message: "no" } })
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await POST(form({ ...inquiry, email: "failed-send@example.com" }))).status).toBe(500)
    expect(await db.select().from(s.customer).where(eq(s.customer.email, "failed-send@example.com"))).toEqual([])
  })

  it("puts an address with no town we serve in the notes and gives the job the placeholder property", async () => {
    await POST(form({ ...inquiry, email: "far@example.com", address: "5 Pine Rd, Boulder, CO 80302", message: "" }))
    const [customer] = await db.select().from(s.customer).where(eq(s.customer.email, "far@example.com"))
    const [job] = await db.select().from(s.job).where(eq(s.job.customerId, customer!.id))
    const [line] = await db.select().from(s.lineItem).where(eq(s.lineItem.jobId, job!.id))
    expect(line!.description).toBe("Address given: 5 Pine Rd, Boulder, CO 80302")
    const [property] = await db.select().from(s.property).where(eq(s.property.id, job!.propertyId))
    expect(property).toMatchObject({ address: "Address needed", town: "Erie" })
  })
})
