import { route } from "@/api/core/route"
import { paymentsRefund } from "@/api/v1/payments/handlers"

export const POST = route(paymentsRefund)
