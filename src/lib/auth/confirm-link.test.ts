import { describe, expect, it } from "vitest"
import { confirmFormFor, confirmLinkFor } from "./confirm-link"

const CALLBACK = "https://www.trailheadirrigation.com/api/auth/callback/resend?callbackUrl=%2Faccount&token=abc123&email=hannah%2Btest%40gmail.com"

describe("the sign-in confirm link", () => {
  it("wraps the callback in the confirm page on the same origin", () => {
    const link = confirmLinkFor(CALLBACK)
    expect(link.startsWith("https://www.trailheadirrigation.com/sign-in/confirm?to=")).toBe(true)
    const to = new URL(link).searchParams.get("to")!
    expect(to).toBe("/api/auth/callback/resend?callbackUrl=%2Faccount&token=abc123&email=hannah%2Btest%40gmail.com")
  })
  it("turns the wrapped callback back into a form with the plus sign in the email intact", () => {
    const to = new URL(confirmLinkFor(CALLBACK)).searchParams.get("to")!
    const form = confirmFormFor(to)!
    expect(form.action).toBe("/api/auth/callback/resend")
    expect(form.fields).toEqual([["callbackUrl", "/account"], ["token", "abc123"], ["email", "hannah+test@gmail.com"]])
  })
  it("refuses anything that is not our callback", () => {
    expect(confirmFormFor(undefined)).toBeNull()
    expect(confirmFormFor("/account/pass")).toBeNull()
    expect(confirmFormFor("https://evil.example/api/auth/callback/resend")).toBeNull()
    expect(confirmFormFor("/api/auth/callback/../../admin")).toBeNull()
  })
})
