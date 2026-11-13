import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassCard } from "./PassCard"

// passes[0] is Andrea in Erie: turn-on done May 3, both preferences recommended.
// passes[2] has not had a visit yet, with the turn-on preferred earlier.
const pass = snapshot.passes[0] as Pass
const fresh = snapshot.passes[2] as Pass
const cancelled: Pass = { ...pass, status: "cancelled" }
const allDone: Pass = {
  ...(snapshot.passes[1] as Pass),
  visits: (snapshot.passes[1] as Pass).visits.map((v, i) => ({
    ...v,
    scheduledAt: ["2027-05-04T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-12T16:00:00Z"][i],
    completedAt: ["2027-05-04T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-12T16:40:00Z"][i],
  })),
}

const card = () => screen.getByRole("article")
const slot = (name: string) => card().querySelector<HTMLElement>(`[data-slot="${name}"]`)

type Listener = readonly [name: string, target: unknown, handler: unknown]
interface Spy {
  mock: { calls: unknown[][]; contexts: unknown[] }
}
const entries = (spy: Spy): Listener[] => spy.mock.calls.map((c, i) => [String(c[0]), spy.mock.contexts[i], c[1]] as const)

/**
 * Spies on the card's and the window's listeners, ignoring React's own root
 * listeners (they sit on the render container, not on the card).
 */
function listeners() {
  const add = vi.spyOn(HTMLElement.prototype, "addEventListener")
  const remove = vi.spyOn(HTMLElement.prototype, "removeEventListener")
  const addWindow = vi.spyOn(window, "addEventListener")
  const removeWindow = vi.spyOn(window, "removeEventListener")
  const onCard = (l: Listener) => l[1] instanceof HTMLElement && l[1].dataset.slot === "pass-card"
  return {
    card: () => entries(add).filter(onCard).map((l) => l[0]),
    window: () => entries(addWindow).map((l) => l[0]),
    added: () => [...entries(add).filter(onCard), ...entries(addWindow)],
    removed: () => [...entries(remove).filter(onCard), ...entries(removeWindow)],
  }
}

