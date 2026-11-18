"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { signOut } from "@/auth"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { customersStartCardUpdate, customersUpdateSelf, propertiesUpdateSelf } from "@/api/v1/portal/me"
import { visitsCancelSelf } from "@/api/v1/portal/cancel"
import { visitsPick } from "@/api/v1/visits/handlers"
import { ctxFromAccount } from "@/lib/admin/api-ctx"
import { visitLinkCtx } from "./account-data"
import { DAY_FAILED } from "@/lib/portal/words"
import { drainAfter } from "@/lib/queue/drain-after"

// The account's server actions. Each runs as the signed-in customer through `callApi`, so the handlers check that the record is theirs; none takes
// an identity from the client. The ones a form or button answers say `{ ok, message }` so a failure is said in place.

type Result = { ok: true } | { ok: false; message: string }

const failure = (error: unknown, fallback: string): Result => ({ ok: false, message: error instanceof ApiError && error.status < 500 ? error.message : fallback })
const SAVE_FAILED = "We couldn't save that. Try again, or call or text Ryan at (970) 692-7270."

/** Moves a visit to one of the offered days (or gives a waiting visit its day): the customer is texted the date. */
export async function changeMyDay(visitId: string, day: string): Promise<Result> {
  try {
    await callApi(await ctxFromAccount(), visitsPick, { id: visitId, day })
  } catch (error) {
    return failure(error, DAY_FAILED)
  }
  // No revalidate here: the sheet that called this is still showing its answer ("Moved to Thursday"). It refreshes the page when the customer closes it.
  drainAfter()
  return { ok: true }
}

/** Cancels a visit that has not happened, with the customer's optional reason: a Season Pass visit is skipped (nothing charged), a one-off is canceled. The customer is texted a note. */
export async function cancelMyVisit(visitId: string, reason: string): Promise<Result> {
  try {
    await callApi(await ctxFromAccount(), visitsCancelSelf, { id: visitId, ...(reason.trim() ? { reason: reason.trim() } : {}) })
  } catch (error) {
    return failure(error, "We couldn't cancel that.")
  }
  // No revalidate here: the visit no longer offers Cancel, so a refresh now would unmount the sheet before it said "Canceled". It refreshes when the customer closes it.
  drainAfter()
  return { ok: true }
}

/** Reschedule from a text's link: the same call as `changeMyDay`, as the link's customer for that one visit. The token rides bound into the action, never read from the page. */
export async function changeMyDayByLink(token: string, visitId: string, day: string): Promise<Result> {
  const ctx = await visitLinkCtx(visitId, token)
  if (!ctx) return { ok: false, message: "This link didn't work. Use the link in your text." }
  try {
    await callApi(ctx, visitsPick, { id: visitId, day })
  } catch (error) {
    return failure(error, DAY_FAILED)
  }
  drainAfter()
  return { ok: true }
}

/** Cancel from a text's link: the same call as `cancelMyVisit`, for that one visit. */
export async function cancelMyVisitByLink(token: string, visitId: string, reason: string): Promise<Result> {
  const ctx = await visitLinkCtx(visitId, token)
  if (!ctx) return { ok: false, message: "This link didn't work. Use the link in your text." }
  try {
    await callApi(ctx, visitsCancelSelf, { id: visitId, ...(reason.trim() ? { reason: reason.trim() } : {}) })
  } catch (error) {
    return failure(error, "We couldn't cancel that.")
  }
  drainAfter()
  return { ok: true }
}

/** The customer's own name and mobile. A blank mobile is left as it is. */
export async function saveContact(fields: { firstName: string; lastName: string; phone: string }): Promise<Result> {
  try {
    await callApi(await ctxFromAccount(), customersUpdateSelf, { firstName: fields.firstName, lastName: fields.lastName, ...(fields.phone.trim() ? { phone: fields.phone.trim() } : {}) })
  } catch (error) {
    return failure(error, SAVE_FAILED)
  }
  revalidatePath("/account", "layout")
  return { ok: true }
}

/** The yard facts of one of the customer's own properties; an empty box clears the fact. */
export async function saveYard(propertyId: string, fields: Record<string, unknown>): Promise<Result> {
  try {
    await callApi(await ctxFromAccount(), propertiesUpdateSelf, { id: propertyId, ...fields })
  } catch (error) {
    return failure(error, SAVE_FAILED)
  }
  revalidatePath("/account", "layout")
  return { ok: true }
}

/** Sends the customer to Stripe's hosted page to update the card on file. */
export async function startCardUpdate(): Promise<void> {
  const { url } = await callApi(await ctxFromAccount(), customersStartCardUpdate, {})
  drainAfter()
  redirect(url)
}

export async function signOutOfAccount(): Promise<void> {
  await signOut({ redirectTo: "/account/sign-in" })
}
