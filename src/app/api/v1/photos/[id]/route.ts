import { route } from "@/api/core/route"
import { photosRemove, photosUpdate } from "@/api/v1/photos/handlers"

export const PATCH = route(photosUpdate)
export const DELETE = route(photosRemove)
