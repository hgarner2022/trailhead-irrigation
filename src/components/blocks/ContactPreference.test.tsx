import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { ContactPreference, channelWords } from "./ContactPreference"

// jsdom has no ResizeObserver, which Radix's popper needs when the tooltip opens; the real one runs in Chromium.
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

describe("ContactPreference", () => {
  it("offers text, email or both, explains the choice once in a tooltip and nothing under it, and reports a change", async () => {
    const onChange = vi.fn()
    render(<ContactPreference value="text" onChange={onChange} />)
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Text", "Email", "Text and email"])
    expect(screen.getByRole("radio", { name: "Text" })).toBeChecked()
    expect(screen.queryByText(/the day-before reminder and your receipt/)).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "About how we reach you" }))
    expect((await screen.findAllByText(/the day-before reminder and your receipt are sent this way/)).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole("radio", { name: "Email" }))
    expect(onChange).toHaveBeenCalledWith("email")
  })
  it("words a channel for a sentence", () => {
    expect(channelWords("both")).toBe("text and email")
  })
})
