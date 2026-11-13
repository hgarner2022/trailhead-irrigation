import { route } from "@/api/core/route"
import { apiKeysRevoke } from "@/api/v1/apikeys/handlers"

export const DELETE = route(apiKeysRevoke)
