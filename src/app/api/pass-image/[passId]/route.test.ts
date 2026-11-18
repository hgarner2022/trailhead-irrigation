// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { TestDb } from "@/db/test-db"
import { apiDb, passJobOf } from "@/api/test-helpers"
import { passImageUrl, signToken } from "@/lib/messaging/tokens"

const holder = vi.hoisted(() => ({ db: undefined as unknown, rendered: [] as string[] }))
vi.mock("@/db", () => ({ db: () => holder.db }))
// The card itself is drawn elsewhere (pass-image.test.tsx); here only which pass it was drawn for matters.
vi.mock("@/lib/messaging/pass-image", async (original) => ({
  ...(await original<typeof import("@/lib/messaging/pass-image")>()),
  renderPassImage: async (model: { number: string }) => {
    holder.rendered.push(model.number)
    return new Response("png", { headers: { "content-type": "image/png" } })
  },
}))

import { GET } from "./route"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  holder.db = db
})
afterAll(() => db.close())

const get = (passId: string, token: string | null) => GET(new Request(`https://x.test/api/pass-image/${passId}${token ? `?token=${token}` : ""}`), { params: Promise.resolve({ passId }) })

describe("GET /api/pass-image/[passId]", () => {
  it("draws the card for a link signed over the job's id", async () => {
    const job = await passJobOf(db, "p3")
    holder.rendered.length = 0
    expect((await get(job.id, signToken("pass-image", job.id))).status).toBe(200)
    expect(holder.rendered).toEqual([job.passNumber])
  })

  it("draws the same card for an old link, signed over the old pass id, once it has verified the signature over the id as it arrived", async () => {
    const job = await passJobOf(db, "p3")
    holder.rendered.length = 0
    expect((await get("p3", signToken("pass-image", "p3"))).status).toBe(200)
    expect(holder.rendered).toEqual([job.passNumber])
    // a link signed over one spelling does not open the other
    expect((await get("p3", signToken("pass-image", job.id))).status).toBe(404)
    expect((await get(job.id, signToken("pass-image", "p3"))).status).toBe(404)
  })

  it("is a plain 404 for no token, a wrong token and a pass that is not there", async () => {
    expect((await get("p3", null)).status).toBe(404)
    expect((await get("p3", "not-the-token")).status).toBe(404)
    expect((await get("no-such-pass", signToken("pass-image", "no-such-pass"))).status).toBe(404)
  })

  it("is what the purchase confirmation's new links point at: the job's id", async () => {
    const job = await passJobOf(db, "p3")
    expect(passImageUrl("https://site.test", job.id)).toBe(`https://site.test/api/pass-image/${job.id}?token=${signToken("pass-image", job.id)}`)
  })
})
