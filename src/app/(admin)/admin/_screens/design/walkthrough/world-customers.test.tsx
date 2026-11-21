import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ToastProvider } from "@/components/blocks/Toast"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import { customerStatusOf } from "@/lib/customers/status"
import { CustomerPage } from "../CustomerPage"
import { AS_OF } from "../customer-fixtures"
import { KNOWN_CUSTOMERS, REQUEST_FIXTURES } from "../requests/request-model"
import { requestStore } from "../requests/request-store"
import { walkQuotes } from "../quotes/quote-store"
import { createJobFromRequest } from "./WalkRequests"
import { allRows, customerIdOf, customerOfJob, customerPage, customerRows, INVOICES, knownRoute, nameOfRoute, resetExtras, searchWorld } from "./data"
import { makeNewJobActions } from "./walk-new-job"
import { WORLD_CUSTOMERS } from "./world-customers"

// Every customer of the walkthrough's world has a real customer page (docs/plans/2026-11-20-handoff.md, gap 2): the chip on a job, an invoice or a quote, a
// row of the Customers list, a Cmd+K hit and a Requests match all open one, built from that customer's jobs, invoices, payments, messages and consent, with
// the status read by `customerStatusOf`. A customer with nothing for a section shows that section's empty state.

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 768px)" || query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  resetExtras()
  requestStore.reset()
  walkQuotes.reset()
})

const quoteJobs = () => Object.values(walkQuotes.getSnapshot())

describe("every customer resolves to a page", () => {
  it("opens from every chip: each job's customer, each invoice's, each quote's, each request match and each row of the list", () => {
    const ids = new Set<string>([
      ...allRows().map((r) => customerIdOf(r.name)),
      ...allRows().map((r) => customerOfJob(r.id)),
      ...INVOICES.map((i) => i.customerId),
      ...quoteJobs().map((j) => j.customerId),
      ...KNOWN_CUSTOMERS.map((c) => c.id),
      ...customerRows().map((r) => r.id),
      ...Object.keys(WORLD_CUSTOMERS),
    ])
    expect(ids.size).toBeGreaterThan(18)
    for (const id of ids) {
      const page = customerPage(id)
      expect(page, id).not.toBeNull()
      expect(knownRoute({ screen: "customer", id }), id).toBe(true)
      expect(nameOfRoute({ screen: "customer", id }), id).toBe(page!.name)
      expect(page!.id).toBe(id)
    }
  })

  it("keeps the placeholder only for an id that does not exist", () => {
    expect(customerPage("other-nobody-here")).toBeNull()
    expect(knownRoute({ screen: "customer", id: "other-nobody-here" })).toBe(false)
  })

  it("reads each status from the jobs, never typed: the page's status is the function's answer for its own facts", () => {
    for (const r of customerRows()) {
      const p = customerPage(r.id)!
      expect(p.status, r.id).toBe(customerStatusOf(p.statusFacts, AS_OF))
    }
  })

  it("lists every customer of the world, and Cmd+K finds each of them with the status in its detail", () => {
    const names = customerRows().map((r) => r.name)
    expect(names).toEqual(expect.arrayContaining(["Beth Orr", "Dana Cho", "Tom Becker", "Reese Holloway", "Nora Quinn", "Joe Alvarez"]))
    for (const r of customerRows()) {
      const hit = searchWorld(r.name).find((h) => h.kind === "customer" && h.id === r.id)
      expect(hit, r.name).toBeTruthy()
      expect(hit!.href).toBe(`/admin/customers?customer=${r.id}`)
    }
    expect(searchWorld("Beth Orr").find((h) => h.kind === "customer")!.detail).toBe("33 Aspen Ct, Lafayette · New")
  })

  it("agrees with the quote, the invoice and the request about how to reach each person", () => {
    for (const j of quoteJobs()) {
      const p = customerPage(j.customerId)!
      expect(p.contact.phone.text, j.customer).toBe(j.phone)
      expect(p.contact.email, j.customer).toBe(j.email)
    }
    for (const c of KNOWN_CUSTOMERS) {
      const p = customerPage(c.id)!
      expect(p.contact.phone.text, c.name).toBe(c.phone)
      expect(p.contact.email.toLowerCase(), c.name).toBe(c.email.toLowerCase())
    }
  })
})

