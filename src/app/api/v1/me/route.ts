import { route } from "@/api/core/route"
import { customersMe, customersUpdateSelf } from "@/api/v1/portal/me"

export const GET = route(customersMe)
export const PATCH = route(customersUpdateSelf)
