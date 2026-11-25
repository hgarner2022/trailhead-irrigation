import { useState, type CSSProperties } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Check, Clock, Tag } from "lucide-react"
import { expect } from "storybook/test"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"
import { ServiceIcon, iconFor } from "./ServiceIcon"
import { ServicePicker } from "./ServicePicker"
import { metaLine, panelOf } from "./service-card-model"

// NOT SHIPPED: three ways the Service step could work, side by side, for Hannah's question (Nov 25 2026): "Do we need to have the Hide and Details? Can it just be a clickable card?"
// A. One tap chooses. The whole card is the control: it sits a little above the page, lifts on hover and gives under a press. Chosen, it is the same navy as every other chosen option and opens by
//    itself to show what is included. Tapping it again removes the choice. No pill, no second button.
// A2. The same, with an empty ring at the right that becomes the check.
// B. One tap chooses. A small "What's included" link on each card opens the detail for whoever wants it, without choosing.
// C. Today's: the row opens the card ("Details" / "Hide"), and "Choose this service" inside chooses it.
// Every word and number is the catalogue's, through the same helpers the shipped card uses.

const ENTRIES = bookingEntries(SERVICES, "2027-04-14")
const line = (i: number) => ({ "data-line": true, style: { "--i": i } as CSSProperties })

function Detail({ entry }: { entry: ServiceEntry }) {
  const { lead, items, facts } = panelOf(entry)
  return (
    <div className="space-y-4 p-4">
      {lead && (
        <p {...line(0)} className="text-base leading-relaxed text-foreground">
          {lead}
        </p>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={item.text} {...line(i + 1)} className="flex items-start gap-2 text-base leading-snug text-foreground">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" strokeWidth={2.25} />
              <span className="flex-1">{item.text}</span>
              {item.price && <span className="shrink-0 font-semibold text-navy tabular-nums">{item.price}</span>}
            </li>
          ))}
        </ul>
      )}
      {(facts.length || facts.rule) && (
        <ul {...line(items.length + 1)} className="space-y-2 text-sm text-navy">
          {facts.length && (
            <li className="flex items-center gap-2">
              <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              {facts.length}
            </li>
          )}
          {facts.rule && (
            <li className="flex items-center gap-2 font-semibold tabular-nums">
              <Tag aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              {facts.rule}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/** The header both options share: the icon tile, the name, one meta line; chosen, it is filled navy like every other chosen option, with a check at the right. */
function Header({ entry, index, selected, onPress, rounded, ring }: { entry: ServiceEntry; index: number; selected: boolean; onPress: () => void; rounded: string; ring?: boolean }) {
  const [play, setPlay] = useState(0)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => (setPlay((n) => n + 1), onPress())}
      className={cn("opt flex min-h-[5.5rem] w-full cursor-pointer items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2", rounded, selected ? "bg-navy text-white" : "bg-background text-navy")}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <span key={play} className={cn("flex", play > 0 && "svc-spring")}>
          <ServiceIcon name={iconFor(entry.key)} delay={play === 0 ? index * 40 : 0} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[1.375rem] leading-[1.1]">{entry.name}</span>
        <span className={cn("mt-1 block text-sm leading-5 whitespace-nowrap tabular-nums", selected ? "text-white/85" : "text-muted-foreground")}>{metaLine(entry)}</span>
      </span>
      {!selected && ring && <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-navy/30" />}
      {selected && (
        <span aria-hidden className="svc-check relative flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-dark text-white">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path pathLength={1} d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
      )}
    </button>
  )
}

function List({ variant }: { variant: "a" | "ring" | "b" }) {
  const [value, setValue] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-3xl container-padding-x py-8">
      <ul aria-label="Services" className="grid gap-2">
        {ENTRIES.map((e, i) => {
          const selected = value === e.key
          const shown = variant === "b" ? open === e.key : selected
          return (
            <li key={e.key} data-selected={selected || undefined} className={cn("svc-card overflow-hidden rounded-lg border bg-background", selected ? "svc-settle border-navy ring-1 ring-navy" : "border-border shadow-sm hover:border-navy/40 hover:shadow-md")}>
              <Header entry={e} index={i} selected={selected} onPress={() => setValue(selected ? null : e.key)} rounded={shown || variant === "b" ? "rounded-t-lg" : "rounded-lg"} ring={variant === "ring"} />
              {variant === "b" && (
                <button type="button" aria-expanded={shown} onClick={() => setOpen(shown ? null : e.key)} className="flex min-h-11 w-full cursor-pointer items-center border-t border-border px-4 text-left text-sm font-semibold text-primary-deep underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset">
                  What&apos;s included
                </button>
              )}
              <div data-open={shown || undefined} aria-hidden={!shown} inert={!shown} role="region" aria-label={e.name} className="svc-panel">
                <div>
                  <div className="border-t border-border">
                    <Detail entry={e} />
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <p data-testid="chosen" className="sr-only">
        {value ?? "none"}
      </p>
    </div>
  )
}

function Current() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-3xl container-padding-x py-8">
      <ServicePicker entries={ENTRIES} value={value} onChange={setValue} />
    </div>
  )
}

const meta = { title: "Review/Service card options (not shipped)", parameters: { layout: "fullscreen" }, tags: ["!autodocs"], globals: { viewport: { value: "phone", isRotated: false } } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

/** A. One tap chooses and the chosen card opens by itself; a second tap removes the choice. */
export const AOneTapOpensItself: Story = {
  name: "A. One tap chooses, the chosen card shows its detail",
  render: () => <List variant="a" />,
  play: async ({ canvas, userEvent }) => {
    const repair = canvas.getByRole("button", { name: /^Sprinkler repair/ })
    await userEvent.click(repair)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("repair")
    await expect(canvas.getByRole("region", { name: "Sprinkler repair" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: /^Fall blowout/ }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("fall-blowout")
    await userEvent.click(canvas.getByRole("button", { name: /^Fall blowout/ }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
  },
}

/** A2. The same, with the place the check will land shown as an empty ring: the familiar sign that a card is a choice. */
export const A2WithRing: Story = { name: "A2. The same, with a ring where the check lands", render: () => <List variant="ring" /> }

/** B. One tap chooses; "What's included" opens the detail without choosing. */
export const BOneTapWithLink: Story = {
  name: "B. One tap chooses, a link opens the detail",
  render: () => <List variant="b" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "What's included" })[1]!)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
    await expect(canvas.getByRole("region", { name: "Spring turn-on" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: /^Spring turn-on/ }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("spring-turn-on")
  },
}

/** C. Today's card, for comparison: open with the row, choose with the button inside. */
export const CCurrent: Story = { name: "C. Today: open, then Choose this service", render: () => <Current /> }
