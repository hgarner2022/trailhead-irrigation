import { route } from "@/api/core/route"
import { photosAdd, photosList } from "@/api/v1/photos/handlers"

export const GET = route(photosList)
export const POST = route(photosAdd)
