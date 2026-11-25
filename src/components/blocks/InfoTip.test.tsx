import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { InfoTip } from "./InfoTip"

describe("InfoTip", () => {
  it("is a named button, shows nothing until pressed, opens on a press and closes on Escape", async () => {
    render(<InfoTip label="About zones">Count the stations on your controller.</InfoTip>)
    expect(screen.queryByText("Count the stations on your controller.")).toBeNull()
    const button = screen.getByRole("button", { name: "About zones" })
    await userEvent.click(button)
    expect((await screen.findAllByText("Count the stations on your controller.")).length).toBeGreaterThan(0)
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByText("Count the stations on your controller.")).toBeNull()
  })
})
