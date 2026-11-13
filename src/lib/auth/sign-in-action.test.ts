import { describe, expect, it, vi } from "vitest"
import { requestSignIn, safeNext } from "./sign-in-action"

const form = (email: string) => {
  const f = new FormData()
  f.set("email", email)
  return f
}

describe("requestSignIn", () => {
  it("goes to the sent page when the link went out, asking for the page the person wanted", async () => {
    const signIn = vi.fn().mockResolvedValue("https://x.test/account/sign-in/sent")
    const to = await requestSignIn("/account", form(" a@b.com "), signIn, "/account/pass")
    expect(signIn).toHaveBeenCalledWith("resend", { email: "a@b.com", redirect: false, redirectTo: "/account/pass" })
    expect(to).toBe("/account/sign-in/sent?email=a%40b.com")
  })
  it("shows Denied for a stranger", async () => {
    const signIn = vi.fn().mockResolvedValue("https://x.test/account/sign-in?error=AccessDenied")
    expect(await requestSignIn("/admin", form("s@x.com"), signIn)).toBe("/admin/sign-in?error=AccessDenied&email=s%40x.com")
  })
  it("reports any other failure, including a throw, as Failed", async () => {
    expect(await requestSignIn("/admin", form("a@b.com"), vi.fn().mockResolvedValue("/x?error=Configuration"))).toContain("error=Failed")
    expect(await requestSignIn("/admin", form("a@b.com"), vi.fn().mockRejectedValue(new Error("boom")))).toContain("error=Failed")
  })
  it("does not call Auth.js for an empty email", async () => {
    const signIn = vi.fn()
    expect(await requestSignIn("/admin", form("  "), signIn)).toBe("/admin/sign-in?error=Missing")
    expect(signIn).not.toHaveBeenCalled()
  })
})

describe("safeNext", () => {
  it("keeps a path inside the area and drops everything else", () => {
    expect(safeNext("/admin", "/admin/passes")).toBe("/admin/passes")
    expect(safeNext("/admin", "/account/pass")).toBe("/admin")
    expect(safeNext("/admin", "//evil.com")).toBe("/admin")
    expect(safeNext("/admin", "/admin//evil.com")).toBe("/admin")
    expect(safeNext("/account", undefined)).toBe("/account")
  })
})
