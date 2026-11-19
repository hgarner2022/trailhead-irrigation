import { route } from "@/api/core/route"
import { photosListForJob } from "@/api/v1/photos/handlers"

export const GET = route(photosListForJob)
