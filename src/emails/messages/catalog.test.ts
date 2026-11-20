import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { storyNameFromExport, toId } from "storybook/internal/csf"
import { JOURNEY_TITLE, MESSAGES, storyIdOf } from "./catalog"

// The Overview's links must resolve: every story id the table draws is read from the stories files themselves (the group title and the export name), the same way the
// review guide's test does it, so a renamed or deleted story fails here.

function storyFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? storyFiles(join(dir, e.name)) : e.name.endsWith(".stories.tsx") ? [join(dir, e.name)] : []))
}
function allStoryIds(): Set<string> {
  const ids = new Set<string>()
  for (const file of storyFiles(join(process.cwd(), "src"))) {
    const text = readFileSync(file, "utf8")
    const title = text.match(/title:\s*"([^"]+)"/)?.[1]
    if (!title) continue
    for (const m of text.matchAll(/^export const (\w+)/gm)) ids.add(toId(title, storyNameFromExport(m[1]!)))
  }
  return ids
}

describe("the Messages catalog", () => {
  const ids = allStoryIds()

  it("links a laptop story and a phone story that exist for every message", () => {
    const missing = MESSAGES.flatMap((m) => [storyIdOf(m, "laptop"), storyIdOf(m, "phone")]).filter((id) => !ids.has(id))
    expect(missing).toEqual([])
  })

  it("links the Design rules page and the archive of live emails", () => {
    expect(ids.has("messages-design-rules--rules")).toBe(true)
    expect(ids.has("messages-archive-of-every-live-email--receipt")).toBe(true)
    expect(ids.has("messages-overview--table")).toBe(true)
  })

  it("has no message id or export name twice, and puts every message in a journey group that has a title", () => {
    expect(new Set(MESSAGES.map((m) => m.id)).size).toBe(MESSAGES.length)
    expect(new Set(MESSAGES.map((m) => `${m.journey}/${m.exportName}`)).size).toBe(MESSAGES.length)
    for (const m of MESSAGES) expect(JOURNEY_TITLE[m.journey]).toMatch(/^Messages\//)
  })

  it("gives every message a way to render each channel it claims, and marks a not-built renderer as a prototype", () => {
    for (const m of MESSAGES) {
      if (m.channels.includes("text")) expect(m.text, `${m.id} text`).toBeTypeOf("function")
      if (m.channels.includes("email")) expect(m.proposed, `${m.id} proposed email`).toBeTypeOf("function")
      if (m.renderer === "not built") expect(m.prototype?.length, `${m.id} prototype`).toBeGreaterThan(0)
      expect(m.when.trim().endsWith("."), `${m.id} when`).toBe(true)
    }
  })

  it("covers every email and text kind the app can send a customer", () => {
    const kinds = new Set(MESSAGES.map((m) => m.kind))
    for (const kind of ["booking-confirmation", "date-set", "date-moved", "date-confirm", "day-before", "on-the-way", "visit-cancelled", "invoice", "invoice-reminder", "receipt", "card-failed", "card-expiring", "purchase-confirmation", "renewal", "cancelled", "sign-in", "not-closed-crew", "admin-alert"]) expect(kinds.has(kind), kind).toBe(true)
  })
})
