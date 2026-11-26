import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { priceChangeLead, priceChangeSubject, priceChangeText, quoteApprovedText, quoteDeclinedText, quoteLead, quoteReminderText, quoteSubject, quoteText } from "@/lib/portal/quote-words"
import { ApprovedJobPage } from "./ApprovedJobPage"
import { approvedTotal, currentTotal, isApproved, untoldChange } from "./price-change"
import { finalInvoiceOf } from "./price-change-invoice"
import { QuotePage } from "./QuotePage"
import { DESIGN_VISIT_QUOTE, fixtureQuote, quoteByHand, quoteFromRequest } from "./quote-fixtures"
import { QUOTES_NOW, STAGE_PILL, canArchive, canChangeService, canSend, depositOf, jobIdOf, linesTotal, nextNumber, quoteTotal } from "./quote-model"
import { createQuoteStore } from "./quote-store"
import { factsOf } from "./QuoteDialogs"

const DANA = "Q-2026-0004"
const BETH = "Q-2026-0007"
const GREG = "Q-2026-0008"
const linesTotalOf = (store: ReturnType<typeof createQuoteStore>) => linesTotal(store.getSnapshot().quotes[DANA]!.lines)

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

describe("a quote is its own record (Hannah, Nov 22 2026)", () => {
  it("reads Draft, Sent, Approved, Declined, Replaced and Archived from its facts", () => {
    const s = createQuoteStore()
    const state = (id: string) => s.getSnapshot().quotes[id]!.state
    expect([state(DANA), state(BETH), state("Q-2026-0005"), state("Q-2026-0006"), state("Q-2026-0002")]).toEqual(["draft", "sent", "approved", "declined", "replaced"])
    s.archive(DANA, "No answer", QUOTES_NOW)
    expect(state(DANA)).toBe("archived")
    expect(s.getSnapshot().quotes[DANA]!.archived).toEqual({ reason: "No answer", on: QUOTES_NOW })
  })
  it("can send once a line has a price, and not before", () => {
    const dana = fixtureQuote(DANA)
    expect(canSend(dana)).toBe(false)
    dana.lines[0]!.amount = 380
    expect(canSend(dana)).toBe(true)
    expect(canSend(fixtureQuote(BETH))).toBe(false)
  })
  it("makes a quote from a request, a Draft: the customer's words are the first note and the history says where it came from; no job exists", () => {
    const q = quoteFromRequest({ id: "Q-2026-0009", requestId: "rq-x", customerId: "c", customer: "X Y", first: "X", phone: "", email: "", contact: "text", service: "Christmas lights", street: "1 A St", town: "Erie", words: "Roofline please.", receivedAt: "2026-11-18T16:00:00Z", at: QUOTES_NOW })
    expect(q.state).toBe("draft")
    expect(q.history[0]).toMatchObject({ actor: "X", note: "Roofline please." })
    expect(q.history[1]!.what).toMatch(/^Created from a request on Nov \d+$/)
    expect(q.lines).toEqual([{ id: "l1", name: "Christmas lights", amount: 0 }])
    expect(q.jobId).toBeUndefined()
    expect(JSON.stringify(q)).not.toMatch(/ccept/)
  })
  it("makes a quote by hand with no request: the catalogue price is on the line", () => {
    const q = quoteByHand({ id: "Q-2026-0009", customerId: "andrea", customer: "Andrea Dalton", first: "Andrea", phone: "", email: "", contact: "text", service: "Sprinkler repair", street: "480 Briggs St", town: "Erie", at: QUOTES_NOW, price: 145 })
    expect(q).toMatchObject({ state: "draft", lines: [{ name: "Sprinkler repair", amount: 145 }] })
    expect(q.requestId).toBeUndefined()
    expect(canSend(q)).toBe(true)
  })
  it("numbers quotes one after another", () => {
    const s = createQuoteStore()
    expect(nextNumber(Object.values(s.getSnapshot().quotes))).toBe("Q-2026-0009")
    const a = s.createByHand({ customerId: "andrea", customer: "Andrea Dalton", first: "Andrea", phone: "", email: "", contact: "text", service: "Sprinkler repair", street: "480 Briggs St", town: "Erie", at: QUOTES_NOW, price: 145 })
    const b = s.createFromRequest({ requestId: "rq-x", customerId: "c", customer: "X Y", first: "X", phone: "", email: "", contact: "text", service: "Christmas lights", street: "1 A St", town: "Erie", words: "", receivedAt: QUOTES_NOW, at: QUOTES_NOW })
    expect([a, b]).toEqual(["Q-2026-0009", "Q-2026-0010"])
    expect(Object.keys(s.getSnapshot().jobs)).toEqual(["qj-0005"])
  })
  it("a Draft that came from a design visit or a revision cannot change service; an ordinary Draft can", () => {
    expect(canChangeService(fixtureQuote(DANA))).toBe(true)
    expect(canChangeService(DESIGN_VISIT_QUOTE)).toBe(false)
    expect(canChangeService(fixtureQuote("Q-2026-0003"))).toBe(false)
    expect(canChangeService(fixtureQuote(BETH))).toBe(false)
  })
})

