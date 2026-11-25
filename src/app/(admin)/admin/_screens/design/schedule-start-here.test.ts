import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { storyNameFromExport, toId } from "storybook/internal/csf"
import { CHANGED, CHOOSE, LOOK, TRY } from "./schedule-start-here"

// The guide must not go stale: every story id it links is read from the stories files themselves.

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

describe("the Scheduler start-here guide", () => {
  const ids = allStoryIds()
  it("links only stories that exist", () => {
    const links = [...LOOK.map((s) => s.id), ...CHOOSE.flatMap((c) => (c.link ? [c.link.id] : []))]
    expect(links.filter((id) => !ids.has(id))).toEqual([])
  })
  it("says each thing in a sentence and keeps to the copy rules", () => {
    const text = [...LOOK.map((s) => s.look), ...TRY, ...CHANGED, ...CHOOSE.map((c) => c.line)]
    for (const line of text) {
      expect(line.trim().endsWith(".") || line.trim().endsWith("?")).toBe(true)
      expect(line).not.toMatch(/—|\btruck\b|\brequest\b|\bCancelled\b|\bOverdue\b|\bOwed\b|\bBill\b/i)
    }
    expect(CHOOSE).toHaveLength(4)
  })
})
