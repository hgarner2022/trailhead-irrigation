// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const state = vi.hoisted(() => ({ asked: [] as { pathname: string; payload: string | null }[], allow: true, contexts: [] as unknown[] }))
vi.mock("@vercel/blob/client", () => ({
  handleUpload: async ({ body, onBeforeGenerateToken }: { body: { payload: { pathname: string; clientPayload: string | null } }; onBeforeGenerateToken: (p: string, c: string | null) => Promise<unknown> }) => {
    const options = await onBeforeGenerateToken(body.payload.pathname, body.payload.clientPayload)
    return { type: "blob.generate-client-token", clientToken: "stand-in", options }
  },
}))
vi.mock("@/api/v1/photos/authorize", async () => {
  const { ApiError } = await import("@/api/core/errors")
  return { authorizeUpload: async (_contexts: unknown[], visitId: string) => { state.asked.push({ pathname: visitId, payload: null }); if (!state.allow) throw new ApiError("forbidden", "Photos are for the person who had the visit") } }
})
vi.mock("../contexts", () => ({ photoContexts: async () => state.contexts }))

import { POST } from "./route"

const post = (pathname: string, clientPayload: unknown) =>
  POST(new Request("http://localhost/api/photos/upload", { method: "POST", body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname, clientPayload: typeof clientPayload === "string" ? clientPayload : JSON.stringify(clientPayload), multipart: false } }) }))

beforeEach(() => {
  state.asked.length = 0
  state.allow = true
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token")
})

describe("POST /api/photos/upload", () => {
  it("issues a token for one visit's folder that allows only photo types up to 10 MB with a random suffix", async () => {
    const res = await post("photos/v1/a.jpg", { visitId: "v1" })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { options: Record<string, unknown> }
    expect(body.options).toMatchObject({ maximumSizeInBytes: 10 * 1024 * 1024, addRandomSuffix: true })
    expect(body.options.allowedContentTypes).toEqual(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"])
    expect(state.asked).toHaveLength(1)
  })
  it("refuses a path outside the visit's folder before asking anyone", async () => {
    expect((await post("photos/v2/a.jpg", { visitId: "v1" })).status).toBe(400)
    expect((await post("photos/v1/../v2/a.jpg", { visitId: "v1" })).status).toBe(400)
    expect((await post("elsewhere/a.jpg", { visitId: "v1" })).status).toBe(400)
    expect((await post("photos/v1/a.jpg", "not json")).status).toBe(400)
    expect(state.asked).toHaveLength(0)
  })
  it("refuses a caller the photo rules refuse", async () => {
    state.allow = false
    const res = await post("photos/v1/a.jpg", { visitId: "v1" })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error: string }).error).toContain("person who had the visit")
  })
  it("says photos are not set up while the store has no token", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "")
    const res = await post("photos/v1/a.jpg", { visitId: "v1" })
    expect(res.status).toBe(422)
    expect(((await res.json()) as { error: string }).error).toBe("Photos are not set up yet.")
  })
  it("refuses a body that is not JSON", async () => {
    expect((await POST(new Request("http://localhost/api/photos/upload", { method: "POST", body: "nope" }))).status).toBe(400)
  })
})
