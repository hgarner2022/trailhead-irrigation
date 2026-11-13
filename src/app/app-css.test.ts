import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// app.css is the one stylesheet entry for the admin, checkout, account and
// booking route groups. It must scan only the app folders so the marketing
// bundle (globals.css) and this one never overlap.
const css = readFileSync(join(__dirname, "app.css"), "utf8")
const sources = [...css.matchAll(/@source\s+(?!not)"([^"]+)"/g)].map((m) => m[1])

describe("app.css", () => {
  it("turns off automatic source detection and loads Tailwind, the tokens and the base rules", () => {
    expect(css).toContain('@import "tailwindcss" source(none)')
    expect(css).toContain('@import "./tokens.css"')
    expect(css).toContain('@import "./base.css"')
  })

  it.each(["./(admin)", "./(checkout)", "./(account)", "./(booking)", "../components/blocks", "../components/ui", "../lib/admin", "../lib/pass"])(
    "scans %s",
    (dir) => {
      expect(sources).toContain(dir)
    },
  )

  it("never scans the marketing tree, apart from the four files the branded 404 renders", () => {
    const chrome = ["Header", "Footer", "SeasonalPill", "PageBanner"].map((n) => `../components/sections/${n}.tsx`)
    for (const s of sources) {
      expect(s).not.toContain("(site)")
      if (s.includes("sections")) expect(chrome).toContain(s)
    }
    expect(sources.filter((s) => s.includes("sections"))).toHaveLength(chrome.length)
  })

  it("keeps stories and tests out of the scan", () => {
    expect(css).toContain('@source not "../components/**/*.stories.tsx"')
  })
})
