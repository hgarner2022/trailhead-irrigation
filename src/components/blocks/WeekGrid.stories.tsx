import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { moveVisit } from "@/app/(admin)/admin/_screens/schedule-model"
import { WeekGrid } from "./WeekGrid"

// The week of Monday, November 9, 2026 from the snapshot: Truck 1 carries
// every visit, eight of them proposed on Thursday and Friday, two moved in
// Jobber earlier in the week; Truck 2 is idle until October. Today is the
// Thursday. The stateful wrapper lets a visit be selected and dragged.
const data = snapshot as AdminData
const TODAY = "2026-11-12"
const WEEK = "2026-11-09"

function Live(props: Omit<React.ComponentProps<typeof WeekGrid>, "selectedId" | "onSelect" | "onMove" | "onWeekChange" | "weekStart"> & { weekStart: string }) {
  const [visits, setVisits] = useState(props.visits)
  const [selectedId, setSelectedId] = useState<string>()
  const [weekStart, setWeekStart] = useState(props.weekStart)
  return (
    <WeekGrid
      {...props}
      visits={visits}
      weekStart={weekStart}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onMove={(id, truckId, day) => setVisits((v) => moveVisit(v, id, truckId, day, props.trucks, TIME_ZONE))}
      onWeekChange={setWeekStart}
    />
  )
}

const meta = {
  title: "Blocks/WeekGrid",
  component: WeekGrid,
  parameters: { layout: "padded" },
  args: {
    trucks: data.settings.trucks,
    areas: data.settings.areas,
    visits: data.visits,
    weekStart: WEEK,
    today: TODAY,
    timeZone: TIME_ZONE,
    onSelect: () => {},
    onMove: () => {},
    onWeekChange: () => {},
  },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof WeekGrid>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** An October week, when both trucks run and the days are full. */
export const TwoTrucks: Story = {
  args: { weekStart: "2026-10-05", today: "2026-10-08" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The same week with the proposals approved: no dashed blocks. */
export const Approved: Story = {
  args: { visits: data.visits.map((v): Visit => ({ ...v, proposed: undefined })) },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Empty: Story = {
  args: { trucks: [], areas: [] },
}

/** Under `md` the grid becomes one day with the trucks stacked. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
