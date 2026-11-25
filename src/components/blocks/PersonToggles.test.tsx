import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Person } from "@/lib/admin/types"
import { PersonToggles } from "./PersonToggles"

const person = (id: string, name: string): Person => ({ id, name, initials: name.slice(0, 2), role: "tech", truck: name, workingDays: ["mon"], capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 } })
const PEOPLE = [person("a", "Ryan Garner"), person("b", "Hannah Garner")]

describe("PersonToggles", () => {
  it("is a pressed chip per person named for their visits, and reports a press", async () => {
    const onToggle = vi.fn()
    render(<PersonToggles people={PEOPLE} hidden={["b"]} onToggle={onToggle} />)
    expect(screen.getByRole("button", { name: "Show Ryan Garner's visits" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Show Hannah Garner's visits" })).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(screen.getByRole("button", { name: "Show Hannah Garner's visits" }))
    expect(onToggle).toHaveBeenCalledWith("b")
  })
  it("never lets the last person shown be turned off", async () => {
    const onToggle = vi.fn()
    render(<PersonToggles people={PEOPLE} hidden={["b"]} onToggle={onToggle} />)
    const last = screen.getByRole("button", { name: "Show Ryan Garner's visits" })
    expect(last).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(last)
    expect(onToggle).not.toHaveBeenCalled()
  })
  it("is not drawn for one person", () => {
    const { container } = render(<PersonToggles people={PEOPLE.slice(0, 1)} hidden={[]} onToggle={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
