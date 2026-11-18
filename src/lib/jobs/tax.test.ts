import { describe, expect, it } from "vitest"
import { jobTotal, linesOfVisit, visitPrice } from "./lines"
import { jobSubtotal, jobTax, lineTax, NO_TAX, taxRuleOf, visitTax, type TaxLine, type TaxRule } from "./tax"

const on = (salesTaxPercent: number): TaxRule => ({ collectsSalesTax: true, salesTaxPercent })
const line = (over: Partial<TaxLine> = {}): TaxLine => ({ quantity: 1, unitPrice: 145, taxable: true, cancelledAt: null, ...over })

describe("lineTax", () => {
  it("is zero while the organization does not collect sales tax, whatever the percent says", () => {
    expect(lineTax(line(), NO_TAX)).toBe(0)
    expect(lineTax(line(), { collectsSalesTax: false, salesTaxPercent: 8 })).toBe(0)
  })
  it("is zero when the percent is zero, even with the switch on", () => {
    expect(lineTax(line(), on(0))).toBe(0)
  })
  it("is quantity times unit price times the percent, rounded to the dollar", () => {
    expect(lineTax(line(), on(8))).toBe(12)
    expect(lineTax(line(), on(8.8))).toBe(13)
    expect(lineTax(line({ quantity: 2, unitPrice: 50 }), on(4.2))).toBe(4)
  })
  it("is zero for a line that is not taxable and for a canceled one", () => {
    expect(lineTax(line({ taxable: false }), on(8))).toBe(0)
    expect(lineTax(line({ cancelledAt: new Date("2027-05-01T00:00:00Z") }), on(8))).toBe(0)
    expect(lineTax(line({ cancelledAt: "2027-05-01T00:00:00Z" }), on(8))).toBe(0)
  })
  it("rounds 12 rotors at $38 and 8.1% to $37", () => {
    // 12 * 38 = 456; 456 * 0.081 = 36.936
    expect(lineTax(line({ quantity: 12, unitPrice: 38 }), on(8.1))).toBe(37)
  })
})

describe("jobTax, jobSubtotal and jobTotal", () => {
  const lines = [line(), line({ unitPrice: 100, taxable: false }), line({ unitPrice: 80, cancelledAt: new Date() }), line({ quantity: 12, unitPrice: 38 })]
  it("leaves the totals as they were while nothing is collected", () => {
    expect(jobTax(lines, NO_TAX)).toBe(0)
    expect(jobSubtotal(lines)).toBe(145 + 100 + 456)
    expect(jobTotal(lines, NO_TAX)).toBe(701)
  })
  it("adds up the tax of each live taxable line, each rounded on its own", () => {
    // $145 at 8.1% is $11.745, so $12; 12 rotors at $38 is $36.936, so $37
    expect(jobTax(lines, on(8.1))).toBe(12 + 37)
    expect(jobTotal(lines, on(8.1))).toBe(701 + 49)
  })
  it("rounds per line, not over the taxable subtotal", () => {
    // three $5 lines at 8% are $0.40 each, so $0 each; the $15 subtotal at 8% would be $1.20, so $1
    const small = [line({ unitPrice: 5 }), line({ unitPrice: 5 }), line({ unitPrice: 5 })]
    expect(jobTax(small, on(8))).toBe(0)
  })
  it("equals its visits' tax plus its visit-less lines' tax", () => {
    const rule = on(8.1)
    const rows = [
      { ...line(), visitId: "a" },
      { ...line({ quantity: 12, unitPrice: 38 }), visitId: "b" },
      { ...line({ unitPrice: 33 }), visitId: null },
    ]
    const own = (id: string) => visitTax(linesOfVisit(rows, id), rule)
    expect(own("a") + own("b") + jobTax(rows.filter((l) => !l.visitId), rule)).toBe(jobTax(rows, rule))
    expect(visitPrice(linesOfVisit(rows, "a"), rule)).toBe(145 + 12)
  })
  it("taxes only the taxable one of a visit's two lines", () => {
    const rows = [{ ...line({ unitPrice: 145 }), visitId: "v" }, { ...line({ unitPrice: 60, taxable: false }), visitId: "v" }]
    expect(visitTax(rows, on(8))).toBe(12)
    expect(visitPrice(rows, on(8))).toBe(145 + 12 + 60)
  })
})

describe("taxRuleOf", () => {
  it("reads the billing settings, and collects nothing for an organization that never saved them", () => {
    expect(taxRuleOf({ collectsSalesTax: true, salesTaxPercent: 8.8 })).toEqual(on(8.8))
    expect(taxRuleOf(undefined)).toEqual(NO_TAX)
    expect(taxRuleOf(null)).toEqual(NO_TAX)
    expect(taxRuleOf({})).toEqual(NO_TAX)
  })
})
