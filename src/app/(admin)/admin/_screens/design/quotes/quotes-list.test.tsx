import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { moreItems, railItems } from "@/components/blocks/admin-nav"
import { QuotesList } from "./QuotesList"
import { searchQuotes } from "./QuotesShell"
import { QUOTE_HISTORY_FIXTURES } from "./quote-history-fixtures"
import { closeRate, oldestWaitingDays, quoteRowsOf, quoteTotals, sortQuoteRows, tabCounts, waitingCount } from "./quote-list-model"
import { QUOTES_NOW, QUOTE_JOB_FIXTURES, nextNumber } from "./quote-model"
import { createQuoteStore } from "./quote-store"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

const ALL = [...QUOTE_JOB_FIXTURES, ...QUOTE_HISTORY_FIXTURES]

describe("the rows and the count", () => {
  it("makes one row per quote, every status, from the jobs the job page reads", () => {
    const rows = quoteRowsOf(ALL, QUOTES_NOW)
    expect(rows.map((r) => [r.id, r.state])).toEqual([
      ["Q-2026-0007", "sent"],
      ["Q-2026-0008", "sent"],
      ["Q-2026-0005", "approved"],
      ["Q-2026-0006", "declined"],
      ["Q-2026-0003", "replaced"],
    ])
    expect(rows.find((r) => r.id === "Q-2026-0007")!.deposit).toBe(300)
    expect(rows.find((r) => r.id === "Q-2026-0008")!.deposit).toBeUndefined()
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
  it("puts the longest waiting first, then the decided newest first, then Replaced", () => {
    expect(sortQuoteRows(quoteRowsOf(ALL, QUOTES_NOW)).map((r) => r.id)).toEqual(["Q-2026-0007", "Q-2026-0008", "Q-2026-0006", "Q-2026-0005", "Q-2026-0003"])
  })
  it("reads the age of the oldest waiting quote, the close rate and the tab counts from the rows", () => {
    const rows = quoteRowsOf(ALL, QUOTES_NOW)
    expect(oldestWaitingDays(rows, QUOTES_NOW)).toBe(8)
    expect(oldestWaitingDays([], QUOTES_NOW)).toBeNull()
    // approved out of approved plus declined; Sent and Replaced are not decided
    expect(closeRate(rows)).toEqual({ percent: 50, approved: 1, decided: 2 })
    expect(closeRate(quoteRowsOf(QUOTE_JOB_FIXTURES, QUOTES_NOW))).toBeNull()
    expect(tabCounts(rows)).toEqual({ all: 5, sent: 2, approved: 1, declined: 1, replaced: 1 })
  })
  it("keeps the next quote number where it was", () => {
    expect(nextNumber(ALL)).toBe("Q-2026-0009")
  })
  it("shows a quote sent from a job at once: a new row and a higher count", () => {
    const store = createQuoteStore()
    expect(waitingCount(Object.values(store.getSnapshot()))).toBe(2)
    store.addLine("q-dana", { name: "Zone 3 line", amount: 380 })
    store.updateLine("q-dana", "d1", { amount: 145 })
    const number = store.send("q-dana", { via: "text", deposit: null, at: QUOTES_NOW })
    const jobs = Object.values(store.getSnapshot())
    expect(quoteRowsOf(jobs, QUOTES_NOW).find((r) => r.id === number)!.state).toBe("sent")
    expect(waitingCount(jobs)).toBe(3)
  })
})

describe("the rail and the phone's More", () => {
  it("draws Quotes after Jobs when the shell has it, and Requests after Schedule", () => {
    expect(railItems(false, false).map((n) => n.id)).toEqual(["home", "schedule", "jobs", "customers", "reports", "settings"])
    expect(railItems(true, true).map((n) => n.id)).toEqual(["home", "schedule", "requests", "jobs", "quotes", "customers", "reports", "settings"])
    expect(railItems(false, true).map((n) => n.id)).toEqual(["home", "schedule", "jobs", "quotes", "customers", "reports", "settings"])
  })
  it("puts Quotes in More after Requests", () => {
    expect(moreItems(true, true).map((n) => n.id)).toEqual(["requests", "quotes", "reports", "settings"])
    expect(moreItems(false, false).map((n) => n.id)).toEqual(["reports", "settings"])
  })
})

describe("Cmd+K", () => {
  it("finds a quote by its number or the customer's name, and opens its job at the Quote section", async () => {
    const byNumber = await searchQuotes(ALL)("Q-2026-0007")
    expect(byNumber).toHaveLength(1)
    expect(byNumber[0]).toMatchObject({ kind: "quote", id: "Q-2026-0007", title: "Q-2026-0007", href: "/admin/jobs?job=q-beth#quote-h" })
    expect(byNumber[0]!.detail).toBe("Beth Orr, Christmas lights, $1,200 · Sent")
    expect((await searchQuotes(ALL)("greg")).map((h) => h.id)).toEqual(["Q-2026-0008"])
    expect(await searchQuotes(ALL)("nobody")).toEqual([])
  })
})

describe("the Quotes list", () => {
  it("has the pipeline tiles, each with what it counts", () => {
    render(<QuotesList jobs={ALL} now={QUOTES_NOW} />)
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
    render(<QuotesList jobs={QUOTE_JOB_FIXTURES} now={QUOTES_NOW} />)
    expect(within(screen.getByRole("group", { name: "Summary" })).queryByText("Close rate")).toBeNull()
  })
  it("has status tabs with live counts, All first and open", () => {
    render(<QuotesList jobs={ALL} now={QUOTES_NOW} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs.map((t) => t.textContent)).toEqual(["All5", "Sent2", "Approved1", "Declined1", "Replaced1"])
    expect(screen.getByRole("tab", { name: /^All/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getAllByRole("row")).toHaveLength(6)
  })
  it("sets the tab when a tile is pressed, and when a tab is", async () => {
    render(<QuotesList jobs={ALL} now={QUOTES_NOW} />)
    fireEvent.click(within(screen.getByRole("group", { name: "Summary" })).getByRole("button", { name: /Declined this month/ }))
    expect(screen.getByRole("tab", { name: /^Declined/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getAllByRole("row")[1]!.textContent).toContain("Q-2026-0006")
    await userEvent.click(screen.getByRole("tab", { name: /^Sent/ }))
    expect(screen.getAllByRole("row")).toHaveLength(3)
    await userEvent.click(screen.getByRole("tab", { name: /^All/ }))
    expect(screen.getAllByRole("row")).toHaveLength(6)
  })
  it("has a row per quote with the quote, customer and job as chips and the sent day with its age", () => {
    render(<QuotesList jobs={ALL} now={QUOTES_NOW} />)
    const first = screen.getAllByRole("row")[1]!
    expect(within(first).getByRole("link", { name: "Quote: Q-2026-0007" })).toHaveAttribute("href", expect.stringContaining("job=q-beth"))
    expect(within(first).getByRole("link", { name: "Quote: Q-2026-0007" })).toHaveAttribute("href", expect.stringContaining("#quote-h"))
    expect(within(first).getByRole("link", { name: /Customer: Beth Orr/ })).toBeInTheDocument()
    expect(within(first).getByRole("link", { name: /Job: Christmas lights/ })).toHaveAttribute("href", expect.stringContaining("#quote-h"))
    expect(within(first).getByText("Sent", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(within(first).getByText("$1,200")).toBeInTheDocument()
    expect(within(first).getByText("$300")).toBeInTheDocument()
    expect(within(first).getByText("Nov 9")).toBeInTheDocument()
    expect(within(first).getByText("8 days ago")).toBeInTheDocument()
  })
  it("shows a dash for no deposit and every status pill", () => {
    render(<QuotesList jobs={ALL} now={QUOTES_NOW} />)
    const greg = screen.getAllByRole("row").find((r) => r.textContent?.includes("Q-2026-0008"))!
    expect(within(greg).getByText("No deposit")).toBeInTheDocument()
    for (const label of ["Approved", "Declined", "Replaced"]) expect(screen.getAllByText(label, { selector: "[data-slot=status-pill]" }).length).toBeGreaterThan(0)
  })
  it("has Remind as the Next action of a Sent quote and Open on the others", () => {
    const onRemind = vi.fn()
    render(<QuotesList jobs={ALL} now={QUOTES_NOW} onRemind={onRemind} />)
    expect(screen.getByRole("columnheader", { name: "Next action" })).toBeInTheDocument()
    const rows = screen.getAllByRole("row")
    const sent = rows.find((r) => r.textContent?.includes("Q-2026-0007"))!
    expect(within(sent).getByRole("button", { name: "Remind" })).toBeInTheDocument()
    expect(within(sent).queryByRole("link", { name: /Open quote/ })).toBeNull()
    for (const n of ["Q-2026-0005", "Q-2026-0006", "Q-2026-0003"]) {
      const row = rows.find((r) => r.textContent?.includes(n))!
      expect(within(row).queryByRole("button", { name: "Remind" })).toBeNull()
      expect(within(row).getByRole("link", { name: `Open quote ${n}` })).toHaveAttribute("href", expect.stringContaining("#quote-h"))
    }
    fireEvent.click(within(sent).getByRole("button", { name: "Remind" }))
    expect(screen.getByRole("dialog", { name: "Send a quote reminder" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Send the reminder" }))
    expect(onRemind).toHaveBeenCalledWith(expect.objectContaining({ jobId: "q-beth" }), expect.objectContaining({ id: "Q-2026-0007" }), expect.objectContaining({ via: "email" }))
  })
  it("greys Remind once it was pressed today", () => {
    const store = createQuoteStore()
    store.remind("q-beth", { via: "email", at: QUOTES_NOW })
    render(<QuotesList jobs={Object.values(store.getSnapshot())} now={QUOTES_NOW} />)
    const row = screen.getAllByRole("row").find((r) => r.textContent?.includes("Q-2026-0007"))!
    expect(within(row).getByRole("button", { name: "Reminded today" })).toBeDisabled()
  })
  it("changes the tiles, the tab counts and the waiting count at once when a quote is sent", () => {
    const store = createQuoteStore()
    store.updateLine("q-dana", "d1", { amount: 145 })
    const { rerender } = render(<QuotesList jobs={Object.values(store.getSnapshot())} now={QUOTES_NOW} />)
    expect(screen.getByRole("tab", { name: /^Sent/ }).textContent).toBe("Sent2")
    store.send("q-dana", { via: "text", deposit: null, at: QUOTES_NOW })
    const jobs = Object.values(store.getSnapshot())
    rerender(<QuotesList jobs={jobs} now={QUOTES_NOW} />)
    expect(screen.getByRole("tab", { name: /^Sent/ }).textContent).toBe("Sent3")
    expect(screen.getByRole("tab", { name: /^All/ }).textContent).toBe("All6")
    expect(within(screen.getByRole("group", { name: "Summary" })).getByText("$2,205")).toBeInTheDocument()
    expect(waitingCount(jobs)).toBe(3)
  })
  it("says so when there are no quotes, and when a tab has none", () => {
    const { unmount } = render(<QuotesList jobs={[]} now={QUOTES_NOW} />)
    expect(screen.getByText("No quotes yet")).toBeInTheDocument()
    expect(screen.getAllByText("Nothing waiting").length).toBeGreaterThan(0)
    unmount()
    render(<QuotesList jobs={QUOTE_JOB_FIXTURES} now={QUOTES_NOW} initialTab="approved" />)
    expect(screen.getByText("No quotes match.")).toBeInTheDocument()
  })
})
