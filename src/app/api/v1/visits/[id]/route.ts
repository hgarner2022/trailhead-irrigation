import { route } from "@/api/core/route"
import { visitsGet } from "@/api/v1/visits/handlers"

export const GET = route(visitsGet)
