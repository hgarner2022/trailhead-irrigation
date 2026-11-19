import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MoreMenu } from "./MoreMenu"

const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/MoreMenu",
  component: MoreMenu,
  parameters: { layout: "padded" },
  globals: PHONE,
  args: { current: "jobs" },
  render: (args) => (
    <div className="w-20 bg-sidebar text-sidebar-foreground">
      <MoreMenu {...args} />
    </div>
  ),
} satisfies Meta<typeof MoreMenu>
export default meta
type Story = StoryObj<typeof meta>

/** The bordered, labelled button in the bottom bar's fifth place. */
export const Default: Story = {}
/** Reports or Settings is the screen: filled. */
export const Empty: Story = { args: { current: "settings" } }
export const Phone: Story = {}
