import { describe, expect, it } from "vitest"
import { andrea, canceledRepairJob, dana, invoicedJob, oneOffJob, passJob, passJobInsideCutoff, passJobWindowTold, repairJob, TODAY } from "@/app/(account)/account/_screens/account-fixtures"
import type { PortalJobType } from "@/api/v1/portal/schemas"
import { visitPageOf } from "./visit-page"

const page = (job: PortalJobType, id: string, customer = andrea, today = TODAY) => visitPageOf(job, job.visits.find((v) => v.id === id)!, customer, today)

describe("visitPageOf", () => {
  it("before the day-before text: the day alone, the window promised for the day before, the rule's last minute", () => {
    const m = page(passJob, "v1")
    expect(m).toMatchObject({
      service: "Spring turn-on",
      label: "Season Pass 2027",
      dayLine: "Wednesday, April 28. We'll text you the time the day before.",
      where: "412 Briggs Street, Erie",
      mustBeHome: true,
      included: "8 zones, start up, check each head",
      priceLine: "$120, charged to the Visa ending 4242 after the visit",
      reschedule: "yes",
      cancel: "yes",
      canCalendar: true,
      changeLine: "You can change this until Monday, April 26, 11:59 pm.",
    })
    expect(m.pill.label).toBe("Booked")
  })

  it("once the window was told: the window and who is coming", () => {
    expect(page(passJobWindowTold, "v1").dayLine).toBe("Wednesday, April 28 at 8:00 am. Ryan is coming.")
  })

  it("never states a window from nothing: a customer with no phone and no email is told to call for it", () => {
    expect(page(passJob, "v1", { ...andrea, phone: null, email: null }).dayLine).toBe("Wednesday, April 28. Call Ryan for the time.")
  })

  it("a repair (days set with Ryan): the line says cancel online, never change, so it agrees with the buttons", () => {
    const job = { ...passJob, visits: passJob.visits.map((v) => (v.id === "v1" ? { ...v, reschedule: "text" as const, cancel: "yes" as const } : v)) }
    expect(page(job, "v1").changeLine).toBe("You can cancel this online until Monday, April 26, 11:59 pm.")
  })

  it("inside 24 hours: no change line, the buttons say text", () => {
    expect(page(passJobInsideCutoff, "v1")).toMatchObject({ reschedule: "text", cancel: "text", changeLine: null })
  })

  it("with no card, the price is paid after the visit; a visit with no day never says to pick one", () => {
    expect(page(oneOffJob, "v6", dana).priceLine).toBe("$145, paid after the visit")
    expect(page(passJob, "v2").dayLine).toBe("Our recommended, Oct 16 to Oct 30. We'll schedule it about two weeks before and tell you the day.")
    expect(page({ ...passJob, visits: passJob.visits.map((v) => (v.id === "v2" ? { ...v, preference: null } : v)) }, "v2").dayLine).toBe("Not scheduled yet. We'll text you when Ryan has one.")
  })

  it("a done and paid visit: Done on its day, Paid, and its receipt in the customer's words", () => {
    const m = page(repairJob, "v3")
    expect(m.dayLine).toBe("Done Tuesday, November 3, 2026.")
    expect(m.money).toEqual({ tone: "paid", label: "Paid" })
    expect(m.priceLine).toBe("")
    expect(m.receipts).toEqual([{ id: "pay_1", words: "Paid Nov 3, card $145", href: "/account/receipts/pay_1" }])
    expect(m.canCalendar).toBe(false)
  })

  it("a done visit with an invoice out carries the invoice and its pay link", () => {
    expect(page(invoicedJob, "v4").invoice).toEqual({ id: "inv_1", total: 115, dueOn: "2027-12-01", status: "sent", payHref: "/pay/inv_1?token=abc" })
    expect(page(invoicedJob, "v4").money).toEqual({ tone: "invoice-sent", label: "Invoice sent, due Dec 1" })
  })

  it("a canceled visit says Canceled with the day it was canceled and offers nothing", () => {
    const m = page(canceledRepairJob, "v8")
    expect(m.dayLine).toBe("Canceled Fri, Apr 2.")
    expect(m).toMatchObject({ reschedule: "no", cancel: "no", changeLine: null, canCalendar: false })
    expect(m.pill.label).toBe("Canceled")
  })

  it("the text to Ryan names the customer, the address and the visit and carries no id", () => {
    const m = page(passJob, "v1")
    expect(m.textBody).toBe("Hi Ryan, it's Andrea Lopez at 412 Briggs Street about my spring turn-on on Wednesday, April 28.")
    expect(m.textHref).toBe(`sms:+19706927270?&body=${encodeURIComponent(m.textBody)}`)
    expect(m.textHref).not.toContain("v1")
  })
})