describe("the quote store", () => {
  const fresh = () => createQuoteStore()
  it("sends: freezes the lines and the deposit, and reads Sent; a later change of the Draft's lines is refused", () => {
    const s = fresh()
    s.updateLine(DANA, "d1", { amount: 400 })
    s.send(DANA, { via: "text", deposit: { amount: 100, percent: 25 }, at: QUOTES_NOW })
    const q = s.getSnapshot().quotes[DANA]!
    expect(q).toMatchObject({ state: "sent", total: 400, deposit: { amount: 100, percent: 25 }, sentVia: "text" })
    expect(q.history.at(-1)!.what).toBe(`Sent quote ${DANA} by text`)
    // the lines are locked: a later edit changes nothing in the frozen quote
    s.updateLine(DANA, "d1", { amount: 999 })
    s.addLine(DANA, { name: "Extra", amount: 10 })
    expect(s.getSnapshot().quotes[DANA]!.total).toBe(400)
    expect(s.getSnapshot().quotes[DANA]!.lines).toHaveLength(1)
    expect(Object.keys(s.getSnapshot().jobs)).toEqual(["qj-0005"])
  })
  it("reminds, then revises: the quote is Replaced and the revision is its own Draft with the same lines", () => {
    const s = fresh()
    s.remind(GREG, { via: "text", at: QUOTES_NOW })
    expect(s.getSnapshot().quotes[GREG]!.reminders).toHaveLength(2)
    const next = s.revise(GREG, QUOTES_NOW)
    const { quotes } = s.getSnapshot()
    expect(next).toBe("Q-2026-0009")
    expect(quotes[GREG]).toMatchObject({ state: "replaced", replacedBy: next })
    expect(quotes[next]).toMatchObject({ state: "draft", replaces: GREG, total: 0 })
    expect(quotes[next]!.lines.map((l) => l.name)).toEqual(quotes[GREG]!.lines.map((l) => l.name))
    // changing the revision never changes the replaced quote
    s.updateLine(next, "g1", { amount: 1 })
    expect(s.getSnapshot().quotes[GREG]!.lines[0]!.amount).toBe(145)
    expect(canSend(s.getSnapshot().quotes[next]!)).toBe(true)
  })
  it("approves: THE moment a job is made, with the frozen lines copied once, no day, the sold day and the deposit payment on the job", () => {
    const s = fresh()
    expect(s.getSnapshot().jobs["qj-0007"]).toBeUndefined()
    const jobId = s.approve(BETH, { by: "Ryan", deposit: { how: "check", reference: "2210" }, at: QUOTES_NOW })
    expect(jobId).toBe("qj-0007")
    expect(jobIdOf(BETH)).toBe(jobId)
    const { quotes, jobs } = s.getSnapshot()
    const q = quotes[BETH]!
    const job = jobs[jobId!]!
    expect(q).toMatchObject({ state: "approved", decidedBy: "Ryan", jobId })
    expect(q.deposit!.paid).toMatchObject({ how: "check", reference: "2210" })
    expect(job).toMatchObject({ quoteId: BETH, customer: "Beth Orr", soldOn: QUOTES_NOW, approvedTotal: 1200, deposit: { amount: 300, paid: { how: "check", reference: "2210" } } })
    expect(job.lines).toEqual(q.lines)
    expect(job.lines).not.toBe(q.lines)
    expect(JSON.stringify(job)).not.toMatch(/scheduledOn|"day"/)
    expect(job.history[0]!.what).toBe(`Created from quote ${BETH}`)
    expect(q.history.at(-1)!.what).toBe(`Job created from quote ${BETH}`)
    // a quote that is not Sent cannot be approved, and a second approval makes no second job
    expect(s.approve(BETH, { by: "Ryan", at: QUOTES_NOW })).toBeNull()
    expect(s.approve(DANA, { by: "Ryan", at: QUOTES_NOW })).toBeNull()
    expect(Object.keys(s.getSnapshot().jobs).sort()).toEqual(["qj-0005", "qj-0007"])
  })
  it("declines: the quote is Declined and no job is ever made", () => {
    const s = fresh()
    s.decline(GREG, QUOTES_NOW)
    expect(s.getSnapshot().quotes[GREG]).toMatchObject({ state: "declined", decidedBy: "customer" })
    expect(s.getSnapshot().jobs).not.toHaveProperty("qj-0008")
    expect(s.approve(GREG, { by: "Ryan", at: QUOTES_NOW })).toBeNull()
  })
  it("archives a Draft, a Sent or a Declined quote with a reason, and nothing else; an archived quote creates no job", () => {
    const s = fresh()
    s.archive(BETH, "Duplicate", QUOTES_NOW)
    expect(s.getSnapshot().quotes[BETH]).toMatchObject({ state: "archived", archived: { reason: "Duplicate", on: QUOTES_NOW } })
    expect(s.getSnapshot().quotes[BETH]!.history.at(-1)!.what).toBe(`Archived quote ${BETH}: Duplicate`)
    s.archive("Q-2026-0005", "Not a fit", QUOTES_NOW)
    s.archive("Q-2026-0002", "Not a fit", QUOTES_NOW)
    expect(s.getSnapshot().quotes["Q-2026-0005"]!.state).toBe("approved")
    expect(s.getSnapshot().quotes["Q-2026-0002"]!.state).toBe("replaced")
    expect([DANA, BETH, "Q-2026-0006", "Q-2026-0005", "Q-2026-0002"].map((id) => canArchive(fixtureQuote(id)))).toEqual([true, true, true, false, false])
    expect(s.approve(BETH, { by: "Ryan", at: QUOTES_NOW })).toBeNull()
  })
  it("the job's stage is Unscheduled or Canceled and never has a quote state", () => {
    expect(Object.values(STAGE_PILL).map((p) => p.label)).toEqual(["Unscheduled", "Canceled"])
  })
})

