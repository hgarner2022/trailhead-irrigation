import { describe, expect, it } from "vitest"
import { billingFigures, dollars, groupRefunds, invoiceDetail, invoiceListRows, splitBilling, type InvoiceRowData, type PaymentRowData } from "./billing-model"

const pay = (over: Partial<PaymentRowData> = {}): PaymentRowData => ({ id: "p1", at: "2026-11-18T17:50:00Z", method: "card", methodLabel: "Visa ending 4242", amount: "$145", by: "Ryan", receiptHref: "/r/p1", ...over })
const inv = (over: Partial<InvoiceRowData> = {}): InvoiceRowData => ({ id: "i1", number: "INV-2026-0042", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "bill-sent", ...over })
const CARD: [string, string] = ["Card on file", "Visa ending 4242"]

describe("dollars", () => {
  it("reads whole dollars, negatives and thousands", () => {
    expect(dollars("$145")).toBe(145)
    expect(dollars("-$50")).toBe(-50)
    expect(dollars("$1,200")).toBe(1200)
    expect(dollars(undefined)).toBe(0)
  })
})

describe("billingFigures: say each fact once", () => {
  it("hides the figures and shows the card when nothing has been paid (the line says what is unpaid)", () => {
    const r = billingFigures([["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"], CARD], 0)
    expect(r.figures).toBeNull()
    expect(r.card).toBe("Visa ending 4242")
  })

  it("hides the figures and the card when it is paid in full by one payment", () => {
    const r = billingFigures([["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"], CARD], 1)
    expect(r).toEqual({ figures: null, card: null })
  })

  it("shows Total, Paid and Unpaid for a deposit and a final payment, without the card once it is paid", () => {
    const r = billingFigures([["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"], CARD], 2)
    expect(r.figures).toEqual([["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"]])
    expect(r.card).toBeNull()
  })

  it("shows the figures and the card for a part payment that leaves a balance", () => {
    const r = billingFigures([["Total", "$145"], ["Paid", "$50"], ["Unpaid", "$95"], CARD], 1)
    expect(r.figures).toEqual([["Total", "$145"], ["Paid", "$50"], ["Unpaid", "$95"]])
    expect(r.card).toBe("Visa ending 4242")
  })

  it("hides the figures after a full refund (the line says Refunded and the rows say the rest)", () => {
    expect(billingFigures([["Total", "$145"], ["Paid", "$0"], ["Refunded", "$145"], CARD], 1).figures).toBeNull()
  })

  it("shows Refunded in place of Unpaid after a part refund", () => {
    expect(billingFigures([["Total", "$145"], ["Paid", "$95"], ["Refunded", "$50"], CARD], 1).figures).toEqual([["Total", "$145"], ["Paid", "$95"], ["Refunded", "$50"]])
  })

  it("reads a Season Pass's own words and works out what is left of the season", () => {
    const r = billingFigures([["Season total", "$260"], ["Paid so far", "$145"], ["Card", "Visa ending 4242"]], 1)
    expect(r.figures).toEqual([["Total", "$260"], ["Paid", "$145"], ["Unpaid", "$115"]])
    expect(r.card).toBe("Visa ending 4242")
  })
})

describe("splitBilling: a paid invoice and its payment are one row", () => {
  it("takes the payment that settled an invoice into the invoice's row and leaves the rest", () => {
    const out = splitBilling([inv({ status: "paid" })], [pay({ invoiceId: "i1" }), pay({ id: "p2", method: "check", methodLabel: "Check #1031", amount: "$50" })])
    expect(out.invoices[0]!.paidBy?.id).toBe("p1")
    expect(out.payments.map((p) => p.id)).toEqual(["p2"])
  })

  it("keeps an invoice that is still out as its own row with no payment", () => {
    const out = splitBilling([inv()], [])
    expect(out.invoices[0]!.paidBy).toBeUndefined()
    expect(out.payments).toEqual([])
  })

  it("puts a refund under the payment it reverses, in the invoice's row or in Payments", () => {
    const refund = pay({ id: "r1", amount: "-$50", refund: true, refundOf: "p1" })
    const merged = splitBilling([inv({ status: "paid" })], [refund, pay({ invoiceId: "i1" })])
    expect(merged.invoices[0]!.refunds?.map((r) => r.id)).toEqual(["r1"])
    expect(invoiceListRows(merged.invoices).map((r) => r.kind)).toEqual(["invoice", "refund"])
    const alone = splitBilling([], [refund, pay()])
    expect(alone.payments.map((p) => p.id)).toEqual(["p1", "r1"])
  })

  it("ignores a payment whose invoice is not in the list", () => {
    expect(splitBilling([], [pay({ invoiceId: "gone" })]).payments).toHaveLength(1)
  })
})

describe("groupRefunds", () => {
  it("puts each refund right after its payment and leaves a refund with no payment where it was", () => {
    const rows = [pay({ id: "r1", refund: true, refundOf: "p1", amount: "-$50" }), pay({ id: "p2", amount: "$30" }), pay({ id: "p1" }), pay({ id: "r9", refund: true, amount: "-$5" })]
    expect(groupRefunds(rows).map((r) => r.id)).toEqual(["p2", "p1", "r1", "r9"])
  })
})

describe("invoiceDetail", () => {
  it("says how a paid invoice was paid, when and by whom, and when an open one went out", () => {
    expect(invoiceDetail(inv({ status: "paid", paidBy: pay() }))).toBe("Paid by Visa ending 4242 on Nov 18 · Ryan")
    expect(invoiceDetail(inv())).toBe("Sent Nov 18, due Dec 2")
  })
})
