import { route } from "@/api/core/route"
import { jobsCreate } from "@/api/v1/jobs/handlers"

export const POST = route(jobsCreate)
