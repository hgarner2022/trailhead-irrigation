import { route } from "@/api/core/route"
import { passesResendConfirmation } from "@/api/v1/passes/handlers"

export const POST = route(passesResendConfirmation)
