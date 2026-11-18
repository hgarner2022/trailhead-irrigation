import { route } from "@/api/core/route"
import { invoicesGet } from "@/api/v1/invoices/handlers"

export const GET = route(invoicesGet)
