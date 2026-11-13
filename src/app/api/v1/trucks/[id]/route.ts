import { route } from "@/api/core/route"
import { trucksUpdate, trucksDeactivate } from "@/api/v1/trucks/handlers"

export const PATCH = route(trucksUpdate)
export const DELETE = route(trucksDeactivate)
