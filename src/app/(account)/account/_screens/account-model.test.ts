import { describe, expect, it } from "vitest"
import { andrea, invoicedJob, passJob, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { openInvoices, visitsToOffer } from "./account-model"
import { portalTimeline } from "@/lib/portal/timeline"

describe("openInvoices", () => {
  it("lists the invoices still to be paid, oldest due day first, each with its pay link", () => {
    const list = openInvoices([invoicedJob, pastDueJob, repairJob])
    expect(list.map((i) => [i.id, i.status, i.payHref])).toEqual([
      ["inv_2", "overdue", "/pay/inv_2?token=def"],
      ["inv_1", "sent", "/pay/inv_1?token=abc"],
    ])
  })
  it("leaves out a paid invoice, one with no pay link and a canceled job's", () => {
    expect(openInvoices([{ ...invoicedJob, invoices: [{ ...invoicedJob.invoices[0]!, paidOn: "2027-03-30", status: "paid", payUrl: null }] }])).toEqual([])
    expect(openInvoices([{ ...invoicedJob, canceled: true }])).toEqual([])
  })
})

describe("visitsToOffer", () => {
  it("names the visits whose day the customer may pick or change online", () => {
    expect(visitsToOffer(portalTimeline(andrea, [passJob, repairJob], TODAY).upcoming)).toEqual(["v1", "v2"])
    expect(visitsToOffer(portalTimeline(andrea, [{ ...passJob, visits: passJob.visits.map((v) => ({ ...v, reschedule: "text" as const })) }], TODAY).upcoming)).toEqual([])
  })
})
