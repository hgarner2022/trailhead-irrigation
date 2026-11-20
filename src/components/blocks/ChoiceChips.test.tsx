import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ChoiceChips } from "./ChoiceChips"

describe("ChoiceChips", () => {
  it("answers one of a few with radios", async () => {
    const onChange = vi.fn()
    render(<ChoiceChips legend="Wi-Fi at the controller?" options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole("radio", { name: "No" }))
    expect(onChange).toHaveBeenCalledWith("no")
  })
  it("answers any of a few with checkboxes and adds or drops each", async () => {
    const onChange = vi.fn()
    render(<ChoiceChips mode="many" legend="What to improve?" options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value={["a"]} onChange={onChange} error="Pick one." />)
    await userEvent.click(screen.getByRole("checkbox", { name: "B" }))
    expect(onChange).toHaveBeenCalledWith(["a", "b"])
    await userEvent.click(screen.getByRole("checkbox", { name: "A" }))
    expect(onChange).toHaveBeenLastCalledWith([])
    expect(screen.getByRole("alert")).toHaveTextContent("Pick one.")
  })
})
