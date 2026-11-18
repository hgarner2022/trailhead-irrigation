import { describe, expect, it } from "vitest"
import type { ReactElement, ReactNode } from "react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { ChangeMyDay } from "../../_screens/ChangeMyDay"
import { PassPageScreen } from "./PassPageScreen"
import { PickDayButtons } from "./PickDayButtons"

// A live 500 (Nov 18 2026, Next digest 394504483): "Event handlers cannot be passed to Client Component props" on PickDayButtons. PassPageScreen and ChangeMyDay are
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
  it("ChangeMyDay passes the server action itself", () => {
    const tree = ChangeMyDay({ visitId: "v1", days: ["2027-05-04"], currentDay: "2027-04-27", onPick: serverAction })
    expect(onPickOf(tree)).toEqual([serverAction])
  })

  it("the pass page passes the server action itself when a day is to pick", () => {
    const tree = PassPageScreen({ pass: withBlowout(null), today: "2026-11-12", pickDays: { blowout: ["2027-10-05"] }, onPickDay: serverAction })
    expect(onPickOf(tree)).toEqual([serverAction])
  })

  it("the pass page passes the server action itself when a booked day can be changed", () => {
    const tree = PassPageScreen({ pass: withBlowout("2027-10-12"), today: "2027-10-01", pickDays: { blowout: ["2027-10-19"] }, onPickDay: serverAction })
    expect(onPickOf(tree)).toEqual([serverAction])
  })
})
