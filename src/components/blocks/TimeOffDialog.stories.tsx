import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { TimeOffDialog, type TimeOffDialogProps, type TimeOffValue } from "./TimeOffDialog"
import { PEOPLE } from "./scheduler-panels-fixtures"

// Time off for a person, at 375 and 1280. Each state has a 1280 story and a 375 twin.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Harness(args: TimeOffDialogProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="p-6">
      <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        Time off
      </Button>
      <TimeOffDialog {...args} open={open} onOpenChange={setOpen} />
    </div>
  )
}

const hours: TimeOffValue = { personId: "person_truck-1", allDay: false, from: "2026-12-04", to: "2026-12-04", startTime: "13:00", endTime: "15:00", note: "Dentist" }
const people = PEOPLE.map((p) => ({ id: p.id, name: p.name }))

const meta = {
  title: "Blocks/Scheduler/TimeOffDialog",
  component: Harness,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { open: true, onOpenChange: () => {}, people, initial: hours, onSave: fn(), onRemove: fn(), onMoveThem: fn() },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** Blocked hours on one day. */
export const Default: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = within(await within(document.body).findByRole("dialog", { name: "Time off" }))
    await expect(dialog.getByRole("combobox", { name: "Start time" })).toHaveValue("13:00")
    await userEvent.click(dialog.getByRole("button", { name: "Add time off" }))
    await expect(args.onSave).toHaveBeenCalledWith(expect.objectContaining({ personId: "person_truck-1", startTime: "13:00" }))
  },
}
export const Phone: Story = { globals: PHONE }

/** A whole day: the times are hidden. */
export const AllDay: Story = { args: { initial: { ...hours, allDay: true, note: "" } } }
export const AllDayPhone: Story = { ...AllDay, globals: PHONE }

/** A new span with nothing filled in yet: today as both ends, the default hours. */
export const Empty: Story = { args: { initial: { personId: "person_truck-1", allDay: true, from: "2026-11-26", to: "2026-11-26", startTime: "09:00", endTime: "17:00", note: "" } } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

/** Two booked visits fall inside: they are named and stay where they are. */
export const OverBookedVisits: Story = { args: { visitsInside: [{ id: "v-1", label: "Cassie, Erie" }, { id: "v-2", label: "Dana, Erie" }] } }
export const OverBookedVisitsPhone: Story = { ...OverBookedVisits, globals: PHONE }

/** Opened on a saved time off: Save and Remove. */
export const EditSaved: Story = { args: { mode: "edit" } }
export const EditSavedPhone: Story = { ...EditSaved, globals: PHONE }

/** Several days off, a tech who may only add their own: one person in the list. */
export const SeveralDaysOneTech: Story = { args: { people: [people[1]!], initial: { ...hours, personId: "person_truck-2", allDay: true, to: "2026-12-08", note: "" } } }
