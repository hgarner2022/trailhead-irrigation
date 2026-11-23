import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

const panel = (e: { name: string }) => <p>{`Inside ${e.name}`}</p>

describe("ServicePicker", () => {
  it("lists the Season Pass first and only services we book, with no closed card and no opening day", () => {
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} renderPanel={panel} />)
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
    const { rerender } = render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} renderPanel={panel} />)
    await userEvent.click(screen.getByRole("button", { name: /Sprinkler repair/ }))
    expect(onChange).toHaveBeenCalledWith("repair")
    rerender(<ServicePicker entries={SERVICES} value="repair" onChange={onChange} renderPanel={panel} />)
    expect(screen.getByRole("button", { name: /Sprinkler repair/ })).toHaveAttribute("aria-expanded", "true")
    expect(within(screen.getByRole("region", { name: "Sprinkler repair" })).getByText("Inside Sprinkler repair")).toBeInTheDocument()
    expect(screen.queryByText("Inside Fall blowout")).toBeNull()
    // pressing the open card closes it and unpicks the service
    await userEvent.click(screen.getByRole("button", { name: /Sprinkler repair/ }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
  it("offers the request path as one link", async () => {
    const onRequestQuote = vi.fn()
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} onRequestQuote={onRequestQuote} renderPanel={panel} />)
    await userEvent.click(screen.getByRole("button", { name: "Need a quote? Request one" }))
    expect(onRequestQuote).toHaveBeenCalledOnce()
  })
  it("lists the services we quote on the request path as plain choices, with no prices and no link", () => {
    render(<ServicePicker entries={QUOTE_SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getByRole("radio", { name: /Christmas lights/ })).toBeEnabled()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
