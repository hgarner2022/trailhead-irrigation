import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NAV, TAB_ITEMS, moreItems, railItems } from "@/components/blocks/admin-nav"
import { QuotesList } from "./QuotesList"
import { searchQuotes } from "./QuotesShell"
import { ALL_QUOTE_FIXTURES, QUOTE_FIXTURES } from "./quote-fixtures"
import { closeRate, oldestWaitingDays, quoteRowsOf, quoteTotals, sortQuoteRows, tabCounts, waitingCount } from "./quote-list-model"
import { QUOTES_NOW, nextNumber } from "./quote-model"
import { createQuoteStore } from "./quote-store"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

const ALL = ALL_QUOTE_FIXTURES
const DANA = "Q-2026-0004"

describe("the rows and the count", () => {
  it("makes one row per quote, every status, Drafts included, from the quote records", () => {
    const rows = quoteRowsOf(ALL, QUOTES_NOW)
    expect(rows.map((r) => [r.id, r.state]).sort()).toEqual([
      ["Q-2026-0002", "replaced"],
      ["Q-2026-0003", "draft"],
      ["Q-2026-0004", "draft"],
      ["Q-2026-0005", "approved"],
      ["Q-2026-0006", "declined"],
      ["Q-2026-0007", "sent"],
      ["Q-2026-0008", "sent"],
    ])
    expect(rows.find((r) => r.id === "Q-2026-0007")!.deposit).toBe(300)
    expect(rows.find((r) => r.id === "Q-2026-0008")!.deposit).toBeUndefined()
    // a Draft reads its lines and has not been sent; an approved quote knows the job it made
    expect(rows.find((r) => r.id === "Q-2026-0003")).toMatchObject({ amount: 620 })
    expect(rows.find((r) => r.id === DANA)!.sentOn).toBeUndefined()
    expect(rows.find((r) => r.id === "Q-2026-0005")!.jobId).toBe("qj-0005")
  })
  it("counts the quotes still waiting: Sent and undecided", () => {
    expect(waitingCount(ALL)).toBe(2)
    expect(waitingCount([])).toBe(0)
  })
  it("reads the three tiles, approved and declined by the month they were decided", () => {
    const t = quoteTotals(quoteRowsOf(ALL, QUOTES_NOW), QUOTES_NOW)
    expect(t.waiting).toEqual({ total: 2060, count: 2 })
    expect(t.approved).toEqual({ total: 750, count: 1 })
    expect(t.declined).toEqual({ total: 1150, count: 1 })
  })
  it("puts the longest waiting first, then the Drafts, then the decided newest first, then Replaced", () => {
    expect(sortQuoteRows(quoteRowsOf(ALL, QUOTES_NOW)).map((r) => r.id)).toEqual(["Q-2026-0007", "Q-2026-0008", "Q-2026-0004", "Q-2026-0003", "Q-2026-0006", "Q-2026-0005", "Q-2026-0002"])
  })
  it("reads the age of the oldest waiting quote, the close rate and the tab counts from the rows", () => {
    const rows = quoteRowsOf(ALL, QUOTES_NOW)
    expect(oldestWaitingDays(rows, QUOTES_NOW)).toBe(8)
    expect(oldestWaitingDays([], QUOTES_NOW)).toBeNull()
    // approved out of approved plus declined; Drafts, Sent, Replaced and Archived are not decided
    expect(closeRate(rows)).toEqual({ percent: 50, approved: 1, decided: 2 })
    expect(closeRate(quoteRowsOf(QUOTE_FIXTURES, QUOTES_NOW))).toBeNull()
    expect(tabCounts(rows)).toEqual({ all: 7, draft: 2, sent: 2, approved: 1, declined: 1, replaced: 1, archived: 0 })
  })
  it("keeps the next quote number where it was", () => {
    expect(nextNumber(ALL)).toBe("Q-2026-0009")
  })
  it("shows a quote made anywhere at once: a new row, and a higher count once it is sent", () => {
    const store = createQuoteStore()
    expect(waitingCount(Object.values(store.getSnapshot().quotes))).toBe(2)
    store.updateLine(DANA, "d1", { amount: 145 })
    store.send(DANA, { via: "text", deposit: null, at: QUOTES_NOW })
    const quotes = Object.values(store.getSnapshot().quotes)
    expect(quoteRowsOf(quotes, QUOTES_NOW).find((r) => r.id === DANA)!.state).toBe("sent")
    expect(waitingCount(quotes)).toBe(3)
    const made = store.createByHand({ customerId: "andrea", customer: "Andrea Dalton", first: "Andrea", phone: "", email: "", contact: "text", service: "Sprinkler repair", street: "480 Briggs St", town: "Erie", at: QUOTES_NOW })
    expect(quoteRowsOf(Object.values(store.getSnapshot().quotes), QUOTES_NOW).find((r) => r.id === made)!.state).toBe("draft")
  })
})

