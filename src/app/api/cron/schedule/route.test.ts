// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

afterEach(() => vi.unstubAllEnvs())
const call = (auth?: string) => GET(new Request("https://x.test/api/cron/schedule", { headers: auth ? { authorization: auth } : {} }))

describe("GET /api/cron/schedule", () => {
  it("refuses a call without the cron secret, and every call while the secret is unset", async () => {
    expect((await call()).status).toBe(401)
    vi.stubEnv("CRON_SECRET", "s3cret")
    expect((await call()).status).toBe(401)
    expect((await call("Bearer wrong!")).status).toBe(401)
  })
})
