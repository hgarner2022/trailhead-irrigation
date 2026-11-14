import { route } from "@/api/core/route"
import { visitsGet } from "@/api/v1/visits/handlers"
import { visitsUpdate } from "@/api/v1/visits/office"

export const GET = route(visitsGet)
export const PATCH = route(visitsUpdate)
