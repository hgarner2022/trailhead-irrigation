import { describe, expect, it } from "vitest"
import { signInEmail } from "./sign-in"

const email = signInEmail({ url: "https://www.example.com/api/auth/callback/resend?token=a&b=c", host: "www.example.com" })

describe("signInEmail", () => {
  it("says the link works one time and expires in 10 minutes", () => {
    expect(email.text).toContain("The link works one time and expires in 10 minutes.")
    expect(email.html).toContain("The link works one time and expires in 10 minutes.")
  })
  it("carries the link in both parts, escaped in the HTML", () => {
    expect(email.text).toContain("token=a&b=c")
    expect(email.html).toContain("token=a&amp;b=c")
  })
  it("has a plain subject and no em dashes", () => {
    expect(email.subject).toBe("Your Trailhead sign-in link")
    expect(email.text + email.html).not.toContain("—")
  })
})
