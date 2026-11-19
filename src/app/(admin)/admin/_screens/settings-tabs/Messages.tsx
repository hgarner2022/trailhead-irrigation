"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SettingsList } from "@/components/blocks/SettingsList"
import { PLACEHOLDERS, templateProblem } from "@/emails/editable"
import { TEXTS_PAUSED_ROW } from "@/lib/messaging/paused-words"
import type { AdminData, MessageTemplate } from "@/lib/admin/types"
import { channelWord, editableRows, lockedWords, messageName, previewMessage, setMessage } from "../settings-messages"
import type { SettingsState } from "../settings-model"
import type { Apply } from "./fields"

// The messages the office may edit: the day-of voice (day set, day moved, two weeks out, day before, on the way) and the invoice
// reminder text, one SettingsList row each. Receipts, invoices, card, cancel, purchase and renewal carry money and consent wording and
// are not listed. Under each field: what the sender always adds. Preview runs the real renderer on a real visit and shows the message as
// the customer reads it, with a text's length in parts. The words commit when the field is left; a word that breaks a rule shows why
// and is not saved.

function Preview({ message, data }: { message: MessageTemplate; data: AdminData }) {
  const [open, setOpen] = useState(false)
  const preview = previewMessage(message, data)
  return (
    <>
      <Button variant="outline" size="sm" aria-label={`Preview ${messageName(message)}`} className="min-h-11 md:min-h-0" onClick={() => setOpen(true)}>
        Preview
      </Button>
      <ConfirmDialog
        title={messageName(message)}
        message={message.channel === "sms" ? `Exactly as sent: ${preview.length} characters, ${preview.parts} ${preview.parts === 1 ? "part" : "parts"}.` : "The email as a customer reads it, in plain text."}
        open={open}
        onOpenChange={setOpen}
        actions="none"
        size="md"
      >
        {preview.subject && <p className="text-sm font-medium text-foreground">{preview.subject}</p>}
        <p className="whitespace-pre-line break-words rounded-lg bg-stone p-4 text-sm text-foreground">{preview.text}</p>
        <div className="flex justify-end">
          <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </ConfirmDialog>
    </>
  )
}

function Words({ message, apply }: { message: MessageTemplate; apply: Apply }) {
  const name = messageName(message)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <FormRow label="Words" inline error={problem ?? undefined} hint={lockedWords(message)}>
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
    </FormRow>
  )
}

/** Shown at the top while `TEXTS_PAUSED` is on: the words the office edits here still go, but by email. */
export function TextsPausedBanner() {
  return (
    <p role="status" data-slot="texts-paused-banner" className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
      {TEXTS_PAUSED_ROW}
    </p>
  )
}

export function Messages({ state, apply, data }: { state: SettingsState; apply: Apply; data: AdminData }) {
  return (
    <div className="space-y-4">
      {data.textsPaused && <TextsPausedBanner />}
      <SettingsList
      title="Messages"
      description={`The words customers read for the day of a visit, and the invoice reminder text. Placeholders: ${PLACEHOLDERS.map((p) => `{${p.name}} ${p.about}`).join("; ")}.`}
      changes={state.changes}
      rows={editableRows(state.settings.messages).map((m) => ({
        id: `${m.key}-${m.channel}`,
        title: messageName(m),
        single: true,
        aside: (
          <>
            <Badge variant="secondary">{channelWord(m.channel)}</Badge>
            <Preview message={m} data={data} />
          </>
        ),
        children: <Words message={m} apply={apply} />,
      }))}
    />
    </div>
  )
}