describe("a customer built from their records", () => {
  it("Reese: one done job and the past-due invoice for it, no card, an email contact", () => {
    const p = customerPage("other-reese-holloway")!
    expect(p).toMatchObject({ name: "Reese Holloway", status: "active", unpaid: "$124", contact: { channel: "email" } })
    expect(p.jobs).toHaveLength(1)
    expect(p.jobs[0]).toMatchObject({ id: "g-reese", name: "Fall blowout", statusLabel: "Done", money: { word: "Past due since Nov 17", tone: "past-due" } })
    expect(p.billing).toMatchObject({ line: "Past due since Nov 17", tone: "past-due", total: "$124", paid: "$0", unpaid: "$124" })
    expect(p.billing.invoices).toHaveLength(1)
    expect(p.billing.payments).toHaveLength(0)
    expect(p.band.card).toEqual({ value: "No card", sub: "Add one when you collect" })
  })

  it("Dana: a paid job with its card payment and a job that needs a quote, so her facts come from both", () => {
    const p = customerPage("other-dana-cho")!
    expect(p.jobs.map((j) => j.statusLabel).sort()).toEqual(["Done", "Needs a quote"])
    expect(p.billing).toMatchObject({ line: "Paid in full", settled: "paid", paid: "$115", unpaid: "$0" })
    expect(p.billing.payments[0]).toMatchObject({ how: "Card", amount: "$115", invoiceId: "inv-33" })
    expect(p.billing.card).toMatchObject({ last4: "4242" })
    expect(p.status).toBe("active")
    expect(p.notes.some((n) => /Created from a request/.test(n.what))).toBe(true)
  })

  it("Beth: a quote is out and nothing else has happened, so she is New and every money section is empty", () => {
    const p = customerPage("other-beth-orr")!
    expect(p.status).toBe("new")
    expect(p.jobs).toHaveLength(1)
    expect(p.jobs[0]).toMatchObject({ statusLabel: "Quote sent", quote: "quote-sent" })
    expect(p.billing).toMatchObject({ line: "Nothing billed yet", total: "$0" })
    expect(p.billing.invoices).toEqual([])
    expect(p.billing.payments).toEqual([])
    expect(p.messages).toEqual([])
    expect(p.band.next).toEqual({ value: "None", sub: "Nothing scheduled" })
    expect(p.notes.some((n) => /Sent quote Q-2026-0007 by email/.test(n.what))).toBe(true)
  })

  it("Nora: the approved quote's deposit is a payment of its own and the job is ahead of her, so she is Active", () => {
    const p = customerPage("other-nora-quinn")!
    expect(p.status).toBe("active")
    expect(p.billing.payments).toEqual([expect.objectContaining({ how: "Card", amount: "$200", note: "Deposit" })])
    expect(p.billing).toMatchObject({ line: "$200 deposit paid", settled: "paid" })
    expect(p.jobs[0]).toMatchObject({ statusLabel: "Unscheduled", open: true })
  })

  it("Owen declined his quote: the job is canceled and he is New, not a customer yet", () => {
    const p = customerPage("other-owen-pratt")!
    expect(p.jobs[0]).toMatchObject({ statusLabel: "Canceled", open: false })
    expect(p.status).toBe("new")
  })

  it("Tom: a canceled job with its canceled invoice, a job still to schedule, and the Do not service mark", () => {
    const p = customerPage("other-tom-becker")!
    expect(p.doNotService).toBeTruthy()
    expect(p.jobs.map((j) => j.statusLabel).sort()).toEqual(["Canceled", "Unscheduled"])
    expect(p.billing.invoices[0]).toMatchObject({ statusLabel: "Canceled" })
    expect(p.billing).toMatchObject({ line: "Nothing billed yet", unpaid: "$0" })
  })

  it("Lena: two jobs, an invoice that is out, a card and marketing email on", () => {
    const p = customerPage("other-lena-park")!
    expect(p.jobs).toHaveLength(2)
    expect(p.unpaid).toBe("$230")
    expect(p.band.unpaid).toMatchObject({ value: "$230", invoiceId: "inv-41" })
    expect(p.consent.email.on).toBe(true)
    expect(p.band.card).toEqual({ value: "Visa 3355", sub: "Expires 09/28" })
  })
})

describe("a customer made in the prototype", () => {
  it("a request turned into a job has a page with the request's contact details", () => {
    const rosa = REQUEST_FIXTURES.find((r) => r.id === "rq-rosa")!
    const { customerId } = createJobFromRequest(rosa, { asNew: true, mode: "quote", service: { name: "Christmas lights" } })
    const p = customerPage(customerId)
    expect(p).toMatchObject({ name: "Rosa Delgado", status: "new" })
    expect(p!.contact.email).toBe(rosa.email)
    expect(p!.contact.phone.text).toBe(rosa.phone)
    expect(p!.jobs).toHaveLength(1)
    expect(customerRows().some((r) => r.id === customerId)).toBe(true)
  })

  it("a new customer typed into New job has a page the moment the job exists", async () => {
    const actions = makeNewJobActions(() => undefined)
    const out = await actions.createVisit({ newCustomer: { firstName: "Mia", lastName: "Cole", phone: "(970) 555-0101", email: "mia.cole@example.com", property: { address: "3 Rye Ct", town: "Erie" } }, serviceKey: "spring-turn-on" } as never)
    expect(out.ok).toBe(true)
    const p = customerPage(customerIdOf("Mia Cole"))
    expect(p).toMatchObject({ name: "Mia Cole", status: "active" })
    expect(p!.contact.phone.text).toBe("(970) 555-0101")
    expect(p!.address).toEqual(["3 Rye Ct", "Erie, CO"])
  })
})

describe("the page renders", () => {
  const show = (id: string) =>
    render(
      <ToastProvider>
        <UndoToastProvider>
          <CustomerPage customer={customerPage(id)!} />
        </UndoToastProvider>
      </ToastProvider>,
    )

  it("shows each section's honest empty state for a customer with nothing in it", () => {
    show("other-beth-orr")
    expect(screen.getByRole("heading", { name: "Beth Orr" })).toBeInTheDocument()
    expect(screen.getByText("No messages yet")).toBeInTheDocument()
    expect(screen.getByText(/No invoice or payment yet/)).toBeInTheDocument()
  })

  it("shows the jobs, the invoice and the payment of a customer who has them", () => {
    show("other-dana-cho")
    expect(screen.getByRole("heading", { name: "Dana Cho" })).toBeInTheDocument()
    expect(screen.getAllByText("INV-2026-0033").length).toBeGreaterThan(0)
  })
})
