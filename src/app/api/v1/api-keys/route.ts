import { route } from "@/api/core/route"
import { apiKeysList, apiKeysCreate } from "@/api/v1/apikeys/handlers"

export const GET = route(apiKeysList)
export const POST = route(apiKeysCreate)
