import { route } from "@/api/core/route"
import { bookingsCreate } from "@/api/v1/bookings/handlers"

export const POST = route(bookingsCreate)
