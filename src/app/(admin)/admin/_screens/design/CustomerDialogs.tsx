"use client"

import { useState, type ReactNode } from "react"
import { CollectPayment } from "@/components/blocks/CollectPayment"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SplitButton } from "@/components/blocks/SplitButton"
import { useToast } from "@/components/blocks/Toast"
import { Input } from "@/components/ui/input"
import { collectPlan, dollars } from "@/lib/money/collect"
import { collectConfirm, type ConfirmCopy, type Reach } from "./confirm-copy"
import type { CustomerPageData } from "./customer-fixtures"

// The dialogs behind the customer page's buttons. A button that reaches the customer or their money opens one of these first; each states its
// exact effect and the customer's own channel, and a result is a toast, never a message left in a section. Pure props: nothing is sent.

export const contactOf = (d: Pick<CustomerPageData, "firstName" | "contact">): Reach => ({ first: d.firstName, channel: d.contact.channel, phone: d.contact.phone.text, email: d.contact.email })

/** A confirmation from its `Copy`: with a quiet twin the confirm is a split button whose caret opens below. */
export function CopyDialog({ copy, onClose, onDone, children, size }: { copy: ConfirmCopy; onClose: () => void; onDone: (variant?: string) => void; children?: ReactNode; size?: "sm" | "md" }) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={copy.title}
      message={copy.message}
      confirmLabel={copy.confirmLabel}
      destructive={copy.destructive}
      size={size}
      slot="action-confirm"
      onConfirm={async (variant) => (onDone(variant), { ok: true })}
      renderConfirm={copy.quiet ? ({ confirm, pending }) => <SplitButton label={copy.confirmLabel} onClick={() => confirm("notify")} disabled={pending} menuLabel="More ways" menu={[{ label: copy.quiet!, onSelect: () => confirm("quiet") }]} /> : undefined}
    >
      {copy.body && <p className="whitespace-pre-wrap rounded-lg bg-stone p-3 text-sm">{copy.body}</p>}
      {children}
    </ConfirmDialog>
  )
}

export interface CollectDialogProps {
  who: Reach
  amount: number
  card?: { brand: string; last4: string }
  /** the invoice that is out, if any: recording a payment settles it and closes its pay link */
  invoice?: { number: string; jobName: string; amount: string }
  onClose: () => void
  /** money went through: the page changes state (a new pill, a new payment row) */
  onPaid?: () => void
}

/** "How is this paid?": the card on file first and preselected when there is one, Check with an empty number box, Venmo, Cash, and Send an invoice only when none is out. */
export function CollectDialog({ who, amount, card, invoice, onClose, onPaid }: CollectDialogProps) {
  const toast = useToast()
  const plan = collectPlan({ amount, card, isPass: false, invoiceOpen: false, canInvoice: !invoice, declined: false, charging: false, dueDays: 14 })
  const so = (words: string, notify?: boolean) => toast(notify === false ? `${words}. ${who.first} was not notified.` : words)
  const ways = { check: "check", venmo: "Venmo payment", cash: "cash payment" } as const
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title="How is this paid?" actions="none" size="md" slot="collect-dialog">
      <CollectPayment
        plan={plan}
        summary={invoice ? `Invoice ${invoice.number} · ${invoice.jobName} · ${invoice.amount} unpaid` : `${dollars(amount)} unpaid`}
        firstName={who.first}
        onCharge={async (o) => (so(`Charged ${dollars(amount)} to the ${plan.cardWords ?? "card"}`, o?.notify), { ok: true })}
        onRecord={async (o) => (so(`Recorded a ${dollars(amount)} ${ways[o.method]}${invoice ? `, invoice ${invoice.number} settled` : ""}`, o.notify), { ok: true })}
        onInvoice={async () => (so("Invoice sent"), { ok: true })}
        onLater={onClose}
        onClose={onClose}
        onSettled={() => (onPaid?.(), onClose())}
        notNow
        buttonLabel={(o) => (o.value === "card" ? `Charge ${dollars(amount)} to the ${plan.cardWords}` : ({ check: "Record the check", venmo: "Record the Venmo payment", cash: "Record the cash", invoice: "Send the invoice" } as Record<string, string>)[o.value] ?? o.button)}
        confirmFor={(o, reference) => collectConfirm(o.value, { ...who, service: "job", amount: dollars(amount), address: "", dueOn: "14 days from today", cardWords: plan.cardWords, invoiceOpen: Boolean(invoice), invoiceNumber: invoice?.number }, reference)}
      />
    </ConfirmDialog>
  )
}

const FIELD = "min-h-11 rounded-lg border border-input bg-background px-3 text-sm"

export function EditDetailsDialog({ d, onClose, onDone }: { d: CustomerPageData; onClose: () => void; onDone: () => void }) {
  const [channel, setChannel] = useState(d.contact.channel)
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title="Edit details" message={`Save ${d.firstName}'s details. Nobody is notified. Texts and emails already sent keep their old address.`} confirmLabel="Save details" size="md" slot="edit-details" onConfirm={async () => (onDone(), { ok: true })}>
      <div className="flex flex-col gap-3">
        <FormRow label="Name"><Input defaultValue={d.name} className="min-h-11" /></FormRow>
        <FormRow label="Phone"><Input defaultValue={d.contact.phone.text} inputMode="tel" className="min-h-11" /></FormRow>
        <FormRow label="Email"><Input defaultValue={d.contact.email} inputMode="email" className="min-h-11" /></FormRow>
        <FormRow label="Contact by">
          <select value={channel} onChange={(e) => setChannel(e.target.value as "text" | "email")} className={FIELD}>
            <option value="text">Text</option>
            <option value="email">Email</option>
          </select>
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}

export function MergeDialog({ d, others, copy, onClose, onDone }: { d: CustomerPageData; others: readonly string[]; copy: (other: string) => ConfirmCopy; onClose: () => void; onDone: (other: string) => void }) {
  const [other, setOther] = useState(others[0] ?? "")
  const c = copy(other)
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title={c.title} message={c.message} confirmLabel={c.confirmLabel} destructive size="md" slot="merge-customers" onConfirm={async () => (onDone(other), { ok: true })}>
      <FormRow label={`Merge into ${d.name}`}>
        <select value={other} onChange={(e) => setOther(e.target.value)} className={FIELD}>
          {others.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </FormRow>
    </ConfirmDialog>
  )
}
