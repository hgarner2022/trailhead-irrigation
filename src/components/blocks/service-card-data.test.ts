import { afterEach, describe as suite, expect, it, vi } from "vitest"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { SERVICES, includedWords, lengthWords, money, shortLength, type ServiceEntry } from "@/lib/booking/services"
import { SERVICE_LIST, serviceCost, type ServiceDef } from "@/lib/services"
import { describe, metaLine, panelOf, priceRule } from "./service-card-model"

// Where a service card's words come from. Every bookable card is checked against the backend's own row (`SERVICE_LIST`, the rows of the `service` table that Settings > Services edits):
// the length, the meta line, the price rule and what is included are worked out here from the row alone and must equal what the card shows. Nothing in this file names a price, a length
// or a sentence, so a change to a row is a change to the card. The card's NAME is the booking form's own short name (`PRESENTATION` in src/lib/booking/services.ts): the rows are named
// per zone band or at more length ("Spring turn-on & system check, up to 8 zones", "Sprinkler repair visit"), so the form's name is the start of the row's name, and a rename in Settings does not reach the card.

const ENTRIES = bookingEntries(SERVICES, "2027-04-14")
const SINGLE = ENTRIES.filter((e) => e.kind !== "pass")
/** the row a card reads: the entry's first backend key (the smallest zone band of a service sold by band) */
const rowOf = (entry: ServiceEntry): ServiceDef => SERVICE_LIST.find((s) => s.key === entry.serviceKeys[0])!
const sentences = (text: string) => text.split(/(?<=\.)\s+/).map((s) => s.replace(/\.$/, ""))

suite("a service card reads the catalogue row", () => {
  it("covers every service the booking list offers, each with a row behind it", () => {
    expect(SINGLE.length).toBeGreaterThan(0)
    for (const entry of SINGLE) expect(rowOf(entry), entry.key).toBeDefined()
  })

  it.each(SINGLE.map((e) => [e.key, e] as const))("%s: the name is the start of the row's name", (_key, entry) => {
    expect(rowOf(entry).name.startsWith(entry.name)).toBe(true)
  })

  it.each(SINGLE.map((e) => [e.key, e] as const))("%s: the length is the row's slotMinutes", (_key, entry) => {
    const row = rowOf(entry)
    expect(panelOf(entry).facts.length).toBe(lengthWords(row.slotMinutes))
    expect(entry.minutes).toBe(row.slotMinutes)
  })

  it.each(SINGLE.map((e) => [e.key, e] as const))("%s: the meta line is the row's price and slotMinutes", (_key, entry) => {
    const row = rowOf(entry)
    // "From" only where the price moves with the zone count; the lowest price is the row's price for one zone
    const price = `${entry.perZone ? "From " : ""}${money(serviceCost(row, 1)!)}`
    expect(metaLine(entry)).toBe(`${price} · ${shortLength(row.slotMinutes)}`)
  })

  it.each(SINGLE.map((e) => [e.key, e] as const))("%s: the price rule is the row's price, includedZones and extraZonePrice", (_key, entry) => {
    const row = rowOf(entry)
    const rule = row.includedZones && row.extraZonePrice ? `${money(row.price!)} up to ${row.includedZones} zones, then ${money(row.extraZonePrice)} a zone` : entry.price
    expect(priceRule(entry)).toBe(rule)
    expect(panelOf(entry).facts.rule).toBe(rule)
    // a row with no zone rule shows its own price
    if (!row.includedZones) expect(rule).toContain(money(row.price!))
  })

  it.each(SINGLE.map((e) => [e.key, e] as const))("%s: what is included is the row's description and nothing else", (_key, entry) => {
    const row = rowOf(entry)
    const panel = panelOf(entry)
    // the card shows the description without its sentences about quotes and return visits, split into a lead line and a list when it is written "Lead: a, b and c."
    expect({ lead: panel.lead, items: panel.items.map((i) => i.text) }).toEqual(describe(includedWords(row.description)))
    const source = row.description.toLowerCase()
    for (const sentence of sentences(panel.lead)) expect(source, sentence).toContain(sentence.toLowerCase())
    for (const item of panel.items) {
      expect(source, item.text).toContain(item.text.toLowerCase())
      expect(item.price).toBeUndefined()
    }
  })

  it("the Season Pass lists its two visits at the turn-on's and the blowout's own row prices", () => {
    const pass = ENTRIES.find((e) => e.kind === "pass")!
    const panel = panelOf(pass)
    const from = (key: string) => `From ${money(serviceCost(SERVICE_LIST.find((s) => s.key === key)!, 1)!)}`
    expect(panel.lead).toBe(PASS_SCHEDULES)
    expect(panel.items).toEqual([
      // each visit carries the form's name of that service's own card
      { text: ENTRIES.find((e) => e.key === "spring-turn-on")!.name, price: from("turn-on-8") },
      { text: ENTRIES.find((e) => e.key === "fall-blowout")!.name, price: from("blowout") },
    ])
    expect(panel.facts).toEqual({})
  })

  it("records which descriptions split into a lead line and a list, and which are shown as a paragraph", () => {
    const shape = Object.fromEntries(SINGLE.map((e) => [e.key, panelOf(e).items.length > 0 ? "lead and list" : "paragraph"]))
    expect(shape).toEqual({
      "spring-turn-on": "lead and list",
      "fall-blowout": "paragraph",
      inspection: "lead and list",
      repair: "paragraph",
      "rachio-install": "paragraph",
      "water-efficiency": "paragraph",
    })
  })
})

suite("a change to a row reaches the card", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/services")
    vi.resetModules()
  })

  it("a new price, length, zone rule and description on the rows are what the card shows next", async () => {
    vi.resetModules()
    vi.doMock("@/lib/services", async (original) => {
      const real = await original<typeof import("@/lib/services")>()
      const changed = (row: ServiceDef): ServiceDef => {
        if (row.key === "repair") return { ...row, price: 160, slotMinutes: 90, description: "Test visit: first thing, second thing and third thing." }
        if (row.key === "blowout") return { ...row, price: 99, includedZones: 7, extraZonePrice: 12, slotMinutes: 45 }
        return row
      }
      return { ...real, SERVICE_LIST: real.SERVICE_LIST.map(changed) }
    })
    const catalogue = await import("@/lib/booking/services")
    const model = await import("./service-card-model")
    const entry = (key: string) => catalogue.SERVICES.find((s) => s.key === key)!

    expect(model.metaLine(entry("repair"))).toBe("$160 · 1 hr 30 min")
    expect(model.panelOf(entry("repair"))).toEqual({
      lead: "Test visit.",
      items: [{ text: "First thing" }, { text: "Second thing and third thing" }],
      facts: { length: "About 1 hour 30 minutes", rule: "$160" },
    })
    expect(model.metaLine(entry("fall-blowout"))).toBe("From $99 · 45 min")
    expect(model.panelOf(entry("fall-blowout")).facts).toEqual({ length: "About 45 minutes", rule: "$99 up to 7 zones, then $12 a zone" })
  })
})
