import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { JobRow, type JobRowProps } from "./JobRow"

const meta = {
  title: "Blocks/JobRow",
  component: JobRow,
  parameters: { layout: "padded" },
  args: { href: "/account/jobs/job_1", name: "Season Pass 2027", soldOn: "2026-11-03", visitsLine: "2 visits", total: 240, money: { tone: "paid", label: "Paid" } },
  render: (args: JobRowProps) => (
    <ul className="mx-auto max-w-3xl divide-y divide-border">
      <JobRow {...args} />
      <JobRow href="/account/jobs/job_2" name="Repair" soldOn="2026-11-03" visitsLine="1 visit" total={145} money={{ tone: "unpaid", label: "$145 unpaid" }} />
      <JobRow href="/account/jobs/job_3" name="Repair" soldOn="2026-10-20" visitsLine="1 visit" total={115} money={{ tone: "invoice-sent", label: "Invoice sent, due Dec 1" }} />
      <JobRow href="/account/jobs/job_4" name="Fall blowout" soldOn="2025-10-04" visitsLine="1 visit" total={95} money={{ tone: "past-due", label: "Past due since Nov 1" }} />
      <JobRow href="/account/jobs/job_5" name="Installation" soldOn="2025-06-04" total={0} money={{ tone: "none", label: "" }} canceled />
    </ul>
  ),
} satisfies Meta<typeof JobRow>
export default meta
type Story = StoryObj<typeof meta>

export const ListPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const ListLaptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
