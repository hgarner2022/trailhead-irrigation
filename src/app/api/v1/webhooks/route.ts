import { route } from "@/api/core/route"
import { webhooksList, webhooksCreate } from "@/api/v1/webhooks/handlers"

export const GET = route(webhooksList)
export const POST = route(webhooksCreate)
