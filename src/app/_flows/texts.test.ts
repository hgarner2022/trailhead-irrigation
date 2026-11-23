import { describe, expect, it } from "vitest"
import { receiptText } from "./walkthrough/receipt-data"
import { allMessages, bookingMessages, DEFAULT_FACTS } from "./walkthrough/walk-texts"
import { canceled, dateMoved, dateSet, invoice, onMyWay } from "./flow-texts"

// Hannah, Nov 22 2026: "Reply STOP to opt out. Do we need to include that in every message?" No. The rule is `isFirstText` (src/lib/messaging/saved.ts): the line ends the first text a number ever gets
// and no later one. The prototypes' threads are one number's texts in order, so only the first text in a thread carries it.
const STOP = "Reply STOP to opt out."
const texts = (ts: { channel: string; body: string }[]) => ts.filter((t) => t.channel === "text")

describe("Reply STOP to opt out. only on the first text of a thread", () => {
  it("the customer walkthrough's phone thread: the day set carries it, every later text leaves it off", () => {
    const thread = texts(allMessages(DEFAULT_FACTS, "text"))
    expect(thread.length).toBeGreaterThan(3)
    expect(thread[0]!.body.endsWith(STOP)).toBe(true)
    for (const t of thread.slice(1)) expect(t.body, t.body).not.toContain("STOP")
  })

  it("the booking's own date-set message is the first text", () => {
    expect(texts(bookingMessages(DEFAULT_FACTS, "text"))[0]!.body.endsWith(STOP)).toBe(true)
  })

  it("the account flow's texts: the date set first, then a move, on my way, the cancel and the invoice with none", () => {
    expect(dateSet("2027-04-28", "10:30").body.endsWith(STOP)).toBe(true)
    for (const t of [dateMoved("2027-04-29", "10:30", "m"), onMyWay("2027-04-28", "10:30", "w"), canceled("2027-04-28", "c"), invoice("i")]) expect(t.body, t.body).not.toContain("STOP")
  })

  it("the receipt text, which is never a number's first", () => {
    expect(receiptText("card")).not.toContain("STOP")
    expect(receiptText("refund")).not.toContain("STOP")
  })

  it("an email never carries the line", () => {
    for (const e of allMessages(DEFAULT_FACTS, "both").filter((t) => t.channel === "email")) expect(e.body).not.toContain("STOP")
  })
})
