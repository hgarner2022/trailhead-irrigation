import { z } from "zod"
import { Day, Id, Iso } from "../shared"

/** A line as the invoice froze it: a copy of the job's line when the invoice was sent, so a later price edit never rewrites it. */
export const InvoiceLineOut = z.object({
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number().int().describe("Whole dollars; negative for the line that takes off money already paid."),
  taxable: z.boolean(),
  visitId: Id.nullable().optional().describe("The visit the line was invoiced after, when it had one."),
})

/** An invoice: the job's lines frozen, what they come to, the tax on them and the days it was sent, due and paid. */
export const InvoiceOut = z.object({
  id: Id,
  jobId: Id,
  customerId: Id,
  number: z.string().describe("INV-2026-0001: unique per organization, counting up each year."),
  lines: z.array(InvoiceLineOut),
  amount: z.number().int().describe("Whole dollars: the lines added up, before tax."),
  tax: z.number().int().describe("Whole dollars; 0 while the organization does not collect sales tax."),
  total: z.number().int().describe("Whole dollars: the amount plus the tax, what the invoice asks for."),
  sentOn: Day,
  dueOn: Day,
  paidOn: Day.nullable(),
  paymentId: Id.nullable().describe("The payment row that settled the invoice."),
  cancelledAt: Iso.nullable(),
  status: z.enum(["sent", "paid", "overdue", "cancelled"]).describe("Read from the dates: overdue once the day after dueOn has come."),
  payUrl: z.string().optional().describe("The customer's pay link; only for a key or person that may write."),
  createdAt: Iso,
})
export type InvoiceOutType = z.infer<typeof InvoiceOut>

/**
 * What the pay page may show of one invoice and nothing more: the frozen lines, the amounts, the days, how it stands, the
 * customer's first name and, once paid, the card receipt. No contact details, no ids of other records, no pay link.
 */
export const PayViewOut = z.object({
  id: Id,
  number: z.string(),
  firstName: z.string().describe("The customer's first name, for the greeting."),
  lines: z.array(z.object({ name: z.string(), description: z.string().nullable(), quantity: z.number().int(), unitPrice: z.number().int() })),
  amount: z.number().int(),
  tax: z.number().int(),
  total: z.number().int(),
  dueOn: Day,
  paidOn: Day.nullable(),
  status: z.enum(["sent", "paid", "overdue", "cancelled"]),
  receiptUrl: z.string().nullable().describe("The card receipt of the payment that settled the invoice, once there is one."),
})
export type PayViewOutType = z.infer<typeof PayViewOut>
