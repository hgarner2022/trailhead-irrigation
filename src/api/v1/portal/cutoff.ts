import "server-only"
import { withinCutoff } from "@/lib/portal/change-day"
import { CUTOFF_REFUSAL } from "@/lib/portal/words"
import type { Ctx } from "../../core/context"
import { ApiError } from "../../core/errors"

/** Whether the caller is a customer acting on their own account (a signed-in customer), the only caller the 24-hour rule holds. Staff and keys are not held to it. */
export const isCustomerCaller = (ctx: Pick<Ctx, "principal">): boolean => ctx.principal.kind === "person" && ctx.principal.type === "customer"

/** Refuses a customer a change to a booked day that is inside the cut-off, with the words the screen shows (the rule itself is `withinCutoff`). */
export function assertBeforeCutoff(ctx: Ctx, visit: { status: string; scheduledOn: string | null }): void {
  if (isCustomerCaller(ctx) && visit.status === "scheduled" && withinCutoff(visit, ctx.now)) throw new ApiError("unprocessable", CUTOFF_REFUSAL)
}
