import { route } from "@/api/core/route"
import { scheduleSlots } from "@/api/v1/schedule/handlers"

export const GET = route(scheduleSlots)
