import { route } from "@/api/core/route"
import { messagesRefreshDelivery } from "@/api/v1/messages/handlers"

export const POST = route(messagesRefreshDelivery)
