import { describe, it, expect } from "vitest"
import { collectConfirm, doneToast, footerConfirms, reminderText, type ConfirmFacts } from "./confirm-copy"

const F: ConfirmFacts = { first: "Andrea", service: "repair", amount: "$145", phone: "(970) 555-0123", address: "480 Briggs St", cardWords: "Visa ending 4242", dueOn: "Dec 3" }

describe("confirmation words", () => {
  it("says the amount, the card and the message for a charge, a check and an invoice", () => {
    expect(collectConfirm("card", F)?.message).toBe("Charge $145 to the Visa ending 4242. Andrea gets a receipt by email.")
    expect(collectConfirm("check", F, "1042")?.message).toBe("Record a $145 check, number 1042. Andrea gets a receipt by email.")
    expect(collectConfirm("invoice", F)?.message).toBe("Send the invoice for $145 by text to (970) 555-0123, due Dec 3.")
    expect(collectConfirm("later", F)).toBeNull()
  })

  it("says the open invoice is settled when a payment lands on one, and ends Record the payment on the confirm of the hand-paid ways", () => {
    const open = { ...F, invoiceOpen: true }
    expect(collectConfirm("check", open, "1042")?.message).toBe("Record a $145 check, number 1042. Andrea gets a receipt by email, the open invoice is settled and its pay link closes.")
    for (const way of ["check", "venmo", "cash"]) expect(collectConfirm(way, F)?.confirmLabel).toBe("Record the payment")
    expect(footerConfirms(F)["Record the payment"]).toBeUndefined()
    expect(doneToast("invoice", F)).toBe("Invoice sent to Andrea")
  })

  it("adds the office's line after the reminder's words", () => {
    expect(reminderText(F, " Thank you! ")).toBe(`${reminderText(F)} Thank you!`)
  })

  it("shows the exact reminder text, with was due once it is past due and never the word overdue", () => {
    expect(reminderText({ ...F, pastDue: true })).toBe("Trailhead: a reminder that your $145 invoice for the repair was due Dec 3. Pay here: trailheadirrigation.com/pay/1042")
    expect(reminderText(F)).toContain("is due Dec 3")
    const c = footerConfirms(F)["Send a payment reminder"]!
    expect(c.confirmLabel).toBe("Send the reminder")
    expect(c.message).toContain("(970) 555-0123")
    expect(JSON.stringify(c).toLowerCase()).not.toContain("overdue")
  })

  it("says a cancel is a text and that nothing is charged", () => {
    const c = footerConfirms(F)["Cancel job"]!
    expect(c.destructive).toBe(true)
    expect(c.message).toBe("Cancel this job. Andrea gets a text that the repair is canceled. Nothing is charged.")
  })
})
