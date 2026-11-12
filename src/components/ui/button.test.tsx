import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "./button"

describe("Button", () => {
  it("renders a button with the default variant", () => {
    render(<Button>Book Online</Button>)
    const button = screen.getByRole("button", { name: "Book Online" })
    expect(button.tagName).toBe("BUTTON")
    expect(button).toHaveAttribute("data-slot", "button")
    expect(button).toHaveClass("bg-primary-dark", "rounded-lg")
  })

  it("renders the child element with the button classes when asChild", () => {
    render(
      <Button asChild variant="outline" size="sm">
        <a href="/x">Open in Jobber</a>
      </Button>
    )
    const link = screen.getByRole("link", { name: "Open in Jobber" })
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "/x")
    expect(link).toHaveAttribute("data-slot", "button")
    expect(link).toHaveClass("border", "border-border", "h-8")
    expect(document.querySelector("button")).toBeNull()
  })
})
