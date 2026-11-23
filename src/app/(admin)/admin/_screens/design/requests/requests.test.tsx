import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { RequestPage } from "./RequestPage"
import { RequestsList } from "./RequestsList"
import { createWords } from "./RequestDialogs"
import { catalogueEntry, isQuoteFirst } from "./request-catalogue"
import { ARCHIVE_REASONS, QUOTE_ARCHIVE_REASONS, REQUESTS_NOW, REQUEST_FIXTURES, listOrder, matchOf, newCount, openRequests, stateOf, type RequestData } from "./request-model"
import { fromSent, requestStore } from "./request-store"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

const req = (id: string): RequestData => REQUEST_FIXTURES.find((r) => r.id === id)!

const footerButtons = () => Array.from(document.querySelector("[data-slot=record-footer]")!.querySelectorAll("button, a")).map((e) => e.textContent?.trim())

describe("request states", () => {
  it("reads New, Seen and Archived from the facts; a request that became a job or a quote is no longer a request", () => {
    expect(REQUEST_FIXTURES.map((r) => [r.id, stateOf(r)])).toEqual([
      ["rq-rosa", "new"],
      ["rq-andrea", "new"],
      ["rq-kevin", "seen"],
      ["rq-tom", "seen"],
      ["rq-beth", "seen"],
      ["rq-dana", "seen"],
      ["rq-ben", "archived"],
      ["rq-june", "archived"],
    ])
    expect(openRequests(REQUEST_FIXTURES).map((r) => r.id)).toEqual(["rq-rosa", "rq-andrea", "rq-kevin", "rq-tom", "rq-ben", "rq-june"])
    // archived wins over seen
    expect(stateOf({ ...req("rq-beth"), archived: { reason: "Duplicate", at: "x" } })).toBe("archived")
    expect(stateOf({ ...req("rq-rosa"), seen: true })).toBe("seen")
  })
  it("brings a request back, Archived, when the quote it became is archived; a request that became a job stays gone", () => {
    const archived = { ...req("rq-beth"), archived: { reason: "No answer" as const, at: REQUESTS_NOW } }
    expect(openRequests([archived, req("rq-dana")]).map((r) => r.id)).toEqual(["rq-beth"])
    expect(openRequests([{ ...req("rq-tom"), becameJob: { jobId: "rj-tom", customerId: "c", at: "x" }, archived: { reason: "Spam" as const, at: "x" } }])).toEqual([])
  })
  it("orders New first, then Seen and Archived, newest first inside each", () => {
    expect(listOrder(openRequests(REQUEST_FIXTURES)).map((r) => r.id)).toEqual(["rq-rosa", "rq-andrea", "rq-kevin", "rq-tom", "rq-ben", "rq-june"])
    expect(newCount(REQUEST_FIXTURES)).toBe(2)
  })
  it("has the four archive reasons for a request and three for a quote, whose reason a request takes", () => {
    expect([...ARCHIVE_REASONS]).toEqual(["Spam", "Question answered", "Not a fit", "Duplicate"])
    expect([...QUOTE_ARCHIVE_REASONS]).toEqual(["No answer", "Not a fit", "Duplicate"])
  })
})

