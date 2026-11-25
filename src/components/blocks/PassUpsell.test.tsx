import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { PassUpsell } from "./PassUpsell"

const prices = [
  { name: "Spring turn-on", price: "$145" },
  { name: "Fall blowout", price: "$115" },
]
function Harness() {
  const [on, setOn] = useState(false)
  return <PassUpsell on={on} onChange={setOn} prices={prices} />
}

describe("PassUpsell", () => {
  it("is an offer card with approved lines and exact prices, added by one outline button and removable, with no urgency or invented claim", async () => {
    const { container } = render(<Harness />)
    expect(screen.getByRole("heading", { name: "Make it a Season Pass" })).toBeInTheDocument()
    expect(screen.getByText("We schedule your visits every season, so you never have to remember.")).toBeInTheDocument()
    expect(screen.getByText("Spring turn-on").nextElementSibling).toHaveTextContent("$145")
    expect(container.textContent).not.toMatch(/free|guarantee|save|limited|hurry|about/i)
    expect(screen.queryByRole("switch")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Add Season Pass" }))
    expect(screen.getByText("Season Pass added.")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=pass-upsell]")).toHaveAttribute("data-on", "true")
    await userEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(screen.getByRole("button", { name: "Add Season Pass" })).toBeInTheDocument()
  })
})
