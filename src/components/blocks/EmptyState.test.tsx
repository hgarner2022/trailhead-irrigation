import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Ticket } from "lucide-react"
import { EmptyState } from "./EmptyState"

const block = () => document.querySelector<HTMLElement>('[data-slot="empty-state"]') as HTMLElement

describe("EmptyState", () => {
  it("renders the title and the line as a plain block, not a live region", () => {
    render(<EmptyState title="No passes sold yet" line="Passes appear here as customers reserve their season." />)
    expect(block()).not.toHaveAttribute("role")
    expect(screen.getByText("No passes sold yet")).toBeInTheDocument()
    expect(screen.getByText("Passes appear here as customers reserve their season.")).toBeInTheDocument()
  })

  it("renders the action when given and nothing in its place otherwise", () => {
    const { unmount } = render(<EmptyState title="No passes sold yet" line="Passes appear here." action={<button type="button">Open the checkout</button>} />)
    expect(screen.getByRole("button", { name: "Open the checkout" })).toBeInTheDocument()
    unmount()
    render(<EmptyState title="No passes sold yet" line="Passes appear here." />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("draws the icon in its circle when given", () => {
    const { unmount } = render(<EmptyState title="No passes sold yet" line="Passes appear here." icon={Ticket} />)
    expect(block().querySelector('[data-slot="empty-state-icon"] svg')).not.toBeNull()
    unmount()
    render(<EmptyState title="No passes sold yet" line="Passes appear here." />)
    expect(block().querySelector('[data-slot="empty-state-icon"]')).toBeNull()
  })

  it("draws a Trailhead scene in place of the icon, hidden from a screen reader, with the title on the customer type scale", () => {
    render(<EmptyState scene="signpost" title="No visits yet." line="Every visit shows up here." />)
    const drawing = block().querySelector('[data-slot="trail-icon"]')
    expect(drawing).toHaveAttribute("data-icon", "signpost")
    expect(drawing).toHaveAttribute("aria-hidden", "true")
    expect(block().querySelector('[data-slot="empty-state-icon"]')).toBeNull()
    expect(screen.getByText("No visits yet.")).toHaveClass("type-heading")
  })

  it("needs no line, and makes the title the heading the screen asks for", () => {
    render(<EmptyState scene="trail" titleAs="h2" title="Nothing booked right now." />)
    expect(screen.getByRole("heading", { level: 2, name: "Nothing booked right now." })).toBeInTheDocument()
    expect(block().querySelectorAll("p")).toHaveLength(0)
  })

  it("is one row inside a section at sm and the page's own h1 at page", () => {
    const { unmount } = render(<EmptyState scene="photo" size="sm" title="No photos yet." />)
    expect(block()).toHaveAttribute("data-size", "sm")
    expect(screen.getByText("No photos yet.")).toHaveClass("type-body")
    unmount()
    render(<EmptyState scene="compass" size="page" titleAs="h1" title="We can't open that" line="Go to your visits, or text Ryan." />)
    expect(screen.getByRole("heading", { level: 1, name: "We can't open that" })).toHaveClass("type-title")
    expect(block()).toHaveClass("items-start")
  })
})
