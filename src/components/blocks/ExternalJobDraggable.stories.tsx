import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DragDropProvider } from "@dnd-kit/react"
import { ExternalJobDraggable } from "./ExternalJobDraggable"

// A row that can be dropped onto the clock. Here alone it only lifts; the Drag playground of the clock has the target.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/ExternalJobDraggable",
  component: ExternalJobDraggable,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { id: "job_1", minutes: 60, label: "Larkspur Dr", children: <div className="w-72 rounded-lg border border-border bg-background p-3 text-sm text-navy">Larkspur Dr, spring turn-on, 1 h</div> },
  decorators: [(Story) => <DragDropProvider><Story /></DragDropProvider>],
} satisfies Meta<typeof ExternalJobDraggable>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
