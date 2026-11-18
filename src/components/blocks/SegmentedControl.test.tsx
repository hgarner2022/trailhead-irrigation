import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SegmentedControl } from "./SegmentedControl"

const OPTIONS = [{ value: "week", label: "Week" }, { value: "day", label: "Day" }, { value: "list", label: "List" }]

describe("SegmentedControl", () => {
  it("is a radio group with the chosen one checked and the others out of the tab order", () => {
    render(<SegmentedControl options={OPTIONS} value="day" onChange={() => {}} label="View" />)
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Day" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Week" })).toHaveAttribute("tabindex", "-1")
  })

  it("changes on a click and on the arrow keys", async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="week" onChange={onChange} label="View" />)
    await userEvent.click(screen.getByRole("radio", { name: "List" }))
    expect(onChange).toHaveBeenLastCalledWith("list")
    screen.getByRole("radio", { name: "Week" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(onChange).toHaveBeenLastCalledWith("day")
  })

  it("draws nothing with no options", () => {
    const { container } = render(<SegmentedControl options={[]} value="" onChange={() => {}} label="View" />)
    expect(container).toBeEmptyDOMElement()
  })
})
