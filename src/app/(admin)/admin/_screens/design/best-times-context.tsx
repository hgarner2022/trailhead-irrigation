"use client"

import { createContext, useContext } from "react"
import type { BestTimes } from "@/components/blocks/best-times"
import type { ScheduleResult } from "./ScheduleDialog"

// The walkthrough hands every Schedule and Move dialog under a job page the same best times and a way to record the answer on the calendar, without a page component
// passing them down (the job page, a Season Pass trip and the clickable flow all open the one `ScheduleDialog`). Absent, the dialog is the reviewed one.

export interface BestTimesContextValue {
  best: BestTimes
  /** the dialog was confirmed: put the visit on the calendar */
  record: (r: ScheduleResult, verb: "Schedule" | "Move") => void
}

export const BestTimesContext = createContext<BestTimesContextValue | null>(null)
export const useBestTimesContext = () => useContext(BestTimesContext)
