import type { AdminData } from "@/lib/admin/types"
import type { ProtoState } from "../schedule-prototype-model"
import { adminDataOf, nowOn, type MoneyOf } from "../schedule-admin-data"
import { rowOf } from "./jobs-data"
import { WALK_PEOPLE, WALK_SCHEDULE_TODAY } from "./visits-data"

// Home on the Schedule's world (docs/plans/2026-11-25-scheduler-holistic-audit.md, rows 3 and 34): today's stops on Home are the Schedule's Wednesday and a move there shows here.

/** 10:20 am Mountain on the Schedule's today. */
export const HOME_NOW = nowOn(WALK_SCHEDULE_TODAY)

/** The Jobs row's price, and a payment for a job the row says is paid. */
export const walkMoney: MoneyOf = (id) => {
  const row = rowOf(id)
  if (!row) return { price: 0 }
  return { price: row.total, ...(row.billingState === "paid" ? { payment: { id: `pay-${id}`, jobId: id, visitId: id, amount: row.total, method: /check/i.test(row.billing) ? "check" : "card", status: "succeeded", paidOn: WALK_SCHEDULE_TODAY } } : {}) }
}

export const homeData = (state: Pick<ProtoState, "visits" | "meta">): AdminData => adminDataOf(state, WALK_PEOPLE, walkMoney)