describe("the customer's words", () => {
  const f = factsOf(fixtureQuote(BETH), BETH, 1200, 300)
  it("state the quote and the deposit and nothing else", () => {
    expect(quoteText(f)).toBe("Trailhead: Your quote for Christmas lights at 33 Aspen Ct is $1,200, and a $300 deposit is due when you approve. Approve or decline here: trailheadirrigation.com/quote/Q-2026-0007")
    expect(quoteSubject(f)).toBe("Quote: $1,200 for Christmas lights at 33 Aspen Ct")
    expect(quoteLead(factsOf(fixtureQuote(GREG), GREG, 860))).toBe("Here is your quote for Larger sprinkler repair at 5 Birch Ln. The total is $860.")
  })
  it("never say job, line, stage, free, guarantee or a time", () => {
    const all = [quoteText(f), quoteReminderText(f), quoteApprovedText({ ...f, depositPaid: true }), quoteDeclinedText(f), quoteLead(f)].join(" ")
    for (const word of [/\bjob\b/i, /\bline\b/i, /\bstage\b/i, /\bfree\b/i, /guarantee/i, /within/i, /by tomorrow/i, /refund/i, /expire/i]) expect(all).not.toMatch(word)
  })
})

describe("the quote's own page", () => {
  const stage = (id: string, store = createQuoteStore()) => ({ store, ...render(<QuotePage store={store} quoteId={id} now={QUOTES_NOW} />) })
  const sendButtons = () => screen.getAllByRole("button", { name: "Send a quote" })
  it("is built like the invoice page: the number as the title with its pill, the customer linked once in the Customer card, no Property card, the crumb back to Quotes", () => {
    stage(BETH)
    expect(screen.getByRole("heading", { level: 1, name: BETH })).toBeInTheDocument()
    expect(screen.getAllByText("Sent").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: /Quotes/ })).toHaveAttribute("href", "/admin/quotes")
    expect(screen.getAllByRole("link", { name: /Beth Orr/ })).toHaveLength(1)
    expect(document.querySelectorAll("a[href^='/admin/customers']")).toHaveLength(1)
    expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).queryByRole("link")).toBeNull()
    expect(screen.queryByText("Property")).toBeNull()
    // each fact once: one status pill (the header's), and the band holds Total, Deposit, Sent and Decision
    expect(screen.getAllByText("Sent", { selector: "[data-slot=status-pill]" })).toHaveLength(1)
    const band = document.querySelector("[data-slot=summary-band]") as HTMLElement
    for (const label of ["Total", "Deposit", "Sent", "Decision"]) expect(within(band).getByText(label)).toBeInTheDocument()
    expect(band.querySelectorAll("a")).toHaveLength(0)
    expect(screen.getByText("Notes and history")).toBeInTheDocument()
  })
  it("changes the service on a Draft: the service line is replaced, the notes and other lines stay, and the history says so", async () => {
    const store = createQuoteStore()
    store.addLine(DANA, { name: "Zone 3 line", amount: 90 })
    render(<QuotePage store={store} quoteId={DANA} now={QUOTES_NOW} />)
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Change service" }))
    const dialog = screen.getByRole("dialog")
    // the picker starts on the quote's own service, so nothing can be confirmed until another is chosen
    expect(within(dialog).getByRole("combobox", { name: "What is this for?" })).toHaveValue("big-repair")
    expect(within(dialog).getByRole("button", { name: "Change service" })).toBeDisabled()
    expect(within(dialog).getByText("This is the current service.")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole("combobox", { name: "What is this for?" }), { target: { value: "repair" } })
    expect(within(dialog).getByText(/Change the service from Larger sprinkler repair to Sprinkler repair\. .* Nothing is sent to Dana\./)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Change service" }))
    const quote = store.getSnapshot().quotes[DANA]!
    expect(quote.service).toBe("Sprinkler repair")
    expect(quote.lines.map((l) => [l.name, l.amount])).toEqual([["Sprinkler repair", 145], ["Zone 3 line", 90]])
    expect(quote.history.at(-1)!.what).toBe("Service changed from Larger sprinkler repair to Sprinkler repair")
    // the customer's words, the first note, are untouched
    expect(quote.history[0]!.note).toMatch(/Zone 3 has a geyser/)
    expect(await screen.findByRole("textbox", { name: "Price for Sprinkler repair" })).toHaveValue("145")
  })
  it("Something else changes the service to the name Ryan types, with no price", () => {
    const s = createQuoteStore()
    s.updateLine(DANA, "d1", { amount: 380 })
    s.changeService(DANA, { name: "Drip line for the garden", at: QUOTES_NOW })
    expect(s.getSnapshot().quotes[DANA]!.lines).toEqual([{ id: "d1", name: "Drip line for the garden", amount: 0 }])
  })
  it("has no Change service once the quote is out", async () => {
    stage(BETH)
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    expect(screen.queryByRole("menuitem", { name: "Change service" })).toBeNull()
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeInTheDocument()
  })
  it("leads with one Quote card: the steps, what they asked, the one service line with an empty price box, and Send a quote off with one line saying what is missing", () => {
    stage(DANA)
    expect(sendButtons()).toHaveLength(2)
    for (const b of sendButtons()) expect(b).toBeDisabled()
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0)
    expect(screen.queryByText("Needs a quote")).toBeNull()
    expect(screen.getByRole("list", { name: "Steps" })).toHaveTextContent("1 Price2 Send3 They approve")
    // the customer's words are shown once in the card and are never a line
    expect(screen.getAllByText(/Zone 3 has a geyser/)).toHaveLength(2) // the card and the first note in Notes and history
    expect(screen.getByRole("textbox", { name: "Price for Larger sprinkler repair" })).toHaveValue("")
    expect(screen.getAllByText("Add a price to a line to send.")).toHaveLength(1)
    // the band holds the quote's own facts, no tile repeats the card, and there is no job yet
    expect(screen.getByText("From a request")).toBeInTheDocument()
    expect(screen.queryByText("Not sent yet")).toBeNull()
    expect(document.querySelector("[data-slot=job-created]")).toBeNull()
    expect(screen.getByRole("button", { name: "Add a line" })).toBeInTheDocument()
  })
  it("prices a line by typing in its row, and the total, the step and the button follow", () => {
    stage(DANA)
    fireEvent.change(screen.getByRole("textbox", { name: "Price for Larger sprinkler repair" }), { target: { value: "380" } })
    for (const b of sendButtons()) expect(b).toBeEnabled()
    expect(screen.queryByText("Add a price to a line to send.")).toBeNull()
    expect(screen.getAllByText("$380").length).toBeGreaterThan(0)
    expect(screen.getByText(/2 Send/)).toHaveAttribute("aria-current", "step")
  })
  it("cancels a line struck through and out of the total, and restores it", () => {
    const store = createQuoteStore()
    store.updateLine(DANA, "d1", { amount: 380 })
    store.addLine(DANA, { name: "Extra", amount: 100 })
    render(<QuotePage store={store} quoteId={DANA} now={QUOTES_NOW} />)
    fireEvent.click(screen.getByRole("button", { name: "Cancel Extra" }))
    expect(screen.getByText("Extra").className).toMatch(/line-through/)
    expect(linesTotalOf(store)).toBe(380)
    fireEvent.click(screen.getByRole("button", { name: "Restore Extra" }))
    expect(linesTotalOf(store)).toBe(480)
  })
  it("shows a quantity only when it is more than one, and totals price times quantity", () => {
    const store = createQuoteStore()
    store.updateLine(DANA, "d1", { amount: 20, quantity: 3 })
    render(<QuotePage store={store} quoteId={DANA} now={QUOTES_NOW} />)
    expect(screen.getByText("3 ×")).toBeInTheDocument()
    expect(linesTotalOf(store)).toBe(60)
  })
  it("sets the deposit in the card, never above the total, and says what is wrong in the one line beside Send a quote", () => {
    const store = createQuoteStore()
    store.updateLine(DANA, "d1", { amount: 500 })
    render(<QuotePage store={store} quoteId={DANA} now={QUOTES_NOW} />)
    expect(screen.queryByRole("textbox", { name: "Deposit in dollars" })).toBeNull()
    fireEvent.click(screen.getByRole("radio", { name: "Dollars" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Deposit in dollars" }), { target: { value: "600" } })
    expect(screen.getAllByText("A deposit cannot be more than the total, $500.")).toHaveLength(1)
    for (const b of sendButtons()) expect(b).toBeDisabled()
    fireEvent.change(screen.getByRole("textbox", { name: "Deposit in dollars" }), { target: { value: "125" } })
    expect(screen.getByText(/\$125 of \$500/)).toBeInTheDocument()
    for (const b of sendButtons()) expect(b).toBeEnabled()
    fireEvent.click(screen.getByRole("radio", { name: "Percent" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Deposit as a percent of the total" }), { target: { value: "25" } })
    expect(screen.getByText(/\$125 of \$500/)).toBeInTheDocument()
  })
  it("sends with the deposit set in the card and locks the lines; no job appears", async () => {
    const store = createQuoteStore()
    store.updateLine(DANA, "d1", { amount: 500 })
    store.setDeposit(DANA, { mode: "dollars", value: "125" })
    render(<QuotePage store={store} quoteId={DANA} now={QUOTES_NOW} />)
    fireEvent.click(sendButtons()[0]!)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).queryByRole("radio", { name: "Dollars" })).toBeNull()
    expect(within(dialog).getByText(/Dana pays the \$125 deposit when approving/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Send quote Q-2026-0004 for \$500 to Dana by text at \(970\) 555-0171/)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "More ways" })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send the quote" }))
    expect(await screen.findByText(/Locked while quote Q-2026-0004 is out/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send a quote reminder" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add a line" })).toBeNull()
    expect(store.getSnapshot().quotes[DANA]).toMatchObject({ total: 500, deposit: { amount: 125 } })
    expect(store.getSnapshot().quotes[DANA]!.depositDraft).toBeUndefined()
    expect(document.querySelector("[data-slot=job-created]")).toBeNull()
  })
  it("keeps a canceled line out of the quote it freezes", () => {
    const s = createQuoteStore()
    s.updateLine(DANA, "d1", { amount: 380 })
    s.addLine(DANA, { name: "Extra", amount: 100 })
    s.updateLine(DANA, s.getSnapshot().quotes[DANA]!.lines[1]!.id, { canceled: true })
    s.send(DANA, { via: "text", deposit: null, at: QUOTES_NOW })
    const q = s.getSnapshot().quotes[DANA]!
    expect(q.total).toBe(380)
    expect(q.lines.map((l) => l.name)).toEqual(["Larger sprinkler repair"])
  })
  it("a revision opens as a Draft with the replaced quote's deposit where the next one starts, and lists the quote it replaces", () => {
    const s = createQuoteStore()
    const next = s.revise(BETH, QUOTES_NOW)
    expect(s.getSnapshot().quotes[next]!.depositDraft).toEqual({ mode: "percent", value: "25" })
    render(<QuotePage store={s} quoteId={next} now={QUOTES_NOW} />)
    expect(screen.getByRole("list", { name: "Steps" })).toBeInTheDocument()
    expect(screen.getByText("Revisions")).toBeInTheDocument()
    expect(screen.getByText("Replaced by this quote")).toBeInTheDocument()
  })
  it("a replaced quote says it was replaced and points to the new one", () => {
    const s = createQuoteStore()
    const next = s.revise(BETH, QUOTES_NOW)
    render(<QuotePage store={s} quoteId={BETH} now={QUOTES_NOW} />)
    expect(screen.getByText(`Replaced by ${next}.`)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open the new quote" })).toHaveAttribute("href", `/admin/quotes?quote=${next}`)
  })
  it("shows a sent quote with its deposit, the reminders and the lock", () => {
    stage(BETH)
    expect(screen.getAllByText("Sent").length).toBeGreaterThan(0)
    expect(screen.getByText("$300 (25%), due when Beth approves")).toBeInTheDocument()
    expect(screen.getByText("Waiting for Beth")).toBeInTheDocument()
    expect(screen.getByText("None sent")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mark approved" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Revise" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit Roofline lights" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add a line" })).toBeNull()
  })
  it("marks approved by hand: a deposit needs a way to be paid, the dialog says a job is created, and the quote then says Job created with the job's chip", async () => {
    const { store } = stage(BETH)
    expect(document.querySelector("[data-slot=job-created]")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Mark approved" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/A job is created, ready to schedule\./)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Mark approved and tell Beth" })).toBeDisabled()
    fireEvent.change(within(dialog).getByRole("combobox", { name: "How was the $300 deposit paid?" }), { target: { value: "check" } })
    expect(within(dialog).getByText(/Beth gets a receipt for the \$300 by email/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Check number (optional)" }), { target: { value: "2210" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark approved and tell Beth" }))
    await screen.findAllByText(/Job created/)
    expect(document.querySelector("[data-slot=job-created]")).toHaveTextContent(/Christmas lights/)
    expect(screen.getByText("$300 (25%), paid by check 2210")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Open job|Christmas lights/ }).some((a) => a.getAttribute("href") === "/admin/jobs?job=qj-0007")).toBe(true)
    expect(store.getSnapshot().jobs["qj-0007"]!.deposit!.paid).toMatchObject({ how: "check", reference: "2210" })
  })
  it("archives with a reason: the dialog names the request, and the quote reads Archived with the request archived too", async () => {
    const onArchived = vi.fn()
    const store = createQuoteStore()
    render(<QuotePage store={store} quoteId={DANA} now={QUOTES_NOW} onArchived={onArchived} />)
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Archive" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Archive quote Q-2026-0004 as No answer\. Dana's request is archived too, with the same reason\. Nothing is sent to Dana\./)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Reason" }), { target: { value: "Not a fit" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive quote" }))
    expect(await screen.findByText("Archived as Not a fit. Dana's request is archived too.")).toBeInTheDocument()
    expect(onArchived).toHaveBeenCalledWith(expect.objectContaining({ id: DANA, requestId: "rq-dana" }), "Not a fit")
    expect(store.getSnapshot().quotes[DANA]!.state).toBe("archived")
  })
  it("a quote made by hand has no request to archive: its dialog says nothing of one", async () => {
    const store = createQuoteStore()
    store.add(quoteByHand({ id: "Q-2026-0009", customerId: "andrea", customer: "Andrea Dalton", first: "Andrea", phone: "", email: "", contact: "text", service: "Sprinkler repair", street: "480 Briggs St", town: "Erie", at: QUOTES_NOW, price: 145 }))
    render(<QuotePage store={store} quoteId="Q-2026-0009" now={QUOTES_NOW} />)
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Archive" }))
    expect(within(screen.getByRole("dialog")).queryByText(/request is archived too/)).toBeNull()
  })
  it("a declined quote says no job was made and can be archived; an archived one has no buttons", () => {
    const s = createQuoteStore()
    s.decline(GREG, QUOTES_NOW)
    const { unmount } = render(<QuotePage store={s} quoteId={GREG} now={QUOTES_NOW} />)
    expect(screen.getByText("Greg declined quote Q-2026-0008. No job was made.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Mark approved" })).toBeNull()
    unmount()
    s.archive(GREG, "No answer", QUOTES_NOW)
    render(<QuotePage store={s} quoteId={GREG} now={QUOTES_NOW} />)
    expect(screen.queryByRole("button", { name: "More" })).toBeNull()
    expect(screen.getByText(/Archived as No answer\./)).toBeInTheDocument()
  })
  it("an approved quote shows its frozen lines, the job's chip and Open job; the job's lines are its own copy", () => {
    const s = createQuoteStore()
    s.approve(BETH, { by: "customer", deposit: { how: "card" }, at: QUOTES_NOW })
    render(<QuotePage store={s} quoteId={BETH} now={QUOTES_NOW} />)
    expect(screen.getByText(/These are the lines of quote Q-2026-0007\. The job has its own copy\./)).toBeInTheDocument()
    expect(document.querySelector("[data-slot=job-created]")).toHaveTextContent(/Job created Nov 18/)
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=qj-0007")
    expect(screen.getByText("$300 (25%), paid by card")).toBeInTheDocument()
  })
})

