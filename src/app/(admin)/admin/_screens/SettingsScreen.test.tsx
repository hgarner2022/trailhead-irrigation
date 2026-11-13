import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SettingsScreen } from "./SettingsScreen"

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.spyOn(console, "info").mockImplementation(() => undefined)
})

const log = () => within(document.querySelector('[data-slot="change-log"]') as HTMLElement)

describe("SettingsScreen fields", () => {
  it("commits on Enter, keeps focus and logs one line", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} />)
    const name = screen.getByRole("textbox", { name: "Truck 2 name" })
    await user.clear(name)
    await user.type(name, "Blowout truck{Enter}")
    const after = screen.getByRole("textbox", { name: "Blowout truck name" })
    expect(after).toHaveValue("Blowout truck")
    expect(after).toHaveFocus()
    expect(log().getByText("Truck 2 name")).toBeInTheDocument()
  })

  it("puts the old value back when a field is blank or out of range", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} />)
    const blowouts = screen.getByRole("spinbutton", { name: "Truck 1 blowouts per day" })
    await user.clear(blowouts)
    await user.type(blowouts, "99{Enter}")
    expect(blowouts).toHaveValue(10)
    const name = screen.getByRole("textbox", { name: "Truck 1 name" })
    await user.clear(name)
    await user.tab()
    expect(name).toHaveValue("Truck 1")
    expect(log().queryByText("Truck 1 blowouts per day")).toBeNull()
  })
})

describe("SettingsScreen API keys", () => {
  it("shows the new key once and closes only with Done", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} defaultTab="keys" />)
    await user.click(screen.getByRole("tab", { name: "API keys" }))
    await user.click(screen.getByRole("button", { name: "Create key" }))
    await user.type(screen.getByLabelText("Key name"), "Billing agent")
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create key" }))
    const key = document.querySelector('[data-slot="new-key"]')!.textContent!
    expect(key).toMatch(/^th_live_/)
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
    await user.keyboard("{Escape}")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Billing agent")).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(key)
  })
})
