"use client"

import { useId, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Message, MessageKind } from "@/lib/admin/types"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { EmptyState } from "./EmptyState"
import { MessageSquare } from "lucide-react"

// The two-way thread with one customer: every email and text the app sent,
// oldest first, each with its kind, channel, day and how it went (sent,
// delivered, failed, bounced), and the customer's replies on the other side.
// A reply box at the end sends a text from Trailhead's number when the
// customer has a phone and has not opted out. The prototype only calls
// `onReply`; the wiring plan's `messages.reply` does the sending. Client
// because of the draft.

export interface MessageThreadProps {
  messages: Message[]
  /** false when the customer has no phone or has opted out of texts; the box then says why */
  canText: boolean
  onReply?: (body: string) => void
  className?: string
}

export const KIND_NAMES: Record<MessageKind, string> = {
  "purchase-confirmation": "Confirmation",
  "date-set": "Date set",
  "date-moved": "Date moved",
  "day-before": "Reminder",
  "on-my-way": "On my way",
  receipt: "Receipt",
  "card-failed": "Card failed",
  cancelled: "Cancelled",
  renewal: "Renewal",
  reply: "Reply",
}

const STATUS_WORDS: Record<Message["status"], string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  bounced: "Bounced",
  received: "Unanswered",
  handled: "Answered",
}

const TROUBLE: Message["status"][] = ["failed", "bounced", "received"]

/** "Reminder · text · May 2 · Delivered"; a reply from the customer reads "Andrea · text · May 2 · Unanswered". */
export function messageMeta(message: Message): string {
  const who = message.direction === "in" ? "Customer" : KIND_NAMES[message.kind]
  return `${who} · ${message.channel === "sms" ? "text" : "email"} · ${shortDate(message.at, TIME_ZONE)} · ${STATUS_WORDS[message.status]}`
}

const byTime = (a: Message, b: Message) => a.at.localeCompare(b.at)

export function MessageThread({ messages, canText, onReply, className }: MessageThreadProps) {
  const id = useId()
  const [draft, setDraft] = useState("")
  const ordered = [...messages].sort(byTime)
  const send = () => {
    const body = draft.trim()
    if (!body) return
    onReply?.(body)
    setDraft("")
  }
  return (
    <div data-slot="message-thread" className={cn("flex flex-col gap-4", className)}>
      {ordered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" line="Every email and text the app sends this customer, and their replies, show here." />
      ) : (
        <ol className="flex flex-col gap-3">
          {ordered.map((message) => {
            const inbound = message.direction === "in"
            const trouble = TROUBLE.includes(message.status)
            return (
              <li key={message.id} data-direction={message.direction} data-status={message.status} className={cn("flex max-w-[85%] flex-col gap-1", inbound ? "self-start" : "self-end items-end")}>
                <p className={cn("rounded-lg px-3 py-2 text-sm", inbound ? "bg-cream text-foreground" : "bg-navy text-white")}>{message.body}</p>
                <p className={cn("text-xs", trouble ? "font-medium text-warning" : "text-muted-foreground")}>{messageMeta(message)}</p>
              </li>
            )
          })}
        </ol>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-reply`} className="text-sm text-muted-foreground">
          {canText ? "Reply by text, from Trailhead's number" : "This customer has no phone on file or has opted out of texts"}
        </label>
        <Textarea id={`${id}-reply`} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!canText} rows={2} placeholder={canText ? "Type a reply" : ""} />
        <Button size="sm" className="self-end" disabled={!canText || !draft.trim()} onClick={send}>
          Send text
        </Button>
      </div>
    </div>
  )
}
