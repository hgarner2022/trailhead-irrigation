"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { PageHeader } from "@/components/blocks/PageHeader"
import { receiptText, type Way } from "@/app/_flows/walkthrough/receipt-data"
import { EmailFrame, ReceiptPage, TextBubble } from "@/app/_flows/walkthrough/ReceiptViews"

// The receipt in the admin walkthrough (Hannah, Nov 19 2026: "so we can see what it looks like to the user"): after a payment a toast offers
// "View the receipt"; the Payments row's Receipt icon opens the receipt page as the customer sees it; a Receipt (or refund) row in Messages opens
// the text bubble or the rendered email. The pages draw their own toasts and tables, so the prototype reads what they wrote: the toast's words say
// the method, and the first Payments row says the reference (a check number, a Venmo handle). Nothing here edits a page component.

export interface Paid {
  way: Way
  ref?: string
}

/** "Check #2210", "Venmo @andrea-d", "Visa ending 4242", "Cash" and "Refunded" in any words a page used, as a method and a reference. */
export function paidFrom(text: string): Paid {
  if (/refund/i.test(text)) return { way: "refund" }
  if (/venmo/i.test(text)) return { way: "venmo", ref: /@[\w-]+/.exec(text)?.[0] }
  if (/check/i.test(text)) return { way: "check", ref: /#?(\d{3,})/.exec(text.replace(/\bNov\s*\d+/gi, ""))?.[1] }
  if (/cash/i.test(text)) return { way: "cash" }
  return { way: "card" }
}

/** The toast's words that mean a payment (or a refund) was just made: "Charged $145 to Visa ending 4242", "Recorded a $145 check", "Refunded $145". */
export const isPaymentToast = (text: string) => /^(Charged \$|Recorded (a )?\$|Refunded \$)/.test(text.trim())

/** The method of the newest row of the page's Payments table (the one a payment just added), when it has one. */
export function newestPayment(root: ParentNode = document): Paid | null {
  const row = [...root.querySelectorAll("table")].find((t) => /Method/.test(t.querySelector("thead")?.textContent ?? ""))?.querySelector("tbody tr")
  return row ? paidFrom(row.textContent ?? "") : null
}

/** After a payment the page's toast is replaced by this one: the fact, who gets the receipt and how, and the way to see it. */
export function useReceiptToast(): { toast: { text: string; paid: Paid } | null; clear: () => void } {
  const [toast, setToast] = useState<{ text: string; paid: Paid } | null>(null)
  useEffect(() => {
    const look = (node: Node) => {
      if (!(node instanceof HTMLElement)) return
      const el = node.matches("[data-slot=toast]") ? node : node.querySelector("[data-slot=toast]")
      const said = el?.textContent ?? ""
      if (el instanceof HTMLElement && isPaymentToast(said)) {
        el.style.display = "none"
        const paid = paidFrom(said)
        setToast({ paid: { ...paid, ref: newestPayment()?.ref ?? paid.ref }, text: paid.way === "refund" ? "Refunded. Andrea gets a receipt by text." : "Recorded. Andrea gets a receipt by text." })
      }
    }
    const ro = new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach(look)))
    ro.observe(document.body, { childList: true, subtree: true })
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(t)
  }, [toast])
  return { toast, clear: () => setToast(null) }
}

export function ReceiptToast({ text, onView }: { text: string; onView: () => void }) {
  return (
    <div role="status" aria-live="polite" data-slot="receipt-toast" className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white shadow-lg md:inset-x-auto md:left-1/2 md:-translate-x-1/2">
      <span>{text}</span>
      <Button type="button" size="sm" variant="secondary" className="min-h-9 shrink-0" onClick={onView}>View the receipt</Button>
    </div>
  )
}

/** The receipt page as Andrea would see it, under a line that says so. */
export function ReceiptRoute({ id, onBack }: { id: string; onBack: () => void }) {
  const [way, ref] = id.split("|") as [Way, string | undefined]
  return (
    <div data-slot="walkthrough-receipt">
      <PageHeader title="Receipt" context="As Andrea sees it" actions={<Button type="button" variant="outline" className="min-h-11" onClick={onBack}>Back</Button>} />
      <div className="rounded-lg border border-border bg-cream">
        <ReceiptPage way={way} reference={ref || undefined} />
      </div>
    </div>
  )
}

/** A Receipt row of Messages opened: the text bubble, or the email rendered. */
export function MessageView({ channel, paid, onClose }: { channel: "text" | "email"; paid: Paid; onClose: () => void }) {
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title={paid.way === "refund" ? "Refund notice" : "Receipt"} message={channel === "text" ? "The text Andrea got" : "The email Andrea got"} actions="none" size="md" slot="receipt-message">
      {channel === "text" ? <TextBubble body={receiptText(paid.way)} /> : <EmailFrame way={paid.way} reference={paid.ref} height={420} />}
      <Button type="button" variant="outline" className="min-h-11 self-end" onClick={onClose}>Close</Button>
    </ConfirmDialog>
  )
}
