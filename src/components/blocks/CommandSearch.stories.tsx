import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import type { SearchHit } from "@/lib/admin/search-hit"
import { Button } from "@/components/ui/button"
import { CommandSearch, type CommandSearchProps } from "./CommandSearch"

// Cmd or Ctrl+K: one box that finds a customer, a job or a day's work and opens the record. The matching is the server's; these stories answer from a short list.

const HITS: SearchHit[] = [
  { kind: "customer", id: "c1", title: "Andrea Reyes", detail: "12 Elm St, Erie", contact: "(303) 555-0111 · andrea@example.com", href: "/admin/customers?customer=c1" },
  { kind: "job", id: "j1", title: "Andrea Reyes, Season Pass TH-2027-0014", detail: "12 Elm St, Erie · Open", href: "/admin/jobs?job=j1" },
  { kind: "visit", id: "v1", title: "Andrea Reyes", detail: "Spring turn-on, Tue, Nov 24", href: "/admin/schedule?visit=v1" },
]
const find = async (query: string) => HITS.filter((h) => `${h.title} ${h.detail}`.toLowerCase().includes(query.toLowerCase().split(" ")[0]!))

function Demo(args: CommandSearchProps) {
  const [open, setOpen] = useState(args.open)
  return (
    <div className="p-6">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Search
      </Button>
      <CommandSearch {...args} open={open} onOpenChange={setOpen} />
    </div>
  )
}

const meta = {
  title: "Blocks/CommandSearch",
  component: CommandSearch,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: fn(), onSearch: find, onOpen: fn(), delay: 0 },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof CommandSearch>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** Open and empty: it says what to type. */
export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async () => {
    await expect(await body.findByText(/Type a name, a street, a phone number or a pass number/)).toBeInTheDocument()
  },
}

/** A name finds the customer, the job and the day, three short groups. */
export const Typed: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ userEvent, args }) => {
    await userEvent.type(await body.findByRole("combobox", { name: "Search" }), "andrea")
    await expect(await body.findByText("Andrea Reyes, Season Pass TH-2027-0014")).toBeInTheDocument()
    await expect(body.getAllByRole("group").length).toBe(3)
    await userEvent.click(body.getByRole("option", { name: /Season Pass/ }))
    await expect(args.onOpen).toHaveBeenCalledWith(HITS[1])
  },
}

/** More jobs than three: the group ends with a See all line that goes to the list, not to a record. */
export const SeeAll: Story = {
  args: {
    onSearch: async () => [
      HITS[0]!,
      ...[1, 2, 3].map((n): SearchHit => ({ kind: "job", id: `j${n}`, title: `Andrea Reyes, Repair ${n}`, detail: "12 Elm St, Erie · Open", href: `/admin/jobs?job=j${n}` })),
      { kind: "job", id: "see-all", title: "See all 9 jobs", detail: "", href: "/admin/jobs", seeAll: true },
    ],
  },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ userEvent, args }) => {
    await userEvent.type(await body.findByRole("combobox", { name: "Search" }), "andrea")
    await expect(await body.findByText("(303) 555-0111 · andrea@example.com")).toBeInTheDocument()
    await userEvent.click(await body.findByRole("option", { name: "See all 9 jobs" }))
    await expect(args.onOpen).toHaveBeenCalledWith(expect.objectContaining({ seeAll: true, href: "/admin/jobs" }))
  },
}

/** Nothing matched. */
export const Empty: Story = {
  args: { onSearch: async () => [] },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ userEvent }) => {
    await userEvent.type(await body.findByRole("combobox", { name: "Search" }), "zzzz")
    await expect(await body.findByText(/Nothing found/)).toBeInTheDocument()
  },
}

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