describe("the job made from an approved quote", () => {
  const approved = (deposit = true) => {
    const store = createQuoteStore()
    store.approve(BETH, { by: "customer", ...(deposit ? { deposit: { how: "card" as const } } : {}), at: QUOTES_NOW })
    return store
  }
  const JOB = "qj-0007"

  it("has no quote state of its own: no Needs a quote, no Quote sent, no editor; it says which quote it came from", () => {
    render(<ApprovedJobPage store={approved()} jobId={JOB} now={QUOTES_NOW} />)
    expect(screen.getAllByText("Unscheduled").length).toBeGreaterThan(0)
    expect(screen.queryByText("Needs a quote")).toBeNull()
    expect(screen.queryByText("Quote sent")).toBeNull()
    expect(screen.queryByRole("list", { name: "Steps" })).toBeNull()
    expect(document.querySelector("[data-slot=from-quote]")).toHaveTextContent(/Approved by Beth on Nov 18/)
    expect(screen.getAllByRole("link", { name: "Quote: Q-2026-0007" }).length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Schedule" })).toBeInTheDocument()
  })
  it("blocks Cancel job while the deposit is paid, until Ryan refunds it himself", async () => {
    render(<ApprovedJobPage store={approved()} jobId={JOB} now={QUOTES_NOW} />)
    await userEvent.click(screen.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel job" }))
    expect(within(screen.getByRole("dialog")).getByText("This job has a payment. Refund it first.")).toBeInTheDocument()
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Cancel job" })).toBeNull()
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep it" })).toBeInTheDocument()
  })

  it("changes the total with the lines, and writes the history line with who and when; the quote stays as it was approved", () => {
    const s = approved()
    expect(currentTotal(s.getSnapshot().jobs[JOB]!)).toBe(1200)
    const moved = s.updateJobLine(JOB, "b1", { amount: 1200 }, "2026-11-18T18:20:00Z")
    expect(moved).toEqual({ from: 1200, to: 1500 })
    const job = s.getSnapshot().jobs[JOB]!
    expect(currentTotal(job)).toBe(1500)
    // the approved quote itself is not rewritten: there is no second approval and no change-order quote
    expect(s.getSnapshot().quotes[BETH]).toMatchObject({ total: 1200, state: "approved" })
    expect(quoteTotal(s.getSnapshot().quotes[BETH]!)).toBe(1200)
    expect(Object.keys(s.getSnapshot().quotes)).toHaveLength(Object.keys(createQuoteStore().getSnapshot().quotes).length)
    expect(job.history[job.history.length - 1]).toMatchObject({ at: "2026-11-18T18:20:00Z", actor: "Ryan", what: "Price changed from $1,200 to $1,500", kind: "price-changed" })
    expect(approvedTotal(job)).toBe(1200)
  })

  it("adds a line and cancels a line: a canceled line is out of the total and stays on the job", () => {
    const s = approved()
    expect(s.addJobLine(JOB, { name: "Shrub wrap", amount: 200 })).toEqual({ from: 1200, to: 1400 })
    expect(s.cancelJobLine(JOB, "b2")).toEqual({ from: 1200, to: 1100 })
    const job = s.getSnapshot().jobs[JOB]!
    expect(job.lines.find((l) => l.id === "b2")).toMatchObject({ canceled: true })
    expect(currentTotal(job)).toBe(1100)
    expect(job.history.filter((h) => h.kind === "price-changed").map((h) => h.what)).toEqual(["Price changed from $1,200 to $1,400", "Price changed from $1,400 to $1,100"])
  })

  it("records nothing when the total does not move, and nothing before the quote is approved or while it is out and locked", () => {
    const s = approved()
    expect(s.updateJobLine(JOB, "b1", { name: "Roofline" })).toBeNull()
    expect(s.getSnapshot().jobs[JOB]!.history.some((h) => h.kind === "price-changed")).toBe(false)
    const out = createQuoteStore()
    // no job exists before approval, and the Sent quote's lines are locked
    expect(out.updateJobLine(JOB, "b1", { amount: 1000 })).toBeNull()
    out.updateLine(BETH, "b1", { amount: 1000 })
    expect(out.getSnapshot().quotes[BETH]!.lines[0]!.amount).toBe(900)
    expect(out.getSnapshot().jobs[JOB]).toBeUndefined()
    expect(isApproved(s.getSnapshot().jobs[JOB]!)).toBe(true)
  })

  it("remembers what the customer has not been told, from the last telling, and ends it when told or kept quiet", () => {
    const s = approved()
    s.updateJobLine(JOB, "b1", { amount: 1200 })
    s.updateJobLine(JOB, "b2", { amount: 100 })
    expect(untoldChange(s.getSnapshot().jobs[JOB]!)).toEqual({ from: 1200, to: 1300 })
    s.tellPrice(JOB, { via: "email", at: QUOTES_NOW })
    expect(untoldChange(s.getSnapshot().jobs[JOB]!)).toBeNull()
    expect(s.getSnapshot().jobs[JOB]!.history.at(-1)!.what).toBe("Told Beth the new total, $1,300, by email")
    s.updateJobLine(JOB, "b2", { amount: 300 })
    s.tellPrice(JOB, { via: "none", at: QUOTES_NOW })
    expect(s.getSnapshot().jobs[JOB]!.history.at(-1)!.what).toBe("Kept the new total, $1,500, without notifying Beth")
    expect(untoldChange(s.getSnapshot().jobs[JOB]!)).toBeNull()
  })

  it("says nothing when the total comes back to what it was", () => {
    const s = approved()
    s.updateJobLine(JOB, "b1", { amount: 1200 })
    s.updateJobLine(JOB, "b1", { amount: 900 })
    expect(untoldChange(s.getSnapshot().jobs[JOB]!)).toBeNull()
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
    render(<ApprovedJobPage store={approved()} jobId={JOB} now={QUOTES_NOW} />)
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

  it("the final invoice shows the new total on its lines, with the deposit credited", () => {
    const s = approved()
    s.updateJobLine(JOB, "b1", { amount: 1200 })
    s.cancelJobLine(JOB, "b2")
    const inv = finalInvoiceOf(s.getSnapshot().jobs[JOB]!, { number: "INV-2026-0045", sentOn: "2026-11-24", dueOn: "2026-12-08" })
    expect(inv.lines.map((l) => [l.name, l.amount])).toEqual([["Roofline lights", "$1,200"]])
    expect(inv.totals).toEqual([["Subtotal", "$1,200"], ["Tax", "$0"], ["Total", "$1,200", "strong"], ["Deposit paid Nov 18", "-$300"], ["Paid", "$0"], ["Unpaid", "$900", "alert"]])
    expect(inv.amount).toBe("$900")
  })

  it("a refund marks the deposit refunded on the job and on the quote", () => {
    const s = approved()
    s.refund(JOB, QUOTES_NOW)
    expect(s.getSnapshot().jobs[JOB]!.deposit!.paid!.refundedOn).toBe(QUOTES_NOW)
    expect(s.getSnapshot().quotes[BETH]!.deposit!.paid!.refundedOn).toBe(QUOTES_NOW)
  })
})
