import { describe, expect, it } from "vitest"
import type { ReactElement, ReactNode } from "react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { CancelVisitSheet } from "@/components/blocks/CancelVisitSheet"
import { RescheduleSheet } from "@/components/blocks/RescheduleSheet"
import { passJob, TODAY } from "../../_screens/account-fixtures"
import { CancelControl, RescheduleControl } from "../../_screens/VisitControls"
import { PassPageScreen } from "./PassPageScreen"
import { PickDayButtons } from "./PickDayButtons"

// A live 500 (Nov 18 2026, Next digest 394504483): "Event handlers cannot be passed to Client Component props" on PickDayButtons. PassPageScreen and the visit controls (Reschedule, Cancel visit) are
// server components, so what they hand a "use client" component must be serializable: a server action (a reference), never an inline arrow. A render in jsdom
// cannot see this, so these tests read the element tree the server component returns and check what crosses the boundary.

/** What the framework gives a "use server" function when it crosses to a client: a reference carrying this marker. */
const serverAction = Object.assign(async () => ({ ok: true as const }), { $$typeof: Symbol.for("react.server.reference") })

function elements(node: ReactNode, found: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((n) => elements(n, found))
  else if (node && typeof node === "object" && "props" in node) {
    found.push(node as ReactElement)
    elements((node as ReactElement<{ children?: ReactNode }>).props.children, found)
  }
  return found
}

const onPickOf = (tree: ReactNode) => elements(tree).filter((e) => e.type === PickDayButtons).map((e) => (e.props as { onPick?: unknown }).onPick)
const pass = snapshot.passes[0] as Pass
const withBlowout = (day: string | null): Pass => ({
  ...pass,
  visits: pass.visits.filter((v) => v.kind !== "inspection").map((v) => (v.kind === "blowout" ? { ...v, ...(day ? { scheduledAt: `${day}T08:00:00-07:00`, scheduledOn: day } : {}) } : v)),
})

describe("what a server screen hands the day buttons", () => {
  it("the Reschedule and Cancel visit controls hand their sheets the server action bound to the visit, never an inline arrow", () => {
    const visit = passJob.visits[0]!
    const props = { job: passJob, visit, today: TODAY, days: ["2027-04-29"], textHref: "sms:+19706927270", onReschedule: serverAction, onCancel: serverAction }
    const reschedule = elements(RescheduleControl(props)).find((e) => e.type === RescheduleSheet)!
    const cancel = elements(CancelControl(props)).find((e) => e.type === CancelVisitSheet)!
    // `.bind` keeps a server reference a reference; an inline arrow is not "bound" and cannot cross to a client component
    expect((reschedule.props as { onPick: { name: string } }).onPick.name).toMatch(/^bound /)
    expect((cancel.props as { onCancel: { name: string } }).onCancel.name).toMatch(/^bound /)
  })

  it("the pass page passes the server action itself when a day is to pick", () => {
    const tree = PassPageScreen({ pass: withBlowout(null), today: "2026-11-12", pickDays: { blowout: ["2027-10-05"] }, onPickDay: serverAction })
    expect(onPickOf(tree)).toEqual([serverAction])
  })

  it("the pass page offers no day buttons for a booked day: changing it is the visit's own Reschedule", () => {
    const tree = PassPageScreen({ pass: withBlowout("2027-10-12"), today: "2027-10-01", pickDays: { blowout: ["2027-10-19"] }, onPickDay: serverAction })
    expect(onPickOf(tree)).toEqual([])
  })
})
