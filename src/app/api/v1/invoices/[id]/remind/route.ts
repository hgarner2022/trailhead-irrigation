import { route } from "@/api/core/route"
import { invoicesRemind } from "@/api/v1/invoices/handlers"

export const POST = route(invoicesRemind)
