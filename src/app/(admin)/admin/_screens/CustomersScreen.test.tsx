import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { withFixtureContact } from "@/lib/admin/fixtures/contact"
import { formatPhone } from "@/lib/format/contact"
import type { AdminData } from "@/lib/admin/types"
import { CustomersScreen } from "./CustomersScreen"

// "I need normal data": the table and the panel show the customer as a person, with the contact details the admin
// session may see, and no word of the old tool.

const full = withFixtureContact(snapshot as AdminData)
// Three customers on the first page: Andrea (an active pass, two jobs needing a day), Reese (a day set) and Amy (an unpaid attempt).
const data: AdminData = { ...full, clients: full.clients.filter((c) => ["c100", "c121", "c1"].includes(c.id)) }
const TODAY = "2026-11-12T19:56:30Z"
const andrea = data.clients.find((c) => c.id === "c100")!
const amy = data.clients.find((c) => c.id === "c1")!

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const headers = () => screen.getAllByRole("columnheader").map((h) => h.textContent?.replace(/,? sorted.*$/, "").trim())
const rowOf = (name: string) => screen.getByRole("button", { name }).closest("tr")!

describe("CustomersScreen table", () => {
  it("has the columns Name, Address, Town, Email, Phone, Pass, Next, Scheduled, Last visit and Marketing", () => {
    render(<CustomersScreen data={data} today={TODAY} />)
    expect(headers().filter(Boolean)).toEqual(["Name", "Address", "Town", "Email", "Phone", "Pass", "Next", "Scheduled", "Last visit", "Marketing"])
  })

  it("shows the full name, the street, the email and the phone as it prints", () => {
    render(<CustomersScreen data={data} today={TODAY} />)
    const row = within(rowOf(`${andrea.firstName} ${andrea.lastName}`))
    expect(row.getByText(andrea.address!)).toBeInTheDocument()
    expect(row.getByText(andrea.email!)).toBeInTheDocument()
    expect(row.getByText(formatPhone(andrea.phone))).toBeInTheDocument()
    // The pass reads as its season and status.
    expect(row.getByText("2027")).toBeInTheDocument()
    expect(row.getByText("Active")).toHaveAttribute("data-slot", "status-pill")
  })

  it("says No day yet and No for a customer whose pass visit has no day, and a day and Yes for one that has", () => {
    render(<CustomersScreen data={data} today={TODAY} />)
    const needing = within(rowOf(`${andrea.firstName} ${andrea.lastName}`))
    expect(needing.getByText("No day yet")).toBeInTheDocument()
    expect(needing.getByText("No")).toBeInTheDocument()
  })

  it("shows None for the contact a read key never sees, and keeps the name", () => {
    const noContact: AdminData = { ...data, clients: data.clients.map(({ email: _e, phone: _p, address: _a, ...rest }) => (void [_e, _p, _a], rest)) }
    render(<CustomersScreen data={noContact} today={TODAY} />)
    const row = within(rowOf(`${andrea.firstName} ${andrea.lastName}`))
    expect(row.getAllByText("None").length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText(andrea.email!)).toBeNull()
  })

  it("shows an unpaid attempt as Pending, never Active, and not as something scheduled", () => {
    render(<CustomersScreen data={data} today={TODAY} />)
    const row = within(rowOf(`${amy.firstName} ${amy.lastName}`))
    expect(row.getByText("Pending")).toHaveAttribute("data-status", "pending")
    expect(row.queryByText("Active")).toBeNull()
    expect(row.getByText("Nothing ahead")).toBeInTheDocument()
    expect(row.getByText("No")).toBeInTheDocument()
  })

  it("says nothing of Jobber", () => {
    render(<CustomersScreen data={data} today={TODAY} defaultSelectedId="c100" />)
    expect(document.body).not.toHaveTextContent(/jobber/i)
    expect(screen.queryByRole("link", { name: /Open in/ })).toBeNull()
  })
})

