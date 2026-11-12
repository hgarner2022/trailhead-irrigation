import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { BlowoutWeek } from "@/lib/admin/types"
import { WeekCard } from "./WeekCard"

// The four October weeks of 2027 from the snapshot, 20 spots each.
const weeks = snapshot.blowoutWeeks as BlowoutWeek[]
const full: BlowoutWeek = { ...weeks[1], taken: 20 }

const meta = {
  title: "Blocks/WeekCard",
  component: WeekCard,
  parameters: { layout: "padded" },
  args: { week: weeks[0] },
} satisfies Meta<typeof WeekCard>
export default meta
type Story = StoryObj<typeof meta>

const narrow = (story: React.ReactNode) => <div className="max-w-[260px]">{story}</div>

export const Default: Story = {
  render: (args) => narrow(<WeekCard {...args} />),
}

export const Full: Story = {
  args: { week: full },
  render: (args) => narrow(<WeekCard {...args} />),
}

/** The capacity was lowered under what is already reserved: the number turns destructive and the chip says so. */
export const OverCapacity: Story = {
  args: { week: { ...weeks[1], taken: 3, capacity: 1 } },
  render: (args) => narrow(<WeekCard {...args} />),
}

/** Capacity edits live in the card so the planner can see the spots change. */
function EditableDemo({ week }: { week: BlowoutWeek }) {
  const [capacity, setCapacity] = useState(week.capacity)
  return narrow(<WeekCard week={{ ...week, capacity }} editable onCapacityChange={setCapacity} />)
}

export const Editable: Story = {
  render: (args) => <EditableDemo week={args.week} />,
}

/** The checkout's week picker: four cards, one pressed. */
function SelectableRow({ onSelect, className, cardClassName }: { onSelect: () => void; className: string; cardClassName?: string }) {
  const [picked, setPicked] = useState(weeks[1].weekStart)
  return (
    <div className={className}>
      {[weeks[0], full, weeks[2], weeks[3]].map((week) => (
        <WeekCard
          key={week.weekStart}
          week={week}
          selected={week.weekStart === picked}
          onSelect={() => {
            setPicked(week.weekStart)
            onSelect()
          }}
          className={cardClassName}
        />
      ))}
    </div>
  )
}

export const Selectable: Story = {
  args: { onSelect: fn() },
  render: (args) => <SelectableRow onSelect={args.onSelect ?? (() => {})} className="grid grid-cols-2 gap-4 lg:grid-cols-4" />,
}

export const Phone: Story = {
  args: { onSelect: fn() },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <SelectableRow onSelect={args.onSelect ?? (() => {})} className="flex snap-x gap-4 overflow-x-auto pb-2" cardClassName="min-w-[220px] snap-start" />
    </div>
  ),
}
