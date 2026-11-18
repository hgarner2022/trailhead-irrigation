import { describe, expect, it } from "vitest"
import { dayBeforeText, invoiceReminderText, invoiceText, SMS_TEMPLATES } from "./texts"
import type { VisitFacts } from "@/emails/format"

const origin = "https://www.trailheadirrigation.com"
const base = { origin, firstName: "Andrea", passUrl: `${origin}/account/pass`, signInUrl: `${origin}/account/sign-in?email=andrea%40example.com` }
const visit: VisitFacts = { id: "v1", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", crew: "Truck 1", who: "Ryan", location: "412 Ash St, Erie", icsUrl: `${origin}/api/visits/v1/calendar.ics?token=abc` }

describe("the day-before text", () => {
  it("names who is coming when the visit has a person", () => {
    const t = dayBeforeText({ ...base, visit })
    expect(t).toBe(`Trailhead: Ryan will be there tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Changes: ${origin}/account/pass Reply STOP to opt out.`)
    expect(t).not.toContain("Truck 1")
  })
  it("says we come when the visit has no person, with nothing left dangling", () => {
    const t = dayBeforeText({ ...base, visit: { ...visit, who: null, crew: null } })
    expect(t).toBe(`Trailhead: we come tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Changes: ${origin}/account/pass Reply STOP to opt out.`)
    expect(t).not.toMatch(/will be there|  |, ,/)
    expect(t.length).toBeLessThanOrEqual(160)
  })
  it("is the day-before template", () => {
    expect(SMS_TEMPLATES["day-before"]).toBe(dayBeforeText)
  })
})

describe("the bill texts", () => {
  const bill = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", lines: [{ name: "Repair", amount: 145 }], amount: 145, tax: 0, total: 145, dueOn: "2027-12-01", payUrl: `${origin}/pay/inv1?token=abc` }
  it("says the amount, the due day and the pay link, with the opt-out line once", () => {
    expect(invoiceText(bill)).toBe(`Trailhead: your bill for the repair is $145, due Dec 1. Pay here: ${origin}/pay/inv1?token=abc Reply STOP to opt out.`)
    expect(invoiceReminderText(bill)).toBe(`Trailhead: a reminder that $145 for the repair is due Dec 1. Pay here: ${origin}/pay/inv1?token=abc Reply STOP to opt out.`)
    expect(invoiceText(bill).match(/STOP/g)).toHaveLength(1)
  })
  it("are the invoice and invoice-reminder templates", () => {
    expect(SMS_TEMPLATES.invoice).toBe(invoiceText)
    expect(SMS_TEMPLATES["invoice-reminder"]).toBe(invoiceReminderText)
  })
})
