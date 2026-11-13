import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
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

describe("SettingsScreen with actions", () => {
  it("saves the edited settings through the action and says so, or says why not", async () => {
    const user = userEvent.setup()
    const save = vi.fn().mockResolvedValueOnce({ ok: false, message: "Pick at least one town for Area 3 before saving." }).mockResolvedValueOnce({ ok: true, data: undefined })
    const actions = { save, createKey: vi.fn(), revokeKey: vi.fn() }
    render(<SettingsScreen data={data} today={TODAY} actions={actions} />)
    const name = screen.getByRole("textbox", { name: "Truck 2 name" })
    await user.clear(name)
    await user.type(name, "Blowout truck{Enter}")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Pick at least one town for Area 3 before saving.", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(save.mock.calls[0]![0].trucks.map((t: { name: string }) => t.name)).toContain("Blowout truck")
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled())
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Saved just now", {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it("disables every field and offers no Save to a tech", () => {
    render(<SettingsScreen data={data} today={TODAY} readOnly actions={{ save: vi.fn(), createKey: vi.fn(), revokeKey: vi.fn() }} />)
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(screen.getByRole("textbox", { name: "Truck 2 name" })).toBeDisabled()
    expect(screen.getByText("You can read the settings; a manager changes them.")).toBeInTheDocument()
  })
})
