import { route } from "@/api/core/route"
import { visitsList } from "@/api/v1/visits/handlers"

export const GET = route(visitsList)
