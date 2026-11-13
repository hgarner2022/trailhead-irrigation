import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { SettingsChange } from "@/lib/admin/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "./CardTitleHeading"
import { ChangeLog } from "./ChangeLog"

// The four changes in the snapshot: two by Hannah, one by Ryan, one more by
// Hannah, from November 5 to 11, shown newest first.
const changes = snapshot.settingsChanges as SettingsChange[]

const meta = {
  title: "Blocks/ChangeLog",
  component: ChangeLog,
  parameters: { layout: "padded" },
  args: { changes },
} satisfies Meta<typeof ChangeLog>
export default meta
type Story = StoryObj<typeof meta>

const narrow = (story: React.ReactNode) => <div className="max-w-2xl">{story}</div>

export const Default: Story = {
  render: (args) => narrow(<ChangeLog {...args} />),
}

export const Empty: Story = {
  args: { changes: [] },
  render: (args) => narrow(<ChangeLog {...args} />),
}

export const InCard: Story = {
  render: (args) => (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitleHeading>Change log</CardTitleHeading>
      </CardHeader>
      <CardContent>
        <ChangeLog {...args} />
      </CardContent>
    </Card>
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <ChangeLog {...args} />
    </div>
  ),
}
