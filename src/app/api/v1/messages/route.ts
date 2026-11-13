import { route } from "@/api/core/route"
import { messagesList, messagesSend } from "@/api/v1/messages/handlers"

export const GET = route(messagesList)
export const POST = route(messagesSend)
