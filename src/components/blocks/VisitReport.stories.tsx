import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { reportFor } from "@/emails/fixtures"
import { VisitReport } from "./VisitReport"

// "What we did": the visit's checked items with check marks and the photos Ryan shared with the customer. The heading and the items are the only words. An item that was not checked is never drawn, not even as
// "Not done" (Hannah, Nov 22 2026); the crew's checklist on the job page keeps showing them.
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

/** The repair: four of five items were checked, so four are listed and the fifth is not drawn at all, with two photos. */
export const RepairPhone: Story = { globals: phone }
export const RepairLaptop: Story = { globals: laptop }
/** A fall blowout, every item done and no photos shared: the checklist alone. */
export const BlowoutNoPhotosPhone: Story = { args: { report: reportFor("fall blowout", undefined, 0, "") }, globals: phone }
/** Nothing was checked: the section shows only the photos Ryan shared. */
export const NothingCheckedPhotosOnlyPhone: Story = { args: { report: reportFor("repair", 0, 2, "") }, globals: phone }
/** A spring turn-on with the photos Ryan shared. */
export const TurnOnLaptop: Story = { args: { report: reportFor("spring turn-on", undefined, 2, "") }, globals: laptop }