describe("the customer match", () => {
  it("matches by email in any case, and by phone digits, and prefers the email", () => {
    expect(matchOf(req("rq-andrea"))?.customer.name).toBe("Andrea Dalton")
    expect(matchOf(req("rq-andrea"))?.by).toEqual(["email", "phone"])
    expect(matchOf({ email: "nobody@example.com", phone: "970 555 0188" })?.customer.name).toBe("Marcus Bell")
    expect(matchOf({ email: "marcus.bell@example.com", phone: "(970) 555-0123" })?.customer.name).toBe("Marcus Bell")
  })
  it("has no match for a stranger, and none for a short phone", () => {
    expect(matchOf(req("rq-rosa"))).toBeNull()
    expect(matchOf({ email: "", phone: "555" })).toBeNull()
  })
  it("words Create job and Send a quote as a new customer or a job under the match; a quote says no job is made until it is approved; nothing is sent", () => {
    expect(createWords(req("rq-rosa"), null, false, "job")).toBe("Add Rosa Delgado as a customer and create a job. Nothing is sent to Rosa.")
    expect(createWords(req("rq-rosa"), null, false, "job", "Christmas lights")).toBe("Add Rosa Delgado as a customer and create a Christmas lights job. Nothing is sent to Rosa.")
    expect(createWords(req("rq-rosa"), null, false, "quote", "Christmas lights")).toBe("Add Rosa Delgado as a customer and make a Christmas lights quote to price and send. No job is made until it is approved. Nothing is sent to Rosa yet.")
    expect(createWords(req("rq-andrea"), matchOf(req("rq-andrea")), false, "job", "Sprinkler repair")).toBe("Create a Sprinkler repair job for Andrea Dalton, who is already a customer. Nothing is sent to Andrea.")
    expect(createWords(req("rq-rosa"), null, false, "quote")).toBe("Add Rosa Delgado as a customer and make a quote to price and send. No job is made until it is approved. Nothing is sent to Rosa yet.")
    expect(createWords(req("rq-andrea"), matchOf(req("rq-andrea")), false, "quote")).toBe("Make a quote to price and send for Andrea Dalton, who is already a customer. No job is made until it is approved. Nothing is sent to Andrea yet.")
    expect(createWords(req("rq-andrea"), matchOf(req("rq-andrea")), true, "job")).toMatch(/^Add Andrea Dalton as a customer/)
  })
})

describe("the catalogue flag", () => {
  it("quotes first a service with no price in the catalogue, and not a priced one", () => {
    expect(catalogueEntry("Christmas lights").priced).toBe(false)
    expect(catalogueEntry("Larger sprinkler repair").priced).toBe(false)
    expect(isQuoteFirst("New sprinkler system installation")).toBe(true)
    expect(catalogueEntry("Sprinkler repair")).toMatchObject({ priced: true, price: 145 })
    expect(isQuoteFirst("Free consultation")).toBe(false)
    expect(isQuoteFirst("")).toBe(true)
  })
})

