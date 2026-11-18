import { describe, expect, it } from "vitest"
import { EVENT_KINDS } from "./kinds"
import { eventWords, techEvent, whoWords } from "./words"

const words = (kind: string, detail: Record<string, unknown> = {}, who = "ryan@example.com", whoName: string | null = "Ryan Garner") => eventWords({ kind, detail, who }, whoName).what

describe("eventWords: one sentence per kind", () => {
  it("job.sold: bought online, sold by the office, renewed, and a one-off", () => {
    expect(words("job.sold", { source: "website", name: "Season Pass", passNumber: "TH-2027-0014" })).toBe("Season Pass TH-2027-0014 bought online")
    expect(words("job.sold", { source: "office", name: "Season Pass", passNumber: "TH-2027-0014" })).toBe("Season Pass TH-2027-0014 sold by the office")
    expect(words("job.sold", { source: "renewal", name: "Season Pass", passNumber: "TH-2028-0002" })).toBe("Season Pass TH-2028-0002 renewed")
    expect(words("job.sold", { source: "office", name: "Repair", kind: "repair", day: "2027-05-05" })).toBe("Repair added by the office")
  })
  it("job.requested: a quote asked for online", () => {
    expect(words("job.requested", { source: "site", name: "Repair" })).toBe("Quote asked for online")
    expect(words("job.requested", { source: "office" })).toBe("Quote asked for at the office")
    expect(words("job.requested", {})).toBe("Quote needed")
  })
  it("job.cancelled", () => {
    expect(words("job.cancelled")).toBe("Job canceled")
    expect(words("job.cancelled", { reason: "Moved away" })).toBe("Job canceled, Moved away")
  })
  it("visit.scheduled and visit.moved", () => {
    expect(words("visit.scheduled", { name: "Spring turn-on", day: "2027-04-22", from: null })).toBe("Spring turn-on scheduled for Apr 22")
    expect(words("visit.moved", { name: "Spring turn-on", day: "2027-04-22", from: "2027-04-20" })).toBe("Spring turn-on moved from Apr 20 to Apr 22")
    expect(words("visit.moved", {})).toBe("The visit moved")
  })
  it("visit.day-filled and visit.move-requested", () => {
    expect(words("visit.day-filled", { visit: "turn-on", from: "2027-04-20", to: "2027-04-22" })).toBe("Spring turn-on set for Apr 22, the next open day after Apr 20")
    expect(words("visit.move-requested", { preferredWeek: "2027-05-10", note: "Away until then" })).toBe("Move requested for the visit, week of May 10: Away until then")
  })
  it("visit.done, with how it was paid, and visit.undone", () => {
    expect(words("visit.done", { name: "Spring turn-on", completedOn: "2027-04-22", paidBy: "venmo" })).toBe("Spring turn-on marked done, paid by Venmo")
    expect(words("visit.done", { name: "Spring turn-on", completedOn: "2027-04-22" })).toBe("Spring turn-on marked done")
    expect(words("visit.done", { name: "Fall blowout", paidBy: "bill" })).toBe("Fall blowout marked done, invoice sent")
    expect(words("visit.undone", { name: "Spring turn-on" })).toBe("Spring turn-on put back to not done")
  })
  it("visit.not-done, visit.cancelled and visit.skipped", () => {
    expect(words("visit.not-done", { name: "Spring turn-on", reason: "no-water", note: "Main valve off" })).toBe("Spring turn-on marked not done, no water on: Main valve off")
    expect(words("visit.cancelled", { name: "Spring turn-on", reason: "Customer called" })).toBe("Spring turn-on canceled, Customer called")
    expect(words("visit.cancelled", { name: "Spring turn-on", reason: null })).toBe("Spring turn-on canceled")
    expect(words("visit.skipped", { name: "Mid-season inspection" })).toBe("Mid-season inspection skipped")
  })
  it("visit.edited reads the flat detail", () => {
    expect(words("visit.edited", { name: "Spring turn-on", durationMinutes: { from: 60, to: 90 }, price: { from: 145, to: 160 } })).toBe("Spring turn-on edited: length 60 to 90 minutes, price $145 to $160")
    expect(words("visit.edited", { name: "Spring turn-on", unscheduled: { from: "2027-04-22" }, accessNote: true })).toBe("Spring turn-on edited: day taken back, access note changed")
    expect(words("visit.edited", { name: "Spring turn-on", personId: { from: "a", to: "b" } })).toBe("Spring turn-on edited: who has it changed")
    expect(words("visit.edited", { name: "Spring turn-on", durationMinutes: { from: 45, to: 60 } })).toBe("Spring turn-on edited: length 45 to 60 minutes")
  })
  it("pass.cancelled, pass.preference-changed, pass.inspection-added", () => {
    expect(words("pass.cancelled", { reason: "Sold the house", visits: 2, passNumber: "TH-2027-0014" })).toBe("Season Pass TH-2027-0014 canceled, Sold the house")
    expect(words("pass.preference-changed", { visit: "turn-on", from: "recommended", to: "earlier" })).toBe("Spring turn-on timing changed from mid May to early May")
    expect(words("pass.inspection-added", { amount: 145 })).toBe("Mid-season inspection added, $145")
  })
  it("consent: the choice at the purchase, the choices noted at the card step, and a STOP reply", () => {
    expect(words("consent", { marketingOptIn: true, marketingChannels: ["sms", "email"], source: "checkout" })).toBe("Consent recorded, marketing texts and email on")
    expect(words("consent", { marketingOptIn: true, marketingChannels: ["email"], source: "admin" })).toBe("Consent recorded, marketing email on")
    expect(words("consent", { marketingOptIn: true, marketingChannels: ["sms"], source: "admin" })).toBe("Consent recorded, marketing texts on")
    expect(words("consent", { marketingOptIn: false, marketingChannels: [], source: "reply" })).toBe("Consent recorded, marketing off")
    expect(words("consent", { marketingOptIn: true, marketingChannels: ["email"], stage: "chosen" })).toBe("Marketing choices noted")
  })
  it("payment.succeeded, payment.failed (never the word failed), payment.refunded", () => {
    expect(words("payment.succeeded", { amount: 145, method: "venmo", name: "Spring turn-on" })).toBe("$145 paid by Venmo, Spring turn-on")
    expect(words("payment.succeeded", { amount: 145, method: "check", name: "Repair" })).toBe("$145 paid by check, Repair")
    expect(words("payment.succeeded", { amount: 145, method: "card_now" })).toBe("$145 paid by card")
    expect(words("payment.succeeded", { amount: 145, name: "Repair" })).toBe("$145 paid for Repair")
    expect(words("payment.succeeded", { amount: 1450, method: "card_on_file" })).toBe("$1,450 paid by card")
    expect(words("payment.failed", { amount: 145, message: "Your card was declined.", name: "Spring turn-on" })).toBe("$145 payment for Spring turn-on didn't go through")
    expect(words("payment.refunded", { amount: 145, method: "venmo", refunds: "ch_1" })).toBe("$145 refunded, Venmo")
  })
  it("invoice.sent, reminded, paid and canceled", () => {
    expect(words("invoice.sent", { number: "INV-2026-0001", total: 290, dueOn: "2026-12-01" })).toBe("Invoice INV-2026-0001 sent, due Dec 1")
    expect(words("invoice.reminded", { number: "INV-2026-0001", total: 290, dueOn: "2026-12-01" })).toBe("Reminder sent for invoice INV-2026-0001, due Dec 1")
    expect(words("invoice.paid", { number: "INV-2026-0001", total: 290, how: "card_now" })).toBe("Invoice INV-2026-0001 paid, card")
    expect(words("invoice.cancelled", { number: "INV-2026-0001", total: 290 })).toBe("Invoice INV-2026-0001 voided")
    expect(words("invoice.sent", {})).toBe("Invoice sent")
  })
  it("card.saved, card.failed, card.removed", () => {
    expect(words("card.saved", { brand: "visa", last4: "4242" })).toBe("Card saved, Visa ending 4242")
    expect(words("card.failed", { brand: "visa", last4: "4242" })).toBe("Visa ending 4242 didn't go through")
    expect(words("card.removed", { brand: "mastercard", last4: "4444" })).toBe("Card removed, Mastercard ending 4444")
    expect(words("card.saved", {})).toBe("Card saved, card")
  })
  it("customer.edited and property.edited name the fields, never the values", () => {
    expect(words("customer.edited", { changed: { firstName: { from: "A", to: "B" }, lastName: { from: "C", to: "D" }, email: { from: "a@x.com", to: "b@x.com" } } })).toBe("Customer details changed: name, email")
    expect(words("customer.edited", { created: true, changed: {} })).toBe("Customer added")
    expect(words("property.edited", { changed: { gateCode: { from: "1", to: "2" }, mustBeHome: { from: false, to: true } } })).toBe("Property details changed: gate code, must be home")
  })
  it("note is its text in full", () => {
    const text = "Gate sticks.\nLift the latch, then pull."
    expect(words("note", { text })).toBe(text)
  })
  it("job.line-added, job.line-edited, job.line-cancelled", () => {
    expect(words("job.line-added", { name: "Rotors, 12", quantity: 12, unitPrice: 38 })).toBe("Rotors, 12 added, 12 × $38")
    expect(words("job.line-added", { name: "Controller", quantity: 1, unitPrice: 300 })).toBe("Controller added, $300")
    expect(words("job.line-added", { name: "Drip zone", quantity: 1, unitPrice: 0 })).toBe("Drip zone added, quote later")
    expect(words("job.line-edited", { name: "Controller", quantity: 2, unitPrice: 250 })).toBe("Controller changed, 2 × $250")
    expect(words("job.line-cancelled", { name: "Drip zone" })).toBe("Drip zone canceled")
  })
  it("an unknown kind reads Something changed", () => {
    expect(words("widget.exploded", { anything: 1 })).toBe("Something changed")
  })
  it("covers every kind of the vocabulary with a sentence of its own", () => {
    for (const kind of EVENT_KINDS) expect(words(kind), kind).not.toBe("Something changed")
  })
  it("never says failed, declined, closed, an em dash or an exclamation mark", () => {
    const samples: [string, Record<string, unknown>][] = [
      ["payment.failed", { amount: 10, message: "declined" }], ["card.failed", { last4: "1" }], ["visit.done", { paidBy: "check" }],
      ["visit.not-done", { reason: "other" }], ["pass.cancelled", {}], ["consent", {}],
    ]
    for (const [kind, detail] of samples) expect(words(kind, detail)).not.toMatch(/failed|declined|closed|—|!/i)
  })
})

