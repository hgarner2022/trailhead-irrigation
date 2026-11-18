import { z } from "zod"
import { Day, Id, Iso } from "../shared"

/** A line as the bill froze it: a copy of the job's line when the bill was sent, so a later price edit never rewrites it. */
export const InvoiceLineOut = z.object({
  name: z.string(),
  description: z.string().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number().int().describe("Whole dollars; negative for the line that takes off money already paid."),
  taxable: z.boolean(),
  visitId: Id.nullable().optional().describe("The visit the line was billed after, when it had one."),
})

/** A bill: the job's lines frozen, what they come to, the tax on them and the days it was sent, due and paid. */
export const InvoiceOut = z.object({
  id: Id,
  jobId: Id,
  customerId: Id,
  number: z.string().describe("INV-2026-0001: unique per organization, counting up each year."),
  lines: z.array(InvoiceLineOut),
  amount: z.number().int().describe("Whole dollars: the lines added up, before tax."),
  tax: z.number().int().describe("Whole dollars; 0 while the organization does not collect sales tax."),
  total: z.number().int().describe("Whole dollars: the amount plus the tax, what the bill asks for."),
  sentOn: Day,
  dueOn: Day,
  paidOn: Day.nullable(),
  paymentId: Id.nullable().describe("The payment row that settled the bill."),
  cancelledAt: Iso.nullable(),
  status: z.enum(["sent", "paid", "overdue", "cancelled"]).describe("Read from the dates: overdue once the day after dueOn has come."),
  payUrl: z.string().optional().describe("The customer's pay link; only for a key or person that may write."),
  createdAt: Iso,
})
export type InvoiceOutType = z.infer<typeof InvoiceOut>
