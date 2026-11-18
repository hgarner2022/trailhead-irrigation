import { route } from "@/api/core/route"
import { jobsGet } from "@/api/v1/portal/jobs"

export const GET = route(jobsGet)
