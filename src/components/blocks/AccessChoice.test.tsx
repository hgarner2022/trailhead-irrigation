import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AccessChoice } from "./AccessChoice"

describe("AccessChoice", () => {
  it("asks the question, reports the answer and shows the help when it is missing", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<AccessChoice value={null} onChange={onChange} />)
    expect(screen.getByRole("group", { name: /reach the controller and the water shut-off without you/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: /No, I need to be there/ }))
    expect(onChange).toHaveBeenCalledWith("no")
    rerender(<AccessChoice value={null} onChange={onChange} error="Tell us whether we can get to the system without you." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Tell us whether we can get to the system without you.")
  })
})
