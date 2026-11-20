import { useState } from "react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { withFixtureContact } from "@/lib/admin/fixtures/contact"
import { SERVICES } from "@/lib/services"
import type { AdminData, Client } from "@/lib/admin/types"
import { NewJob } from "./NewJob"
import { cardOnFileLine, priceLine } from "./NewJobPass"
import { servicePriceLine } from "./NewJobService"
import { choiceReady, emptyChoice, newCustomerFrom, EMPTY_PERSON } from "./CustomerPicker"
import type { VisitActions } from "./visit-actions-types"

const data = withFixtureContact(snapshot as AdminData)
const TODAY = "2026-11-12T19:56:30Z"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

function open() {
  const actions = {
    createVisit: vi.fn(async () => ({ ok: true as const, data: { id: "v1", jobId: "j1" } })),
    sellPass: vi.fn(async () => ({ ok: true as const, data: { id: "p1", number: "TP-1", firstName: "Andrea" } })),
  }
  render(<NewJob data={data} today={TODAY} open onOpenChange={() => undefined} customerId="c100" actions={actions as unknown as VisitActions} />)
  return actions
}
const choose = (value: string) => userEvent.selectOptions(screen.getByLabelText("What are we doing?"), value)

function openWithQuotes() {
  const actions = {
    createVisit: vi.fn(async () => ({ ok: true as const, data: { id: "v1", jobId: "j1" } })),
    sellPass: vi.fn(),
  }
  const onCreated = vi.fn()
  render(<NewJob data={data} today={TODAY} open onOpenChange={() => undefined} customerId="c100" actions={actions as unknown as VisitActions} quotes onCreated={onCreated} />)
  return { actions, onCreated }
}
const actionNames = () => Array.from(document.querySelectorAll("[data-slot=new-job-actions] button")).map((b) => b.textContent)

describe("New job and quotes", () => {
  it("leads with Add job for a priced service and offers Add and send a quote beside it", async () => {
    const { actions, onCreated } = openWithQuotes()
    await choose("repair")
    expect(actionNames()).toEqual(["Add job", "Add and send a quote"])
    await userEvent.click(screen.getByRole("button", { name: "Add and send a quote" }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ visitId: "v1", jobId: "j1", quote: true }))
    expect(actions.createVisit).toHaveBeenCalledWith(expect.objectContaining({ serviceKey: "repair", sendQuote: true }))
  })
  it("leads with Add and send a quote for a service with no catalogue price, and says it needs a price", async () => {
    openWithQuotes()
    await choose("lights")
    expect(actionNames()).toEqual(["Add and send a quote", "Add job"])
    expect(screen.getByText(/Needs a price before it can be scheduled\./)).toBeInTheDocument()
  })
  it("has only Add job when the host has no quotes", async () => {
    open()
    await choose("lights")
    expect(actionNames()).toEqual(["Add job"])
  })
})

