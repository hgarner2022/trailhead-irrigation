import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass, PassVisit } from "@/lib/admin/types"
import { Button } from "@/components/ui/button"
import { DataGrid } from "./DataGrid"
import { shortDate } from "@/lib/admin/format"
import { passColumns } from "./data-grid-columns"
import { StatusPill, statusLabel } from "./StatusPill"
import { SidePanel, SidePanelLayout } from "./SidePanel"

// The real use: the Passes grid as the page, the pass opening beside it from
// its name. Open by default so the panel is on screen without a click. The
// grid's columns and data are module constants, so they are stable.
const passes = snapshot.passes as Pass[]
const option = (value: string, label = value) => ({ value, label })
const FILTERS = [
  { column: "town", label: "Town", options: ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"].map((t) => option(t)) },
  { column: "status", label: "Status", options: (["active", "cancelled", "lapsed"] as const).map((s) => option(s, statusLabel(s))) },
]
const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }

const visitLine = (visit: PassVisit) =>
  visit.completedAt ? `${shortDate(visit.completedAt)}, done` : visit.scheduledAt ? `${shortDate(visit.scheduledAt)}, booked` : visit.window

function PassDetail({ pass }: { pass: Pass }) {
  const facts: [string, React.ReactNode][] = [
    ["Town", pass.town],
    ["Zones", pass.zones],
    ["Blowout week", `Week of ${shortDate(pass.blowoutWeek)}`],
    ["Status", <StatusPill key="status" status={pass.status} />],
  ]
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {facts.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="font-display text-lg text-navy">Visits</h3>
        <ul className="mt-2 divide-y divide-border text-sm">
          {pass.visits.map((visit) => (
            <li key={visit.kind} className="flex justify-between gap-4 py-2">
              <span className="font-medium">{VISIT_NAMES[visit.kind]}</span>
              <span className="text-muted-foreground">{visitLine(visit)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BesideGridDemo() {
  const [pass, setPass] = useState(passes[0])
  const [open, setOpen] = useState(true)
  return (
    <SidePanelLayout
      panel={
        <SidePanel
          open={open}
          onOpenChange={setOpen}
          title={pass.firstName}
          description={`Season Pass ${pass.season}, ${pass.number}`}
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={fn()}>Send card update link</Button>
            </>
          }
        >
          <PassDetail pass={pass} />
        </SidePanel>
      }
    >
      <div className="p-6">
        <DataGrid
          columns={passColumns}
          data={passes}
          getRowId={(p) => p.id}
          search={{ column: "firstName", placeholder: "Search by name" }}
          filters={FILTERS}
          exportName="passes"
          onOpen={(p) => {
            setPass(p)
            setOpen(true)
          }}
        />
      </div>
    </SidePanelLayout>
  )
}

function LongContentDemo() {
  const [open, setOpen] = useState(true)
  return (
    <div className="p-6">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open panel
      </Button>
      <SidePanel
        open={open}
        onOpenChange={setOpen}
        title="Charge history"
        description="Every charge on this pass, newest first."
        footer={
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <ul className="divide-y divide-border text-sm">
          {Array.from({ length: 40 }, (_, i) => (
            <li key={i} className="flex justify-between py-3">
              <span>Visit {40 - i}</span>
              <span className="tabular-nums text-muted-foreground">$145</span>
            </li>
          ))}
        </ul>
      </SidePanel>
    </div>
  )
}

const meta = {
  title: "Blocks/SidePanel",
  component: SidePanel,
  parameters: { layout: "fullscreen" },
  // Every story renders its own demo; these args only satisfy the required props.
  args: { open: true, onOpenChange: fn(), title: "Andrea", children: null },
} satisfies Meta<typeof SidePanel>
export default meta
type Story = StoryObj<typeof meta>

export const BesideGrid: Story = {
  render: () => <BesideGridDemo />,
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: () => <BesideGridDemo />,
}

export const LongContent: Story = {
  render: () => <LongContentDemo />,
}
