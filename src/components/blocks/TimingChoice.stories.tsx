import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { TimingPreference } from "@/lib/admin/types"
import { TimingChoice } from "./TimingChoice"

function Harness({ kind, initial }: { kind: "turn-on" | "blowout"; initial: TimingPreference }) {
  const [value, setValue] = useState<TimingPreference>(initial)
  return (
    <div className="max-w-2xl">
      <h2 id="timing-question" className="mb-6 font-display text-3xl text-navy">
        {kind === "turn-on" ? "When should we turn your system on?" : "When should we blow out your system?"}
      </h2>
      <TimingChoice kind={kind} labelledBy="timing-question" value={value} onChange={setValue} />
    </div>
  )
}

const meta = {
  title: "Blocks/TimingChoice",
  component: Harness,
  parameters: { layout: "padded" },
  args: { kind: "turn-on", initial: "recommended" },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const TurnOn: Story = {}

export const Blowout: Story = {
  args: { kind: "blowout", initial: "later" },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
