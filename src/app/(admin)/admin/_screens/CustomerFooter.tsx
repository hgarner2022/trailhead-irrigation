"use client"

import { useState } from "react"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import type { AdminData, Client } from "@/lib/admin/types"
import type { CustomerRow } from "./customers-model"
import { NewJob } from "./NewJob"
import { TextDialog } from "./VisitEditText"
import type { VisitActions } from "./visit-actions-types"

// The Customers panel's footer (`RecordFooter`): New job is the primary, Send a text beside it, and Open job, Send pass offer and Record
// phone opt-out under More. A tech sees no buttons. New job opens the same sheet as the page header's; Send a text is one dialog.

export interface CustomerFooterProps {
  row: CustomerRow
  client: Client | undefined
  data: AdminData
  /** ISO datetime */
  today: string
  readOnly: boolean
  actions?: VisitActions
  /** the customer's pass job, for Open job */
  jobHref?: string
  offers: boolean
  onOptOut?: () => void
  optOutPending?: boolean
}

export function CustomerFooter({ row, client, data, today, readOnly, actions, jobHref, offers, onOptOut, optOutPending = false }: CustomerFooterProps) {
  const [jobOpen, setJobOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  // A tech has no buttons but the way up to the job.
  if (readOnly) return jobHref ? <RecordFooter primary={{ label: "Open job", href: jobHref }} /> : null
  const canJob = Boolean(client?.app)
  const more: FooterAction[] = [
    ...(jobHref ? [{ label: "Open job", href: jobHref }] : []),
    ...(offers ? [{ label: "Send pass offer", onClick: () => console.info("send pass offer", [row.name]) }] : []),
    ...(onOptOut && client?.consent?.marketingOptIn ? [{ label: "Record phone opt-out", onClick: onOptOut, disabled: optOutPending }] : []),
  ]
  return (
    <>
      <RecordFooter primary={canJob ? { label: "New job", onClick: () => setJobOpen(true) } : undefined} secondary={canJob ? [{ label: "Send a text", onClick: () => setTextOpen(true) }] : undefined} more={more} />
      {canJob && <NewJob data={data} today={today} open={jobOpen} onOpenChange={setJobOpen} customerId={row.id} actions={actions} />}
      {canJob && <TextDialog client={client} actions={actions} open={textOpen} onOpenChange={setTextOpen} />}
    </>
  )
}
