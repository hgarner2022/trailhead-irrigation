import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SettingsScreen } from "@/app/(admin)/admin/_screens/SettingsScreen"
import { Button } from "@/components/ui/button"
import { AdminShell } from "./AdminShell"
import { CustomerCard } from "./CustomerCard"
import { PageHeader } from "./PageHeader"
import { RecordFooter } from "./RecordFooter"
import { RecordPage } from "./RecordPage"
import { SectionCard } from "./SectionCard"
import { SidePanel } from "./SidePanel"
import { StatusPill } from "./StatusPill"
import { SummaryBand } from "./SummaryBand"

// Admin / Navigation (docs/plans/2026-11-19-navigation-design.md): the admin's top bar, the account menu in the rail's footer, phone More and the way back, for Hannah to review.
// Stories only, nothing wired. Every state is shown at 1280 (laptop) and at 375 (phone).

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const user = { initials: "HG", name: "Hannah" }
const noop = () => {}
const search = async () => []

const meta = {
  title: "Admin/Navigation",
  parameters: { layout: "fullscreen", docs: { description: { component: "The admin's top bar, the account menu (bottom left of the rail on a laptop, the initials in the bar on a phone), the phone's More menu and the way back from a record, at 1280 and 375. Stories only, nothing wired." } } },
  globals: LAPTOP,
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function NewJob() {
  return <Button size="sm">+ New job</Button>
}

function JobsPlaceholder() {
  return (
    <>
      <PageHeader title="Jobs" context="14 jobs" primary={<NewJob />} />
      <ul className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
        {["Andrea Reyes, Spring turn-on", "Marcus Webb, Repair", "Dana Ortiz, Season Pass"].map((n) => (
          <li key={n} className="flex min-h-11 items-center px-4">
            {n}
          </li>
        ))}
      </ul>
    </>
  )
}

function Shell({ children = <JobsPlaceholder />, current = "jobs" }: { children?: ReactNode; current?: "jobs" | "home" | "settings" }) {
  return (
    <AdminShell current={current} user={user} onSignOut={fn()} onSearch={search} profileHref="/admin/profile" helpHref="/admin/help" customerHref="/account">
      {children}
    </AdminShell>
  )
}

/** 1280: the bar reads toggle, title, page action, Search; the account (avatar and first name) is the footer of the navy rail, bottom left, under a hairline. No bell: nothing in the app yet has a notification to show. */
export const ShellLaptop: Story = { name: "Shell, laptop", render: () => <Shell /> }

/** The rail footer's menu open, opening upward: name, Profile, Help, Open as customer (only for a staff member whose email is also a customer's) and Sign out. */
export const AccountMenuOpen: Story = { name: "Account menu open",
  render: () => <Shell />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Account, Hannah" }))
    const menuEl = await within(document.body).findByRole("menu")
    const menu = within(menuEl)
    await expect(menu.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Profile", "Help", "Open as customer", "Sign out"])
    // upward: the menu sits above the trigger, at the rail's left edge
    await expect(menuEl.getBoundingClientRect().bottom).toBeLessThanOrEqual(canvas.getByRole("button", { name: "Account, Hannah" }).getBoundingClientRect().top + 1)
    await expect(canvas.getByRole("button", { name: "Account, Hannah" }).closest("[data-slot=sidebar-footer]")).not.toBeNull()
  },
}

/** The rail collapsed to icons with the toggle: the footer is the avatar alone, and its menu still opens upward with the same items. */
export const AccountMenuCollapsed: Story = { name: "Account menu, rail collapsed",
  render: () => <Shell />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /toggle sidebar/i }))
    const trigger = await canvas.findByRole("button", { name: "Account, Hannah" })
    await expect(within(trigger).getByText("Hannah")).not.toBeVisible()
    await userEvent.click(trigger)
    const menu = within(await within(document.body).findByRole("menu"))
    await expect(menu.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Profile", "Help", "Open as customer", "Sign out"])
  },
}

