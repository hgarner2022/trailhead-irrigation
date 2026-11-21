import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { RequestPage } from "./RequestPage"
import { RequestsList } from "./RequestsList"
import { createWords } from "./RequestDialogs"
import { catalogueEntry, isQuoteFirst } from "./request-catalogue"
import { ARCHIVE_REASONS, REQUESTS_NOW, REQUEST_FIXTURES, listOrder, matchOf, newCount, openRequests, stateOf, type RequestData } from "./request-model"
import { fromSent, requestStore } from "./request-store"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

const req = (id: string): RequestData => REQUEST_FIXTURES.find((r) => r.id === id)!

const footerButtons = () => Array.from(document.querySelector("[data-slot=record-footer]")!.querySelectorAll("button, a")).map((e) => e.textContent?.trim())

describe("request states", () => {
  it("reads New, Seen and Archived from the facts; a request that became a job is no longer a request", () => {
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
  it("orders New first, then Seen and Archived, newest first inside each", () => {
    expect(listOrder(openRequests(REQUEST_FIXTURES)).map((r) => r.id)).toEqual(["rq-rosa", "rq-andrea", "rq-kevin", "rq-tom", "rq-ben", "rq-june"])
    expect(newCount(REQUEST_FIXTURES)).toBe(2)
  })
  it("has the four archive reasons", () => {
    expect([...ARCHIVE_REASONS]).toEqual(["Spam", "Question answered", "Not a fit", "Duplicate"])
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
  it("words Create job and Send a quote as a new customer or a job under the match, and says nothing is sent", () => {
    expect(createWords(req("rq-rosa"), null, false, "job")).toBe("Add Rosa Delgado as a customer and create a job. Nothing is sent to Rosa.")
    expect(createWords(req("rq-rosa"), null, false, "job", "Christmas lights")).toBe("Add Rosa Delgado as a customer and create a Christmas lights job. Nothing is sent to Rosa.")
    expect(createWords(req("rq-rosa"), null, false, "quote", "Christmas lights")).toBe("Add Rosa Delgado as a customer and open a Christmas lights quote to price and send. Nothing is sent to Rosa yet.")
    expect(createWords(req("rq-andrea"), matchOf(req("rq-andrea")), false, "job", "Sprinkler repair")).toBe("Create a Sprinkler repair job for Andrea Dalton, who is already a customer. Nothing is sent to Andrea.")
    expect(createWords(req("rq-rosa"), null, false, "quote")).toBe("Add Rosa Delgado as a customer and open a quote to price and send. Nothing is sent to Rosa yet.")
    expect(createWords(req("rq-andrea"), matchOf(req("rq-andrea")), false, "job")).toBe("Create a job for Andrea Dalton, who is already a customer. Nothing is sent to Andrea.")
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
  it("lists the open requests, New first, with the match as a chip and a status pill; one that became a job has left", () => {
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
  it("shows New with Send a quote as the primary for a service with no price, Create job and Archive beside it, Mark as seen under More", () => {
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByRole("heading", { level: 1, name: "Rosa Delgado" })).toBeInTheDocument()
    expect(screen.getByText("New", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(footerButtons().slice(0, 3)).toEqual(["Send a quote", "Create job", "Archive"])
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
    expect(screen.getAllByText("No match").length).toBeGreaterThan(0)
  })
  it("leads with Create job for a priced service", () => {
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
  it("states the effect in the Create job dialog, then says the request became a job", async () => {
    const onCreateJob = vi.fn(() => ({ jobId: "q-rosa", customerId: "other-rosa-delgado" }))
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    fireEvent.click(screen.getByRole("button", { name: "Create job" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Create job" })).toBeInTheDocument()
    expect(within(dialog).getByText(/^Add Rosa Delgado as a customer and create a Christmas lights job\. Nothing is sent to Rosa\./)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Create job" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-rosa" }), { asNew: false, mode: "job", service: { name: "Christmas lights" } })
    expect(await screen.findByRole("heading", { level: 1, name: "This request became a job" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=q-rosa")
    expect(screen.queryByText("Accepted")).toBeNull()
  })
  it("Send a quote moves the request into the job and hands the host the job to open", async () => {
    const onCreateJob = vi.fn(() => ({ jobId: "q-rosa", customerId: "other-rosa-delgado" }))
    const onJobCreated = vi.fn()
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} onJobCreated={onJobCreated} />)
    fireEvent.click(screen.getByRole("button", { name: "Send a quote" }))
    const dialog = screen.getByRole("dialog")
    // the request named a catalogue service, so the sheet starts with it chosen and says the exact effect
    expect(within(dialog).getByRole("combobox", { name: "What is this for?" })).toHaveValue("lights")
    expect(within(dialog).getByText("Add Rosa Delgado as a customer and open a Christmas lights quote to price and send. Nothing is sent to Rosa yet.")).toBeInTheDocument()
    expect(within(dialog).getByText("New customer")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send a quote" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-rosa" }), { asNew: false, mode: "quote", service: { name: "Christmas lights" } })
    expect(onJobCreated).toHaveBeenCalledWith("q-rosa", "Job created for Rosa Delgado", "quote")
  })
  const ben = (): RequestData => ({ ...req("rq-ben"), archived: undefined, seen: false, service: "" })
  it("starts the sheet empty when the request named no service: the button is off and one quiet line says what is missing, until a choice is made", () => {
    const onCreateJob = vi.fn(() => ({ jobId: "q-ben", customerId: "other-ben-harlan" }))
    render(<RequestPage request={ben()} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    expect(screen.getAllByText("Not said").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "Create job" }))
    const dialog = screen.getByRole("dialog")
    const picker = within(dialog).getByRole("combobox", { name: "What is this for?" })
    expect(picker).toHaveValue("")
    expect(within(dialog).getByText("Add Ben Harlan as a customer and create a job. Nothing is sent to Ben.")).toBeInTheDocument()
    expect(within(dialog).getAllByText("Choose what this is for.")).toHaveLength(1)
    expect(within(dialog).getByRole("button", { name: "Create job" })).toBeDisabled()
    fireEvent.change(picker, { target: { value: "repair" } })
    expect(within(dialog).queryByText("Choose what this is for.")).toBeNull()
    expect(within(dialog).getByText("Add Ben Harlan as a customer and create a Sprinkler repair job. Nothing is sent to Ben.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Create job" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-ben" }), { asNew: false, mode: "job", service: { name: "Sprinkler repair", price: 145 } })
  })
  it("ends the list with Something else, which asks for a name and makes a job with that name and no price", () => {
    const onCreateJob = vi.fn(() => ({ jobId: "q-ben", customerId: "other-ben-harlan" }))
    render(<RequestPage request={ben()} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    fireEvent.click(screen.getByRole("button", { name: "Create job" }))
    const dialog = screen.getByRole("dialog")
    const options = within(dialog).getAllByRole("option").map((o) => o.textContent)
    expect(options.at(-1)).toBe("Something else")
    expect(options).not.toContain("Season Pass 2027")
    fireEvent.change(within(dialog).getByRole("combobox", { name: "What is this for?" }), { target: { value: "else" } })
    expect(within(dialog).getByRole("button", { name: "Create job" })).toBeDisabled()
    expect(within(dialog).getByText("Name the job.")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name of the job" }), { target: { value: "Drip line for the garden" } })
    expect(within(dialog).getByText("Add Ben Harlan as a customer and create a Drip line for the garden job. Nothing is sent to Ben.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Create job" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.anything(), { asNew: false, mode: "job", service: { name: "Drip line for the garden" } })
  })
  it("lets Ryan change the preselected service before he confirms", () => {
    const onCreateJob = vi.fn(() => ({ jobId: "q-kevin", customerId: "other-kevin-marsh" }))
    render(<RequestPage request={req("rq-kevin")} now={REQUESTS_NOW} markSeenOnOpen={false} onCreateJob={onCreateJob} />)
    fireEvent.click(screen.getByRole("button", { name: "Create job" }))
    const dialog = screen.getByRole("dialog")
    const picker = within(dialog).getByRole("combobox", { name: "What is this for?" })
    expect(picker).toHaveValue("big-repair")
    fireEvent.change(picker, { target: { value: "repair" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Create job" }))
    expect(onCreateJob).toHaveBeenCalledWith(expect.anything(), { asNew: false, mode: "job", service: { name: "Sprinkler repair", price: 145 } })
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
  it("has no actions on an archived request, and a request that became a job opens a plain page with the job", () => {
    const { unmount } = render(<RequestPage request={req("rq-ben")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.queryByRole("button", { name: "Create job" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Send a quote" })).toBeNull()
    unmount()
    render(<RequestPage request={req("rq-beth")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByRole("heading", { level: 1, name: "This request became a job" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=q-beth")
    expect(screen.getAllByRole("link", { name: /Job: Christmas lights/ }).length).toBeGreaterThan(0)
  })
})

describe("request store", () => {
  beforeEach(() => requestStore.reset())
  it("marks Seen once, makes a job and archives, and Start over forgets it", () => {
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-rosa")!)).toBe("new")
    requestStore.markSeen("rq-rosa")
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-rosa")!)).toBe("seen")
    requestStore.becomeJob("rq-andrea", { jobId: "q-andrea", customerId: "andrea", at: REQUESTS_NOW })
    expect(requestStore.getSnapshot().find((r) => r.id === "rq-andrea")!.becameJob).toMatchObject({ jobId: "q-andrea" })
    expect(newCount(requestStore.getSnapshot())).toBe(0)
    requestStore.archive("rq-kevin", "Spam", REQUESTS_NOW)
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-kevin")!)).toBe("archived")
    requestStore.reset()
    expect(newCount(requestStore.getSnapshot())).toBe(2)
  })
  it("turns what the booking form sent into a New request outside Customers", () => {
    const r = fromSent({ id: "rq-sent", at: "2026-11-18T17:00:00Z", first: "Sam", last: "Ito", phone: "(970) 555-0100", email: "sam@example.com", contact: "text", street: "1 Oak St", town: "Erie", serviceKey: "lights", serviceName: "Christmas lights", words: "Roofline.", photos: [{ name: "a.jpg", src: "data:image/svg+xml;utf8,x" }] })
    expect(stateOf(r)).toBe("new")
    expect(r.service).toBe("Christmas lights")
    expect(r.photos).toHaveLength(1)
    expect(r.becameJob).toBeUndefined()
  })
})
