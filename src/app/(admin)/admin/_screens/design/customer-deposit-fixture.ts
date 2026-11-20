import type { CustomerPageData } from "./customer-types"

// A customer whose job was paid with a deposit (Hannah, Nov 20 2026): $50 came in by check on Nov 10 with no invoice, then the final invoice
// credited it ($145 less the $50, so $95), and a card payment settled that on Nov 18. In Billing the deposit is a payment of its own and the
// invoice and its card payment are one row. Built from the one-off customer so the rest of the page is the same.

export function depositCustomer(one: CustomerPageData): CustomerPageData {
  const card = one.billing.card
  return {
    ...one,
    id: "c11",
    name: "Delia Ortiz",
    firstName: "Delia",
    address: ["112 Prairie Ct", "Firestone, CO"],
    subtitle: "Customer since Oct 2026 · 112 Prairie Ct, Firestone",
    jobs: one.jobs.map((j) => ({ ...j, money: { word: "Paid, card" } })),
    billing: {
      line: "Paid in full",
      settled: "paid",
      tone: "plain",
      total: "$145",
      paid: "$145",
      unpaid: "$0",
      card,
      invoices: [{ id: "i1", number: "INV-2026-0063", jobId: "j1", jobName: "Sprinkler repair", amount: "$95", sent: "Nov 17", due: "Dec 1", status: "paid", statusLabel: "Paid", sortDay: "2026-11-17", note: "$145 less the $50 deposit" }],
      payments: [
        { id: "p2", receipt: "R-1121", date: "Nov 18", sortDay: "2026-11-18", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "$95", invoiceId: "i1", stripeUrl: "https://dashboard.stripe.com/payments/pi_demo7" },
        { id: "p1", receipt: "R-1109", date: "Nov 10", sortDay: "2026-11-10", jobId: "j1", jobName: "Sprinkler repair", how: "Check 1031", amount: "$50", note: "Deposit" },
      ],
    },
  }
}
