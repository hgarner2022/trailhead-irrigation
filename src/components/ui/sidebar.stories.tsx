import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import Image from "next/image"
import { CalendarRange, LayoutDashboard, LogOut, Ticket, TrendingUp, Users } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar"

const meta = {
  title: "UI/Sidebar",
  component: Sidebar,
} satisfies Meta<typeof Sidebar>
export default meta
type Story = StoryObj<typeof meta>

const NAV = [
  { label: "Home", icon: LayoutDashboard },
  { label: "Revenue", icon: TrendingUp },
  { label: "Passes", icon: Ticket },
  { label: "October", icon: CalendarRange },
  { label: "Customers", icon: Users },
]

function AdminShell({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-10 items-center gap-2 px-1">
            <Image src="/images/logo-badge.png" alt="Trailhead" width={40} height={40} className="size-10 shrink-0" />
            <span className="truncate font-display text-lg group-data-[collapsible=icon]:hidden">Trailhead</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ label, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton isActive={label === "Passes"} tooltip={label}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[10px] font-semibold">
                  HG
                </span>
                <span>Sign out</span>
                <LogOut className="ml-auto" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-cream">
        <div className="flex items-center gap-3 p-4">
          <SidebarTrigger />
          <h1 className="font-display text-3xl">Passes</h1>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const AdminRail: Story = { render: () => <AdminShell /> }
export const Collapsed: Story = { render: () => <AdminShell defaultOpen={false} /> }
