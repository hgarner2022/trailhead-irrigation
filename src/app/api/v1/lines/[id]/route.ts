import { route } from "@/api/core/route"
import { linesUpdate, linesCancel } from "@/api/v1/lines/handlers"

export const PATCH = route(linesUpdate)
export const DELETE = route(linesCancel)
