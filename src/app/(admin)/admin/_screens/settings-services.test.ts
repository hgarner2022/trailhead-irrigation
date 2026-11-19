import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import { SAMPLE_KEYS, setServiceField, type SettingsState } from "./settings-model"
import { bandWords, groupServices, renameGroup, setGroupField } from "./settings-services"

const data = snapshot as AdminData
const state: SettingsState = { settings: data.settings, changes: [], keys: SAMPLE_KEYS, services: SERVICE_LIST.map((s) => ({ ...s })) as ServiceItem[] }
const actor = { who: "Hannah", at: "2026-11-18T19:00:00Z" }
const groups = () => groupServices(state.services)
const group = (name: string) => groups().find((g) => g.name === name)!

describe("groupServices", () => {
  it("folds the bands of the turn-on and the inspection, in catalogue order, narrowest first", () => {
    const names = groups().map((g) => g.name)
    expect(names.slice(0, 3)).toEqual(["Spring turn-on & system check", "Mid-season inspection & tune-up", "Fall blowout & winterization"])
    const turnOn = group("Spring turn-on & system check")
    expect(turnOn.banded).toBe(true)
    expect(turnOn.rows.map((r) => r.key)).toEqual(["turn-on-8", "turn-on-12", "turn-on-16"])
    expect(turnOn.rows.map(bandWords)).toEqual(["up to 8 zones", "up to 12 zones", "up to 16 zones"])
    expect(state.services.length - groups().length).toBe(4)
  })

  it("keeps a band that does not follow the zones rule as its own row: the Rachio installs have a price each and no per-zone rule", () => {
    const rachio = groups().filter((g) => g.name.startsWith("Rachio"))
    expect(rachio).toHaveLength(2)
    expect(rachio.every((g) => !g.banded && g.rows.length === 1)).toBe(true)
  })

  it("splits a band out when its price or another fact no longer matches the others", () => {
    const odd = { ...state, services: state.services.map((s) => (s.key === "turn-on-12" ? { ...s, price: 160 } : s)) }
    const out = groupServices(odd.services)
    expect(out.filter((g) => g.name.startsWith("Spring turn-on")).map((g) => g.rows.map((r) => r.key))).toEqual([["turn-on-8", "turn-on-16"], ["turn-on-12"]])
    expect(out.find((g) => g.rows[0]!.key === "turn-on-12")!.banded).toBe(false)
  })

  it("leaves a single-row service alone", () => {
    const repair = group("Sprinkler repair visit")
    expect(repair).toMatchObject({ banded: false, id: "repair" })
    expect(repair.rows).toHaveLength(1)
  })
})

describe("group edits", () => {
  it("writes the price to every band and logs one line, in the service's name", () => {
    const next = setGroupField(state, group("Spring turn-on & system check"), "price", 155, actor)
    expect(next.services.filter((s) => s.key.startsWith("turn-on-")).map((s) => s.price)).toEqual([155, 155, 155])
    expect(next.services.find((s) => s.key === "inspection-8")!.price).toBe(145)
    expect(next.changes).toHaveLength(1)
    expect(next.changes[0]).toMatchObject({ field: "Spring turn-on & system check price", from: "$145", to: "$155", who: "Hannah" })
    // folded bands stay folded after the edit
    expect(groupServices(next.services).filter((g) => g.name.startsWith("Spring turn-on"))).toHaveLength(1)
  })

  it("logs nothing for the same value, and refuses a value out of range without touching a band", () => {
    expect(setGroupField(state, group("Spring turn-on & system check"), "price", 145, actor)).toBe(state)
    expect(setGroupField(state, group("Spring turn-on & system check"), "price", 200_000, actor)).toBe(state)
    expect(setGroupField(state, group("Spring turn-on & system check"), "includedZones", 20, actor)).toBe(state)
  })

  it("sets the dates on every band, refuses a day that does not exist and clears with null", () => {
    const g = group("Spring turn-on & system check")
    const from = setGroupField(state, g, "bookableFrom", "04-15", actor)
    const both = setGroupField(from, g, "bookableTo", "06-15", actor)
    expect(both.services.filter((s) => s.key.startsWith("turn-on-")).every((s) => s.bookableFrom === "04-15" && s.bookableTo === "06-15")).toBe(true)
    expect(both.changes.map((c) => [c.field, c.from, c.to])).toEqual([
      ["Spring turn-on & system check bookable from", "All year", "04-15"],
      ["Spring turn-on & system check bookable to", "All year", "06-15"],
    ])
    expect(setGroupField(state, g, "bookableFrom", "04-31", actor)).toBe(state)
    expect(setGroupField(state, g, "bookableFrom", "April", actor)).toBe(state)
    const cleared = setGroupField(from, g, "bookableFrom", null, actor)
    expect(cleared.services.find((s) => s.key === "turn-on-8")!.bookableFrom).toBeNull()
    expect(cleared.changes.at(-1)).toMatchObject({ from: "04-15", to: "All year" })
    expect(setGroupField(state, g, "bookableFrom", null, actor)).toBe(state)
  })

  it("sets how a service is offered online: book, quote, off", () => {
    const g = group("Sprinkler repair visit")
    const quote = setGroupField(state, g, "online", "quote", actor)
    expect(quote.services.find((s) => s.key === "repair")).toMatchObject({ bookable: false, quoteOnly: true })
    expect(quote.changes[0]).toMatchObject({ from: "Book a day", to: "We quote" })
    expect(setGroupField(quote, group("Sprinkler repair visit"), "online", "off", actor).services.find((s) => s.key === "repair")).toMatchObject({ bookable: false, quoteOnly: false })
    expect(setGroupField(state, g, "online", "book", actor)).toBe(state)
    expect(setGroupField(state, g, "online", "sometimes", actor)).toBe(state)
  })

  it("renames the service on every band and logs the service's own name, not a band's", () => {
    const next = renameGroup(state, group("Spring turn-on & system check"), "Spring start-up", actor)
    expect(next.services.filter((s) => s.key.startsWith("turn-on-")).map((s) => s.name)).toEqual(["Spring start-up, up to 8 zones", "Spring start-up, up to 12 zones", "Spring start-up, up to 16 zones"])
    expect(next.changes).toHaveLength(1)
    expect(next.changes[0]).toMatchObject({ field: "Spring turn-on & system check name", from: "Spring turn-on & system check", to: "Spring start-up" })
    expect(groupServices(next.services).some((g) => g.name === "Spring start-up" && g.banded)).toBe(true)
    expect(renameGroup(state, group("Spring turn-on & system check"), "  ", actor)).toBe(state)
    expect(renameGroup(state, group("Sprinkler repair visit"), "Repair visit", actor).services.find((s) => s.key === "repair")!.name).toBe("Repair visit")
  })

  it("keeps each band's own minutes", () => {
    const next = setServiceField(state, "turn-on-12", "slotMinutes", 105, actor)
    expect(next.services.filter((s) => s.key.startsWith("turn-on-")).map((s) => s.slotMinutes)).toEqual([60, 105, 120])
    expect(groupServices(next.services).filter((g) => g.name.startsWith("Spring turn-on"))).toHaveLength(1)
  })
})
