import type { Message, MessageKind } from "@/lib/admin/types"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"
import { MessageSquare } from "lucide-react"

// What the app has sent one customer, oldest first: each message's kind,
// channel, day and how it went (sent, delivered, failed, bounced). One
// message per event, text for timing and email for money (Hannah,
// 2026-11-13); one-way, so there is no reply box; a failed or bounced row
// is what Hannah checks before calling. Pure render, server component.

export interface MessageThreadProps {
  messages: Message[]
  className?: string
}

export const KIND_NAMES: Record<MessageKind, string> = {
  "purchase-confirmation": "Confirmation",
  "date-set": "Date set",
  "date-moved": "Date moved",
  "day-before": "Reminder",
  receipt: "Receipt",
  "card-failed": "Card failed",
  cancelled: "Cancelled",
  renewal: "Renewal",
}

const STATUS_WORDS: Record<Message["status"], string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  bounced: "Bounced",
}

const TROUBLE: Message["status"][] = ["failed", "bounced"]

/** "Reminder · text · May 2 · Delivered". */
export function messageMeta(message: Message): string {
  return `${KIND_NAMES[message.kind]} · ${message.channel === "sms" ? "text" : "email"} · ${shortDate(message.at, TIME_ZONE)} · ${STATUS_WORDS[message.status]}`
}

const byTime = (a: Message, b: Message) => a.at.localeCompare(b.at)

export function MessageThread({ messages, className }: MessageThreadProps) {
  const ordered = [...messages].sort(byTime)
  if (ordered.length === 0) {
    return <EmptyState className={className} icon={MessageSquare} title="No messages yet" line="Every email and text the app sends this customer shows here." />
  }
  return (
    <ol data-slot="message-thread" className={cn("flex flex-col gap-3", className)}>
      {ordered.map((message) => {
        const trouble = TROUBLE.includes(message.status)
        return (
          <li key={message.id} data-status={message.status} className="flex max-w-[85%] flex-col items-end gap-1 self-end">
            <p className="rounded-lg bg-navy px-3 py-2 text-sm text-white">{message.body}</p>
            <p className={cn("text-xs", trouble ? "font-medium text-warning" : "text-muted-foreground")}>{messageMeta(message)}</p>
          </li>
        )
      })}
    </ol>
  )
}