describe("New job", () => {
  it("lists Season Pass first, then the services", () => {
    open()
    const options = [...(screen.getByLabelText("What are we doing?") as HTMLSelectElement).options].map((o) => o.value).filter(Boolean)
    expect(options[0]).toBe("season-pass")
    expect(options).toContain("repair")
  })

  it("forgets the chosen service when it closes, so the next New job starts blank", async () => {
    function Host() {
      const [isOpen, setOpen] = useState(true)
      return (
        <>
          <button onClick={() => setOpen(true)}>Again</button>
          <NewJob data={data} today={TODAY} open={isOpen} onOpenChange={setOpen} customerId="c100" actions={{} as VisitActions} />
        </>
      )
    }
    render(<Host />)
    await choose("repair")
    expect((screen.getByLabelText("What are we doing?") as HTMLSelectElement).value).toBe("repair")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByLabelText("What are we doing?")).toBeNull())
    await userEvent.click(screen.getByRole("button", { name: "Again" }))
    expect((screen.getByLabelText("What are we doing?") as HTMLSelectElement).value).toBe("")
  })

  it("with no day Add job is on, says nothing is sent, and the job is made with no day and no time", async () => {
    const actions = open()
    await choose("repair")
    expect(screen.getByLabelText("Day (optional)")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Add job" })).toBeEnabled()
    expect(screen.getByText(/No day yet, nothing is sent/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(actions.createVisit).toHaveBeenCalledTimes(1))
    const sent = (actions.createVisit.mock.calls as unknown[][])[0]![0]
    expect(sent).not.toHaveProperty("scheduledOn")
    expect(sent).not.toHaveProperty("startTime")
  })

  it("with a day it says the customer is told, sends the day, and Time stays Any time unless one is picked", async () => {
    const actions = open()
    await choose("repair")
    await userEvent.type(screen.getByLabelText("Day (optional)"), "2026-11-20")
    expect(screen.getByText(/With a day, the customer is told/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(actions.createVisit).toHaveBeenCalledTimes(1))
    const sent = (actions.createVisit.mock.calls as unknown[][])[0]![0]
    expect(sent).toMatchObject({ scheduledOn: "2026-11-20" })
    expect(sent).not.toHaveProperty("startTime")
  })

  it("after Add job hands the new job's and visit's ids to the screen, which opens the record it shows", async () => {
    const actions = { createVisit: vi.fn(async () => ({ ok: true as const, data: { id: "v9", jobId: "j9" } })), sellPass: vi.fn() }
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    render(<NewJob data={data} today={TODAY} open onOpenChange={onOpenChange} customerId="c100" actions={actions as unknown as VisitActions} onCreated={onCreated} />)
    await choose("repair")
    await userEvent.click(screen.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ visitId: "v9", jobId: "j9" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("choosing Repair shows what it includes and $145, then the day and Add job", async () => {
    open()
    await choose("repair")
    expect(screen.getByText(SERVICES.repair!.description)).toBeInTheDocument()
    expect(screen.getByText("$145")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add job" })).toBeEnabled()
    expect(screen.queryByLabelText("Zones")).toBeNull()
  })

  it("choosing a per-zone service reads its price rule", async () => {
    open()
    await choose("blowout")
    expect(screen.getByText("$95 up to 6 zones, then $10 a zone")).toBeInTheDocument()
  })

  it("choosing a banded service shows a zones box and the price follows it, still editable", async () => {
    const actions = open()
    await choose("blowout")
    const zones = screen.getByLabelText("Zones")
    expect(zones).toHaveValue(6)
    await userEvent.click(screen.getByText("More details"))
    expect(screen.getByLabelText("Price")).toHaveValue("95")
    await userEvent.clear(zones)
    await userEvent.type(zones, "10")
    expect(screen.getByLabelText("Price")).toHaveValue("135")
    await userEvent.clear(screen.getByLabelText("Price"))
    await userEvent.type(screen.getByLabelText("Price"), "100")
    await userEvent.click(screen.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(actions.createVisit).toHaveBeenCalledTimes(1))
    expect(actions.createVisit).toHaveBeenCalledWith(expect.objectContaining({ serviceKey: "blowout", price: 100 }))
    expect((actions.createVisit.mock.calls as unknown[][])[0]![0]).not.toHaveProperty("zones")
  })

  it("choosing Season Pass shows the zones and a date box per visit", async () => {
    open()
    await choose("season-pass")
    expect(screen.getByLabelText("Zones")).toBeInTheDocument()
    expect(screen.getByLabelText("Spring turn-on")).toBeInTheDocument()
    expect(screen.getByLabelText("Fall blowout")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sell pass" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add job" })).toBeNull()
  })

  it("submitting a repair calls createVisit with serviceKey repair, the service's minutes and price", async () => {
    const actions = open()
    await choose("repair")
    await userEvent.click(screen.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(actions.createVisit).toHaveBeenCalledTimes(1))
    expect(actions.createVisit).toHaveBeenCalledWith(expect.objectContaining({ customerId: "c100", serviceKey: "repair", durationMinutes: 120, price: 145 }))
    expect(actions.sellPass).not.toHaveBeenCalled()
  })

  it("submitting a pass calls sellPass once the terms are read", async () => {
    const actions = open()
    await choose("season-pass")
    expect(screen.getByRole("button", { name: "Sell pass" })).toBeDisabled()
    await userEvent.click(screen.getByLabelText("Terms read and accepted"))
    await userEvent.click(screen.getByRole("button", { name: "Sell pass" }))
    await waitFor(() => expect(actions.sellPass).toHaveBeenCalledTimes(1))
    expect(actions.sellPass).toHaveBeenCalledWith(expect.objectContaining({ customerId: "c100", zones: 8, paysBy: "card-link", termsAccepted: true }))
    expect(actions.createVisit).not.toHaveBeenCalled()
  })
})

describe("Pays by for a customer who has a card", () => {
  it("says the card is on file, hides the at-each-visit choice and sells on the card", async () => {
    const actions = { createVisit: vi.fn(), sellPass: vi.fn(async () => ({ ok: true as const, data: { id: "p1", number: "TP-1", firstName: "Andrea" } })) }
    const withCard = { ...data, clients: data.clients.map((c: Client) => (c.id === "c100" ? { ...c, card: { brand: "visa", last4: "4242", expires: "2028-08" } } : c)) }
    render(<NewJob data={withCard} today={TODAY} open onOpenChange={() => undefined} customerId="c100" actions={actions as unknown as VisitActions} />)
    await choose("season-pass")
    expect(screen.getByText("Visa ending 4242 is on file and is charged after each visit")).toBeInTheDocument()
    expect(screen.queryByText("At each visit, check, Venmo or cash")).toBeNull()
    await userEvent.click(screen.getByLabelText("Terms read and accepted"))
    await userEvent.click(screen.getByRole("button", { name: "Sell pass" }))
    await waitFor(() => expect(actions.sellPass).toHaveBeenCalledTimes(1))
    expect(actions.sellPass).toHaveBeenCalledWith(expect.objectContaining({ paysBy: "card-link" }))
  })
  it("reads the line without a brand as Card", () => {
    expect(cardOnFileLine({ last4: "0005" })).toBe("Card ending 0005 is on file and is charged after each visit")
    expect(cardOnFileLine({ brand: "amex", last4: "0005" })).toBe("Amex ending 0005 is on file and is charged after each visit")
  })
  it("still offers both choices to a customer with no card", async () => {
    open()
    await choose("season-pass")
    expect(screen.getByText("At each visit, check, Venmo or cash")).toBeInTheDocument()
  })
})

describe("servicePriceLine", () => {
  it("reads the rule: a flat price, a base with per-zone, free, or quote on site", () => {
    expect(servicePriceLine(SERVICES.repair!)).toBe("$145")
    expect(servicePriceLine(SERVICES.blowout!)).toBe("$95 up to 6 zones, then $10 a zone")
    expect(servicePriceLine(SERVICES.consult!)).toBe("Free")
    expect(servicePriceLine(SERVICES.install!)).toBe("Quote on site")
  })
})

describe("priceLine", () => {
  it("reads the visits on sale at the pass's zones from src/lib/season-pass.ts, with the July inspection when ticked", () => {
    expect(priceLine(8, false, "2026-11-12")).toBe("Spring turn-on $145 · Fall blowout $115 · invoiced after each visit")
    expect(priceLine(6, false, "2026-11-12")).toBe("Spring turn-on $145 · Fall blowout $95 · invoiced after each visit")
    expect(priceLine(10, true, "2026-11-12")).toBe("Spring turn-on $165 · July inspection $165 · Fall blowout $135 · invoiced after each visit")
    expect(priceLine(6, true, "2027-06-15")).toBe("July inspection $145 · Fall blowout $95 · invoiced after each visit")
  })
})

const clients: Client[] = [
  { id: "c-dana", firstName: "Dana", lastName: "Reed", town: "Erie", email: "dana@example.com", jobberUrl: "", hasPass: false, app: true },
  { id: "c-joe", firstName: "Joe", lastName: "Hart", town: "Longmont", jobberUrl: "", hasPass: false, app: true },
]

describe("choiceReady for a pass (email required)", () => {
  it("needs a chosen customer with an email on file or one typed, or a new customer with a name, a street and a well-formed email", () => {
    expect(choiceReady(emptyChoice("c-dana"), clients, true)).toBe(true)
    expect(choiceReady(emptyChoice("c-joe"), clients, true)).toBe(false)
    expect(choiceReady({ ...emptyChoice("c-joe"), email: "joe@example.com" }, clients, true)).toBe(true)
    expect(choiceReady({ ...emptyChoice("c-joe"), email: "joe@" }, clients, true)).toBe(false)
    const person = { ...EMPTY_PERSON, firstName: "Maya", lastName: "Ortiz", address: "12 Elm St" }
    expect(choiceReady({ ...emptyChoice(), isNew: true, person }, clients, true)).toBe(false)
    expect(choiceReady({ ...emptyChoice(), isNew: true, person: { ...person, email: "maya@gmail.com" } }, clients, true)).toBe(true)
    // A service job does not need the email.
    expect(choiceReady({ ...emptyChoice(), isNew: true, person }, clients)).toBe(true)
    expect(choiceReady(emptyChoice("c-joe"), clients)).toBe(true)
  })
  it("builds the API's newCustomer from what was typed, leaving out blank email and phone", () => {
    expect(newCustomerFrom({ ...EMPTY_PERSON, firstName: " Maya ", lastName: "Ortiz", address: "12 Elm St ", town: "Erie" })).toEqual({ firstName: "Maya", lastName: "Ortiz", property: { address: "12 Elm St", town: "Erie" } })
  })
})

describe("one entry per service", () => {
  it("lists Season Pass, then Repair, Spring turn-on, Fall blowout, the inspection, with no band in any name", () => {
    open()
    const labels = [...(screen.getByLabelText("What are we doing?") as HTMLSelectElement).options].filter((o) => o.value).map((o) => o.textContent ?? "")
    expect(labels[0]).toBe("Season Pass")
    expect(labels.slice(1, 5).map((l) => l.split(/[ ,&]/)[0])).toEqual(["Sprinkler", "Spring", "Fall", "Mid-season"])
    expect(labels.some((l) => /zones$/.test(l))).toBe(false)
    expect(labels).toHaveLength(11)
  })

  it("the zones box picks the band that is sent, and the price line is the same for every band", async () => {
    const actions = open()
    await choose("turn-on")
    expect(screen.getByText("$145 up to 8 zones, then $10 a zone")).toBeInTheDocument()
    const zones = screen.getByLabelText("Zones")
    expect(zones).toHaveValue(8)
    await userEvent.clear(zones)
    await userEvent.type(zones, "10")
    await userEvent.click(screen.getByText("More details"))
    expect(screen.getByLabelText("Price")).toHaveValue("165")
    expect(screen.getByLabelText("Minutes")).toHaveValue("90")
    await userEvent.click(screen.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(actions.createVisit).toHaveBeenCalledTimes(1))
    expect(actions.createVisit).toHaveBeenCalledWith(expect.objectContaining({ serviceKey: "turn-on-12", price: 165, durationMinutes: 90 }))
  })

  it("keeps the day and notes while the zones move between bands", async () => {
    open()
    await choose("turn-on")
    await userEvent.type(screen.getByLabelText("Day (optional)"), "2026-12-01")
    const zones = screen.getByLabelText("Zones")
    await userEvent.clear(zones)
    await userEvent.type(zones, "14")
    expect(screen.getByLabelText("Day (optional)")).toHaveValue("2026-12-01")
  })
})
