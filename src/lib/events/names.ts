import { LINE_NAMES } from "@/lib/jobs/lines"
import type { ServiceKind } from "@/lib/services"

/** The name a visit carries in an event's `detail.name`: the line name for its kind ("Spring turn-on"), the kind itself when it has none. */
export function visitName(kind: string): string {
  return LINE_NAMES[kind as ServiceKind] ?? kind
}
