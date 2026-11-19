import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingSummary } from "./BookingSummary"

describe("BookingSummary", () => {
  it("names each choice with a Change button that goes back to its step", async () => {
    const onChange = vi.fn()
    render(<BookingSummary parts={[{ label: "Sprinkler repair", what: "service", onChange }, { label: "Erie" }]} />)
    expect(screen.getByText("Erie")).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Change service" }))
    expect(onChange).toHaveBeenCalledOnce()
  })
  it("draws nothing before anything is chosen", () => {
    const { container } = render(<BookingSummary parts={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
