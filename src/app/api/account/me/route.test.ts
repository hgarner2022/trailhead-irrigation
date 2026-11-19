// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.fn()
const principalMock = vi.fn()
vi.mock("@/auth", () => ({ auth: () => authMock() }))
vi.mock("@/db", () => ({ db: () => ({}) }))
vi.mock("@/lib/auth/account-principal", () => ({ accountPrincipal: (_db: unknown, p: unknown) => principalMock(p) }))

import { GET } from "./route"

beforeEach(() => {
  authMock.mockReset()
  principalMock.mockReset()
})

describe("GET /api/account/me", () => {
  it("answers signedIn false for a guest, and nothing else", async () => {
    authMock.mockResolvedValue(null)
    const res = await GET()
    expect(await res.json()).toEqual({ signedIn: false })
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
  })
  it("answers signedIn true for a customer, with no name, email or id in the body", async () => {
    authMock.mockResolvedValue({ principal: { type: "customer", customerId: "c1", email: "andrea@example.com", organizationId: "o1" } })
    const body = await (await GET()).json()
    expect(body).toEqual({ signedIn: true })
    expect(JSON.stringify(body)).not.toMatch(/andrea|c1|o1/)
  })
  it("counts an admin whose email is also a customer's, and not an admin with no customer record", async () => {
    const admin = { type: "admin", email: "ryan@example.com", organizationId: "o1", role: "owner" }
    authMock.mockResolvedValue({ principal: admin })
    principalMock.mockResolvedValueOnce({ ...admin, type: "customer", customerId: "c9" })
    expect(await (await GET()).json()).toEqual({ signedIn: true })
    principalMock.mockResolvedValueOnce(admin)
    expect(await (await GET()).json()).toEqual({ signedIn: false })
  })
  it("answers signedIn false when the session cannot be read", async () => {
    authMock.mockRejectedValue(new Error("no store"))
    expect(await (await GET()).json()).toEqual({ signedIn: false })
  })
})
