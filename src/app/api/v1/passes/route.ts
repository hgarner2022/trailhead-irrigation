import { route } from "@/api/core/route"
import { passesList, passesCreate } from "@/api/v1/passes/handlers"

export const GET = route(passesList)
export const POST = route(passesCreate)
