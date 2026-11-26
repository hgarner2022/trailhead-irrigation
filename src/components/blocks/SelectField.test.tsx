import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SelectField } from "./SelectField"

describe("SelectField", () => {
  it("is a native select that reports its change", () => {
    const onChange = vi.fn()
    render(
      <SelectField aria-label="Who" value="a" onChange={onChange}>
        <option value="a">Ryan</option>
        <option value="b">Tech Two</option>
      </SelectField>,
    )
    fireEvent.change(screen.getByRole("combobox", { name: "Who" }), { target: { value: "b" } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("is 44px high with 16px text on a phone and the shared focus ring", () => {
    render(<SelectField aria-label="Town"><option>Erie</option></SelectField>)
    const cls = screen.getByRole("combobox").className
    expect(cls).toContain("min-h-11")
    expect(cls).toContain("text-base")
    expect(cls).toContain("md:text-sm")
    expect(cls).toContain("focus-visible:ring-ring")
  })

  it("is 36px from md up when compact, and marks a problem", () => {
    render(<SelectField aria-label="Role" density="compact" invalid><option>Tech</option></SelectField>)
    const select = screen.getByRole("combobox")
    expect(select.className).toContain("md:min-h-9")
    expect(select.className).toContain("border-destructive")
    expect(select).toHaveAttribute("aria-invalid", "true")
  })

  it("lets a caller narrow it and dims it when disabled", () => {
    render(<SelectField aria-label="Day" className="w-auto" disabled><option>Mon</option></SelectField>)
    const select = screen.getByRole("combobox")
    expect(select.className).toContain("w-auto")
    expect(select.className).not.toContain("w-full")
    expect(select).toBeDisabled()
  })
})
