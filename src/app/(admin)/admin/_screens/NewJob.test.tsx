import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { withFixtureContact } from "@/lib/admin/fixtures/contact"
import { SERVICES } from "@/lib/services"
import type { AdminData, Client } from "@/lib/admin/types"
import { NewJob } from "./NewJob"
import { priceLine } from "./NewJobPass"
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
    createVisit: vi.fn(async () => ({ ok: true as const, data: { id: "v1" } })),
    sellPass: vi.fn(async () => ({ ok: true as const, data: { id: "p1", number: "TP-1", firstName: "Andrea" } })),
  }
  render(<NewJob data={data} today={TODAY} open onOpenChange={() => undefined} customerId="c100" actions={actions as unknown as VisitActions} />)
  return actions
}
const choose = (value: string) => userEvent.selectOptions(screen.getByLabelText("What are we doing?"), value)

describe("New job", () => {
  it("lists Season Pass first, then the services", () => {
    open()
    const options = [...(screen.getByLabelText("What are we doing?") as HTMLSelectElement).options].map((o) => o.value).filter(Boolean)
    expect(options[0]).toBe("season-pass")
    expect(options).toContain("repair")
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
    expect(screen.getByText("$95 up to 6 zones, +$10 a zone")).toBeInTheDocument()
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
    expect(actions.createVisit).toHaveBeenCalledWith(expect.objectContaining({ customerId: "c100", serviceKey: "repair", scheduledOn: "2026-11-12", durationMinutes: 120, price: 145 }))
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

describe("servicePriceLine", () => {
  it("reads the rule: a flat price, a base with per-zone, free, or quoted", () => {
    expect(servicePriceLine(SERVICES.repair!)).toBe("$145")
    expect(servicePriceLine(SERVICES.blowout!)).toBe("$95 up to 6 zones, +$10 a zone")
    expect(servicePriceLine(SERVICES.consult!)).toBe("Free")
    expect(servicePriceLine(SERVICES.install!)).toBe("Quoted on site")
  })
})

describe("priceLine", () => {
  it("reads the visits on sale at the pass's zones from src/lib/season-pass.ts, with the July inspection when ticked", () => {
    expect(priceLine(8, false, "2026-11-12")).toBe("Spring turn-on $145 · Fall blowout $115 · billed after each visit")
    expect(priceLine(6, false, "2026-11-12")).toBe("Spring turn-on $145 · Fall blowout $95 · billed after each visit")
    expect(priceLine(10, true, "2026-11-12")).toBe("Spring turn-on $165 · July inspection $165 · Fall blowout $135 · billed after each visit")
    expect(priceLine(6, true, "2027-06-15")).toBe("July inspection $145 · Fall blowout $95 · billed after each visit")
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
