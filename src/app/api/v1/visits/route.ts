import { route } from "@/api/core/route"
import { visitsList } from "@/api/v1/visits/handlers"
import { visitsCreate } from "@/api/v1/visits/office"

export const GET = route(visitsList)
export const POST = route(visitsCreate)
