import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoreMenu } from "./MoreMenu"

describe("MoreMenu", () => {
  it("is a bordered button labelled More that opens Reports and Settings only", async () => {
    render(<MoreMenu current="jobs" />)
    const more = screen.getByRole("button", { name: "More" })
    expect(more.className).toContain("border")
    expect(more).not.toHaveAttribute("aria-current")
    await userEvent.click(more)
    expect((await screen.findAllByRole("menuitem")).map((i) => i.textContent)).toEqual(["Reports", "Settings"])
  })

  it("is lit while Reports or Settings is the screen", () => {
    render(<MoreMenu current="reports" />)
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-current", "page")
  })
})
