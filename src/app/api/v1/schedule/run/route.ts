import { route } from "@/api/core/route"
import { scheduleRun } from "@/api/v1/schedule/handlers"

export const POST = route(scheduleRun)
