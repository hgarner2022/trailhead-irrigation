import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DoNotServiceLine, DoNotServiceTag } from "./DoNotServiceTag"

const meta = { title: "Blocks/DoNotServiceTag", component: DoNotServiceTag, parameters: { layout: "padded" } } satisfies Meta<typeof DoNotServiceTag>
export default meta
type Story = StoryObj<typeof meta>

/** The red tag in a customer's header: a mark only, it blocks nothing. */
export const Default: Story = { args: {}, globals: { viewport: { value: "laptop", isRotated: false } } }
/** The small tag in a Customers list row and a Cmd+K hit; the reason is a tooltip. */
export const Small: Story = { args: { size: "sm", reason: "Would not let us in the gate twice." } }
/** New job's line under the picked customer. */
export const NewJobLine: Story = { render: () => <DoNotServiceLine reason="Would not let us in the gate twice." className="max-w-md" /> }
export const Phone: Story = { args: {}, globals: { viewport: { value: "phone", isRotated: false } } }
