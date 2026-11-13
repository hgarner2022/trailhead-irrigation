import { route } from "@/api/core/route"
import { mirrorUpsert } from "@/api/v1/mirror/handlers"

export const POST = route(mirrorUpsert)
