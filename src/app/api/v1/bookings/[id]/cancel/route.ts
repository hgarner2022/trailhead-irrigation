import { route } from "@/api/core/route"
import { bookingsCancel } from "@/api/v1/bookings/handlers"

export const POST = route(bookingsCancel)
