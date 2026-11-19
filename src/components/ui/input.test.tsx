import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Input } from "./input"
import { Textarea } from "./textarea"

// iOS Safari zooms the page when a field under 16px takes focus: the shared fields are 16px on a phone and 14px from md up.
describe("Input and Textarea font size", () => {
  it("renders text-base with md:text-sm, so a phone field is 16px", () => {
    render(<Input label="Email" />)
    const input = screen.getByLabelText("Email")
    expect(input.className).toContain("text-base")
    expect(input.className).toContain("md:text-sm")
    expect(input.className.split(" ")).not.toContain("text-sm")
  })
  it("keeps the phone size when a caller passes its own colour or width", () => {
    render(<Input label="Zones" className="w-24 text-navy" />)
    expect(screen.getByLabelText("Zones").className).toContain("text-base")
  })
  it("the textarea follows the same rule", () => {
    render(<Textarea label="Access note" />)
    const area = screen.getByLabelText("Access note")
    expect(area.className).toContain("text-base")
    expect(area.className).toContain("md:text-sm")
  })
})
