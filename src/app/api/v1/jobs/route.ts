import { route } from "@/api/core/route"
import { jobsCreate } from "@/api/v1/jobs/handlers"
import { jobsList } from "@/api/v1/portal/jobs"

export const GET = route(jobsList)
export const POST = route(jobsCreate)
