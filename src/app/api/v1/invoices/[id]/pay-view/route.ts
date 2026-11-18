import { route } from "@/api/core/route"
import { invoicesPayView } from "@/api/v1/invoices/handlers"

export const GET = route(invoicesPayView)
