import { route } from "@/api/core/route"
import { invoicesCancel } from "@/api/v1/invoices/handlers"

export const POST = route(invoicesCancel)
