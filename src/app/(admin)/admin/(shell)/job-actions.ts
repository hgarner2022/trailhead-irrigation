"use server"

import "server-only"
import { callApi } from "@/api/core/call"
import { linesAdd, linesCancel, linesUpdate } from "@/api/v1/lines/handlers"
import { paymentsRecord } from "@/api/v1/payments/handlers"
import { visitsCreate } from "@/api/v1/visits/office"
import type { NewLineInput } from "@/app/(admin)/admin/_screens/job-actions-types"
import { act, type ActionOutcome } from "./act"

// The server actions of the job panel (the Jobs screen). Each runs a handler through `callApi` as the signed-in manager (see
// act.ts) and answers with the API's own words when it refuses. A line change answers the job's new total.

export const addLine = async (input: NewLineInput): Promise<ActionOutcome<{ jobTotal: number }>> =>
  act(async (ctx) => {
    const line = await callApi(ctx, linesAdd, input as never)
    return { jobTotal: line.jobTotal }
  })

export const updateLine = async (lineId: string, changes: { name?: string; quantity?: number; unitPrice?: number }): Promise<ActionOutcome<{ jobTotal: number }>> =>
  act(async (ctx) => {
    const line = await callApi(ctx, linesUpdate, { id: lineId, ...changes })
    return { jobTotal: line.jobTotal }
  })

export const cancelLine = async (lineId: string): Promise<ActionOutcome<{ jobTotal: number }>> =>
  act(async (ctx) => {
    const line = await callApi(ctx, linesCancel, { id: lineId })
    return { jobTotal: line.jobTotal }
  })

/** Money handed over for the job as a whole: a payment row on the job, which settles its open invoice when it covers what is unpaid. */
export const recordJobPayment = async (jobId: string, input: { method: "check" | "venmo" | "cash"; amount: number; reference?: string }): Promise<ActionOutcome> =>
  act(async (ctx) => {
    await callApi(ctx, paymentsRecord, { jobId, ...input })
    return undefined
  })

/** A new visit on this job: `visits.create` with the job's id, from a catalogue service. */
export const addVisit = async (jobId: string, input: { serviceKey: string; scheduledOn?: string; notes?: string }): Promise<ActionOutcome<{ id: string }>> =>
  act(async (ctx) => {
    const made = await callApi(ctx, visitsCreate, { jobId, ...input } as never)
    return { id: made.id }
  })
