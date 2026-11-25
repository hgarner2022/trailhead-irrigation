"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "./ConfirmDialog"
import { FormRow } from "./FormRow"
import { SegmentedControl } from "./SegmentedControl"
import type { NotToldVisit } from "./scheduler-panels-types"

// Tell a customer about a moved visit (docs/plans/2026-11-25-scheduler-design.md, 7.8). Nothing sends until Send is pressed: the message starts from the saved template, the office edits it, and
// Text or Email is chosen (greyed, with the reason in words, when there is no phone or no email; "No way to reach Andrea" when there is neither, and then only Don't tell is left).
// Don't tell closes the question without a message and the screen writes that on the visit. `many` is Notify all after a plan is accepted: one editable template and a box per customer.
// The message is at most 480 characters and Send waits for it to fit. A ConfirmDialog with its own footer, because Send and Don't tell are two answers and the way out is a third. Pure props, client component.

export const MAX_MESSAGE = 480

export type NotifyChannel = "text" | "email"

export interface NotifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the saved words, filled for this customer; in `many` mode the template with its {placeholders} */
  body: string
  /** one customer */
  recipient?: Pick<NotToldVisit, "customer" | "phone" | "email">
  /** Notify all: every customer on the plan, each with an id and the way to reach them */
  recipients?: readonly (Pick<NotToldVisit, "id" | "customer" | "town" | "phone" | "email">)[]
  onSend: (result: { channel: NotifyChannel; body: string; ids: string[] }) => void | Promise<void>
  onDontTell: () => void
}

const firstName = (name: string) => name.split(" ")[0] ?? name

/** How a customer is reached: a text where there is a phone, else an email, else nobody. */
export const channelOf = (r: { phone?: string; email?: string }): NotifyChannel | null => (r.phone ? "text" : r.email ? "email" : null)

function Footer({ canSend, sendLabel, onSend, onDontTell }: { canSend: boolean; sendLabel: string; onSend: () => void; onDontTell: () => void }) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" className="min-h-11" onClick={onDontTell}>
        Don't tell
      </Button>
      {canSend && (
        <Button type="button" className="min-h-11" onClick={onSend}>
          {sendLabel}
        </Button>
      )}
    </DialogFooter>
  )
}

function Message({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  const over = value.length - MAX_MESSAGE
  return (
    <FormRow label="Message" hint={over > 0 ? undefined : `${value.length} of ${MAX_MESSAGE} characters${hint ? `. ${hint}` : ""}`} error={over > 0 ? `Shorten the message by ${over} ${over === 1 ? "character" : "characters"}.` : undefined}>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-32 text-base md:text-sm" />
    </FormRow>
  )
}

function One({ recipient, body, onSend, onDontTell }: { recipient: NonNullable<NotifyDialogProps["recipient"]>; body: string; onSend: NotifyDialogProps["onSend"]; onDontTell: () => void }) {
  const [text, setText] = useState(body)
  const first = channelOf(recipient)
  const [channel, setChannel] = useState<NotifyChannel>(first ?? "text")
  if (!first)
    return (
      <>
        <p role="status" className="text-sm text-foreground">{`No way to reach ${firstName(recipient.customer)}`}</p>
        <Footer canSend={false} sendLabel="" onSend={() => {}} onDontTell={onDontTell} />
      </>
    )
  const to = channel === "text" ? recipient.phone : recipient.email
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SegmentedControl
          label="How to tell them"
          value={channel}
          onChange={(v) => setChannel(v as NotifyChannel)}
          options={[
            { value: "text", label: "Text", disabled: !recipient.phone, reason: "No phone on file" },
            { value: "email", label: "Email", disabled: !recipient.email, reason: "No email on file" },
          ]}
        />
        <p className="text-sm text-muted-foreground">{`to ${to}`}</p>
      </div>
      <Message value={text} onChange={setText} />
      <Footer canSend={text.trim().length > 0 && text.length <= MAX_MESSAGE} sendLabel="Send" onSend={() => onSend({ channel, body: text, ids: [] })} onDontTell={onDontTell} />
    </>
  )
}

function Many({ recipients, body, onSend, onDontTell }: { recipients: NonNullable<NotifyDialogProps["recipients"]>; body: string; onSend: NotifyDialogProps["onSend"]; onDontTell: () => void }) {
  const reachable = recipients.filter((r) => channelOf(r))
  const [text, setText] = useState(body)
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set(reachable.map((r) => r.id)))
  const toggle = (id: string) => setTicked((t) => (t.has(id) ? new Set([...t].filter((x) => x !== id)) : new Set([...t, id])))
  return (
    <>
      <Message value={text} onChange={setText} hint="Words in braces fill in for each customer" />
      <ul data-slot="notify-recipients" aria-label="Who to tell" className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {recipients.map((r) => {
          const way = channelOf(r)
          return (
            <li key={r.id} className="flex min-h-11 items-center gap-1 pr-3">
              <span className="flex size-11 shrink-0 items-center justify-center">
                <Checkbox checked={ticked.has(r.id)} disabled={!way} onCheckedChange={() => toggle(r.id)} aria-label={`Tell ${r.customer}`} />
              </span>
              <span className="min-w-0 flex-1 py-1.5 text-sm">
                <span className="block truncate font-medium text-foreground">{`${r.customer} · ${r.town}`}</span>
                <span className="block text-muted-foreground">{way === "text" ? `Text ${r.phone}` : way === "email" ? `Email ${r.email}` : `No way to reach ${firstName(r.customer)}`}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <Footer
        canSend={ticked.size > 0 && text.trim().length > 0 && text.length <= MAX_MESSAGE}
        sendLabel={`Send to ${ticked.size}`}
        onSend={() => onSend({ channel: "text", body: text, ids: [...ticked] })}
        onDontTell={onDontTell}
      />
    </>
  )
}

export function NotifyDialog({ open, onOpenChange, body, recipient, recipients, onSend, onDontTell }: NotifyDialogProps) {
  const many = Boolean(recipients)
  const title = many ? `Tell ${recipients!.length} customers about their new times` : `Tell ${firstName(recipient?.customer ?? "the customer")} about the new time`
  const send: NotifyDialogProps["onSend"] = async (r) => {
    await onSend(r)
    onOpenChange(false)
  }
  const skip = () => {
    onDontTell()
    onOpenChange(false)
  }
  return (
    <ConfirmDialog title={title} open={open} onOpenChange={onOpenChange} actions="none" size="md" slot={many ? "notify-many-dialog" : "notify-dialog"}>
      {many ? <Many recipients={recipients!} body={body} onSend={send} onDontTell={skip} /> : recipient ? <One recipient={recipient} body={body} onSend={send} onDontTell={skip} /> : null}
    </ConfirmDialog>
  )
}
