import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { quoteApprovedText, quoteDeclinedText, quoteLead, quoteReminderText, quoteSubject, quoteText } from "@/lib/portal/quote-words"
import { QuoteJobPage } from "./QuoteJobPage"
import { QUOTES_NOW, QUOTE_JOB_FIXTURES, canSend, depositOf, fixtureJob, jobFromRequest, liveQuote, nextNumber, stageOf } from "./quote-model"
import { createQuoteStore } from "./quote-store"
import { factsOf } from "./QuoteDialogs"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

describe("the deposit", () => {
  it("is empty by default", () => {
    expect(depositOf(1200, { mode: "none", value: "" })).toEqual({ amount: null, problem: "" })
  })
  it("takes whole dollars, more than zero and no more than the total", () => {
    expect(depositOf(1200, { mode: "dollars", value: "300" })).toEqual({ amount: 300, problem: "" })
    expect(depositOf(1200, { mode: "dollars", value: "1200" }).amount).toBe(1200)
    expect(depositOf(1200, { mode: "dollars", value: "1201" }).problem).toBe("A deposit cannot be more than the total, $1,200.")
    expect(depositOf(1200, { mode: "dollars", value: "0" }).problem).toBe("A deposit is more than $0.")
    expect(depositOf(1200, { mode: "dollars", value: "12.5" }).problem).toBe("Use whole dollars.")
    expect(depositOf(1200, { mode: "dollars", value: "abc" }).problem).toBe("Use numbers only.")
    expect(depositOf(1200, { mode: "dollars", value: "" }).problem).toBe("Type the deposit in dollars.")
  })
  it("freezes a percent as dollars and never goes above the total", () => {
    expect(depositOf(1200, { mode: "percent", value: "25" })).toEqual({ amount: 300, percent: 25, problem: "" })
    expect(depositOf(525, { mode: "percent", value: "25" }).amount).toBe(131)
    expect(depositOf(1200, { mode: "percent", value: "100" }).amount).toBe(1200)
    expect(depositOf(1200, { mode: "percent", value: "101" }).problem).toBe("A deposit cannot be more than 100% of the total.")
    expect(depositOf(1200, { mode: "percent", value: "0" }).problem).toBe("A deposit is more than 0%.")
  })
})

describe("a job and its quotes", () => {
  it("reads Needs a quote, Quote sent, Open and Canceled from the quotes", () => {
    const [dana, beth] = [fixtureJob("q-dana"), fixtureJob("q-beth")]
    expect(stageOf(dana)).toBe("needs-a-quote")
    expect(stageOf(beth)).toBe("quote-sent")
    beth.quotes[0]!.state = "approved"
    expect(stageOf(beth)).toBe("open")
    beth.quotes[0]!.state = "declined"
    expect(stageOf(beth)).toBe("canceled")
    beth.quotes[0]!.state = "replaced"
    expect(stageOf(beth)).toBe("needs-a-quote")
  })
  it("can send once a line has a price, and not before", () => {
    const dana = fixtureJob("q-dana")
    expect(canSend(dana)).toBe(false)
    dana.lines[0]!.amount = 380
    expect(canSend(dana)).toBe(true)
  })
  it("makes a job from a request with one unpriced line that holds the customer's words", () => {
    const j = jobFromRequest({ jobId: "q-x", requestId: "rq-x", customerId: "c", customer: "X Y", first: "X", phone: "", email: "", contact: "text", service: "Christmas lights", street: "1 A St", town: "Erie", words: "Roofline please.", at: QUOTES_NOW })
    expect(j.lines).toEqual([{ id: "l1", name: "Christmas lights", amount: 0, description: "Roofline please." }])
    expect(stageOf(j)).toBe("needs-a-quote")
  })
  it("numbers quotes one after another", () => {
    expect(nextNumber(QUOTE_JOB_FIXTURES)).toBe("Q-2026-0009")
  })
})

describe("the quote store", () => {
  const fresh = () => createQuoteStore()
  it("sends: freezes the lines and the deposit, and reads Quote sent", () => {
    const s = fresh()
    s.updateLine("q-dana", "d1", { amount: 400 })
    const n = s.send("q-dana", { via: "text", deposit: { amount: 100, percent: 25 }, at: QUOTES_NOW })
    const job = s.getSnapshot()["q-dana"]!
    expect(n).toBe("Q-2026-0009")
    expect(stageOf(job)).toBe("quote-sent")
    expect(liveQuote(job)).toMatchObject({ id: n, total: 400, deposit: { amount: 100, percent: 25 }, state: "sent" })
    // a later change of the job's lines does not change the frozen quote
    s.updateLine("q-dana", "d1", { amount: 999 })
    expect(liveQuote(s.getSnapshot()["q-dana"]!)!.total).toBe(400)
  })
  it("reminds, then revises: Replaced, and the job needs a quote again", () => {
    const s = fresh()
    s.remind("q-greg", { via: "text", at: QUOTES_NOW })
    expect(liveQuote(s.getSnapshot()["q-greg"]!)!.reminders).toHaveLength(2)
    s.revise("q-greg", QUOTES_NOW)
    const job = s.getSnapshot()["q-greg"]!
    expect(job.quotes[0]!.state).toBe("replaced")
    expect(stageOf(job)).toBe("needs-a-quote")
  })
  it("approves by hand with a deposit by check, and declines", () => {
    const s = fresh()
    s.approve("q-beth", { by: "Ryan", deposit: { how: "check", reference: "2210" }, at: QUOTES_NOW })
    const beth = s.getSnapshot()["q-beth"]!
    expect(stageOf(beth)).toBe("open")
    expect(liveQuote(beth)!.deposit!.paid).toMatchObject({ how: "check", reference: "2210" })
    s.decline("q-greg", QUOTES_NOW)
    expect(stageOf(s.getSnapshot()["q-greg"]!)).toBe("canceled")
  })
})