describe("eventWords: who", () => {
  it("is the person's first name, the customer, or Trailhead", () => {
    expect(eventWords({ kind: "note", detail: { text: "x" }, who: "ryan@example.com" }, "Ryan Garner").actor).toBe("Ryan")
    expect(eventWords({ kind: "note", detail: { text: "x" }, who: "ryan@example.com" }).actor).toBe("Ryan")
    expect(eventWords({ kind: "visit.moved", detail: {}, who: "customer" }).actor).toBe("the customer")
    expect(eventWords({ kind: "visit.scheduled", detail: {}, who: "system" }).actor).toBe("Trailhead")
    expect(whoWords("api")).toBe("Trailhead")
  })
  it("puts the actor and the sentence together as text", () => {
    expect(eventWords({ kind: "visit.skipped", detail: { name: "Fall blowout" }, who: "customer" }).text).toBe("the customer: Fall blowout skipped")
  })
})

describe("techEvent", () => {
  it("keeps notes, the sale, the pass and the visit", () => {
    for (const kind of ["note", "job.sold", "pass.cancelled", "pass.inspection-added", "visit.done", "visit.edited", "visit.cancelled"]) expect(techEvent({ kind, detail: {} }), kind).not.toBeNull()
  })
  it("drops money, card, consent, contact and unknown kinds", () => {
    for (const kind of ["payment.succeeded", "payment.failed", "payment.refunded", "invoice.sent", "invoice.paid", "card.saved", "card.failed", "consent", "customer.edited", "property.edited", "job.cancelled", "widget.exploded"])
      expect(techEvent({ kind, detail: {} }), kind).toBeNull()
  })
  it("strips amount, price, total, reference, gate, access and contact fields from the detail it keeps, and changes nothing else", () => {
    const event = { id: "e1", kind: "visit.edited", who: "ryan@example.com", detail: { name: "Spring turn-on", price: { from: 145, to: 160 }, amount: 145, total: 290, reference: "chk 1", gateCode: "1234", accessNote: true, contactPhone: "303", email: "a@x.com", phone: "303", durationMinutes: { from: 60, to: 90 } } }
    expect(techEvent(event)).toEqual({ id: "e1", kind: "visit.edited", who: "Trailhead", detail: { name: "Spring turn-on", durationMinutes: { from: 60, to: 90 } } })
    expect(event.detail.price).toBeDefined()
  })
  it("never lets an email through as who: the person's name when they have one, else Trailhead; the customer, system and api stay", () => {
    const base = { kind: "note", detail: { text: "x" } }
    expect(techEvent({ ...base, who: "ryan@example.com", whoName: "Ryan Garner" })).toMatchObject({ who: "Ryan Garner", whoName: "Ryan Garner" })
    expect(techEvent({ ...base, who: "ryan@example.com", whoName: null })).toMatchObject({ who: "Trailhead", whoName: null })
    for (const who of ["customer", "system", "api"]) expect(techEvent({ ...base, who })).toMatchObject({ who })
  })
})
