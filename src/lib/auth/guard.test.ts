import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.fn()
vi.mock("@/auth", () => ({ auth: () => authMock() }))
const redirectMock = vi.fn((to: string) => {
  throw new Error(`redirect:${to}`)
})
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirectMock(to) }))

import { requireAdmin, requireCustomer, roleAtLeast } from "./guard"

const person = (type: "admin" | "customer", role?: "owner" | "admin" | "tech") => ({
  principal: { kind: "person", id: "u", email: "x@y.com", organizationId: "o", type, role, customerId: type === "customer" ? "c" : undefined },
})

beforeEach(() => {
  authMock.mockReset()
  redirectMock.mockClear()
})

describe("requireAdmin", () => {
  it("returns an admin", async () => {
    authMock.mockResolvedValue(person("admin", "admin"))
    expect((await requireAdmin()).email).toBe("x@y.com")
  })
  it("redirects a stranger and a customer to the admin sign-in", async () => {
    authMock.mockResolvedValue(null)
    await expect(requireAdmin()).rejects.toThrow("redirect:/admin/sign-in")
    authMock.mockResolvedValue(person("customer"))
    await expect(requireAdmin()).rejects.toThrow("redirect:/admin/sign-in")
  })
  it("redirects an admin below the minimum role", async () => {
    authMock.mockResolvedValue(person("admin", "tech"))
    await expect(requireAdmin("owner")).rejects.toThrow("redirect:/admin/sign-in")
    authMock.mockResolvedValue(person("admin", "owner"))
    expect((await requireAdmin("owner")).role).toBe("owner")
  })
})

describe("requireCustomer", () => {
  it("returns a customer or an admin", async () => {
    authMock.mockResolvedValue(person("customer"))
    expect((await requireCustomer()).type).toBe("customer")
    authMock.mockResolvedValue(person("admin", "owner"))
    expect((await requireCustomer()).type).toBe("admin")
  })
  it("redirects a stranger to the account sign-in", async () => {
    authMock.mockResolvedValue({})
    await expect(requireCustomer()).rejects.toThrow("redirect:/account/sign-in")
  })
})

it("orders the roles", () => {
  expect(roleAtLeast("owner", "admin")).toBe(true)
  expect(roleAtLeast("tech", "admin")).toBe(false)
  expect(roleAtLeast(undefined, "tech")).toBe(false)
})
