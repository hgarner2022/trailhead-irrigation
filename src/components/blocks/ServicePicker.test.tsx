import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

describe("ServicePicker", () => {
  it("lists the Season Pass first and only services we book, with no closed card and no opening day", () => {
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole("button", { expanded: false })[0]).toHaveAccessibleName(/Season Pass/)
    expect(screen.getByRole("button", { name: /^Spring turn-on/ })).toBeEnabled()
    expect(screen.queryByText(/Opens/)).toBeNull()
    expect(screen.queryByText(/Priced after Ryan looks/)).toBeNull()
    expect(screen.queryByRole("button", { name: /Christmas lights/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Free consultation/ })).toBeNull()
    // the installation is We quote in the backend rows, so it is on the request path and not in this list
    expect(screen.queryByRole("button", { name: /New sprinkler system installation/ })).toBeNull()
    expect(screen.getByRole("button", { name: /Water efficiency and drip/ })).toBeEnabled()
  })
  it("opens a card in place: the whole header is the button, aria-expanded says so, and the panel holds the details", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: /Sprinkler repair/ }))
    expect(onChange).toHaveBeenCalledWith("repair")
    rerender(<ServicePicker entries={SERVICES} value="repair" onChange={onChange} />)
    expect(screen.getByRole("button", { name: /Sprinkler repair/ })).toHaveAttribute("aria-expanded", "true")
    // the open card holds only what is included, as a list, and nothing else: no zones, no prices, no questions
    const region = screen.getByRole("region", { name: "Sprinkler repair" })
    expect(within(region).getAllByRole("listitem").length).toBeGreaterThan(0)
    expect(within(region).queryByRole("button")).toBeNull()
    expect(within(region).queryByRole("radio")).toBeNull()
    expect(screen.queryByRole("region", { name: "Fall blowout" })).toBeNull()
    // pressing the open card closes it and unpicks the service
    await userEvent.click(screen.getByRole("button", { name: /Sprinkler repair/ }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
  it("shows on every card the name, one line from the catalogue and the price and length as meta, with a 44px chevron", () => {
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    const turnOn = screen.getByRole("button", { name: /^Spring turn-on/ })
    expect(turnOn).toHaveTextContent("From $145")
    expect(turnOn).toHaveTextContent(/about 1 hour/)
    expect(turnOn.className).toContain("min-h-[5.5rem]")
    // the pass card keeps its own treatment and shows no price
    expect(screen.getByRole("button", { name: /^Season Pass/ })).not.toHaveTextContent("$")
  })
  it("offers the request path as one quiet row", async () => {
    const onRequestQuote = vi.fn()
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} onRequestQuote={onRequestQuote} />)
    await userEvent.click(screen.getByRole("button", { name: "Need a quote? Request one" }))
    expect(onRequestQuote).toHaveBeenCalledOnce()
  })
  it("lists the services we quote on the request path as plain choices, with no prices and no link", () => {
    render(<ServicePicker entries={QUOTE_SERVICES} value={null} onChange={() => {}} mode="quote" />)
    expect(screen.getByRole("radio", { name: /Christmas lights/ })).toBeEnabled()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
