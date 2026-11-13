import { route } from "@/api/core/route"
import { scheduleWeek } from "@/api/v1/schedule/handlers"

export const GET = route(scheduleWeek)
