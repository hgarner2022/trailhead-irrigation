import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ContactPreference, channelWords } from "./ContactPreference"

describe("ContactPreference", () => {
  it("offers text, email or both, says what the chosen one means, and reports a change", async () => {
    const onChange = vi.fn()
    render(<ContactPreference value="text" onChange={onChange} />)
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Text", "Email", "Text and email"])
    expect(screen.getByRole("radio", { name: "Text" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText(/the day-before reminder and your receipt, by text/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Email" }))
    expect(onChange).toHaveBeenCalledWith("email")
  })
  it("words a channel for a sentence", () => {
    expect(channelWords("both")).toBe("text and email")
  })
})
