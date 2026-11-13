"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { passesAddInspection, passesCancel, passesGet, passesSkipVisit, passesStartCardUpdate, passesUpdatePreference } from "@/api/v1/passes/handlers"
import { visitsPick } from "@/api/v1/visits/handlers"
import { ctxFromSession } from "@/lib/admin/api-ctx"
import type { TimingPreference } from "@/lib/admin/types"

// The customer pass page's server actions. Each runs as the signed-in person through `callApi`, so the handlers check that the
// pass is theirs; none takes an identity from the client. The two that end in a message to the customer (cancel, pick a day)
// answer `{ ok, message }` so the dialog can say when it did not go through; the rest throw to the page's error boundary.

const PAGE = "/account/pass"
type Result = { ok: true } | { ok: false; message: string }

const failure = (error: unknown): Result => ({ ok: false, message: error instanceof ApiError && error.status < 500 ? error.message : "That did not go through. Please try again, or call us." })

/** Ends the pass: unstarted visits come off the schedule, nothing further is charged, the customer is emailed. */
export async function cancelPass(passId: string): Promise<Result> {
  try {
    await callApi(await ctxFromSession(), passesCancel, { id: passId })
  } catch (error) {
    return failure(error)
  }
  revalidatePath(PAGE)
  return { ok: true }
}

/** Sends the customer to Stripe's hosted page to update the card. */
export async function startCardUpdate(passId: string): Promise<void> {
  const { url } = await callApi(await ctxFromSession(), passesStartCardUpdate, { id: passId })
  redirect(url)
}

/** Earlier, recommended or later for the turn-on or the blowout, until its day is set. */
export async function changePreference(passId: string, kind: "turn-on" | "blowout", preference: TimingPreference): Promise<void> {
  await callApi(await ctxFromSession(), passesUpdatePreference, { id: passId, kind, preference })
  revalidatePath(PAGE)
}

/** A customer who must be home picks one of the offered area days; the visit is placed and the date is texted. */
export async function pickDay(passId: string, kind: "turn-on" | "blowout", day: string): Promise<Result> {
  try {
    const ctx = await ctxFromSession()
    const pass = await callApi(ctx, passesGet, { id: passId })
    const visit = pass.visits.find((v) => v.kind === kind)
    if (!visit) return { ok: false, message: "We could not find that visit on your pass." }
    await callApi(ctx, visitsPick, { id: visit.id, day })
  } catch (error) {
    return failure(error)
  }
  revalidatePath(PAGE)
  return { ok: true }
}

/** Adds the July inspection while its window is still open. */
export async function addInspection(passId: string): Promise<void> {
  await callApi(await ctxFromSession(), passesAddInspection, { id: passId })
  revalidatePath(PAGE)
}

/** Skips one visit that has not happened; it is not charged. */
export async function skipVisit(passId: string, kind: "turn-on" | "inspection" | "blowout"): Promise<void> {
  await callApi(await ctxFromSession(), passesSkipVisit, { id: passId, kind })
  revalidatePath(PAGE)
}
