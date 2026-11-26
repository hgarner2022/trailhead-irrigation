import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SettingsScreen } from "./SettingsScreen"

// Below md a control is at least 44px to tap (docs/plans/2026-11-18-ux-audit-ryan.md row 16). jsdom has no layout, so these read the classes that make it so:
// a 44px height or hit area below md, and the laptop's size back from md up.

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.spyOn(console, "info").mockImplementation(() => undefined)
})

describe("44px tap targets below md", () => {
  it("the Settings tabs are 44px tall on a phone and the laptop's height from md", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const list = screen.getByRole("tablist", { name: "Settings sections" })
    for (const tab of within(list).getAllByRole("tab")) {
      expect(tab.className).toContain("h-14")
      expect(tab.className).toContain("md:h-10")
    }
  })

  it("a Settings checkbox has a 44px hit area below md that goes away from md", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const row = screen.getAllByRole("listitem")[0]!
    const box = row.querySelector<HTMLElement>('[data-slot="checkbox"]')!
    expect(box.className).toContain("after:-inset-3.5")
    expect(box.className).toContain("md:after:hidden")
  })

  it("a Settings row's Remove-style button is 44px tall on a phone", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const buttons = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label")?.match(/^(Remove|Deactivate)/))
    expect(buttons.length).toBeGreaterThan(0)
    for (const b of buttons) expect(b.className).toMatch(/(^| )h-11( |$)/)
  })
})
