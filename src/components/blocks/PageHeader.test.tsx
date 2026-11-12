import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PageHeader } from "./PageHeader"

describe("PageHeader", () => {
  it("renders the title as the page's h1", () => {
    render(<PageHeader title="Passes" />)
    const heading = screen.getByRole("heading", { level: 1, name: "Passes" })
    expect(heading).toBeInTheDocument()
    expect(heading.closest("header")).toHaveAttribute("data-slot", "page-header")
  })

  it("renders the context line under the title", () => {
    render(<PageHeader title="Passes" context="Thursday, November 12. Updated 4 minutes ago." />)
    expect(screen.getByText("Thursday, November 12. Updated 4 minutes ago.")).toBeInTheDocument()
  })

  it("renders no context line without one", () => {
    const { container } = render(<PageHeader title="Passes" />)
    expect(container.querySelector('[data-slot="page-context"]')).toBeNull()
  })

  it("renders the actions beside the title", () => {
    render(
      <PageHeader title="Passes" actions={<button type="button">Export</button>} />,
    )
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument()
  })
})
