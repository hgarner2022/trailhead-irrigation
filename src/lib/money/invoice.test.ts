import { describe, expect, it } from "vitest"
import { DEFAULT_BILLING } from "@/lib/settings/defaults"
import { jobTax } from "@/lib/jobs/tax"
import { invoiceAmount, invoiceLines, invoiceOpen, invoiceStatus, nextInvoiceNumber } from "./invoice"

const line = (over: Partial<Parameters<typeof invoiceLines>[0][number]> = {}) => ({ name: "Repair", description: "What the visit includes", quantity: 1, unitPrice: 145, taxable: false, ...over })

describe("invoiceLines", () => {
  it("copies every live line and leaves cancelled ones out", () => {
    const frozen = invoiceLines([line(), line({ name: "Fall blowout", unitPrice: 95, cancelledAt: new Date("2027-05-01") }), line({ name: "Spring turn-on", quantity: 2, unitPrice: 50, taxable: true, visitId: "v1" })])
    expect(frozen).toEqual([
      { name: "Repair", description: "What the visit includes", quantity: 1, unitPrice: 145, taxable: false },
      { name: "Spring turn-on", description: "What the visit includes", quantity: 2, unitPrice: 50, taxable: true, visitId: "v1" },
    ])
    expect(invoiceAmount(frozen)).toBe(245)
  })
  it("is a copy: changing the source line afterwards does not change the frozen one", () => {
    const source = line()
    const [frozen] = invoiceLines([source])
    source.unitPrice = 999
    expect(frozen!.unitPrice).toBe(145)
  })
  it("gives a missing description as null", () => {
    expect(invoiceLines([line({ description: undefined })])[0]!.description).toBeNull()
  })
})

describe("the tax on a bill's lines (jobTax)", () => {
  const lines = [{ quantity: 1, unitPrice: 145, taxable: true }, { quantity: 1, unitPrice: 100, taxable: false }]
  it("is zero while the organization does not collect sales tax, whatever the percent says", () => {
    expect(jobTax(lines, { collectsSalesTax: false, salesTaxPercent: 8.8 })).toBe(0)
    expect(jobTax(lines, DEFAULT_BILLING)).toBe(0)
  })
  it("is the taxable lines' tax, each rounded to the dollar", () => {
    expect(jobTax(lines, { collectsSalesTax: true, salesTaxPercent: 8 })).toBe(12)
    expect(jobTax(lines, { collectsSalesTax: true, salesTaxPercent: 3.5 })).toBe(5)
    expect(jobTax([{ quantity: 2, unitPrice: 50, taxable: true }], { collectsSalesTax: true, salesTaxPercent: 4.2 })).toBe(4)
  })
  it("leaves untaxed lines out and is zero when none are taxable", () => {
    expect(jobTax([{ quantity: 1, unitPrice: 145, taxable: false }], { collectsSalesTax: true, salesTaxPercent: 8 })).toBe(0)
  })
})

describe("invoiceStatus", () => {
  it("is sent through the due day and overdue from the day after", () => {
    expect(invoiceStatus({ dueOn: "2027-05-21" }, "2027-05-07")).toBe("sent")
    expect(invoiceStatus({ dueOn: "2027-05-21" }, "2027-05-21")).toBe("sent")
    expect(invoiceStatus({ dueOn: "2027-05-21" }, "2027-05-22")).toBe("overdue")
  })
  it("reads paid and cancelled before the due day, paid over overdue, cancelled over paid", () => {
    expect(invoiceStatus({ dueOn: "2027-05-21", paidOn: "2027-06-01" }, "2027-07-01")).toBe("paid")
    expect(invoiceStatus({ dueOn: "2027-05-21", cancelledAt: new Date() }, "2027-07-01")).toBe("cancelled")
    expect(invoiceStatus({ dueOn: "2027-05-21", paidOn: "2027-05-01", cancelledAt: new Date() }, "2027-05-02")).toBe("cancelled")
  })
  it("is open until it is paid or cancelled", () => {
    expect(invoiceOpen({})).toBe(true)
    expect(invoiceOpen({ paidOn: "2027-05-01" })).toBe(false)
    expect(invoiceOpen({ cancelledAt: new Date() })).toBe(false)
  })
})

describe("nextInvoiceNumber", () => {
  it("starts the year at 0001 and counts on from the highest number", () => {
    expect(nextInvoiceNumber(2026, null)).toBe("INV-2026-0001")
    expect(nextInvoiceNumber(2026, "INV-2026-0001")).toBe("INV-2026-0002")
    expect(nextInvoiceNumber(2026, "INV-2026-0099")).toBe("INV-2026-0100")
    expect(nextInvoiceNumber(2026, "INV-2026-9999")).toBe("INV-2026-10000")
  })
  it("starts again at 0001 in a new year and ignores a number it cannot read", () => {
    expect(nextInvoiceNumber(2027, "INV-2026-0042")).toBe("INV-2027-0001")
    expect(nextInvoiceNumber(2027, "garbage")).toBe("INV-2027-0001")
  })
})
