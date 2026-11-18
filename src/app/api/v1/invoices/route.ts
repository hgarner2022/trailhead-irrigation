import { route } from "@/api/core/route"
import { invoicesList, invoicesSend } from "@/api/v1/invoices/handlers"

export const GET = route(invoicesList)
export const POST = route(invoicesSend)
