"use client"

import { useId, useMemo, useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { FormRow } from "@/components/blocks/FormRow"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { useToast } from "@/components/blocks/Toast"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ConsentData, ConsentEventRow } from "./customer-fixtures"
import { TextLink } from "@/components/blocks/TextLink"
import { SelectField } from "@/components/blocks/SelectField"

// The Consent card of the customer page (docs/DATA_MODEL.md, "consent (terms, marketing)"; Hannah, Nov 19 2026): two different things, kept apart.
// (a) Texts and email about visits and billing are transactional: Allowed, with the source, the date and the terms version, and a quiet line
// when a reply of STOP exists (then every text goes as an email, in neutral words, never a warning colour). (b) Marketing is the customer's own
// yes, per channel, off by default: two switches, each with its own source and date once changed, and a neutral "Not in marketing" pill when
// both are off. The office turns a channel ON only through a dialog that needs a source and a note, because marketing needs the customer's yes;
// turning one OFF is immediate with an Undo toast. Each change writes a consent row, and "Consent history" lists them newest first. Contact by
// (Text, Email or Both) is the channel for the transactional messages. Pure props, nothing is sent.

type Channel = "email" | "text"
const CHANNEL_WORDS: Record<Channel, string> = { email: "Email", text: "Text" }
const SOURCES = ["They asked me by phone", "In person", "Website form"] as const

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={cn("flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors", checked ? "border-primary-dark bg-primary-dark" : "border-input bg-stone")}>
        <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </span>
    </button>
  )
}

const HISTORY_COLUMNS: GridColumnDef<ConsentEventRow>[] = [
  { id: "on", accessorKey: "on", header: "Date", meta: { bare: true }, cell: ({ row }) => <span className="whitespace-nowrap">{row.original.on}</span> },
  { id: "what", accessorKey: "what", header: "What changed", cell: ({ row }) => <span className="whitespace-normal">{row.original.what}</span> },
  { id: "source", accessorKey: "source", header: "Source" },
  { id: "who", accessorKey: "who", header: "Who" },
]
const HISTORY_CARD: GridCardSlots = { title: "what", line: ["source", "who"], when: ["on"] }

export interface ConsentCardProps {
  consent: ConsentData
  firstName: string
  /** the dialog or history open on first render (the stories that show one) */
  initial?: "opt-in" | "history" | null
}

