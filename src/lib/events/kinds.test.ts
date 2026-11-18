// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { aboutOfLegacy, EVENT_KINDS, eventKindOfLegacy, LEGACY_EVENT_KIND } from "./kinds"

const folder = fileURLToPath(new URL("../../../drizzle/", import.meta.url))
const sql = () => readFileSync(folder + readdirSync(folder).find((f) => f.startsWith("0020_event"))!, "utf8")

describe("LEGACY_EVENT_KIND", () => {
  it("maps every legacy kind to a kind in the vocabulary", () => {
    for (const to of Object.values(LEGACY_EVENT_KIND)) expect(EVENT_KINDS).toContain(to)
  })

  it("is exactly the case in migration 0020", () => {
    const text = sql()
    const found = [...text.matchAll(/when '([a-z-]+)' then '([a-z.-]+)'/g)].map((m) => [m[1], m[2]])
    expect(Object.fromEntries(found)).toEqual(LEGACY_EVENT_KIND)
    expect(found).toHaveLength(Object.keys(LEGACY_EVENT_KIND).length)
  })

  it("translates a legacy kind and copies any other unchanged", () => {
    expect(eventKindOfLegacy("done-undone")).toBe("visit.undone")
    expect(eventKindOfLegacy("something-else")).toBe("something-else")
    expect(eventKindOfLegacy("toString")).toBe("toString")
  })
})

describe("aboutOfLegacy", () => {
  it("is the visit only for a visit. kind that has a visit", () => {
    expect(aboutOfLegacy("visit.moved", { visitId: "v", jobId: "j" })).toBe("visit")
    expect(aboutOfLegacy("job.sold", { visitId: "v", jobId: "j" })).toBe("job")
    expect(aboutOfLegacy("visit.moved", { jobId: "j" })).toBe("job")
  })

  it("is the customer when there is no job", () => {
    expect(aboutOfLegacy("consent", {})).toBe("customer")
    expect(aboutOfLegacy("consent", { jobId: null, visitId: null })).toBe("customer")
  })
})
