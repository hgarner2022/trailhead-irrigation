import { route } from "@/api/core/route"
import { areasList, areasCreate } from "@/api/v1/areas/handlers"

export const GET = route(areasList)
export const POST = route(areasCreate)
