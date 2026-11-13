import { route } from "@/api/core/route"
import { webhooksDelete } from "@/api/v1/webhooks/handlers"

export const DELETE = route(webhooksDelete)