/** iOS: a gated sensor and a touch screen. */
function stubIos(answer: "granted" | "denied" = "granted") {
  class FakeOrientation extends Event {
    static requestPermission = vi.fn().mockResolvedValue(answer)
  }
  vi.stubGlobal("DeviceOrientationEvent", FakeOrientation)
  Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true })
  return FakeOrientation.requestPermission
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true })
})

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

  it("keeps the brand line on one line inside the capped name block", () => {
    // The name block is capped at 45% of the card so the name stays off the sun; on a 343px card that is narrower than the brand line.
    render(<PassCard pass={pass} />)
    expect(screen.getByText("Trailhead Lawn & Irrigation")).toHaveClass("whitespace-nowrap")
  })

  it("shows the blowout preference with a Preferred chip in the blowout cell", () => {
    render(<PassCard pass={pass} />)
    const blowout = card().querySelector('[data-slot="pass-visit"][data-kind="blowout"]')
    expect(blowout?.textContent).toContain("Preferred")
    expect(blowout?.textContent).toContain("Mid October")
    expect(screen.queryByText("Reserved")).not.toBeInTheDocument()
  })

  it("shows the turn-on preference until the visit has a day, without a chip", () => {
    render(<PassCard pass={fresh} />)
    const turnOn = card().querySelector('[data-slot="pass-visit"][data-kind="turn-on"]')
    expect(turnOn?.textContent).toContain("Early May")
    expect(turnOn?.textContent).not.toContain("Preferred")
    const inspection = card().querySelector('[data-slot="pass-visit"][data-kind="inspection"]')
    expect(inspection?.textContent).toBe("InspectionJuly")
  })

  it("shows a booked blowout as its date, lit, with no chip", () => {
    const booked: Pass = { ...pass, visits: pass.visits.map((v) => (v.kind === "blowout" ? { ...v, scheduledAt: "2027-10-12T16:00:00Z" } : v)) }
    render(<PassCard pass={booked} />)
    const blowout = card().querySelector('[data-slot="pass-visit"][data-kind="blowout"]')
    expect(blowout?.textContent).toBe("BlowoutOct 12")
    expect(card().getAttribute("aria-label")).toContain("blowout on October 12")
  })

  it("shows a completed visit as its date with a check", () => {
    render(<PassCard pass={pass} />)
    const turnOn = card().querySelector('[data-slot="pass-visit"][data-kind="turn-on"]')
    expect(turnOn?.textContent).toContain("May 3")
    expect(turnOn?.textContent).toContain("done")
  })

  it("describes the pass with the town and the two preferences", () => {
    const { unmount } = render(<PassCard pass={fresh} />)
    expect(card().getAttribute("aria-label")).toBe("Season Pass 2027 for Abby, Broomfield, turn-on preferred early May, blowout preferred mid October")
    unmount()
    render(<PassCard pass={pass} />)
    expect(card().getAttribute("aria-label")).toBe("Season Pass 2027 for Andrea, Erie, turn-on done on May 3, blowout preferred mid October")
  })

  it("describes a finished season by its blowout date", () => {
    render(<PassCard pass={allDone} />)
    expect(card().getAttribute("aria-label")).toContain("blowout done on October 12")
    expect(screen.queryByText("Preferred")).not.toBeInTheDocument()
  })

  it("uses the flat artwork by default and the holographic artwork on request", () => {
    const { unmount } = render(<PassCard pass={pass} />)
    expect(card().querySelector("img")?.getAttribute("src")).toContain("pass-card-art.webp")
    unmount()
    render(<PassCard pass={pass} art="holo" />)
    expect(card().querySelector("img")?.getAttribute("src")).toContain("pass-card-art-holo")
  })

  it("marks the image as priority only when asked", () => {
    const { unmount } = render(<PassCard pass={pass} />)
    expect(card().querySelector("img")?.getAttribute("loading")).toBe("lazy")
    unmount()
    render(<PassCard pass={pass} priority />)
    expect(card().querySelector("img")?.getAttribute("loading")).not.toBe("lazy")
  })

  it("listens for the pointer on the card and for resize on the window when interactive", () => {
    const spy = listeners()
    render(<PassCard pass={pass} />)
    expect(spy.card()).toEqual(expect.arrayContaining(["pointerenter", "pointermove", "pointerleave"]))
    expect(spy.window()).toContain("resize")
  })

  it("attaches no listeners when not interactive, nor for a cancelled pass", () => {
    const spy = listeners()
    const { unmount } = render(<PassCard pass={pass} interactive={false} />)
    expect(spy.card()).toEqual([])
    expect(spy.window()).toEqual([])
    expect(slot("pass-card-sheen")).not.toBeNull()
    unmount()
    render(<PassCard pass={cancelled} />)
    expect(spy.card()).toEqual([])
    expect(spy.window()).toEqual([])
  })

  it("attaches no listeners when the reader prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }))
    const spy = listeners()
    render(<PassCard pass={pass} />)
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)")
    expect(spy.card()).toEqual([])
    expect(spy.window()).toEqual([])
  })

  it("removes every listener it added on unmount", () => {
    const spy = listeners()
    const { unmount } = render(<PassCard pass={pass} />)
    expect(spy.added().length).toBeGreaterThan(0)
    unmount()
    const removed = spy.removed()
    for (const [name, target, handler] of spy.added()) {
      expect(removed.some((r) => r[0] === name && r[1] === target && r[2] === handler)).toBe(true)
    }
  })

  it("offers the tilt shine on iOS and asks only after a tap", async () => {
    const ask = stubIos()
    const spy = listeners()
    render(<PassCard pass={pass} />)
    const button = screen.getByRole("button", { name: "Turn on the tilt shine" })
    expect(button).toHaveTextContent("Tilt")
    expect(ask).not.toHaveBeenCalled()
    expect(spy.window()).not.toContain("deviceorientation")
    fireEvent.click(button)
    expect(ask).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole("button", { name: "Turn on the tilt shine" })).not.toBeInTheDocument())
    expect(spy.window()).toContain("deviceorientation")
  })

  it("drops the offer when the tap is refused", async () => {
    const ask = stubIos("denied")
    const spy = listeners()
    render(<PassCard pass={pass} />)
    fireEvent.click(screen.getByRole("button", { name: "Turn on the tilt shine" }))
    await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument())
    expect(ask).toHaveBeenCalledTimes(1)
    expect(spy.window()).not.toContain("deviceorientation")
  })

  it("reads cancelled in the band and greys the artwork", () => {
    render(<PassCard pass={cancelled} />)
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
    expect(screen.queryByText("Cancelled")).not.toBeInTheDocument()
    expect(card().getAttribute("aria-label")).toContain("blowout preferred mid October")
  })

  it("keeps the sheen but attaches no listeners", () => {
    const spy = listeners()
    render(<PassCard pass={pass} size="thumb" />)
    expect(spy.card()).toEqual([])
    expect(spy.window()).toEqual([])
    expect(slot("pass-card-sheen")).not.toBeNull()
  })

  it("labels a cancelled pass with a chip", () => {
    render(<PassCard pass={cancelled} size="thumb" />)
    expect(screen.getByText("Cancelled")).toBeInTheDocument()
    expect(card().querySelector("img")?.className).toContain("grayscale")
    expect(card().getAttribute("aria-label")).toContain("cancelled")
  })
})
