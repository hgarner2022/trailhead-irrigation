import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { RescheduleSheet } from "./RescheduleSheet"

const days = ["2027-04-29", "2027-04-30", "2027-05-05", "2027-05-07", "2027-05-12"]
const props = { service: "Spring turn-on", address: "412 Briggs Street", currentDay: "2027-04-28", days, textHref: "sms:+19706927270?&body=Hi" }

describe("RescheduleSheet", () => {
  it("offers the days in time order, the first selected, with one button that names the day and a way to keep the old one", async () => {
    render(<RescheduleSheet {...props} />)
    await userEvent.click(screen.getByRole("button", { name: "Reschedule" }))
    expect(screen.getByRole("heading", { name: "Pick a new day" })).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(5)
    expect(screen.getAllByRole("radio")[0]).toBeChecked()
    expect(screen.getByRole("button", { name: "Move it to Thursday, Apr 29" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep Wednesday, April 28" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toHaveAttribute("href", "sms:+19706927270?&body=Hi")
  })

  it("moves the visit to the chosen day through the action and says it did, with the new day texted", async () => {
    const onPick = vi.fn(async () => ({ ok: true as const }))
    render(<RescheduleSheet {...props} onPick={onPick} />)
    await userEvent.click(screen.getByRole("button", { name: "Reschedule" }))
    await userEvent.click(screen.getAllByRole("radio")[1]!)
    await userEvent.click(screen.getByRole("button", { name: "Move it to Friday, Apr 30" }))
    expect(onPick).toHaveBeenCalledWith("2027-04-30")
    expect(await screen.findByRole("heading", { name: "Moved to Friday, April 30." })).toBeInTheDocument()
    expect(screen.getByText("We texted you the new day.")).toBeInTheDocument()
  })

  it("shows the handler's own words when the move is refused, and stays open", async () => {
    render(<RescheduleSheet {...props} onPick={async () => ({ ok: false as const, message: "That day is not one of the days on offer; pick another" })} />)
    await userEvent.click(screen.getByRole("button", { name: "Reschedule" }))
    await userEvent.click(screen.getByRole("button", { name: /^Move it to/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("That day is not one of the days on offer; pick another Try again, or text Ryan.")
  })

  it("says Pick a day for a visit with no day, and books the day", async () => {
    const onPick = vi.fn(async () => ({ ok: true as const }))
    render(<RescheduleSheet {...props} currentDay={null} onPick={onPick} />)
    await userEvent.click(screen.getByRole("button", { name: "Pick a day" }))
    await userEvent.click(screen.getByRole("button", { name: "Book Thursday, Apr 29" }))
    expect(await screen.findByRole("heading", { name: "You're set for Thursday, April 29." })).toBeInTheDocument()
  })

  it("says so and offers Text Ryan when no day is open", async () => {
    render(<RescheduleSheet {...props} days={[]} />)
    await userEvent.click(screen.getByRole("button", { name: "Reschedule" }))
    expect(screen.getByText("No open days left in this window. Text Ryan.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toBeInTheDocument()
    expect(screen.queryByRole("radio")).toBeNull()
  })
})
