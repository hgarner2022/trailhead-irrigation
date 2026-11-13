import { route } from "@/api/core/route"
import { passesConsent } from "@/api/v1/passes/handlers"

export const POST = route(passesConsent)
