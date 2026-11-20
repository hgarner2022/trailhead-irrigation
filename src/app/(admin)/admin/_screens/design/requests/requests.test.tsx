import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { RequestPage } from "./RequestPage"
import { RequestsList } from "./RequestsList"
import { acceptWords } from "./RequestDialogs"
import { ARCHIVE_REASONS, REQUESTS_NOW, REQUEST_FIXTURES, listOrder, matchOf, newCount, stateOf, type RequestData } from "./request-model"
import { fromSent, requestStore } from "./request-store"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

const req = (id: string): RequestData => REQUEST_FIXTURES.find((r) => r.id === id)!

describe("request states", () => {
  it("reads New, Seen, Accepted and Archived from the facts", () => {
    expect(REQUEST_FIXTURES.map((r) => [r.id, stateOf(r)])).toEqual([
      ["rq-rosa", "new"],
      ["rq-andrea", "new"],
      ["rq-kevin", "seen"],
      ["rq-beth", "accepted"],
      ["rq-dana", "accepted"],
      ["rq-ben", "archived"],
      ["rq-june", "archived"],
    ])
    // archived wins over accepted, accepted over seen
    expect(stateOf({ ...req("rq-beth"), archived: { reason: "Duplicate", at: "x" } })).toBe("archived")
    expect(stateOf({ ...req("rq-rosa"), seen: true })).toBe("seen")
  })
  it("orders New first, then Seen, Accepted and Archived, newest first inside each", () => {
    expect(listOrder(REQUEST_FIXTURES).map((r) => r.id)).toEqual(["rq-rosa", "rq-andrea", "rq-kevin", "rq-dana", "rq-beth", "rq-ben", "rq-june"])
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
  it("words Accept as a new customer or as a job under the match, and says nothing is sent", () => {
    expect(acceptWords(req("rq-rosa"), null, false)).toBe("Add Rosa Delgado as a customer and create a job that needs a quote. Nothing is sent to Rosa.")
    expect(acceptWords(req("rq-andrea"), matchOf(req("rq-andrea")), false)).toBe("Create a job that needs a quote for Andrea Dalton, who is already a customer. Nothing is sent to Andrea.")
    expect(acceptWords(req("rq-andrea"), matchOf(req("rq-andrea")), true)).toMatch(/^Add Andrea Dalton as a customer/)
  })
})

describe("Requests list", () => {
  it("lists every request, New first, with the match as a chip and a status pill", () => {
    render(<RequestsList requests={REQUEST_FIXTURES} now={REQUESTS_NOW} onOpen={() => undefined} />)
    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(8)
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
  it("shows New with Accept as the primary, Archive beside it and Mark as seen under More", () => {
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByRole("heading", { level: 1, name: "Rosa Delgado" })).toBeInTheDocument()
    expect(screen.getByText("New", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument()
    expect(screen.getAllByText("No match").length).toBeGreaterThan(0)
  })
  it("writes Seen once when a New request is opened", () => {
    const onSeen = vi.fn()
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} onSeen={onSeen} />)
    expect(onSeen).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Seen", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
  })
  it("names the match as a chip and keeps waiting for Accept", () => {
    render(<RequestPage request={req("rq-andrea")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByText("A match is a hint. The request waits until you accept it.")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Customer: Andrea Dalton/ }).length).toBeGreaterThan(0)
  })
  it("states the effect in the Accept dialog, then shows the job and its stage", async () => {
    const onAccept = vi.fn(() => ({ jobId: "q-rosa", customerId: "other-rosa-delgado" }))
    render(<RequestPage request={req("rq-rosa")} now={REQUESTS_NOW} markSeenOnOpen={false} onAccept={onAccept} />)
    fireEvent.click(screen.getByRole("button", { name: "Accept" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Add Rosa Delgado as a customer and create a job that needs a quote. Nothing is sent to Rosa.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Accept" }))
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ id: "rq-rosa" }), { asNew: false })
    expect(await screen.findByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=q-rosa")
    expect(screen.getAllByText("Needs a quote").length).toBeGreaterThan(0)
    expect(screen.getByText("Accepted", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
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
  it("has no actions on an archived request and one link on an accepted one", () => {
    const { unmount } = render(<RequestPage request={req("rq-ben")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
    unmount()
    render(<RequestPage request={req("rq-beth")} now={REQUESTS_NOW} markSeenOnOpen={false} />)
    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute("href", "/admin/jobs?job=q-beth")
  })
})

describe("request store", () => {
  beforeEach(() => requestStore.reset())
  it("marks Seen once, accepts and archives, and Start over forgets it", () => {
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-rosa")!)).toBe("new")
    requestStore.markSeen("rq-rosa")
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-rosa")!)).toBe("seen")
    requestStore.accept("rq-andrea", { jobId: "q-andrea", customerId: "andrea", at: REQUESTS_NOW })
    expect(stateOf(requestStore.getSnapshot().find((r) => r.id === "rq-andrea")!)).toBe("accepted")
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
    expect(r.accepted).toBeUndefined()
  })
})
