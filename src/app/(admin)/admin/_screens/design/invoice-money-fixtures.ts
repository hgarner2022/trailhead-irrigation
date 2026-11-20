import type { InvoicePageData } from "./invoice-fixtures"

// Two more paid invoices for the invoice page (Hannah, Nov 20 2026), built from the card and check ones so the rest of the page is the same: one
// whose card payment was partly refunded, and one that credited a deposit paid earlier. Their Payments card holds every payment on the invoice,
// a refund right under the payment it reverses.

const stripe = "https://dashboard.stripe.com/payments/pi_demo"

/** $40 of the $115 card payment went back: the invoice stays Paid, the refund is a grey negative row under the payment. */
export function partRefundedInvoice(paid: InvoicePageData): InvoicePageData {
  return {
    ...paid,
    id: "i34",
    number: "INV-2026-0034",
    totals: [["Subtotal", "$115"], ["Tax", "$0"], ["Total", "$115", "strong"], ["Paid", "$75"], ["Refunded", "$40"]],
    payments: [
      { id: "r-i34", receipt: "R-1118", date: "Nov 12", sortDay: "2026-11-12", jobId: "j-i33", jobName: "Fall blowout", how: "Card", amount: "-$40", refund: true, refundOf: "p-i34" },
      { id: "p-i34", receipt: "R-1066", date: "Nov 9", sortDay: "2026-11-09", jobId: "j-i33", jobName: "Fall blowout", how: "Card, kept on file", amount: "$115", stripeUrl: stripe },
    ],
    notes: [{ id: "n3", at: "2026-11-12T15:00:00Z", actor: "Ryan", what: "Refunded $40 to the card", kind: "event" }, ...paid.notes],
  }
}

/** The job took a $50 deposit by check on Nov 10; this invoice is the rest, $95, paid by check on Nov 17. The deposit is a payment of its own, shown as applied. */
export function depositInvoice(paid: InvoicePageData): InvoicePageData {
  return {
    ...paid,
    id: "i41",
    number: "INV-2026-0041",
    amount: "$95",
    totals: [["Subtotal", "$145"], ["Tax", "$0"], ["Total", "$145", "strong"], ["Deposit paid Nov 10", "-$50"], ["Paid", "$95"], ["Unpaid", "$0"]],
    payments: [
      { id: "p-i41", receipt: "R-1072", date: "Nov 17", sortDay: "2026-11-17", jobId: "j-i40", jobName: "Sprinkler repair", how: "Check 2214", amount: "$95" },
      { id: "p-dep", receipt: "R-1060", date: "Nov 10", sortDay: "2026-11-10", jobId: "j-i40", jobName: "Sprinkler repair", how: "Check 1031", amount: "$50", note: "Deposit, applied" },
    ],
    notes: [{ id: "n3", at: "2026-11-10T17:00:00Z", actor: "Ryan", what: "Recorded a $50 check, number 1031, as the deposit", kind: "event" }, ...paid.notes],
  }
}