/** Keyboard: Enter opens the rail menu, Escape closes it and focus is back on the avatar button. */
export const AccountMenuKeyboard: Story = { name: "Account menu, keyboard",
  render: () => <Shell />,
  play: async ({ canvas, userEvent }) => {
    const trigger = await canvas.findByRole("button", { name: "Account, Hannah" })
    trigger.focus()
    await userEvent.keyboard("{Enter}")
    await expect(await within(document.body).findByRole("menu")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await expect(within(document.body).queryByRole("menu")).toBeNull()
    await expect(trigger).toHaveFocus()
  },
}

/** A person who is not also a customer: no Open as customer row. */
export const AccountMenuOpenStaffOnly: Story = { name: "Account menu open staff only",
  render: () => (
    <AdminShell current="jobs" user={user} onSearch={search} profileHref="/admin/profile" helpHref="/admin/help">
      <JobsPlaceholder />
    </AdminShell>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Account, Hannah" }))
    await expect(within(await within(document.body).findByRole("menu")).queryByRole("menuitem", { name: "Open as customer" })).toBeNull()
  },
}

/** 375: logo, "+ New job" (it stays in the sticky bar on every screen that has it), Search, the initials; the bottom bar is Home, Schedule, Jobs, Customers, More. */
export const ShellPhone: Story = { name: "Shell, phone", globals: PHONE, render: () => <Shell /> }

/** 375: the account menu from the initials, Sign out inside it. */
export const AccountMenuOpenPhone: Story = { name: "Account menu open, phone",
  globals: PHONE,
  render: () => <Shell />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Account, Hannah" }))
    await expect(await within(document.body).findByRole("menuitem", { name: "Sign out" })).toBeInTheDocument()
  },
}

/** 375: More is a bordered, labelled button; open it shows Reports and Settings and nothing else. */
export const MoreOpenPhone: Story = { name: "More open, phone",
  globals: PHONE,
  render: () => <Shell />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "More" }))
    const menu = within(await within(document.body).findByRole("menu"))
    await expect(menu.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Reports", "Settings"])
  },
}

// ---- The way back ---------------------------------------------------------------------------------------------------------------------------------

function Underlay({ title }: { title: string }) {
  return (
    <Shell current={title === "Home" ? "home" : "jobs"}>
      <PageHeader title={title} context="The list the record was opened from" />
      <p className="text-sm text-muted-foreground">Andrea Reyes is lit in the list behind the panel.</p>
    </Shell>
  )
}

function PanelFrom({ from, title }: { from: string; title: string }) {
  return (
    <>
      <Underlay title={from === "Home" ? "Home" : "Jobs"} />
      <SidePanel open onOpenChange={noop} title="Andrea Reyes" description="Spring turn-on, Tue, Nov 24" back={{ label: from, onClick: noop }} pills={<StatusPill status="scheduled" />} footer={<Button size="sm">Mark done</Button>}>
        <p className="text-sm text-muted-foreground">{title}</p>
      </SidePanel>
    </>
  )
}

function PageFrom({ from, href }: { from: string; href: string }) {
  return (
    <div className="min-h-svh bg-cream">
      <RecordPage
        crumb={{ label: from, href }}
        title="Andrea Reyes"
        subtitle="Spring turn-on · Added Nov 18"
        badges={<StatusPill status="scheduled" size="lg" />}
        band={
          <SummaryBand
            items={[
              { label: "When", value: "Tue, Nov 24", sub: "Any time" },
              { label: "Who", value: "Ryan Garner" },
              { label: "Where", value: "480 Briggs St", sub: "Erie" },
              { label: "Total", value: "$145" },
            ]}
          />
        }
        aside={<CustomerCard customer={{ id: "c-1", name: "Andrea Reyes" }} phone="(970) 555-0123" address={["480 Briggs St", "Erie, CO"]} channel="text" />}
        actions={<RecordFooter primary={{ label: "Mark done", onClick: noop }} more={[{ label: "Edit", onClick: noop }]} destructive={{ label: "Cancel job", onClick: noop }} destructiveInMenu />}
      >
        <SectionCard title="What's included" id="inc">
          <p className="text-sm">Spring turn-on, $145</p>
        </SectionCard>
      </RecordPage>
    </div>
  )
}

/** 1280, opened from Home: "‹ Home" above the title. X and Esc go to Home. */
export const RecordFromHomeLaptop: Story = { name: "Record from home, laptop",
  render: () => <PanelFrom from="Home" title="Opened from a Home row" />,
  play: async () => {
    await expect(await within(document.body).findByRole("button", { name: /Home/ })).toBeInTheDocument()
  },
}
/** 375, opened from Home: the record is a full page; "‹ Home" is its first line. */
export const RecordFromHomePhone: Story = { name: "Record from home, phone", globals: PHONE, render: () => <PageFrom from="Home" href="/admin" /> }

