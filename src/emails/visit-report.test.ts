import { describe, expect, it } from "vitest"
import { REPAIR_STEPS } from "@/components/blocks/Checklist"
import { TRIP_STEPS } from "@/app/(admin)/admin/_screens/design/trip-fixtures"
import { receiptEmail as proposedReceipt } from "./design/messages"
import { receiptEmail } from "./account-messages"
import { EMAIL_FIXTURES, REPORT_STEPS, reportFor } from "./fixtures"
import { invoiceEmail } from "./invoice"
import type { InvoiceData, ReceiptData } from "./types"
import { checkedItems, hasReport, visitReport } from "./visit-report"

const receipt = EMAIL_FIXTURES.receipt as unknown as ReceiptData
const invoice = EMAIL_FIXTURES.invoice as unknown as InvoiceData

describe("the visit report fixtures match the job page's checklists", () => {
  it("the repair is REPAIR_STEPS and each pass service is its TRIP_STEPS template, word for word", () => {
    expect([...REPORT_STEPS.repair]).toEqual([...REPAIR_STEPS])
    for (const service of ["spring turn-on", "fall blowout", "July inspection"] as const) expect([...REPORT_STEPS[service]]).toEqual([...TRIP_STEPS[service]!])
  })
})

describe("visitReport", () => {
  it("lists only the checked items, never an open one (not even as Not done), and leaves notes and captions out", () => {
    const { html, text } = visitReport(reportFor("repair", 4, 2), "receipt")!
    expect(html).toContain("What we did")
    expect(html.match(/&#10003;/g)).toHaveLength(4)
    expect(html).not.toMatch(/&#9675;|Not done|Walk the customer through it/)
    expect(html.match(/<img /g)).toHaveLength(2)
    expect(html).not.toMatch(/figcaption|Notes from the crew/)
    expect(text).toEqual(["What we did", "[x] Walk the zones", "[x] Find the leak", "[x] Fix what we can", "[x] Set the controller", "", "2 photos are on your receipt page.", ""])
    expect(text.join("\n")).not.toMatch(/not done|\[ \]|customer through/i)
  })

  it("has no photo sentence or grid when no photo was shared", () => {
    const { html, text } = visitReport(reportFor("spring turn-on", undefined, 0), "invoice")!
    expect(html).not.toContain("<img")
    expect(text.join("\n")).not.toMatch(/photo/)
  })

  it("shows only the photos when no item is checked, and nothing at all when there is no photo either", () => {
    const photosOnly = visitReport(reportFor("repair", 0, 2), "receipt")!
    expect(photosOnly.html).toContain("<img")
    expect(photosOnly.html).not.toMatch(/&#10003;|&#9675;|Not done|Walk the zones/)
    expect(photosOnly.text).toEqual(["What we did", "", "2 photos are on your receipt page.", ""])
    expect(visitReport(reportFor("repair", 0, 0), "receipt")).toBeNull()
    expect(hasReport(reportFor("repair", 0, 0))).toBe(false)
    expect(checkedItems(reportFor("repair", 2, 0))).toEqual(["Walk the zones", "Find the leak"])
  })
})

describe("the receipt email carries What we did", () => {
  it("shows it under the money in the live email and in the proposed layout, with a plain-text twin", () => {
    for (const make of [receiptEmail, proposedReceipt]) {
      const e = make({ ...receipt, report: reportFor("repair", 4, 2) })
      expect(e.html).toContain("What we did")
      expect(e.html).not.toContain("Walk the customer through it")
      expect(e.html).not.toMatch(/Not done/)
      // under the money table, before the button
      expect(e.html.indexOf("What we did")).toBeGreaterThan(e.html.indexOf("Paid"))
      expect(e.text).toContain("[x] Find the leak")
      expect(e.text).not.toMatch(/not done|\[ \]/i)
      expect(e.text).toContain("2 photos are on your receipt page.")
    }
  })

  it("has no What we did when the invoice's Include the visit report box was left unchecked", () => {
    for (const make of [receiptEmail, proposedReceipt]) {
      const e = make({ ...receipt, report: undefined })
      expect(e.html).not.toContain("What we did")
      expect(e.text).not.toContain("What we did")
    }
  })
})

describe("the invoice email follows the same box", () => {
  it("carries What we did with the report and not without", () => {
    expect(invoiceEmail({ ...invoice, report: reportFor("repair", 4, 2) }).html).toContain("What we did")
    expect(invoiceEmail({ ...invoice, report: undefined }).html).not.toContain("What we did")
  })
})
