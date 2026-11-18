import { describe, expect, it } from "vitest"
import type { AdminInvoice } from "@/lib/admin/types"
import { billState, billWords } from "./bill-model"

const invoice: AdminInvoice = { id: "i1", jobId: "j1", number: "INV-2026-0001", amount: 145, tax: 0, total: 145, sentOn: "2026-11-17", dueOn: "2026-12-01", status: "sent", visitIds: [] }
const owed = { paid: 0, total: 145, owed: 145, words: "$145 unpaid", billSent: false }

describe("billWords", () => {
  it("says when the invoice was sent and when it is due", () => {
    expect(billWords(invoice)).toBe("Invoice sent Nov 17, due Dec 1")
  })
  it("adds past due once the due day has passed", () => {
    expect(billWords({ ...invoice, status: "overdue" })).toBe("Invoice sent Nov 17, due Dec 1, past due")
  })
})

describe("billState", () => {
  const done = [{ status: "completed" as const }]
  it("offers Send an invoice on a done job that owes money and has no open invoice", () => {
    expect(billState({ money: owed }, done)).toEqual({ canSend: true })
  })
  it("shows the open invoice and offers no second one", () => {
    expect(billState({ money: { ...owed, words: "Invoice sent", billSent: true }, invoice }, done)).toEqual({ invoice, canSend: false })
  })
  it("does not offer it before every live visit is done, once paid, or without a job's money", () => {
    expect(billState({ money: owed }, [{ status: "completed" }, { status: "scheduled" }]).canSend).toBe(false)
    expect(billState({ money: { ...owed, owed: 0, words: "Paid" } }, done).canSend).toBe(false)
    expect(billState({}, done).canSend).toBe(false)
    expect(billState(undefined, done).canSend).toBe(false)
  })
  it("leaves cancelled and skipped visits out of the done check, and needs at least one visit", () => {
    expect(billState({ money: owed }, [{ status: "completed" }, { status: "cancelled" }, { status: "scheduled", skipped: true }]).canSend).toBe(true)
    expect(billState({ money: owed }, []).canSend).toBe(false)
  })
  it("leaves a job charged to the card on file to the card", () => {
    expect(billState({ money: owed }, done, true).canSend).toBe(false)
  })
})