/** 1280, opened from Search: "‹ Search" above the title; Back reopens the search with its query. */
export const RecordFromSearchLaptop: Story = { name: "Record from search, laptop", render: () => <PanelFrom from="Search" title="Opened from Search" /> }
/** 375, opened from Search. */
export const RecordFromSearchPhone: Story = { name: "Record from search, phone", globals: PHONE, render: () => <PageFrom from="Search" href="/admin" /> }

/** 1280, opened from another record (the customer's job list): "‹ Andrea Reyes". */
export const RecordFromRecordLaptop: Story = { name: "Record from record, laptop", render: () => <PanelFrom from="Andrea Reyes" title="Opened from the customer's panel" /> }
/** 375, opened from another record. */
export const RecordFromRecordPhone: Story = { name: "Record from record, phone", globals: PHONE, render: () => <PageFrom from="Andrea Reyes" href="/admin/customers" /> }

/** A record opened from a list: "‹ Jobs". */
export const RecordFromListPhone: Story = { name: "Record from list, phone", globals: PHONE, render: () => <PageFrom from="Jobs" href="/admin/jobs" /> }

// ---- Settings ---------------------------------------------------------------------------------------------------------------------------------

function AddressStrip({ path }: { path: string }) {
  return (
    <p data-slot="address-strip" className="mb-4 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
      trailheadirrigation.com<span className="text-navy">{path}</span>
    </p>
  )
}

const data = snapshot as AdminData

/** 1280: the tab is in the address (`/admin/settings/billing`), so a link or a refresh keeps it and Back leaves Settings only when it should. */
export const SettingsTabInAddress: Story = { name: "Settings tab in address",
  render: () => (
    <Shell current="settings">
      <AddressStrip path="/admin/settings/billing" />
      <SettingsScreen data={data} today="2026-11-12T19:56:30Z" defaultTab="billing" />
    </Shell>
  ),
}

/** 375: the tab list is the page at `/admin/settings`; a tab drills in to `/admin/settings/billing` with "‹ Settings". */
export const SettingsTabInAddressPhone: Story = { name: "Settings tab in address, phone",
  globals: PHONE,
  render: () => (
    <Shell current="settings">
      <AddressStrip path="/admin/settings/billing" />
      <SettingsScreen data={data} today="2026-11-12T19:56:30Z" defaultTab="billing" />
    </Shell>
  ),
}

// ---- The three controls -----------------------------------------------------------------------------------------------------------------------

const CHAIN = ["Home", "Andrea Reyes", "Spring turn-on"]

function Control({ name, rule, lands, chain }: { name: string; rule: string; lands: string; chain: string[] }) {
  return (
    <section data-slot="control" className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-navy">{name}</h2>
      <p className="text-sm">{rule}</p>
      <ol aria-label="What is on screen after" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {CHAIN.map((c, i) => (
          <li key={c} className={chain.includes(c) ? "font-semibold text-navy" : "line-through"}>
            {c}
            {i < CHAIN.length - 1 ? <span aria-hidden> › </span> : null}
          </li>
        ))}
      </ol>
      <p className="text-sm">
        <span className="font-semibold text-navy">You land on: </span>
        {lands}
      </p>
    </section>
  )
}

function ThreeControls() {
  return (
    <div className="min-h-svh bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <h1 className="font-display text-3xl font-semibold text-navy">The three controls</h1>
        <p className="max-w-prose text-sm text-muted-foreground">You opened Home, then Andrea Reyes, then her Spring turn-on, each from the one before. Three controls take you back, and each does one thing.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Control name="X and Esc" rule="Close. Leave every record and go back to the list the first one was opened from." lands="Home, with the row lit" chain={["Home"]} />
          <Control name="‹ Andrea Reyes" rule="Step back one record. It names the record you came from." lands="Andrea Reyes" chain={["Home", "Andrea Reyes"]} />
          <Control name="The browser's Back" rule="The same as ‹: one step. It never skips a record." lands="Andrea Reyes" chain={["Home", "Andrea Reyes"]} />
        </div>
      </div>
    </div>
  )
}

/** 1280: the three outcomes side by side. */
export const TheThreeControls: Story = { name: "The three controls", render: () => <ThreeControls /> }
/** 375: the same, stacked. */
export const TheThreeControlsPhone: Story = { name: "The three controls, phone", globals: PHONE, render: () => <ThreeControls /> }
