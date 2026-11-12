import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassCard } from "./PassCard"

// passes[0] is Andrea in Erie, blowout reserved for the week of October 4.
const pass = snapshot.passes[0] as Pass
const allDone: Pass = {
  ...(snapshot.passes[1] as Pass),
  visits: (snapshot.passes[1] as Pass).visits.map((v, i) => ({
    ...v,
    scheduledAt: ["2027-04-21T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-12T16:00:00Z"][i],
    completedAt: ["2027-04-21T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-12T16:40:00Z"][i],
  })),
}

const card = () => screen.getByRole("article")
const slot = (name: string) => card().querySelector<HTMLElement>(`[data-slot="${name}"]`)

// The events attached to the card itself, ignoring React's own root listeners.
function cardListeners() {
  const spy = vi.spyOn(HTMLElement.prototype, "addEventListener")
  return () =>
    spy.mock.calls
      .map((c, i) => [c[0], spy.mock.contexts[i]] as const)
      .filter(([, el]) => el instanceof HTMLElement && el.dataset.slot === "pass-card")
      .map(([name]) => name)
}

afterEach(() => vi.restoreAllMocks())

describe("PassCard at full size", () => {
  it("shows the name, the season, the pass number and the three visits", () => {
    render(<PassCard pass={pass} />)
    expect(screen.getByText("Andrea")).toBeInTheDocument()
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("TH-2027-0001")).toBeInTheDocument()
    expect(screen.getByText("Turn-on")).toBeInTheDocument()
    expect(screen.getByText("Inspection")).toBeInTheDocument()
    expect(screen.getByText("Blowout")).toBeInTheDocument()
  })

  it("shows the reserved blowout week in the blowout cell", () => {
    render(<PassCard pass={pass} />)
    const blowout = card().querySelector('[data-slot="pass-visit"][data-kind="blowout"]')
    expect(blowout?.textContent).toContain("Reserved")
    expect(blowout?.textContent).toContain("Week of Oct 4")
  })

  it("shows a completed visit as its date with a check", () => {
    render(<PassCard pass={pass} />)
    const turnOn = card().querySelector('[data-slot="pass-visit"][data-kind="turn-on"]')
    expect(turnOn?.textContent).toContain("Apr 20")
    expect(turnOn?.textContent).toContain("done")
  })

  it("describes the pass with the town and the reserved week", () => {
    render(<PassCard pass={pass} />)
    expect(card().getAttribute("aria-label")).toBe("Season Pass 2027 for Andrea, Erie, blowout reserved for the week of October 4")
  })

  it("describes a finished season by its blowout date", () => {
    render(<PassCard pass={allDone} />)
    expect(card().getAttribute("aria-label")).toContain("blowout done on October 12")
    expect(screen.queryByText("Reserved")).not.toBeInTheDocument()
  })

  it("uses the flat artwork by default and the holographic artwork on request", () => {
    const { unmount } = render(<PassCard pass={pass} />)
    expect(card().querySelector("img")?.getAttribute("src")).toContain("pass-card-art.webp")
    unmount()
    render(<PassCard pass={pass} art="holo" />)
    expect(card().querySelector("img")?.getAttribute("src")).toContain("pass-card-art-holo")
  })

  it("listens for the pointer when interactive", () => {
    const listeners = cardListeners()
    render(<PassCard pass={pass} />)
    expect(listeners()).toContain("pointermove")
    expect(listeners()).toContain("pointerleave")
  })

  it("attaches no pointer listener when not interactive", () => {
    const listeners = cardListeners()
    render(<PassCard pass={pass} interactive={false} />)
    expect(listeners()).toEqual([])
    expect(slot("pass-card-sheen")).not.toBeNull()
  })

  it("reads cancelled in the band and greys the artwork", () => {
    render(<PassCard pass={{ ...pass, status: "cancelled" }} />)
    expect(screen.getByText("Cancelled")).toBeInTheDocument()
    expect(screen.queryByText("Turn-on")).not.toBeInTheDocument()
    expect(card().querySelector("img")?.className).toContain("grayscale")
    expect(card().getAttribute("aria-label")).toBe("Season Pass 2027 for Andrea, Erie, cancelled")
  })
})

describe("PassCard as a thumbnail", () => {
  it("shows the first name and the year only", () => {
    render(<PassCard pass={pass} size="thumb" />)
    expect(screen.getByText("Andrea")).toBeInTheDocument()
    expect(screen.getByText("2027")).toBeInTheDocument()
    expect(screen.queryByText("TH-2027-0001")).not.toBeInTheDocument()
    expect(screen.queryByText("Turn-on")).not.toBeInTheDocument()
    expect(card().getAttribute("aria-label")).toContain("week of October 4")
  })

  it("keeps the sheen but attaches no listeners", () => {
    const listeners = cardListeners()
    render(<PassCard pass={pass} size="thumb" />)
    expect(listeners()).toEqual([])
    expect(slot("pass-card-sheen")).not.toBeNull()
  })
})
