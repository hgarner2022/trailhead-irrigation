import { describe, expect, it } from "vitest"
import { customerHeading, invoiceHeading, jobHeading, passService, quoteHeading, requestHeading } from "./record-title"

describe("the one title rule of a record page", () => {
  it("titles a job with its service, the customer under it, so two jobs for one customer differ", () => {
    const repair = jobHeading({ service: "Sprinkler repair", customer: "Andrea Dalton", detail: "Added Nov 18" })
    const blowout = jobHeading({ service: "Fall blowout", customer: "Andrea Dalton", detail: "Added Nov 12" })
    expect(repair).toEqual({ title: "Sprinkler repair", subtitle: "for Andrea Dalton · Added Nov 18", tab: "Sprinkler repair for Andrea Dalton · Trailhead admin" })
    expect(blowout.title).not.toBe(repair.title)
    expect(blowout.tab).not.toBe(repair.tab)
  })
  it("names a Season Pass job with its season, read from the pass number", () => {
    expect(passService("TH-2027-0008")).toBe("Season Pass 2027")
    expect(passService("TH-2026-0021")).toBe("Season Pass 2026")
    expect(passService("")).toBe("Season Pass")
  })
  it("titles a quote and an invoice with their number, what it is for and who under it", () => {
    expect(quoteHeading({ number: "Q-2026-0005", service: "New sprinkler system installation", customer: "Dana Whitfield", detail: "From a request" })).toEqual({
      title: "Q-2026-0005",
      subtitle: "New sprinkler system installation for Dana Whitfield · From a request",
      tab: "Q-2026-0005 · New sprinkler system installation for Dana Whitfield · Trailhead admin",
    })
    expect(invoiceHeading({ number: "INV-2026-0042", service: "Sprinkler repair", customer: "Marcus Bell", detail: "Sent Nov 12" })).toEqual({
      title: "INV-2026-0042",
      subtitle: "Sprinkler repair for Marcus Bell · Sent Nov 12",
      tab: "INV-2026-0042 · Sprinkler repair for Marcus Bell · Trailhead admin",
    })
  })
  it("titles a request with who sent it, and leaves out what they asked for when they did not say", () => {
    expect(requestHeading({ name: "Rosa Delgado", askedFor: "Larger sprinkler repair", detail: "Came in Nov 9" })).toEqual({ title: "Request from Rosa Delgado", subtitle: "Larger sprinkler repair · Came in Nov 9", tab: "Request from Rosa Delgado · Larger sprinkler repair · Trailhead admin" })
    expect(requestHeading({ name: "Tom Park", detail: "Came in Nov 9" }).subtitle).toBe("Came in Nov 9")
  })
  it("titles a customer with their name", () => {
    expect(customerHeading({ name: "Andrea Dalton", detail: "Customer since Apr 2026 · 480 Briggs St, Erie" })).toEqual({ title: "Andrea Dalton", subtitle: "Customer since Apr 2026 · 480 Briggs St, Erie", tab: "Andrea Dalton · Customer · Trailhead admin" })
  })
})
