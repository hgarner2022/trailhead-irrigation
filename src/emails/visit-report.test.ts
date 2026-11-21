import { describe, expect, it } from "vitest"
import { REPAIR_STEPS } from "@/components/blocks/Checklist"
import { TRIP_STEPS } from "@/app/(admin)/admin/_screens/design/trip-fixtures"
import { receiptEmail as proposedReceipt } from "./design/messages"
import { receiptEmail } from "./account-messages"
import { EMAIL_FIXTURES, REPORT_STEPS, reportFor } from "./fixtures"
import { invoiceEmail } from "./invoice"
import type { InvoiceData, ReceiptData } from "./types"
import { visitReport } from "./visit-report"

const receipt = EMAIL_FIXTURES.receipt as unknown as ReceiptData
const invoice = EMAIL_FIXTURES.invoice as unknown as InvoiceData

describe("the visit report fixtures match the job page's checklists", () => {
  it("the repair is REPAIR_STEPS and each pass service is its TRIP_STEPS template, word for word", () => {
    expect([...REPORT_STEPS.repair]).toEqual([...REPAIR_STEPS])
    for (const service of ["spring turn-on", "fall blowout", "July inspection"] as const) expect([...REPORT_STEPS[service]]).toEqual([...TRIP_STEPS[service]!])
  })
})

describe("visitReport", () => {
  it("lists every item with a check, marks an open item Not done and leaves notes and captions out", () => {
    const { html, text } = visitReport(reportFor("repair", 4, 2), "receipt")
    expect(html).toContain("What we did")
    expect(html.match(/&#10003;/g)).toHaveLength(4)
    expect(html.match(/&#9675;/g)).toHaveLength(1)
    expect(html.match(/Not done/g)).toHaveLength(1)
    expect(html.match(/<img /g)).toHaveLength(2)
    expect(html).not.toMatch(/figcaption|Notes from the crew/)
    expect(text).toEqual(["What we did", "[x] Walk the zones", "[x] Find the leak", "[x] Fix what we can", "[x] Set the controller", "[ ] Walk the customer through it (not done)", "", "2 photos are on your receipt page.", ""])
  })

  it("has no photo sentence or grid when no photo was shared", () => {
    const { html, text } = visitReport(reportFor("spring turn-on", undefined, 0), "invoice")
    expect(html).not.toContain("<img")
    expect(text.join("\n")).not.toMatch(/photo/)
  })
})

describe("the receipt email carries What we did", () => {
  it("shows it under the money in the live email and in the proposed layout, with a plain-text twin", () => {
    for (const make of [receiptEmail, proposedReceipt]) {
      const e = make({ ...receipt, report: reportFor("repair", 4, 2) })
      expect(e.html).toContain("What we did")
      expect(e.html).toContain("Walk the customer through it")
      // under the money table, before the button
      expect(e.html.indexOf("What we did")).toBeGreaterThan(e.html.indexOf("Paid"))
      expect(e.text).toContain("[x] Find the leak")
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
