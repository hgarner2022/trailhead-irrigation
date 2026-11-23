import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { PassUpsell } from "./PassUpsell"

function Harness() {
  const [on, setOn] = useState(false)
  return <PassUpsell on={on} onChange={setOn} />
}

describe("PassUpsell", () => {
  it("is a switch, off until the customer turns it on, and says nothing more", async () => {
    render(<Harness />)
    const toggle = screen.getByRole("switch", { name: "Upgrade to a Season Pass" })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    expect(screen.getByRole("switch").closest("[data-slot=pass-upsell]")).toHaveTextContent(/^Upgrade to a Season Pass$/)
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-checked", "true")
    await userEvent.keyboard(" ")
    expect(toggle).toHaveAttribute("aria-checked", "false")
  })
})
