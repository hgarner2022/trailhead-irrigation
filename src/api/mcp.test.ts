// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { createApiKey } from "@/lib/auth/api-key"
import { handleMcp } from "./mcp"
import { handlers } from "./v1"
import { apiDb, ORG, OWNER_EMAIL } from "./test-helpers"

let db: TestDb
let readSecret: string
beforeAll(async () => {
  db = await apiDb()
  readSecret = (await createApiKey(db, ORG, OWNER_EMAIL, { name: "agent", scopes: ["read"] })).key
})
afterAll(() => db.close())

let id = 0
const rpc = async (method: string, params: unknown, bearer: string | null = readSecret) => {
  const res = await handleMcp(
    new Request("https://x.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    }),
    { database: () => db },
  )
  return { status: res.status, body: res.status === 200 ? await res.json() : await res.json().catch(() => null) }
}

describe("/api/mcp", () => {
  it("refuses a request without a valid key", async () => {
    expect((await rpc("tools/list", {}, null)).status).toBe(401)
    expect((await rpc("tools/list", {}, "th_live_nope")).status).toBe(401)
  })
  it("lists one tool per handler, named by operation id, with an input schema", async () => {
    const { body } = await rpc("tools/list", {})
    const tools = body.result.tools as { name: string; description: string; inputSchema: { type: string } }[]
    expect(tools.map((t) => t.name).sort()).toEqual(handlers.map((h) => h.name).sort())
    const list = tools.find((t) => t.name === "passes.list")!
    expect(list.inputSchema.type).toBe("object")
    expect(list.description).toContain("read scope")
  })
  it("calls passes.list through the transport with the key's scopes and logs the call", async () => {
    const { body } = await rpc("tools/call", { name: "passes.list", arguments: { season: 2027, limit: 3 } })
    expect(body.result.isError).toBeFalsy()
    const out = JSON.parse(body.result.content[0].text)
    expect(out.data).toHaveLength(3)
    expect(out.next_cursor).toBeTruthy()
    expect(JSON.stringify(out)).not.toContain("accessNote")
    const rows = await db.select().from(s.apiCall).where(eq(s.apiCall.path, "/passes"))
    expect(rows.at(-1)).toMatchObject({ principalKind: "api-key", method: "GET", status: 200 })
  })
  it("answers a tool the key's scopes forbid with an error result, never an effect", async () => {
    const { body } = await rpc("tools/call", { name: "passes.cancel", arguments: { id: "p5" } })
    expect(body.result.isError).toBe(true)
    expect(JSON.parse(body.result.content[0].text).error.code).toBe("forbidden")
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p5"))
    expect(pass!.status).toBe("active")
  })
  it("reports bad arguments as an error result", async () => {
    const { body } = await rpc("tools/call", { name: "passes.list", arguments: { town: "Denver" } })
    expect(body.result.isError).toBe(true)
  })
})
