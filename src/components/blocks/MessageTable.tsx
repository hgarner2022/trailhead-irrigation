"use client"

import { useMemo, useState } from "react"
import { Mail, MessageSquare } from "lucide-react"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import type { Message } from "@/lib/admin/types"
import { ConfirmDialog } from "./ConfirmDialog"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import type { GridCardSlots } from "./DataGridCard"
import { KIND_NAMES, isTrouble, statusWords } from "./MessageThread"
import { StatusPill, type PillStatus } from "./StatusPill"

// Everything the app sent one customer, as a table (Hannah, Nov 19 2026: emails and more will come, so a list, not chat bubbles): Date,
// Message (the kind as the title, the first line of the body under it, quiet), Channel (icon and word), To (the number or address), Status
// (a dot pill: Delivered, Sent, Not delivered with its reason). Newest first. A row opens the whole message in a read-only dialog. On a phone
// the same rows are cards. It is a `DataGrid` underneath, so it sorts and pages like every other table; `compact` (in a side panel) leaves
// the To column out. Client component.

export interface MessageTableProps {
  messages: Message[]
  /** where each channel went: the customer's number and address */
  to: { sms: string; email: string }
  /** a side panel: no To column */
  compact?: boolean
}

interface Row {
  id: string
  at: string
  date: string
  title: string
  preview: string
  channel: Message["channel"]
  to: string
  status: PillStatus
  statusLabel: string
  message: Message
}

const pillOf = (m: Message): PillStatus => (isTrouble(m) ? "failed" : m.status === "delivered" ? "active" : "pending")
const firstLine = (body: string) => body.split("\n")[0] ?? body

const COLUMNS: GridColumnDef<Row>[] = [
  { id: "date", accessorKey: "at", header: "Date", cell: ({ row }) => row.original.date, meta: { csv: (r) => (r as Row).date } },
  {
    id: "message",
    accessorFn: (r) => `${r.title} ${r.preview}`,
    header: "Message",
    cell: ({ row }) => (
      <span className="block min-w-0 max-w-[28ch]">
        <span className="block font-medium">{row.original.title}</span>
        <span className="block truncate text-muted-foreground" title={row.original.preview}>{row.original.preview}</span>
      </span>
    ),
  },
  {
    id: "channel",
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => {
      const sms = row.original.channel === "sms"
      const Icon = sms ? MessageSquare : Mail
      return (
        <span className="inline-flex items-center gap-1.5">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {sms ? "Text" : "Email"}
        </span>
      )
    },
  },
  { id: "to", accessorKey: "to", header: "To" },
  { id: "status", accessorKey: "statusLabel", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} label={row.original.statusLabel} /> },
]

/** On a phone: the day, the kind, the first line, the channel, and the status. */
const CARD: GridCardSlots = { title: "date", line: ["message"], state: "status", when: ["channel"] }

export function MessageTable({ messages, to, compact }: MessageTableProps) {
  const [open, setOpen] = useState<Row | null>(null)
  const rows = useMemo<Row[]>(
    () =>
      [...messages]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((m) => ({
          id: m.id,
          at: m.at,
          date: shortDate(m.at, TIME_ZONE),
          title: KIND_NAMES[m.kind],
          preview: firstLine(m.body),
          channel: m.channel,
          to: m.channel === "sms" ? to.sms : to.email,
          status: pillOf(m),
          statusLabel: statusWords(m),
          message: m,
        })),
    [messages, to.sms, to.email],
  )
  return (
    <div data-slot="message-table">
      <DataGrid
        columns={COLUMNS}
        card={CARD}
        data={rows}
        getRowId={(r) => r.id}
        onOpen={setOpen}
        hiddenColumns={compact ? ["to"] : undefined}
        pageSize={10}
        emptyTitle="No messages yet"
        emptyLine="Every email and text the app sends this customer shows here."
      />
      <ConfirmDialog
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open?.title ?? "Message"}
        actions="none"
        size="md"
        slot="message-dialog"
      >
        {open && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              {open.channel === "sms" ? "Text" : "Email"} to {open.to} · {open.date} · {open.statusLabel}
            </p>
            <p className="whitespace-pre-wrap rounded-lg bg-stone p-3">{open.message.body}</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
