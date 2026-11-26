"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { RECORD_ROW, RecordList, RecordRowEnd, RecordRowText } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { SERVICE_LIST } from "@/lib/services"
import type { AdminData, JobLine, ServiceItem } from "@/lib/admin/types"
import type { JobActions } from "./job-actions-types"
import { FORM_STATUS } from "./use-runner"
import { JobLines } from "./VisitLines"
import { money } from "@/lib/admin/format"
import { SelectField } from "@/components/blocks/SelectField"

// The Lines section of the job panel: what was sold, one row each, a canceled line struck through, an unpriced line saying
// Quote later, a Tax line only when there is sales tax, and the total. On an open one-off job a manager changes the price and quantity of a line in place (the total
// follows), cancels a line, and adds one from the active catalogue or as a free line, each in one dialog. A tech, a pass and a job paid in full
// see the plain list. Every change goes through `lines.add`, `lines.update` and `lines.cancel`, which refuse what is wrong.

const FREE = "free"

/** What a canceled job's canceled lines were worth, whole dollars: shown struck through where the total would be, so "Quote later" stays the word for lines nobody has priced. */
export const canceledAmount = (lines: readonly Pick<JobLine, "quantity" | "unitPrice" | "cancelledAt">[]): number => lines.filter((l) => l.cancelledAt).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)

/** The Total of a job: its figure, else the struck-through amount of its canceled lines, else Quote later (nothing priced). */
export function TotalWords({ total, lines }: { total: number; lines: readonly Pick<JobLine, "quantity" | "unitPrice" | "cancelledAt">[] }) {
  if (total > 0) return <>{money(total)}</>
  const was = canceledAmount(lines)
  return was > 0 ? <del data-slot="total-canceled" className="text-muted-foreground">{money(was)}</del> : <>Quote later</>
}

/** "2 × $38": the line's quantity and price, or Quote later when nothing has priced it. */
export const lineDetail = (line: Pick<JobLine, "quantity" | "unitPrice">): string => (line.unitPrice > 0 ? `${line.quantity} × ${money(line.unitPrice)}` : "Quote later")

