import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { PageHeader } from "./PageHeader"

const meta = {
  title: "Blocks/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
  args: {
    title: "Passes",
    context: "Thursday, November 12. Updated 4 minutes ago.",
    actions: (
      <>
        <Button variant="outline">Columns</Button>
        <Button>Export</Button>
      </>
    ),
  },
} satisfies Meta<typeof PageHeader>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TitleOnly: Story = {
  args: { context: undefined, actions: undefined },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <PageHeader {...args} />
    </div>
  ),
}
