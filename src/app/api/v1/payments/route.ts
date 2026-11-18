import { route } from "@/api/core/route"
import { paymentsList, paymentsRecord } from "@/api/v1/payments/handlers"

export const GET = route(paymentsList)
export const POST = route(paymentsRecord)
