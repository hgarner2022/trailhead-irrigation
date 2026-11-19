import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CheckDeliveryButton } from "./CheckDeliveryButton"

describe("CheckDeliveryButton", () => {
  it("asks once and says how many texts were checked", async () => {
    const onCheck = vi.fn().mockResolvedValue({ ok: true, data: 9 })
    render(<CheckDeliveryButton onCheck={onCheck} />)
    await userEvent.click(screen.getByRole("button", { name: "Check delivery" }))
    expect(onCheck).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole("status")).toHaveTextContent("Checked 9.")
  })
  it("says so when there was nothing to check, and shows a refusal's words", async () => {
    const onCheck = vi.fn().mockResolvedValueOnce({ ok: true, data: 0 }).mockResolvedValueOnce({ ok: false, message: "Twilio failed" })
    render(<CheckDeliveryButton onCheck={onCheck} />)
    await userEvent.click(screen.getByRole("button", { name: "Check delivery" }))
    expect(await screen.findByText("Nothing to check.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Check delivery" }))
    expect(await screen.findByText("Twilio failed")).toBeInTheDocument()
  })
})
