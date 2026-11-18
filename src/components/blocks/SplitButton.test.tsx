import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SplitButton } from "./SplitButton"

describe("SplitButton", () => {
  it("runs the primary action from the main button", async () => {
    const onClick = vi.fn()
    render(<SplitButton label="Move and text the customer" onClick={onClick} menu={[{ label: "Move without texting", onSelect: () => {} }]} />)
    await userEvent.click(screen.getByRole("button", { name: "Move and text the customer" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("keeps the quieter twin under the caret", async () => {
    const onSelect = vi.fn()
    const onClick = vi.fn()
    render(<SplitButton label="Move and text the customer" onClick={onClick} menuLabel="More ways to move" menu={[{ label: "Move without texting", onSelect }]} />)
    expect(screen.queryByRole("menuitem")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "More ways to move" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Move without texting" }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("is only the button with no menu", () => {
    render(<SplitButton label="Move" onClick={() => {}} />)
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })
})
