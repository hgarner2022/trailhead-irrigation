import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { priceChangeLead, priceChangeSubject, priceChangeText, quoteApprovedText, quoteDeclinedText, quoteLead, quoteReminderText, quoteSubject, quoteText } from "@/lib/portal/quote-words"
import { approvedTotal, currentTotal, isApproved, untoldChange } from "./price-change"
import { finalInvoiceOf } from "./price-change-invoice"
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
  const from = (o: Partial<Parameters<typeof jobFromRequest>[0]>) => jobFromRequest({ jobId: "q-x", requestId: "rq-x", customerId: "c", customer: "X Y", first: "X", phone: "", email: "", contact: "text", service: "Christmas lights", street: "1 A St", town: "Erie", words: "Roofline please.", receivedAt: "2026-11-18T16:00:00Z", at: QUOTES_NOW, quote: false, ...o })
  it("makes a job from a request: its words are the first note and the history says where it came from", () => {
    const j = from({})
    expect(j.history[0]).toMatchObject({ actor: "X", note: "Roofline please." })
    expect(j.history[1]!.what).toMatch(/^Created from a request on Nov \d+$/)
    expect(JSON.stringify(j)).not.toMatch(/ccept/)
  })
  it("reads Needs a quote when the service has no price, and Unscheduled when Create job is on a priced one", () => {
    expect(stageOf(from({}))).toBe("needs-a-quote")
    const priced = from({ service: "Sprinkler repair", price: 145 })
    expect(priced.lines).toEqual([{ id: "l1", name: "Sprinkler repair", amount: 145 }])
    expect(stageOf(priced)).toBe("open")
    expect(canSend(priced)).toBe(false)
  })
  it("Send a quote on a priced service leaves the job in Needs a quote, ready to send", () => {
    const j = from({ service: "Sprinkler repair", price: 145, quote: true })
    expect(stageOf(j)).toBe("needs-a-quote")
    expect(canSend(j)).toBe(true)
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

describe("a price change after the customer approved (Hannah, Nov 20 2026)", () => {
  const approved = (deposit = true) => {
    const store = createQuoteStore()
    store.approve("q-beth", { by: "customer", ...(deposit ? { deposit: { how: "card" as const } } : {}), at: QUOTES_NOW })
    return store
  }

  it("changes the total with the lines once approved, and writes the history line with who and when", () => {
    const s = approved()
    expect(currentTotal(s.getSnapshot()["q-beth"]!)).toBe(1200)
    const moved = s.updateLine("q-beth", "b1", { amount: 1200 }, "2026-11-18T18:20:00Z")
    expect(moved).toEqual({ from: 1200, to: 1500 })
    const job = s.getSnapshot()["q-beth"]!
    expect(currentTotal(job)).toBe(1500)
    // the approved quote itself is not rewritten: there is no second approval and no change-order quote
    expect(liveQuote(job)).toMatchObject({ total: 1200, state: "approved" })
    expect(job.quotes).toHaveLength(1)
    expect(job.history[job.history.length - 1]).toMatchObject({ at: "2026-11-18T18:20:00Z", actor: "Ryan", what: "Price changed from $1,200 to $1,500", kind: "price-changed" })
    expect(approvedTotal(job)).toBe(1200)
  })

  it("adds a line and cancels a line: a canceled line is out of the total and stays on the job", () => {
    const s = approved()
    expect(s.addLine("q-beth", { name: "Shrub wrap", amount: 200 })).toEqual({ from: 1200, to: 1400 })
    expect(s.cancelLine("q-beth", "b2")).toEqual({ from: 1200, to: 1100 })
    const job = s.getSnapshot()["q-beth"]!
    expect(job.lines.find((l) => l.id === "b2")).toMatchObject({ canceled: true })
    expect(currentTotal(job)).toBe(1100)
    expect(job.history.filter((h) => h.kind === "price-changed").map((h) => h.what)).toEqual(["Price changed from $1,200 to $1,400", "Price changed from $1,400 to $1,100"])
  })

  it("records nothing when the total does not move, and nothing before approval or while a quote is out", () => {
    const s = approved()
    expect(s.updateLine("q-beth", "b1", { name: "Roofline" })).toBeNull()
    expect(s.getSnapshot()["q-beth"]!.history.some((h) => h.kind === "price-changed")).toBe(false)
    const out = createQuoteStore()
    expect(out.updateLine("q-beth", "b1", { amount: 1000 })).toBeNull()
    expect(out.getSnapshot()["q-beth"]!.history.some((h) => h.kind === "price-changed")).toBe(false)
    expect(isApproved(out.getSnapshot()["q-beth"]!)).toBe(false)
  })

  it("remembers what the customer has not been told, from the last telling, and ends it when told or kept quiet", () => {
    const s = approved()
    s.updateLine("q-beth", "b1", { amount: 1200 })
    s.updateLine("q-beth", "b2", { amount: 100 })
    expect(untoldChange(s.getSnapshot()["q-beth"]!)).toEqual({ from: 1200, to: 1300 })
    s.tellPrice("q-beth", { via: "email", at: QUOTES_NOW })
    expect(untoldChange(s.getSnapshot()["q-beth"]!)).toBeNull()
    expect(s.getSnapshot()["q-beth"]!.history.at(-1)!.what).toBe("Told Beth the new total, $1,300, by email")
    s.updateLine("q-beth", "b2", { amount: 300 })
    s.tellPrice("q-beth", { via: "none", at: QUOTES_NOW })
    expect(s.getSnapshot()["q-beth"]!.history.at(-1)!.what).toBe("Kept the new total, $1,500, without notifying Beth")
    expect(untoldChange(s.getSnapshot()["q-beth"]!)).toBeNull()
  })

  it("says nothing when the total comes back to what it was", () => {
    const s = approved()
    s.updateLine("q-beth", "b1", { amount: 1200 })
    s.updateLine("q-beth", "b1", { amount: 900 })
    expect(untoldChange(s.getSnapshot()["q-beth"]!)).toBeNull()
  })

  it("the words to the customer are the job, the street and the two totals, and nothing else", () => {
    const f = { service: "Christmas lights", address: "33 Aspen Ct", total: "$1,500", was: "$1,200" }
    expect(priceChangeText(f)).toBe("Trailhead: The total for your Christmas lights at 33 Aspen Ct changed from $1,200 to $1,500.")
    expect(priceChangeSubject(f)).toBe("New total: $1,500 for Christmas lights at 33 Aspen Ct")
    expect(priceChangeLead(f)).toBe("The total for your Christmas lights at 33 Aspen Ct changed from $1,200 to $1,500.")
    const all = [priceChangeText(f), priceChangeSubject(f), priceChangeLead(f)].join(" ")
    for (const word of [/\bfree\b/i, /guarantee/i, /sorry/i, /approve/i, /within/i, /refund/i, /because/i, /\bhttp|trailheadirrigation/i]) expect(all).not.toMatch(word)
  })

  it("opens Tell the customer when a saved price moves the total, with the channel from the contact preference", async () => {
    const store = approved()
    render(<QuoteJobPage store={store} jobId="q-beth" now={QUOTES_NOW} />)
    expect(screen.getByRole("button", { name: "Edit Roofline lights" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Edit Roofline lights" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Price in dollars" }), { target: { value: "1200" } })
    fireEvent.click(screen.getByRole("button", { name: "Save the line" }))
    const dialog = await screen.findByRole("dialog", { name: "Tell Beth the new total" })
    expect(within(dialog).getByText(/The total for Christmas lights at 33 Aspen Ct is now \$1,500\. It was \$1,200\. Tell Beth by email at beth\.orr@example\.com\./)).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "Email" })).toBeChecked()
    expect(within(dialog).getByText("New total: $1,500 for Christmas lights at 33 Aspen Ct")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "More ways" })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Tell Beth" }))
    expect(await screen.findByText("Price changed from $1,200 to $1,500")).toBeInTheDocument()
    expect(screen.getByText(/The invoice will show the new total, \$1,500 and the \$300 deposit as already paid\./)).toBeInTheDocument()
    expect(screen.getByText("$1,200 unpaid.")).toBeInTheDocument()
  })

  it("keeps the lines locked while the quote is out and waiting", () => {
    render(<QuoteJobPage store={createQuoteStore()} jobId="q-beth" now={QUOTES_NOW} />)
    expect(screen.getByText(/Locked while quote Q-2026-0007 is out/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit Roofline lights" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add a line" })).toBeNull()
  })

  it("the final invoice shows the new total on its lines, with the deposit credited", () => {
    const s = approved()
    s.updateLine("q-beth", "b1", { amount: 1200 })
    s.cancelLine("q-beth", "b2")
    const inv = finalInvoiceOf(s.getSnapshot()["q-beth"]!, { number: "INV-2026-0045", sentOn: "2026-11-24", dueOn: "2026-12-08" })
    expect(inv.lines.map((l) => [l.name, l.amount])).toEqual([["Roofline lights", "$1,200"]])
    expect(inv.totals).toEqual([["Subtotal", "$1,200"], ["Tax", "$0"], ["Total", "$1,200", "strong"], ["Deposit paid Nov 18", "-$300"], ["Paid", "$0"], ["Unpaid", "$900", "alert"]])
    expect(inv.amount).toBe("$900")
  })
})
