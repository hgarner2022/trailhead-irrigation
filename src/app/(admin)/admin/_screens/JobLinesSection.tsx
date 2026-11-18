"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PANEL_ROW, PanelHeading, PanelList, PanelRowEnd, PanelRowText } from "@/components/blocks/PanelParts"
import { SERVICE_LIST } from "@/lib/services"
import type { AdminData, JobLine, ServiceItem } from "@/lib/admin/types"
import { FIELD, LABEL } from "./CustomerPicker"
import type { JobActions } from "./job-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { JobLines } from "./VisitLines"

// The Lines section of the job panel: what was sold, one row each, a cancelled line struck through, an unpriced line saying
// Quote later, and the total. On an open one-off job a manager changes the price and quantity of a line in place (the total
// follows), cancels a line, and adds one from the active catalogue or as a free line. A tech, a pass and a job paid in full
// see the plain list. Every change goes through `lines.add`, `lines.update` and `lines.cancel`, which refuse what is wrong.

const money = (n: number) => `$${n.toLocaleString("en-US")}`
const FREE = "free"

/** "2 × $38": the line's quantity and price, or Quote later when nothing has priced it. */
export const lineDetail = (line: Pick<JobLine, "quantity" | "unitPrice">): string => (line.unitPrice > 0 ? `${line.quantity} × ${money(line.unitPrice)}` : "Quote later")

function EditLine({ line, actions, onDone }: { line: JobLine; actions?: JobActions; onDone: () => void }) {
  const [quantity, setQuantity] = useState(String(line.quantity))
  const [price, setPrice] = useState(String(line.unitPrice))
  const { pending, error, run } = useRunner()
  const save = () => {
    const changes = { quantity: Math.max(1, Number(quantity) || 1), unitPrice: Number(price) || 0 }
    if (!actions) return console.info("update line", line.id, changes)
    run(() => actions.updateLine(line.id, changes), onDone)
  }
  const cancel = () => (actions ? run(() => actions.cancelLine(line.id), onDone) : console.info("cancel line", line.id))
  return (
    <div className="grid grid-cols-2 gap-3 pb-3">
      <div>
        <label htmlFor={`qty-${line.id}`} className={LABEL}>
          Quantity
        </label>
        <Input id={`qty-${line.id}`} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
      </div>
      <div>
        <label htmlFor={`price-${line.id}`} className={LABEL}>
          Price each
        </label>
        <Input id={`price-${line.id}`} inputMode="numeric" value={price} placeholder="Quote later" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-2">
        <Button type="button" className="min-h-11" disabled={pending} onClick={save}>
          Save line
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onDone}>
          Keep as it was
        </Button>
        <Button type="button" variant="ghost" className="ml-auto min-h-11 text-destructive hover:text-destructive" disabled={pending} onClick={cancel}>
          Cancel line
        </Button>
      </div>
      <p role="alert" className={`${FORM_STATUS} col-span-2 text-destructive`}>
        {error}
      </p>
    </div>
  )
}

function AddLine({ jobId, services, actions, onDone }: { jobId: string; services: readonly ServiceItem[]; actions?: JobActions; onDone: () => void }) {
  const [what, setWhat] = useState(FREE)
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState<string | null>(null)
  const { pending, error, run } = useRunner()
  const service = services.find((s) => s.key === what)
  const shownPrice = price ?? (service?.price !== undefined ? String(service.price) : "")
  const ready = service ? true : name.trim().length > 0
  const add = () => {
    const input = {
      jobId,
      quantity: Math.max(1, Number(quantity) || 1),
      unitPrice: Number(shownPrice) || 0,
      ...(service ? { serviceKey: service.key } : { name: name.trim() }),
    }
    if (!actions) return console.info("add line", input)
    run(() => actions.addLine(input), onDone)
  }
  return (
    <div data-slot="add-line" className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
      <div className="col-span-2">
        <label htmlFor="line-what" className={LABEL}>
          What was added
        </label>
        <select id="line-what" value={what} onChange={(e) => (setWhat(e.target.value), setPrice(null))} className={FIELD}>
          <option value={FREE}>Something else, with its own name</option>
          {services.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {!service && (
        <div className="col-span-2">
          <label htmlFor="line-name" className={LABEL}>
            Name
          </label>
          <Input id="line-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
        </div>
      )}
      <div>
        <label htmlFor="line-qty" className={LABEL}>
          Quantity
        </label>
        <Input id="line-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
      </div>
      <div>
        <label htmlFor="line-price" className={LABEL}>
          Price each
        </label>
        <Input id="line-price" inputMode="numeric" value={shownPrice} placeholder="Quote later" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-2">
        <Button type="button" className="min-h-11" disabled={pending || !ready} onClick={add}>
          Add line
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onDone}>
          Never mind
        </Button>
      </div>
      <p role="alert" className={`${FORM_STATUS} col-span-2 text-destructive`}>
        {error}
      </p>
    </div>
  )
}

export interface JobLinesSectionProps {
  jobId: string
  lines: JobLine[]
  /** whole dollars, cancelled lines left out */
  total: number
  data: Pick<AdminData, "services">
  /** a manager of an open one-off job may change the lines; everyone else reads the list */
  editable: boolean
  actions?: JobActions
}

export function JobLinesSection({ jobId, lines, total, data, editable, actions }: JobLinesSectionProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const services = (data.services ?? (SERVICE_LIST as readonly ServiceItem[])).filter((s) => s.active !== false)
  return (
    <section aria-labelledby="job-lines" data-slot="job-lines">
      <PanelHeading id="job-lines">Lines</PanelHeading>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing has been added yet.</p>
      ) : editable ? (
        <PanelList>
          {lines.map((line) => (
            <li key={line.id}>
              {editing === line.id ? (
                <EditLine line={line} actions={actions} onDone={() => setEditing(null)} />
              ) : (
                <div className={`flex min-h-11 items-center ${PANEL_ROW} ${line.cancelledAt ? "text-muted-foreground line-through" : ""}`}>
                  <PanelRowText title={line.name} detail={line.cancelledAt ? "cancelled" : lineDetail(line)} />
                  <PanelRowEnd>
                    <span className="tabular-nums">{line.unitPrice > 0 ? money(line.quantity * line.unitPrice) : ""}</span>
                  </PanelRowEnd>
                  {!line.cancelledAt && (
                    <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0 no-underline" aria-label={`Edit ${line.name}`} onClick={() => setEditing(line.id)}>
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </PanelList>
      ) : (
        <JobLines lines={lines} visitId="" />
      )}
      <p className="mt-2 flex justify-between text-sm font-semibold" data-slot="job-total">
        <span>Total</span>
        <span className="tabular-nums">{total > 0 ? money(total) : "Quote later"}</span>
      </p>
      {editable && !adding && (
        <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => setAdding(true)}>
          Add a line
        </Button>
      )}
      {editable && adding && <AddLine jobId={jobId} services={services} actions={actions} onDone={() => setAdding(false)} />}
    </section>
  )
}
