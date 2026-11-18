import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TextingStrip, textingWho } from "./TextingStrip"

describe("TextingStrip", () => {
  it("says who is about to be texted and in how long, with Undo", async () => {
    const onUndo = vi.fn()
    render(<TextingStrip names={["Andrea"]} secondsLeft={52} onUndo={onUndo} />)
    expect(screen.getByRole("status")).toHaveTextContent("Texting Andrea in 52 sa minute.")
    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it("names one or two customers and counts more", () => {
    expect(textingWho(["Andrea"])).toBe("Andrea")
    expect(textingWho(["Andrea", "Jim"])).toBe("Andrea and Jim")
    expect(textingWho(["Andrea", "Jim", "Cy"])).toBe("3 customers")
  })
})
