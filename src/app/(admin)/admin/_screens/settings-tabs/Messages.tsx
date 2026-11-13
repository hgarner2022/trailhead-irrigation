"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AdminData, MessageTemplate } from "@/lib/admin/types"
import { channelWord, fillMessage, messageName, sampleFor, setMessage, type SettingsState } from "../settings-model"
import { CommitInput, type Apply } from "./fields"

// Each customer message the app sends, one row: its name and channel, a
// switch, the subject for an email and the body. Preview fills the
// placeholders from the first pass and visit in the data so the words are
// read the way a customer would read them. The body commits when the field
// is left.

function Preview({ message, data }: { message: MessageTemplate; data: AdminData }) {
  const sample = sampleFor(data)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Preview ${messageName(message.key)}`}>
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messageName(message.key)}</DialogTitle>
          <DialogDescription>{`${channelWord(message.channel)} as ${sample.firstName} would read it.`}</DialogDescription>
        </DialogHeader>
        {message.subject && <p className="text-sm font-medium text-foreground">{fillMessage(message.subject, sample)}</p>}
        <p className="whitespace-pre-line rounded-lg bg-stone p-4 text-sm text-foreground">{fillMessage(message.body, sample)}</p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Messages({ state, apply, data }: { state: SettingsState; apply: Apply; data: AdminData }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {state.settings.messages.map((m) => {
        const name = messageName(m.key)
        const id = `message-${m.key}`
        return (
          <li key={m.key} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-semibold text-navy">{name}</h2>
              <Badge variant="secondary">{channelWord(m.channel)}</Badge>
              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id={`${id}-on`} checked={m.enabled} onCheckedChange={(v) => apply((s, a) => setMessage(s, m.key, "enabled", v === true, a))} />
                  <Label htmlFor={`${id}-on`} className="font-normal">
                    {"Send"}
                    <span className="sr-only">{` ${name}`}</span>
                  </Label>
                </div>
                <Preview message={m} data={data} />
              </div>
            </div>
            {m.channel === "email" && (
              <CommitInput label={`${name} subject`} value={m.subject ?? ""} onCommit={(v) => apply((s, a) => setMessage(s, m.key, "subject", v, a))} />
            )}
            <Textarea
              key={m.body}
              aria-label={`${name} message`}
              defaultValue={m.body}
              className="min-h-24"
              onBlur={(e) => {
                const v = e.currentTarget.value.trim()
                if (v === "") e.currentTarget.value = m.body
                else if (v !== m.body) apply((s, a) => setMessage(s, m.key, "body", v, a))
              }}
            />
            <p className="text-xs text-muted-foreground">Placeholders: {"{firstName}, {visit}, {date}, {truck}, {nextVisit}"}</p>
          </li>
        )
      })}
    </ul>
  )
}
