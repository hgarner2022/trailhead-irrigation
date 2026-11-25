import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe as suite, expect, it, vi } from "vitest"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { CATALOGUE, QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { SERVICE_LIST } from "@/lib/services"
import { ServicePicker, describe, priceRule } from "./ServicePicker"

const entry = (key: string) => CATALOGUE.find((s) => s.key === key)!

suite("ServicePicker", () => {
  it("lists the Season Pass first and only services we book, every card closed, with no opening day", () => {
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole("button", { expanded: false })[0]).toHaveAccessibleName(/Season Pass/)
    expect(screen.queryByRole("button", { expanded: true })).toBeNull()
    expect(screen.queryByRole("region")).toBeNull()
    expect(screen.queryByText(/Opens/)).toBeNull()
    expect(screen.queryByText(/Priced after Ryan looks/)).toBeNull()
    expect(screen.queryByRole("button", { name: /Christmas lights/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Free consultation/ })).toBeNull()
    // the installation is We quote in the backend rows, so it is on the request path and not in this list
    expect(screen.queryByRole("button", { name: /New sprinkler system installation/ })).toBeNull()
    expect(screen.getByRole("button", { name: /^Water efficiency and drip/ })).toBeEnabled()
  })
  it("shows on a closed card its icon, the name and the price and length as the header's description", () => {
    const { container } = render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    const turnOn = screen.getByRole("button", { name: /^Spring turn-on/ })
    expect(turnOn).toHaveAccessibleDescription("From $145 · about 1 hour")
    // one drawn icon per card, each its own drawing, and every one decorative
    const icons = [...container.querySelectorAll("[data-slot=service-entry] [data-slot=service-icon]")]
    expect(icons).toHaveLength(SERVICES.length)
    expect(new Set(icons.map((i) => i.getAttribute("data-icon"))).size).toBe(SERVICES.length)
    expect(icons.every((i) => i.getAttribute("aria-hidden") === "true")).toBe(true)
    // the pass card shows no price until it is opened
    expect(screen.getByRole("button", { name: /^Season Pass/ })).toHaveAccessibleDescription(expect.not.stringContaining("$"))
  })
  it("opens a card to read it without choosing it, one card at a time", async () => {
    const onChange = vi.fn()
    render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} />)
    const repair = screen.getByRole("button", { name: /^Sprinkler repair/ })
    await userEvent.click(repair)
    expect(repair).toHaveAttribute("aria-expanded", "true")
    expect(repair).toHaveAttribute("aria-controls", screen.getByRole("region", { name: "Sprinkler repair" }).id)
    expect(onChange).not.toHaveBeenCalled()
    const region = screen.getByRole("region", { name: "Sprinkler repair" })
    // the catalogue's own words, its length and its price, and nothing about zones or access
    expect(within(region).getByText(entry("repair").included!)).toBeInTheDocument()
    expect(within(region).getByText("About 2 hours")).toBeInTheDocument()
    expect(within(region).getByText("$145")).toBeInTheDocument()
    expect(within(region).queryByRole("radio")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: /^Fall blowout/ }))
    expect(repair).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("region", { name: "Sprinkler repair" })).toBeNull()
    expect(within(screen.getByRole("region", { name: "Fall blowout" })).getByText("$95 up to 6 zones, then $10 a zone")).toBeInTheDocument()
    // the open card pressed again closes
    await userEvent.click(screen.getByRole("button", { name: /^Fall blowout/ }))
    expect(screen.queryByRole("region")).toBeNull()
  })
  it("chooses with the button in the open card, which closes it and keeps focus on the card", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} defaultOpen="repair" />)
    const repair = screen.getByRole("button", { name: /^Sprinkler repair/ })
    expect(repair).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(screen.getByRole("button", { name: "Choose this service" }))
    expect(onChange).toHaveBeenCalledWith("repair")
    rerender(<ServicePicker entries={SERVICES} value="repair" onChange={onChange} defaultOpen="repair" />)
    expect(repair).toHaveAttribute("aria-expanded", "false")
    expect(repair).toHaveFocus()
    // chosen is announced on the card and on its check, and the chosen card's panel no longer offers the button
    expect(repair).toHaveAccessibleName("Sprinkler repair, selected")
    expect(screen.getByRole("button", { name: "Choose Sprinkler repair" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(repair)
    expect(screen.queryByRole("button", { name: "Choose this service" })).toBeNull()
  })
  it("chooses and unchooses with the round check, without opening the card", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Choose Fall blowout" }))
    expect(onChange).toHaveBeenLastCalledWith("fall-blowout")
    expect(screen.queryByRole("region")).toBeNull()
    rerender(<ServicePicker entries={SERVICES} value="fall-blowout" onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Choose Fall blowout" }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
  it("opens the Season Pass to both visits, each with what it costs from", async () => {
    render(<ServicePicker entries={bookingEntries(SERVICES, "2027-04-14")} value={null} onChange={() => {}} />)
    const pass = screen.getByRole("button", { name: /^Season Pass 2027/ })
    expect(pass).toHaveAccessibleDescription("Spring turn-on and fall blowout")
    await userEvent.click(pass)
    const rows = within(screen.getByRole("region", { name: "Season Pass 2027" })).getAllByRole("listitem")
    expect(rows.map((r) => r.textContent)).toEqual(["Spring turn-onFrom $145", "Fall blowoutFrom $95"])
  })
  it("reads the description and the price rule from the catalogue and retypes nothing", () => {
    const turnOn = describe(entry("spring-turn-on").included)
    expect(turnOn.lead).toBe("Complete system activation and check.")
    expect(turnOn.items).toEqual(["Sprinkler head adjustments", "Minor leak fixes where possible", "Controller programming and a water efficiency evaluation"])
    // a text with no list in it is shown as it is written
    expect(describe(entry("repair").included)).toEqual({ lead: entry("repair").included, items: [] })
    expect(describe(undefined)).toEqual({ lead: "", items: [] })
    const row = SERVICE_LIST.find((s) => s.key === "blowout")!
    expect(priceRule(entry("fall-blowout"))).toBe(`$${row.price} up to ${row.includedZones} zones, then $${row.extraZonePrice} a zone`)
    expect(priceRule(entry("repair"))).toBe(entry("repair").price)
  })
  it("offers the request path as one quiet card", async () => {
    const onRequestQuote = vi.fn()
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} onRequestQuote={onRequestQuote} />)
    const quote = screen.getByRole("button", { name: "Need a quote? Request one" })
    expect(quote).toHaveTextContent("Need a quote?")
    expect(quote).toHaveTextContent("Request one")
    await userEvent.click(quote)
    expect(onRequestQuote).toHaveBeenCalledOnce()
  })
  it("lists the services we quote on the request path as plain choices, with no prices and no link", () => {
    render(<ServicePicker entries={QUOTE_SERVICES} value={null} onChange={() => {}} mode="quote" />)
    expect(screen.getByRole("radio", { name: /Christmas lights/ })).toBeEnabled()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
