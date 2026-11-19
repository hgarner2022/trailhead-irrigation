// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const state = vi.hoisted(() => ({ photo: null as null | { blobKey: string; contentType: string }, file: null as unknown, linkSeen: null as string | null }))
vi.mock("@/db", () => ({ db: () => ({}) }))
vi.mock("@/api/v1/photos/authorize", () => ({ findReadablePhoto: async (_db: unknown, _id: string, contexts: (v: string) => Promise<unknown>) => { await contexts("v1"); return state.photo } }))
vi.mock("@/lib/photos/store", () => ({ readStoredFile: async () => state.file }))
vi.mock("../contexts", () => ({ photoContexts: async (_v: string, token?: string | null) => { state.linkSeen = token ?? null; return [] } }))

import { GET } from "./route"

const call = (url = "http://localhost/api/photos/photo_1", headers: Record<string, string> = {}) => GET(new Request(url, { headers }), { params: Promise.resolve({ id: "photo_1" }) })
const stream = () => new Response("bytes").body

beforeEach(() => {
  state.photo = { blobKey: "photos/v1/a.jpg", contentType: "image/jpeg" }
  state.file = { statusCode: 200, stream: stream(), blob: { etag: '"e1"' } }
  state.linkSeen = null
})

describe("GET /api/photos/[id]", () => {
  it("streams the file with its type, never cached by a shared cache and never sniffed", async () => {
    const res = await call()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/jpeg")
    expect(res.headers.get("cache-control")).toBe("private, no-cache")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(res.headers.get("etag")).toBe('"e1"')
    expect(await res.text()).toBe("bytes")
  })
  it("answers a plain 404 when the rules refuse the caller, and the same for a file the store lacks", async () => {
    state.photo = null
    const refused = await call()
    expect(refused.status).toBe(404)
    expect(await refused.text()).toBe("Not found")
    state.photo = { blobKey: "k", contentType: "image/jpeg" }
    state.file = null
    expect((await call()).status).toBe(404)
  })
  it("answers 304 with no body when the browser's copy is current", async () => {
    state.file = { statusCode: 304, stream: null, blob: { etag: '"e1"' } }
    const res = await call("http://localhost/api/photos/photo_1", { "if-none-match": '"e1"' })
    expect(res.status).toBe(304)
    expect(await res.text()).toBe("")
  })
  it("hands a text link's token to the rules, from the query only", async () => {
    await call("http://localhost/api/photos/photo_1?t=abc.def")
    expect(state.linkSeen).toBe("abc.def")
  })
})
