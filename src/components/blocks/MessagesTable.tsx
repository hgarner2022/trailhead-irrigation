"use client"

import { Mail, MessageSquare } from "lucide-react"
import type { Message } from "@/lib/admin/types"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import { KIND_NAMES } from "./MessageThread"
import { StatusPill, type PillStatus } from "./StatusPill"

// Everything the app sent one customer, emails and texts together, as a table on `DataGrid` (the customer page's Messages card):
// Date, Message (the kind over its first line), Channel (icon and word), To, Status as a pill. Newest first. Nothing opens from a row
// (the messages are one-way). Pure props: the caller hands in the phone and email the messages went to.

export interface MessagesTableProps {
  messages: Message[]
  phone: string
  email: string
}

interface Row {
  id: string
  at: string
  date: string
  kind: string
  line: string
  channel: "Text" | "Email"
  to: string
  status: Message["status"]
}

const STATUS: Record<Message["status"], { pill: PillStatus; label: string }> = {
  queued: { pill: "pending", label: "Queued" },
  sent: { pill: "done", label: "Sent" },
  delivered: { pill: "done", label: "Delivered" },
  failed: { pill: "failed", label: "Failed" },
  bounced: { pill: "failed", label: "Bounced" },
}

const date = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })

const columns: GridColumnDef<Row>[] = [
  { id: "date", accessorKey: "at", header: "Date", cell: ({ row }) => <span className="whitespace-nowrap">{row.original.date}</span>, meta: { csv: (r) => (r as Row).at } },
  {
    id: "message",
    accessorFn: (r) => `${r.kind} ${r.line}`,
    header: "Message",
    cell: ({ row }) => (
      <span className="block min-w-0">
        <span className="block font-medium">{row.original.kind}</span>
        <span className="block max-w-[28ch] truncate text-muted-foreground">{row.original.line}</span>
      </span>
    ),
    meta: { csv: (r) => `${(r as Row).kind}: ${(r as Row).line}` },
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5">
        {row.original.channel === "Email" ? <Mail className="size-4 text-muted-foreground" aria-hidden /> : <MessageSquare className="size-4 text-muted-foreground" aria-hidden />}
        {row.original.channel}
      </span>
    ),
  },
  { id: "to", accessorKey: "to", header: "To" },
  { id: "status", accessorFn: (r) => STATUS[r.status].label, header: "Status", cell: ({ row }) => <StatusPill status={STATUS[row.original.status].pill} label={STATUS[row.original.status].label} /> },
]

export function MessagesTable({ messages, phone, email }: MessagesTableProps) {
  const rows: Row[] = [...messages]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((m) => ({ id: m.id, at: m.at, date: date(m.at), kind: KIND_NAMES[m.kind], line: m.body, channel: m.channel === "email" ? "Email" : "Text", to: m.channel === "email" ? email : phone, status: m.status }))
  return (
    <DataGrid
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      card={{ title: "message", line: ["channel", "to"], state: "status", when: ["date"] }}
      pageSize={10}
      emptyTitle="No messages yet"
      emptyLine="Texts and emails to this customer show here as they go out."
    />
  )
}
