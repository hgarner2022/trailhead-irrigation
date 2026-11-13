import { route } from "@/api/core/route"
import { passesAddInspection } from "@/api/v1/passes/handlers"

export const POST = route(passesAddInspection)