describe("Requests list", () => {
  it("lists the open requests, New first, with the match as a chip and a status pill; one that became a job or a quote has left", () => {
    render(<RequestsList requests={REQUEST_FIXTURES} now={REQUESTS_NOW} onOpen={() => undefined} />)
    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(7)
    expect(screen.queryByText("Beth Orr")).toBeNull()
    expect(screen.queryByText("Accepted")).toBeNull()
    expect(screen.queryByText("Job created")).toBeNull()
    expect(within(rows[1]!).getByRole("button", { name: "Rosa Delgado" })).toBeInTheDocument()
    expect(within(rows[1]!).getByText("No match")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("New", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(within(rows[2]!).getByRole("link", { name: /Customer: Andrea Dalton/ })).toHaveAttribute("href", "/admin/customers?customer=andrea")
  })
  it("shows a request again, Archived, when its quote was archived", () => {
    const archived: RequestData = { ...req("rq-beth"), archived: { reason: "No answer", at: REQUESTS_NOW } }
    render(<RequestsList requests={[archived]} now={REQUESTS_NOW} onOpen={() => undefined} />)
    const row = screen.getAllByRole("row")[1]!
    expect(within(row).getByRole("button", { name: "Beth Orr" })).toBeInTheDocument()
    expect(within(row).getByText("Archived", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
  })
  it("opens a request from its name", () => {
    const onOpen = vi.fn()
    render(<RequestsList requests={REQUEST_FIXTURES} now={REQUESTS_NOW} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole("button", { name: "Kevin Marsh" }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-kevin" }))
  })
  it("says where a request will show when there are none", () => {
    render(<RequestsList requests={[]} now={REQUESTS_NOW} onOpen={() => undefined} />)
    expect(screen.getByText("No requests yet")).toBeInTheDocument()
  })
})

describe("Request page", () => {
  it("shows New with Send a quote as the way out for a service with no price, Archive beside it, Mark as seen under More, and no Create job", () => {
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByRole("heading", { level: 1, name: "Rosa Delgado" })).toBeInTheDocument()
    expect(screen.getByText("New", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(footerButtons().slice(0, 2)).toEqual(["Send a quote", "Archive"])
    expect(screen.queryByRole("button", { name: "Create job" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
    expect(screen.getAllByText("No match").length).toBeGreaterThan(0)
  })
  it("leads with Create job for a priced service, with Send a quote beside it", () => {
    render(<RequestPage request={req("rq-tom")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(footerButtons().slice(0, 3)).toEqual(["Create job", "Send a quote", "Archive"])
  })
  it("writes Seen once when a New request is opened", () => {
    const onSeen = vi.fn()
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} onSeen={onSeen} />)
    expect(onSeen).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Seen", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
  })
  it("names the match as a chip and keeps waiting for Ryan", () => {
    render(<RequestPage request={req("rq-andrea")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByText("A match is a hint. The request waits until you make a job of it.")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Customer: Andrea Dalton/ }).length).toBeGreaterThan(0)
  })
  it("states the effect in the Create job dialog for a priced service, then says the request became a job", async () => {
    const onCreateJob = vi.fn(() => ({ id: "rj-tom", customerId: "other-tom-ellis" }))
    render(<RequestPage request={req("rq-tom")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    fireEvent.click(screen.getByRole("button", { name: "Create job" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Create job" })).toBeInTheDocument()
    expect(within(dialog).getByText(/^Add Tom Ellis as a customer and create a Sprinkler repair job\. Nothing is sent to Tom\./)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Create job" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-tom" }), { asNew: false, mode: "job", service: { name: "Sprinkler repair", price: 145 } })
    expect(await screen.findByRole("heading", { level: 1, name: "This request became a job" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=rj-tom")
    expect(screen.queryByText("Accepted")).toBeNull()
  })
  it("Create job needs a service with a price: one without says to send a quote and the button stays off", () => {
    render(<RequestPage request={req("rq-tom")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Create job" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByRole("combobox", { name: "What is this for?" }), { target: { value: "lights" } })
    expect(within(dialog).getByText("Needs a price. Use Send a quote.")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Create job" })).toBeDisabled()
  })
  it("Send a quote makes a quote, not a job: the request moves into it and the host gets the quote to open", async () => {
    const onCreateJob = vi.fn(() => ({ id: "Q-2026-0009", customerId: "other-rosa-delgado" }))
    const onJobCreated = vi.fn()
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} onJobCreated={onJobCreated} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    // the request named a catalogue service, so the sheet starts with it chosen and says the exact effect
    expect(within(dialog).getByRole("combobox", { name: "What is this for?" })).toHaveValue("lights")
    expect(within(dialog).getByText("Add Rosa Delgado as a customer and make a Christmas lights quote to price and send. No job is made until it is approved. Nothing is sent to Rosa yet.")).toBeInTheDocument()
    expect(within(dialog).getByText("New customer")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send a quote" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-rosa" }), { asNew: false, mode: "quote", service: { name: "Christmas lights" } })
    expect(onJobCreated).toHaveBeenCalledWith("Q-2026-0009", "Quote created for Rosa Delgado", "quote")
  })
  it("without a host, Send a quote shows the plain page that says the request became a quote, with the quote as a chip", async () => {
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={() => ({ id: "Q-2026-0009", customerId: "c" })} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send a quote" }))
    expect(await screen.findByRole("heading", { level: 1, name: "This request became a quote" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open quote" })).toHaveAttribute("href", "/admin/quotes?quote=Q-2026-0009")
  })
  const ben = (): RequestData => ({ ...req("rq-ben"), archived: undefined, seen: false, service: "" })
  it("starts the sheet empty when the request named no service: the button is off and one quiet line says what is missing, until a choice is made", () => {
    const onCreateJob = vi.fn(() => ({ id: "Q-2026-0009", customerId: "other-ben-harlan" }))
    render(<RequestPage request={ben()} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    expect(screen.getAllByText("Not said").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    const picker = within(dialog).getByRole("combobox", { name: "What is this for?" })
    expect(picker).toHaveValue("")
    expect(within(dialog).getByText("Add Ben Harlan as a customer and make a quote to price and send. No job is made until it is approved. Nothing is sent to Ben yet.")).toBeInTheDocument()
    expect(within(dialog).getAllByText("Choose what this is for.")).toHaveLength(1)
    expect(within(dialog).getByRole("button", { name: "Send a quote" })).toBeDisabled()
    fireEvent.change(picker, { target: { value: "repair" } })
    expect(within(dialog).queryByText("Choose what this is for.")).toBeNull()
    expect(within(dialog).getByText("Add Ben Harlan as a customer and make a Sprinkler repair quote to price and send. No job is made until it is approved. Nothing is sent to Ben yet.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send a quote" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-ben" }), { asNew: false, mode: "quote", service: { name: "Sprinkler repair", price: 145 } })
  })
  it("ends the list with Something else, which asks for a name and makes a quote with that name and no price", () => {
    const onCreateJob = vi.fn(() => ({ id: "Q-2026-0009", customerId: "other-ben-harlan" }))
    render(<RequestPage request={ben()} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    const options = within(dialog).getAllByRole("option").map((o) => o.textContent)
    expect(options.at(-1)).toBe("Something else")
    expect(options).not.toContain("Season Pass 2027")
    fireEvent.change(within(dialog).getByRole("combobox", { name: "What is this for?" }), { target: { value: "else" } })
    expect(within(dialog).getByRole("button", { name: "Send a quote" })).toBeDisabled()
    expect(within(dialog).getByText("Name the job.")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name of the job" }), { target: { value: "Drip line for the garden" } })
    expect(within(dialog).getByText("Add Ben Harlan as a customer and make a Drip line for the garden quote to price and send. No job is made until it is approved. Nothing is sent to Ben yet.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send a quote" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.anything(), { asNew: false, mode: "quote", service: { name: "Drip line for the garden" } })
  })
  it("lets Ryan change the preselected service before he confirms", () => {
    const onCreateJob = vi.fn(() => ({ id: "Q-2026-0009", customerId: "other-kevin-marsh" }))
    render(<RequestPage request={req("rq-kevin")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    const picker = within(dialog).getByRole("combobox", { name: "What is this for?" })
    expect(picker).toHaveValue("big-repair")
    fireEvent.change(picker, { target: { value: "repair" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Send a quote" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.anything(), { asNew: false, mode: "quote", service: { name: "Sprinkler repair", price: 145 } })
  })
  it("archives with a reason and adds no customer", async () => {
    const onArchive = vi.fn()
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} onArchive={onArchive} />)
    fireEvent.click(screen.getByRole("button", { name: "Archive" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Reason" }), { target: { value: "Not a fit" } })
    expect(within(dialog).getByText(/Archive Rosa Delgado's request as Not a fit. No customer is added and nothing is sent./)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive request" }))
    expect(onArchive).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-rosa" }), "Not a fit")
    expect(await screen.findByText(/Archived as Not a fit. No customer was added and nothing was sent./)).toBeInTheDocument()
  })
  it("has no actions on an archived request, and a request that became a quote opens a plain page with the quote", () => {
    const { unmount } = render(<RequestPage request={req("rq-ben")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.queryByRole("button", { name: "Create job" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Send a quote" })).toBeNull()
    unmount()
    render(<RequestPage request={req("rq-beth")} now={REQUESTS_NOW} markSeenOnOpen={false} quoteStage={{ status: "quote-sent", label: "Sent" }} />)
    expect(screen.getByRole("heading", { level: 1, name: "This request became a quote" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open quote" })).toHaveAttribute("href", "/admin/quotes?quote=Q-2026-0007")
    expect(screen.getAllByRole("link", { name: "Quote: Q-2026-0007" }).length).toBeGreaterThan(0)
    expect(screen.getByText("Sent", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
  })
  it("says the quote was archived, and the request with it, when a stale link opens it", () => {
    const archived: RequestData = { ...req("rq-beth"), archived: { reason: "No answer", at: REQUESTS_NOW } }
    render(<RequestPage request={archived} now={REQUESTS_NOW} markSeenOnOpen={false} quoteStage={{ status: "quote-archived", label: "Archived" }} />)
    expect(screen.getByRole("heading", { level: 1, name: "This request became a quote that was archived" })).toBeInTheDocument()
    expect(screen.getByText("The quote was archived as No answer. This request is archived with it.")).toBeInTheDocument()
  })
  it("a request that became a job opens a plain page with the job", () => {
    const made: RequestData = { ...req("rq-tom"), becameJob: { jobId: "rj-tom", customerId: "c", at: REQUESTS_NOW } }
    render(<RequestPage request={made} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByRole("heading", { level: 1, name: "This request became a job" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=rj-tom")
  })
})

describe("request store", () => {
  beforeEach(() => requestStore.reset())
  it("marks Seen once, makes a job or a quote, archives, and Start over forgets it", () => {
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-rosa")!)).toBe("new")
    requestStore.markSeen("rq-rosa")
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-rosa")!)).toBe("seen")
    requestStore.becomeJob("rq-andrea", { jobId: "rj-andrea", customerId: "andrea", at: REQUESTS_NOW })
    expect(requestStore.getSnapshot().find((r) => r.id === "rq-andrea")!.becameJob).toMatchObject({ jobId: "rj-andrea" })
    expect(newCount(requestStore.getSnapshot())).toBe(0)
    requestStore.becomeQuote("rq-kevin", { quoteId: "Q-2026-0009", customerId: "other-kevin-marsh", at: REQUESTS_NOW })
    expect(requestStore.getSnapshot().find((r) => r.id === "rq-kevin")!.becameQuote).toMatchObject({ quoteId: "Q-2026-0009" })
    expect(openRequests(requestStore.getSnapshot()).some((r) => r.id === "rq-kevin")).toBe(false)
    requestStore.archive("rq-tom", "Spam", REQUESTS_NOW)
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-tom")!)).toBe("archived")
    requestStore.reset()
    expect(newCount(requestStore.getSnapshot())).toBe(2)
  })
  it("archiving the quote a request became brings the request back, Archived, with the same reason", () => {
    requestStore.becomeQuote("rq-kevin", { quoteId: "Q-2026-0009", customerId: "other-kevin-marsh", at: REQUESTS_NOW })
    requestStore.archive("rq-kevin", "No answer", REQUESTS_NOW)
    const kevin = requestStore.getSnapshot().find((r) => r.id === "rq-kevin")!
    expect(stateOf(kevin)).toBe("archived")
    expect(kevin.archived).toEqual({ reason: "No answer", at: REQUESTS_NOW })
    expect(openRequests(requestStore.getSnapshot()).some((r) => r.id === "rq-kevin")).toBe(true)
  })
  it("turns what the booking form sent into a New request outside Customers", () => {
    const r = fromSent({ id: "rq-sent", at: "2026-11-18T17:00:00Z", first: "Sam", last: "Ito", phone: "(970) 555-0100", email: "sam@example.com", contact: "text", street: "1 Oak St", town: "Erie", serviceKey: "lights", serviceName: "Christmas lights", words: "Roofline.", photos: [{ name: "a.jpg", src: "data:image/svg+xml;utf8,x" }] })
    expect(stateOf(r)).toBe("new")
    expect(r.service).toBe("Christmas lights")
    expect(r.photos).toHaveLength(1)
    expect(r.becameJob).toBeUndefined()
    expect(r.becameQuote).toBeUndefined()
  })
})
