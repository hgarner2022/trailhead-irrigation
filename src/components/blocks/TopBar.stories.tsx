import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { AdminAccountMenu } from "./AdminAccountMenu"
import { TopBar } from "./TopBar"

const user = { initials: "HG", name: "Hannah" }
const search = (
  <Button variant="outline" aria-label="Search" className="min-h-11">
    Search
  </Button>
)

const meta = {
  title: "Blocks/TopBar",
  component: TopBar,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  args: { leading: <Button variant="ghost" size="icon" aria-label="Toggle sidebar" />, search, account: <AdminAccountMenu user={user} /> },
} satisfies Meta<typeof TopBar>
export default meta
type Story = StoryObj<typeof meta>

/** 1280: toggle, title and action slots, Search, account. */
export const Default: Story = {}
/** No Search (the catalog): the account stays at the far right. */
export const Empty: Story = { args: { search: undefined } }
/** 375: logo, the page's one primary slot, Search, initials. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  args: { phone: true, account: <AdminAccountMenu user={user} compact /> },
}
