import { route } from "@/api/core/route"
import { eventsList } from "@/api/v1/events/handlers"

export const GET = route(eventsList)
