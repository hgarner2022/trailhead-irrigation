import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { Input } from "@/components/ui/input"
import { FormRow } from "./FormRow"
import { SettingsFact, SettingsList } from "./SettingsList"

const rows = [
  { id: "a", title: "Ryan Garner", subtitle: "ryan@example.com", children: <FormRow label="Name" inline><Input defaultValue="Ryan Garner" /></FormRow> },
  { id: "b", title: "Sam Torres", children: <FormRow label="Name" inline><Input defaultValue="Sam Torres" /></FormRow> },
]

describe("SettingsList", () => {
  it("lists a row per thing, titled, with its facts under it", () => {
    render(<SettingsList title="People" description="Who works here." rows={rows} />)
    expect(screen.getByRole("heading", { level: 2, name: "People" })).toBeInTheDocument()
    expect(screen.getByText("Who works here.")).toBeInTheDocument()
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByRole("heading", { level: 3, name: "Ryan Garner" })).toBeInTheDocument()
    expect(within(items[0]!).getByText("ryan@example.com")).toBeInTheDocument()
    expect(within(items[0]!).getByLabelText("Name")).toHaveValue("Ryan Garner")
  })

  it("puts the action beside the heading and a row's buttons beside its title", () => {
    render(<SettingsList title="People" action={<button>Add person</button>} rows={[{ ...rows[0]!, aside: <button>Remove</button> }]} />)
    expect(screen.getByRole("button", { name: "Add person" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument()
  })

  it("shows the empty state when there are no rows", () => {
    render(<SettingsList title="People" rows={[]} empty={{ title: "No people yet", line: "Add one." }} />)
    expect(screen.getByText("No people yet")).toBeInTheDocument()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("draws the change log under the list when given changes, and none otherwise", () => {
    const { rerender } = render(<SettingsList title="People" rows={rows} changes={[{ id: "c", at: "2026-11-12T19:56:30Z", who: "Hannah", field: "Sam Torres role", from: "Tech", to: "Admin" }]} />)
    expect(screen.getByRole("heading", { name: "Changes" })).toBeInTheDocument()
    expect(screen.getByText("Sam Torres role")).toBeInTheDocument()
    rerender(<SettingsList title="People" rows={rows} />)
    expect(screen.queryByRole("heading", { name: "Changes" })).toBeNull()
  })

  it("draws a fact with no control as a label beside its value", () => {
    render(<SettingsFact label="Last used">Never</SettingsFact>)
    expect(screen.getByText("Last used")).toBeInTheDocument()
    expect(screen.getByText("Never")).toBeInTheDocument()
    expect(document.querySelector("label")).toBeNull()
  })

  it("runs the facts in one column when a row asks", () => {
    render(<SettingsList title="Messages" rows={[{ ...rows[0]!, single: true }]} />)
    expect(screen.getByLabelText("Name").closest('[data-slot="form-row"]')!.parentElement!.className).not.toContain("lg:grid-cols-2")
  })
})