/** Change the quantity and price of a live line, or cancel it; one dialog. */
function EditLineDialog({ line, actions, open, onOpenChange }: { line: JobLine; actions?: JobActions; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [quantity, setQuantity] = useState(String(line.quantity))
  const [price, setPrice] = useState(String(line.unitPrice))
  const [problem, setProblem] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const save = async () => {
    const changes = { quantity: Math.max(1, Number(quantity) || 1), unitPrice: Number(price) || 0 }
    if (!actions) return (console.info("update line", line.id, changes), { ok: true as const })
    return actions.updateLine(line.id, changes)
  }
  const cancel = async () => {
    if (!actions) return (console.info("cancel line", line.id), onOpenChange(false))
    setCancelling(true)
    const out = await actions.cancelLine(line.id)
    setCancelling(false)
    if (out.ok) onOpenChange(false)
    else setProblem(out.message)
  }
  return (
    <ConfirmDialog slot="edit-line" title={`Edit ${line.name}`} confirmLabel="Save line" open={open} onOpenChange={onOpenChange} onConfirm={save}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Quantity">
          <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
        </FormRow>
        <FormRow label="Price each">
          <Input inputMode="numeric" value={price} placeholder="Quote later" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
        </FormRow>
      </div>
      <Button size="touch" type="button" variant="ghost" className="self-start text-destructive hover:text-destructive" disabled={cancelling} onClick={cancel}>
        Cancel line
      </Button>
      <p role="alert" className={`${FORM_STATUS} text-destructive`}>
        {problem}
      </p>
    </ConfirmDialog>
  )
}

/** Add a line from the active catalogue or as a free line with its own name; one dialog. */
function AddLineDialog({ jobId, services, actions, open, onOpenChange }: { jobId: string; services: readonly ServiceItem[]; actions?: JobActions; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [what, setWhat] = useState(FREE)
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState<string | null>(null)
  const service = services.find((s) => s.key === what)
  const shownPrice = price ?? (service?.price !== undefined ? String(service.price) : "")
  const ready = service ? true : name.trim().length > 0
  const add = async () => {
    const input = {
      jobId,
      quantity: Math.max(1, Number(quantity) || 1),
      unitPrice: Number(shownPrice) || 0,
      ...(service ? { serviceKey: service.key } : { name: name.trim() }),
    }
    if (!actions) return (console.info("add line", input), { ok: true as const })
    return actions.addLine(input)
  }
  return (
    <ConfirmDialog slot="add-line" title="Add a line" confirmLabel="Add line" confirmDisabled={!ready} open={open} onOpenChange={onOpenChange} onConfirm={add}>
      <FormRow label="What was added">
        <SelectField value={what} onChange={(e) => (setWhat(e.target.value), setPrice(null))}>
          <option value={FREE}>Something else, with its own name</option>
          {services.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </SelectField>
      </FormRow>
      {!service && (
        <FormRow label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
        </FormRow>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Quantity">
          <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
        </FormRow>
        <FormRow label="Price each">
          <Input inputMode="numeric" value={shownPrice} placeholder="Quote later" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}

export interface JobLinesSectionProps {
  jobId: string
  lines: JobLine[]
  /** whole dollars, cancelled lines left out, with the sales tax */
  total: number
  /** the sales tax in `total`; the Tax line shows only above zero */
  tax?: number
  data: Pick<AdminData, "services">
  /** a manager of an open one-off job may change the lines; everyone else reads the list */
  editable: boolean
  actions?: JobActions
  /** the Add a line dialog is open; the job panel's footer opens it when Add a line is the primary. Left out, the section keeps its own. */
  adding?: boolean
  onAddingChange?: (adding: boolean) => void
  /** the footer carries the Add a line button, so the section does not draw a second one */
  addInFooter?: boolean
}

export function JobLinesSection({ jobId, lines, total, tax = 0, data, editable, actions, adding: addingProp, onAddingChange, addInFooter = false }: JobLinesSectionProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [own, setOwn] = useState(false)
  const adding = addingProp ?? own
  const setAdding = onAddingChange ?? setOwn
  const services = (data.services ?? (SERVICE_LIST as readonly ServiceItem[])).filter((s) => s.active !== false)
  return (
    <section aria-labelledby="job-lines" data-slot="job-lines">
      <SectionHeading id="job-lines">Lines</SectionHeading>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing has been added yet.</p>
      ) : editable ? (
        <RecordList>
          {lines.map((line) => (
            <li key={line.id}>
              <div className={`flex min-h-11 items-center ${RECORD_ROW} ${line.cancelledAt ? "text-muted-foreground line-through" : ""}`}>
                <RecordRowText title={line.name} detail={line.cancelledAt ? "canceled" : lineDetail(line)} />
                <RecordRowEnd>
                  <span className="tabular-nums">{line.unitPrice > 0 ? money(line.quantity * line.unitPrice) : ""}</span>
                </RecordRowEnd>
                {!line.cancelledAt && (
                  <Button type="button" variant="ghost" size="touch-sm" className="shrink-0 no-underline" aria-label={`Edit ${line.name}`} onClick={() => setEditing(line.id)}>
                    Edit
                  </Button>
                )}
              </div>
              {editing === line.id && <EditLineDialog key={line.id} line={line} actions={actions} open onOpenChange={(o) => !o && setEditing(null)} />}
            </li>
          ))}
        </RecordList>
      ) : (
        <JobLines lines={lines} visitId="" />
      )}
      {tax > 0 && (
        <p className="mt-2 flex justify-between text-sm" data-slot="job-tax">
          <span>Tax</span>
          <span className="tabular-nums">{money(tax)}</span>
        </p>
      )}
      <p className="mt-2 flex justify-between text-sm font-semibold" data-slot="job-total">
        <span>Total</span>
        <span className="tabular-nums"><TotalWords total={total} lines={lines} /></span>
      </p>
      {editable && !adding && !addInFooter && (
        <Button size="touch" type="button" variant="outline" className="mt-3" onClick={() => setAdding(true)}>
          Add a line
        </Button>
      )}
      {editable && <AddLineDialog key={String(adding)} jobId={jobId} services={services} actions={actions} open={adding} onOpenChange={setAdding} />}
    </section>
  )
}
