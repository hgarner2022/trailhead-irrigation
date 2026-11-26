import { render, screen, fireEvent, within, waitFor } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassEmptyScreen } from "../pass/_screens/PassEmptyScreen"
import { andrea, dana, passJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { VisitScreen } from "./VisitScreen"

// The account's structure (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"): Home shows the next visit and the pass card, Visits the visits, Season Pass the plan.
// The plan is never sold on Home; a customer with none finds it explained once, on its own tab. Timing is asked in one quiet banner and kept in Details.
const pass = snapshot.passes[0] as Pass
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

describe("Home", () => {
  it("shows the next visit and the pass card, and no visit list, no season line, no sell card", () => {
    render(<HomeScreen customer={andrea} jobs={[passJob, repairJob]} today={TODAY} pass={pass} />)
    expect(screen.getByRole("article", { name: /Season Pass 2027/ })).toBeInTheDocument()
    expect(screen.getByText("Next visit")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Recent visits" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Receipt" })).toBeNull()
    expect(document.querySelector('[data-slot="season-line"]')).toBeNull()
    expect(screen.queryByText("Become a Season Pass holder")).toBeNull()
    expect(screen.queryByText(/Season Pass$/)).toBeNull()
  })

  it("shows a customer with no pass the next visit alone, at full width, with nothing sold", () => {
    render(<HomeScreen customer={dana} jobs={[repairJob]} today={TODAY} />)
    expect(screen.queryByRole("article")).toBeNull()
    expect(document.querySelector('[data-slot="pass-sell"]')).toBeNull()
    expect(screen.queryByRole("link", { name: "Get a Season Pass" })).toBeNull()
  })

  it("shows the quiet timing banner only while we are asking, and saves what the customer chooses", async () => {
    const onSavePreference = vi.fn()
    const { rerender } = render(<HomeScreen customer={andrea} jobs={[passJob]} today="2027-09-10" pass={pass} ask="blowout" onSavePreference={onSavePreference} />)
    const banner = screen.getByRole("region", { name: "Timing for your next visit" })
    expect(banner).toHaveTextContent("When would you like your fall blowout?")
    fireEvent.click(within(banner).getByRole("button", { name: /Pick when/ }))
    expect(screen.getByRole("radio", { name: /Our recommended/ })).toBeChecked()
    fireEvent.click(screen.getByRole("radio", { name: /Late season/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onSavePreference).toHaveBeenCalledWith("blowout", "later")
    expect(screen.getByRole("dialog", { name: "Saved: Late season, late October." })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    rerender(<HomeScreen customer={andrea} jobs={[passJob]} today="2027-09-10" pass={pass} />)
    expect(screen.queryByRole("region", { name: "Timing for your next visit" })).toBeNull()
  })
})

describe("the Season Pass tab with no pass", () => {
  it("is one quiet explanation, in Hannah's words, with one button", () => {
    render(<PassEmptyScreen />)
    expect(screen.getByRole("heading", { name: "Become a Season Pass holder" })).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Get a Season Pass" })).toHaveAttribute("href", "/season-pass")
  })
})

describe("Details › Preferences", () => {
  it("is for a customer who holds a pass: both visits, Our recommended preselected, Early season and Late season beside it", () => {
    render(<DetailsScreen customer={andrea} />)
    const card = screen.getByRole("heading", { name: "Preferences" }).closest("[data-slot=details-preferences]") as HTMLElement
    expect(within(card).getByRole("group", { name: "Spring turn-on" })).toBeInTheDocument()
    expect(within(card).getByRole("group", { name: "Fall blowout" })).toBeInTheDocument()
    for (const radio of within(card).getAllByRole("radio", { name: /Our recommended/ })) expect(radio).toBeChecked()
    expect(within(card).getAllByRole("radio")).toHaveLength(6)
    expect(within(card).getByRole("radio", { name: /Our recommended.*Mid May/ })).toBeInTheDocument()
    expect(within(card).getByRole("radio", { name: /Late season.*Late October/ })).toBeInTheDocument()
  })

  it("is not shown to a customer who never held a pass", () => {
    render(<DetailsScreen customer={dana} />)
    expect(screen.queryByRole("heading", { name: "Preferences" })).toBeNull()
  })

  it("saves the choice for each kind", async () => {
    const onSavePreferences = vi.fn(async () => ({ ok: true as const }))
    render(<DetailsScreen customer={andrea} onSavePreferences={onSavePreferences} />)
    const [earlyTurnOn] = screen.getAllByRole("radio", { name: /Early season/ })
    await userEvent.click(earlyTurnOn!)
    await userEvent.click(screen.getByRole("button", { name: "Save preferences" }))
    await waitFor(() => expect(onSavePreferences).toHaveBeenCalledWith({ "turn-on": "earlier", blowout: "recommended" }))
    expect(await screen.findByText("Saved.")).toBeInTheDocument()
  })
})

describe("a visit page opened from the Preference request's link", () => {
  it("shows the same banner above the visit that has no day", () => {
    render(<VisitScreen customer={andrea} job={passJob} visitId="v2" today="2027-09-10" ask={{ kind: "blowout", value: "recommended" }} />)
    expect(screen.getByRole("region", { name: "Timing for your next visit" })).toBeInTheDocument()
  })
  it("has none when nothing is being asked", () => {
    render(<VisitScreen customer={andrea} job={passJob} visitId="v2" today="2027-09-10" />)
    expect(screen.queryByRole("region", { name: "Timing for your next visit" })).toBeNull()
  })
})
