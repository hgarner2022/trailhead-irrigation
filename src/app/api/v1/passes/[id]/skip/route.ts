import { route } from "@/api/core/route"
import { passesSkipVisit } from "@/api/v1/passes/handlers"

export const POST = route(passesSkipVisit)
