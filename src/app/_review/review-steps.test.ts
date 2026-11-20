import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { storyNameFromExport, toId } from "storybook/internal/csf"
import { CHANGED_SINCE_LAST_REVIEW, REVIEW_PARTS } from "./review-steps"

// The review guide must not go stale: every story id it links is read from the stories files themselves (the group title and the export name),
// so a renamed or deleted story fails here and the list in review-steps.ts has to follow.

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

describe("the review guide", () => {
  const ids = allStoryIds()

  it("links only stories that exist", () => {
    const missing = REVIEW_PARTS.flatMap((p) => p.steps).filter((s) => !ids.has(s.id))
    expect(missing.map((s) => s.id)).toEqual([])
  })

  it("gives every step one sentence and every part a title", () => {
    for (const part of REVIEW_PARTS) {
      expect(part.title).not.toBe("")
      for (const step of part.steps) {
        expect(step.label).not.toBe("")
        expect(step.look.trim().endsWith(".")).toBe(true)
      }
    }
  })

  it("lists the changes since the last review in five or six lines", () => {
    expect(CHANGED_SINCE_LAST_REVIEW.length).toBeGreaterThanOrEqual(5)
    expect(CHANGED_SINCE_LAST_REVIEW.length).toBeLessThanOrEqual(6)
  })
})