describe("the rail and the phone's More", () => {
  const all = { requests: true, quotes: true, invoices: true }
  it("is one order, Hannah's: Home, Schedule, Customers, Requests, Quotes, Jobs, Invoices, Reports, Settings", () => {
    expect(NAV.map((n) => n.label)).toEqual(["Home", "Schedule", "Customers", "Requests", "Quotes", "Jobs", "Invoices", "Reports", "Settings"])
    expect(railItems(all).map((n) => n.id)).toEqual(NAV.map((n) => n.id))
  })
  it("leaves out the pages a shell does not have, and never changes the order of the rest", () => {
    expect(railItems().map((n) => n.id)).toEqual(["home", "schedule", "customers", "jobs", "reports", "settings"])
    expect(railItems({ quotes: true }).map((n) => n.id)).toEqual(["home", "schedule", "customers", "quotes", "jobs", "reports", "settings"])
  })
  it("gives the phone four tabs in the rail's order and puts the rest in More, in the rail's order", () => {
    expect(TAB_ITEMS.map((n) => n.id)).toEqual(["home", "schedule", "customers", "jobs"])
    expect(moreItems(all).map((n) => n.id)).toEqual(["requests", "quotes", "invoices", "reports", "settings"])
    expect(moreItems().map((n) => n.id)).toEqual(["reports", "settings"])
  })
})

describe("Cmd+K", () => {
  it("finds a quote by its number or the customer's name, and opens the quote's own page", async () => {
    const byNumber = await searchQuotes(ALL)("Q-2026-0007")
    expect(byNumber).toHaveLength(1)
    expect(byNumber[0]).toMatchObject({ kind: "quote", id: "Q-2026-0007", title: "Q-2026-0007", href: "/admin/quotes?quote=Q-2026-0007" })
    expect(byNumber[0]!.detail).toBe("Beth Orr, Christmas lights, $1,200 · Sent")
    expect((await searchQuotes(ALL)("greg")).map((h) => h.id)).toEqual(["Q-2026-0008"])
    expect(await searchQuotes(ALL)("nobody")).toEqual([])
  })
})

