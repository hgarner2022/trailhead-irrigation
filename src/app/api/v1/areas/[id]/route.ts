import { route } from "@/api/core/route"
import { areasUpdate, areasDelete } from "@/api/v1/areas/handlers"

export const PATCH = route(areasUpdate)
export const DELETE = route(areasDelete)
