import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.fn()
const redirectMock = vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`)
})
vi.mock("@/auth", () => ({ auth: () => authMock(), signIn: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirectMock(to) }))

import SignInPage from "./page"

beforeEach(() => {
  authMock.mockReset()
  redirectMock.mockClear()
})

// UX audit row 17: a signed-in visitor who opens the sign-in page goes on to their account.
describe("/account/sign-in", () => {
  it("redirects a signed-in visitor to /account", async () => {
    authMock.mockResolvedValue({ principal: { type: "customer", customerId: "c1" } })
    await expect(SignInPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT /account")
  })
  it("redirects a signed-in visitor to the account page `next` names, and never outside /account", async () => {
    authMock.mockResolvedValue({ principal: { type: "customer", customerId: "c1" } })
    await expect(SignInPage({ searchParams: Promise.resolve({ next: "/account/visits" }) })).rejects.toThrow("REDIRECT /account/visits")
    await expect(SignInPage({ searchParams: Promise.resolve({ next: "https://evil.test" }) })).rejects.toThrow("REDIRECT /account")
  })
  it("shows the form to a guest", async () => {
    authMock.mockResolvedValue(null)
    const page = await SignInPage({ searchParams: Promise.resolve({}) })
    expect(page).toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
