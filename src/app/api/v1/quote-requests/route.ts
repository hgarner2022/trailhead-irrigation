import { route } from "@/api/core/route"
import { quoteRequestsCreate, quoteRequestsList } from "@/api/v1/bookings/handlers"

export const POST = route(quoteRequestsCreate)
export const GET = route(quoteRequestsList)