describe("the Quotes list", () => {
  it("has New quote as the page's one filled button", () => {
    const onNewQuote = vi.fn()
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} onNewQuote={onNewQuote} />)
    fireEvent.click(screen.getByRole("button", { name: "New quote" }))
    expect(onNewQuote).toHaveBeenCalledTimes(1)
  })
  it("has the pipeline tiles, each with what it counts", () => {
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} />)
    const band = screen.getByRole("group", { name: "Summary" })
    for (const label of ["Open pipeline", "Waiting for an answer", "Approved this month", "Declined this month", "Close rate"]) expect(within(band).getByText(label)).toBeInTheDocument()
    expect(within(band).getByText("$2,060")).toBeInTheDocument()
    expect(within(band).getByText("2 quotes")).toBeInTheDocument()
    expect(within(band).getByText("Oldest: 8 days")).toBeInTheDocument()
    expect(within(band).getByText("$750")).toBeInTheDocument()
    expect(within(band).getByText("$1,150")).toBeInTheDocument()
    expect(within(band).getByText("50%")).toBeInTheDocument()
    expect(within(band).getByText("1 approved of 2 decided")).toBeInTheDocument()
    // Close rate is a figure, not a filter
    expect(within(band).queryByRole("button", { name: /Close rate/ })).toBeNull()
  })
  it("leaves Close rate out until a quote is decided", () => {
    render(<QuotesList quotes={QUOTE_FIXTURES} now={QUOTES_NOW} />)
    expect(within(screen.getByRole("group", { name: "Summary" })).queryByText("Close rate")).toBeNull()
  })
  it("has status tabs with live counts, All first and open", () => {
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs.map((t) => t.textContent)).toEqual(["All7", "Draft2", "Sent2", "Approved1", "Declined1", "Replaced1", "Archived0"])
    expect(screen.getByRole("tab", { name: /^All/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getAllByRole("row")).toHaveLength(8)
  })
  it("sets the tab when a tile is pressed, and when a tab is", async () => {
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} />)
    fireEvent.click(within(screen.getByRole("group", { name: "Summary" })).getByRole("button", { name: /Declined this month/ }))
    expect(screen.getByRole("tab", { name: /^Declined/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getAllByRole("row")[1]!.textContent).toContain("Q-2026-0006")
    await userEvent.click(screen.getByRole("tab", { name: /^Sent/ }))
    expect(screen.getAllByRole("row")).toHaveLength(3)
    await userEvent.click(screen.getByRole("tab", { name: /^Draft/ }))
    expect(screen.getAllByRole("row")).toHaveLength(3)
    await userEvent.click(screen.getByRole("tab", { name: /^All/ }))
    expect(screen.getAllByRole("row")).toHaveLength(8)
  })
  it("has a row per quote with ONE link (its number), the customer as text, what it is for and the sent day with its age", () => {
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} />)
    const first = screen.getAllByRole("row")[1]!
    expect(within(first).getAllByRole("link")).toHaveLength(1)
    expect(within(first).getByRole("link", { name: "Q-2026-0007" })).toHaveAttribute("href", "/admin/quotes?quote=Q-2026-0007")
    expect(within(first).getByText("Beth Orr").closest("a")).toBeNull()
    // no job chip: a quote is not a job
    expect(within(first).queryByRole("link", { name: /Job:/ })).toBeNull()
    expect(within(first).getByText("Christmas lights")).toBeInTheDocument()
    expect(within(first).getByText("Sent", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(within(first).getByText("$1,200")).toBeInTheDocument()
    expect(within(first).getByText("$300")).toBeInTheDocument()
    expect(within(first).getByText("Nov 9")).toBeInTheDocument()
    expect(within(first).getByText("8 days ago")).toBeInTheDocument()
  })
  it("says Not sent for a Draft, shows a dash for no deposit and every status pill", () => {
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} />)
    const greg = screen.getAllByRole("row").find((r) => r.textContent?.includes("Q-2026-0008"))!
    expect(within(greg).getByText("No deposit")).toBeInTheDocument()
    const dana = screen.getAllByRole("row").find((r) => r.textContent?.includes(DANA))!
    expect(within(dana).getByText("Not sent")).toBeInTheDocument()
    for (const label of ["Draft", "Approved", "Declined", "Replaced"]) expect(screen.getAllByText(label, { selector: "[data-slot=status-pill]" }).length).toBeGreaterThan(0)
  })
  it("has Remind as the Next action of a Sent quote and none on the others: the row opens the quote", () => {
    const onRemind = vi.fn()
    render(<QuotesList quotes={ALL} now={QUOTES_NOW} onRemind={onRemind} />)
    expect(screen.getByRole("columnheader", { name: "Next action" })).toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    const sent = rows.find((r) => r.textContent?.includes("Q-2026-0007"))!
    expect(within(sent).getByRole("button", { name: "Remind" })).toBeInTheDocument()
    expect(within(sent).queryByRole("link", { name: /Open quote/ })).toBeNull()
    for (const n of ["Q-2026-0004", "Q-2026-0005", "Q-2026-0006", "Q-2026-0002"]) {
      const row = rows.find((r) => r.textContent?.includes(n))!
      expect(within(row).queryByRole("button", { name: "Remind" })).toBeNull()
      expect(within(row).queryByRole("button")).toBeNull()
      expect(within(row).getAllByRole("link")).toHaveLength(1)
      expect(within(row).getByRole("link", { name: n })).toHaveAttribute("href", `/admin/quotes?quote=${n}`)
    }
    fireEvent.click(within(sent).getByRole("button", { name: "Remind" }))
    expect(screen.getByRole("dialog", { name: "Send a quote reminder" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Send the reminder" }))
    expect(onRemind).toHaveBeenCalledWith(expect.objectContaining({ id: "Q-2026-0007" }), expect.objectContaining({ via: "email" }))
  })
  it("greys Remind once it was pressed today", () => {
    const store = createQuoteStore()
    store.remind("Q-2026-0007", { via: "email", at: QUOTES_NOW })
    render(<QuotesList quotes={Object.values(store.getSnapshot().quotes)} now={QUOTES_NOW} />)
    const row = screen.getAllByRole("row").find((r) => r.textContent?.includes("Q-2026-0007"))!
    expect(within(row).getByRole("button", { name: "Reminded today" })).toBeDisabled()
  })
  it("changes the tiles, the tab counts and the waiting count at once when a quote is sent", () => {
    const store = createQuoteStore()
    store.updateLine(DANA, "d1", { amount: 145 })
    const { rerender } = render(<QuotesList quotes={Object.values(store.getSnapshot().quotes)} now={QUOTES_NOW} />)
    expect(screen.getByRole("tab", { name: /^Sent/ }).textContent).toBe("Sent2")
    expect(screen.getByRole("tab", { name: /^Draft/ }).textContent).toBe("Draft2")
    store.send(DANA, { via: "text", deposit: null, at: QUOTES_NOW })
    const quotes = Object.values(store.getSnapshot().quotes)
    rerender(<QuotesList quotes={quotes} now={QUOTES_NOW} />)
    expect(screen.getByRole("tab", { name: /^Sent/ }).textContent).toBe("Sent3")
    expect(screen.getByRole("tab", { name: /^Draft/ }).textContent).toBe("Draft1")
    expect(screen.getByRole("tab", { name: /^All/ }).textContent).toBe("All7")
    expect(within(screen.getByRole("group", { name: "Summary" })).getByText("$2,205")).toBeInTheDocument()
    expect(waitingCount(quotes)).toBe(3)
  })
  it("says so when there are no quotes, and when a tab has none", () => {
    const { unmount } = render(<QuotesList quotes={[]} now={QUOTES_NOW} />)
    expect(screen.getByText("No quotes yet")).toBeInTheDocument()
    expect(screen.getAllByText("Nothing waiting").length).toBeGreaterThan(0)
    unmount()
    render(<QuotesList quotes={QUOTE_FIXTURES} now={QUOTES_NOW} initialTab="approved" />)
    expect(screen.getByText("No quotes match.")).toBeInTheDocument()
  })
})
