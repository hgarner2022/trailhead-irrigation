import "server-only"
import { revalidatePath } from "next/cache"
import type { Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { ctxFromSession } from "@/lib/admin/api-ctx"
import { requireAdmin } from "@/lib/auth/guard"

// The one shape of every admin server action (not itself a "use server" file: these helpers are not actions).
// Every action is a manager's (a tech reads and sees no buttons), runs the same API handler the HTTPS route runs,
// through `callApi` with the signed-in person's own context, and refreshes every admin page. None takes an
// identity from the client. An action answers `{ ok: true, data }` or `{ ok: false, message }` with the API's own
// words, so a screen can say why and put things back; only a sign-in problem throws, as the guard redirects.

export type ActionOutcome<T = undefined> = { ok: true; data: T } | { ok: false; message: string }

/** Only what the screen reads is sent back; a handler call that answers nothing the screen needs is dropped. */
export const nothing = async (call: Promise<unknown>): Promise<undefined> => {
  await call
}

export const failure = (error: unknown): { ok: false; message: string } => ({
  ok: false,
  message: error instanceof ApiError && error.status < 500 ? error.message : "That did not go through. Try again, or call Ryan if it keeps happening.",
})

/** The one shape of every action: guard, context, the handler call, the refresh. */
export async function act<T = undefined>(run: (ctx: Ctx) => Promise<T>): Promise<ActionOutcome<T>> {
  await requireAdmin("manager")
  try {
    const out = await run(await ctxFromSession())
    revalidatePath("/admin", "layout")
    return { ok: true, data: out }
  } catch (error) {
    // A half-finished save still changed some rows; show them either way.
    revalidatePath("/admin", "layout")
    return failure(error)
  }
}
