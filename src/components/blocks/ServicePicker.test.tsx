import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe as suite, expect, it, vi } from "vitest"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { CATALOGUE, QUOTE_SERVICES, SERVICES, shortLength } from "@/lib/booking/services"
import { SERVICE_LIST } from "@/lib/services"
import { ServicePicker } from "./ServicePicker"
import { describe, priceRule } from "./service-card-model"

const entry = (key: string) => CATALOGUE.find((s) => s.key === key)!

suite("ServicePicker", () => {
  it("lists the Season Pass first and only services we book, nothing chosen and nothing open, with no opening day", () => {
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole("button", { pressed: false })[0]).toHaveAccessibleName(/^Season Pass/)
    expect(screen.queryByRole("button", { pressed: true })).toBeNull()
    expect(screen.queryByRole("region")).toBeNull()
    expect(screen.queryByText(/Opens/)).toBeNull()
    expect(screen.queryByText(/Priced after Ryan looks/)).toBeNull()
    expect(screen.queryByRole("button", { name: /Christmas lights/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Free consultation/ })).toBeNull()
    // the installation is We quote in the backend rows, so it is on the request path and not in this list
    expect(screen.queryByRole("button", { name: /New sprinkler system installation/ })).toBeNull()
    expect(screen.getByRole("button", { name: /^Water efficiency and drip/ })).toBeEnabled()
  })
  it("makes the whole card the one control: its icon, name and short one-line meta, a ring that marks it as a choice, and no pill or second button", () => {
    const { container } = render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getByRole("button", { name: /^Spring turn-on/ })).toHaveTextContent("From $145 · 1 hr")
    expect(screen.getByRole("button", { name: /^Mid-season inspection/ })).toHaveTextContent("From $145 · 1 hr 30 min")
    expect(screen.getByRole("button", { name: /^Fall blowout/ })).toHaveTextContent("From $95 · 30 min")
    expect(screen.getByRole("button", { name: /^Sprinkler repair/ })).toHaveTextContent("$145 · 2 hr")
    // one drawn icon per card, each its own drawing, and every one decorative
    const icons = [...container.querySelectorAll("[data-slot=service-entry] [data-slot=service-icon]")]
    expect(icons).toHaveLength(SERVICES.length)
    expect(new Set(icons.map((i) => i.getAttribute("data-icon"))).size).toBe(SERVICES.length)
    // one button per card and nothing else to press: no Details or Hide, no Choose this service
    expect(container.querySelectorAll("[data-slot=service-entry] button")).toHaveLength(SERVICES.length)
    expect(screen.queryByText(/^(Details|Hide|Choose this service|Chosen|Remove)$/)).toBeNull()
    expect(container.querySelectorAll("[data-slot=service-ring]")).toHaveLength(SERVICES.length)
    expect(container.querySelector("[data-slot=service-dot]")).toBeNull()
    // the Season Pass is a white card like the others: nothing but a chosen card looks chosen
    expect((screen.getByRole("button", { name: /^Season Pass/ }).closest("li") as HTMLElement).className).not.toMatch(/bg-navy|ring-navy/)
    expect(shortLength(45)).toBe("45 min")
    expect(shortLength(120)).toBe("2 hr")
  })
  it("chooses with one press, and the chosen card is the one selected state and opens to show what is included", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: /^Sprinkler repair/ }))
    expect(onChange).toHaveBeenCalledWith("repair")
    rerender(<ServicePicker entries={SERVICES} value="repair" onChange={onChange} />)
    const repair = screen.getByRole("button", { name: /^Sprinkler repair/ })
    expect(repair).toHaveAttribute("aria-pressed", "true")
    expect(repair.className).toMatch(/bg-navy/)
    expect(repair.className).toMatch(/text-white/)
    const region = screen.getByRole("region", { name: "Sprinkler repair" })
    expect(repair).toHaveAttribute("aria-controls", region.id)
    // the catalogue's own words, its length and its price, and nothing about zones or access
    expect(within(region).getByText(entry("repair").included!)).toBeInTheDocument()
    expect(within(region).getByText("About 2 hours")).toBeInTheDocument()
    expect(within(region).getByText("$145")).toBeInTheDocument()
    expect(within(region).queryByRole("button")).toBeNull()
    // exactly one dot, inside the chosen card's ring, and never a tick badge; only the chosen card is open
    expect(document.querySelectorAll("[data-slot=service-dot]")).toHaveLength(1)
    expect(repair.querySelector("[data-slot=service-ring] [data-slot=service-dot]")).not.toBeNull()
    expect(repair.querySelector("svg[data-slot=tick], [data-slot=service-check]")).toBeNull()
    // what is included is marked by the one thin tick, in ink: never green or orange
    rerender(<ServicePicker entries={SERVICES} value="spring-turn-on" onChange={onChange} />)
    const ticks = [...screen.getByRole("region", { name: "Spring turn-on" }).querySelectorAll("[data-slot=service-included] [data-slot=tick]")]
    expect(ticks.length).toBeGreaterThan(0)
    for (const tick of ticks) expect(tick.getAttribute("class")).not.toMatch(/positive|success|primary/)
    expect(screen.getAllByRole("region")).toHaveLength(1)
  })
  it("removes the choice with a second press, and a different card replaces it", async () => {
    const onChange = vi.fn()
    render(<ServicePicker entries={SERVICES} value="repair" onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: /^Sprinkler repair/ }))
    expect(onChange).toHaveBeenLastCalledWith(null)
    await userEvent.click(screen.getByRole("button", { name: /^Fall blowout/ }))
    expect(onChange).toHaveBeenLastCalledWith("fall-blowout")
  })
  it("works from the keyboard: Tab reaches a card, Space and Enter toggle it", async () => {
    const onChange = vi.fn()
    render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} />)
    await userEvent.tab()
    expect(screen.getByRole("button", { name: /^Season Pass/ })).toHaveFocus()
    await userEvent.keyboard(" ")
    expect(onChange).toHaveBeenLastCalledWith("season-pass")
    await userEvent.tab()
    await userEvent.keyboard("{Enter}")
    expect(onChange).toHaveBeenLastCalledWith("spring-turn-on")
  })
  it("opens the chosen Season Pass to both visits, each with what it costs from", () => {
    render(<ServicePicker entries={bookingEntries(SERVICES, "2027-04-14")} value="season-pass" onChange={() => {}} />)
    expect(screen.getByRole("button", { name: /^Season Pass 2027/ })).toHaveTextContent("Spring turn-on and fall blowout")
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
