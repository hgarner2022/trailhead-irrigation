"use client"

import { useMemo, useState, useTransition } from "react"
import type { AdminData } from "@/lib/admin/types"
import type { CustomersActions } from "./CustomersScreen"
import { CustomerPanel, type CustomerPanelProps } from "./CustomerPanel"
import { customerRows } from "./customers-model"
import type { VisitActions } from "./visit-actions-types"

// The customer panel with what a screen used to hold for it: the customer's row, the opt-out call with its notice, and whether "Send pass
// offer" shows (only in the catalog, which has no actions). RecordHost renders it for `?customer=`.

export interface CustomerPanelHostProps extends Pick<CustomerPanelProps, "open" | "onOpenChange" | "readOnly" | "back"> {
  data: AdminData
  today: string
  customerId: string
  actions?: CustomersActions
  visitActions?: VisitActions
}

export function CustomerPanelHost({ data, today, customerId, open, onOpenChange, readOnly = false, actions, visitActions, back }: CustomerPanelHostProps) {
  const row = useMemo(() => customerRows(data, today).find((r) => r.id === customerId), [data, today, customerId])
  const [pending, start] = useTransition()
  const [notice, setNotice] = useState("")
  if (!row) return null
  const optOut = () =>
    start(async () => {
      const out = await actions!.recordMarketingOptOut(row.id)
      setNotice(out.ok ? "Marketing opt-out recorded." : out.message)
    })
  return (
    <CustomerPanel
      open={open}
      onOpenChange={onOpenChange}
      back={back}
      row={row}
      client={data.clients.find((c) => c.id === customerId)}
      data={data}
      today={today}
      readOnly={readOnly}
      actions={visitActions}
      notice={notice}
      // "Send pass offer" is the January pre-sell and has no API behind it yet, so the live page leaves it out.
      offers={!actions && !readOnly}
      onOptOut={actions && !readOnly ? optOut : undefined}
      optOutPending={pending}
    />
  )
}
