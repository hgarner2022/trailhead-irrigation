import type { JobBar } from "./job-footer-model"

/**
 * The job panel's bar on a phone (below `md`): the one primary and More, and nothing else. The outlines (Add a line, New visit, Change the pass) and
 * the destructive ghost move under More, outlines first and the cancel last, so a technician's job screen keeps its lines and money above the fold
 * (docs/plans/2026-11-18-ux-audit-ryan.md row 7). The laptop bar is `jobBar` as it was. Pure.
 */
export function phoneBar(bar: JobBar): JobBar {
  return {
    ...(bar.primary ? { primary: bar.primary } : {}),
    secondary: [],
    more: [...bar.secondary, ...bar.more, ...(bar.destructive ? [bar.destructive] : [])],
  }
}
