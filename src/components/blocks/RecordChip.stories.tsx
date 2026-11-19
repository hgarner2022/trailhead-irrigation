import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordChip } from "./RecordChip"
import { RecordPreview } from "./RecordPreview"
import { customerPreview, dayPreview, invoicePreview, jobPreview, personPreview, visitPreview, type RecordPreviewData } from "./record-preview-model"

// The one pattern for a record's name (docs/plans/2026-11-19-record-links-research.md). Every kind in the two sizes, the card, and the states:
// default, hover with the preview (shown open here), focus, no link. At 1280 (Laptop) and 375 (Phone).

const P: Record<string, RecordPreviewData> = {
  customer: customerPreview({ id: "c1", name: "Andrea Reyes", phone: "(970) 555-0123", address: "480 Briggs St, Erie", openJobs: 2, unpaid: "$145" }),
  job: jobPreview({ id: "j1", name: "Sprinkler repair", customer: "Marcus Bell", status: "scheduled", next: "Tue, Nov 24 at 9:00 am", total: "$145" }),
  visit: visitPreview({ id: "v1", name: "Spring turn-on", customer: "Andrea Dalton", status: "scheduled", when: "Mon, May 3 at 9:00 am", who: "Ryan Garner", money: "$145, charged after the visit" }),
  invoice: invoicePreview({ id: "i1", number: "1042", customer: "Marcus Bell", status: "bill-sent", statusLabel: "Sent", total: "$145", balance: "$145", due: "Dec 2" }),
  person: personPreview({ name: "Ryan Garner", role: "Owner", stopsToday: 3 }),
  day: dayPreview({ isoDay: "2026-11-24", label: "Tue, Nov 24 at 9:00 am", stops: 3, who: "Ryan Garner" }),
}

const meta = {
  title: "Blocks/RecordChip",
  component: RecordChip,
  parameters: { layout: "padded" },
  args: { kind: "customer", name: "Andrea Reyes", href: P.customer!.href, preview: P.customer },
} satisfies Meta<typeof RecordChip>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

const all = (size: "row" | "band") => (
  <ul className="flex flex-col gap-1">
    {Object.values(P).map((p) => (
      <li key={p.kind}>
        <RecordChip kind={p.kind} name={p.name} href={p.href} preview={p} size={size} />
      </li>
    ))}
  </ul>
)

/** Row size, every kind: initials for people, the object's icon for the rest, the name in orange. */
export const Kinds: Story = { render: () => all("row"), globals: laptop }
export const KindsPhone: Story = { render: () => all("row"), globals: phone }

/** Band size: the value of a summary band cell, in the display face. */
export const BandSize: Story = { render: () => <div className="font-display">{all("band")}</div>, globals: laptop }
export const BandSizePhone: Story = { render: () => <div className="font-display">{all("band")}</div>, globals: phone }

/** Hover: the card with the key facts and Open, shown open. It also appears on focus and a 500 ms press on a phone. */
export const HoverPreview: Story = { args: { previewOpen: true }, render: (args) => <div className="min-h-80"><RecordChip {...args} /></div>, globals: laptop }
export const HoverPreviewPhone: Story = { args: { previewOpen: true }, render: (args) => <div className="min-h-80"><RecordChip {...args} /></div>, globals: phone }

/** Focus: the ring, and the card opens with it (WCAG 1.4.13). */
export const Focus: Story = {
  render: (args) => <div className="min-h-80"><RecordChip {...args} /></div>,
  globals: laptop,
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>("a")?.focus()
  },
}

/** No link: a record with no page of its own. Same mark and name, navy, no underline, so it reads as missing on purpose. */
export const NoLink: Story = { args: { href: undefined, preview: undefined, kind: "person", name: "Tech Two" }, globals: laptop }

/** The day chip: a scheduled day opens the Schedule on that day; a visit with no day is plain text, and the Schedule button is its link. */
export const DayChipAndNoDay: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <RecordChip kind="day" name="Tue, Nov 24 at 9:00 am" href={P.day!.href} preview={P.day} />
      <span className="text-base text-muted-foreground">No day yet</span>
    </div>
  ),
  globals: laptop,
}

/** The card alone, every kind: what Cmd+K can show for a highlighted hit from the same data. */
export const Cards: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {Object.values(P).map((p) => (
        <RecordPreview key={p.kind} data={p} />
      ))}
    </div>
  ),
  globals: laptop,
}
export const CardsPhone: Story = { ...Cards, globals: phone }
