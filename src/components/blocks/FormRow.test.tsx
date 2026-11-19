import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Input } from "@/components/ui/input"
import { FormRow } from "./FormRow"

describe("FormRow", () => {
  it("ties the label to its one control without an id from the screen", () => {
    render(
      <FormRow label="Minutes">
        <Input />
      </FormRow>,
    )
    expect(screen.getByLabelText("Minutes")).toBeInTheDocument()
  })

  it("describes the control by its hint and its error, and announces the error", () => {
    render(
      <FormRow label="Check number" hint="Optional" error="Use numbers only.">
        <Input />
      </FormRow>,
    )
    const input = screen.getByLabelText("Check number")
    expect(input).toHaveAccessibleDescription("Optional Use numbers only.")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("Use numbers only.")
  })

  it("uses the id the control already has when given htmlFor", () => {
    render(
      <FormRow label="Day" htmlFor="own-id">
        <input id="own-id" type="date" />
      </FormRow>,
    )
    expect(screen.getByLabelText("Day")).toHaveAttribute("id", "own-id")
  })

  it("can keep the label for a screen reader only", () => {
    render(
      <FormRow label="Text to send" hideLabel>
        <Input />
      </FormRow>,
    )
    expect(screen.getByText("Text to send")).toHaveClass("sr-only")
  })

  it("lays the label out in a 112px column from md up, with the hint and error under the control, when inline", () => {
    render(
      <FormRow label="Hours" inline hint="From and to" error="Too early">
        <Input />
      </FormRow>,
    )
    const row = document.querySelector('[data-slot="form-row"]')!
    expect(row.className).toContain("md:grid-cols-[112px_minmax(0,1fr)]")
    expect(screen.getByText("From and to").className).toContain("md:col-start-2")
    expect(screen.getByRole("alert").className).toContain("md:col-start-2")
    expect(screen.getByLabelText("Hours")).toBeInTheDocument()
  })
})
