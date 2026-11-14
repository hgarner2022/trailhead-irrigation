import { route } from "@/api/core/route"
import { alertsDismiss } from "@/api/v1/alerts/handlers"

export const POST = route(alertsDismiss)