export function ConsentCard({ consent, firstName, initial = null }: ConsentCardProps) {
  const toast = useToast()
  const undoToast = useUndoToast()
  const [state, setState] = useState(consent)
  const [open, setOpen] = useState<null | "history" | Channel>(initial === "opt-in" ? "email" : initial)
  const [source, setSource] = useState("")
  const [note, setNote] = useState("")
  const id = useId()
  const anyOn = state.email.on || state.text.on
  const history = useMemo(() => state.history, [state.history])

  const record = (what: string, src: string, who: string): ConsentEventRow => ({ id: `k${Date.now()}${what}`, on: "Nov 18, 2026", what, source: src, who })
  const change = (channel: Channel, next: { on: boolean; note?: string }, row: ConsentEventRow) => setState((s) => ({ ...s, [channel]: next, history: [row, ...s.history] }))

  const turnOff = (channel: Channel) => {
    const before = state[channel]
    const row = record(`Opted out of marketing ${channel === "email" ? "email" : "texts"}`, "Office", "Ryan")
    change(channel, { on: false, note: "Opted out Nov 18, asked by the office, Ryan" }, row)
    undoToast(`Marketing ${channel === "email" ? "email" : "texts"} turned off for ${firstName}`, () => setState((s) => ({ ...s, [channel]: before, history: s.history.filter((h) => h.id !== row.id) })))
  }
  const close = () => (setOpen(null), setSource(""), setNote(""))
  const turnOn = (channel: Channel) => {
    const how = source.toLowerCase().replace("they asked me by phone", "asked by phone").replace("website form", "on the website form")
    change(channel, { on: true, note: `Opted in Nov 18 by the customer, ${how}, Ryan` }, record(`Opted in to marketing ${channel === "email" ? "email" : "texts"}`, source, "Ryan"))
    toast(`Marketing ${channel === "email" ? "email" : "texts"} turned on for ${firstName}`)
  }

  const row = (channel: Channel) => {
    const c = state[channel]
    return (
      <li key={channel} data-slot="marketing-row" className="flex items-start justify-between gap-3">
        <span className="min-w-0 py-2.5">
          <span className="block font-medium">{CHANNEL_WORDS[channel]}</span>
          <span className="block text-muted-foreground">{c.note ?? (c.on ? "On" : "Off, never asked")}</span>
        </span>
        <Switch checked={c.on} label={`Marketing ${channel === "email" ? "email" : "text"}`} onChange={(next) => (next ? setOpen(channel) : turnOff(channel))} />
      </li>
    )
  }

  const channelOpen = open === "email" || open === "text" ? open : null
  return (
    <>
      <SectionCard title="Consent" id="consent-h" action={<TextLink onClick={() => setOpen("history")}>Consent history</TextLink>}>
        <div className="flex flex-col divide-y divide-border text-sm [&>section]:py-4 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
          <section aria-labelledby={`${id}-tx`}>
            <h3 id={`${id}-tx`} className="text-muted-foreground">Texts and email about your visits and billing</h3>
            <p className="mt-1 font-semibold">{state.agreed ? "Allowed" : "Not asked yet"}</p>
            {state.agreed && <p className="text-muted-foreground">{state.agreed}</p>}
            {state.stoppedOn && <p className="mt-1 text-muted-foreground">Stopped by reply STOP on {state.stoppedOn}. Every text goes as an email.</p>}
          </section>
          <section aria-labelledby={`${id}-mk`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`${id}-mk`} className="text-muted-foreground">Marketing</h3>
              {!anyOn && <StatusPill status="cancelled" label="Not in marketing" />}
            </div>
            <ul className="mt-1 flex flex-col">{(["email", "text"] as const).map(row)}</ul>
          </section>
          <section>
            <FormRow label="Contact by" hint="The channel for receipts, invoices and visit texts.">
              <SelectField value={state.contactBy} onChange={(e) => (setState((s) => ({ ...s, contactBy: e.target.value as ConsentData["contactBy"] })), toast(`${firstName} will be contacted by ${e.target.value}`))}>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="both">Both</option>
              </SelectField>
            </FormRow>
          </section>
        </div>
      </SectionCard>

      {channelOpen && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Opt ${firstName} in to marketing ${channelOpen === "email" ? "email" : "texts"}`}
          message={`Records that ${firstName} said yes to marketing ${channelOpen === "email" ? "email" : "texts"}. Nobody is notified, and receipts, invoices and visit texts go either way.`}
          confirmLabel={`Opt in to ${channelOpen === "email" ? "email" : "texts"}`}
          confirmDisabled={!source || !note.trim()}
          size="md"
          slot="opt-in-dialog"
          onConfirm={async () => (turnOn(channelOpen), close(), { ok: true })}
        >
          <div className="flex flex-col gap-3">
            <FormRow label="How did they say yes?">
              <SelectField value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">Choose one</option>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </SelectField>
            </FormRow>
            <FormRow label="Note" hint="What they said, in a line. Marketing needs the customer's own yes.">
              <Textarea value={note} rows={2} onChange={(e) => setNote(e.target.value)} />
            </FormRow>
          </div>
        </ConfirmDialog>
      )}
      {open === "history" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setOpen(null)} title="Consent history" actions="none" size="md" slot="consent-history">
          <DataGrid columns={HISTORY_COLUMNS} card={HISTORY_CARD} data={history} getRowId={(r) => r.id} toolbar={false} inCard pageSize={10} emptyTitle="Nothing recorded" emptyLine="Every consent change shows here, newest first." />
        </ConfirmDialog>
      )}
    </>
  )
}
