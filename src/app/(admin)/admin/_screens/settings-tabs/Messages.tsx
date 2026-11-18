"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { PLACEHOLDERS, templateProblem } from "@/emails/editable"
import type { AdminData, MessageTemplate } from "@/lib/admin/types"
import { channelWord, editableRows, lockedWords, messageName, previewMessage, setMessage } from "../settings-messages"
import type { SettingsState } from "../settings-model"
import type { Apply } from "./fields"

// The messages the office may edit: the day-of voice (day set, day moved, two weeks out, day before, on the way) and the invoice
// reminder text. Receipts, invoices, card, cancel, purchase and renewal carry money and consent wording and are not listed. Under
// each field: what the sender always adds, and the placeholders. Preview runs the real renderer on a real visit and shows the
// message as the customer reads it, with a text's length in parts. The words commit when the field is left; a word that breaks
// a rule shows why and is not saved.

function Preview({ message, data }: { message: MessageTemplate; data: AdminData }) {
  const preview = previewMessage(message, data)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Preview ${messageName(message)}`}>
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messageName(message)}</DialogTitle>
          <DialogDescription>{message.channel === "sms" ? `Exactly as sent: ${preview.length} characters, ${preview.parts} ${preview.parts === 1 ? "part" : "parts"}.` : "The email as a customer reads it, in plain text."}</DialogDescription>
        </DialogHeader>
        {preview.subject && <p className="text-sm font-medium text-foreground">{preview.subject}</p>}
        <p className="whitespace-pre-line break-words rounded-lg bg-stone p-4 text-sm text-foreground">{preview.text}</p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ message, apply, data }: { message: MessageTemplate; apply: Apply; data: AdminData }) {
  const name = messageName(message)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg font-semibold text-navy">{name}</h2>
        <Badge variant="secondary">{channelWord(message.channel)}</Badge>
        <div className="ml-auto">
          <Preview message={message} data={data} />
        </div>
      </div>
      <Textarea
        key={message.body}
        aria-label={`${name} words`}
        aria-invalid={problem ? true : undefined}
        defaultValue={message.body}
        className="min-h-20"
        onBlur={(e) => {
          const v = e.currentTarget.value.trim()
          if (v === "") {
            e.currentTarget.value = message.body
            setProblem(null)
          } else if (v === message.body) setProblem(null)
          else {
            const found = templateProblem(message.key, message.channel, v)
            setProblem(found)
            if (!found) apply((s, a) => setMessage(s, message.key, message.channel, v, a))
          }
        }}
      />
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {problem}
      </p>
      <p className="text-xs text-muted-foreground">{lockedWords(message)}</p>
    </li>
  )
}

export function Messages({ state, apply, data }: { state: SettingsState; apply: Apply; data: AdminData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        The words customers read for the day of a visit, and the invoice reminder text. Placeholders: {PLACEHOLDERS.map((p) => `{${p.name}} ${p.about}`).join("; ")}.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {editableRows(state.settings.messages).map((m) => (
          <Row key={`${m.key}-${m.channel}`} message={m} apply={apply} data={data} />
        ))}
      </ul>
    </div>
  )
}
