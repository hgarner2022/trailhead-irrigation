import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

describe("ServicePicker", () => {
  it("lists the Season Pass first and only services we book, closed ones not selectable with their opening day", () => {
    render(<ServicePicker entries={SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole("radio")[0]).toHaveAccessibleName(/Season Pass 2027/)
    expect(screen.getByRole("radio", { name: /^Spring turn-on/ })).toBeDisabled()
    expect(screen.getByText("Opens Apr 25")).toBeInTheDocument()
    expect(screen.getByText("Reserve the Season Pass and your turn-on day is held.")).toBeInTheDocument()
    expect(screen.queryByText(/Priced after Ryan looks/)).toBeNull()
    expect(screen.queryByRole("radio", { name: /Christmas lights/ })).toBeNull()
    expect(screen.getByRole("radio", { name: /New sprinkler system installation/ })).toBeEnabled()
  })
  it("reports the chosen service and offers the request path as one link", async () => {
    const onChange = vi.fn()
    const onRequestQuote = vi.fn()
    render(<ServicePicker entries={SERVICES} value={null} onChange={onChange} onRequestQuote={onRequestQuote} />)
    await userEvent.click(screen.getByRole("radio", { name: /Sprinkler repair/ }))
    await userEvent.click(screen.getByRole("button", { name: "Need a quote? Request one" }))
    expect(onChange).toHaveBeenCalledWith("repair")
    expect(onRequestQuote).toHaveBeenCalledOnce()
  })
  it("lists the services we quote on the request path, with no prices and no link", () => {
    render(<ServicePicker entries={QUOTE_SERVICES} value={null} onChange={() => {}} />)
    expect(screen.getByRole("radio", { name: /Christmas lights/ })).toBeEnabled()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
