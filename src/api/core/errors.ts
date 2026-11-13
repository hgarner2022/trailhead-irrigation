export type ApiErrorCode =
  | "invalid"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "rate_limited"
  | "not_implemented"

export const STATUS: Record<ApiErrorCode, number> = {
  invalid: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  not_implemented: 501,
}

export interface ApiIssue {
  path: string
  message: string
}

/** The one error every handler throws; the route wrapper maps it to `{ error: { code, message, issues? } }`. */
export class ApiError extends Error {
  readonly status: number
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly issues?: ApiIssue[],
  ) {
    super(message)
    this.name = "ApiError"
    this.status = STATUS[code]
  }
}

export const notFound = (what: string) => new ApiError("not_found", `${what} not found`)
export const notImplemented = (name: string) => new ApiError("not_implemented", `${name} is not implemented yet`)
