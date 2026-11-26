import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PEOPLE, RYAN, TECH, initialState } from "./schedule-prototype-data"
import { columnsFor } from "./schedule-prototype-view"
import { useScheduleProto } from "./use-schedule-prototype"
import { buildWalkWorld } from "./walkthrough/visits-data"

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal("matchMedia", vi.fn((q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => vi.unstubAllGlobals())

const world = buildWalkWorld()
const [ryan, hannah] = world.people.map((p) => p.id) as [string, string]

describe("who is shown", () => {
  it("hides a person from the view only: the best times and suggestions still offer everyone", () => {
    const { result } = renderHook(() => useScheduleProto({ hidden: [hannah], world }))
    expect(result.current.shown.map((p) => p.id)).toEqual([ryan])
    const best = result.current.bestFor({ town: "Erie", minutes: 60, kind: "repair" })
    expect(best.people).toEqual(world.people.map((p) => p.name))
  })
  it("keeps at least one person on, remembers the choice in this browser, and reads it back", () => {
    const { result, unmount } = renderHook(() => useScheduleProto({ world }))
    act(() => result.current.togglePerson(hannah))
    expect(result.current.hidden).toEqual([hannah])
    act(() => result.current.togglePerson(ryan))
    expect(result.current.hidden).toEqual([hannah])
    expect(JSON.parse(window.localStorage.getItem("trailhead.schedule.hidden")!)).toEqual([hannah])
    unmount()
    expect(renderHook(() => useScheduleProto({ world })).result.current.hidden).toEqual([hannah])
    act(() => undefined)
  })
  it("ignores a stored choice that would hide everyone", () => {
    window.localStorage.setItem("trailhead.schedule.hidden", JSON.stringify([ryan, hannah]))
    expect(renderHook(() => useScheduleProto({ world })).result.current.hidden).toEqual([])
  })
  it("a day's count describes only the people shown", () => {
    const s = initialState()
    const only = (id: string) => s.visits.filter((b) => b.personId === id)
    const both = columnsFor("day", "2026-11-24", PEOPLE, s.visits, s.meta, "2026-11-25", s.timeOff)[0]!
    const one = columnsFor("day", "2026-11-24", PEOPLE.filter((p) => p.id === RYAN), only(RYAN), s.meta, "2026-11-25", s.timeOff)[0]!
    expect(Number(/\d+/.exec(one.caption!)![0])).toBeLessThan(Number(/\d+/.exec(both.caption!)![0]))
    expect(Object.keys(one.stats!)).toEqual([RYAN])
    expect(TECH).not.toBe(RYAN)
  })
})
