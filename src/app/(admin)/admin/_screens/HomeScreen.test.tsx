import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { HomeScreen } from "./HomeScreen"

const data = snapshot as AdminData

describe("HomeScreen season prompt", () => {
  it("is absent outside a lead period", () => {
    render(<HomeScreen data={data} today="2026-11-12T19:56:30Z" />)
    expect(document.querySelector('[data-slot="season-prompt"]')).toBeNull()
  })

  it("names the window, links to Settings and proposes", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    render(<HomeScreen data={data} today="2027-09-17T18:00:00Z" />)
    expect(screen.getByRole("heading", { name: "Fall blowouts open Oct 1" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute("href", "/admin/settings")
    await userEvent.click(screen.getByRole("button", { name: "Propose schedule" }))
    expect(info).toHaveBeenCalledWith("propose schedule", "blowout", "2027-10-01")
  })

  it("adds a not-closed row for visits from the last two weeks only", () => {
    render(<HomeScreen data={data} today="2026-11-12T19:56:30Z" />)
    expect(screen.getByText(/visits from the last two weeks are not marked done yet/)).toBeInTheDocument()
  })
})
