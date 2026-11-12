import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Ticket } from "lucide-react"
import { EmptyState } from "./EmptyState"

const block = () => document.querySelector<HTMLElement>('[data-slot="empty-state"]') as HTMLElement

describe("EmptyState", () => {
  it("renders the title and the line as a status region", () => {
    render(<EmptyState title="No passes sold yet" line="Passes appear here as customers reserve their season." />)
    expect(screen.getByRole("status")).toBe(block())
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
})
