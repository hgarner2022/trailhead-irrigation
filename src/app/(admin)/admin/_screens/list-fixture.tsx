import { ScheduleScreen, type ScheduleScreenProps } from "./ScheduleScreen"
import type { VisitActions } from "./visit-actions-types"

/**
 * The Schedule opened on its List view, with the props the old Visits page took: what the tests and stories of the visit panel and the grid render.
 * (Visits is no longer a screen; its grid is the Schedule's third view.)
 */
export function VisitsScreen({ actions, jobId, ...rest }: Omit<ScheduleScreenProps, "visitActions" | "defaultTab" | "forJob"> & { actions?: VisitActions; jobId?: string }) {
  return <ScheduleScreen {...rest} visitActions={actions} forJob={jobId} defaultTab="list" />
}
