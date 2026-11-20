import { describe, expect, it } from "vitest"
import { classifyHref, stepOf } from "./routes"

describe("classifyHref", () => {
  it("opens the account's own pages", () => {
    expect(classifyHref("/account")).toEqual({ where: "account", href: "/account" })
    expect(classifyHref("/account/visits/v1?t=abc")).toEqual({ where: "account", href: "/account/visits/v1?t=abc" })
    expect(classifyHref("/account/receipts/pay_9")).toEqual({ where: "account", href: "/account/receipts/pay_9" })
    expect(classifyHref("/pay/inv_1?token=x")).toEqual({ where: "account", href: "/pay/inv_1?token=x" })
  })
  it("reads the links a text carries, absolute", () => {
    expect(classifyHref("https://www.trailheadirrigation.com/account/visits/v1?t=abc")).toEqual({ where: "account", href: "/account/visits/v1?t=abc" })
  })
  it("sends the rest to their screens", () => {
    expect(classifyHref("/booking")).toEqual({ where: "book" })
    expect(classifyHref("/book")).toEqual({ where: "book" })
    expect(classifyHref("/account/pass")).toEqual({ where: "pass" })
    expect(classifyHref("/season-pass/checkout?renew=p1")).toEqual({ where: "renew" })
    // the three screens that were stand-ins render as the live screens now; only Contact and an unknown account page are still labelled placeholders
    expect(classifyHref("/account/sign-in")).toEqual({ where: "sign-in" })
    expect(classifyHref("/account/sign-in/sent?email=a@b.co")).toEqual({ where: "sign-in" })
    expect(classifyHref("https://www.trailheadirrigation.com/account/pass/card-updated")).toEqual({ where: "card-updated" })
    expect(classifyHref("/season-pass")).toEqual({ where: "season-pass-page" })
    expect(classifyHref("/season-pass/")).toEqual({ where: "season-pass-page" })
    expect(classifyHref("/contact")).toMatchObject({ where: "placeholder", title: "Contact" })
    expect(classifyHref("/account/somewhere-else")).toMatchObject({ where: "placeholder" })
    expect(classifyHref("/quote/Q-2026-0007")).toEqual({ where: "quote" })
    expect(classifyHref("https://www.trailheadirrigation.com/quote/Q-2026-0007")).toEqual({ where: "quote" })
  })
  it("leaves the prototype for the rest", () => {
    for (const href of ["tel:+19706927270", "mailto:ryan@example.com", "https://dashboard.stripe.com/x", "/api/visits/v1/calendar.ics", ""]) expect(classifyHref(href)).toEqual({ where: "outside" })
  })
})

describe("stepOf", () => {
  it("places each screen on the strip", () => {
    expect(stepOf("book")).toBe("book")
    expect(stepOf("account", "home")).toBe("account")
    expect(stepOf("account", "visit")).toBe("visits")
    expect(stepOf("account", "receipt")).toBe("pay")
    expect(stepOf("account", "details")).toBe("details")
    expect(stepOf("renew")).toBe("pass")
    expect(stepOf("receipts")).toBe("receipts")
    expect(stepOf("quote")).toBe("quote")
    expect(stepOf("placeholder")).toBeNull()
    for (const w of ["sign-in", "card-updated", "season-pass-page"] as const) expect(stepOf(w)).toBeNull()
  })
})