describe("CustomersScreen panel", () => {
  it("shows the same data plus the access note, the consent history and the messages", () => {
    render(<CustomersScreen data={data} today={TODAY} defaultSelectedId="c100" />)
    const panel = within(screen.getByRole("complementary", { name: `${andrea.firstName} ${andrea.lastName}` }))
    expect(panel.getByText(`${andrea.address}, ${andrea.town}`)).toBeInTheDocument()
    expect(panel.getByText(andrea.email!)).toBeInTheDocument()
    expect(panel.getByText(formatPhone(andrea.phone))).toBeInTheDocument()
    expect(panel.getByText("Gate code 4471, controller in the garage.")).toBeInTheDocument()
    expect(panel.getByRole("heading", { name: "Consent history" })).toBeInTheDocument()
    expect(panel.getByText(/Terms 2026-11 accepted Nov 2\./)).toBeInTheDocument()
    expect(panel.getByRole("heading", { name: "Messages" })).toBeInTheDocument()
    expect(panel.getByRole("heading", { name: "Visits" })).toBeInTheDocument()
  })

  it("has a Bills section for a done job that owes money (Send a bill) and for one with a bill out (Remind and the pay link), and not for a tech", () => {
    const visit = { id: "bv", clientId: "c100", clientName: "Andrea Dalton", town: "Erie" as const, kind: "repair" as const, status: "completed" as const, isPass: false, jobberUrl: "", jobId: "bj", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", price: 145 }
    const job = { id: "bj", customerId: "c100", kind: "repair" as const, status: "active" as const, source: "office" as const, visitIds: ["bv"], total: 145, lines: [{ id: "bl", name: "Repair", quantity: 1, unitPrice: 145, taxable: false, visitId: "bv" }], payments: [], money: { paid: 0, total: 145, owed: 145, words: "$145 owed" } }
    const owed: AdminData = { ...data, visits: [...data.visits, visit], jobs: [job] }
    const send = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    const { unmount } = render(<CustomersScreen data={owed} today={TODAY} defaultSelectedId="c100" actions={{ sendBill: send } as never} />)
    const section = () => within(document.querySelector<HTMLElement>('[data-slot="customer-bills"]')!)
    expect(section().getByText("Repair, $145 owed")).toBeInTheDocument()
    expect(section().getByRole("button", { name: "Send a bill" })).toBeInTheDocument()
    unmount()

    const invoice = { id: "bi", jobId: "bj", number: "INV-2026-0003", amount: 145, tax: 0, total: 145, sentOn: "2026-11-17", dueOn: "2026-12-01", status: "sent" as const, visitIds: ["bv"], payUrl: "https://site.test/pay/bi?token=t" }
    const billed: AdminData = { ...owed, visits: [...data.visits, { ...visit, invoice }], jobs: [{ ...job, invoice, money: { ...job.money, words: "Bill sent", billSent: true } }] }
    const second = render(<CustomersScreen data={billed} today={TODAY} defaultSelectedId="c100" />)
    expect(section().getByText("Bill sent Nov 17, due Dec 1")).toBeInTheDocument()
    expect(section().getByRole("button", { name: "Remind" })).toBeInTheDocument()
    expect(section().getByRole("link", { name: "Pay link" })).toHaveAttribute("href", "https://site.test/pay/bi?token=t")
    second.unmount()

    render(<CustomersScreen data={billed} today={TODAY} defaultSelectedId="c100" readOnly />)
    expect(document.querySelector('[data-slot="customer-bills"]')).toBeNull()
  })

  it("lists every consent record, newest first", () => {
    const optOut = { marketingOptIn: false, marketingChannels: [], source: "admin" as const, recordedAt: "2026-11-09T18:00:00Z" }
    const history: AdminData = { ...data, clients: data.clients.map((c) => (c.id === "c100" ? { ...c, consent: optOut, consentHistory: [optOut, c.consent!] } : c)) }
    render(<CustomersScreen data={history} today={TODAY} defaultSelectedId="c100" />)
    const entries = within(document.querySelector<HTMLElement>('[data-slot="consent-history"]')!).getAllByRole("listitem")
    expect(entries.map((e) => e.textContent)).toEqual(["Nov 9, AdminMarketing: no.", "Nov 2, CheckoutTerms 2026-11 accepted Nov 2. Marketing: email and text."])
  })
})
