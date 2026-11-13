import { route } from "@/api/core/route"
import { settingsGet, settingsUpdate } from "@/api/v1/settings/handlers"

export const GET = route(settingsGet)
export const PATCH = route(settingsUpdate)
