import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassPageScreen } from "./PassPageScreen"

const pass = snapshot.passes[0] as Pass
const cancelled: Pass = { ...pass, status: "cancelled" }
const rows = () => Array.from(document.querySelectorAll('[data-slot="pass-visit-row"]'))

describe("PassPageScreen", () => {
  it("shows the pass card and the plan: each visit's state, how it is paid, and the plan's own actions, with no money word, no receipt and no card button", () => {
    render(<PassPageScreen pass={pass} today="2026-11-12" />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Season Pass")
    expect(screen.getByRole("article", { name: /Season Pass 2027 for Andrea, Erie/ })).toBeInTheDocument()
    expect(rows().map((r) => r.textContent)).toEqual([
      "Spring turn-on · $145May 3Done",
      "Mid-season inspection · $145July",
      "Fall blowout · $95Preference: Our recommended, mid October Change",
    ])
    // the sentence about when we schedule is said once under the list, not on every line
    expect(screen.getAllByText("We'll schedule it about two weeks before and tell you the day.")).toHaveLength(1)
    expect(screen.getByText("You pay after each visit, to your Visa ending 4242.")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Not scheduled|Scheduled|Completed|Reserved|Week of|Receipt|Unpaid|Paid/)
    // the card is changed on Details, once; this page keeps no Update card button while the card is good
    expect(screen.queryByRole("button", { name: "Update card" })).toBeNull()
    expect(screen.queryByText("Card on file")).toBeNull()
    expect(screen.queryByText("Need to change something?")).toBeNull()
  })

  it("does not repeat what a visit includes on the plan line: that is the visit's own page", () => {
    const text = "Controller programming and a walk of every zone."
    render(<PassPageScreen pass={{ ...pass, visits: pass.visits.map((v) => ({ ...v, description: text })) }} today="2026-11-12" />)
    expect(screen.queryByText(text)).toBeNull()
  })

  it("lets the customer change the blowout timing until its day is set, and not the done turn-on", () => {
    const onChangePreference = vi.fn()
    render(<PassPageScreen pass={pass} today="2026-11-12" onChangePreference={onChangePreference} />)
    expect(screen.queryByRole("button", { name: /Change: your spring turn-on/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Change: your fall blowout/ }))
    expect(screen.getByRole("dialog", { name: "When would you like your fall blowout?" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Our recommended/ })).toBeChecked()
    fireEvent.click(screen.getByRole("radio", { name: /Early season/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onChangePreference).toHaveBeenCalledWith("blowout", "earlier")
    expect(screen.getByRole("dialog", { name: "Saved: Early season, early October." })).toBeInTheDocument()
  })

  it("shows the quiet timing banner while we are asking, and the same choice opens from it", () => {
    const onChangePreference = vi.fn()
    render(<PassPageScreen pass={pass} today="2027-09-10" ask="blowout" onChangePreference={onChangePreference} />)
    const banner = screen.getByRole("region", { name: "Timing for your next visit" })
    expect(banner).toHaveTextContent("When would you like your fall blowout?")
    expect(banner).toHaveTextContent("We'll schedule it about two weeks before and tell you the day.")
    fireEvent.click(within(banner).getByRole("button", { name: /Choose when/ }))
    fireEvent.click(screen.getByRole("radio", { name: /Late season/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onChangePreference).toHaveBeenCalledWith("blowout", "later")
  })

  it("has no banner when nothing is being asked", () => {
    render(<PassPageScreen pass={pass} today="2027-09-10" />)
    expect(screen.queryByRole("region", { name: "Timing for your next visit" })).toBeNull()
  })

  it("asks before cancelling and says what cancelling does", () => {
    const onCancel = vi.fn()
    render(<PassPageScreen pass={pass} today="2026-11-12" onCancel={onCancel} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancel my pass" }))
    const dialog = screen.getByRole("dialog", { name: "Cancel your Season Pass?" })
    expect(dialog).toHaveTextContent("Nothing further is charged. Your remaining visits come off the schedule.")
    expect(screen.getByRole("button", { name: "Cancel my pass" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Keep my pass" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("answers when the pass is canceled", () => {
    const onCancel = vi.fn()
    render(<PassPageScreen pass={pass} today="2026-11-12" onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "Cancel my pass" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel my pass" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    const dialog = screen.getByRole("dialog", { name: "Your pass is canceled." })
    expect(dialog).toHaveTextContent("Nothing further is charged.")
    expect(screen.queryByRole("button", { name: "Cancel my pass" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Back to my pass" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows the grey card and one line for a canceled pass", () => {
    render(<PassPageScreen pass={cancelled} today="2026-11-12" />)
    expect(screen.getByRole("article", { name: /canceled$/ })).toBeInTheDocument()
    expect(screen.getByText(/This pass is canceled/)).toBeInTheDocument()
    expect(rows()).toHaveLength(0)
    expect(screen.queryByText("Card on file")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel my pass" })).not.toBeInTheDocument()
  })

  it("never offers to reserve next season: the pass renews by itself and the customer is told by email", () => {
    const done: Pass = { ...pass, visits: pass.visits.map((v) => ({ ...v, completedAt: v.completedAt ?? "2027-10-05T16:40:00Z" })) }
    for (const [p, today] of [[done, "2027-11-02"], [pass, "2027-11-02"], [pass, "2027-10-20"]] as const) {
      document.body.innerHTML = ""
      render(<PassPageScreen pass={p} today={today} />)
      expect(screen.queryByRole("link", { name: /reserve/i })).not.toBeInTheDocument()
      expect(document.body.textContent).not.toMatch(/reserve next|Next season/i)
    }
  })

  it("says no headline for a booked visit: the plan line is its day, and changing the day is the visit's own Reschedule", () => {
    const booked: Pass = { ...pass, visits: pass.visits.filter((v) => v.kind !== "inspection").map((v) => (v.kind === "blowout" ? { ...v, scheduledOn: "2027-10-12", scheduledAt: "2027-10-12T14:00:00Z" } : v)) }
    render(<PassPageScreen pass={booked} today="2027-10-01" />)
    expect(document.querySelector('[data-slot="pass-headline"]')).toBeNull()
    expect(screen.queryByRole("button", { name: "Change your day" })).not.toBeInTheDocument()
    expect(rows()[1]!.textContent).toContain("Tuesday, October 12")
  })

  it("keeps an Add a card button for a pass with no card, and says it is paid at each visit", () => {
    render(<PassPageScreen pass={{ ...pass, cardLast4: undefined, cardExpires: undefined }} today="2026-11-12" />)
    expect(screen.getByText("No card on file yet. You pay at each visit.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add a card" })).toBeInTheDocument()
  })
})
