import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomersScreen } from "./CustomersScreen"

// The placeholder has no data, so there is no NoDataYet story: Default is that state.

const meta = {
  title: "Screens/Customers",
  component: CustomersScreen,
  parameters: { layout: "fullscreen" },
  render: () => (
    <AdminShell current="customers" user={{ initials: "HG", name: "Hannah" }}>
      <CustomersScreen />
    </AdminShell>
  ),
} satisfies Meta<typeof CustomersScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
