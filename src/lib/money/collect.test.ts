import { describe, expect, it } from "vitest"
import { chargingWords, collectPlan, paidWords, refundable, type CollectInput } from "./collect"

const base: CollectInput = { amount: 145, isPass: false, invoiceOpen: false, canInvoice: true, declined: false, charging: false }
const card = { brand: "visa", last4: "4242" }
const values = (o: { value: string }[]) => o.map((x) => x.value)

describe("collectPlan", () => {
  it("offers the card first and selected when a real card is on file, then the cash ways and an invoice, and no Pay later", () => {
    const p = collectPlan({ ...base, card })
    expect(values(p.options)).toEqual(["card", "check", "venmo", "cash", "invoice"])
    expect(p.initial).toBe("card")
    expect(p.options[0]).toMatchObject({ label: "Charge the Visa ending 4242 now", line: "Charges $145 to the card and emails a receipt", button: "Charge $145" })
    expect(p.options[1]).toMatchObject({ button: "Record $145 paid", line: "Check number, and emails a receipt" })
    expect(p.options[4]).toMatchObject({ line: "Texts a pay link, due in 14 days", button: "Send the invoice" })
  })

  it("offers Pay later last, and only to a customer with no card, and starts on Check", () => {
    const p = collectPlan(base)
    expect(values(p.options)).toEqual(["check", "venmo", "cash", "invoice", "later"])
    expect(p.initial).toBe("check")
    expect(p.options[4]).toMatchObject({ label: "Pay later", button: "Leave it unpaid", line: "Nothing is collected now; it reads Unpaid until a payment or an invoice" })
    expect(collectPlan({ ...base, card }).options.map((o) => o.value)).not.toContain("later")
  })

  it("a Season Pass visit with a card is Charge the card as agreed, with no Pay later, no invoice, and the cash ways behind Paid another way", () => {
    const p = collectPlan({ ...base, card, isPass: true })
    expect(p.asAgreed).toBe(true)
    expect(values(p.options)).toEqual(["card"])
    expect(p.options[0]).toMatchObject({ label: "Charge the card as agreed", line: "Charges $145 to the Visa ending 4242 and emails a receipt" })
    expect(values(p.anotherWay)).toEqual(["check", "venmo", "cash"])
  })

  it("a pass sold by the office with no card gets the no-card choices, Pay later included", () => {
    const p = collectPlan({ ...base, isPass: true })
    expect(p.asAgreed).toBe(false)
    expect(values(p.options)).toEqual(["check", "venmo", "cash", "invoice", "later"])
  })

  it("after a decline the card is not offered and nothing says Pay later; the cash ways and an invoice remain", () => {
    const p = collectPlan({ ...base, card, declined: true })
    expect(values(p.options)).toEqual(["check", "venmo", "cash", "invoice"])
    expect(p.declined).toBe(true)
    expect(collectPlan({ ...base, card, declined: true, isPass: true }).asAgreed).toBe(false)
  })

  it("an open invoice leaves only the money in hand; no invoice offered twice", () => {
    expect(values(collectPlan({ ...base, card, invoiceOpen: true }).options)).toEqual(["check", "venmo", "cash"])
  })

  it("a visit with no price yet asks what came and offers only the money in hand", () => {
    const p = collectPlan({ ...base, amount: 0, card })
    expect(p.needsAmount).toBe(true)
    expect(values(p.options)).toEqual(["check", "venmo", "cash"])
    expect(p.options[0]!.button).toBe("Record the payment")
  })

  it("holds the invoice back when the job cannot be invoiced yet", () => {
    expect(values(collectPlan({ ...base, canInvoice: false }).options)).toEqual(["check", "venmo", "cash", "later"])
  })
})

describe("the words after", () => {
  it("reads Paid with how from the one table, and says what is happening while a card charge runs", () => {
    expect(paidWords("card_on_file")).toBe("Paid, card")
    expect(paidWords("venmo")).toBe("Paid, Venmo")
    expect(chargingWords(145, "Visa ending 4242")).toBe("Charging $145 to the Visa ending 4242")
  })
})

describe("refundable", () => {
  const row = (id: string, method: string, amount: number, refunds?: string) => ({ id, method, amount, status: "succeeded", refundsPaymentId: refunds ?? null })
  it("finds a check, Venmo or cash payment nothing has taken back, and not a card payment", () => {
    expect(refundable([row("p1", "check", 145)])).toMatchObject({ payment: { id: "p1" }, left: 145 })
    expect(refundable([row("p1", "card_on_file", 145)])).toBeUndefined()
    expect(refundable([row("p1", "cash", 145), row("r1", "cash", -145, "p1")])).toBeUndefined()
    expect(refundable([row("p1", "cash", 145), row("r1", "cash", -40, "p1")])?.left).toBe(105)
  })
})
