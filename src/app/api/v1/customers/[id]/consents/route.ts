import { route } from "@/api/core/route"
import { consentsList, consentsRecord } from "@/api/v1/customers/handlers"

export const GET = route(consentsList)
export const POST = route(consentsRecord)
