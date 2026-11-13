import { route } from "@/api/core/route"
import { visitsMarkClosed } from "@/api/v1/visits/handlers"

export const POST = route(visitsMarkClosed)
