import { route } from "@/api/core/route"
import { webhooksTest } from "@/api/v1/webhooks/handlers"

export const POST = route(webhooksTest)
