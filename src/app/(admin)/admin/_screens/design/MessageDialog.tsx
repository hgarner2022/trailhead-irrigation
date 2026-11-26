"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Textarea } from "@/components/ui/textarea"
import type { ConfirmFacts } from "./confirm-copy"
import { optionClass, optionGroup } from "@/components/blocks/option-styles"
import { useKeyboardFocus } from "@/components/blocks/keyboard-focus"
import { cn } from "@/lib/utils"

const OPENER = "Trailhead: "
const STOP = " Reply STOP to opt out."

/** Send a message: the channel as a chip at the top (a text, or an email when both exist), the fixed "Trailhead:" opener in grey before the cursor, a live count, and a preview of exactly what the customer reads (the opt-out line only on the first text to that number). */
export function MessageDialog({ facts, onClose, onSend, initialBody = "" }: { facts: ConfirmFacts; onClose: () => void; onSend: (m: { channel: "text" | "email"; body: string }) => void; /** the words the box opens with (after the fixed "Trailhead:" opener): a move's "your spring turn-on moved to Thu, Nov 26 at 9:00 am." */ initialBody?: string }) {
  const [channel, setChannel] = useState<"text" | "email">(facts.channel === "email" ? "email" : "text")
  const [body, setBody] = useState(initialBody)
  const kbd = useKeyboardFocus()
  const isText = channel === "text"
  const sent = isText ? `${OPENER}${body}${facts.firstText ? STOP : ""}` : body
  const count = isText ? sent.length : 0
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} size="md" title="Send a message" confirmLabel={isText ? "Send the text" : "Send the email"} confirmDisabled={!body.trim()} slot="message-dialog" onConfirm={async () => (onSend({ channel, body: sent }), { ok: true })}>
      <div className="flex flex-col gap-3 text-sm">
        <div role="radiogroup" aria-label="Channel" className={cn("flex flex-wrap gap-2", optionGroup)} data-kbd={kbd.shown || undefined} {...kbd.handlers}>
          {([["text", `Text to ${facts.phone}`], ["email", `Email to ${facts.email ?? "the customer"}`]] as const).map(([c, label]) => (
            <button key={c} type="button" role="radio" aria-checked={channel === c} onClick={() => setChannel(c)} className={cn(optionClass({ selected: channel === c, focus: "selfKbd" }), "min-h-11 px-3 font-medium")}>{label}</button>
          ))}
        </div>
        <FormRow label="Message">
          <div className="flex flex-col gap-1">
            {isText && <span className="text-muted-foreground">{OPENER.trim()}</span>}
            <Textarea value={body} rows={3} onChange={(e) => setBody(e.target.value)} placeholder={isText ? "What do you want to tell " + facts.first + "?" : "Write the email"} />
          </div>
        </FormRow>
        {isText && <p className="text-muted-foreground">{count} of 160, {count <= 160 ? "one text" : `${Math.ceil(count / 153)} texts`}</p>}
        <div>
          <p className="mb-1 text-muted-foreground">What {facts.first} will see</p>
          <p data-slot="message-preview" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-stone px-3 py-2">{sent || "Your message appears here."}</p>
        </div>
      </div>
    </ConfirmDialog>
  )
}
