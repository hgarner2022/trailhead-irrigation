import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AccountLink, forgetSignedIn } from "./AccountLink"

// UX audit row 10: the marketing header says "Your account" to a signed-in customer and "Sign in" to a guest, without reading the session on the server.
const answer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response)

beforeEach(() => forgetSignedIn())
afterEach(() => vi.unstubAllGlobals())

describe("AccountLink", () => {
  it("is Sign in in the first render, so a guest and a crawler get the same static header", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    render(<AccountLink />)
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/sign-in")
  })
  it("becomes Your account to /account for a customer", async () => {
    const fetchMock = answer({ signedIn: true })
    vi.stubGlobal("fetch", fetchMock)
    render(<AccountLink />)
    await waitFor(() => expect(screen.getByRole("link", { name: "Your account" })).toHaveAttribute("href", "/account"))
    expect(fetchMock).toHaveBeenCalledWith("/api/account/me", expect.objectContaining({ cache: "no-store" }))
  })
  it("stays Sign in for a guest, a failed call and an error answer", async () => {
    for (const f of [answer({ signedIn: false }), answer({}, false), vi.fn(async () => { throw new Error("offline") })]) {
      forgetSignedIn()
      vi.stubGlobal("fetch", f)
      const { unmount } = render(<AccountLink />)
      await waitFor(() => expect(f).toHaveBeenCalled())
      await Promise.resolve()
      expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument()
      unmount()
    }
  })
  it("asks once for the two links of a page (desktop and phone)", async () => {
    const fetchMock = answer({ signedIn: true })
    vi.stubGlobal("fetch", fetchMock)
    render(<><AccountLink /><AccountLink /></>)
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Your account" })).toHaveLength(2))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
