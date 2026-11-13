import { route } from "@/api/core/route"
import { passesGet } from "@/api/v1/passes/handlers"

export const GET = route(passesGet)
