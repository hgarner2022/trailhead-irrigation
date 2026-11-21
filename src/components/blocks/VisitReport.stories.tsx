import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { reportFor } from "@/emails/fixtures"
import { VisitReport } from "./VisitReport"

// "What we did": the visit's checklist with check marks, an open item marked Not done, and the photos Ryan shared with the customer. The heading and the items are the only words.
const meta = {
  title: "Blocks/VisitReport",
  component: VisitReport,
  parameters: { layout: "padded" },
  args: { report: reportFor("repair", 4, 2, "") },
} satisfies Meta<typeof VisitReport>
export default meta
type Story = StoryObj<typeof meta>

const phone = { viewport: { value: "phone", isRotated: false } }
const laptop = { viewport: { value: "laptop", isRotated: false } }

/** The repair: four of five done, the open one marked Not done, two photos. */
export const RepairPhone: Story = { globals: phone }
export const RepairLaptop: Story = { globals: laptop }
/** A fall blowout, every item done and no photos shared: the checklist alone. */
export const BlowoutNoPhotosPhone: Story = { args: { report: reportFor("fall blowout", undefined, 0, "") }, globals: phone }
/** A spring turn-on with the photos Ryan shared. */
export const TurnOnLaptop: Story = { args: { report: reportFor("spring turn-on", undefined, 2, "") }, globals: laptop }