describe("the customer's words", () => {
  const f = factsOf(fixtureJob("q-beth"), "Q-2026-0007", 1200, 300)
  it("state the quote and the deposit and nothing else", () => {
    expect(quoteText(f)).toBe("Trailhead: Your quote for Christmas lights at 33 Aspen Ct is $1,200, and a $300 deposit is due when you approve. Approve or decline here: trailheadirrigation.com/quote/Q-2026-0007")
    expect(quoteSubject(f)).toBe("Quote: $1,200 for Christmas lights at 33 Aspen Ct")
    expect(quoteLead(factsOf(fixtureJob("q-greg"), "Q-2026-0008", 860))).toBe("Here is your quote for Larger sprinkler repair at 5 Birch Ln. The total is $860.")
  })
  it("never say job, line, stage, free, guarantee or a time", () => {
    const all = [quoteText(f), quoteReminderText(f), quoteApprovedText({ ...f, depositPaid: true }), quoteDeclinedText(f), quoteLead(f)].join(" ")
    for (const word of [/\bjob\b/i, /\bline\b/i, /\bstage\b/i, /\bfree\b/i, /guarantee/i, /within/i, /by tomorrow/i, /refund/i, /expire/i]) expect(all).not.toMatch(word)
  })
})

describe("the quote on the job page", () => {
  const stage = (id: string) => {
    const store = createQuoteStore()
    return { store, ...render(<QuoteJobPage store={store} jobId={id} now={QUOTES_NOW} />) }
  }
  it("has Send a quote off until a line has a price", () => {
    stage("q-dana")
    expect(screen.getByRole("button", { name: "Send a quote" })).toBeDisabled()
    expect(screen.getAllByText("Needs a quote").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Add a line" })).toBeInTheDocument()
  })
  it("sends with a dollar deposit and locks the lines", async () => {
    const store = createQuoteStore()
    store.updateLine("q-dana", "d1", { amount: 500 })
    render(<QuoteJobPage store={store} jobId="q-dana" now={QUOTES_NOW} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("radio", { name: "Dollars" }))
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Deposit in dollars" }), { target: { value: "600" } })
    expect(within(dialog).getByText("A deposit cannot be more than the total, $500.")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Send the quote" })).toBeDisabled()
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Deposit in dollars" }), { target: { value: "125" } })
    expect(within(dialog).getByText(/Dana pays the \$125 deposit when approving/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send the quote" }))
    expect(await screen.findByText(/Locked while quote Q-2026-0009 is out/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send a quote reminder" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add a line" })).toBeNull()
  })
  it("sends without notifying from the caret", async () => {
    const store = createQuoteStore()
    store.updateLine("q-dana", "d1", { amount: 500 })
    render(<QuoteJobPage store={store} jobId="q-dana" now={QUOTES_NOW} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Send quote Q-2026-0009 for \$500 to Dana by text at \(970\) 555-0171/)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "More ways" })).toBeInTheDocument()
  })
  it("shows a sent quote with its deposit, the reminders and the lock", () => {
    stage("q-beth")
    expect(screen.getAllByText("Sent").length).toBeGreaterThan(0)
    expect(screen.getByText("$300 (25%), due when Beth approves")).toBeInTheDocument()
    expect(screen.getByText("Waiting for Beth")).toBeInTheDocument()
    expect(screen.getByText("None sent")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mark approved" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Revise" })).toBeInTheDocument()
  })
  it("marks approved by hand: a deposit needs a way to be paid", async () => {
    stage("q-beth")
    fireEvent.click(screen.getByRole("button", { name: "Mark approved" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("button", { name: "Mark approved and tell Beth" })).toBeDisabled()
    fireEvent.change(within(dialog).getByRole("combobox", { name: "How was the $300 deposit paid?" }), { target: { value: "check" } })
    expect(within(dialog).getByText(/Beth gets a receipt for the \$300 by email/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Check number (optional)" }), { target: { value: "2210" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark approved and tell Beth" }))
    expect((await screen.findAllByText(/Check #2210/)).length).toBeGreaterThan(0)
    expect(screen.getByText("The invoice will show the $300 deposit as already paid.")).toBeInTheDocument()
    expect(screen.getAllByText("$900").length).toBeGreaterThan(0)
  })
  it("blocks Cancel job while the deposit is paid, until Ryan refunds it himself", async () => {
    const store = createQuoteStore()
    store.approve("q-beth", { by: "customer", deposit: { how: "card" }, at: QUOTES_NOW })
    render(<QuoteJobPage store={store} jobId="q-beth" now={QUOTES_NOW} />)
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel job" }))
    expect(within(screen.getByRole("dialog")).getByText("This job has a payment. Refund it first.")).toBeInTheDocument()
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Cancel job" })).toBeNull()
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep it" })).toBeInTheDocument()
  })
})
