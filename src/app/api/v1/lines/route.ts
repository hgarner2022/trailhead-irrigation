import { route } from "@/api/core/route"
import { linesAdd } from "@/api/v1/lines/handlers"

export const POST = route(linesAdd)
